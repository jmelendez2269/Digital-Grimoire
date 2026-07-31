import { NextRequest, NextResponse } from "next/server";

import {
  sanitizePublicCatalogSearch,
  sanitizePublicLibraryMetadata,
} from "@/lib/library/public-catalog";
import { createServiceClient } from "@/lib/supabase/service";

const PUBLIC_LIBRARY_COLUMNS =
  "id,title,author,year,type,domain,tags,lenses,status,created_at,cover_image_url,short_summary,curator_note,metadata";

const SORT_FIELDS = new Set([
  "title",
  "author",
  "year",
  "created_at",
  "domain",
  "type",
]);

function boundedInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function publicCacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const supabase = createServiceClient();

    if (searchParams.get("mode") === "filters") {
      const { data, error } = await supabase
        .from("texts")
        .select("domain,type,tags,lenses")
        .is("parent_id", null)
        .eq("status", "ready");

      if (error) {
        console.error("[public library] Failed to load filter options:", error);
        return NextResponse.json(
          { error: "The Library filters could not be loaded." },
          { status: 500 }
        );
      }

      const domains = new Set<string>();
      const types = new Set<string>();
      const tags = new Set<string>();

      for (const row of data ?? []) {
        if (typeof row.domain === "string" && row.domain)
          domains.add(row.domain);
        if (typeof row.type === "string" && row.type) types.add(row.type);
        if (Array.isArray(row.tags)) {
          row.tags.forEach((tag) => {
            if (typeof tag === "string" && tag) tags.add(tag);
          });
        }
      }

      return NextResponse.json(
        {
          domains: [...domains].sort(),
          types: [...types].sort(),
          allTags: [...tags].sort(),
          allLenses: [
            "scientific",
            "psychological",
            "philosophical",
            "religious_spiritual",
            "historical_anthropological",
            "symbolic_occult",
            "mathematical",
          ],
        },
        { headers: publicCacheHeaders() }
      );
    }

    const page = boundedInteger(searchParams.get("page"), 1, 1, 10_000);
    const limit = boundedInteger(searchParams.get("limit"), 24, 1, 48);
    const search = sanitizePublicCatalogSearch(searchParams.get("search"));
    const domain = searchParams.get("domain");
    const type = searchParams.get("type");
    const yearMin = searchParams.get("yearMin");
    const yearMax = searchParams.get("yearMax");
    const tags = (searchParams.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);
    const lenses = (searchParams.get("lenses") ?? "")
      .split(",")
      .map((lens) => lens.trim())
      .filter(Boolean)
      .slice(0, 7);
    const requestedSort = searchParams.get("sortBy") ?? "created_at";
    const sortField = SORT_FIELDS.has(requestedSort)
      ? requestedSort
      : "created_at";
    const ascending = searchParams.get("sortOrder") === "asc";

    let query = supabase
      .from("texts")
      .select(PUBLIC_LIBRARY_COLUMNS, { count: "exact" })
      .is("parent_id", null)
      .eq("status", "ready");

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }
    if (domain && domain !== "all") query = query.eq("domain", domain);
    if (type && type !== "all") query = query.eq("type", type);
    if (yearMin) query = query.gte("year", boundedInteger(yearMin, 0, 0, 9999));
    if (yearMax)
      query = query.lte("year", boundedInteger(yearMax, 9999, 0, 9999));
    if (tags.length > 0) query = query.overlaps("tags", tags);
    if (lenses.length > 0) query = query.overlaps("lenses", lenses);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query
      .order(sortField, { ascending, nullsFirst: false })
      .range(from, to);

    if (error) {
      console.error("[public library] Failed to load catalog:", error);
      return NextResponse.json(
        { error: "The Library catalog could not be loaded." },
        { status: 500 }
      );
    }

    const texts = (data ?? []).map((row) => ({
      ...row,
      metadata: sanitizePublicLibraryMetadata(row.metadata),
    }));

    return NextResponse.json(
      {
        texts,
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
      { headers: publicCacheHeaders() }
    );
  } catch (error) {
    console.error("[public library] Unexpected catalog error:", error);
    return NextResponse.json(
      { error: "The Library catalog could not be loaded." },
      { status: 500 }
    );
  }
}
