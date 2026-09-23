import { z } from "zod";

export const ENTITY_KINDS = [
  "concept",
  "person",
  "work",
  "tradition",
  "artifact",
  "symbol",
] as const;
export const PREDICATES = {
  defines: "defines",
  depicts: "depicts",
  explores: "explores",
  compares_with: "compares with",
  corresponds_to: "corresponds to",
  historically_connected_to: "historically connected to",
  influenced_by: "influenced by",
  contrasts_with: "contrasts with",
  associated_with: "associated with",
} as const;
export const EVIDENCE_CLASSES = {
  direct_statement: "Direct statement or image",
  documented_history: "Documented history",
  tradition_attestation: "Association within a tradition",
  scholarly_interpretation: "Scholarly interpretation",
  personal_interpretation: "My interpretation of a source",
} as const;
const text = (max: number) => z.string().trim().max(max);
const uuid = z.string().uuid();
const optionalId = uuid.nullable().default(null);
export const safeUrl = z.union([
  z.literal(""),
  z
    .url()
    .refine(
      (value) => /^https?:\/\//i.test(value),
      "Use an http or https source URL."
    ),
]);
export const inquiryInput = z.object({
  title: text(180).min(1),
  question: text(4000).default(""),
  notes: text(30000).default(""),
});
export const entityInput = z.object({
  name: text(160).min(1),
  kind: z.enum(ENTITY_KINDS),
  definition: text(2000).default(""),
  correspondence_id: optionalId,
});
export const findingInput = z
  .object({
    title: text(180).min(1),
    claim: text(4000).default(""),
    note: text(30000).default(""),
    source_kind: z.enum([
      "library",
      "external",
      "ai",
      "correspondence",
      "note",
    ]),
    source_title: text(500).default(""),
    source_url: safeUrl.default(""),
    source_locator: text(1000).default(""),
    excerpt: text(20000).default(""),
    text_id: optionalId,
    chunk_id: optionalId,
    provenance: z
      .object({
        query: text(4000).optional(),
        correspondence_id: uuid.optional(),
        sources: z
          .array(
            z.object({
              text_id: uuid,
              text_title: text(500).optional(),
              chunk_id: uuid.optional(),
            })
          )
          .max(30)
          .optional(),
        position: z
          .object({
            pageIndex: z.number().int().min(0).optional(),
            chapterId: text(200).optional(),
          })
          .optional(),
      })
      .default({}),
    context: text(4000).default(""),
    evidence_class: z
      .enum(
        Object.keys(EVIDENCE_CLASSES) as [
          keyof typeof EVIDENCE_CLASSES,
          ...Array<keyof typeof EVIDENCE_CLASSES>,
        ]
      )
      .default("direct_statement"),
    source_entity_id: optionalId,
    target_entity_id: optionalId,
    predicate: z
      .enum(
        Object.keys(PREDICATES) as [
          keyof typeof PREDICATES,
          ...Array<keyof typeof PREDICATES>,
        ]
      )
      .default("associated_with"),
  })
  .refine(
    (value) =>
      !value.source_entity_id ||
      value.source_entity_id !== value.target_entity_id,
    "Choose two different entries."
  );

export type FindingInput = z.infer<typeof findingInput>;
export type Capture = Partial<FindingInput> &
  Pick<FindingInput, "title" | "source_kind">;
export type Inquiry = z.infer<typeof inquiryInput> & {
  id: string;
  owner_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
};
export type KnowledgeEntity = z.infer<typeof entityInput> & { id: string };
export type Finding = FindingInput & {
  id: string;
  inquiry_id: string;
  status: "draft" | "reviewed" | "published";
  revision: number;
  sort_order: number;
  published_at: string | null;
};
export type PublicFinding = Pick<
  Finding,
  | "id"
  | "title"
  | "claim"
  | "source_kind"
  | "source_title"
  | "source_url"
  | "source_locator"
  | "excerpt"
  | "text_id"
  | "chunk_id"
  | "context"
  | "evidence_class"
  | "source_entity_id"
  | "target_entity_id"
  | "predicate"
  | "published_at"
>;

export function reviewProblems(f: FindingInput): string[] {
  const problems: string[] = [];
  if (!["library", "external", "correspondence"].includes(f.source_kind))
    problems.push(
      "Attach a library passage, external source, or documented correspondence before review."
    );
  if (!f.claim.trim())
    problems.push("Describe the connection you are claiming.");
  if (!f.source_entity_id || !f.target_entity_id)
    problems.push("Choose the two entries to connect.");
  if (!f.source_title.trim() || !f.source_locator.trim() || !f.excerpt.trim())
    problems.push(
      "Add the source title, passage or image description, and a specific location."
    );
  if (!f.context.trim())
    problems.push(
      "Explain the author, tradition, period, or limits of this connection."
    );
  if (f.source_kind === "external" && !f.source_url)
    problems.push("Add the external source URL.");
  if (f.source_kind === "library" && !f.text_id)
    problems.push("Select a library source.");
  return problems;
}

export function publicFinding(f: Finding): PublicFinding {
  // Deliberate allowlist: inquiry IDs, personal notes, AI provenance and review identity stay private.
  return {
    id: f.id,
    title: f.title,
    claim: f.claim,
    source_kind: f.source_kind,
    source_title: f.source_title,
    source_url: f.source_url,
    source_locator: f.source_locator,
    excerpt: f.excerpt,
    text_id: f.text_id,
    chunk_id: f.chunk_id,
    context: f.context,
    evidence_class: f.evidence_class,
    source_entity_id: f.source_entity_id,
    target_entity_id: f.target_entity_id,
    predicate: f.predicate,
    published_at: f.published_at,
  };
}

export function sourceHref(
  f: Pick<FindingInput, "source_kind" | "source_url" | "text_id" | "chunk_id">
): string | null {
  if (f.source_kind === "library" && f.text_id)
    return `/library/${f.text_id}${f.chunk_id ? `?chunk=${f.chunk_id}` : ""}`;
  return /^https?:\/\//i.test(f.source_url) ? f.source_url : null;
}

export function exportInquiry(
  inquiry: Inquiry,
  findings: Finding[],
  entities: KnowledgeEntity[]
): string {
  const names = new Map(entities.map((entity) => [entity.id, entity.name]));
  return [
    `# ${inquiry.title}`,
    inquiry.question,
    "## Research notes",
    inquiry.notes,
    ...findings.map((finding, index) =>
      [
        `## ${index + 1}. ${finding.title}`,
        `Status: ${finding.status}`,
        finding.claim,
        finding.source_entity_id && finding.target_entity_id
          ? `${names.get(finding.source_entity_id) || "Entry"} → ${PREDICATES[finding.predicate]} → ${names.get(finding.target_entity_id) || "Entry"}`
          : "",
        finding.context,
        finding.excerpt ? `> ${finding.excerpt.replace(/\n/g, "\n> ")}` : "",
        `Source: ${finding.source_title}${finding.source_locator ? ` — ${finding.source_locator}` : ""}`,
        sourceHref(finding) || "",
        `Evidence: ${EVIDENCE_CLASSES[finding.evidence_class]}`,
        finding.note ? `### My notes\n${finding.note}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}
