import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type Stripe from "stripe";

import {
  BillingOperationError,
  assertSafePortalConfiguration,
  billingOperationsEnabled,
  billingSummaryFromProjection,
  createMembershipPortalSession,
  reconcileMembershipSubscription,
  type BillingMembershipProjection,
  type MembershipPortalDependencies,
} from "../src/lib/membership/membership-billing.server";
import { normalizeMembershipSubscriptionSnapshot } from "../src/lib/membership/membership-webhook.server";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const userId = "11111111-1111-4111-8111-111111111111";
const environment = {
  PRISMARIUM_BILLING_OPERATIONS_ENABLED: "true",
  PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID: "bpc_leanSafe",
  PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY: "price_student15",
  PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY: "price_student19",
  PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY: "price_scholar39",
  PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY: "price_adept69",
};

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function projection(
  overrides: Partial<BillingMembershipProjection> = {},
): BillingMembershipProjection {
  return {
    user_id: userId,
    plan_code: "student",
    stripe_status: "active",
    pricing_cohort: "founding",
    offer_code: "student_founding_monthly",
    billing_interval: "month",
    stripe_customer_id: "cus_LeanL206",
    stripe_subscription_id: "sub_LeanL206",
    current_period_start: "2026-08-01T00:00:00.000Z",
    current_period_end: "2026-09-01T00:00:00.000Z",
    cancel_at_period_end: false,
    access_until: "2026-09-01T00:00:00.000Z",
    billing_hold: false,
    ...overrides,
  };
}

function subscription(overrides: {
  status?: Stripe.Subscription.Status;
  cancelAtPeriodEnd?: boolean;
  priceId?: string;
  periodStart?: number;
  periodEnd?: number;
  userId?: string;
  customerId?: string;
  subscriptionId?: string;
} = {}): Stripe.Subscription {
  return {
    id: overrides.subscriptionId ?? "sub_LeanL206",
    object: "subscription",
    customer: overrides.customerId ?? "cus_LeanL206",
    status: overrides.status ?? "active",
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    metadata: {
      user_id: overrides.userId ?? userId,
      offer_code: "student_founding_monthly",
    },
    items: {
      object: "list",
      data: [
        {
          id: "si_LeanL206",
          object: "subscription_item",
          quantity: 1,
          current_period_start: overrides.periodStart ?? 1_785_542_400,
          current_period_end: overrides.periodEnd ?? 1_788_220_800,
          price: { id: overrides.priceId ?? "price_student15", object: "price" },
        },
      ],
      has_more: false,
      url: "/v1/subscription_items",
    },
  } as unknown as Stripe.Subscription;
}

function code(error: unknown): string | undefined {
  return error instanceof BillingOperationError ? error.code : undefined;
}

test("billing operations are exact and default closed", () => {
  assert.equal(billingOperationsEnabled({}), false);
  assert.equal(
    billingOperationsEnabled({ PRISMARIUM_BILLING_OPERATIONS_ENABLED: "TRUE" }),
    false,
  );
  assert.equal(billingOperationsEnabled(environment), true);
});

test("billing summary is customer-safe and terminal state cannot grant access", () => {
  const active = billingSummaryFromProjection(
    projection(),
    environment,
    new Date("2026-08-15T00:00:00Z"),
  );
  assert.equal(active.planCode, "student");
  assert.equal(active.amountCents, 1500);
  assert.equal(active.pricingCohort, "founding");
  assert.equal(active.paidEntitlementsActive, true);
  assert.equal(active.portalAvailable, true);
  assert.doesNotMatch(JSON.stringify(active), /cus_|sub_|price_/);

  const terminal = billingSummaryFromProjection(
    projection({ stripe_status: "canceled" }),
    environment,
    new Date("2026-08-15T00:00:00Z"),
  );
  assert.equal(terminal.paidEntitlementsActive, false);
  assert.equal(terminal.planCode, "student");
});

test("founding renewal, cancellation scheduling, and reactivation retain exact $15 cohort", () => {
  const cases = [
    subscription({
      periodStart: 1_788_220_800,
      periodEnd: 1_790_899_200,
    }),
    subscription({ cancelAtPeriodEnd: true }),
    subscription({ cancelAtPeriodEnd: false }),
  ];
  for (const value of cases) {
    const normalized = normalizeMembershipSubscriptionSnapshot(value, environment);
    assert.equal(normalized.kind, "project");
    assert.equal(normalized.offerCode, "student_founding_monthly");
    assert.equal(normalized.pricingCohort, "founding");
    assert.equal(normalized.planCode, "student");
  }
  assert.equal(
    normalizeMembershipSubscriptionSnapshot(cases[1], environment)
      .cancelAtPeriodEnd,
    true,
  );
});

