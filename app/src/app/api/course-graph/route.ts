import { NextRequest, NextResponse } from "next/server";

import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  CourseGraphBlockedInference,
  CourseGraphEdge,
  CourseGraphEntity,
  CourseGraphEvidence,
  CourseGraphImport,
  CourseGraphPayload,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type CourseGraphEntityRow = Omit<CourseGraphEntity, "name"> & {
  display_name: string;
};

type CourseGraphEdgeRow = Omit<CourseGraphEdge, "source_id" | "target_id" | "type"> & {
  source_entity_id: string;
  target_entity_id: string;
};

async function canReadCandidateGraph() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let isLocalSupabase = false;
  try {
    const hostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";
    isLocalSupabase = hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    isLocalSupabase = false;
  }

  if (process.env.NODE_ENV === "development" && isLocalSupabase) return true;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin";
}

function databaseError(message: string, error: { message?: string } | null) {
  return NextResponse.json(
    {
      error: message,
      detail: error?.message || "Unknown database error",
    },
    {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function GET(request: NextRequest) {
  if (!(await canReadCandidateGraph())) {
    return NextResponse.json(
      {
        error: "Candidate graph access is restricted to curators.",
        code: "COURSE_GRAPH_REVIEW_ONLY",
      },
      {
        status: 403,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  try {
    const service = createServiceClient();
    const bundleSlug = request.nextUrl.searchParams.get("bundle");

    let importQuery = service
      .from("course_graph_imports")
      .select(
        "id,bundle_slug,version,course_stable_id,course_slug,course_id_tag,canonical_course_id,vocabulary_version,source_path,source_sha256,package_sha256,source_status,run_mode,prepared_on,review_state,imported_at",
      )
      .order("imported_at", { ascending: false })
      .limit(1);

    if (bundleSlug) {
      importQuery = importQuery.eq("bundle_slug", bundleSlug);
    }

    const { data: imports, error: importError } = await importQuery;
    if (importError) return databaseError("Unable to load the course graph import.", importError);

    const graphImport = (imports?.[0] || null) as CourseGraphImport | null;
    if (!graphImport) {
      return NextResponse.json(
        {
          error: "No course graph candidate import was found.",
          code: "COURSE_GRAPH_EMPTY",
        },
        {
          status: 404,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }

    const [entitiesResult, edgesResult, evidenceResult, blockedResult] = await Promise.all([
      service
        .from("course_graph_entities")
        .select(
          "id,import_id,stable_id,entity_kind,slug,display_name,aliases,synthesis_draft,synthesis_live,course_role,identity_state,review_state,candidate_class,evidence_keys,canonical_refs,metadata",
        )
        .eq("import_id", graphImport.id)
        .order("entity_kind")
        .order("display_name"),
      service
        .from("course_graph_edges")
        .select(
          "id,import_id,stable_id,source_entity_id,target_entity_id,predicate,edge_class,epistemic_kind,scope,confidence,weight,connection_summary_draft,connection_summary_live,review_state,candidate_class,evidence_keys,metadata",
        )
        .eq("import_id", graphImport.id)
        .order("predicate")
        .order("stable_id"),
      service
        .from("course_graph_evidence")
        .select(
          "id,import_id,evidence_key,evidence_class,heading_path,locator,excerpt,source_path,source_sha256",
        )
        .eq("import_id", graphImport.id)
        .order("evidence_key"),
      service
        .from("course_graph_blocked_inferences")
        .select("id,import_id,proposal,reason,evidence_keys")
        .eq("import_id", graphImport.id)
        .order("proposal"),
    ]);

    if (entitiesResult.error) {
      return databaseError("Unable to load course graph entities.", entitiesResult.error);
    }
    if (edgesResult.error) {
      return databaseError("Unable to load course graph edges.", edgesResult.error);
    }
    if (evidenceResult.error) {
      return databaseError("Unable to load course graph evidence.", evidenceResult.error);
    }
    if (blockedResult.error) {
      return databaseError("Unable to load blocked inferences.", blockedResult.error);
    }

    const entities = ((entitiesResult.data || []) as CourseGraphEntityRow[]).map(
      ({ display_name, ...entity }) => ({
        ...entity,
        name: display_name,
      }),
    );
    const edges = ((edgesResult.data || []) as CourseGraphEdgeRow[]).map(
      ({ source_entity_id, target_entity_id, ...edge }) => ({
        ...edge,
        source_id: source_entity_id,
        target_id: target_entity_id,
        type: edge.predicate,
        weight: edge.weight === null ? null : Number(edge.weight),
      }),
    );
    const evidence = (evidenceResult.data || []) as CourseGraphEvidence[];
    const blockedInferences = (blockedResult.data || []) as CourseGraphBlockedInference[];

    const payload: CourseGraphPayload = {
      import: graphImport,
      entities,
      edges,
      evidence,
      blocked_inferences: blockedInferences,
      counts: {
        entities: entities.length,
        edges: edges.length,
        evidence: evidence.length,
        blocked_inferences: blockedInferences.length,
      },
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load the course graph candidate.",
        detail: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
