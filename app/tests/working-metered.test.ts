import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MeteringStore } from "../src/lib/membership/metering-store.server";
import type { AssembledPalette } from "../src/lib/working/assemble";
import { executeMeteredWorking } from "../src/lib/working/metered-working.server";
import {
  workingProviderRequestOptions,
  workingProviderUsage,
} from "../src/lib/working/provider-usage";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const METERING_ID = "33333333-3333-4333-8333-333333333333";
const RESERVATION_ID = "44444444-4444-4444-8444-444444444444";
const USAGE_ID = "55555555-5555-4555-8555-555555555555";
const WORKING_ID = "66666666-6666-4666-8666-666666666666";
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const palette: AssembledPalette = {
  intention: {
    slug: "clarity",
    label: "Clarity",
    aliases: [],
    matchedFrom: "fuzzy",
  },
  groups: [],
  patrons: [],
  stats: {
    intentionSlugsUnioned: ["clarity"],
    totalMatched: 0,
    totalReturned: 0,
  },
};

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
      return `working:${WORKING_ID}`;
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
    now: () => new Date(Date.UTC(2026, 7, 11, 16, 0, tick++)),
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

test("Haiku 4.5 usage uses the fixed standard $1/$5 per-million rate", () => {
  assert.deepEqual(
    workingProviderUsage({
      providerRequestId: "msg_rate",
      inputTokens: 3_000,
      outputTokens: 700,
    }),
    {
      providerRequestId: "msg_rate",
      inputTokens: 3_000,
      outputTokens: 700,
      estimatedCostUsd: 0.0065,
    }
  );
});

test("Anthropic request options omit an absent timeout instead of passing undefined", () => {
  const controller = new AbortController();
  assert.deepEqual(workingProviderRequestOptions({}), {});
  assert.deepEqual(
    workingProviderRequestOptions({ signal: controller.signal }),
    {
      signal: controller.signal,
    }
  );
  assert.deepEqual(workingProviderRequestOptions({ timeoutMs: 55_000 }), {
    timeout: 55_000,
  });
});

test("The Working client consumes server-owned wallet cost, sends an idempotency UUID, preserves input, and never calls the old save route", () => {
  const source = readFileSync(
    resolve(appRoot, "src/app/workbench/the-working/page.tsx"),
    "utf8"
  );
  assert.match(source, /useToolCreditState\("working\.generate"\)/);
  assert.match(source, /actionCode="working\.generate"/);
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(
    source,
    /JSON\.stringify\(\{ intention: intention\.trim\(\), requestId \}\)/
  );
  assert.doesNotMatch(source, /setIntention\(""\)/);
  assert.doesNotMatch(source, /api\/working\/save/);
});

test("controlled full story aggregates semantic and synthesis usage, persists, then commits once", async () => {
  const calls: Array<{ operation: string; input?: unknown }> = [];
  const store = mockStore(calls);
  const result = await executeMeteredWorking(
    {
      intention: "clarity before a decision",
      requestId: REQUEST_ID,
    },
    {
      createServiceClient: () => ({}) as SupabaseClient,
      assemblePalette: async () => null,
      resolveIntent: async () => {
        calls.push({ operation: "semantic_provider" });
        return {
          resolution: {
            slugs: ["clarity"],
            label: "clarity before a decision",
            via: "semantic" as const,
            interpretation: "A request for discernment.",
          },
          usage: workingProviderUsage({
            providerRequestId: "msg_semantic",
            inputTokens: 100,
            outputTokens: 20,
          }),
          moderated: false,
        };
      },
      assemblePaletteForSlugs: async () => palette,
      synthesize: async () => {
        calls.push({ operation: "synthesis_provider" });
        return {
          text: "## A ritual for clarity",
          model: "claude-haiku-4-5",
          usage: workingProviderUsage({
            providerRequestId: "msg_synthesis",
            inputTokens: 3_000,
            outputTokens: 700,
          }),
          moderated: false,
        };
      },
      persistWorking: async (generated, intention, context) => {
        calls.push({ operation: "persist_working" });
        assert.equal(context.userId, USER_ID);
        assert.equal(intention, "clarity before a decision");
        return {
          id: WORKING_ID,
          createdAt: "2026-08-11T16:00:00.000Z",
          palette: generated.palette,
          ritual: generated.ritual,
          modelUsed: generated.modelUsed,
          interpretation: generated.interpretation,
        };
      },
      metering: metering(store),
    }
  );

  assert.equal(result.value.id, WORKING_ID);
  assert.equal(result.chargedCredits, 1);
  assert.equal(result.replayed, false);
  assert.deepEqual(
    calls.map((call) => call.operation),
    [
      "begin_request",
      "reserve_credits",
      "attach_credit",
      "begin_usage",
      "semantic_provider",
      "synthesis_provider",
      "persist_working",
      "commit_credits",
      "complete_request",
      "complete_usage",
    ]
  );
  const usage = calls.find((call) => call.operation === "complete_usage")
    ?.input as {
    providerRequestId: string;
    inputUnits: number;
    outputUnits: number;
    estimatedCostUsd: number;
  };
  assert.equal(usage.providerRequestId, "msg_semantic,msg_synthesis");
  assert.equal(usage.inputUnits, 3_100);
  assert.equal(usage.outputUnits, 720);
  assert.equal(usage.estimatedCostUsd, 0.0067);
  assert.equal(
    (
      calls.find((call) => call.operation === "commit_credits")?.input as {
        resultReference: string;
      }
    ).resultReference,
    `working:${WORKING_ID}`
  );
  assert.doesNotMatch(
    JSON.stringify(calls.filter((call) => call.input)),
    /clarity before a decision|A ritual for clarity/
  );
});

test("completed retry reopens the exact working and never invokes either provider", async () => {
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
        readerCostUsd: 0.0065,
        readerBudgetUsd: 50,
      };
    },
  };

  const result = await executeMeteredWorking(
    { intention: "clarity before a decision", requestId: REQUEST_ID },
    {
      createServiceClient: () => ({}) as SupabaseClient,
      assemblePalette: async () => {
        throw new Error("provider must not run on replay");
      },
      replayWorking: async (reference, context) => {
        calls.push({ operation: "replay_working", input: reference });
        assert.equal(context.userId, USER_ID);
        return {
          id: WORKING_ID,
          createdAt: "2026-08-11T16:00:00.000Z",
          palette,
          ritual: "## A ritual for clarity",
          modelUsed: "claude-haiku-4-5",
        };
      },
      metering: metering(store),
    }
  );

  assert.equal(result.replayed, true);
  assert.equal(result.chargedCredits, 0);
  assert.equal(result.value.id, WORKING_ID);
  assert.deepEqual(
    calls.map((call) => call.operation),
    ["begin_request", "get_completed_result", "replay_working"]
  );
});