test("portal requires invoices, payment methods, cancellation, and disabled switching", async () => {
  const safeConfiguration = {
    id: "bpc_leanSafe",
    active: true,
    features: {
      customer_update: { enabled: false },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true },
      subscription_pause: { enabled: false },
      subscription_update: { enabled: false },
    },
  };
  assert.doesNotThrow(() =>
    assertSafePortalConfiguration(safeConfiguration, "bpc_leanSafe"),
  );
  assert.throws(
    () =>
      assertSafePortalConfiguration(
        {
          ...safeConfiguration,
          features: {
            ...safeConfiguration.features,
            subscription_update: { enabled: true },
          },
        },
        "bpc_leanSafe",
      ),
    (error) => code(error) === "BILLING_PORTAL_CONFIGURATION_UNSAFE",
  );

  let created = 0;
  const dependencies: MembershipPortalDependencies = {
    environment,
    loadMembership: async () => projection(),
    retrievePortalConfiguration: async () => safeConfiguration,
    async createPortalSession(input) {
      created += 1;
      assert.equal(input.customerId, "cus_LeanL206");
      assert.equal(input.configurationId, "bpc_leanSafe");
      return { url: "https://billing.stripe.com/p/session/lean" };
    },
    returnUrl: "https://prismarium.example/profile?tab=subscription",
  };
  const result = await createMembershipPortalSession(userId, dependencies);
  assert.equal(result.url, "https://billing.stripe.com/p/session/lean");
  assert.equal(created, 1);
});

test("disabled portal stops before membership or Stripe work", async () => {
  let called = false;
  await assert.rejects(
    createMembershipPortalSession(userId, {
      environment: {},
      loadMembership: async () => {
        called = true;
        return projection();
      },
      retrievePortalConfiguration: async () => {
        throw new Error("must not run");
      },
      createPortalSession: async () => {
        throw new Error("must not run");
      },
      returnUrl: "https://prismarium.example/profile",
    }),
    (error) => code(error) === "BILLING_OPERATIONS_UNAVAILABLE",
  );
  assert.equal(called, false);
});

test("reconciliation retrieves only the bound Subscription and projects exact state", async () => {
  let retrieved: string | null = null;
  let appliedKind: string | null = null;
  const result = await reconcileMembershipSubscription(userId, {
    environment,
    loadMembership: async () => projection(),
    retrieveSubscription: async (subscriptionId) => {
      retrieved = subscriptionId;
      return subscription({ cancelAtPeriodEnd: true });
    },
    async applySnapshot(input) {
      appliedKind = input.snapshot.kind;
      assert.equal(input.userId, userId);
      assert.equal(input.snapshot.cancelAtPeriodEnd, true);
      assert.match(input.snapshotSha256, /^[a-f0-9]{64}$/);
      return "updated";
    },
    now: () => new Date("2026-08-11T12:00:00Z"),
    requestId: () => "22222222-2222-4222-8222-222222222222",
  });
  assert.equal(retrieved, "sub_LeanL206");
  assert.equal(appliedKind, "project");
  assert.equal(result.disposition, "updated");

  let checkoutReturnRetrieved = false;
  await assert.rejects(
    reconcileMembershipSubscription(userId, {
      environment,
      loadMembership: async () => null,
      retrieveSubscription: async () => {
        checkoutReturnRetrieved = true;
        return subscription();
      },
      applySnapshot: async () => "updated",
    }),
    (error) => code(error) === "BILLING_MEMBERSHIP_UNAVAILABLE",
  );
  assert.equal(checkoutReturnRetrieved, false);
});

test("reconciliation identity mismatch is held through quarantine", async () => {
  let appliedKind: string | null = null;
  await assert.rejects(
    reconcileMembershipSubscription(userId, {
      environment,
      loadMembership: async () => projection(),
      retrieveSubscription: async () =>
        subscription({ customerId: "cus_OtherCustomer" }),
      async applySnapshot(input) {
        appliedKind = input.snapshot.kind;
        assert.equal(
          input.snapshot.errorCode,
          "RECONCILIATION_IDENTITY_MISMATCH",
        );
        return "quarantined";
      },
      requestId: () => "22222222-2222-4222-8222-222222222222",
    }),
    (error) => code(error) === "BILLING_RECONCILIATION_QUARANTINED",
  );
  assert.equal(appliedKind, "quarantine");
});

test("routes and migration keep Checkout return, Stripe IDs, and Journal work contained", () => {
  const checkout = readSource("src/lib/membership/membership-checkout.server.ts");
  const summary = readSource("src/app/api/membership/billing-summary/route.ts");
  const reconcile = readSource("src/app/api/stripe/sync-subscription/route.ts");
  const portal = readSource("src/app/api/stripe/create-portal-session/route.ts");
  const billing = readSource(
    "src/lib/membership/membership-billing.server.ts",
  );
  const migration = readSource(
    "../supabase/migrations/20260811230000_lean_l2_06_billing_lifecycle.sql",
  );

  assert.match(checkout, /checkout=success/);
  assert.doesNotMatch(checkout, /session_id=/);
  assert.doesNotMatch(summary, /stripe_customer_id[\s\S]*jsonResponse\(\{\s*stripe/);
  assert.match(reconcile, /stripe\.subscriptions\.retrieve\(subscriptionId\)/);
  assert.doesNotMatch(reconcile, /stripe\.(?:customers|checkout\.sessions)\./);
  assert.match(reconcile, /reconcile_billing_membership_snapshot_v1/);
  assert.match(portal, /billingPortal\.configurations\.retrieve/);
  assert.match(portal, /billingPortal\.sessions\.create/);
  assert.doesNotMatch(portal, /\.from\(["']users["']\)/);
  assert.match(billing, /subscription_update/);
  assert.match(migration, /billing_memberships as membership/);
  assert.doesNotMatch(
    migration,
    /delete from public\.journal_pages|update public\.journal_pages\s+set is_archived/,
  );
  assert.match(migration, /alter table public\.billing_reconciliation_requests force row level security/);
  assert.match(migration, /STALE_AFTER_RECONCILIATION/);
});
