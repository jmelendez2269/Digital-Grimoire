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
    const { type, typeId, weight, confidence, source_citation, notes } = body || {};
    
    const svc = createServiceClient();
    const updateData: any = {};
    
    if (type !== undefined) updateData.type = type;
    if (typeId !== undefined) updateData.relationship_type_id = typeId;
    if (weight !== undefined) updateData.weight = weight;
    if (confidence !== undefined) updateData.confidence = confidence;
    if (source_citation !== undefined) updateData.source_citation = source_citation;
    if (notes !== undefined) updateData.notes = notes;

    if (typeId && type === undefined) {
      const { data: typeRow, error: typeError } = await svc
        .from("correspondence_relationship_types")
        .select("slug")
        .eq("id", typeId)
        .single();
      if (typeError) throw typeError;
      updateData.type = typeRow.slug;
    }

    if (!typeId && type !== undefined) {
      const { data: typeRow } = await svc
        .from("correspondence_relationship_types")
        .select("id")
        .eq("slug", type)
        .single();
      updateData.relationship_type_id = typeRow?.id;
    }

    const { data, error } = await svc
      .from("correspondence_relationships")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ edge: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update relationship" },
      { status: 500 }
    );
  }
}
