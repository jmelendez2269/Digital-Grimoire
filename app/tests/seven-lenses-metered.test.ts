import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { AIResponse } from "../src/lib/ai/types";
import {
  MeteringError,
  type MeteredActionContext,
} from "../src/lib/membership/metering-adapter.server";
import type { MeteringStore } from "../src/lib/membership/metering-store.server";
import {
  executeMeteredSevenLenses,
  sevenLensesActionCode,
  type SevenLensesGenerationResult,
} from "../src/lib/parallax/metered-seven-lenses.server";
import { aggregateSevenLensesUsage } from "../src/lib/parallax/provider-usage";
import type { LensWeights } from "../src/lib/parallax/types";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const METERING_ID = "33333333-3333-4333-8333-333333333333";
const RESERVATION_ID = "44444444-4444-4444-8444-444444444444";
const USAGE_ID = "55555555-5555-4555-8555-555555555555";
const RESPONSE_ID = "66666666-6666-4666-8666-666666666666";
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const weights: LensWeights = {
  scientific: 30,
  psychological: 30,
  philosophical: 30,
  religious_spiritual: 30,
  historical_anthropological: 30,
  symbolic_occult: 30,
  mathematical: 30,
};

function response(id = RESPONSE_ID): SevenLensesGenerationResult {
  return {
    id,
    createdAt: "2026-08-12T12:00:00.000Z",
    query: "How do symbols shape memory?",
    responses: [],
    synthesis: "Symbols give memory a structure that can be revisited.",
    sources: [{ text_id: "text-1", text_title: "Memory and Meaning" }],
    responseLength: "short",
    resultUrl: `/api/parallax/history/${id}`,
  };
}

function attempt(input: {
  id: string;
  input: number;
  output: number;
  cost?: number | null;
}): AIResponse {
  return {
    content: "provider result",
    providerRequestId: input.id,
    estimatedCostUsd: input.cost,
    model: "fixture/model",
    provider: "openrouter",
    usage: {
      promptTokens: input.input,
      completionTokens: input.output,
      totalTokens: input.input + input.output,
    },
  };
}

function mockStore(calls: Array<{ operation: string; input?: unknown }>): MeteringStore {
  return {
    async beginRequest(input) {
      calls.push({ operation: "begin_request", input });
      return {
        code: "started",
        meteringRequestId: METERING_ID,
        state: "pending",
        readerCostUsd: 0,
        readerBudgetUsd: 50,
      };
    },
    async getCompletedResultReference(input) {
      calls.push({ operation: "get_completed_result", input });
      return `seven-lenses:${RESPONSE_ID}`;
    },
    async reserveCredits(input) {
      calls.push({ operation: "reserve_credits", input });
      return {
        code: "reserved",
        reservationId: RESERVATION_ID,
        state: "pending",
        availableCredits: 8,
        reservedCredits: 2,
      };
    },
    async attachCreditReservation(input) {
      calls.push({ operation: "attach_credit", input });
    },
    async beginUsageAttempt(input) {
      calls.push({ operation: "begin_usage", input });
      return USAGE_ID;
    },
    async completeUsageAttempt(input) {
      calls.push({ operation: "complete_usage", input });
    },
    async commitCredits(input) {
      calls.push({ operation: "commit_credits", input });
      return {
        code: "committed",
        reservationId: RESERVATION_ID,
        state: "committed",
        availableCredits: 8,
        reservedCredits: 0,
      };
    },
    async releaseCredits(input) {
      calls.push({ operation: "release_credits", input });
      return {
        code: "released",
        reservationId: RESERVATION_ID,
        state: "released",
        availableCredits: 10,
        reservedCredits: 0,
      };
    },
    async completeRequest(input) {
      calls.push({ operation: "complete_request", input });
    },
    async releaseRequest(input) {
      calls.push({ operation: "release_request", input });
    },
  };
}

function metering(store: MeteringStore) {
  let tick = 0;
  return {
    environment: {
      PRISMARIUM_METERING_MODE: "enforce",
      PRISMARIUM_METERING_GLOBAL_KILL_SWITCH: "false",
    },
    now: () => new Date(Date.UTC(2026, 7, 12, 12, 0, tick++)),
    authenticate: async () => ({
      id: USER_ID,
      emailConfirmedAt: "2026-08-01T00:00:00.000Z",
    }),
    resolveEntitlement: async () => ({
      planCode: "reader" as const,
      monthlyCredits: 10,
      paidEntitlementsActive: false,
      failClosed: false,
      reason: "reader_default" as const,
      course: {
        slug: null,
        entitled: false,
        source: "not_allowlisted" as const,
      },
    }),
    store,
  };
}

