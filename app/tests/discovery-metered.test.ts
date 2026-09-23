import assert from "node:assert/strict";
import test from "node:test";
import {
  executeMeteredDiscovery,
  discoveryUsage,
} from "../src/lib/discovery/metered.server";
import {
  MeteringError,
  type MeteringDependencies,
} from "../src/lib/membership/metering-adapter.server";
import type { MeteringStore } from "../src/lib/membership/metering-store.server";
import type { DiscoveryResult, DiscoveryRun } from "../src/lib/discovery/model";

const owner = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const rowId = "33333333-3333-4333-8333-333333333333";
function fixture() {
  const calls: string[] = [];
  const result: DiscoveryResult = {
    overview: [
      {
        title: "Evidence",
        explanation: "A source-backed explanation.",
        evidence: [
          { sourceId: "S1", quote: "A genuine source quotation goes here." },
        ],
      },
    ],
    connections: [],
    nextQuestions: [],
    gaps: [],
    sources: [],
    searched: [],
    warnings: [],
    usage: [
      {
        model: "fixture",
        tokens: 130,
        inputTokens: 100,
        outputTokens: 30,
        cost: 0.18,
        requestId: "gen-test",
      },
    ],
  };
  const run: DiscoveryRun = {
    id,
    root_id: id,
    parent_id: null,
    question: "What is transformation?",
    status: "complete",
    error: null,
    result,
  };
  const mutation = {
    code: "reserved",
    reservationId: rowId,
    state: "pending",
    availableCredits: 27,
    reservedCredits: 3,
  };
  const store: MeteringStore = {
    async beginRequest(input) {
      calls.push("begin");
      assert.equal(input.quote.creditCost, 3);
      return {
        code: "started",
        meteringRequestId: rowId,
        state: "pending",
        readerCostUsd: 0,
        readerBudgetUsd: 50,
      };
    },
    async getCompletedResultReference() {
      return `discovery:${id}`;
    },
    async reserveCredits(input) {
      calls.push("reserve");
      assert.equal(input.quotedCredits, 3);
      return mutation;
    },
    async attachCreditReservation() {
      calls.push("attach");
    },
    async beginUsageAttempt() {
      calls.push("usage");
      return rowId;
    },
    async completeUsageAttempt(input) {
      calls.push(`usage:${input.outcome}`);
    },
    async commitCredits(input) {
      calls.push("commit");
      assert.equal(input.resultReference, `discovery:${id}`);
      return { ...mutation, code: "committed" };
    },
    async releaseCredits() {
      calls.push("refund");
      return { ...mutation, code: "released" };
    },
    async completeRequest(input) {
      calls.push(`finish:${input.outcome}`);
    },
    async releaseRequest() {
      calls.push("release-request");
    },
  };
  const metering: MeteringDependencies = {
    environment: { PRISMARIUM_METERING_MODE: "enforce" },
    store,
    authenticate: async () => ({
      id: owner,
      emailConfirmedAt: "2026-09-01T00:00:00Z",
    }),
    resolveEntitlement: async () => ({
      planCode: "student",
      monthlyCredits: 30,
      paidEntitlementsActive: true,
      failClosed: false,
      reason: "active_membership",
      course: { slug: null, entitled: false, source: "not_allowlisted" },
    }),
  };
  const work = {
    usage: result.usage,
    signal: new AbortController().signal,
    generate: async () => {
      calls.push("generate");
      return result;
    },
    persist: async (_result: DiscoveryResult, user: string) => {
      calls.push("persist");
      assert.equal(user, owner);
      return run;
    },
    replay: async (_id: string, user: string) => {
      calls.push("replay");
      assert.equal(user, owner);
      return run;
    },
  };
  return { calls, store, metering, work, result };
}
const input = { id, question: "What is transformation?" };

for (const parentId of [undefined, rowId])
  test(`investigation ${parentId ? "follow-up" : "root"} charges 3 only after saving`, async () => {
    const f = fixture();
    const result = await executeMeteredDiscovery(
      { ...input, parentId },
      f.work,
      f.metering
    );
    assert.equal(result.chargedCredits, 3);
    assert.ok(f.calls.indexOf("reserve") < f.calls.indexOf("generate"));
    assert.ok(f.calls.indexOf("persist") < f.calls.indexOf("commit"));
    assert.equal(f.calls.filter((c) => c === "commit").length, 1);
  });

test("same request reopens its result with no provider call or second charge", async () => {
  const f = fixture();
  f.store.beginRequest = async () => ({
    code: "duplicate_completed",
    meteringRequestId: rowId,
    state: "completed",
    readerCostUsd: 0,
    readerBudgetUsd: 50,
  });
  const result = await executeMeteredDiscovery(input, f.work, f.metering);
  assert.equal(result.chargedCredits, 0);
  assert.deepEqual(f.calls, ["replay"]);
});

for (const failure of ["provider", "empty", "persistence", "timeout"])
  test(`${failure} failure returns the reservation`, async () => {
    const f = fixture();
    if (failure === "provider" || failure === "timeout")
      f.work.generate = async () => {
        throw new Error("unavailable");
      };
    if (failure === "timeout")
      f.work.signal = AbortSignal.abort(
        new DOMException("deadline", "TimeoutError")
      );
    if (failure === "empty") f.result.overview = [];
    if (failure === "persistence")
      f.work.persist = async () => {
        throw new Error("database unavailable");
      };
    await assert.rejects(
      executeMeteredDiscovery(input, f.work, f.metering),
      MeteringError
    );
    assert.ok(f.calls.includes("refund"));
    assert.ok(!f.calls.includes("commit"));
  });

test("insufficient balance prevents provider work", async () => {
  const f = fixture();
  f.store.reserveCredits = async () => ({
    code: "insufficient_credits",
    reservationId: null,
    state: null,
    availableCredits: 2,
    reservedCredits: 0,
  });
  await assert.rejects(
    executeMeteredDiscovery(input, f.work, f.metering),
    (error: unknown) =>
      error instanceof MeteringError &&
      error.code === "METERING_INSUFFICIENT_CREDITS"
  );
  assert.ok(!f.calls.includes("generate"));
});

test("settlement trouble preserves the saved result without a refund or regeneration", async () => {
  const f = fixture();
  f.store.commitCredits = async () => {
    throw new Error("unavailable");
  };
  await assert.rejects(
    executeMeteredDiscovery(input, f.work, f.metering),
    (error: unknown) =>
      error instanceof MeteringError &&
      error.code === "METERING_SETTLEMENT_FAILED"
  );
  assert.ok(f.calls.includes("persist"));
  assert.ok(!f.calls.includes("refund"));
});

test("usage records reported costs and conservatively accounts for incomplete runs", () => {
  const f = fixture();
  assert.equal(discoveryUsage(f.result.usage).estimatedCostUsd, 0.18);
  assert.equal(discoveryUsage(f.result.usage, true).estimatedCostUsd, 0.3);
  assert.equal(
    discoveryUsage([{ ...f.result.usage[0], cost: null }]).estimatedCostUsd,
    0.3
  );
});

test("multi-call usage fits the wallet reference limit without losing total cost", () => {
  const calls = Array.from({ length: 6 }, (_, index) => ({ model: "fixture", tokens: 100, cost: 0.02, requestId: `gen-${index}-${"x".repeat(50)}` }));
  const usage = discoveryUsage(calls);
  assert.equal(usage.providerRequestId, calls[0].requestId);
  assert.equal(usage.inputUnits, 600);
  assert.ok(Math.abs(usage.estimatedCostUsd - 0.12) < 0.00001);
});
