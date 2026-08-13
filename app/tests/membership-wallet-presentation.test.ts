import assert from "node:assert/strict";
import test from "node:test";

import {
  formatUtcDateTime,
  parseSafeCreditWallet,
  parseSafeToolCosts,
} from "../src/lib/membership/membership-wallet-presentation";
import {
  nextUtcMonthBoundary,
  toolRunStateForCode,
} from "../src/lib/membership/metering-customer-presentation";

function wallet() {
  return {
    planCode: "student",
    paidCreditsActive: true,
    status: "current",
    availableCredits: 6,
    reservedCredits: 2,
    totalCredits: 8,
    grant: {
      planCode: "reader",
      grantedCredits: 10,
      validFrom: "2026-08-01T00:00:00.000Z",
      expiresAt: "2026-09-01T00:00:00.000Z",
      resetsAt: "2026-09-01T00:00:00.000Z",
    },
    pending: [
      {
        actionCode: "seven_lenses.standard",
        credits: 2,
        createdAt: "2026-08-12T12:00:00.000Z",
        expiresAt: "2026-08-12T12:05:00.000Z",
      },
    ],
    history: [
      {
        kind: "credit_reserved",
        credits: 2,
        availableAfter: 6,
        reservedAfter: 2,
        actionCode: "seven_lenses.standard",
        occurredAt: "2026-08-12T12:00:00.000Z",
      },
    ],
    asOf: "2026-08-12T12:01:00.000Z",
  };
}

const actions = [
  ["working.generate", "The Working", 1],
  ["seven_lenses.expand", "Expand one lens", 1],
  ["seven_lenses.standard", "Standard Seven Lenses synthesis", 2],
  ["seven_lenses.long", "Long Seven Lenses synthesis", 3],
  ["deep_search.fresh", "Fresh Deep Search synthesis", 3],
  ["image.generate", "Image generation", null],
] as const;

test("browser wallet parser accepts only the exact safe projection", () => {
  assert.deepEqual(parseSafeCreditWallet(wallet()), wallet());
  assert.equal(
    parseSafeCreditWallet({ ...wallet(), stripeCustomerId: "must-not-cross" }),
    null
  );
  assert.equal(parseSafeCreditWallet({ ...wallet(), totalCredits: 999 }), null);
  assert.equal(
    parseSafeCreditWallet({
      ...wallet(),
      planCode: "reader",
      paidCreditsActive: true,
    }),
    null
  );
  assert.equal(
    parseSafeCreditWallet({
      ...wallet(),
      pending: [{ ...wallet().pending[0], requestFingerprint: "secret" }],
    }),
    null
  );
});

test("tool-cost parser rejects missing, duplicate, extra, and malformed actions", () => {
  const value = {
    version: 1,
    actions: actions.map(([actionCode, customerLabel, creditCost]) => ({
      actionCode,
      customerLabel,
      creditCost,
      enabled: actionCode === "working.generate",
    })),
  };
  assert.deepEqual(parseSafeToolCosts(value), value);
  assert.equal(parseSafeToolCosts({ ...value, internalMode: "enforce" }), null);
  assert.equal(
    parseSafeToolCosts({ ...value, actions: value.actions.slice(1) }),
    null
  );
  assert.equal(
    parseSafeToolCosts({
      ...value,
      actions: [...value.actions.slice(0, -1), value.actions[0]],
    }),
    null
  );
});

test("customer lifecycle mapping distinguishes paid, return, retry, reconcile, capacity, and disabled states", () => {
  assert.equal(
    toolRunStateForCode("METERING_PAID_MEMBERSHIP_REQUIRED"),
    "paid_required"
  );
  assert.equal(toolRunStateForCode("METERING_PROVIDER_TIMEOUT"), "returned");
  assert.equal(toolRunStateForCode("METERING_REQUEST_IN_PROGRESS"), "retry");
  assert.equal(toolRunStateForCode("METERING_SETTLEMENT_FAILED"), "reconcile");
  assert.equal(
    toolRunStateForCode("READER_AI_CAPACITY_PAUSED"),
    "capacity_paused"
  );
  assert.equal(toolRunStateForCode("METERING_ACTION_OFF"), "disabled");
  assert.equal(toolRunStateForCode("METERING_INSUFFICIENT_CREDITS"), "idle");
});

test("displayed wallet dates use the next UTC boundary", () => {
  assert.equal(
    nextUtcMonthBoundary(new Date("2026-08-31T23:59:59.999Z")),
    "2026-09-01T00:00:00.000Z"
  );
  assert.match(
    formatUtcDateTime("2026-09-01T00:00:00.000Z"),
    /September 1, 2026.*12:00 AM UTC/
  );
});
