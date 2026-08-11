import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Stripe from "stripe";

import {
  isExactMonthlyPrice,
  selectReusablePrice,
} from "../scripts/configure-stripe-membership-prices";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productId = "prod_private";
const exact = {
  id: "price_private",
  active: true,
  livemode: true,
  currency: "usd",
  unit_amount: 1900,
  type: "recurring",
  product: productId,
  recurring: {
    interval: "month",
    interval_count: 1,
    usage_type: "licensed",
  },
  lookup_key: "prismarium_student_standard_monthly_v1",
} as Stripe.Price;

test("exact monthly validation is closed on catalog mismatches", () => {
  assert.equal(isExactMonthlyPrice(exact, productId, 1900), true);
  assert.equal(isExactMonthlyPrice({ ...exact, livemode: false }, productId, 1900), false);
  assert.equal(isExactMonthlyPrice({ ...exact, active: false }, productId, 1900), false);
  assert.equal(isExactMonthlyPrice({ ...exact, unit_amount: 1800 }, productId, 1900), false);
  assert.equal(
    isExactMonthlyPrice(
      { ...exact, recurring: { ...exact.recurring!, interval: "year" } },
      productId,
      1900,
    ),
    false,
  );
});

test("an exact unique Price is reused and ambiguity blocks", () => {
  assert.equal(
    selectReusablePrice(
      [exact],
      productId,
      1900,
      "prismarium_student_standard_monthly_v1",
    )?.id,
    exact.id,
  );
  assert.throws(
    () =>
      selectReusablePrice(
        [exact, { ...exact, id: "price_second", lookup_key: null }],
        productId,
        1900,
        "missing_lookup_key",
      ),
    /ambiguous_exact_price_candidates/,
  );
});

test("configuration is restricted to approved Stripe resources", () => {
  const source = readFileSync(
    resolve(appRoot, "scripts/configure-stripe-membership-prices.ts"),
    "utf8",
  );
  assert.match(source, /stripe\.prices\.create\(/);
  assert.doesNotMatch(
    source,
    /stripe\.(?:customers|subscriptions|webhookEndpoints|checkout|invoices|paymentIntents)\./,
  );
  assert.deepEqual(
    [...source.matchAll(/stripe\.([A-Za-z]+)\.([A-Za-z]+)\(/g)]
      .map((match) => `${match[1]}.${match[2]}`)
      .sort(),
    ["accounts.retrieve", "prices.create", "prices.list", "products.list"],
  );
  assert.match(source, /--apply/);
  assert.match(source, /refusing_non_live_stripe_key/);
});
