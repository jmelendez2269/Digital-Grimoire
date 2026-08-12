import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AIResponse } from "@/lib/ai/types";
import { getDefaultOpenRouterModel } from "@/lib/ai/openrouter-client";
import {
  executeMeteredAction,
  MeteredProviderFailure,
  type MeteredActionContext,
  type MeteredActionSuccess,
  type MeteringDependencies,
} from "@/lib/membership/metering-adapter.server";
import { getMeteringActionQuote } from "@/lib/membership/metering-catalog.server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  HybridSearchResult,
  RetrievalOptions,
} from "./hybrid-retrieval";
import {
  generateSynthesisFromSummaries,
  getResponseLengthConfig,
} from "./lens-orchestrator";
import {
  aggregateSevenLensesUsage,
  SEVEN_LENSES_PROVIDER_NAME,
  sevenLensesModelDescriptor,
} from "./provider-usage";
import { recordQuery } from "./rate-limit";
import type {
  LensWeights,
  MultiLensResponse,
  ResponseLength,
  TokenUsage,
} from "./types";

const RESULT_PREFIX = "seven-lenses:";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const SEVEN_LENSES_PROVIDER_TIMEOUT_MS = 90_000;

export interface MeteredSevenLensesInput {
  query: string;
  lensWeights: LensWeights;
  responseLength: ResponseLength;
  requestId: string;
  signal?: AbortSignal;
}

export interface SevenLensesGenerationResult extends MultiLensResponse {
  id: string;
  createdAt: string;
  responseLength: ResponseLength;
  resultUrl: string;
}

interface GeneratedSevenLenses {
  response: MultiLensResponse;
  responseLength: ResponseLength;
  lensWeights: LensWeights;
}

export interface SevenLensesExecutionDependencies {
  createServiceClient?: () => SupabaseClient;
  createResultId?: () => string;
  recordQuery?: typeof recordQuery;
  hybridSearch?: (
    query: string,
    options?: RetrievalOptions,
  ) => Promise<HybridSearchResult[]>;
  generateSynthesis?: (
    query: string,
    lensWeights: LensWeights,
    context: HybridSearchResult[],
    responseLength: ResponseLength,
    options: {
      signal: AbortSignal;
      onProviderAttempt: (attempt: AIResponse) => void;
    },
  ) => Promise<{ synthesis: string; tokenUsage: TokenUsage }>;
  persistResponse?: (
    responseId: string,
    generated: GeneratedSevenLenses,
    context: MeteredActionContext,
  ) => Promise<SevenLensesGenerationResult>;
  replayResponse?: (
    resultReference: string,
    context: MeteredActionContext,
  ) => Promise<SevenLensesGenerationResult>;
  execute?: typeof executeMeteredAction;
  metering?: MeteringDependencies;
  providerTimeoutMs?: number;
}

export function sevenLensesActionCode(
  responseLength: ResponseLength,
): "seven_lenses.standard" | "seven_lenses.long" {
  return responseLength === "long"
    ? "seven_lenses.long"
    : "seven_lenses.standard";
}

function resultUrl(id: string): string {
  return `/api/parallax/history/${id}`;
}

function isLensWeights(value: unknown): value is LensWeights {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const weights = value as Record<string, unknown>;
  const expected = [
    "scientific",
    "psychological",
    "philosophical",
    "religious_spiritual",
    "historical_anthropological",
    "symbolic_occult",
    "mathematical",
  ];
  return (
    Object.keys(weights).length === expected.length &&
    expected.every(
      (key) =>
        Number.isSafeInteger(weights[key]) &&
        (weights[key] as number) >= 0 &&
        (weights[key] as number) <= 100,
    ) &&
    expected.some((key) => (weights[key] as number) > 0)
  );
}

function isResponseLength(value: unknown): value is ResponseLength {
  return value === "short" || value === "medium" || value === "long";
}

