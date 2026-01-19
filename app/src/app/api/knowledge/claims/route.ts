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

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

    let query = supabase
      .from("knowledge_claims")
      .select(
        "*, source:knowledge_sources(id, title, author, year, citation, url)"
      )
      .limit(limit);

    if (entityType) query = query.eq("entity_type", entityType);
    if (entityId) query = query.eq("entity_id", entityId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch claims" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { entityType, entityId, sourceId, field_key, field_value, field_value_json, confidence, notes } = body || {};
    if (!entityType || !entityId || !field_key) {
      return NextResponse.json(
        { error: "entityType, entityId, and field_key are required" },
        { status: 400 }
      );
    }
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("knowledge_claims")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        source_id: sourceId || null,
        field_key,
        field_value: field_value ?? null,
        field_value_json: field_value_json ?? null,
        confidence: confidence ?? null,
        notes: notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ claim: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create claim" },
      { status: 500 }
    );
  }
}
