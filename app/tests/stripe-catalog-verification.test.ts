import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  stripeModeFromKey,
  verifyOffer,
} from "../scripts/verify-stripe-prices";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const expectation = {
  code: "scholar_monthly" as const,
  environmentKey: "PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY" as const,
  amountCents: 3900,
} as const;
const product = { id: "prod_private", active: true };
const exactPrice = {
  id: "price_private",
  active: true,
  livemode: true,
  currency: "usd",
  unitAmount: 3900,
  type: "recurring",
  recurringInterval: "month",
  recurringIntervalCount: 1,
  recurringUsageType: "licensed",
  productId: product.id,
};

test("Stripe key mode is classified without returning key material", () => {
  assert.equal(stripeModeFromKey("sk_live_private"), "live");
  assert.equal(stripeModeFromKey("rk_test_private"), "test");
  assert.equal(stripeModeFromKey("unexpected"), "unknown");
});

test("missing configuration holds even when one exact candidate exists", () => {
  const result = verifyOffer(
    expectation,
    undefined,
    [exactPrice],
    new Map([[product.id, product]]),
    "live",
  );

  assert.equal(result.status, "missing_configuration");
  assert.equal(result.exactCandidateCount, 1);
  assert.equal(result.configuredPriceFingerprint, null);
  assert.doesNotMatch(JSON.stringify(result), /price_private|prod_private/);
});

test("configured Price passes only when every exact catalog check passes", () => {
  const verified = verifyOffer(
    expectation,
    exactPrice.id,
    [exactPrice],
    new Map([[product.id, product]]),
    "live",
  );
  const wrongAmount = verifyOffer(
    expectation,
    exactPrice.id,
    [{ ...exactPrice, unitAmount: 2900 }],
    new Map([[product.id, product]]),
    "live",
  );
  const wrongMode = verifyOffer(
    expectation,
    exactPrice.id,
    [exactPrice],
    new Map([[product.id, product]]),
    "test",
  );

  assert.equal(verified.status, "verified");
  assert.ok(verified.checks && Object.values(verified.checks).every(Boolean));
  assert.equal(wrongAmount.status, "configured_price_mismatch");
  assert.equal(wrongAmount.checks?.exactAmount, false);
  assert.equal(wrongMode.status, "configured_price_mismatch");
  assert.equal(wrongMode.checks?.modeMatchesAccountKey, false);
});

test("inactive product, archived Price, and non-monthly recurrence fail", () => {
  for (const [price, products] of [
    [exactPrice, new Map([[product.id, { ...product, active: false }]])],
    [{ ...exactPrice, active: false }, new Map([[product.id, product]])],
    [
      { ...exactPrice, recurringInterval: "year" },
      new Map([[product.id, product]]),
    ],
  ] as const) {
    const result = verifyOffer(
      expectation,
      exactPrice.id,
      [price],
      products,
      "live",
    );
    assert.equal(result.status, "configured_price_mismatch");
  }
});

test("unknown configured Price is represented only by a fingerprint", () => {
  const result = verifyOffer(
    expectation,
    "price_missing_private",
    [exactPrice],
    new Map([[product.id, product]]),
    "live",
  );

  assert.equal(result.status, "configured_price_not_found");
  assert.equal(result.configuredPriceFingerprint?.length, 12);
  assert.doesNotMatch(JSON.stringify(result), /price_missing_private/);
});

test("the executable is restricted to approved read-only Stripe resources", () => {
  const source = readFileSync(
    resolve(appRoot, "scripts/verify-stripe-prices.ts"),
    "utf8",
  );

  assert.match(source, /stripe\.accounts\.retrieve\(\)/);
  assert.match(source, /stripe\.products\.list\(/);
  assert.match(source, /stripe\.prices\.list\(/);
  assert.doesNotMatch(
    source,
    /stripe\.(?:customers|subscriptions|webhookEndpoints|checkout|invoices|paymentIntents)\./,
  );
  assert.deepEqual(
    [...source.matchAll(/stripe\.([A-Za-z]+)\.([A-Za-z]+)\(/g)]
      .map((match) => `${match[1]}.${match[2]}`)
      .sort(),
    ["accounts.retrieve", "prices.list", "products.list"],
  );
});
