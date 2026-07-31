import { createHash } from "node:crypto";

export const COURSE_GRAPH_ENTITY_KINDS = [
  "course",
  "lesson",
  "work",
  "edition",
  "passage",
  "person",
  "tradition",
  "concept",
  "institution",
  "artifact",
] as const;

export type CourseGraphEntityKind = (typeof COURSE_GRAPH_ENTITY_KINDS)[number];

export const COURSE_GRAPH_PREDICATES = [
  "has_lesson",
  "uses_primary_work",
  "uses_companion_work",
  "selects_passage",
  "passage_of",
  "edition_of",
  "authored_by",
  "translated_by",
  "edited_by",
  "compiled_by",
  "published_by",
  "hosted_by",
  "situated_in_tradition",
  "builds_artifact",
  "continues_to",
  "contextualizes",
  "explores",
  "defines",
  "distinguishes_from",
  "contrasts_with",
  "critiques",
  "refines",
  "responds_to",
  "historically_connected_to",
  "influenced_by",
  "derives_from",
  "conceptually_similar_to",
  "editorially_juxtaposed_with",
  "doctrinally_related_to",
  "corresponds_to",
  "associated_with",
] as const;

export const COURSE_GRAPH_EVIDENCE_CLASSES = [
  "course_structure",
  "direct_statement",
  "bibliographic",
  "documented_history",
  "tradition_attestation",
  "scholarly_interpretation",
  "editorial_choice",
] as const;

export const COURSE_GRAPH_IDENTITY_STATES = [
  "existing",
  "new",
  "merge_candidate",
  "unresolved",
  "excluded",
] as const;

export const COURSE_GRAPH_CONFIDENCE_VALUES = [
  "established",
  "tradition",
  "interpretive",
  "speculative",
] as const;

export const COURSE_GRAPH_SCOPES = [
  "global",
  "course_context",
  "personal",
] as const;

export const COURSE_GRAPH_CLAIM_KEYS = [
  "short_definition",
  "course_role",
  "source_role",
  "historical_context",
  "translation_note",
  "interpretive_caution",
  "creator_attribution",
  "primary_source",
  "why_it_matters",
  "does_not_settle",
  "connection_summary",
] as const;

export const COURSE_GRAPH_REVIEW_STATES = [
  "candidate",
  "revise",
  "approved",
  "rejected",
  "deferred",
] as const;

export const COURSE_GRAPH_SOURCE_READINESS = [
  "ready",
  "ready_with_deferrals",
  "not_ready",
] as const;

export type CourseGraphPredicate = (typeof COURSE_GRAPH_PREDICATES)[number];
export type CourseGraphEvidenceClass =
  (typeof COURSE_GRAPH_EVIDENCE_CLASSES)[number];
export type CourseGraphIdentityState =
  (typeof COURSE_GRAPH_IDENTITY_STATES)[number];
export type CourseGraphConfidence =
  (typeof COURSE_GRAPH_CONFIDENCE_VALUES)[number];
export type CourseGraphScope = (typeof COURSE_GRAPH_SCOPES)[number];
export type CourseGraphClaimKey = (typeof COURSE_GRAPH_CLAIM_KEYS)[number];
export type CourseGraphReviewState =
  (typeof COURSE_GRAPH_REVIEW_STATES)[number];
export type CourseGraphSourceReadiness =
  (typeof COURSE_GRAPH_SOURCE_READINESS)[number];

export type CourseGraphEvidence = {
  evidence_key: string;
  evidence_class: CourseGraphEvidenceClass;
  source_kind: string;
  source_path: string | null;
  source_url: string | null;
  source_sha256: string | null;
  course_id_tag: string | null;
  course_slug: string | null;
  course_uuid: string | null;
  course_version: string | null;
  heading_path: string;
  locator: string;
  library_record_id: string | null;
  text_uuid: string | null;
  catalog_id: string | null;
  citation: string;
  accessed_on: string | null;
  excerpt: string;
  extractor: string;
  notes: string | null;
};

export type CourseGraphEntity = {
  stable_id: string;
  entity_kind: CourseGraphEntityKind;
  subtype: string | null;
  slug: string;
  display_name: string;
  aliases: string[];
  short_definition: string;
  synthesis: string;
  course_role: string | null;
  caveats: string[];
  identity_state: CourseGraphIdentityState;
  review_state: CourseGraphReviewState;
  candidate_class: string;
  evidence_keys: string[];
  canonical_refs: unknown[];
  metadata: Record<string, unknown>;
};

export type CourseGraphEdge = {
  stable_id: string;
  source_stable_id: string;
  target_stable_id: string;
  predicate: CourseGraphPredicate;
  edge_class: "structural" | "interpretive";
  epistemic_kind: string;
  scope: CourseGraphScope | null;
  confidence: CourseGraphConfidence;
  review_state: CourseGraphReviewState;
  candidate_class: string;
  evidence_keys: string[];
  connection_summary: string;
  caveats: string[];
  weight: number | null;
  metadata: Record<string, unknown>;
};

export type CourseGraphBlockedInference = {
  candidate_id?: string;
  proposal: string;
  reason: string;
  evidence_keys: string[];
  review_state?: Extract<CourseGraphReviewState, "rejected" | "deferred">;
  reviewer?: string | null;
  reviewed_on?: string | null;
};

export type CourseGraphClaim = {
  claim_id: string;
  subject_stable_id: string;
  claim_key: CourseGraphClaimKey;
  value: string;
  knowledge_source: string;
  evidence_keys: string[];
  caveats: string[];
  review_state: CourseGraphReviewState;
};

export type CourseGraphReviewDecision = {
  decision_id: string;
  candidate_id: string;
  decision: "approved" | "revise" | "rejected" | "deferred" | "merged";
  reviewer: string;
  decided_on: string;
  reason: string;
  replacement_id: string | null;
  merge_target_id: string | null;
};

export type CourseGraphRejectedCandidate = {
  candidate_id: string;
  candidate_kind: "entity" | "edge" | "claim" | "inference";
  proposal: string;
  reason: string;
  evidence_keys: string[];
  review_state: Extract<CourseGraphReviewState, "rejected" | "deferred">;
  reviewer: string | null;
  reviewed_on: string | null;
  replacement_id: string | null;
};

export type CourseGraphSavedView = {
  view_id: string;
  label: string;
  description: string;
  edge_ids: string[];
  focus_stable_id: string | null;
};

export type CourseGraphIdentityMapEntry = {
  candidate_stable_id: string;
  identity_state: CourseGraphIdentityState;
  canonical_refs: unknown[];
  aliases: string[];
  notes: string;
};

