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

export type CourseGraphEvidence = {
  evidence_key: string;
  evidence_class: string;
  heading_path: string;
  locator: string;
  excerpt: string;
};

export type CourseGraphEntity = {
  stable_id: string;
  entity_kind: CourseGraphEntityKind;
  slug: string;
  display_name: string;
  aliases: string[];
  synthesis: string;
  course_role: string | null;
  identity_state: string;
  review_state: string;
  candidate_class: string;
  evidence_keys: string[];
  metadata: Record<string, unknown>;
};

export type CourseGraphEdge = {
  stable_id: string;
  source_stable_id: string;
  target_stable_id: string;
  predicate: string;
  edge_class: "structural" | "interpretive";
  epistemic_kind: string;
  scope: string | null;
  confidence: "established" | "interpretive" | "speculative" | "tradition";
  review_state: string;
  candidate_class: string;
  evidence_keys: string[];
  connection_summary: string;
  weight: number | null;
  metadata: Record<string, unknown>;
};

export type CourseGraphBlockedInference = {
  proposal: string;
  reason: string;
  evidence_keys: string[];
};

export type CourseGraphCandidateBundle = {
  version: 1;
  bundle_kind: "course_graph_candidate";
  bundle_slug: string;
  prepared_on: string;
  package: {
    source_path: string;
    source_sha256: string;
    package_sha256: string;
    vocabulary_version: string;
    source_status: string;
    run_mode: string;
  };
  course: {
    stable_id: string;
    course_id_tag: string;
    canonical_course_id: string | null;
    slug: string;
  };
  evidence: CourseGraphEvidence[];
  entities: CourseGraphEntity[];
  edges: CourseGraphEdge[];
  blocked_inferences: CourseGraphBlockedInference[];
};

type MarkdownTable = {
  heading: string;
  headers: string[];
  rows: Record<string, string>[];
};

const EXPECTED_ENTITY_COUNTS: Record<CourseGraphEntityKind, number> = {
  course: 1,
  lesson: 0,
  work: 10,
  edition: 0,
  passage: 0,
  person: 9,
  tradition: 0,
  concept: 24,
  institution: 0,
  artifact: 0,
};

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

  return { predicate: predicateMatch[1], metadata };
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
      evidence_class: trimCode(row["Evidence class"]),
      heading_path: locatorMatch?.[1]?.trim() || headingAndLocator,
      locator: locatorMatch?.[2]?.trim() || "",
      excerpt: plainText(row["Short supporting excerpt"]),
    };
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
        slug: parsed.slug,
        display_name: plainText(row["Display name"]),
        aliases: [],
        synthesis: plainText(row["Draft synthesis"]),
        course_role: row["Course role"] ? plainText(row["Course role"]) : null,
        identity_state: trimCode(row["Identity state"]),
        review_state: trimCode(row["Review state"]),
        candidate_class: trimCode(row["Candidate class"]),
        evidence_keys: evidenceKeys(row.Evidence),
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
        weight: null,
        metadata,
      } satisfies CourseGraphEdge;
    });
  });

  const blockedTable = findTable(
    tables,
    ["Blocked proposal", "Reason", "Evidence"],
  );
  const blockedInferences = (blockedTable?.rows || []).map((row) => ({
    proposal: plainText(row["Blocked proposal"]),
    reason: plainText(row.Reason),
    evidence_keys: evidenceKeys(row.Evidence),
  }));

  const sourcePath = requiredProvenance(provenance, "Repository-relative source path");
  const sourceSha256 = requiredProvenance(provenance, "SHA-256").toLowerCase();
  const courseSlug = requiredProvenance(provenance, "Course production slug in source");
  const preparedOn =
    provenance.get("Accessed / candidate prepared") || new Date(0).toISOString().slice(0, 10);
  const courseStableId = `course:${courseSlug}`;

  const bundle: CourseGraphCandidateBundle = {
    version: 1,
    bundle_kind: "course_graph_candidate",
    bundle_slug: `${courseSlug}-candidate-v1`,
    prepared_on: preparedOn,
    package: {
      source_path: sourcePath,
      source_sha256: sourceSha256,
      package_sha256: sha256(markdown),
      vocabulary_version: requiredProvenance(provenance, "Vocabulary version"),
      source_status: requiredProvenance(provenance, "Source status"),
      run_mode: requiredProvenance(provenance, "Run mode / extractor"),
    },
    course: {
      stable_id: courseStableId,
      course_id_tag: identity.courseTag,
      canonical_course_id: identity.canonicalCourseId,
      slug: courseSlug,
    },
    evidence,
    entities,
    edges,
    blocked_inferences: blockedInferences,
  };

  validateCourseGraphCandidateBundle(bundle);
  return bundle;
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

