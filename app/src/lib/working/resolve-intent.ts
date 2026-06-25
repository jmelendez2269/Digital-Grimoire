import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveIntention, type ResolvedIntention } from "./assemble";

/**
 * The Working — Phase 2.5 semantic intent resolution.
 *
 * The deterministic resolver (resolveIntention) only knows the esoteric
 * vocabulary (success, purpose, protection…). Real practitioners type modern,
 * compound phrasing ("a new job aligned with my highest timeline") that never
 * matches a single canonical token. This layer maps free text → a SET of
 * canonical intention slugs that, unioned, capture the intent.
 *
 * Strategy: cheap deterministic fast-path first; LLM (Haiku) fallback only on
 * a miss. No embeddings/pgvector — reuses the existing Anthropic key.
 */

export const INTENT_RESOLVER_MODEL = "claude-haiku-4-5";

export type SemanticResolution = {
  /** Canonical intention slugs to union into the palette. */
  slugs: string[];
  /** A human label for the resolved intent (the user's phrasing, cleaned). */
  label: string;
  /** How it resolved — deterministic fast-path or the LLM. */
  via: ResolvedIntention["matchedFrom"] | "semantic";
  /** One-line read of what the practitioner is asking for (LLM path only). */
  interpretation?: string;
};

/**
 * Resolve free text to canonical intention slugs.
 * 1) Deterministic resolver (free, instant). If it hits, return slug + aliases.
 * 2) Otherwise ask Haiku to pick the best-matching canonical slugs.
 * Returns null only if nothing usable could be found.
 */
export async function resolveIntentSemantic(
  supabase: SupabaseClient,
  input: string,
  opts: { apiKey?: string; model?: string } = {},
): Promise<SemanticResolution | null> {
  const raw = input.trim();
  if (!raw) return null;

  // 1) Fast path — deterministic.
  const deterministic = await resolveIntention(supabase, raw);
  if (deterministic) {
    return {
      slugs: Array.from(new Set([deterministic.slug, ...deterministic.aliases])),
      label: deterministic.label,
      via: deterministic.matchedFrom,
    };
  }

  // 2) Semantic fallback — Haiku picks from the canonical list.
  const { data: intentionRows, error } = await supabase
    .from("intentions")
    .select("slug, label")
    .order("label", { ascending: true });
  if (error) throw error;
  const valid = new Set((intentionRows || []).map((r: any) => r.slug as string));
  if (valid.size === 0) return null;

  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const catalog = (intentionRows || []).map((r: any) => `${r.slug} (${r.label})`).join("\n");
  const client = new Anthropic({ apiKey });

  const res = await client.messages.create({
    model: opts.model || INTENT_RESOLVER_MODEL,
    max_tokens: 400,
    system:
      "You map a practitioner's plain-language intention to a curated vocabulary of ritual intentions. " +
      "Choose the 1–4 canonical slugs from the provided list that together best capture what the person is seeking " +
      "(include closely-related facets — e.g. a new aligned career → success, opportunities, purpose). " +
      "Use ONLY slugs that appear in the list. Respond with strict JSON: " +
      '{"slugs": ["..."], "interpretation": "one short sentence"}. No prose outside the JSON.',
    messages: [
      {
        role: "user",
        content: `CANONICAL INTENTIONS (slug (label)):\n${catalog}\n\nPRACTITIONER INTENT: "${raw}"\n\nReturn the JSON.`,
      },
    ],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let parsed: { slugs?: unknown; interpretation?: unknown };
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }

  const slugs = Array.isArray(parsed.slugs)
    ? (parsed.slugs as unknown[]).filter((s): s is string => typeof s === "string" && valid.has(s))
    : [];
  if (slugs.length === 0) return null;

  return {
    slugs: Array.from(new Set(slugs)),
    label: raw,
    via: "semantic",
    interpretation: typeof parsed.interpretation === "string" ? parsed.interpretation : undefined,
  };
}
