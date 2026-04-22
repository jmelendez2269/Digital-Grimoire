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
    const type = searchParams.get("type");
    const typeId = searchParams.get("typeId");
    const minWeight = Number(searchParams.get("minWeight") || 0);
    const sourceId = searchParams.get("sourceId");
    const targetId = searchParams.get("targetId");
    const limit = Math.min(Number(searchParams.get("limit") || 100), 25000);

    let query = supabase
      .from("correspondence_relationships")
      .select("id, source_id, target_id, type, weight, confidence, source_citation, notes, created_at, relationship_type:correspondence_relationship_types(id, slug, label, color, icon)")
      .limit(limit);
    if (type) query = query.eq("type", type);
    if (typeId) query = query.eq("relationship_type_id", typeId);
    if (!Number.isNaN(minWeight)) query = query.gte("weight", minWeight);
    if (sourceId) query = query.eq("source_id", sourceId);
    if (targetId) query = query.eq("target_id", targetId);

    const { data, error } = await query;
    if (error) throw error;

    const response = NextResponse.json({ items: data || [] });

    // Keep this fresh while we iterate on graph exploration behavior.
    response.headers.set(
      'Cache-Control',
      'no-store'
    );

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch edges" },
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
    const {
      sourceId,
      targetId,
      type,
      typeId,
      weight = 0.5,
      confidence = "tradition",
      source_citation,
      notes,
    } = body || {};
    if (!sourceId || !targetId || (!type && !typeId)) {
      return NextResponse.json(
        { error: "sourceId, targetId, and type/typeId are required" },
        { status: 400 }
      );
    }
    const svc = createServiceClient();
    let resolvedTypeId = typeId as string | undefined;
    let resolvedType = type as string | undefined;

    if (resolvedTypeId && !resolvedType) {
      const { data: typeRow, error: typeError } = await svc
        .from("correspondence_relationship_types")
        .select("slug")
        .eq("id", resolvedTypeId)
        .single();
      if (typeError) throw typeError;
      resolvedType = typeRow.slug;
    }

    if (!resolvedTypeId && resolvedType) {
      const { data: typeRow } = await svc
        .from("correspondence_relationship_types")
        .select("id")
        .eq("slug", resolvedType)
        .single();
      resolvedTypeId = typeRow?.id;
    }

    const { data, error } = await svc
      .from("correspondence_relationships")
      .insert({
        source_id: sourceId,
        target_id: targetId,
        type: resolvedType,
        relationship_type_id: resolvedTypeId,
        weight,
        confidence,
        source_citation,
        notes,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ edge: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create edge" },
      { status: 500 }
    );
  }
}