function parseStoredResponse(
  value: unknown,
  expectedUserId?: string,
): SevenLensesGenerationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("SEVEN_LENSES_INVALID_PERSISTED_RESULT");
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    !UUID_PATTERN.test(row.id) ||
    (expectedUserId !== undefined && row.user_id !== expectedUserId) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at)) ||
    typeof row.response_text !== "string"
  ) {
    throw new Error("SEVEN_LENSES_INVALID_PERSISTED_RESULT");
  }

  let response: unknown;
  try {
    response = JSON.parse(row.response_text);
  } catch {
    throw new Error("SEVEN_LENSES_INVALID_PERSISTED_RESULT");
  }
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new Error("SEVEN_LENSES_INVALID_PERSISTED_RESULT");
  }
  const parsed = response as Record<string, unknown>;
  if (
    typeof parsed.query !== "string" ||
    parsed.query.trim().length === 0 ||
    typeof parsed.synthesis !== "string" ||
    parsed.synthesis.trim().length === 0 ||
    !Array.isArray(parsed.responses) ||
    !Array.isArray(parsed.sources) ||
    !isResponseLength(parsed.responseLength)
  ) {
    throw new Error("SEVEN_LENSES_INVALID_PERSISTED_RESULT");
  }

  return {
    id: row.id,
    createdAt: row.created_at,
    query: parsed.query,
    responses: parsed.responses as MultiLensResponse["responses"],
    synthesis: parsed.synthesis,
    sources: parsed.sources as MultiLensResponse["sources"],
    responseLength: parsed.responseLength,
    resultUrl: resultUrl(row.id),
  };
}

async function persistResponseDefault(
  responseId: string,
  generated: GeneratedSevenLenses,
  context: MeteredActionContext,
  createService: () => SupabaseClient = createServiceClient,
): Promise<SevenLensesGenerationResult> {
  const service = createService();
  const responseText = JSON.stringify({
    ...generated.response,
    responseLength: generated.responseLength,
  });
  const lensesUsed = Object.entries(generated.lensWeights)
    .filter(([, weight]) => (weight as number) > 0)
    .map(([lens]) => lens);
  const { data, error } = await service
    .from("convergence_responses")
    .insert({
      id: responseId,
      user_id: context.userId,
      query_text: generated.response.query,
      lens_weights: generated.lensWeights,
      response_text: responseText,
      sources: generated.response.sources,
      lenses_used: lensesUsed,
    })
    .select("id, user_id, created_at, response_text")
    .single();
  if (error) throw new Error("SEVEN_LENSES_PERSISTENCE_FAILED");
  return parseStoredResponse(data, context.userId);
}

async function replayResponseDefault(
  resultReference: string,
  context: MeteredActionContext,
  createService: () => SupabaseClient = createServiceClient,
): Promise<SevenLensesGenerationResult> {
  if (!resultReference.startsWith(RESULT_PREFIX)) {
    throw new Error("SEVEN_LENSES_INVALID_RESULT_REFERENCE");
  }
  const id = resultReference.slice(RESULT_PREFIX.length);
  if (!UUID_PATTERN.test(id)) {
    throw new Error("SEVEN_LENSES_INVALID_RESULT_REFERENCE");
  }
  const service = createService();
  const { data, error } = await service
    .from("convergence_responses")
    .select("id, user_id, created_at, response_text")
    .eq("id", id)
    .eq("user_id", context.userId)
    .single();
  if (error) throw new Error("SEVEN_LENSES_REPLAY_NOT_FOUND");
  return parseStoredResponse(data, context.userId);
}

