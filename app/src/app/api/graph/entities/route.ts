import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { slugifyEntityName } from "@/lib/graph/entity-utils";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

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
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 5000);

    let query = supabase
      .from("correspondences")
      .select("id, slug, name, category, aliases, description, lenses, created_at, updated_at, type:correspondence_entity_types(id, slug, label, color, icon)", { count: "exact" })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq("category", category);
    if (typeId) query = query.eq("type_id", typeId);
    if (lens) query = query.contains("lenses", [lens]);
    if (q) query = query.ilike("name", `%${q}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    const items = data || [];
    const total = count ?? items.length;

    const response = NextResponse.json({
      items,
      total,
      offset,
      limit,
      hasMore: offset + items.length < total,
    });

    // Keep this fresh while we iterate on graph exploration behavior.
    response.headers.set(
      'Cache-Control',
      'no-store'
    );

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to fetch entities") },
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

    // Check for existing entity by slug (primary check)
    const finalSlug = slug || slugifyEntityName(name);
    let { data: existingEntity } = await svc
      .from("correspondences")
      .select("id, name, slug, category")
      .eq("slug", finalSlug)
      .maybeSingle();

    // If not found by slug, check by exact name match (case-insensitive)
    if (!existingEntity) {
      const { data: nameMatch } = await svc
        .from("correspondences")
        .select("id, name, slug, category")
        .ilike("name", name.trim())
        .maybeSingle();

      // Only use if it's an exact match (case-insensitive)
      if (nameMatch && nameMatch.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        existingEntity = nameMatch;
      }
    }

    // If entity already exists, return error with existing entity info
    if (existingEntity) {
      return NextResponse.json(
        {
          error: "Entity already exists",
          existingEntity: {
            id: existingEntity.id,
            name: existingEntity.name,
            slug: existingEntity.slug,
            category: existingEntity.category
          }
        },
        { status: 409 } // 409 Conflict
      );
    }

    const { data, error } = await svc
      .from("correspondences")
      .insert({
        name,
        slug: finalSlug,
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
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to create entity") },
      { status: 500 }
    );
  }
}


