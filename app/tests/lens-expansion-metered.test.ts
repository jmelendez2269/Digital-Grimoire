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
  executeMeteredLensExpansion,
  type LensExpansionDependencies,
  type LensExpansionResult,
  type OwnedSevenLensesParent,
} from "../src/lib/parallax/metered-lens-expansion.server";
import type { LensType, LensWeights } from "../src/lib/parallax/types";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const PARENT_REQUEST_ID = "23232323-2323-4232-8232-232323232323";
const METERING_ID = "33333333-3333-4333-8333-333333333333";
const RESERVATION_ID = "44444444-4444-4444-8444-444444444444";
const USAGE_ID = "55555555-5555-4555-8555-555555555555";
const PARENT_ID = "66666666-6666-4666-8666-666666666666";
const EXPANSION_ID = "77777777-7777-4777-8777-777777777777";
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

function parent(): OwnedSevenLensesParent {
  return {
    id: PARENT_ID,
    userId: USER_ID,
    query: "How do symbols shape memory?",
    lensWeights: weights,
    responseLength: "short",
  };
}

function expansion(
  id = EXPANSION_ID,
  lensId: LensType = "scientific"
): LensExpansionResult {
  return {
    id,
    parentResponseId: PARENT_ID,
    lens: lensId,
    lensName: lensId === "scientific" ? "Scientific" : "Psychological",
    content: "A focused, durable perspective.",
    sources: [
      { text_id: "text-1", text_title: "Memory and Meaning", relevance: 0.9 },
    ],
    createdAt: "2026-08-12T15:00:00.000Z",
    resultUrl: `/api/parallax/history/${PARENT_ID}#lens-${lensId}`,
  };
}

function attempt(): AIResponse {
  return {
    content: expansion().content,
    providerRequestId: "gen_expansion_1",
    estimatedCostUsd: 0.003,
    model: "fixture/model",
    provider: "openrouter",
    usage: {
      promptTokens: 120,
      completionTokens: 45,
      totalTokens: 165,
    },
  };
}

function mockStore(
  calls: Array<{ operation: string; input?: unknown }>
): MeteringStore {
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
      return `seven-lenses-expansion:${EXPANSION_ID}`;
    },
    async reserveCredits(input) {
      calls.push({ operation: "reserve_credits", input });
      return {
        code: "reserved",
        reservationId: RESERVATION_ID,
        state: "pending",
        availableCredits: 9,
        reservedCredits: 1,
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
        availableCredits: 9,
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
    now: () => new Date(Date.UTC(2026, 7, 12, 15, 0, tick++)),
    authenticate: async () => ({
      id: USER_ID,
      emailConfirmedAt: "2026-08-01T00:00:00.000Z",
    }),
    resolveEntitlement: async () => ({
      planCode: "student" as const,
      monthlyCredits: 30,
      paidEntitlementsActive: true,
      failClosed: false,
      reason: "active_membership" as const,
      course: {
        slug: null,
        entitled: false,
        source: "not_allowlisted" as const,
      },
    }),
    store,
  };
}

function dependencies(
  calls: Array<{ operation: string; input?: unknown }>,
  store: MeteringStore
): LensExpansionDependencies {
  return {
    loadParent: async () => {
      calls.push({ operation: "load_parent" });
      return parent();
    },
    createResultId: () => {
      calls.push({ operation: "create_result_id" });
      return EXPANSION_ID;
    },
    hybridSearch: async (_query: string, options?: { lenses?: string[] }) => {
      calls.push({ operation: "retrieve", input: options });
      return [
        {
          text_id: "text-1",
          content: "Symbols stabilize recall through repeatable associations.",
          finalScore: 0.9,
          text_title: "Memory and Meaning",
        },
      ];
    },
    generateLens: async (_query, lens, _context, _maxTokens, options) => {
      calls.push({ operation: "provider", input: lens.id });
      options?.onProviderAttempt?.(attempt());
      return {
        lens: lens.id,
        lensName: lens.name,
        content: expansion().content,
        sources: expansion().sources,
        tokenUsage: { inputTokens: 120, outputTokens: 45 },
      };
    },
    persistExpansion: async (
      id: string,
      generated: {
        parentResponseId: string;
        response: { lens: LensType };
      },
      context: MeteredActionContext
    ) => {
      calls.push({
        operation: "persist_expansion",
        input: { id, generated, context },
      });
      assert.equal(generated.parentResponseId, PARENT_ID);
      assert.equal(context.userId, USER_ID);
      return expansion(id, generated.response.lens);
    },
    metering: metering(store),
  };
}