export type CourseGraphCandidateBundle = {
  schema_version: "course-graph-manifest/v1";
  version: 1;
  bundle_kind: "course_graph_candidate";
  manifest_id: string;
  bundle_slug: string;
  prepared_on: string;
  package: {
    source_path: string;
    source_sha256: string;
    package_sha256: string | null;
    vocabulary_version: string;
    source_status: CourseGraphSourceReadiness;
    run_mode: string;
    release_state: "review_only" | "learner_ready";
  };
  course: {
    stable_id: string;
    course_id_tag: string;
    canonical_course_id: string | null;
    slug: string;
    title?: string;
    format_version?: string | null;
  };
  run: {
    source_sha256: string;
    base_manifest_sha256: string | null;
    mode: "review-only";
  };
  evidence: CourseGraphEvidence[];
  entities: CourseGraphEntity[];
  edges: CourseGraphEdge[];
  claims: CourseGraphClaim[];
  blocked_inferences: CourseGraphBlockedInference[];
  rejected_candidates: CourseGraphRejectedCandidate[];
  identity_map: CourseGraphIdentityMapEntry[];
  review_decisions: CourseGraphReviewDecision[];
  review: {
    review_state: CourseGraphReviewState;
    source_readiness: CourseGraphSourceReadiness;
    learner_ready: boolean;
    saved_views: CourseGraphSavedView[];
    notes: string[];
  };
  tombstones: unknown[];
};

type MarkdownTable = {
  heading: string;
  headers: string[];
  rows: Record<string, string>[];
};

const STRUCTURAL_PREDICATES = new Set<CourseGraphPredicate>(
  COURSE_GRAPH_PREDICATES.slice(0, 16),
);

const SYMMETRIC_PREDICATES = new Set<CourseGraphPredicate>([
  "contrasts_with",
  "conceptually_similar_to",
  "editorially_juxtaposed_with",
  "historically_connected_to",
  "doctrinally_related_to",
  "corresponds_to",
  "associated_with",
]);

const PREDICATE_ENDPOINT_KINDS: Partial<
  Record<
    CourseGraphPredicate,
    {
      source: readonly CourseGraphEntityKind[];
      target: readonly CourseGraphEntityKind[];
    }
  >
> = {
  has_lesson: { source: ["course"], target: ["lesson"] },
  uses_primary_work: {
    source: ["course", "lesson"],
    target: ["work"],
  },
  uses_companion_work: {
    source: ["course", "lesson"],
    target: ["work"],
  },
  selects_passage: { source: ["lesson"], target: ["passage"] },
  passage_of: { source: ["passage"], target: ["work"] },
  edition_of: { source: ["edition"], target: ["work"] },
  authored_by: { source: ["work"], target: ["person"] },
  translated_by: {
    source: ["edition", "work"],
    target: ["person"],
  },
  edited_by: { source: ["edition", "work"], target: ["person"] },
  compiled_by: { source: ["work"], target: ["person"] },
  published_by: { source: ["edition"], target: ["institution"] },
  hosted_by: {
    source: ["edition", "work", "passage"],
    target: ["institution"],
  },
  situated_in_tradition: {
    source: ["concept", "work", "person"],
    target: ["tradition"],
  },
  builds_artifact: { source: ["lesson"], target: ["artifact"] },
  continues_to: {
    source: ["lesson", "artifact"],
    target: ["lesson", "artifact"],
  },
  contextualizes: {
    source: ["course", "lesson", "work", "passage"],
    target: ["work", "passage", "person", "tradition", "concept"],
  },
  explores: {
    source: ["course", "lesson", "work", "passage"],
    target: ["concept"],
  },
  defines: {
    source: ["lesson", "work", "passage", "concept"],
    target: ["concept"],
  },
  distinguishes_from: {
    source: ["concept"],
    target: ["concept"],
  },
  refines: { source: ["concept"], target: ["concept"] },
  responds_to: { source: ["concept"], target: ["concept"] },
};

const PREDICATE_EVIDENCE_REQUIREMENTS: Partial<
  Record<CourseGraphPredicate, readonly CourseGraphEvidenceClass[]>
> = {
  historically_connected_to: ["documented_history"],
  influenced_by: ["documented_history"],
  derives_from: ["documented_history"],
  conceptually_similar_to: [
    "direct_statement",
    "scholarly_interpretation",
    "editorial_choice",
  ],
  editorially_juxtaposed_with: ["course_structure", "editorial_choice"],
  doctrinally_related_to: [
    "direct_statement",
    "documented_history",
    "tradition_attestation",
    "scholarly_interpretation",
  ],
  corresponds_to: ["direct_statement", "tradition_attestation"],
  associated_with: [
    "direct_statement",
    "bibliographic",
    "documented_history",
    "tradition_attestation",
    "scholarly_interpretation",
  ],
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function isSafePublicEvidenceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function sameJsonValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    [...left].sort(compareCanonicalText).every(
      (value, index) => value === [...right].sort(compareCanonicalText)[index],
    )
  );
}

function sameJsonSet(left: readonly unknown[], right: readonly unknown[]) {
  const serialize = (items: readonly unknown[]) =>
    items.map((item) => JSON.stringify(item)).sort(compareCanonicalText);
  return sameJsonValue(serialize(left), serialize(right));
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function trimCode(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("`") && trimmed.endsWith("`")
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

function plainText(value: string) {
  return trimCode(value)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_]/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(value: string) {
  const text = plainText(value);
  const sentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  return sentence || text;
}

function sourceReadiness(value: string): CourseGraphSourceReadiness {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "ready") return "ready";
  if (
    normalized === "ready_with_deferrals" ||
    normalized.includes("learner_ready")
  ) {
    return "ready_with_deferrals";
  }
  if (normalized === "not_ready") return "not_ready";
  throw new Error(`Unsupported source readiness: ${value}`);
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string) {
  return splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTables(markdown: string): MarkdownTable[] {
  const lines = markdown.split(/\r?\n/);
  const tables: MarkdownTable[] = [];
  let heading = "";

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index].match(/^#{2,4}\s+(.+?)\s*$/);
    if (headingMatch) {
      heading = plainText(headingMatch[1]);
      continue;
    }

    if (
      !lines[index].trim().startsWith("|") ||
      index + 1 >= lines.length ||
      !isSeparatorRow(lines[index + 1])
    ) {
      continue;
    }

    const headers = splitTableRow(lines[index]).map(plainText);
    const rows: Record<string, string>[] = [];
    index += 2;

    while (index < lines.length && lines[index].trim().startsWith("|")) {
      const values = splitTableRow(lines[index]);
      const row: Record<string, string> = {};
      headers.forEach((header, columnIndex) => {
        row[header] = values[columnIndex] ?? "";
      });
      rows.push(row);
      index += 1;
    }

    tables.push({ heading, headers, rows });
    index -= 1;
  }

  return tables;
}

function findTable(
  tables: MarkdownTable[],
  requiredHeaders: string[],
  headingPattern?: RegExp,
) {
  return tables.find(
    (table) =>
      requiredHeaders.every((header) => table.headers.includes(header)) &&
      (!headingPattern || headingPattern.test(table.heading)),
  );
}

function evidenceKeys(value: string) {
  return Array.from(value.matchAll(/`?(E-[A-Z0-9-]+)`?/g), (match) => match[1]);
}

function inferEntityKind(heading: string): CourseGraphEntityKind {
  const normalized = heading.toLowerCase();
  if (normalized.includes("course node")) return "course";
  if (normalized.includes("work/source node")) return "work";
  if (normalized.includes("person node")) return "person";
  if (normalized.includes("concept node")) return "concept";
  throw new Error(`Unsupported candidate entity table: ${heading}`);
}

function parseStableId(value: string) {
  const stableId = trimCode(value);
  const separator = stableId.indexOf(":");
  if (separator < 1 || separator === stableId.length - 1) {
    throw new Error(`Invalid stable ID: ${stableId}`);
  }
  return {
    stableId,
    prefix: stableId.slice(0, separator),
    slug: stableId.slice(separator + 1),
  };
}

function parseRelation(value: string) {
  const predicateMatch = value.match(/`([^`]+)`/);
  if (!predicateMatch) {
    throw new Error(`Relationship predicate is not code-formatted: ${value}`);
  }
  const predicate = predicateMatch[1];
  if (!COURSE_GRAPH_PREDICATES.includes(predicate as CourseGraphPredicate)) {
    throw new Error(`Unsupported relationship predicate: ${predicate}`);
  }

  const metadata: Record<string, unknown> = {};
  const metadataMatch = value.match(/\(\s*`([^`]+)`\s*\)/);
  if (metadataMatch) {
    for (const pair of metadataMatch[1].split(",")) {
      const [rawKey, rawValue] = pair.split("=", 2).map((entry) => entry.trim());
      if (!rawKey || rawValue === undefined) continue;
      const numericValue = Number(rawValue);
      metadata[rawKey] = Number.isFinite(numericValue) ? numericValue : rawValue;
    }
  }

  return { predicate: predicate as CourseGraphPredicate, metadata };
}

