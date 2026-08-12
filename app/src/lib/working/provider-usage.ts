export const WORKING_PROVIDER_NAME = "anthropic";
export const WORKING_PROVIDER_MODEL = "claude-haiku-4-5";
export const WORKING_PROVIDER_RATE_VERSION =
  "anthropic-haiku-4-5-standard-2025-10-15";

const INPUT_USD_PER_MILLION_TOKENS = 1;
const OUTPUT_USD_PER_MILLION_TOKENS = 5;

export interface WorkingProviderUsage {
  providerRequestId: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export function workingProviderRequestOptions(input: {
  signal?: AbortSignal;
  timeoutMs?: number;
}): { signal?: AbortSignal; timeout?: number } {
  return {
    ...(input.signal ? { signal: input.signal } : {}),
    ...(input.timeoutMs === undefined ? {} : { timeout: input.timeoutMs }),
  };
}

export function workingProviderUsage(input: {
  providerRequestId?: string | null;
  inputTokens: number;
  outputTokens: number;
}): WorkingProviderUsage {
  const estimatedCostUsd =
    (input.inputTokens * INPUT_USD_PER_MILLION_TOKENS +
      input.outputTokens * OUTPUT_USD_PER_MILLION_TOKENS) /
    1_000_000;

  return {
    providerRequestId: input.providerRequestId ?? null,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
  };
}

export function aggregateWorkingProviderUsage(
  attempts: WorkingProviderUsage[],
): WorkingProviderUsage {
  const providerRequestIds = attempts
    .map((attempt) => attempt.providerRequestId)
    .filter((value): value is string => Boolean(value));

  return {
    providerRequestId:
      providerRequestIds.length > 0
        ? providerRequestIds.join(",").slice(0, 200)
        : null,
    inputTokens: attempts.reduce(
      (total, attempt) => total + attempt.inputTokens,
      0,
    ),
    outputTokens: attempts.reduce(
      (total, attempt) => total + attempt.outputTokens,
      0,
    ),
    estimatedCostUsd:
      Math.round(
        attempts.reduce(
          (total, attempt) => total + attempt.estimatedCostUsd,
          0,
        ) * 1_000_000,
      ) / 1_000_000,
  };
}
