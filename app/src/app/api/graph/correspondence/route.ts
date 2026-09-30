import { NextResponse } from "next/server";

import { loadPublicCorrespondenceGraph } from "@/lib/graph/correspondence-graph.server";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Public symbolism graph payload. Uses the service role and sequential paging so
 * anon clients never fan out dozens of exact-count PostgREST queries under the
 * 3s statement_timeout.
 */
export async function GET() {
  try {
    const graph = await loadPublicCorrespondenceGraph();
    const response = NextResponse.json({
      entities: graph.entities,
      edges: graph.edges,
      entityCount: graph.entityCount,
      edgeCount: graph.edgeCount,
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );
    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to load correspondence graph") },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
