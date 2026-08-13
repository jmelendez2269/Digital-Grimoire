import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveIntention, type ResolvedIntention } from "./assemble";
import {
  WORKING_PROVIDER_MODEL,
  workingProviderRequestOptions,
  workingProviderUsage,
  type WorkingProviderUsage,
} from "./provider-usage";

/**
 * The Working semantic intent resolver. Deterministic vocabulary matching is
 * free; Haiku is called only when plain language misses that vocabulary.
 */

export const INTENT_RESOLVER_MODEL = WORKING_PROVIDER_MODEL;

export type SemanticResolution = {
  slugs: string[];
  label: string;
  via: ResolvedIntention["matchedFrom"] | "semantic";
  interpretation?: string;
};

export interface SemanticResolutionAttempt {
  resolution: SemanticResolution | null;
  usage: WorkingProviderUsage | null;
  moderated: boolean;
}

interface ResolverOptions {
  apiKey?: string;
  model?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Backward-compatible resolution-only wrapper. */
export async function resolveIntentSemantic(
  supabase: SupabaseClient,
  input: string,
  opts: ResolverOptions = {},
): Promise<SemanticResolution | null> {
  return (await resolveIntentSemanticWithUsage(supabase, input, opts)).resolution;
}

/** Resolve an intent and return privacy-safe provider usage when Haiku runs. */
export async function resolveIntentSemanticWithUsage(
  supabase: SupabaseClient,
  input: string,
  opts: ResolverOptions = {},
): Promise<SemanticResolutionAttempt> {
  const raw = input.trim();
  if (!raw) return { resolution: null, usage: null, moderated: false };

  const deterministic = await resolveIntention(supabase, raw);
  if (deterministic) {
    return {
      resolution: {
        slugs: Array.from(
          new Set([deterministic.slug, ...deterministic.aliases]),
        ),
        label: deterministic.label,
        via: deterministic.matchedFrom,
      },
      usage: null,
      moderated: false,
    };
  }

  const { data: intentionRows, error } = await supabase
    .from("intentions")
    .select("slug, label")
    .order("label", { ascending: true });
  if (error) throw error;

  const valid = new Set(
    (intentionRows || []).map((row: { slug: string }) => row.slug),
  );
  if (valid.size === 0) {
    return { resolution: null, usage: null, moderated: false };
  }

  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const catalog = (intentionRows || [])
    .map((row: { slug: string; label: string }) => `${row.slug} (${row.label})`)
    .join("\n");
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create(
    {
      model: opts.model || INTENT_RESOLVER_MODEL,
      max_tokens: 400,
      system:
        "You map a practitioner's plain-language intention to a curated vocabulary of ritual intentions. " +
        "Choose the 1-4 canonical slugs from the provided list that together best capture what the person is seeking. " +
        "Use ONLY slugs that appear in the list. Respond with strict JSON: " +
        '{"slugs": ["..."], "interpretation": "one short sentence"}. No prose outside the JSON.',
      messages: [
        {
          role: "user",
          content: `CANONICAL INTENTIONS (slug (label)):\n${catalog}\n\nPRACTITIONER INTENT: "${raw}"\n\nReturn the JSON.`,
        },
      ],
    },
    workingProviderRequestOptions(opts),
  );

  const usage = workingProviderUsage({
    providerRequestId: res.id,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  });
  const moderated = (res.stop_reason as string | null) === "refusal";
  const text = res.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  let parsed: { slugs?: unknown; interpretation?: unknown };
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < jsonStart) {
      return { resolution: null, usage, moderated };
    }
    parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    return { resolution: null, usage, moderated };
  }

  const slugs = Array.isArray(parsed.slugs)
    ? parsed.slugs.filter(
        (slug): slug is string =>
          typeof slug === "string" && valid.has(slug),
      )
    : [];
  if (slugs.length === 0) return { resolution: null, usage, moderated };

  return {
    resolution: {
      slugs: Array.from(new Set(slugs)),
      label: raw,
      via: "semantic",
      interpretation:
        typeof parsed.interpretation === "string"
          ? parsed.interpretation
          : undefined,
    },
    usage,
    moderated,
  };
}
