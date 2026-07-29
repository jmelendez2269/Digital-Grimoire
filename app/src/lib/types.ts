/**
 * Shared type definitions for text selection positions
 * Used across PDF, HTML, and Chapter viewers
 */

export interface TextPosition {
  pageIndex?: number;
  chapterId?: string;
  rects?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber?: number;
  }>;
  [key: string]: unknown; // Allow additional properties for flexibility
}

export type GraphType = 'parallax' | 'correspondences';

export type ConceptGraphSource = 'course' | 'legacy';

export type CourseGraphEntityKind =
  | 'course'
  | 'lesson'
  | 'work'
  | 'edition'
  | 'passage'
  | 'person'
  | 'tradition'
  | 'concept'
  | 'institution'
  | 'artifact';

export type CourseGraphReviewState =
  | 'candidate'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'deferred';

export interface CourseGraphImport {
  id: string;
  bundle_slug: string;
  version: number;
  course_stable_id: string;
  course_slug: string;
  course_id_tag: string;
  canonical_course_id: string | null;
  vocabulary_version: string;
  source_path: string;
  source_sha256: string;
  package_sha256: string;
  source_status: string;
  run_mode: string;
  prepared_on: string;
  review_state: string;
  imported_at: string;
}

export interface CourseGraphEntity {
  id: string;
  import_id: string;
  stable_id: string;
  entity_kind: CourseGraphEntityKind;
  slug: string;
  name: string;
  aliases: string[];
  synthesis_draft: string;
  synthesis_live: string | null;
  course_role: string | null;
  identity_state: 'existing' | 'merge_candidate' | 'new' | 'unresolved';
  review_state: CourseGraphReviewState;
  candidate_class: string;
  evidence_keys: string[];
  canonical_refs: unknown[];
  metadata: Record<string, unknown>;
}

export interface CourseGraphEdge {
  id: string;
  import_id: string;
  stable_id: string;
  source_id: string;
  target_id: string;
  predicate: string;
  type: string;
  edge_class: 'structural' | 'interpretive';
  epistemic_kind:
    | 'artifact_documented'
    | 'documented_historical'
    | 'conceptual'
    | 'editorial'
    | 'tradition';
  scope: string | null;
  confidence: 'established' | 'interpretive' | 'speculative' | 'tradition';
  weight: number | null;
  connection_summary_draft: string;
  connection_summary_live: string | null;
  review_state: CourseGraphReviewState;
  candidate_class: string;
  evidence_keys: string[];
  metadata: Record<string, unknown>;
}

export interface CourseGraphEvidence {
  id: string;
  import_id: string;
  evidence_key: string;
  evidence_class: string;
  heading_path: string;
  locator: string;
  excerpt: string;
  source_path: string;
  source_sha256: string;
}

export interface CourseGraphBlockedInference {
  id: string;
  import_id: string;
  proposal: string;
  reason: string;
  evidence_keys: string[];
}

export interface CourseGraphPayload {
  import: CourseGraphImport;
  entities: CourseGraphEntity[];
  edges: CourseGraphEdge[];
  evidence: CourseGraphEvidence[];
  blocked_inferences: CourseGraphBlockedInference[];
  counts: {
    entities: number;
    edges: number;
    evidence: number;
    blocked_inferences: number;
  };
}

export interface ParallaxConcept {
  id: string;
  slug: string;
  name: string;
  tradition: string | null;
  tradition_ref?: {
    id: string;
    slug: string;
    label: string;
    color?: string;
    icon?: string;
  };
  era?: string;
  short_definition?: string;
  primary_sources?: string[];
  tags?: string[];
  created_at?: string;
}

export interface CorrespondenceEntity {
  id: string;
  slug?: string;
  name: string;
  category: string | null;
  type?: {
    id: string;
    slug: string;
    label: string;
    color?: string;
    icon?: string;
  };
  aliases?: string[];
  description?: string;
  lenses?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Relationship {
  id: string;
  source: string; // or object depending on d3 usage
  target: string;
  type: string;
  strength?: number;
}

export interface ParallaxRelationship {
  id: string;
  source_id: string;
  target_id: string;
  similarity: number;
  source_citation?: string;
  notes?: string;
  // visualization props
  source?: unknown;
  target?: unknown;
}
