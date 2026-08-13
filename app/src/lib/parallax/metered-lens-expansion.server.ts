import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AIResponse } from "@/lib/ai/types";
import { getDefaultOpenRouterModel } from "@/lib/ai/openrouter-client";
import {
  executeMeteredAction,
  MeteredProviderFailure,
  MeteringError,
  type MeteredActionContext,
  type MeteredActionSuccess,
  type MeteringDependencies,
} from "@/lib/membership/metering-adapter.server";
import { getMeteringActionQuote } from "@/lib/membership/metering-catalog.server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { HybridSearchResult, RetrievalOptions } from "./hybrid-retrieval";
import {
  generateLensResponse,
  getResponseLengthConfig,
} from "./lens-orchestrator";
import { getLens } from "./lenses";
import {
  aggregateSevenLensesUsage,
  SEVEN_LENSES_PROVIDER_NAME,
} from "./provider-usage";
import type {
  LensResponse,
  LensWeights,
  ResponseLength,
  TokenUsage,
} from "./types";

const ACTION_CODE = "seven_lenses.expand";
const RESULT_PREFIX = "seven-lenses-expansion:";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LENS_IDS = [
  "scientific",
  "psychological",
  "philosophical",
  "religious_spiritual",
  "historical_anthropological",
  "symbolic_occult",
  "mathematical",
] as const;

export const LENS_EXPANSION_PROVIDER_TIMEOUT_MS = 60_000;

export interface MeteredLensExpansionInput {
  parentResponseId: string;
  lensId: string;
  requestId: string;
  signal?: AbortSignal;
}

export interface OwnedSevenLensesParent {
  id: string;
  userId: string;
  query: string;
  lensWeights: LensWeights;
  responseLength: ResponseLength;
}

export interface LensExpansionResult extends LensResponse {
  id: string;
  parentResponseId: string;
  createdAt: string;
  resultUrl: string;
}

interface GeneratedExpansion {
  parentResponseId: string;
  response: LensResponse & { tokenUsage: TokenUsage };
}

export interface LensExpansionDependencies {
  createServiceClient?: () => SupabaseClient;
  createResultId?: () => string;
  loadParent?: (parentResponseId: string) => Promise<OwnedSevenLensesParent>;
  hybridSearch?: (
    query: string,
    options?: RetrievalOptions,
  ) => Promise<HybridSearchResult[]>;
  generateLens?: typeof generateLensResponse;
  persistExpansion?: (
    expansionId: string,
    generated: GeneratedExpansion,
    context: MeteredActionContext,
  ) => Promise<LensExpansionResult>;
  replayExpansion?: (
    resultReference: string,
    context: MeteredActionContext,
  ) => Promise<LensExpansionResult>;
  execute?: typeof executeMeteredAction;
  metering?: MeteringDependencies;
  providerTimeoutMs?: number;
}

function isLensWeights(value: unknown): value is LensWeights {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Object.keys(candidate).length === LENS_IDS.length &&
    LENS_IDS.every(
      (id) =>
        Number.isSafeInteger(candidate[id]) &&
        (candidate[id] as number) >= 0 &&
        (candidate[id] as number) <= 100,
    )
  );
}

function parseResponseLength(value: unknown): ResponseLength {
  return value === "short" || value === "medium" || value === "long"
    ? value
    : "medium";
}

function expansionUrl(parentResponseId: string, lensId: string): string {
  return `/api/parallax/history/${parentResponseId}#lens-${lensId}`;
}

function parseStoredExpansion(
  value: unknown,
  expectedUserId?: string,
): LensExpansionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("LENS_EXPANSION_INVALID_PERSISTED_RESULT");
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    !UUID_PATTERN.test(row.id) ||
    typeof row.parent_response_id !== "string" ||
    !UUID_PATTERN.test(row.parent_response_id) ||
    typeof row.user_id !== "string" ||
    (expectedUserId !== undefined && row.user_id !== expectedUserId) ||
    typeof row.lens_id !== "string" ||
    !LENS_IDS.includes(row.lens_id as (typeof LENS_IDS)[number]) ||
    typeof row.response_text !== "string" ||
    !row.response_text.trim() ||
    !Array.isArray(row.sources) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at))
  ) {
    throw new Error("LENS_EXPANSION_INVALID_PERSISTED_RESULT");
  }
  const lens = getLens(row.lens_id as (typeof LENS_IDS)[number]);
  if (!lens) throw new Error("LENS_EXPANSION_INVALID_PERSISTED_RESULT");
  return {
    id: row.id,
    parentResponseId: row.parent_response_id,
    lens: lens.id,
    lensName: lens.name,
    content: row.response_text,
    sources: row.sources as LensResponse["sources"],
    createdAt: row.created_at,
    resultUrl: expansionUrl(row.parent_response_id, lens.id),
  };
}

