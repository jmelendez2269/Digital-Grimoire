import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { sourceId, field_key, field_value, field_value_json, confidence, notes } = body || {};
    const updateData: any = {};
    if (sourceId !== undefined) updateData.source_id = sourceId;
    if (field_key !== undefined) updateData.field_key = field_key;
    if (field_value !== undefined) updateData.field_value = field_value;
    if (field_value_json !== undefined) updateData.field_value_json = field_value_json;
    if (confidence !== undefined) updateData.confidence = confidence;
    if (notes !== undefined) updateData.notes = notes;

    const svc = createServiceClient();
    const { data, error } = await svc
      .from("knowledge_claims")
      .update(updateData)
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ claim: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update claim" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const svc = createServiceClient();
    const { error } = await svc
      .from("knowledge_claims")
      .delete()
      .eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete claim" },
      { status: 500 }
    );
  }
}