function deadlineSignal(
  requestSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; clear: () => void } {
  const timeout = new AbortController();
  const timer = setTimeout(() => {
    const error = new Error("Seven Lenses provider deadline exceeded");
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
  const error = new Error("Seven Lenses request aborted");
  error.name = "AbortError";
  return error;
}

async function generateDefault(
  query: string,
  lensWeights: LensWeights,
  context: HybridSearchResult[],
  responseLength: ResponseLength,
  options: {
    signal: AbortSignal;
    onProviderAttempt: (attempt: AIResponse) => void;
  },
): Promise<{ synthesis: string; tokenUsage: TokenUsage }> {
  return generateSynthesisFromSummaries(
    query,
    lensWeights,
    context,
    getResponseLengthConfig(responseLength),
    {
      signal: options.signal,
      throwOnProviderError: true,
      onProviderAttempt: options.onProviderAttempt,
    },
  );
}

async function retrieveDefault(
  query: string,
  options?: RetrievalOptions,
): Promise<HybridSearchResult[]> {
  const { hybridSearch } = await import("./hybrid-retrieval");
  return hybridSearch(query, options);
}

async function generateSevenLenses(
  input: MeteredSevenLensesInput,
  context: MeteredActionContext,
  dependencies: SevenLensesExecutionDependencies,
): Promise<{ value: GeneratedSevenLenses; usage: ReturnType<typeof aggregateSevenLensesUsage> }> {
  const actionCode = sevenLensesActionCode(input.responseLength);
  const quote = getMeteringActionQuote(actionCode);
  if (!quote || quote.estimatedProviderCostUsd === null) {
    throw new Error("SEVEN_LENSES_QUOTE_UNAVAILABLE");
  }
  const deadline = deadlineSignal(
    input.signal,
    dependencies.providerTimeoutMs ?? SEVEN_LENSES_PROVIDER_TIMEOUT_MS,
  );
  const attempts: AIResponse[] = [];

  try {
    deadline.signal.throwIfAborted();
    await (dependencies.recordQuery ?? recordQuery)(
      context.userId,
      input.query,
      input.lensWeights,
    );
    deadline.signal.throwIfAborted();
    const retrievalContext = await (dependencies.hybridSearch ?? retrieveDefault)(
      input.query,
      {
        lenses: Object.entries(input.lensWeights)
          .filter(([, weight]) => weight > 0)
          .map(([lens]) => lens),
        limit: 10,
      },
    );
    deadline.signal.throwIfAborted();
    const generated = await (dependencies.generateSynthesis ?? generateDefault)(
      input.query,
      input.lensWeights,
      retrievalContext,
      input.responseLength,
      {
        signal: deadline.signal,
        onProviderAttempt: (attempt) => attempts.push(attempt),
      },
    );
    return {
      value: {
        response: {
          query: input.query,
          responses: [],
          synthesis: generated.synthesis,
          sources: retrievalContext.slice(0, 10).map((source) => ({
            text_id: source.text_id,
            text_title: source.text_title,
            text_author: source.text_author,
            chunk_id: source.chunk_id,
            chunk_index: source.chunk_index,
            relevance: source.finalScore,
          })),
        },
        responseLength: input.responseLength,
        lensWeights: input.lensWeights,
      },
      usage: aggregateSevenLensesUsage(
        attempts,
        quote.estimatedProviderCostUsd,
      ),
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
        // A failed multi-call synthesis may have incurred unreported work.
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

export async function executeMeteredSevenLenses(
  input: MeteredSevenLensesInput,
  dependencies: SevenLensesExecutionDependencies = {},
): Promise<MeteredActionSuccess<SevenLensesGenerationResult>> {
  const query = input.query.trim();
  if (!query || !isLensWeights(input.lensWeights)) {
    throw new Error("SEVEN_LENSES_INVALID_INPUT");
  }
  if (!isResponseLength(input.responseLength)) {
    throw new Error("SEVEN_LENSES_INVALID_INPUT");
  }
  const actionCode = sevenLensesActionCode(input.responseLength);
  const lensModel = process.env.PARALLAX_LENS_MODEL || getDefaultOpenRouterModel();
  const synthesisModel =
    process.env.PARALLAX_SYNTHESIS_MODEL || getDefaultOpenRouterModel();
  const responseId = (dependencies.createResultId ?? randomUUID)();
  if (!UUID_PATTERN.test(responseId)) {
    throw new Error("SEVEN_LENSES_INVALID_RESULT_ID");
  }
  const execute = dependencies.execute ?? executeMeteredAction;
  const replay =
    dependencies.replayResponse ??
    ((reference, context) =>
      replayResponseDefault(
        reference,
        context,
        dependencies.createServiceClient ?? createServiceClient,
      ));
  const persist =
    dependencies.persistResponse ??
    ((id, generated, context) =>
      persistResponseDefault(
        id,
        generated,
        context,
        dependencies.createServiceClient ?? createServiceClient,
      ));

  return execute(
    {
      actionCode,
      requestId: input.requestId,
      input: {
        query,
        lensWeights: input.lensWeights,
        responseLength: input.responseLength,
      },
      provider: {
        name: SEVEN_LENSES_PROVIDER_NAME,
        model: sevenLensesModelDescriptor({ lensModel, synthesisModel }),
        execute: (context) =>
          generateSevenLenses(
            { ...input, query },
            context,
            dependencies,
          ),
      },
      persist: async (generated, context) => {
        const stored = await persist(responseId, generated, context);
        return {
          value: stored,
          resultReference: `${RESULT_PREFIX}${stored.id}`,
        };
      },
      replay,
      isUsableProviderResult: (generated) =>
        generated.response.synthesis.trim().length > 0,
    },
    dependencies.metering,
  );
}