function baseDependencies(
  calls: Array<{ operation: string; input?: unknown }>,
  store: MeteringStore,
) {
  return {
    createResultId: () => {
      calls.push({ operation: "create_result_id" });
      return RESPONSE_ID;
    },
    recordQuery: async (userId: string) => {
      calls.push({ operation: "record_query", input: userId });
    },
    hybridSearch: async () => {
      calls.push({ operation: "retrieve" });
      return [
        {
          text_id: "text-1",
          content: "Symbols stabilize recall through repeatable associations.",
          finalScore: 0.9,
          text_title: "Memory and Meaning",
        },
      ];
    },
    persistResponse: async (
      id: string,
      generated: { response: { synthesis: string } },
      context: MeteredActionContext,
    ) => {
      calls.push({ operation: "persist_response", input: { id, context } });
      assert.equal(generated.response.synthesis, response().synthesis);
      assert.equal(context.userId, USER_ID);
      return response(id);
    },
    metering: metering(store),
  };
}

test("Seven Lenses server maps short/medium to 2 credits and long to 3", () => {
  assert.equal(sevenLensesActionCode("short"), "seven_lenses.standard");
  assert.equal(sevenLensesActionCode("medium"), "seven_lenses.standard");
  assert.equal(sevenLensesActionCode("long"), "seven_lenses.long");
});

test("provider-reported costs aggregate, while missing costs use the conservative quote", () => {
  assert.deepEqual(
    aggregateSevenLensesUsage(
      [
        attempt({ id: "gen_1", input: 100, output: 20, cost: 0.001 }),
        attempt({ id: "gen_2", input: 200, output: 40, cost: 0.002 }),
      ],
      0.1,
    ),
    {
      providerRequestId: "gen_1,gen_2",
      inputUnits: 300,
      outputUnits: 60,
      estimatedCostUsd: 0.003,
    },
  );
  assert.equal(
    aggregateSevenLensesUsage(
      [attempt({ id: "native_1", input: 100, output: 20, cost: null })],
      0.15,
    ).estimatedCostUsd,
    0.15,
  );
});

test("controlled standard story creates an addressable ID before providers, persists, then commits once", async () => {
  const calls: Array<{ operation: string; input?: unknown }> = [];
  const store = mockStore(calls);
  const result = await executeMeteredSevenLenses(
    {
      query: response().query,
      lensWeights: weights,
      responseLength: "short",
      requestId: REQUEST_ID,
    },
    {
      ...baseDependencies(calls, store),
      generateSynthesis: async (_query, _weights, _context, _length, options) => {
        calls.push({ operation: "provider" });
        options.onProviderAttempt(
          attempt({ id: "gen_lenses", input: 700, output: 140, cost: 0.004 }),
        );
        options.onProviderAttempt(
          attempt({ id: "gen_synthesis", input: 300, output: 80, cost: 0.003 }),
        );
        return {
          synthesis: response().synthesis,
          tokenUsage: { inputTokens: 1_000, outputTokens: 220 },
        };
      },
    },
  );

  assert.equal(result.actionCode, "seven_lenses.standard");
  assert.equal(result.chargedCredits, 2);
  assert.equal(result.replayed, false);
  assert.equal(result.value.resultUrl, `/api/parallax/history/${RESPONSE_ID}`);
  assert.deepEqual(
    calls.map((call) => call.operation),
    [
      "create_result_id",
      "begin_request",
      "reserve_credits",
      "attach_credit",
      "begin_usage",
      "record_query",
      "retrieve",
      "provider",
      "persist_response",
      "commit_credits",
      "complete_request",
      "complete_usage",
    ],
  );
  const usage = calls.find((call) => call.operation === "complete_usage")
    ?.input as {
    providerRequestId: string;
    inputUnits: number;
    outputUnits: number;
    estimatedCostUsd: number;
  };
  assert.equal(usage.providerRequestId, "gen_lenses,gen_synthesis");
  assert.equal(usage.inputUnits, 1_000);
  assert.equal(usage.outputUnits, 220);
  assert.equal(usage.estimatedCostUsd, 0.007);
  assert.equal(
    (
      calls.find((call) => call.operation === "commit_credits")?.input as {
        resultReference: string;
      }
    ).resultReference,
    `seven-lenses:${RESPONSE_ID}`,
  );
  const privateMeteringInputs = calls
    .filter((call) =>
      [
        "begin_request",
        "reserve_credits",
        "begin_usage",
        "commit_credits",
        "complete_request",
        "complete_usage",
      ].includes(call.operation),
    )
    .map((call) => call.input);
  assert.doesNotMatch(
    JSON.stringify(privateMeteringInputs),
    /How do symbols shape memory|Symbols give memory/,
  );
});