export function validateCourseGraphCandidateBundle(
  bundle: CourseGraphCandidateBundle,
) {
  const errors: string[] = [];
  if (bundle.version !== 1 || bundle.bundle_kind !== "course_graph_candidate") {
    errors.push("Unsupported course graph candidate bundle version or kind");
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
  const evidenceIds = new Set(bundle.evidence.map((item) => item.evidence_key));
  for (const entity of bundle.entities) {
    if (!COURSE_GRAPH_ENTITY_KINDS.includes(entity.entity_kind)) {
      errors.push(`Unsupported entity kind: ${entity.entity_kind}`);
    }
    if (entity.review_state !== "candidate") {
      errors.push(`Non-candidate entity review state: ${entity.stable_id}`);
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
    if (!edge.connection_summary.trim()) {
      errors.push(`Missing connection summary on ${edge.stable_id}`);
    }
    for (const evidenceKey of edge.evidence_keys) {
      if (!evidenceIds.has(evidenceKey)) {
        errors.push(`Unknown evidence ${evidenceKey} on ${edge.stable_id}`);
      }
    }
  }

  const actualEntityCounts = Object.fromEntries(
    COURSE_GRAPH_ENTITY_KINDS.map((kind) => [
      kind,
      bundle.entities.filter((entity) => entity.entity_kind === kind).length,
    ]),
  ) as Record<CourseGraphEntityKind, number>;
  for (const kind of COURSE_GRAPH_ENTITY_KINDS) {
    if (actualEntityCounts[kind] !== EXPECTED_ENTITY_COUNTS[kind]) {
      errors.push(
        `Unexpected ${kind} count: ${actualEntityCounts[kind]} (expected ${EXPECTED_ENTITY_COUNTS[kind]})`,
      );
    }
  }
  if (bundle.entities.length !== 44) {
    errors.push(`Unexpected total entity count: ${bundle.entities.length} (expected 44)`);
  }
  if (bundle.edges.length !== 66) {
    errors.push(`Unexpected total edge count: ${bundle.edges.length} (expected 66)`);
  }

  const forbiddenCrossWorkPredicates = new Set([
    "historically_connected_to",
    "influenced_by",
    "derives_from",
    "doctrinally_related_to",
  ]);
  for (const edge of bundle.edges) {
    const sourceKind = edge.source_stable_id.split(":", 1)[0];
    const targetKind = edge.target_stable_id.split(":", 1)[0];
    if (
      sourceKind === "work" &&
      targetKind === "work" &&
      forbiddenCrossWorkPredicates.has(edge.predicate)
    ) {
      errors.push(`Forbidden PRE cross-work predicate on ${edge.stable_id}: ${edge.predicate}`);
    }
  }

  if (errors.length) {
    throw new Error(`Invalid course graph candidate bundle:\n- ${errors.join("\n- ")}`);
  }

  return {
    entities: bundle.entities.length,
    edges: bundle.edges.length,
    evidence: bundle.evidence.length,
    blockedInferences: bundle.blocked_inferences.length,
    entityCounts: actualEntityCounts,
    structuralEdges: bundle.edges.filter((edge) => edge.edge_class === "structural").length,
    interpretiveEdges: bundle.edges.filter((edge) => edge.edge_class === "interpretive").length,
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