function applyTemplate(
  template: string,
  sourceName: string,
  targetName: string,
  metadata: Record<string, unknown>,
) {
  return plainText(template)
    .replaceAll("{source}", sourceName)
    .replaceAll("{target}", targetName)
    .replaceAll("{week}", String(metadata.week ?? "unspecified"));
}

function provenanceMap(tables: MarkdownTable[]) {
  const table = findTable(tables, ["Field", "Value"], /source provenance/i);
  if (!table) throw new Error("Source provenance table is missing");
  return new Map(table.rows.map((row) => [plainText(row.Field), plainText(row.Value)] as const));
}

function requiredProvenance(provenance: Map<string, string>, field: string) {
  const value = provenance.get(field);
  if (!value) throw new Error(`Missing source provenance field: ${field}`);
  return value;
}

function parseCourseIdentity(value: string) {
  const [courseTag, canonicalCourseId] = value.split("/").map((part) => part.trim());
  return {
    courseTag,
    canonicalCourseId: canonicalCourseId || null,
  };
}

export function buildCourseGraphCandidateBundle(
  markdown: string,
): CourseGraphCandidateBundle {
  const tables = parseTables(markdown);
  const provenance = provenanceMap(tables);
  const identity = parseCourseIdentity(requiredProvenance(provenance, "Course ID / UUID"));
  const sourcePath = requiredProvenance(provenance, "Repository-relative source path");
  const sourceSha256 = requiredProvenance(provenance, "SHA-256").toLowerCase();
  const courseSlug = requiredProvenance(provenance, "Course production slug in source");
  const preparedOn =
    provenance.get("Accessed / candidate prepared") || new Date(0).toISOString().slice(0, 10);
  const extractor = requiredProvenance(provenance, "Run mode / extractor");
  const readiness = sourceReadiness(
    requiredProvenance(provenance, "Source status"),
  );

  const evidenceTable = findTable(
    tables,
    ["Evidence ID", "Evidence class", "Heading path / lines", "Short supporting excerpt"],
  );
  if (!evidenceTable) throw new Error("Evidence catalog table is missing");

  const evidence = evidenceTable.rows.map((row) => {
    const headingAndLocator = plainText(row["Heading path / lines"]);
    const locatorMatch = headingAndLocator.match(/^(.*?),\s*(L\d+.+)$/);
    return {
      evidence_key: trimCode(row["Evidence ID"]),
      evidence_class: trimCode(row["Evidence class"]) as CourseGraphEvidenceClass,
      source_kind: provenance.get("Source kind") || "course_markdown",
      source_path: sourcePath,
      source_url: null,
      source_sha256: sourceSha256,
      course_id_tag: identity.courseTag,
      course_slug: courseSlug,
      course_uuid: identity.canonicalCourseId,
      course_version: provenance.get("Course format") || null,
      heading_path: locatorMatch?.[1]?.trim() || headingAndLocator,
      locator: locatorMatch?.[2]?.trim() || "",
      library_record_id: null,
      text_uuid: null,
      catalog_id: null,
      citation: `${sourcePath}, ${locatorMatch?.[2]?.trim() || headingAndLocator}`,
      accessed_on: preparedOn,
      excerpt: plainText(row["Short supporting excerpt"]),
      extractor,
      notes: null,
    } satisfies CourseGraphEvidence;
  });

  const entityTables = tables.filter((table) =>
    table.headers.includes("Stable ID") &&
    table.headers.includes("Display name") &&
    table.headers.includes("Draft synthesis") &&
    /^4\.\d+/.test(table.heading),
  );

  const entities = entityTables.flatMap((table) => {
    const entityKind = inferEntityKind(table.heading);
    return table.rows.map((row) => {
      const parsed = parseStableId(row["Stable ID"]);
      if (parsed.prefix !== entityKind) {
        throw new Error(
          `Entity kind mismatch for ${parsed.stableId}: table=${entityKind}, prefix=${parsed.prefix}`,
        );
      }
      return {
        stable_id: parsed.stableId,
        entity_kind: entityKind,
        subtype: null,
        slug: parsed.slug,
        display_name: plainText(row["Display name"]),
        aliases: [],
        short_definition: firstSentence(row["Draft synthesis"]),
        synthesis: plainText(row["Draft synthesis"]),
        course_role: row["Course role"] ? plainText(row["Course role"]) : null,
        caveats: [],
        identity_state: trimCode(row["Identity state"]) as CourseGraphIdentityState,
        review_state: trimCode(row["Review state"]) as CourseGraphReviewState,
        candidate_class: trimCode(row["Candidate class"]),
        evidence_keys: evidenceKeys(row.Evidence),
        canonical_refs: [],
        metadata: {},
      } satisfies CourseGraphEntity;
    });
  });

  const entityByStableId = new Map(
    entities.map((entity) => [entity.stable_id, entity] as const),
  );
  const templateTable = findTable(
    tables,
    ["Predicate", "Draft connection-summary template"],
  );
  if (!templateTable) throw new Error("Connection-summary template table is missing");
  const templateByPredicate = new Map(
    templateTable.rows.map((row) => [
      trimCode(row.Predicate),
      row["Draft connection-summary template"],
    ] as const),
  );

  const edgeTables = tables.filter((table) =>
    table.headers.includes("Edge ID") &&
    table.headers.includes("Source → Target") &&
    /^5\.[2-6]/.test(table.heading),
  );

  const edges = edgeTables.flatMap((table) => {
    const edgeClass = /^5\.[23]/.test(table.heading) ? "structural" : "interpretive";
    return table.rows.map((row) => {
      const endpointCell = row["Source → Target"];
      const [sourceRaw, targetRaw] = endpointCell.split(/\s+→\s+/, 2);
      if (!sourceRaw || !targetRaw) {
        throw new Error(`Invalid edge endpoints: ${endpointCell}`);
      }
      const sourceStableId = trimCode(sourceRaw);
      const targetStableId = trimCode(targetRaw);
      const source = entityByStableId.get(sourceStableId);
      const target = entityByStableId.get(targetStableId);
      if (!source || !target) {
        throw new Error(
          `Missing endpoint for ${trimCode(row["Edge ID"])}: ${sourceStableId} → ${targetStableId}`,
        );
      }

      const { predicate, metadata } = parseRelation(row.Relation);
      const template = templateByPredicate.get(predicate);
      if (!template) {
        throw new Error(`Missing connection-summary template for predicate: ${predicate}`);
      }

      return {
        stable_id: trimCode(row["Edge ID"]),
        source_stable_id: sourceStableId,
        target_stable_id: targetStableId,
        predicate,
        edge_class: edgeClass,
        epistemic_kind: trimCode(row["Epistemic kind"]),
        scope: edgeClass === "interpretive" ? "course_context" : null,
        confidence:
          predicate === "authored_by" || predicate === "translated_by"
            ? "speculative"
            : edgeClass === "structural"
              ? "established"
              : "interpretive",
        review_state: "candidate",
        candidate_class: trimCode(row["Candidate class"]),
        evidence_keys: evidenceKeys(row.Evidence),
        connection_summary: applyTemplate(
          template,
          source.display_name,
          target.display_name,
          metadata,
        ),
        caveats: [],
        weight: null,
        metadata,
      } satisfies CourseGraphEdge;
    });
  });

  const blockedTable = findTable(
    tables,
    ["Blocked proposal", "Reason", "Evidence"],
  );
  const blockedInferences = (blockedTable?.rows || []).map((row) => {
    const proposal = plainText(row["Blocked proposal"]);
    return {
      candidate_id: `inference:${sha256(proposal).slice(0, 16)}`,
      proposal,
      reason: plainText(row.Reason),
      evidence_keys: evidenceKeys(row.Evidence),
      review_state: "rejected" as const,
      reviewer: null,
      reviewed_on: null,
    };
  });

  const courseStableId = `course:${courseSlug}`;
  const sourceHashPrefix = sourceSha256.slice(0, 12);
  const manifestId = `course-graph:${courseSlug}:${sourceHashPrefix}`;
  const rejectedCandidates: CourseGraphRejectedCandidate[] =
    blockedInferences.map((blocked) => ({
      candidate_id: blocked.candidate_id,
      candidate_kind: "inference",
      proposal: blocked.proposal,
      reason: blocked.reason,
      evidence_keys: blocked.evidence_keys,
      review_state: "rejected",
      reviewer: null,
      reviewed_on: null,
      replacement_id: null,
    }));

  const bundle: CourseGraphCandidateBundle = {
    schema_version: "course-graph-manifest/v1",
    version: 1,
    bundle_kind: "course_graph_candidate",
    manifest_id: manifestId,
    bundle_slug: `${courseSlug}-${sourceHashPrefix}-candidate-v1`,
    prepared_on: preparedOn,
    package: {
      source_path: sourcePath,
      source_sha256: sourceSha256,
      package_sha256: sha256(markdown),
      vocabulary_version: requiredProvenance(provenance, "Vocabulary version"),
      source_status: readiness,
      run_mode: extractor,
      release_state: "review_only",
    },
    course: {
      stable_id: courseStableId,
      course_id_tag: identity.courseTag,
      canonical_course_id: identity.canonicalCourseId,
      slug: courseSlug,
      format_version: provenance.get("Course format") || null,
    },
    run: {
      source_sha256: sourceSha256,
      base_manifest_sha256: null,
      mode: "review-only",
    },
    evidence,
    entities,
    edges,
    claims: [],
    blocked_inferences: blockedInferences,
    rejected_candidates: rejectedCandidates,
    identity_map: entities.map((entity) => ({
      candidate_stable_id: entity.stable_id,
      identity_state: entity.identity_state,
      canonical_refs: entity.canonical_refs,
      aliases: entity.aliases,
      notes: "",
    })),
    review_decisions: [],
    review: {
      review_state: "candidate",
      source_readiness: readiness,
      learner_ready: false,
      saved_views: [],
      notes: [],
    },
    tombstones: [],
  };

  const canonicalBundle = canonicalizeCourseGraphCandidateBundle(bundle);
  validateCourseGraphCandidateBundle(canonicalBundle);
  return canonicalBundle;
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function compareCanonicalText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function edgeNaturalKey(edge: CourseGraphEdge) {
  return `${edge.source_stable_id}\u0000${edge.predicate}\u0000${edge.target_stable_id}`;
}

function claimCanonicalKey(claim: CourseGraphClaim) {
  return `${claim.subject_stable_id}\u0000${claim.knowledge_source}\u0000${claim.claim_key}\u0000${claim.claim_id}`;
}

export function canonicalizeCourseGraphCandidateBundle(
  bundle: CourseGraphCandidateBundle,
): CourseGraphCandidateBundle {
  const canonical = structuredClone(bundle);
  canonical.evidence.sort((left, right) =>
    compareCanonicalText(left.evidence_key, right.evidence_key),
  );
  canonical.entities.sort((left, right) =>
    compareCanonicalText(left.stable_id, right.stable_id),
  );
  canonical.edges.sort((left, right) =>
    compareCanonicalText(edgeNaturalKey(left), edgeNaturalKey(right)),
  );
  canonical.claims.sort((left, right) =>
    compareCanonicalText(claimCanonicalKey(left), claimCanonicalKey(right)),
  );
  canonical.blocked_inferences.sort((left, right) =>
    compareCanonicalText(
      left.candidate_id || left.proposal,
      right.candidate_id || right.proposal,
    ),
  );
  canonical.rejected_candidates.sort((left, right) =>
    compareCanonicalText(left.candidate_id, right.candidate_id),
  );
  canonical.identity_map.sort((left, right) =>
    compareCanonicalText(
      left.candidate_stable_id,
      right.candidate_stable_id,
    ),
  );
  canonical.review_decisions.sort((left, right) =>
    compareCanonicalText(left.decision_id, right.decision_id),
  );
  canonical.review.saved_views.sort((left, right) =>
    compareCanonicalText(left.view_id, right.view_id),
  );
  return canonical;
}

function isCanonicallyOrdered<T>(
  values: T[],
  key: (value: T) => string,
) {
  for (let index = 1; index < values.length; index += 1) {
    if (
      compareCanonicalText(key(values[index - 1]), key(values[index])) > 0
    ) {
      return false;
    }
  }
  return true;
}

export function validateCourseGraphCandidateBundle(
  bundle: CourseGraphCandidateBundle,
) {
  const errors: string[] = [];
  if (
    bundle.schema_version !== "course-graph-manifest/v1" ||
    bundle.version !== 1 ||
    bundle.bundle_kind !== "course_graph_candidate"
  ) {
    errors.push("Unsupported course graph candidate bundle version or kind");
  }

  const sourceHash = bundle.package?.source_sha256?.toLowerCase() || "";
  const packageHash = bundle.package?.package_sha256?.toLowerCase() || null;
  const sourceHashPrefix = sourceHash.slice(0, 12);
  const expectedManifestId = `course-graph:${bundle.course?.slug}:${sourceHashPrefix}`;
  if (!SHA256_PATTERN.test(sourceHash)) {
    errors.push("Package source_sha256 must be a lowercase SHA-256 hash");
  }
  if (packageHash !== null && !SHA256_PATTERN.test(packageHash)) {
    errors.push("Package package_sha256 must be a lowercase SHA-256 hash");
  }
  if (bundle.run?.source_sha256 !== sourceHash) {
    errors.push("Run source_sha256 must match package source_sha256");
  }
  if (bundle.manifest_id !== expectedManifestId) {
    errors.push(
      `Manifest ID must be hash-specific: expected ${expectedManifestId}`,
    );
  }
  if (!bundle.bundle_slug?.includes(sourceHashPrefix)) {
    errors.push(
      `Bundle slug must include source hash prefix ${sourceHashPrefix}`,
    );
  }
  if (bundle.course?.stable_id !== `course:${bundle.course?.slug}`) {
    errors.push("Course stable ID must match the selected course slug");
  }
  if (
    !COURSE_GRAPH_SOURCE_READINESS.includes(bundle.package?.source_status) ||
    !COURSE_GRAPH_SOURCE_READINESS.includes(bundle.review?.source_readiness)
  ) {
    errors.push("Unsupported source readiness value");
  } else if (bundle.package.source_status !== bundle.review.source_readiness) {
    errors.push("Package and review source readiness values must match");
  }
  if (bundle.run?.mode !== "review-only") {
    errors.push("Course graph candidates must remain in review-only run mode");
  }
  const packageLearnerReady = bundle.package?.release_state === "learner_ready";
  if (packageLearnerReady !== (bundle.review?.learner_ready === true)) {
    errors.push(
      "package.release_state and review.learner_ready must agree",
    );
  }
  if (
    packageLearnerReady &&
    (bundle.package.source_status !== "ready" ||
      bundle.review.review_state !== "approved")
  ) {
    errors.push(
      "Only source-ready packages with an approved package review may be marked learner_ready",
    );
  }
  if (!COURSE_GRAPH_REVIEW_STATES.includes(bundle.review?.review_state)) {
    errors.push(`Unsupported package review state: ${bundle.review?.review_state}`);
  }
  if (
    !isCanonicallyOrdered(bundle.evidence, (item) => item.evidence_key)
  ) {
    errors.push("Evidence records must be sorted by evidence_key");
  }
  if (!isCanonicallyOrdered(bundle.entities, (entity) => entity.stable_id)) {
    errors.push("Entities must be sorted by stable_id");
  }
  if (!isCanonicallyOrdered(bundle.edges, edgeNaturalKey)) {
    errors.push(
      "Edges must be sorted by source_stable_id, predicate, and target_stable_id",
    );
  }
  if (!isCanonicallyOrdered(bundle.claims || [], claimCanonicalKey)) {
    errors.push(
      "Claims must be sorted by subject_stable_id, knowledge_source, claim_key, and claim_id",
    );
  }
  if (
    !isCanonicallyOrdered(
      bundle.blocked_inferences || [],
      (item) => item.candidate_id || item.proposal,
    )
  ) {
    errors.push("Blocked inferences must be sorted by candidate_id");
  }
  if (
    !isCanonicallyOrdered(
      bundle.rejected_candidates || [],
      (item) => item.candidate_id,
    )
  ) {
    errors.push("Rejected candidates must be sorted by candidate_id");
  }
  if (
    !isCanonicallyOrdered(
      bundle.identity_map || [],
      (item) => item.candidate_stable_id,
    )
  ) {
    errors.push("Identity-map entries must be sorted by candidate_stable_id");
  }
  if (
    !isCanonicallyOrdered(
      bundle.review_decisions || [],
      (item) => item.decision_id,
    )
  ) {
    errors.push("Review decisions must be sorted by decision_id");
  }

  const entityDuplicates = duplicateValues(bundle.entities.map((entity) => entity.stable_id));
  const edgeDuplicates = duplicateValues(bundle.edges.map((edge) => edge.stable_id));
  const evidenceDuplicates = duplicateValues(
    bundle.evidence.map((item) => item.evidence_key),
  );
  if (entityDuplicates.length) errors.push(`Duplicate entity IDs: ${entityDuplicates.join(", ")}`);
  if (edgeDuplicates.length) errors.push(`Duplicate edge IDs: ${edgeDuplicates.join(", ")}`);
  if (evidenceDuplicates.length) {
    errors.push(`Duplicate evidence IDs: ${evidenceDuplicates.join(", ")}`);
  }

  const entityIds = new Set(bundle.entities.map((entity) => entity.stable_id));
  const edgeIds = new Set(bundle.edges.map((edge) => edge.stable_id));
  const evidenceIds = new Set(bundle.evidence.map((item) => item.evidence_key));
  const entityById = new Map(
    bundle.entities.map((entity) => [entity.stable_id, entity] as const),
  );
  const evidenceById = new Map(
    bundle.evidence.map((item) => [item.evidence_key, item] as const),
  );
  const courseEntities = bundle.entities.filter(
    (entity) => entity.entity_kind === "course",
  );
  if (
    courseEntities.length !== 1 ||
    courseEntities[0]?.stable_id !== bundle.course.stable_id
  ) {
    errors.push("A bundle must contain exactly its selected course entity");
  }

  for (const item of bundle.evidence) {
    if (!COURSE_GRAPH_EVIDENCE_CLASSES.includes(item.evidence_class)) {
      errors.push(
        `Unsupported evidence class on ${item.evidence_key}: ${item.evidence_class}`,
      );
    }
    if (!item.source_path && !item.source_url) {
      errors.push(`Evidence ${item.evidence_key} needs a source path or URL`);
    }
    if (item.source_path && !item.source_sha256) {
      errors.push(
        `File evidence ${item.evidence_key} needs a source SHA-256`,
      );
    }
    if (item.source_sha256 && !SHA256_PATTERN.test(item.source_sha256)) {
      errors.push(`Invalid evidence source hash on ${item.evidence_key}`);
    }
    if (
      item.source_url &&
      !isSafePublicEvidenceUrl(item.source_url)
    ) {
      errors.push(
        `Evidence ${item.evidence_key} has an unsafe source URL`,
      );
    }
    if (!item.locator?.trim()) {
      errors.push(`Missing locator on evidence ${item.evidence_key}`);
    }
    if (!item.citation?.trim()) {
      errors.push(`Missing citation on evidence ${item.evidence_key}`);
    }
    if (!item.excerpt?.trim()) {
      errors.push(`Missing supporting excerpt on evidence ${item.evidence_key}`);
    }
  }

  for (const entity of bundle.entities) {
    if (!COURSE_GRAPH_ENTITY_KINDS.includes(entity.entity_kind)) {
      errors.push(`Unsupported entity kind: ${entity.entity_kind}`);
    }
    if (!COURSE_GRAPH_IDENTITY_STATES.includes(entity.identity_state)) {
      errors.push(
        `Unsupported identity state on ${entity.stable_id}: ${entity.identity_state}`,
      );
    }
    if (!COURSE_GRAPH_REVIEW_STATES.includes(entity.review_state)) {
      errors.push(
        `Unsupported review state on ${entity.stable_id}: ${entity.review_state}`,
      );
    }
    const expectedPrefix = `${entity.entity_kind}:`;
    if (!entity.stable_id.startsWith(expectedPrefix)) {
      errors.push(
        `Entity stable ID prefix does not match kind on ${entity.stable_id}`,
      );
    }
    if (!entity.short_definition?.trim()) {
      errors.push(`Missing short definition on ${entity.stable_id}`);
    }
    const synthesisWordCount = entity.synthesis.trim().split(/\s+/).filter(Boolean).length;
    if (
      entity.identity_state !== "excluded" &&
      (synthesisWordCount < 20 || synthesisWordCount > 150)
    ) {
      errors.push(
        `Entity synthesis must contain 20-150 words on ${entity.stable_id}`,
      );
    }
    if (!entity.evidence_keys.length) {
      errors.push(`Missing entity evidence on ${entity.stable_id}`);
    }
    for (const evidenceKey of entity.evidence_keys) {
      if (!evidenceIds.has(evidenceKey)) {
        errors.push(`Unknown evidence ${evidenceKey} on ${entity.stable_id}`);
      }
    }
  }

  for (const edge of bundle.edges) {
    if (!entityIds.has(edge.source_stable_id) || !entityIds.has(edge.target_stable_id)) {
      errors.push(`Missing endpoint on ${edge.stable_id}`);
    }
    if (edge.source_stable_id === edge.target_stable_id) {
      errors.push(`Self-edge is not allowed: ${edge.stable_id}`);
    }
    if (!COURSE_GRAPH_PREDICATES.includes(edge.predicate)) {
      errors.push(`Unsupported predicate on ${edge.stable_id}: ${edge.predicate}`);
    }
    const endpointKinds = PREDICATE_ENDPOINT_KINDS[edge.predicate];
    const sourceKind = entityById.get(edge.source_stable_id)?.entity_kind;
    const targetKind = entityById.get(edge.target_stable_id)?.entity_kind;
    if (
      endpointKinds &&
      sourceKind &&
      targetKind &&
      (!endpointKinds.source.includes(sourceKind) ||
        !endpointKinds.target.includes(targetKind))
    ) {
      errors.push(
        `Predicate direction or endpoint kind mismatch on ${edge.stable_id}: ${sourceKind} ${edge.predicate} ${targetKind}`,
      );
    }
    const predicateIsStructural = STRUCTURAL_PREDICATES.has(edge.predicate);
    if (
      (predicateIsStructural && edge.edge_class !== "structural") ||
      (!predicateIsStructural && edge.edge_class !== "interpretive")
    ) {
      errors.push(
        `Predicate class mismatch on ${edge.stable_id}: ${edge.predicate}`,
      );
    }
    if (edge.edge_class === "structural" && edge.scope !== null) {
      errors.push(`Structural edge scope must be null on ${edge.stable_id}`);
    }
    if (
      edge.edge_class === "interpretive" &&
      (!edge.scope || !COURSE_GRAPH_SCOPES.includes(edge.scope))
    ) {
      errors.push(`Interpretive edge needs a controlled scope on ${edge.stable_id}`);
    }
    if (edge.scope === "personal") {
      errors.push(
        `Personal resonance is not eligible for a canonical edge: ${edge.stable_id}`,
      );
    }
    if (!COURSE_GRAPH_CONFIDENCE_VALUES.includes(edge.confidence)) {
      errors.push(`Unsupported confidence on ${edge.stable_id}: ${edge.confidence}`);
    }
    if (!COURSE_GRAPH_REVIEW_STATES.includes(edge.review_state)) {
      errors.push(`Unsupported review state on ${edge.stable_id}: ${edge.review_state}`);
    }
    if (
      SYMMETRIC_PREDICATES.has(edge.predicate) &&
      edge.source_stable_id.localeCompare(edge.target_stable_id) > 0
    ) {
      errors.push(
        `Symmetric edge endpoints are not canonical on ${edge.stable_id}`,
      );
    }
    if (!edge.connection_summary.trim()) {
      errors.push(`Missing connection summary on ${edge.stable_id}`);
    }
    if (!edge.evidence_keys.length) {
      errors.push(`Missing edge evidence on ${edge.stable_id}`);
    }
    for (const evidenceKey of edge.evidence_keys) {
      if (!evidenceIds.has(evidenceKey)) {
        errors.push(`Unknown evidence ${evidenceKey} on ${edge.stable_id}`);
      }
    }
    const requiredEvidenceClasses =
      PREDICATE_EVIDENCE_REQUIREMENTS[edge.predicate];
    if (
      requiredEvidenceClasses &&
      !edge.evidence_keys.some((evidenceKey) => {
        const evidenceClass = evidenceById.get(evidenceKey)?.evidence_class;
        return (
          evidenceClass !== undefined &&
          requiredEvidenceClasses.includes(evidenceClass)
        );
      })
    ) {
      errors.push(
        `Predicate ${edge.predicate} lacks its required evidence basis on ${edge.stable_id}`,
      );
    }
  }

  const edgeNaturalKeyDuplicates = duplicateValues(
    bundle.edges.map(
      (edge) =>
        `${edge.source_stable_id}\u0000${edge.predicate}\u0000${edge.target_stable_id}`,
    ),
  );
  if (edgeNaturalKeyDuplicates.length) {
    errors.push("Duplicate edge natural keys are not allowed");
  }

  const claims = bundle.claims || [];
  const claimDuplicates = duplicateValues(claims.map((claim) => claim.claim_id));
  if (claimDuplicates.length) {
    errors.push(`Duplicate claim IDs: ${claimDuplicates.join(", ")}`);
  }
  for (const claim of claims) {
    if (!COURSE_GRAPH_CLAIM_KEYS.includes(claim.claim_key)) {
      errors.push(`Unsupported claim key on ${claim.claim_id}: ${claim.claim_key}`);
    }
    if (
      !entityIds.has(claim.subject_stable_id) &&
      !edgeIds.has(claim.subject_stable_id)
    ) {
      errors.push(`Unknown claim subject on ${claim.claim_id}`);
    }
    if (!COURSE_GRAPH_REVIEW_STATES.includes(claim.review_state)) {
      errors.push(`Unsupported claim review state on ${claim.claim_id}`);
    }
    if (!claim.value?.trim()) {
      errors.push(`Missing claim value on ${claim.claim_id}`);
    }
    if (!claim.evidence_keys.length) {
      errors.push(`Missing claim evidence on ${claim.claim_id}`);
    }
    for (const evidenceKey of claim.evidence_keys) {
      if (!evidenceIds.has(evidenceKey)) {
        errors.push(`Unknown evidence ${evidenceKey} on ${claim.claim_id}`);
      }
    }
  }

  const rejectedCandidates = bundle.rejected_candidates || [];
  for (const rejected of rejectedCandidates) {
    if (!["rejected", "deferred"].includes(rejected.review_state)) {
      errors.push(
        `Rejected candidate ${rejected.candidate_id} has an invalid review state`,
      );
    }
    for (const evidenceKey of rejected.evidence_keys) {
      if (!evidenceIds.has(evidenceKey)) {
        errors.push(
          `Unknown evidence ${evidenceKey} on ${rejected.candidate_id}`,
        );
      }
    }
  }

  const reviewDecisions = bundle.review_decisions || [];
  const decisionDuplicates = duplicateValues(
    reviewDecisions.map((decision) => decision.decision_id),
  );
  if (decisionDuplicates.length) {
    errors.push(`Duplicate review decision IDs: ${decisionDuplicates.join(", ")}`);
  }
  const reviewableCandidateIds = new Set([
    bundle.manifest_id,
    ...entityIds,
    ...edgeIds,
    ...claims.map((claim) => claim.claim_id),
    ...rejectedCandidates.map((candidate) => candidate.candidate_id),
    ...bundle.blocked_inferences
      .map((candidate) => candidate.candidate_id)
      .filter((candidateId): candidateId is string => Boolean(candidateId)),
  ]);
  for (const decision of reviewDecisions) {
    if (
      !["approved", "revise", "rejected", "deferred", "merged"].includes(
        decision.decision,
      )
    ) {
      errors.push(`Unsupported review decision on ${decision.decision_id}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(decision.decided_on)) {
      errors.push(`Invalid review decision date on ${decision.decision_id}`);
    }
    if (!decision.reviewer?.trim() || !decision.reason?.trim()) {
      errors.push(`Incomplete review decision ${decision.decision_id}`);
    }
    if (!reviewableCandidateIds.has(decision.candidate_id)) {
      errors.push(
        `Review decision ${decision.decision_id} references an unknown candidate`,
      );
    }
  }

  const identityMap = bundle.identity_map || [];
  const identityDuplicates = duplicateValues(
    identityMap.map((identity) => identity.candidate_stable_id),
  );
  if (identityDuplicates.length) {
    errors.push(
      `Duplicate identity-map entries: ${identityDuplicates.join(", ")}`,
    );
  }
  const identityByEntityId = new Map(
    identityMap.map(
      (identity) => [identity.candidate_stable_id, identity] as const,
    ),
  );
  for (const identity of identityMap) {
    const entity = entityById.get(identity.candidate_stable_id);
    if (!entity) {
      errors.push(
        `Identity map references unknown entity ${identity.candidate_stable_id}`,
      );
    }
    if (!COURSE_GRAPH_IDENTITY_STATES.includes(identity.identity_state)) {
      errors.push(
        `Unsupported identity state on ${identity.candidate_stable_id}`,
      );
    }
    if (entity && identity.identity_state !== entity.identity_state) {
      errors.push(
        `Identity state disagrees with entity ${identity.candidate_stable_id}`,
      );
    }
    if (entity && !sameStringSet(identity.aliases, entity.aliases)) {
      errors.push(
        `Identity aliases disagree with entity ${identity.candidate_stable_id}`,
      );
    }
    if (
      entity &&
      !sameJsonSet(identity.canonical_refs, entity.canonical_refs)
    ) {
      errors.push(
        `Identity canonical references disagree with entity ${identity.candidate_stable_id}`,
      );
    }
  }
  for (const view of bundle.review?.saved_views || []) {
    const duplicateViewEdges = duplicateValues(view.edge_ids);
    if (duplicateViewEdges.length) {
      errors.push(`Saved view ${view.view_id} repeats an edge`);
    }
    for (const edgeId of view.edge_ids) {
      if (!edgeIds.has(edgeId)) {
        errors.push(`Saved view ${view.view_id} references unknown edge ${edgeId}`);
      }
    }
    if (view.focus_stable_id && !entityIds.has(view.focus_stable_id)) {
      errors.push(`Saved view ${view.view_id} has an unknown focus entity`);
    }
  }

  if (packageLearnerReady) {
    const savedViews = bundle.review?.saved_views || [];
    if (!savedViews.length) {
      errors.push("A learner-ready package needs at least one saved view");
    }
    const decisionsByCandidate = new Map<string, CourseGraphReviewDecision[]>();
    for (const decision of reviewDecisions) {
      const current = decisionsByCandidate.get(decision.candidate_id) || [];
      current.push(decision);
      decisionsByCandidate.set(decision.candidate_id, current);
    }
    const hasApprovalDecision = (candidateId: string) =>
      (decisionsByCandidate.get(candidateId) || []).some((decision) =>
        decision.decision === "approved" || decision.decision === "merged",
      );

    for (const view of savedViews) {
      const selectedEdges = view.edge_ids
        .map((edgeId) => bundle.edges.find((edge) => edge.stable_id === edgeId))
        .filter((edge): edge is CourseGraphEdge => Boolean(edge));
      const selectedEntityIds = new Set(
        selectedEdges.flatMap((edge) => [
          edge.source_stable_id,
          edge.target_stable_id,
        ]),
      );
      if (view.focus_stable_id) selectedEntityIds.add(view.focus_stable_id);
      const selectedClaims = claims.filter((claim) =>
        view.edge_ids.includes(claim.subject_stable_id),
      );

      for (const entityId of selectedEntityIds) {
        const entity = entityById.get(entityId);
        const identity = identityByEntityId.get(entityId);
        if (
          !entity ||
          entity.review_state !== "approved" ||
          !["existing", "new"].includes(entity.identity_state)
        ) {
          errors.push(
            `Learner view ${view.view_id} contains an unresolved or unapproved entity: ${entityId}`,
          );
        }
        if (!identity) {
          errors.push(
            `Learner view ${view.view_id} lacks an identity-map review for ${entityId}`,
          );
        }
        if (!hasApprovalDecision(entityId)) {
          errors.push(
            `Learner view ${view.view_id} lacks a human approval decision for ${entityId}`,
          );
        }
      }
      for (const edge of selectedEdges) {
        if (edge.review_state !== "approved" || edge.scope === "personal") {
          errors.push(
            `Learner view ${view.view_id} contains an unapproved edge: ${edge.stable_id}`,
          );
        }
        if (!hasApprovalDecision(edge.stable_id)) {
          errors.push(
            `Learner view ${view.view_id} lacks a human approval decision for ${edge.stable_id}`,
          );
        }
      }
      for (const claim of selectedClaims) {
        if (claim.review_state !== "approved") {
          errors.push(
            `Learner view ${view.view_id} contains an unapproved claim: ${claim.claim_id}`,
          );
        }
        if (!hasApprovalDecision(claim.claim_id)) {
          errors.push(
            `Learner view ${view.view_id} lacks a human approval decision for ${claim.claim_id}`,
          );
        }
      }
    }
  }

  const actualEntityCounts = Object.fromEntries(
    COURSE_GRAPH_ENTITY_KINDS.map((kind) => [
      kind,
      bundle.entities.filter((entity) => entity.entity_kind === kind).length,
    ]),
  ) as Record<CourseGraphEntityKind, number>;

  if (errors.length) {
    throw new Error(`Invalid course graph candidate bundle:\n- ${errors.join("\n- ")}`);
  }

  return {
    entities: bundle.entities.length,
    edges: bundle.edges.length,
    evidence: bundle.evidence.length,
    blockedInferences: bundle.blocked_inferences.length,
    claims: claims.length,
    rejectedCandidates: rejectedCandidates.length,
    reviewDecisions: (bundle.review_decisions || []).length,
    entityCounts: actualEntityCounts,
    structuralEdges: bundle.edges.filter((edge) => edge.edge_class === "structural").length,
    interpretiveEdges: bundle.edges.filter((edge) => edge.edge_class === "interpretive").length,
  };
}

export function courseGraphRecordId(
  manifestId: string,
  recordKind: "import" | "entity" | "edge" | "evidence" | "rejection",
  stableId: string,
) {
  return `${recordKind}:${sha256(`${manifestId}\u0000${recordKind}\u0000${stableId}`).slice(0, 32)}`;
}

export function selectCourseGraphSavedView(
  bundle: CourseGraphCandidateBundle,
  viewId: string,
) {
  const view = bundle.review.saved_views.find(
    (candidate) => candidate.view_id === viewId,
  );
  if (!view) {
    throw new Error(`Unknown course graph saved view: ${viewId}`);
  }

  const edgeById = new Map(
    bundle.edges.map((edge) => [edge.stable_id, edge] as const),
  );
  const edges = view.edge_ids.map((edgeId) => {
    const edge = edgeById.get(edgeId);
    if (!edge) throw new Error(`Saved view ${viewId} references ${edgeId}`);
    return edge;
  });
  const entityIds = new Set(
    edges.flatMap((edge) => [edge.source_stable_id, edge.target_stable_id]),
  );
  if (view.focus_stable_id) entityIds.add(view.focus_stable_id);
  const entities = bundle.entities.filter((entity) =>
    entityIds.has(entity.stable_id),
  );
  const includedIds = new Set([
    ...entityIds,
    ...edges.map((edge) => edge.stable_id),
  ]);
  const claims = bundle.claims.filter((claim) =>
    includedIds.has(claim.subject_stable_id),
  );
  const evidenceKeys = new Set([
    ...entities.flatMap((entity) => entity.evidence_keys),
    ...edges.flatMap((edge) => edge.evidence_keys),
    ...claims.flatMap((claim) => claim.evidence_keys),
  ]);

  return {
    bundle: {
      ...bundle,
      entities,
      edges,
      claims,
      evidence: bundle.evidence.filter((evidence) =>
        evidenceKeys.has(evidence.evidence_key),
      ),
    },
    view,
  };
}

export class CourseGraphLearnerAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseGraphLearnerAccessError";
  }
}

export function sanitizeCourseGraphCandidateForLearners(
  bundle: CourseGraphCandidateBundle,
  selectedBundleSlug: string,
  selectedViewId?: string,
) {
  if (!selectedBundleSlug || selectedBundleSlug !== bundle.bundle_slug) {
    throw new CourseGraphLearnerAccessError(
      "Learner graph access requires one exact bundle selection",
    );
  }
  if (
    bundle.package.release_state !== "learner_ready" ||
    bundle.review.learner_ready !== true ||
    bundle.package.source_status !== "ready" ||
    bundle.review.review_state !== "approved"
  ) {
    throw new CourseGraphLearnerAccessError(
      "The selected course graph package is not learner_ready",
    );
  }

  const selected = selectedViewId
    ? selectCourseGraphSavedView(bundle, selectedViewId)
    : null;
  const learnerBundle = selected?.bundle || bundle;
  const entities = learnerBundle.entities
    .filter(
      (entity) =>
        entity.review_state === "approved" &&
        (entity.identity_state === "existing" ||
          entity.identity_state === "new"),
    )
    .map((entity) => ({
      stable_id: entity.stable_id,
      entity_kind: entity.entity_kind,
      subtype: entity.subtype,
      slug: entity.slug,
      display_name: entity.display_name,
      aliases: entity.aliases,
      short_definition: entity.short_definition,
      synthesis: entity.synthesis,
      course_role: entity.course_role,
      caveats: entity.caveats,
    }));
  const entityIds = new Set(entities.map((entity) => entity.stable_id));
  const eligibleEdges = learnerBundle.edges
    .filter(
      (edge) =>
        edge.review_state === "approved" &&
        edge.scope !== "personal" &&
        entityIds.has(edge.source_stable_id) &&
        entityIds.has(edge.target_stable_id),
    );
  if (
    selected &&
    eligibleEdges.length !== selected.view.edge_ids.length
  ) {
    throw new CourseGraphLearnerAccessError(
      "The selected learner view contains an unresolved or unapproved record",
    );
  }
  const publicEdgeIdByInternalId = new Map(
    eligibleEdges.map((edge, index) => [
      edge.stable_id,
      selected
        ? `course-view:${selected.view.view_id}:${String(index + 1).padStart(2, "0")}`
        : `course-edge:${index + 1}`,
    ]),
  );
  const edges = eligibleEdges.map((edge) => ({
      stable_id: publicEdgeIdByInternalId.get(edge.stable_id)!,
      source_stable_id: edge.source_stable_id,
      target_stable_id: edge.target_stable_id,
      predicate: edge.predicate,
      scope: edge.scope,
      confidence: edge.confidence,
      connection_summary: edge.connection_summary,
      caveats: edge.caveats,
      evidence_ids: edge.evidence_keys,
      weight: edge.weight,
    }));
  const referencedEvidence = new Set(
    [
      ...learnerBundle.entities
        .filter((entity) => entityIds.has(entity.stable_id))
        .flatMap((entity) => entity.evidence_keys),
      ...eligibleEdges
        .flatMap((edge) => edge.evidence_keys),
    ],
  );
  const includedEdgeIds = new Set(eligibleEdges.map((edge) => edge.stable_id));
  const reviewedNonEdges = learnerBundle.claims
    .filter(
      (claim) =>
        claim.claim_key === "does_not_settle" &&
        claim.review_state === "approved" &&
        includedEdgeIds.has(claim.subject_stable_id),
    )
    .map((claim) => ({
      statement: claim.value,
      evidence_ids: claim.evidence_keys,
      caveats: claim.caveats,
    }));
  for (const nonEdge of reviewedNonEdges) {
    for (const evidenceId of nonEdge.evidence_ids) {
      referencedEvidence.add(evidenceId);
    }
  }

  return {
    schema_version: "course-graph-learner/v1" as const,
    course: {
      stable_id: bundle.course.stable_id,
      course_id_tag: bundle.course.course_id_tag,
      slug: bundle.course.slug,
      title: bundle.course.title || null,
    },
    vocabulary_version: bundle.package.vocabulary_version,
    selected_view: selected
      ? {
          view_id: selected.view.view_id,
          label: selected.view.label,
          description: selected.view.description,
          edge_ids: edges.map((edge) => edge.stable_id),
          focus_stable_id: selected.view.focus_stable_id,
        }
      : null,
    entities,
    edges,
    citations: learnerBundle.evidence
      .filter((evidence) => referencedEvidence.has(evidence.evidence_key))
      .map((evidence) => ({
        evidence_key: evidence.evidence_key,
        evidence_class: evidence.evidence_class,
        citation: evidence.citation,
        source_url:
          evidence.source_url &&
          isSafePublicEvidenceUrl(evidence.source_url)
            ? evidence.source_url
            : null,
        locator: evidence.locator,
      })),
    reviewed_non_edges: reviewedNonEdges,
  };
}

export function verifyCourseGraphSource(
  bundle: CourseGraphCandidateBundle,
  source: Buffer,
) {
  const actual = sha256(source);
  if (actual !== bundle.package.source_sha256) {
    throw new Error(
      `Course source hash mismatch: expected ${bundle.package.source_sha256}, received ${actual}`,
    );
  }
  return actual;
}