test("long execution reserves and commits the server-owned 3-credit quote", async () => {
  const calls: Array<{ operation: string; input?: unknown }> = [];
  const store = mockStore(calls);
  const result = await executeMeteredSevenLenses(
    {
      query: response().query,
      lensWeights: weights,
      responseLength: "long",
      requestId: REQUEST_ID,
    },
    {
      ...baseDependencies(calls, store),
      generateSynthesis: async () => ({
        synthesis: response().synthesis,
        tokenUsage: { inputTokens: 1, outputTokens: 1 },
      }),
      persistResponse: async (id) => ({ ...response(id), responseLength: "long" }),
    },
  );
  assert.equal(result.actionCode, "seven_lenses.long");
  assert.equal(result.chargedCredits, 3);
  assert.equal(
    (
      calls.find((call) => call.operation === "reserve_credits")?.input as {
        quotedCredits: number;
      }
    ).quotedCredits,
    3,
  );
});

test("completed replay reopens the exact durable response without retrieval, provider, persistence, or charge", async () => {
  const calls: Array<{ operation: string; input?: unknown }> = [];
  const base = mockStore(calls);
  const store: MeteringStore = {
    ...base,
    async beginRequest(input) {
      calls.push({ operation: "begin_request", input });
      return {
        code: "duplicate_completed",
        meteringRequestId: METERING_ID,
        state: "completed",
        readerCostUsd: 0.007,
        readerBudgetUsd: 50,
      };
    },
  };
  const result = await executeMeteredSevenLenses(
    {
      query: response().query,
      lensWeights: weights,
      responseLength: "short",
      requestId: REQUEST_ID,
    },
    {
      ...baseDependencies(calls, store),
      replayResponse: async (reference, context) => {
        calls.push({ operation: "replay_response", input: reference });
        assert.equal(reference, `seven-lenses:${RESPONSE_ID}`);
        assert.equal(context.userId, USER_ID);
        return response();
      },
      generateSynthesis: async () => {
        throw new Error("provider must not run on replay");
      },
    },
  );
  assert.equal(result.replayed, true);
  assert.equal(result.chargedCredits, 0);
  assert.equal(result.value.id, RESPONSE_ID);
  assert.deepEqual(
    calls.map((call) => call.operation),
    [
      "create_result_id",
      "begin_request",
      "get_completed_result",
      "replay_response",
    ],
  );
});

test("provider, timeout, abort, empty, and persistence failures release exactly once", async () => {
  const scenarios = [
    {
      name: "provider",
      expected: "METERING_PROVIDER_FAILED",
      generate: async () => {
        throw new Error("provider failed");
      },
    },
    {
      name: "timeout",
      expected: "METERING_PROVIDER_TIMEOUT",
      generate: async () => {
        const error = new Error("deadline");
        error.name = "TimeoutError";
        throw error;
      },
    },
    {
      name: "abort",
      expected: "METERING_PROVIDER_ABORTED",
      generate: async () => {
        const error = new Error("client left");
        error.name = "AbortError";
        throw error;
      },
    },
    {
      name: "empty",
      expected: "METERING_EMPTY_RESULT",
      generate: async () => ({
        synthesis: "   ",
        tokenUsage: { inputTokens: 0, outputTokens: 0 },
      }),
    },
  ];

  for (const scenario of scenarios) {
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const store = mockStore(calls);
    await assert.rejects(
      executeMeteredSevenLenses(
        {
          query: response().query,
          lensWeights: weights,
          responseLength: "short",
          requestId: REQUEST_ID,
        },
        {
          ...baseDependencies(calls, store),
          generateSynthesis: scenario.generate,
        },
      ),
      (error: unknown) =>
        error instanceof MeteringError && error.code === scenario.expected,
      scenario.name,
    );
    assert.equal(
      calls.filter((call) => call.operation === "release_credits").length,
      1,
      scenario.name,
    );
    assert.equal(
      calls.filter((call) => call.operation === "commit_credits").length,
      0,
      scenario.name,
    );
  }

  const calls: Array<{ operation: string; input?: unknown }> = [];
  const store = mockStore(calls);
  await assert.rejects(
    executeMeteredSevenLenses(
      {
        query: response().query,
        lensWeights: weights,
        responseLength: "short",
        requestId: REQUEST_ID,
      },
      {
        ...baseDependencies(calls, store),
        generateSynthesis: async () => ({
          synthesis: response().synthesis,
          tokenUsage: { inputTokens: 1, outputTokens: 1 },
        }),
        persistResponse: async () => {
          throw new Error("database unavailable");
        },
      },
    ),
    (error: unknown) =>
      error instanceof MeteringError &&
      error.code === "METERING_PERSISTENCE_FAILED",
  );
  assert.equal(
    calls.filter((call) => call.operation === "release_credits").length,
    1,
  );
  assert.equal(
    calls.filter((call) => call.operation === "commit_credits").length,
    0,
  );
});

