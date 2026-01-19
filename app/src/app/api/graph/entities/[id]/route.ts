import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

async function isAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { name, slug, category, typeId, aliases, description, lenses } = body || {};
    
    const svc = createServiceClient();
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (category !== undefined) updateData.category = category;
    if (typeId !== undefined) updateData.type_id = typeId;
    if (aliases !== undefined) updateData.aliases = aliases;
    if (description !== undefined) updateData.description = description;
    if (lenses !== undefined) updateData.lenses = lenses;
    updateData.updated_at = new Date().toISOString();

    if (typeId && category === undefined) {
      const { data: typeRow, error: typeError } = await svc
        .from("correspondence_entity_types")
        .select("slug")
        .eq("id", typeId)
        .single();
      if (typeError) throw typeError;
      updateData.category = typeRow.slug;
    }

    if (!typeId && category !== undefined) {
      const { data: typeRow } = await svc
        .from("correspondence_entity_types")
        .select("id")
        .eq("slug", category)
        .single();
      updateData.type_id = typeRow?.id;
    }

    const { data, error } = await svc
      .from("correspondences")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ entity: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update entity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    
    const svc = createServiceClient();
    const { error } = await svc
      .from("correspondences")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete entity" },
      { status: 500 }
    );
  }
}