test("controlled expansion loads the owned parent before reserving, persists, and commits exactly one credit", async () => {
  const calls: Array<{ operation: string; input?: unknown }> = [];
  const store = mockStore(calls);
  const result = await executeMeteredLensExpansion(
    {
      parentResponseId: PARENT_ID,
      lensId: "scientific",
      requestId: REQUEST_ID,
    },
    dependencies(calls, store)
  );

  assert.equal(result.actionCode, "seven_lenses.expand");
  assert.equal(result.chargedCredits, 1);
  assert.equal(result.value.id, EXPANSION_ID);
  assert.equal(result.value.parentResponseId, PARENT_ID);
  assert.equal(
    calls.filter((call) => call.operation === "commit_credits").length,
    1
  );
  assert.equal(
    calls.filter((call) => call.operation === "release_credits").length,
    0
  );
  assert.ok(
    calls.findIndex((call) => call.operation === "load_parent") <
      calls.findIndex((call) => call.operation === "reserve_credits")
  );
  assert.ok(
    calls.findIndex((call) => call.operation === "persist_expansion") <
      calls.findIndex((call) => call.operation === "commit_credits")
  );
  const reservation = calls.find((call) => call.operation === "reserve_credits")
    ?.input as { quotedCredits: number; actionCode: string };
  assert.equal(reservation.quotedCredits, 1);
  assert.equal(reservation.actionCode, "seven_lenses.expand");
  const usage = calls.find((call) => call.operation === "complete_usage")
    ?.input as {
    providerRequestId: string;
    inputUnits: number;
    outputUnits: number;
    estimatedCostUsd: number;
  };
  assert.deepEqual(
    {
      providerRequestId: usage.providerRequestId,
      inputUnits: usage.inputUnits,
      outputUnits: usage.outputUnits,
      estimatedCostUsd: usage.estimatedCostUsd,
    },
    {
      providerRequestId: "gen_expansion_1",
      inputUnits: 120,
      outputUnits: 45,
      estimatedCostUsd: 0.003,
    }
  );
});

test("completed retry reopens the exact child without retrieval, provider, persistence, or charge", async () => {
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
        readerCostUsd: 0.003,
        readerBudgetUsd: 50,
      };
    },
  };
  const result = await executeMeteredLensExpansion(
    {
      parentResponseId: PARENT_ID,
      lensId: "scientific",
      requestId: REQUEST_ID,
    },
    {
      ...dependencies(calls, store),
      replayExpansion: async (reference, context) => {
        calls.push({ operation: "replay_expansion", input: reference });
        assert.equal(reference, `seven-lenses-expansion:${EXPANSION_ID}`);
        assert.equal(context.userId, USER_ID);
        return expansion();
      },
      generateLens: async () => {
        throw new Error("provider must not run on replay");
      },
    }
  );

  assert.equal(result.replayed, true);
  assert.equal(result.chargedCredits, 0);
  assert.equal(result.value.id, EXPANSION_ID);
  assert.equal(
    calls.filter((call) => call.operation === "reserve_credits").length,
    0
  );
  assert.equal(calls.filter((call) => call.operation === "provider").length, 0);
  assert.equal(
    calls.filter((call) => call.operation === "persist_expansion").length,
    0
  );
});

test("a parent synthesis request UUID cannot replay as an expansion or incur another charge", async () => {
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
        readerCostUsd: 0.1,
        readerBudgetUsd: 50,
      };
    },
    async getCompletedResultReference(input) {
      calls.push({ operation: "get_completed_result", input });
      return `seven-lenses:${PARENT_ID}`;
    },
  };
  await assert.rejects(
    executeMeteredLensExpansion(
      {
        parentResponseId: PARENT_ID,
        lensId: "scientific",
        requestId: PARENT_REQUEST_ID,
      },
      {
        ...dependencies(calls, store),
        replayExpansion: async (reference) => {
          assert.equal(reference, `seven-lenses:${PARENT_ID}`);
          throw new Error("parent result is not an expansion child");
        },
      }
    ),
    (error: unknown) =>
      error instanceof MeteringError &&
      error.code === "METERING_REQUEST_REPLAY_FAILED"
  );
  assert.equal(
    calls.filter((call) => call.operation === "reserve_credits").length,
    0
  );
  assert.equal(
    calls.filter((call) => call.operation === "commit_credits").length,
    0
  );
});

