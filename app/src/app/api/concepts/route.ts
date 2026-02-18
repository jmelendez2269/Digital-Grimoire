
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { slugifyEntityName } from "@/lib/graph/entity-utils";
import { validateConceptData } from "@/lib/parallax/validation";
import {
  scoreConceptsWithAI,
  shouldUseAIScoring,
  getCachedScores,
  cacheScores,
} from "@/lib/concepts/ai-relevance";

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

    // Build query - start simple without relationship to avoid errors
    // We can add the relationship later if needed, but for now prioritize reliability
    let query = supabase
      .from("convergence_concepts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit * 2); // Get more results to sort by relevance

    if (tradition) query = query.eq("tradition", tradition);
    if (traditionId) query = query.eq("tradition_id", traditionId);
    if (tag) query = query.contains("tags", [tag]);
    if (q) query = query.ilike("name", `% ${q}% `);

    const { data, error } = await query;

    console.log(`[API] GET / api / concepts - Found ${data?.length || 0} concepts`, {
      limit,
      tradition,
      traditionId,
      tag,
      q,
      hasData: !!data,
      dataLength: data?.length
    });

    // Sort by relevance if we have a query
    let sortedData = data || [];
    if (q && sortedData.length > 0) {
      const queryLower = q.toLowerCase();
      sortedData = sortedData.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();

        // Exact match gets highest priority
        if (aName === queryLower && bName !== queryLower) return -1;
        if (bName === queryLower && aName !== queryLower) return 1;

        // Starts with query gets second priority
        const aStarts = aName.startsWith(queryLower);
        const bStarts = bName.startsWith(queryLower);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        // Word boundary match (starts with word) gets third priority
        const aWordStart = new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `, 'i').test(aName);
        const bWordStart = new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `, 'i').test(bName);
        if (aWordStart && !bWordStart) return -1;
        if (bWordStart && !aWordStart) return 1;

        // Then by position of match (earlier is better)
        const aIndex = aName.indexOf(queryLower);
        const bIndex = bName.indexOf(queryLower);
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        // Finally by name length (shorter is better for exact matches)
        return aName.length - bName.length;
      }).slice(0, limit); // Limit after sorting
    } else if (sortedData.length > limit) {
      sortedData = sortedData.slice(0, limit);
    }

    if (error) {
      console.error('Error fetching concepts:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));

      // If table doesn't exist (PGRST205), return empty array instead of error
      // This allows the UI to work even if migrations haven't been run yet
      // If table doesn't exist (PGRST205), return empty array instead of error
      // This allows the UI to work even if migrations haven't been run yet
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('convergence_concepts table does not exist. Migration 019 may not have been run.');
        console.warn('Returning empty results. Please run migration: migrations/019_add_convergence_concepts.sql');

        const response = NextResponse.json({ items: [] });
        response.headers.set(
          'Cache-Control',
          'public, s-maxage=60, stale-while-revalidate=120'
        );
        return response;
      }

      return NextResponse.json(
        {
          error: error.message || "Failed to fetch concepts",
          details: process.env.NODE_ENV === 'development' ? error : undefined
        },
        { status: 500 }
      );
    }

    console.log(`[API] GET / api / concepts - Returning ${sortedData.length} concepts after sorting / filtering`);

    const response = NextResponse.json({ items: sortedData });

    // Add cache headers for public, read-only data (1 hour)
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=7200'
    );

    return response;
  } catch (err: any) {
    console.error('Unexpected error in GET /api/concepts:', err);
    console.error('Error stack:', err?.stack);
    return NextResponse.json(
      {
        error: err?.message || "Failed to fetch concepts",
        details: process.env.NODE_ENV === 'development' ? String(err) : undefined
      },
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

    // Validate input data structure
    const dataValidation = validateConceptData({
      name,
      tradition,
      traditionId,
      slug,
    });
    if (!dataValidation.valid) {
      return NextResponse.json(
        { error: dataValidation.error || "Invalid concept data" },
        { status: 400 }
      );
    }

    // Additional validation for arrays
    if (!Array.isArray(primary_sources)) {
      return NextResponse.json(
        { error: "primary_sources must be an array" },
        { status: 400 }
      );
    }
    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: "tags must be an array" },
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

    // Check for existing concept by slug (primary check)
    const finalSlug = slug || slugifyEntityName(name);
    let { data: existingConcept } = await svc
      .from("convergence_concepts")
      .select("id, name, slug, tradition")
      .eq("slug", finalSlug)
      .maybeSingle();

    // If not found by slug, check by exact name match (case-insensitive)
    if (!existingConcept) {
      const { data: nameMatch } = await svc
        .from("convergence_concepts")
        .select("id, name, slug, tradition")
        .ilike("name", name.trim())
        .maybeSingle();

      // Only use if it's an exact match (case-insensitive)
      if (nameMatch && nameMatch.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        existingConcept = nameMatch;
      }
    }

    // If concept already exists, return error with existing concept info
    if (existingConcept) {
      return NextResponse.json(
        {
          error: "Concept already exists",
          existingEntity: {
            id: existingConcept.id,
            name: existingConcept.name,
            slug: existingConcept.slug,
            tradition: existingConcept.tradition
          }
        },
        { status: 409 } // 409 Conflict
      );
    }

    const { data, error } = await svc
      .from("convergence_concepts")
      .insert({
        name,
        slug: finalSlug,
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


