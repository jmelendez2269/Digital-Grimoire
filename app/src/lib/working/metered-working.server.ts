import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  executeMeteredAction,
  MeteredProviderFailure,
  type MeteredActionContext,
  type MeteredActionSuccess,
  type MeteredProviderUsage,
  type MeteringDependencies,
} from "@/lib/membership/metering-adapter.server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  assemblePalette,
  assemblePaletteForSlugs,
  type AssembledPalette,
} from "@/lib/working/assemble";
import {
  resolveIntentSemanticWithUsage,
  type SemanticResolutionAttempt,
} from "@/lib/working/resolve-intent";
import {
  synthesizeRitual,
  type SynthesizedRitual,
} from "@/lib/working/synthesize";
import {
  aggregateWorkingProviderUsage,
  WORKING_PROVIDER_MODEL,
  WORKING_PROVIDER_NAME,
  type WorkingProviderUsage,
} from "@/lib/working/provider-usage";

const WORKING_RESULT_PREFIX = "working:";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const WORKING_PROVIDER_TIMEOUT_MS = 55_000;

export interface MeteredWorkingInput {
  intention: string;
  requestId: string;
  signal?: AbortSignal;
}

export interface WorkingGenerationResult {
  id: string;
  createdAt: string;
  palette: AssembledPalette;
  ritual: string;
  modelUsed: string;
  interpretation?: string;
}

interface GeneratedWorking {
  palette: AssembledPalette;
  ritual: string;
  modelUsed: string;
  interpretation?: string;
}

interface WorkingExecutionDependencies {
  createServiceClient?: () => SupabaseClient;
  assemblePalette?: typeof assemblePalette;
  assemblePaletteForSlugs?: typeof assemblePaletteForSlugs;
  resolveIntent?: typeof resolveIntentSemanticWithUsage;
  synthesize?: typeof synthesizeRitual;
  persistWorking?: (
    generated: GeneratedWorking,
    intention: string,
    context: MeteredActionContext,
  ) => Promise<WorkingGenerationResult>;
  replayWorking?: (
    resultReference: string,
    context: MeteredActionContext,
  ) => Promise<WorkingGenerationResult>;
  execute?: typeof executeMeteredAction;
  metering?: MeteringDependencies;
  providerTimeoutMs?: number;
}

function isPalette(value: unknown): value is AssembledPalette {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const palette = value as Partial<AssembledPalette>;
  return (
    Boolean(palette.intention && typeof palette.intention === "object") &&
    Array.isArray(palette.groups) &&
    Array.isArray(palette.patrons) &&
    Boolean(palette.stats && typeof palette.stats === "object")
  );
}

function parseWorkingRow(
  value: unknown,
  interpretation?: string,
): WorkingGenerationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("WORKING_INVALID_PERSISTED_RESULT");
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    !UUID_PATTERN.test(row.id) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at)) ||
    !isPalette(row.palette) ||
    typeof row.ritual !== "string" ||
    row.ritual.trim().length === 0 ||
    typeof row.model_used !== "string" ||
    row.model_used.length < 1 ||
    row.model_used.length > 128
  ) {
    throw new Error("WORKING_INVALID_PERSISTED_RESULT");
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    palette: row.palette,
    ritual: row.ritual,
    modelUsed: row.model_used,
    ...(interpretation ? { interpretation } : {}),
  };
}

async function persistWorkingDefault(
  generated: GeneratedWorking,
  intention: string,
  context: MeteredActionContext,
): Promise<WorkingGenerationResult> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("workings")
    .insert({
      user_id: context.userId,
      intent_text: intention,
      palette: generated.palette,
      ritual: generated.ritual,
      model_used: generated.modelUsed,
      status: "draft",
    })
    .select("id, created_at, palette, ritual, model_used")
    .single();
  if (error) throw new Error("WORKING_PERSISTENCE_FAILED");
  return parseWorkingRow(data, generated.interpretation);
}

async function replayWorkingDefault(
  resultReference: string,
  context: MeteredActionContext,
): Promise<WorkingGenerationResult> {
  if (!resultReference.startsWith(WORKING_RESULT_PREFIX)) {
    throw new Error("WORKING_INVALID_RESULT_REFERENCE");
  }
  const id = resultReference.slice(WORKING_RESULT_PREFIX.length);
  if (!UUID_PATTERN.test(id)) throw new Error("WORKING_INVALID_RESULT_REFERENCE");

  const service = createServiceClient();
  const { data, error } = await service
    .from("workings")
    .select("id, created_at, palette, ritual, model_used")
    .eq("id", id)
    .eq("user_id", context.userId)
    .single();
  if (error) throw new Error("WORKING_REPLAY_NOT_FOUND");
  return parseWorkingRow(data);
}

function meteredUsage(usage: WorkingProviderUsage): MeteredProviderUsage {
  return {
    providerRequestId: usage.providerRequestId,
    inputUnits: usage.inputTokens,
    outputUnits: usage.outputTokens,
    estimatedCostUsd: usage.estimatedCostUsd,
  };
}

