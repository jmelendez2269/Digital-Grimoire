import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  executeMeteredAction,
  MeteringError,
  MeteredProviderFailure,
} from "../src/lib/membership/metering-adapter.server";
import {
  DEFAULT_READER_MONTHLY_PROVIDER_BUDGET_USD,
  getMeteringActionQuote,
  resolveMeteringActionPolicy,
} from "../src/lib/membership/metering-catalog.server";
import type { MeteringStore } from "../src/lib/membership/metering-store.server";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const METERING_ID = "33333333-3333-4333-8333-333333333333";
const RESERVATION_ID = "44444444-4444-4444-8444-444444444444";
const USAGE_ID = "55555555-5555-4555-8555-555555555555";

function environment(mode: "off" | "shadow" | "enforce" = "shadow") {
  return {
    PRISMARIUM_METERING_MODE: mode,
    PRISMARIUM_METERING_GLOBAL_KILL_SWITCH: "false",
  };
}

function readerEntitlement() {
  return {
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
  };
}

function clock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 7, 11, 12, 0, tick++));
}

function mockStore(
  calls: Array<{ operation: string; input?: unknown }>,
  overrides: Partial<MeteringStore> = {},
): MeteringStore {
  const store: MeteringStore = {
    async beginRequest(input) {
      calls.push({ operation: "begin_request", input });
      return {
        code: "started",
        meteringRequestId: METERING_ID,
        state: "pending",
        readerCostUsd: 0.05,
        readerBudgetUsd: 50,
      };
    },
    async getCompletedResultReference(input) {
      calls.push({ operation: "get_completed_result", input });
      return "working:working-123";
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
  return { ...store, ...overrides };
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    actionCode: "working.generate",
    requestId: REQUEST_ID,
    input: { intention: "a private intention that must not enter telemetry" },
    provider: {
      name: "anthropic",
      model: "claude-haiku-4-5",
      execute: async () => ({
        value: "generated working",
        usage: {
          providerRequestId: "msg_test_123",
          inputUnits: 100,
          outputUnits: 200,
          estimatedCostUsd: 0.012345,
        },
      }),
    },
    persist: async () => ({
      value: { id: "working-123" },
      resultReference: "working:working-123",
    }),
    replay: async () => ({ id: "working-123" }),
    ...overrides,
  };
}

function dependencies(store: MeteringStore, mode: "off" | "shadow" | "enforce") {
  return {
    environment: environment(mode),
    now: clock(),
    authenticate: async () => ({
      id: USER_ID,
      emailConfirmedAt: "2026-08-01T00:00:00.000Z",
    }),
    resolveEntitlement: async () => readerEntitlement(),
    store,
  };
}

test("fixed quote catalog uses versioned launch weights and fails closed by default", () => {
  assert.deepEqual(
    [
      "working.generate",
      "seven_lenses.expand",
      "seven_lenses.standard",
      "seven_lenses.long",
      "deep_search.fresh",
    ].map((actionCode) => {
      const quote = getMeteringActionQuote(actionCode);
      return [
        actionCode,
        quote?.creditCost,
        quote?.estimatedProviderCostUsd,
        quote?.quoteVersion,
      ];
    }),
    [
      ["working.generate", 1, 0.05, "lean-launch-v1"],
      ["seven_lenses.expand", 1, 0.05, "lean-launch-v1"],
      ["seven_lenses.standard", 2, 0.1, "lean-launch-v1"],
      ["seven_lenses.long", 3, 0.15, "lean-launch-v1"],
      ["deep_search.fresh", 3, 0.15, "lean-launch-v1"],
    ],
  );
  assert.equal(getMeteringActionQuote("deep_search.fresh")?.offered, false);
  assert.equal(getMeteringActionQuote("image.generate")?.offered, false);
  assert.equal(
    resolveMeteringActionPolicy("deep_search.fresh", {
      PRISMARIUM_METERING_MODE: "enforce",
      PRISMARIUM_METERING_ACTION_MODES: "deep_search.fresh=enforce",
    })?.mode,
    "off",
  );
  assert.equal(resolveMeteringActionPolicy("working.generate", {})?.mode, "off");
  assert.equal(
    resolveMeteringActionPolicy("working.generate", {})
      ?.readerMonthlyProviderBudgetUsd,
    DEFAULT_READER_MONTHLY_PROVIDER_BUDGET_USD,
  );
});

test("malformed modes, budgets, and kill switches fail closed", () => {
  for (const invalid of [
    { PRISMARIUM_METERING_MODE: "on" },
    { PRISMARIUM_METERING_ACTION_MODES: "working.generate=live" },
    { PRISMARIUM_METERING_ACTION_KILL_SWITCHES: "unknown.action" },
    { PRISMARIUM_METERING_GLOBAL_KILL_SWITCH: "TRUE" },
    { PRISMARIUM_READER_MONTHLY_PROVIDER_BUDGET_USD: "50.001" },
  ]) {
    const policy = resolveMeteringActionPolicy("working.generate", invalid);
    assert.equal(policy?.configurationValid, false);
    assert.equal(policy?.killed, true);
    assert.equal(policy?.mode, "off");
  }

  const perAction = resolveMeteringActionPolicy("working.generate", {
    PRISMARIUM_METERING_MODE: "off",
    PRISMARIUM_METERING_ACTION_MODES: "working.generate=shadow",
  });
  assert.equal(perAction?.mode, "shadow");
});

test("shadow mode executes the shared lifecycle without reserving or charging credits", async () => {
  const calls: Array<{ operation: string; input?: unknown }> = [];
  const store = mockStore(calls);
  const result = await executeMeteredAction(
    request({
      provider: {
        name: "anthropic",
        model: "claude-haiku-4-5",
        execute: async () => {
          calls.push({ operation: "provider" });
          return request().provider.execute();
        },
      },
      persist: async () => {
        calls.push({ operation: "persist" });
        return {
          value: { id: "working-123" },
          resultReference: "working:working-123",
        };
      },
    }),
    dependencies(store, "shadow"),
  );

  assert.deepEqual(
    calls.map((call) => call.operation),
    [
      "begin_request",
      "begin_usage",
      "provider",
      "persist",
      "complete_request",
      "complete_usage",
    ],
  );
  assert.equal(result.mode, "shadow");
  assert.equal(result.chargedCredits, 0);
  assert.equal(result.replayed, false);
  assert.doesNotMatch(
    JSON.stringify(calls.filter((call) => call.input)),
    /private intention|generated working/i,
  );
});

test("enforce mode reserves before provider and commits only after durable persistence", async () => {
  const calls: Array<{ operation: string; input?: unknown }> = [];
  const store = mockStore(calls);
  const result = await executeMeteredAction(
    request({
      provider: {
        name: "anthropic",
        model: "claude-haiku-4-5",
        execute: async () => {
          calls.push({ operation: "provider" });
          return request().provider.execute();
        },
      },
      persist: async () => {
        calls.push({ operation: "persist" });
        return {
          value: { id: "working-123" },
          resultReference: "working:working-123",
        };
      },
    }),
    dependencies(store, "enforce"),
  );

  assert.deepEqual(
    calls.map((call) => call.operation),
    [
      "begin_request",
      "reserve_credits",
      "attach_credit",
      "begin_usage",
      "provider",
      "persist",
      "commit_credits",
      "complete_request",
      "complete_usage",
    ],
  );
  assert.equal(result.chargedCredits, 1);
  assert.equal(result.mode, "enforce");
  assert.equal(result.replayed, false);
});

test("completed request replay loads the exact persisted result without provider or credit work", async () => {
  const calls: Array<{ operation: string; input?: unknown }> = [];
  const store = mockStore(calls, {
    async beginRequest(input) {
      calls.push({ operation: "begin_request", input });
      return {
        code: "duplicate_completed",
        meteringRequestId: METERING_ID,
        state: "completed",
        readerCostUsd: 0.01,
        readerBudgetUsd: 50,
      };
    },
  });
  let providerCalls = 0;
  const result = await executeMeteredAction(
    request({
      provider: {
        name: "anthropic",
        model: "claude-haiku-4-5",
        execute: async () => {
          providerCalls += 1;
          return request().provider.execute();
        },
      },
      replay: async (resultReference: string) => {
        calls.push({ operation: "replay", input: resultReference });
        return { id: "working-123" };
      },
    }),
    dependencies(store, "enforce"),
  );

  assert.equal(providerCalls, 0);
  assert.equal(result.replayed, true);
  assert.equal(result.chargedCredits, 0);
  assert.deepEqual(
    calls.map((call) => call.operation),
    ["begin_request", "get_completed_result", "replay"],
  );
});

test("provider and persistence failures release once and record privacy-safe outcomes", async () => {
  for (const failure of ["provider", "persistence"] as const) {
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const store = mockStore(calls);
    const failingRequest = request({
      provider: {
        name: "anthropic",
        model: "claude-haiku-4-5",
        execute: async () => {
          calls.push({ operation: "provider" });
          if (failure === "provider") {
            throw new MeteredProviderFailure("provider_error", {
              inputUnits: 50,
              outputUnits: 0,
              estimatedCostUsd: 0.004,
            });
          }
          return request().provider.execute();
        },
      },
      persist: async () => {
        calls.push({ operation: "persist" });
        throw new Error("database unavailable");
      },
    });

    await assert.rejects(
      executeMeteredAction(failingRequest, dependencies(store, "enforce")),
      (error: unknown) =>
        error instanceof MeteringError &&
        error.code ===
          (failure === "provider"
            ? "METERING_PROVIDER_FAILED"
            : "METERING_PERSISTENCE_FAILED"),
    );
    assert.equal(
      calls.filter((call) => call.operation === "release_credits").length,
      1,
    );
    const usage = calls.find((call) => call.operation === "complete_usage")
      ?.input as { outcome?: string };
    assert.equal(
      usage.outcome,
      failure === "provider" ? "provider_error" : "persistence_error",
    );
    const control = calls.find((call) => call.operation === "complete_request")
      ?.input as { outcome?: string };
    assert.equal(control.outcome, usage.outcome);
  }
});

test("moderation, timeout, abort, and empty results release once with stable outcomes", async () => {
  const scenarios = [
    {
      name: "moderation",
      expectedCode: "METERING_MODERATION_BLOCKED",
      expectedOutcome: "moderated",
      execute: async () => {
        throw new MeteredProviderFailure("moderated", {
          inputUnits: 20,
          outputUnits: 0,
          estimatedCostUsd: 0.00002,
        });
      },
    },
    {
      name: "timeout",
      expectedCode: "METERING_PROVIDER_TIMEOUT",
      expectedOutcome: "timeout",
      execute: async () => {
        const error = new Error("deadline");
        error.name = "TimeoutError";
        throw error;
      },
    },
    {
      name: "abort",
      expectedCode: "METERING_PROVIDER_ABORTED",
      expectedOutcome: "aborted",
      execute: async () => {
        const error = new Error("cancelled");
        error.name = "AbortError";
        throw error;
      },
    },
    {
      name: "empty",
      expectedCode: "METERING_EMPTY_RESULT",
      expectedOutcome: "empty",
      execute: async () => ({
        value: "",
        usage: {
          inputUnits: 20,
          outputUnits: 0,
          estimatedCostUsd: 0.00002,
        },
      }),
    },
  ];

  for (const scenario of scenarios) {
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const store = mockStore(calls);
    await assert.rejects(
      executeMeteredAction(
        request({
          provider: {
            name: "anthropic",
            model: "claude-haiku-4-5",
            execute: scenario.execute,
          },
        }),
        dependencies(store, "enforce"),
      ),
      (error: unknown) =>
        error instanceof MeteringError && error.code === scenario.expectedCode,
      scenario.name,
    );
    assert.equal(
      calls.filter((call) => call.operation === "release_credits").length,
      1,
    );
    assert.equal(
      (
        calls.find((call) => call.operation === "complete_request")
          ?.input as { outcome?: string }
      ).outcome,
      scenario.expectedOutcome,
    );
  }
});

test("auth, verified-email, entitlement, flags, and request size stop before providers", async () => {
  const scenarios = [
    {
      expected: "METERING_UNAUTHORIZED",
      dependencies: { authenticate: async () => null },
    },
    {
      expected: "METERING_VERIFIED_EMAIL_REQUIRED",
      dependencies: {
        authenticate: async () => ({ id: USER_ID, emailConfirmedAt: null }),
      },
    },
    {
      expected: "METERING_ENTITLEMENT_UNAVAILABLE",
      dependencies: {
        resolveEntitlement: async () => ({
          ...readerEntitlement(),
          failClosed: true,
          reason: "membership_lookup_failed" as const,
        }),
      },
    },
    {
      expected: "METERING_ACTION_KILLED",
      dependencies: {
        environment: {
          PRISMARIUM_METERING_MODE: "enforce",
          PRISMARIUM_METERING_GLOBAL_KILL_SWITCH: "true",
        },
      },
    },
    {
      expected: "METERING_REQUEST_TOO_LARGE",
      request: request({ input: { intention: "x".repeat(4_100) } }),
    },
  ];

  for (const scenario of scenarios) {
    let providerCalls = 0;
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const store = mockStore(calls);
    const base = dependencies(store, "enforce");
    const candidate = (scenario.request ?? request()) as ReturnType<typeof request>;
    candidate.provider.execute = async () => {
      providerCalls += 1;
      return request().provider.execute();
    };
    await assert.rejects(
      executeMeteredAction(candidate, {
        ...base,
        ...scenario.dependencies,
      }),
      (error: unknown) =>
        error instanceof MeteringError && error.code === scenario.expected,
    );
    assert.equal(providerCalls, 0);
  }
});

test("atomic control denials map to stable customer-safe errors", async () => {
  for (const [code, expected] of [
    ["concurrency_limited", "METERING_CONCURRENCY_LIMITED"],
    ["velocity_limited", "METERING_VELOCITY_LIMITED"],
    ["reader_budget_exceeded", "READER_AI_CAPACITY_PAUSED"],
  ] as const) {
    const calls: Array<{ operation: string; input?: unknown }> = [];
    const base = mockStore(calls);
    const store = mockStore(calls, {
      beginRequest: async (input) => {
        calls.push({ operation: "begin_request", input });
        return {
          code,
          meteringRequestId: null,
          state: null,
          readerCostUsd: 50,
          readerBudgetUsd: 50,
        };
      },
    });
    void base;
    await assert.rejects(
      executeMeteredAction(request(), dependencies(store, "enforce")),
      (error: unknown) =>
        error instanceof MeteringError && error.code === expected,
    );
    assert.deepEqual(calls.map((call) => call.operation), ["begin_request"]);
  }
});

test("L4-04 connects The Working, Seven Lenses synthesis, and lens expansion to the shared adapter", () => {
  assert.match(
    readFileSync(
      resolve(appRoot, "src/app/api/working/generate/route.ts"),
      "utf8",
    ),
    /executeMeteredWorking|metered-working/,
  );
  assert.match(
    readFileSync(
      resolve(appRoot, "src/app/api/parallax/query/route.ts"),
      "utf8",
    ),
    /executeMeteredSevenLenses|metered-seven-lenses/,
  );
  assert.match(
    readFileSync(
      resolve(appRoot, "src/app/api/parallax/lens/[lensId]/route.ts"),
      "utf8",
    ),
    /executeMeteredLensExpansion|metered-lens-expansion/,
  );
  const routes = [
    "src/app/api/parallax/ai-search/route.ts",
    "src/app/api/ai/claude/route.ts",
    "src/app/api/ai/gemini/route.ts",
    "src/app/api/ai/gpt/route.ts",
    "src/app/api/covers/generate/route.ts",
    "src/app/api/practitioner/tarot/generate/route.ts",
  ];
  for (const route of routes) {
    assert.doesNotMatch(
      readFileSync(resolve(appRoot, route), "utf8"),
      /executeMeteredAction|metering-adapter/,
    );
  }
});
