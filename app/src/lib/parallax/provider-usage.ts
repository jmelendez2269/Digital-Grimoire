import type { AIResponse } from "@/lib/ai/types";
import type { MeteredProviderUsage } from "@/lib/membership/metering-adapter.server";

export const SEVEN_LENSES_PROVIDER_NAME = "ai-orchestrator";

function boundedModel(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 128) : "unconfigured";
}

export function sevenLensesModelDescriptor(input: {
  lensModel: string;
  synthesisModel: string;
}): string {
  return boundedModel(
    input.lensModel === input.synthesisModel
      ? input.lensModel
      : `${input.lensModel}|${input.synthesisModel}`,
  );
}

/**
 * OpenRouter reports billed cost in the completion usage object. Native-provider
 * paths do not yet expose a common cost field, so mixed or missing-cost attempts
 * deliberately fall back to the action's conservative fixed quote.
 */
export function aggregateSevenLensesUsage(
  attempts: AIResponse[],
  fallbackCostUsd: number,
): MeteredProviderUsage {
  const providerRequestIds = attempts
    .map((attempt) => attempt.providerRequestId)
    .filter((value): value is string => Boolean(value));
  const hasCompleteCost =
    attempts.length > 0 &&
    attempts.every(
      (attempt) =>
        typeof attempt.estimatedCostUsd === "number" &&
        Number.isFinite(attempt.estimatedCostUsd) &&
        attempt.estimatedCostUsd >= 0,
    );
  const estimatedCostUsd = hasCompleteCost
    ? attempts.reduce(
        (total, attempt) => total + (attempt.estimatedCostUsd ?? 0),
        0,
      )
    : fallbackCostUsd;

  return {
    providerRequestId:
      providerRequestIds.length > 0
        ? providerRequestIds.join(",").slice(0, 200)
        : null,
    inputUnits: attempts.reduce(
      (total, attempt) => total + attempt.usage.promptTokens,
      0,
    ),
    outputUnits: attempts.reduce(
      (total, attempt) => total + attempt.usage.completionTokens,
      0,
    ),
    estimatedCostUsd:
      Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
  };
}
