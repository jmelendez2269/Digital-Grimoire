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
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const {
      name,
      slug,
      tradition,
      traditionId,
      era,
      short_definition,
      primary_sources,
      tags,
    } = body || {};
    
    const svc = createServiceClient();
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (tradition !== undefined) updateData.tradition = tradition;
    if (traditionId !== undefined) updateData.tradition_id = traditionId;
    if (era !== undefined) updateData.era = era;
    if (short_definition !== undefined) updateData.short_definition = short_definition;
    if (primary_sources !== undefined) updateData.primary_sources = primary_sources;
    if (tags !== undefined) updateData.tags = tags;

    if (traditionId && tradition === undefined) {
      const { data: traditionRow, error: traditionError } = await svc
        .from("convergence_traditions")
        .select("label")
        .eq("id", traditionId)
        .single();
      if (traditionError) throw traditionError;
      updateData.tradition = traditionRow.label;
    }

    if (!traditionId && tradition !== undefined) {
      const { data: traditionRow } = await svc
        .from("convergence_traditions")
        .select("id")
        .eq("label", tradition)
        .single();
      updateData.tradition_id = traditionRow?.id;
    }

    const { data, error } = await svc
      .from("convergence_concepts")
      .update(updateData)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ concept: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update concept" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const svc = createServiceClient();
    const { error } = await svc
      .from("convergence_concepts")
      .delete()
      .eq("id", params.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete concept" },
      { status: 500 }
    );
  }
}