test("parent ownership and active lens identity are validated before any hold", async () => {
  for (const scenario of [
    {
      name: "unowned parent",
      loadParent: async () => {
        throw new MeteringError("LENS_EXPANSION_PARENT_NOT_FOUND", 404);
      },
      lensId: "scientific",
      expected: "LENS_EXPANSION_PARENT_NOT_FOUND",
    },
    {
      name: "inactive lens",
      loadParent: async () => ({
        ...parent(),
        lensWeights: { ...weights, scientific: 0 },
      }),
      lensId: "scientific",
      expected: "LENS_EXPANSION_LENS_NOT_IN_PARENT",
    },
  ]) {
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const store = mockStore(calls);
    await assert.rejects(
      executeMeteredLensExpansion(
        {
          parentResponseId: PARENT_ID,
          lensId: scenario.lensId,
          requestId: REQUEST_ID,
        },
        {
          ...dependencies(calls, store),
          loadParent: scenario.loadParent,
        }
      ),
      (error: unknown) =>
        error instanceof MeteringError && error.code === scenario.expected,
      scenario.name
    );
    assert.equal(calls.length, 0, scenario.name);
  }
});

test("different lenses retain distinct metering fingerprints and durable child IDs", async () => {
  const observed: Array<{ lensId: string; resultId: string }> = [];
  for (const [lensId, requestId, resultId] of [
    ["scientific", REQUEST_ID, EXPANSION_ID],
    [
      "psychological",
      "88888888-8888-4888-8888-888888888888",
      "99999999-9999-4999-8999-999999999999",
    ],
  ] as const) {
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const store = mockStore(calls);
    const result = await executeMeteredLensExpansion(
      { parentResponseId: PARENT_ID, lensId, requestId },
      {
        ...dependencies(calls, store),
        createResultId: () => resultId,
        persistExpansion: async (id, generated) => {
          observed.push({ lensId: generated.response.lens, resultId: id });
          return expansion(id, generated.response.lens);
        },
      }
    );
    assert.equal(result.value.lens, lensId);
    const begin = calls.find((call) => call.operation === "begin_request")
      ?.input as { requestFingerprint: string };
    assert.ok(begin.requestFingerprint);
    observed.push({
      lensId: `fingerprint:${lensId}`,
      resultId: begin.requestFingerprint,
    });
  }
  assert.notEqual(observed[0].resultId, observed[2].resultId);
  assert.notEqual(observed[1].resultId, observed[3].resultId);
});

test("provider, empty, and persistence failures release exactly once", async () => {
  const scenarios = [
    {
      name: "provider",
      expected: "METERING_PROVIDER_FAILED",
      generateLens: async () => {
        throw new Error("provider failed");
      },
      persistExpansion: undefined,
    },
    {
      name: "empty",
      expected: "METERING_EMPTY_RESULT",
      generateLens: async () => ({
        lens: "scientific" as const,
        lensName: "Scientific",
        content: "   ",
        sources: [],
        tokenUsage: { inputTokens: 0, outputTokens: 0 },
      }),
      persistExpansion: undefined,
    },
    {
      name: "persistence",
      expected: "METERING_PERSISTENCE_FAILED",
      generateLens: undefined,
      persistExpansion: async () => {
        throw new Error("database unavailable");
      },
    },
  ];

  for (const scenario of scenarios) {
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const store = mockStore(calls);
    const base = dependencies(calls, store);
    await assert.rejects(
      executeMeteredLensExpansion(
        {
          parentResponseId: PARENT_ID,
          lensId: "scientific",
          requestId: REQUEST_ID,
        },
        {
          ...base,
          generateLens: scenario.generateLens ?? base.generateLens,
          persistExpansion: scenario.persistExpansion ?? base.persistExpansion,
        }
      ),
      (error: unknown) =>
        error instanceof MeteringError && error.code === scenario.expected,
      scenario.name
    );
    assert.equal(
      calls.filter((call) => call.operation === "release_credits").length,
      1,
      scenario.name
    );
    assert.equal(
      calls.filter((call) => call.operation === "commit_credits").length,
      0,
      scenario.name
    );
  }
});

