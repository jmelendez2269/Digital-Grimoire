import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalJson,
  exactAsciiStringForCanonicalBytes,
  modelMonthlyTierEconomics,
  scheduleForStudyBatch,
  summarizeStudySchedule,
} from "../src/lib/membership/lean-l5-04-shadow-study";

const defaultWeights = {
  scientific: 30,
  psychological: 30,
  philosophical: 30,
  religious_spiritual: 30,
  historical_anthropological: 30,
  symbolic_occult: 30,
  mathematical: 30,
};

test("three-batch schedule predeclares 30 successes and at least seven per action", () => {
  const totals = summarizeStudySchedule();
  assert.equal(Object.values(totals).reduce((sum, count) => sum + count, 0), 30);
  assert.deepEqual(totals, {
    "working.generate": 8,
    "seven_lenses.expand": 7,
    "seven_lenses.standard": 8,
    "seven_lenses.long": 7,
  });
  for (let batch = 1; batch <= 3; batch += 1) {
    assert.equal(new Set(scheduleForStudyBatch(batch).map((run) => run.accountOffset)).size, 3);
  }
  assert.deepEqual([1, 2, 3].map((batch) => scheduleForStudyBatch(batch).length), [5, 13, 12]);
});

test("schedule includes default and exact-maximum cases without counting failures", () => {
  const runs = Array.from({ length: 3 }, (_, index) => scheduleForStudyBatch(index + 1)).flat();
  for (const actionCode of [
    "working.generate",
    "seven_lenses.standard",
    "seven_lenses.long",
  ] as const) {
    assert.ok(runs.some((run) => run.actionCode === actionCode && run.inputProfile === "default"));
    assert.ok(runs.some((run) => run.actionCode === actionCode && run.inputProfile === "maximum"));
  }
  assert.ok(runs.some((run) =>
    run.actionCode === "seven_lenses.expand" &&
    run.inputProfile === "maximum-derived-parent",
  ));
});

test("maximum inputs exactly meet the server canonical-byte limits", () => {
  const intention = exactAsciiStringForCanonicalBytes({
    prefix: "clarity ",
    maxBytes: 4_000,
    buildValue: (value) => ({ intention: value }),
  });
  assert.equal(Buffer.byteLength(canonicalJson({ intention }), "utf8"), 4_000);

  const query = exactAsciiStringForCanonicalBytes({
    prefix: "Examine this synthetic maximum-size question: ",
    maxBytes: 16_000,
    buildValue: (value) => ({
      query: value,
      lensWeights: defaultWeights,
      responseLength: "medium",
    }),
  });
  assert.equal(Buffer.byteLength(canonicalJson({
    query,
    lensWeights: defaultWeights,
    responseLength: "medium",
  }), "utf8"), 16_000);
});

test("tier model combines current US card and Billing fees", () => {
  const modeled = modelMonthlyTierEconomics({
    monthlyPriceUsd: 15,
    providerCostUsd: 2.25,
    marginalInfrastructureUsd: 0.25,
  });
  assert.ok(Math.abs(modeled.paymentFeesUsd - 0.84) < 1e-12);
  assert.equal(modeled.providerCostShare, 0.15);
  assert.ok(Math.abs(modeled.contributionMargin - 0.7773333333333333) < 1e-12);
});
