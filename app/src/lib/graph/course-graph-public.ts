import fd01PatternTestFallback from "@/content/course-graphs/fd01-w03-pattern-test.generated.json";

export type PublicCourseGraphEntity = {
  stable_id: string;
  entity_kind:
    | "course"
    | "lesson"
    | "work"
    | "edition"
    | "passage"
    | "person"
    | "tradition"
    | "concept"
    | "institution"
    | "artifact";
  subtype: string | null;
  slug: string;
  display_name: string;
  aliases: string[];
  short_definition: string;
  synthesis: string;
  course_role: string | null;
  caveats: string[];
};

export type PublicCourseGraphEdge = {
  stable_id: string;
  source_stable_id: string;
  target_stable_id: string;
  predicate: string;
  scope: "course_context" | "global" | null;
  confidence: "established" | "tradition" | "interpretive" | "speculative";
  connection_summary: string;
  caveats: string[];
  evidence_ids: string[];
  weight: number | null;
};

export type PublicCourseGraphCitation = {
  evidence_key: string;
  evidence_class:
    | "course_structure"
    | "direct_statement"
    | "bibliographic"
    | "documented_history"
    | "tradition_attestation"
    | "scholarly_interpretation"
    | "editorial_choice";
  citation: string;
  source_url: string | null;
  locator: string;
};

export type PublicCourseGraphPackage = {
  schema_version: "course-graph-learner/v1";
  course: {
    stable_id: string;
    course_id_tag: string;
    slug: string;
    title: string;
  };
  vocabulary_version: "course-graph-v1";
  selected_view: {
    view_id: string;
    label: string;
    description: string;
    edge_ids: string[];
    focus_stable_id: string;
  };
  entities: PublicCourseGraphEntity[];
  edges: PublicCourseGraphEdge[];
  citations: PublicCourseGraphCitation[];
  reviewed_non_edges: Array<{
    statement: string;
    evidence_ids: string[];
    caveats: string[];
  }>;
};

export const FD01_COURSE_SLUG =
  "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning";
export const FD01_PATTERN_TEST_VIEW = "fd01-w03-pattern-test";
export const FD01_PATTERN_TEST_FOCUS =
  `lesson:${FD01_COURSE_SLUG}:w03`;

export function isFd01GraphPreviewEnabled(
  value = process.env.NEXT_PUBLIC_ENABLE_FD01_GRAPH_PREVIEW,
) {
  return value === "true";
}

/**
 * Generated learner-safe projection of the exact saved view in the FD01
 * semantic manifest. The graph tests regenerate the same projection through
 * the sanitizer and require deep equality, preventing this fallback from
 * drifting away from its evidence, caveats, or ordered edge set.
 */
export const FD01_PATTERN_TEST_FALLBACK =
  fd01PatternTestFallback as PublicCourseGraphPackage;