test("disconnect and deadline abort the provider path and release the hold", async () => {
  const disconnected = new AbortController();
  disconnected.abort(new DOMException("browser disconnected", "AbortError"));
  for (const scenario of [
    { name: "disconnect", signal: disconnected.signal, timeout: 1_000 },
    { name: "deadline", signal: undefined, timeout: 1 },
  ]) {
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const store = mockStore(calls);
    const base = dependencies(calls, store);
    await assert.rejects(
      executeMeteredLensExpansion(
        {
          parentResponseId: PARENT_ID,
          lensId: "scientific",
          requestId: REQUEST_ID,
          signal: scenario.signal,
        },
        {
          ...base,
          providerTimeoutMs: scenario.timeout,
          generateLens: async (_query, _lens, _context, _tokens, options) => {
            const signal = options?.signal;
            if (!signal) throw new Error("test signal unavailable");
            return new Promise((_, reject) => {
              if (signal.aborted) {
                reject(signal.reason);
                return;
              }
              signal.addEventListener("abort", () => reject(signal.reason), {
                once: true,
              });
            });
          },
        }
      ),
      (error: unknown) =>
        error instanceof MeteringError &&
        error.code ===
          (scenario.name === "deadline"
            ? "METERING_PROVIDER_TIMEOUT"
            : "METERING_PROVIDER_ABORTED"),
      scenario.name
    );
    assert.equal(
      calls.filter((call) => call.operation === "release_credits").length,
      1
    );
    assert.equal(
      calls.filter((call) => call.operation === "commit_credits").length,
      0
    );
  }
});

test("route and client expose one server-owned credit with durable parent, UUID retry, and no query telemetry", () => {
  const route = readFileSync(
    resolve(appRoot, "src/app/api/parallax/lens/[lensId]/route.ts"),
    "utf8"
  );
  const card = readFileSync(
    resolve(appRoot, "src/components/parallax/ExpandableLensCard.tsx"),
    "utf8"
  );
  const stream = readFileSync(
    resolve(appRoot, "src/components/parallax/ResponseStream.tsx"),
    "utf8"
  );
  const page = readFileSync(
    resolve(appRoot, "src/app/seven-lenses/page.tsx"),
    "utf8"
  );

  assert.match(route, /executeMeteredLensExpansion/);
  assert.match(route, /Object\.keys\(candidate\)/);
  assert.doesNotMatch(
    route,
    /candidate\.(query|lensWeights|responseLength|creditCost|balance)/
  );
  assert.doesNotMatch(route, /logApiUsage|query\.substring/);
  assert.match(card, /1 Prism Credit/);
  assert.match(card, /retryRequestIdRef/);
  assert.match(card, /crypto\.randomUUID\(\)/);
  assert.match(card, /JSON\.stringify\(\{ parentResponseId, requestId \}\)/);
  assert.match(card, /AbortController/);
  assert.match(card, /METERING_SETTLEMENT_FAILED/);
  assert.match(card, /onExpand\?\.\(lensId\)/);
  assert.match(stream, /parentResponseId=\{parentResponseId\}/);
  assert.match(page, /parentResponseId=\{currentResponseId\}/);
});

test("migration stores expansion children separately with ownership, parent, lens, RLS, and no client writes", () => {
  const migration = readFileSync(
    resolve(
      appRoot,
      "../supabase/migrations/20260812110000_lean_l4_04_lens_expansions.sql"
    ),
    "utf8"
  );
  assert.match(
    migration,
    /create table if not exists public\.convergence_lens_expansions/i
  );
  assert.match(
    migration,
    /parent_response_id uuid not null references public\.convergence_responses/i
  );
  assert.match(migration, /user_id uuid not null references auth\.users/i);
  assert.match(migration, /lens_id text not null check/i);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /revoke all.*authenticated/i);
  assert.match(migration, /grant select.*authenticated/i);
  assert.doesNotMatch(migration, /grant (insert|update|delete)/i);
});
