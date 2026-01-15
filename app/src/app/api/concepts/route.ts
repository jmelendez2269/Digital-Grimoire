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
    const q = searchParams.get("q");
    const tradition = searchParams.get("tradition");
    const traditionId = searchParams.get("traditionId");
    const tag = searchParams.get("tag");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    let query = supabase
      .from("convergence_concepts")
      .select("*, tradition_ref:convergence_traditions(id, slug, label, color, icon)")
      .limit(limit);
    if (tradition) query = query.eq("tradition", tradition);
    if (traditionId) query = query.eq("tradition_id", traditionId);
    if (tag) query = query.contains("tags", [tag]);
    if (q) query = query.ilike("name", `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;
    
    const response = NextResponse.json({ items: data || [] });
    
    // Add cache headers for public, read-only data (1 hour)
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=7200'
    );
    
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch concepts" },
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
      name,
      slug,
      tradition,
      traditionId,
      era,
      short_definition,
      primary_sources = [],
      tags = [],
    } = body || {};
    if (!name || (!tradition && !traditionId)) {
      return NextResponse.json(
        { error: "name and tradition/traditionId are required" },
        { status: 400 }
      );
    }
    const svc = createServiceClient();
    let resolvedTraditionId = traditionId as string | undefined;
    let resolvedTradition = tradition as string | undefined;

    if (resolvedTraditionId && !resolvedTradition) {
      const { data: traditionRow, error: traditionError } = await svc
        .from("convergence_traditions")
        .select("label")
        .eq("id", resolvedTraditionId)
        .single();
      if (traditionError) throw traditionError;
      resolvedTradition = traditionRow.label;
    }

    if (!resolvedTraditionId && resolvedTradition) {
      const { data: traditionRow } = await svc
        .from("convergence_traditions")
        .select("id")
        .eq("label", resolvedTradition)
        .single();
      resolvedTraditionId = traditionRow?.id;
    }

    const { data, error } = await svc
      .from("convergence_concepts")
      .insert({
        name,
        slug,
        tradition: resolvedTradition,
        tradition_id: resolvedTraditionId,
        era,
        short_definition,
        primary_sources,
        tags,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ concept: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create concept" },
      { status: 500 }
    );
  }
}


