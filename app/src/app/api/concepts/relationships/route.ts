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
    const sourceId = searchParams.get("sourceId");
    const minSimilarity = Number(searchParams.get("minSimilarity") || 0);
    const limit = Math.min(Number(searchParams.get("limit") || 100), 400);

    let query = supabase.from("convergence_relationships").select("*").limit(limit);
    if (sourceId) query = query.eq("source_id", sourceId);
    if (!Number.isNaN(minSimilarity)) query = query.gte("similarity", minSimilarity);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch concept relationships" },
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
    const { sourceId, targetId, similarity = 0.5, source_citation, notes } = body || {};
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: "sourceId and targetId are required" }, { status: 400 });
    }
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("convergence_relationships")
      .insert({ source_id: sourceId, target_id: targetId, similarity, source_citation, notes })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ relationship: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create concept relationship" },
      { status: 500 }
    );
  }
}