test("a disconnected request and an expired provider deadline both release the hold", async () => {
  const abortController = new AbortController();
  abortController.abort(new DOMException("browser disconnected", "AbortError"));

  for (const scenario of [
    {
      name: "disconnected",
      signal: abortController.signal,
      providerTimeoutMs: 1_000,
    },
    {
      name: "deadline",
      signal: undefined,
      providerTimeoutMs: 1,
    },
  ]) {
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const store = mockStore(calls);
    await assert.rejects(
      executeMeteredSevenLenses(
        {
          query: response().query,
          lensWeights: weights,
          responseLength: "short",
          requestId: REQUEST_ID,
          signal: scenario.signal,
        },
        {
          ...baseDependencies(calls, store),
          providerTimeoutMs: scenario.providerTimeoutMs,
          generateSynthesis: async (_query, _weights, _context, _length, options) =>
            new Promise((_, reject) => {
              if (options.signal.aborted) {
                reject(options.signal.reason);
                return;
              }
              options.signal.addEventListener(
                "abort",
                () => reject(options.signal.reason),
                { once: true },
              );
            }),
        },
      ),
      (error: unknown) =>
        error instanceof MeteringError &&
        (scenario.name === "deadline"
          ? error.code === "METERING_PROVIDER_TIMEOUT"
          : error.code === "METERING_PROVIDER_ABORTED"),
      scenario.name,
    );
    assert.equal(
      calls.filter((call) => call.operation === "release_credits").length,
      1,
    );
    assert.equal(
      calls.filter((call) => call.operation === "commit_credits").length,
      0,
    );
  }
});

test("client cost and streaming contract is UUID-based, durable-first, input-preserving, and server-owned", () => {
  const page = readFileSync(
    resolve(appRoot, "src/app/seven-lenses/page.tsx"),
    "utf8",
  );
  const slider = readFileSync(
    resolve(appRoot, "src/components/parallax/ResponseLengthSlider.tsx"),
    "utf8",
  );
  const route = readFileSync(
    resolve(appRoot, "src/app/api/parallax/query/route.ts"),
    "utf8",
  );
  const orchestrator = readFileSync(
    resolve(appRoot, "src/lib/parallax/lens-orchestrator.ts"),
    "utf8",
  );
  assert.match(page, /crypto\.randomUUID\(\)/);
  assert.match(page, /new AbortController\(\)/);
  assert.match(page, /signal: requestController\.signal/);
  assert.match(
    page,
    /JSON\.stringify\(\{ query, lensWeights, responseLength, requestId \}\)/,
  );
  assert.match(page, /seven_lenses\.standard/);
  assert.match(page, /seven_lenses\.long/);
  assert.match(page, /<ToolCreditStatus/);
  assert.doesNotMatch(page, /\/api\/parallax\/rate-limit/);
  assert.doesNotMatch(page, /<PremiumGate|<RateLimitDisplay/);
  assert.doesNotMatch(page, /setQuery\(['"]['"]\)/);
  assert.doesNotMatch(page, /fetch\(['"]\/api\/parallax\/history['"]/);
  assert.match(slider, /credits: 2/);
  assert.match(slider, /credits: 3/);
  assert.doesNotMatch(page, /creditCost\s*:/);
  assert.match(route, /executeMeteredSevenLenses/);
  assert.match(route, /emitDurableResult\(controller, result\.value/);
  assert.doesNotMatch(route, /candidate\.(creditCost|balance|plan)/);
  assert.match(orchestrator, /summaryAbort\.abort\(error\)/);
  assert.match(orchestrator, /await Promise\.allSettled\(summaryPromises\)/);
});
