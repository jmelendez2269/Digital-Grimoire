import { z } from "zod";
import {
  ENTITY_KINDS,
  EVIDENCE_CLASSES,
  PREDICATES,
} from "@/lib/inquiries/model";

const short = z.string().trim().min(1).max(2000);
export const discoveryRequest = z.object({
  id: z.uuid(),
  question: z.string().trim().min(2).max(2000),
  parentId: z.uuid().optional(),
});
export const entitySuggestion = z.object({
  name: z.string().trim().min(1).max(160),
  kind: z.enum(ENTITY_KINDS),
  definition: short,
});
export const assertionSchema = z.object({
  title: z.string().trim().min(1).max(180),
  explanation: short,
  evidence: z
    .array(
      z.object({
        sourceId: z.string(),
        quote: z.string().trim().min(20).max(600),
      })
    )
    .min(1)
    .max(3),
});
export const connectionSchema = assertionSchema.extend({
  from: entitySuggestion,
  to: entitySuggestion,
  predicate: z.enum(
    Object.keys(PREDICATES) as [
      keyof typeof PREDICATES,
      ...Array<keyof typeof PREDICATES>,
    ]
  ),
  evidenceClass: z.enum(
    Object.keys(EVIDENCE_CLASSES) as [
      keyof typeof EVIDENCE_CLASSES,
      ...Array<keyof typeof EVIDENCE_CLASSES>,
    ]
  ),
  context: short,
  nextQuestion: short,
});
export const synthesisSchema = z.object({
  overview: z.array(assertionSchema).max(3),
  connections: z.array(connectionSchema).max(5),
  nextQuestions: z.array(z.object({ question: short, reason: short })).max(4),
  gaps: z.array(short).max(5),
});
export type Assertion = z.infer<typeof assertionSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type Source = {
  id: string;
  title: string;
  url: string;
  content: string;
  kind: "library" | "web";
  query: string;
  textId?: string;
  chunkId?: string;
};
export type DiscoveryResult = z.infer<typeof synthesisSchema> & {
  sources: Source[];
  searched: string[];
  warnings: string[];
  usage: {
    model: string;
    requestId?: string;
    tokens: number;
    inputTokens?: number;
    outputTokens?: number;
    cost: number | null;
  }[];
};
export type DiscoveryRun = {
  id: string;
  question: string;
  parent_id: string | null;
  root_id: string;
  status: "running" | "complete" | "failed";
  result: DiscoveryResult | null;
  error: string | null;
};
export type DiscoveryEvent =
  | { type: "progress"; message: string }
  | { type: "complete"; run: DiscoveryRun; chargedCredits?: number }
  | { type: "error"; message: string; id: string; code?: string };

export function httpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return (
      ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
}
export function normalizedQuote(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

// A model cannot introduce its own source, link or invented quotation. This
// validates attribution; a curator still reviews whether the interpretation follows.
export function groundSynthesis(raw: unknown, sources: Source[]) {
  const candidate = z
    .object({
      overview: z.array(z.unknown()),
      connections: z.array(z.unknown()),
      nextQuestions: z.array(z.unknown()).default([]),
      gaps: z.array(z.unknown()).default([]),
    })
    .parse(raw);
  const byId = new Map(sources.map((s) => [s.id, s]));
  let rejected = 0;
  function validItems<T>(schema: z.ZodType<T>, items: unknown[]): T[] {
    return items.flatMap((item) => {
      const parsed = schema.safeParse(item);
      if (parsed.success) return [parsed.data];
      rejected++;
      return [];
    });
  }
  const parsed = {
    overview: validItems(assertionSchema, candidate.overview.slice(0, 3)),
    connections: validItems(
      connectionSchema,
      candidate.connections.slice(0, 5)
    ),
    nextQuestions: validItems(
      z.object({ question: short, reason: short }),
      candidate.nextQuestions.slice(0, 4)
    ),
    gaps: validItems(short, candidate.gaps.slice(0, 5)),
  };
  function grounded<T extends Assertion>(items: T[]): T[] {
    return items.filter((item) => {
      const valid = item.evidence.every((e) => {
        const s = byId.get(e.sourceId);
        return (
          s && normalizedQuote(s.content).includes(normalizedQuote(e.quote))
        );
      });
      if (!valid) rejected++;
      return valid;
    });
  }
  return {
    ...parsed,
    overview: grounded(parsed.overview),
    connections: grounded(parsed.connections).filter(
      (c) => c.from.name.toLowerCase() !== c.to.name.toLowerCase()
    ),
    rejected,
  };
}

export function sourcesFromAnnotations(
  annotations: unknown,
  query: string
): Omit<Source, "id">[] {
  if (!Array.isArray(annotations)) return [];
  return annotations.flatMap((annotation) => {
    const c =
      annotation?.type === "url_citation" ? annotation.url_citation : null;
    if (
      !c ||
      !httpUrl(c.url) ||
      typeof c.content !== "string" ||
      c.content.trim().length < 40
    )
      return [];
    return [
      {
        title:
          typeof c.title === "string"
            ? c.title.slice(0, 500)
            : new URL(c.url).hostname,
        url: c.url,
        content: c.content.slice(0, 6000),
        kind: "web" as const,
        query,
      },
    ];
  });
}
