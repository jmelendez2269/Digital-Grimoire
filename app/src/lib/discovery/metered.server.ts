import "server-only";
import {
  executeMeteredAction,
  MeteredProviderFailure,
  type MeteringDependencies,
  type MeteredProviderUsage,
} from "@/lib/membership/metering-adapter.server";
import { getMeteringActionQuote } from "@/lib/membership/metering-catalog.server";
import type { DiscoveryResult, DiscoveryRun } from "./model";

export function discoveryUsage(
  usage: DiscoveryResult["usage"],
  incomplete = false
): MeteredProviderUsage {
  const fallback =
    getMeteringActionQuote("deep_search.fresh")!.estimatedProviderCostUsd!;
  const reported = usage.reduce((sum, call) => sum + (call.cost ?? 0), 0);
  return {
    // The wallet ledger has one 200-character request reference. The complete
    // list of provider calls remains in the persisted discovery usage array.
    providerRequestId: usage.find((call) => call.requestId)?.requestId || null,
    inputUnits: usage.reduce(
      (sum, call) => sum + (call.inputTokens ?? call.tokens),
      0
    ),
    outputUnits: usage.reduce((sum, call) => sum + (call.outputTokens ?? 0), 0),
    estimatedCostUsd:
      incomplete || !usage.length || usage.some((call) => call.cost === null)
        ? Math.max(fallback, reported)
        : reported,
  };
}

export function executeMeteredDiscovery(
  input: { id: string; question: string; parentId?: string },
  work: {
    generate: () => Promise<DiscoveryResult>;
    persist: (result: DiscoveryResult, owner: string) => Promise<DiscoveryRun>;
    replay: (id: string, owner: string) => Promise<DiscoveryRun>;
    usage: DiscoveryResult["usage"];
    signal: AbortSignal;
  },
  metering?: MeteringDependencies
) {
  return executeMeteredAction(
    {
      actionCode: "deep_search.fresh",
      requestId: input.id,
      input: { question: input.question, parentId: input.parentId || null },
      provider: {
        name: "openrouter",
        model: process.env.DISCOVERY_MODEL || "openai/gpt-5.4",
        execute: async () => {
          try {
            const result = await work.generate();
            return { value: result, usage: discoveryUsage(result.usage) };
          } catch {
            throw new MeteredProviderFailure(
              work.signal.aborted
                ? work.signal.reason?.name === "TimeoutError"
                  ? "timeout"
                  : "aborted"
                : "provider_error",
              discoveryUsage(work.usage, true)
            );
          }
        },
      },
      isUsableProviderResult: (result) =>
        result.overview.length > 0 || result.connections.length > 0,
      persist: async (result, context) => ({
        value: await work.persist(result, context.userId),
        resultReference: `discovery:${input.id}`,
      }),
      replay: (reference, context) => {
        if (reference !== `discovery:${input.id}`)
          throw new Error("Invalid research reference");
        return work.replay(input.id, context.userId);
      },
    },
    metering
  );
}
