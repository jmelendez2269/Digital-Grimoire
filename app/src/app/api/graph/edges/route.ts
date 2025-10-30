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
    const minWeight = Number(searchParams.get("minWeight") || 0);
    const sourceId = searchParams.get("sourceId");
    const targetId = searchParams.get("targetId");
    const limit = Math.min(Number(searchParams.get("limit") || 100), 400);

    let query = supabase.from("correspondence_relationships").select("*").limit(limit);
    if (type) query = query.eq("type", type);
    if (!Number.isNaN(minWeight)) query = query.gte("weight", minWeight);
    if (sourceId) query = query.eq("source_id", sourceId);
    if (targetId) query = query.eq("target_id", targetId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
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
    const { sourceId, targetId, type, weight = 0.5, confidence = "tradition", source_citation, notes } = body || {};
    if (!sourceId || !targetId || !type) {
      return NextResponse.json({ error: "sourceId, targetId, and type are required" }, { status: 400 });
    }
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("correspondence_relationships")
      .insert({ source_id: sourceId, target_id: targetId, type, weight, confidence, source_citation, notes })
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


