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
    const category = searchParams.get("category");
    const typeId = searchParams.get("typeId");
    const q = searchParams.get("q");
    const lens = searchParams.get("lens");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    let query = supabase
      .from("correspondences")
      .select("*, type:correspondence_entity_types(id, slug, label, color, icon)")
      .limit(limit);

    if (category) query = query.eq("category", category);
    if (typeId) query = query.eq("type_id", typeId);
    if (lens) query = query.contains("lenses", [lens]);
    if (q) query = query.ilike("name", `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;
    
    const response = NextResponse.json({ items: data || [] });
    
    // Add cache headers for public, read-only data (15 minutes)
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=900, stale-while-revalidate=1800'
    );
    
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch entities" },
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
      category,
      typeId,
      aliases = [],
      description,
      lenses = [],
    } = body || {};
    if (!name || (!category && !typeId)) {
      return NextResponse.json(
        { error: "name and category/typeId are required" },
        { status: 400 }
      );
    }
    const svc = createServiceClient();
    let resolvedTypeId = typeId as string | undefined;
    let resolvedCategory = category as string | undefined;

    if (resolvedTypeId && !resolvedCategory) {
      const { data: typeRow, error: typeError } = await svc
        .from("correspondence_entity_types")
        .select("slug")
        .eq("id", resolvedTypeId)
        .single();
      if (typeError) throw typeError;
      resolvedCategory = typeRow.slug;
    }

    if (!resolvedTypeId && resolvedCategory) {
      const { data: typeRow } = await svc
        .from("correspondence_entity_types")
        .select("id")
        .eq("slug", resolvedCategory)
        .single();
      resolvedTypeId = typeRow?.id;
    }

    const { data, error } = await svc
      .from("correspondences")
      .insert({
        name,
        slug,
        category: resolvedCategory,
        type_id: resolvedTypeId,
        aliases,
        description,
        lenses,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ entity: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create entity" },
      { status: 500 }
    );
  }
}


