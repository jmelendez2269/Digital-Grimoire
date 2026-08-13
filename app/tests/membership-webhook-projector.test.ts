import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type Stripe from "stripe";

import {
  normalizeMembershipWebhookEvent,
  stripeLivemodeFromSecretKey,
  stripeWebhookPayloadSha256,
} from "../src/lib/membership/membership-webhook.server";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const userId = "11111111-1111-4111-8111-111111111111";
const environment = {
  PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY: "price_student15",
  PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY: "price_student19",
  PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY: "price_scholar39",
  PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY: "price_adept69",
};

function makeEvent(overrides: {
  type?: string;
  status?: string;
  priceId?: string;
  quantity?: number;
  itemCount?: number;
  periodStart?: number;
  periodEnd?: number;
  metadata?: Record<string, string>;
  livemode?: boolean;
} = {}): Stripe.Event {
  const item = {
    id: "si_membership",
    object: "subscription_item",
    quantity: overrides.quantity ?? 1,
    current_period_start: overrides.periodStart ?? 1_786_400_000,
    current_period_end: overrides.periodEnd ?? 1_789_078_400,
    price: { id: overrides.priceId ?? "price_student15", object: "price" },
  };
  return {
    id: "evt_membership001",
    object: "event",
    api_version: "2026-07-29.basil",
    created: 1_786_400_100,
    livemode: overrides.livemode ?? false,
    pending_webhooks: 1,
    request: null,
    type: overrides.type ?? "customer.subscription.updated",
    data: {
      object: {
        id: "sub_membership001",
        object: "subscription",
        customer: "cus_membership001",
        status: overrides.status ?? "active",
        cancel_at_period_end: false,
        metadata: overrides.metadata ?? {
          user_id: userId,
          offer_code: "student_founding_monthly",
        },
        items: {
          object: "list",
          data: Array.from({ length: overrides.itemCount ?? 1 }, () => ({ ...item })),
          has_more: false,
          url: "/v1/subscription_items",
        },
      },
    },
  } as unknown as Stripe.Event;
}

test("verified known Price normalizes to the exact founding membership", () => {
  const result = normalizeMembershipWebhookEvent(
    makeEvent(),
    "a".repeat(64),
    environment,
  );

  assert.equal(result.kind, "project");
  assert.equal(result.planCode, "student");
  assert.equal(result.offerCode, "student_founding_monthly");
  assert.equal(result.pricingCohort, "founding");
  assert.equal(result.stripeStatus, "active");
  assert.equal(result.userId, userId);
  assert.equal(result.stripeCustomerId, "cus_membership001");
  assert.equal(result.stripeSubscriptionId, "sub_membership001");
  assert.equal(result.cancelAtPeriodEnd, false);
});

test("unknown Price quarantines instead of inferring a paid plan", () => {
  const result = normalizeMembershipWebhookEvent(
    makeEvent({ priceId: "price_not_in_catalog" }),
    "b".repeat(64),
    environment,
  );
  assert.equal(result.kind, "quarantine");
  assert.equal(result.errorCode, "UNKNOWN_SUBSCRIPTION_PRICE");
  assert.equal(result.planCode, null);
});

test("ambiguous items, quantity, periods, and status all quarantine", () => {
  const cases = [
    makeEvent({ itemCount: 2 }),
    makeEvent({ quantity: 2 }),
    makeEvent({ periodEnd: 1_786_399_999 }),
    makeEvent({ status: "future_status" }),
  ];
  for (const fixture of cases) {
    assert.equal(
      normalizeMembershipWebhookEvent(fixture, "c".repeat(64), environment).kind,
      "quarantine",
    );
  }
});

test("deleted event projects only Stripe's canceled terminal status", () => {
  const canceled = normalizeMembershipWebhookEvent(
    makeEvent({ type: "customer.subscription.deleted", status: "canceled" }),
    "d".repeat(64),
    environment,
  );
  const inconsistent = normalizeMembershipWebhookEvent(
    makeEvent({ type: "customer.subscription.deleted", status: "active" }),
    "e".repeat(64),
    environment,
  );
  assert.equal(canceled.kind, "project");
  assert.equal(canceled.stripeStatus, "canceled");
  assert.equal(inconsistent.kind, "quarantine");
  assert.equal(
    normalizeMembershipWebhookEvent(
      makeEvent({
        type: "customer.subscription.deleted",
        status: "canceled",
        priceId: "price_unknown_deleted",
      }),
      "9".repeat(64),
      environment,
    ).errorCode,
    "UNKNOWN_SUBSCRIPTION_PRICE",
  );
});

test("unprojected event type is explicitly ignored", () => {
  const result = normalizeMembershipWebhookEvent(
    makeEvent({ type: "invoice.paid" }),
    "f".repeat(64),
    environment,
  );
  assert.equal(result.kind, "ignore");
  assert.equal(result.errorCode, "EVENT_TYPE_NOT_PROJECTED");
  const refund = normalizeMembershipWebhookEvent(
    makeEvent({ type: "charge.refunded" }),
    "8".repeat(64),
    environment,
  );
  assert.equal(refund.kind, "ignore");
  assert.equal(refund.planCode, null);
});

test("secret mode and raw payload hash helpers are deterministic", () => {
  assert.equal(stripeLivemodeFromSecretKey("sk_live_example"), true);
  assert.equal(stripeLivemodeFromSecretKey("rk_test_example"), false);
  assert.equal(stripeLivemodeFromSecretKey("whsec_example"), null);
  assert.equal(
    stripeWebhookPayloadSha256("exact raw body"),
    "205847af662805a5da88704f518daa70e240c28c0c39dff30345f0d240eefcd7",
  );
});

test("route verifies raw signature before creating database authority", () => {
  const source = readFileSync(
    resolve(appRoot, "src/app/api/stripe/webhook/route.ts"),
    "utf8",
  );
  const verifyAt = source.indexOf("webhooks.constructEvent(");
  const databaseAt = source.indexOf("createServiceClient()");
  assert.match(source, /const rawBody = await request\.text\(\)/);
  assert.match(source, /request\.headers\.get\("stripe-signature"\)/);
  assert.ok(verifyAt >= 0 && databaseAt > verifyAt);
  assert.doesNotMatch(source, /request\.json\(/);
  assert.doesNotMatch(source, /stripe\.(?:subscriptions|customers)\./);
  assert.doesNotMatch(source, /\.from\(["']users["']\)/);
});

test("route has one atomic projector RPC and retries database failures", () => {
  const source = readFileSync(
    resolve(appRoot, "src/app/api/stripe/webhook/route.ts"),
    "utf8",
  );
  assert.equal((source.match(/\.rpc\(/g) ?? []).length, 1);
  assert.match(source, /\.rpc\(\s*"process_billing_webhook_event"/);
  assert.match(source, /WEBHOOK_DATABASE_PROCESSING_FAILED/);
  assert.match(source, /WEBHOOK_PROCESSING_FAILED/);
  assert.match(source, /\},\s*500,?\s*\)/);
  assert.doesNotMatch(source, /console\.(?:log|info|error)\([^)]*(?:eventId|userId|customerId|subscriptionId)/);
});