function deadlineSignal(
  requestSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; clear: () => void } {
  const timeout = new AbortController();
  const timer = setTimeout(() => {
    const error = new Error("Working provider deadline exceeded");
    error.name = "TimeoutError";
    timeout.abort(error);
  }, timeoutMs);
  const signals = requestSignal
    ? [requestSignal, timeout.signal]
    : [timeout.signal];
  return {
    signal: AbortSignal.any(signals),
    clear: () => clearTimeout(timer),
  };
}

function normalizedAbort(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error("Working request aborted");
  error.name = "AbortError";
  return error;
}

async function generateWorking(
  intention: string,
  signal: AbortSignal | undefined,
  dependencies: WorkingExecutionDependencies,
): Promise<{ value: GeneratedWorking; usage: MeteredProviderUsage }> {
  const createService = dependencies.createServiceClient ?? createServiceClient;
  const assemble = dependencies.assemblePalette ?? assemblePalette;
  const assembleForSlugs =
    dependencies.assemblePaletteForSlugs ?? assemblePaletteForSlugs;
  const resolveIntent =
    dependencies.resolveIntent ?? resolveIntentSemanticWithUsage;
  const synthesize = dependencies.synthesize ?? synthesizeRitual;
  const deadline = deadlineSignal(
    signal,
    dependencies.providerTimeoutMs ?? WORKING_PROVIDER_TIMEOUT_MS,
  );
  const attempts: WorkingProviderUsage[] = [];

  try {
    const service = createService();
    let palette = await assemble(service, intention);
    let semantic: SemanticResolutionAttempt | null = null;
    let interpretation: string | undefined;

    if (!palette) {
      semantic = await resolveIntent(service, intention, {
        signal: deadline.signal,
      });
      if (semantic.usage) attempts.push(semantic.usage);
      if (semantic.moderated) {
        throw new MeteredProviderFailure(
          "moderated",
          meteredUsage(aggregateWorkingProviderUsage(attempts)),
        );
      }
      if (semantic.resolution) {
        interpretation = semantic.resolution.interpretation;
        palette = await assembleForSlugs(
          service,
          semantic.resolution.slugs,
          {
            slug: semantic.resolution.slugs[0],
            label: semantic.resolution.label,
            aliases: semantic.resolution.slugs.slice(1),
            matchedFrom: "fuzzy",
          },
        );
      }
    }

    if (!palette) {
      throw new MeteredProviderFailure(
        "empty",
        meteredUsage(aggregateWorkingProviderUsage(attempts)),
      );
    }

    const ritual: SynthesizedRitual = await synthesize(palette, {
      signal: deadline.signal,
    });
    attempts.push(ritual.usage);
    const aggregate = aggregateWorkingProviderUsage(attempts);
    if (ritual.moderated) {
      throw new MeteredProviderFailure("moderated", meteredUsage(aggregate));
    }

    return {
      value: {
        palette,
        ritual: ritual.text,
        modelUsed: ritual.model,
        ...(interpretation ? { interpretation } : {}),
      },
      usage: meteredUsage(aggregate),
    };
  } catch (error) {
    const normalized = deadline.signal.aborted
      ? normalizedAbort(deadline.signal)
      : error;
    if (normalized instanceof MeteredProviderFailure) throw normalized;
    if (attempts.length > 0) {
      const known = aggregateWorkingProviderUsage(attempts);
      const outcome =
        normalized instanceof Error && normalized.name === "TimeoutError"
          ? "timeout"
          : normalized instanceof Error && normalized.name === "AbortError"
            ? "aborted"
            : "provider_error";
      throw new MeteredProviderFailure(outcome, {
        providerRequestId: known.providerRequestId,
        inputUnits: known.inputTokens,
        outputUnits: known.outputTokens,
      });
    }
    throw normalized;
  } finally {
    deadline.clear();
  }
}

export async function executeMeteredWorking(
  input: MeteredWorkingInput,
  dependencies: WorkingExecutionDependencies = {},
): Promise<MeteredActionSuccess<WorkingGenerationResult>> {
  const intention = input.intention.trim();
  const persist = dependencies.persistWorking ?? persistWorkingDefault;
  const replay = dependencies.replayWorking ?? replayWorkingDefault;
  const execute = dependencies.execute ?? executeMeteredAction;

  return execute(
    {
      actionCode: "working.generate",
      requestId: input.requestId,
      input: { intention },
      provider: {
        name: WORKING_PROVIDER_NAME,
        model: WORKING_PROVIDER_MODEL,
        execute: () =>
          generateWorking(intention, input.signal, dependencies),
      },
      persist: async (generated, context) => {
        const working = await persist(generated, intention, context);
        return {
          value: working,
          resultReference: `${WORKING_RESULT_PREFIX}${working.id}`,
        };
      },
      replay,
      isUsableProviderResult: (generated) =>
        generated.ritual.trim().length > 0 && isPalette(generated.palette),
    },
    dependencies.metering,
  );
}
