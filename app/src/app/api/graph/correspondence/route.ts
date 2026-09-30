import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

import { loadPublicCorrespondenceGraph } from "@/lib/graph/correspondence-graph.server";

/** Sequential Supabase paging for ~2k entities / ~32k edges is typically well under 60s. */
export const maxDuration = 60;

const CACHE_SECONDS = 300;

const getCachedPublicCorrespondenceGraph = unstable_cache(
  async () => loadPublicCorrespondenceGraph(),
  ["public-correspondence-graph-v2"],
  { revalidate: CACHE_SECONDS },
);

/**
 * Public symbolism graph payload (v2, CDN-sized). Uses the service role and
 * sequential paging so anon clients never fan out dozens of exact-count
 * PostgREST queries under the 3s statement_timeout.
 */
export async function GET() {
  try {
    const graph = await getCachedPublicCorrespondenceGraph();
    const response = NextResponse.json(graph);
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`,
    );
    return response;
  } catch (err: unknown) {
    console.error("Failed to load public correspondence graph bundle.", err);
    return NextResponse.json(
      { error: "Correspondence graph is temporarily unavailable" },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