async function loadParentDefault(
  parentResponseId: string,
  createService: () => SupabaseClient = createServiceClient,
): Promise<OwnedSevenLensesParent> {
  const session = await createClient();
  const {
    data: { user },
    error: authError,
  } = await session.auth.getUser();
  if (authError || !user) {
    throw new MeteringError("METERING_UNAUTHORIZED", 401);
  }
  const { data, error } = await createService()
    .from("convergence_responses")
    .select("id, user_id, query_text, lens_weights, response_text")
    .eq("id", parentResponseId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new MeteringError("LENS_EXPANSION_PARENT_UNAVAILABLE", 503);
  if (!data) throw new MeteringError("LENS_EXPANSION_PARENT_NOT_FOUND", 404);
  if (
    typeof data.id !== "string" ||
    data.id !== parentResponseId ||
    data.user_id !== user.id ||
    typeof data.query_text !== "string" ||
    !data.query_text.trim() ||
    !isLensWeights(data.lens_weights) ||
    typeof data.response_text !== "string"
  ) {
    throw new MeteringError("LENS_EXPANSION_PARENT_INVALID", 409);
  }
  let storedResponse: unknown = null;
  try {
    storedResponse = JSON.parse(data.response_text);
  } catch {
    // Legacy parents did not always store typed response metadata.
  }
  const responseLength =
    storedResponse && typeof storedResponse === "object" && !Array.isArray(storedResponse)
      ? parseResponseLength((storedResponse as Record<string, unknown>).responseLength)
      : "medium";
  return {
    id: data.id,
    userId: data.user_id,
    query: data.query_text.trim(),
    lensWeights: data.lens_weights,
    responseLength,
  };
}

async function persistExpansionDefault(
  expansionId: string,
  generated: GeneratedExpansion,
  context: MeteredActionContext,
  createService: () => SupabaseClient = createServiceClient,
): Promise<LensExpansionResult> {
  const { data, error } = await createService()
    .from("convergence_lens_expansions")
    .insert({
      id: expansionId,
      user_id: context.userId,
      parent_response_id: generated.parentResponseId,
      lens_id: generated.response.lens,
      response_text: generated.response.content,
      sources: generated.response.sources,
    })
    .select(
      "id, user_id, parent_response_id, lens_id, response_text, sources, created_at",
    )
    .single();
  if (error) throw new Error("LENS_EXPANSION_PERSISTENCE_FAILED");
  return parseStoredExpansion(data, context.userId);
}

async function replayExpansionDefault(
  resultReference: string,
  context: MeteredActionContext,
  createService: () => SupabaseClient = createServiceClient,
): Promise<LensExpansionResult> {
  if (!resultReference.startsWith(RESULT_PREFIX)) {
    throw new Error("LENS_EXPANSION_INVALID_RESULT_REFERENCE");
  }
  const expansionId = resultReference.slice(RESULT_PREFIX.length);
  if (!UUID_PATTERN.test(expansionId)) {
    throw new Error("LENS_EXPANSION_INVALID_RESULT_REFERENCE");
  }
  const { data, error } = await createService()
    .from("convergence_lens_expansions")
    .select(
      "id, user_id, parent_response_id, lens_id, response_text, sources, created_at",
    )
    .eq("id", expansionId)
    .eq("user_id", context.userId)
    .single();
  if (error) throw new Error("LENS_EXPANSION_REPLAY_NOT_FOUND");
  return parseStoredExpansion(data, context.userId);
}

function deadlineSignal(
  requestSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; clear: () => void } {
  const timeout = new AbortController();
  const timer = setTimeout(() => {
    const error = new Error("Lens expansion provider deadline exceeded");
    error.name = "TimeoutError";
    timeout.abort(error);
  }, timeoutMs);
  return {
    signal: AbortSignal.any(
      requestSignal ? [requestSignal, timeout.signal] : [timeout.signal],
    ),
    clear: () => clearTimeout(timer),
  };
}

function normalizedAbort(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error("Lens expansion request aborted");
  error.name = "AbortError";
  return error;
}

async function retrieveDefault(
  query: string,
  options?: RetrievalOptions,
): Promise<HybridSearchResult[]> {
  const { hybridSearch } = await import("./hybrid-retrieval");
  return hybridSearch(query, options);
}

async function generateExpansion(
  parent: OwnedSevenLensesParent,
  lensId: string,
  requestSignal: AbortSignal | undefined,
  context: MeteredActionContext,
  dependencies: LensExpansionDependencies,
): Promise<{
  value: GeneratedExpansion;
  usage: ReturnType<typeof aggregateSevenLensesUsage>;
}> {
  if (parent.userId !== context.userId) {
    throw new MeteringError("LENS_EXPANSION_PARENT_NOT_FOUND", 404);
  }
  const lens = getLens(lensId as (typeof LENS_IDS)[number]);
  if (!lens || parent.lensWeights[lens.id as keyof LensWeights] <= 0) {
    throw new MeteringError("LENS_EXPANSION_LENS_NOT_IN_PARENT", 400);
  }
  const quote = getMeteringActionQuote(ACTION_CODE);
  if (!quote || quote.estimatedProviderCostUsd === null) {
    throw new Error("LENS_EXPANSION_QUOTE_UNAVAILABLE");
  }
  const deadline = deadlineSignal(
    requestSignal,
    dependencies.providerTimeoutMs ?? LENS_EXPANSION_PROVIDER_TIMEOUT_MS,
  );
  const attempts: AIResponse[] = [];
  try {
    deadline.signal.throwIfAborted();
    const retrieval = await (dependencies.hybridSearch ?? retrieveDefault)(
      parent.query,
      { lenses: [lens.id], limit: 10 },
    );
    deadline.signal.throwIfAborted();
    const response = await (dependencies.generateLens ?? generateLensResponse)(
      parent.query,
      lens,
      retrieval,
      getResponseLengthConfig(parent.responseLength).lensMaxTokens,
      {
        signal: deadline.signal,
        throwOnProviderError: true,
        onProviderAttempt: (attempt) => attempts.push(attempt),
      },
    );
    return {
      value: { parentResponseId: parent.id, response },
      usage: aggregateSevenLensesUsage(attempts, quote.estimatedProviderCostUsd),
    };
  } catch (error) {
    const normalized = deadline.signal.aborted
      ? normalizedAbort(deadline.signal)
      : error;
    if (attempts.length > 0) {
      const outcome =
        normalized instanceof Error && normalized.name === "TimeoutError"
          ? "timeout"
          : normalized instanceof Error && normalized.name === "AbortError"
            ? "aborted"
            : "provider_error";
      const partialUsage = aggregateSevenLensesUsage(
        attempts,
        quote.estimatedProviderCostUsd,
      );
      throw new MeteredProviderFailure(outcome, {
        ...partialUsage,
        estimatedCostUsd: Math.max(
          partialUsage.estimatedCostUsd,
          quote.estimatedProviderCostUsd,
        ),
      });
    }
    throw normalized;
  } finally {
    deadline.clear();
  }
}

export async function executeMeteredLensExpansion(
  input: MeteredLensExpansionInput,
  dependencies: LensExpansionDependencies = {},
): Promise<MeteredActionSuccess<LensExpansionResult>> {
  const parentResponseId = input.parentResponseId.trim();
  const lensId = input.lensId.trim();
  if (
    !UUID_PATTERN.test(parentResponseId) ||
    !UUID_PATTERN.test(input.requestId) ||
    input.requestId === parentResponseId ||
    !LENS_IDS.includes(lensId as (typeof LENS_IDS)[number])
  ) {
    throw new MeteringError("METERING_INVALID_INPUT", 400);
  }
  const parent = await (
    dependencies.loadParent ??
    ((id) =>
      loadParentDefault(
        id,
        dependencies.createServiceClient ?? createServiceClient,
      ))
  )(parentResponseId);
  if (
    parent.id !== parentResponseId ||
    parent.lensWeights[lensId as keyof LensWeights] <= 0
  ) {
    throw new MeteringError("LENS_EXPANSION_LENS_NOT_IN_PARENT", 400);
  }
  const expansionId = (dependencies.createResultId ?? randomUUID)();
  if (!UUID_PATTERN.test(expansionId)) {
    throw new Error("LENS_EXPANSION_INVALID_RESULT_ID");
  }
  const execute = dependencies.execute ?? executeMeteredAction;
  const persist =
    dependencies.persistExpansion ??
    ((id, generated, context) =>
      persistExpansionDefault(
        id,
        generated,
        context,
        dependencies.createServiceClient ?? createServiceClient,
      ));
  const replay =
    dependencies.replayExpansion ??
    ((reference, context) =>
      replayExpansionDefault(
        reference,
        context,
        dependencies.createServiceClient ?? createServiceClient,
      ));
  const model = process.env.PARALLAX_LENS_MODEL || getDefaultOpenRouterModel();

  return execute(
    {
      actionCode: ACTION_CODE,
      requestId: input.requestId,
      input: { parentResponseId, lensId },
      provider: {
        name: SEVEN_LENSES_PROVIDER_NAME,
        model,
        execute: (context) =>
          generateExpansion(parent, lensId, input.signal, context, dependencies),
      },
      persist: async (generated, context) => {
        const stored = await persist(expansionId, generated, context);
        return {
          value: stored,
          resultReference: `${RESULT_PREFIX}${stored.id}`,
        };
      },
      replay,
      isUsableProviderResult: (generated) =>
        generated.response.content.trim().length > 0,
    },
    dependencies.metering,
  );
}
