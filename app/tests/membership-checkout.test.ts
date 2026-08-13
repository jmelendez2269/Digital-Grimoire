import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MembershipCheckoutError,
  checkoutCustomerForProjection,
  createMembershipCheckout,
  parseMembershipCheckoutRequest,
  type CheckoutRequestRecord,
  type MembershipCheckoutDependencies,
} from "../src/lib/membership/membership-checkout.server";
import {
  getSafeMembershipCatalog,
  resolveMembershipCanaryCheckoutOfferForUser,
  resolveMembershipCheckoutOffer,
} from "../src/lib/membership/membership-catalog.server";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const userId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";
const environment = {
  PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS: "checkout",
  PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS: "price_student15,price_scholar39",
  PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED: "true",
  PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS:
    "student_founding_monthly,scholar_monthly",
  PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS:
    "c01-how-humans-know-what-they-know",
  PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG:
    "c01-how-humans-know-what-they-know",
  PRISMARIUM_ADEPT_LAUNCH_DECISION: "hold",
  PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY: "price_student15",
  PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY: "price_student19",
  PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY: "price_scholar39",
  PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY: "price_adept69",
};
const canaryEnvironment = {
  ...environment,
  PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED: "false",
  PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS: "",
  PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS: "",
  PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG: "",
  PRISMARIUM_MEMBERSHIP_CANARY_ENABLED: "true",
  PRISMARIUM_MEMBERSHIP_CANARY_USER_IDS: userId,
  PRISMARIUM_MEMBERSHIP_CANARY_OFFERS: "student_founding_monthly",
};

function errorCode(error: unknown): string | undefined {
  return error instanceof MembershipCheckoutError ? error.code : undefined;
}

function makeDependencies(overrides: {
  membership?: MembershipCheckoutDependencies["loadMembership"];
} = {}) {
  const records = new Map<string, CheckoutRequestRecord>();
  const stripeSessions = new Map<string, { id: string; url: string }>();
  let stripeCreateCalls = 0;
  const dependencies: MembershipCheckoutDependencies = {
    environment,
    appUrl: "https://prismarium.example/",
    loadMembership: overrides.membership ?? (async () => null),
    async reserveRequest(input) {
      const key = `${input.userId}:${input.requestId}`;
      const existing = records.get(key);
      if (existing) return { inserted: false, record: { ...existing } };
      const record: CheckoutRequestRecord = {
        request_fingerprint: input.requestFingerprint,
        state: "pending",
        stripe_checkout_session_id: null,
        checkout_url: null,
      };
      records.set(key, record);
      return { inserted: true, record: { ...record } };
    },
    async completeRequest(input) {
      records.set(`${input.userId}:${input.requestId}`, {
        request_fingerprint: input.requestFingerprint,
        state: "session_created",
        stripe_checkout_session_id: input.sessionId,
        checkout_url: input.checkoutUrl,
      });
    },
    async createSession(input) {
      stripeCreateCalls += 1;
      const existing = stripeSessions.get(input.idempotencyKey);
      if (existing) return existing;
      const session = {
        id: "cs_test_singleSession",
        url: "https://checkout.stripe.com/c/pay/cs_test_singleSession",
      };
      stripeSessions.set(input.idempotencyKey, session);
      return session;
    },
  };
  return {
    dependencies,
    getStripeCreateCalls: () => stripeCreateCalls,
    getStripeSessionCount: () => stripeSessions.size,
  };
}

test("request contract accepts only offerCode and UUIDv4 requestId", () => {
  assert.deepEqual(
    parseMembershipCheckoutRequest({
      offerCode: "student_founding_monthly",
      requestId: requestId.toUpperCase(),
    }),
    { offerCode: "student_founding_monthly", requestId },
  );

  for (const forged of [
    { offerCode: "student_founding_monthly", requestId, priceId: "price_forged" },
    { offerCode: "student_founding_monthly", requestId, amount: 1 },
    { offerCode: "student_founding_monthly", requestId, mode: "payment" },
    { offerCode: "student_founding_monthly", requestId, tier: "adept" },
    { offerCode: "student_founding_monthly", requestId: "not-a-uuid" },
    ["student_founding_monthly", requestId],
  ]) {
    assert.throws(
      () => parseMembershipCheckoutRequest(forged),
      (error) => errorCode(error) === "INVALID_CHECKOUT_REQUEST",
    );
  }
});

test("server catalog resolves only an enabled launch offer to a Price", () => {
  assert.equal(
    resolveMembershipCheckoutOffer("student_founding_monthly", environment)
      ?.stripePriceId,
    "price_student15",
  );
  assert.equal(
    resolveMembershipCheckoutOffer("scholar_monthly", environment)?.stripePriceId,
    "price_scholar39",
  );
  assert.equal(
    resolveMembershipCheckoutOffer("student_standard_monthly", environment),
    null,
  );
  assert.equal(resolveMembershipCheckoutOffer("adept_monthly", environment), null);
  assert.equal(resolveMembershipCheckoutOffer("student_founding_monthly", {}), null);
});

test("one exact non-admin canary resolves only the founding offer while public sales stay closed", () => {
  const safeCatalog = getSafeMembershipCatalog(canaryEnvironment);
  assert.equal(safeCatalog.launch.paidSalesEnabled, false);
  assert.equal(
    safeCatalog.offers.some((offer) => offer.publiclyAvailable),
    false,
  );

  assert.equal(
    resolveMembershipCanaryCheckoutOfferForUser(
      "student_founding_monthly",
      userId,
      "user",
      canaryEnvironment,
    )?.stripePriceId,
    "price_student15",
  );
  assert.equal(
    resolveMembershipCanaryCheckoutOfferForUser(
      "scholar_monthly",
      userId,
      "user",
      canaryEnvironment,
    ),
    null,
  );
});

test("malformed, broader, non-canary, and admin canary configuration fails closed", async () => {
  const invalidEnvironments = [
    {
      ...canaryEnvironment,
      PRISMARIUM_MEMBERSHIP_CANARY_USER_IDS:
        `${userId},33333333-3333-4333-8333-333333333333`,
    },
    {
      ...canaryEnvironment,
      PRISMARIUM_MEMBERSHIP_CANARY_USER_IDS: `${userId},${userId}`,
    },
    {
      ...canaryEnvironment,
      PRISMARIUM_MEMBERSHIP_CANARY_OFFERS:
        "student_founding_monthly,scholar_monthly",
    },
    {
      ...canaryEnvironment,
      PRISMARIUM_MEMBERSHIP_CANARY_ENABLED: "TRUE",
    },
  ];

  for (const candidate of invalidEnvironments) {
    assert.equal(
      resolveMembershipCanaryCheckoutOfferForUser(
        "student_founding_monthly",
        userId,
        "user",
        candidate,
      ),
      null,
    );
  }
  assert.equal(
    resolveMembershipCanaryCheckoutOfferForUser(
      "student_founding_monthly",
      "33333333-3333-4333-8333-333333333333",
      "user",
      canaryEnvironment,
    ),
    null,
  );
  assert.equal(
    resolveMembershipCanaryCheckoutOfferForUser(
      "student_founding_monthly",
      userId,
      "admin",
      canaryEnvironment,
    ),
    null,
  );

  for (const candidate of [
    canaryEnvironment,
    { ...canaryEnvironment, PRISMARIUM_MEMBERSHIP_CANARY_USER_IDS: "not-a-uuid" },
  ]) {
    let touched = false;
    const fixture = makeDependencies();
    fixture.dependencies.environment = candidate;
    fixture.dependencies.loadMembership = async () => {
      touched = true;
      return null;
    };
    const candidateUserId =
      candidate === canaryEnvironment
        ? "33333333-3333-4333-8333-333333333333"
        : userId;
    await assert.rejects(
      createMembershipCheckout(
        {
          userId: candidateUserId,
          userEmail: "reader@example.invalid",
          userRole: "user",
          request: { offerCode: "student_founding_monthly", requestId },
        },
        fixture.dependencies,
      ),
      (error) => errorCode(error) === "CHECKOUT_UNAVAILABLE",
    );
    assert.equal(touched, false);
    assert.equal(fixture.getStripeCreateCalls(), 0);
  }
});

test("the exact canary reaches one idempotent Checkout path without public sales", async () => {
  const fixture = makeDependencies();
  fixture.dependencies.environment = canaryEnvironment;
  const result = await createMembershipCheckout(
    {
      userId,
      userEmail: "reader@example.invalid",
      userRole: "user",
      request: { offerCode: "student_founding_monthly", requestId },
    },
    fixture.dependencies,
  );

  assert.equal(result.replayed, false);
  assert.equal(fixture.getStripeCreateCalls(), 1);
  assert.equal(fixture.getStripeSessionCount(), 1);
});

test("sequential replay returns one Checkout Session", async () => {
  const fixture = makeDependencies();
  const input = {
    userId,
    userEmail: "reader@example.invalid",
    userRole: "user",
    request: { offerCode: "student_founding_monthly" as const, requestId },
  };
  const first = await createMembershipCheckout(input, fixture.dependencies);
  const replay = await createMembershipCheckout(input, fixture.dependencies);

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(first.sessionId, replay.sessionId);
  assert.equal(first.url, replay.url);
  assert.equal(fixture.getStripeCreateCalls(), 1);
  assert.equal(fixture.getStripeSessionCount(), 1);
});

test("concurrent replay uses one Stripe idempotency identity", async () => {
  const fixture = makeDependencies();
  const input = {
    userId,
    userEmail: "reader@example.invalid",
    userRole: "user",
    request: { offerCode: "student_founding_monthly" as const, requestId },
  };
  const [first, second] = await Promise.all([
    createMembershipCheckout(input, fixture.dependencies),
    createMembershipCheckout(input, fixture.dependencies),
  ]);

  assert.equal(first.sessionId, second.sessionId);
  assert.equal(fixture.getStripeCreateCalls(), 2);
  assert.equal(fixture.getStripeSessionCount(), 1);
});

test("same user/request ID cannot be rebound to another offer", async () => {
  const fixture = makeDependencies();
  await createMembershipCheckout(
    {
      userId,
      userEmail: "reader@example.invalid",
      userRole: "user",
      request: { offerCode: "student_founding_monthly", requestId },
    },
    fixture.dependencies,
  );

  await assert.rejects(
    createMembershipCheckout(
      {
        userId,
        userEmail: "reader@example.invalid",
        userRole: "user",
        request: { offerCode: "scholar_monthly", requestId },
      },
      fixture.dependencies,
    ),
    (error) => errorCode(error) === "CHECKOUT_REQUEST_CONFLICT",
  );
  assert.equal(fixture.getStripeSessionCount(), 1);
});

test("existing paid or uncertain membership state blocks before Stripe", async () => {
  for (const projection of [
    {
      plan_code: "student" as const,
      stripe_status: "active",
      billing_hold: false,
      stripe_customer_id: "cus_existing",
      stripe_subscription_id: "sub_existing",
    },
    {
      plan_code: "scholar" as const,
      stripe_status: "unknown",
      billing_hold: false,
      stripe_customer_id: "cus_unknown",
      stripe_subscription_id: "sub_unknown",
    },
    {
      plan_code: "reader" as const,
      stripe_status: "none",
      billing_hold: true,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    },
  ]) {
    const fixture = makeDependencies({ membership: async () => projection });
    await assert.rejects(
      createMembershipCheckout(
        {
          userId,
          userEmail: "reader@example.invalid",
          userRole: "user",
          request: { offerCode: "student_founding_monthly", requestId },
        },
        fixture.dependencies,
      ),
      (error) =>
        errorCode(error) === "ACTIVE_MEMBERSHIP_EXISTS" ||
        errorCode(error) === "CHECKOUT_UNAVAILABLE",
    );
    assert.equal(fixture.getStripeCreateCalls(), 0);
  }
});

test("terminal paid state may reuse its Customer without creating one", () => {
  assert.equal(
    checkoutCustomerForProjection({
      plan_code: "student",
      stripe_status: "canceled",
      billing_hold: false,
      stripe_customer_id: "cus_returning",
      stripe_subscription_id: "sub_terminal",
    }),
    "cus_returning",
  );
});

test("default-closed catalog stops before membership, ledger, or Stripe", async () => {
  let touched = false;
  const fixture = makeDependencies();
  fixture.dependencies.environment = {};
  fixture.dependencies.loadMembership = async () => {
    touched = true;
    return null;
  };
  await assert.rejects(
    createMembershipCheckout(
      {
        userId,
        userEmail: "reader@example.invalid",
        userRole: "user",
        request: { offerCode: "student_founding_monthly", requestId },
      },
      fixture.dependencies,
    ),
    (error) => errorCode(error) === "CHECKOUT_UNAVAILABLE",
  );
  assert.equal(touched, false);
  assert.equal(fixture.getStripeCreateCalls(), 0);
});

test("route contains only server-authoritative Checkout mutations", () => {
  const source = readFileSync(
    resolve(appRoot, "src/app/api/stripe/create-checkout-session/route.ts"),
    "utf8",
  );
  const checkoutSource = readFileSync(
    resolve(appRoot, "src/lib/membership/membership-checkout.server.ts"),
    "utf8",
  );
  assert.match(checkoutSource, /resolveMembershipCheckoutOffer/);
  assert.match(checkoutSource, /resolveMembershipCanaryCheckoutOfferForUser/);
  assert.match(checkoutSource, /isCheckoutPriceAllowed\(offer\.stripePriceId/);
  assert.ok(
    checkoutSource.indexOf("isCheckoutPriceAllowed(offer.stripePriceId") <
      checkoutSource.indexOf("dependencies.loadMembership(input.userId)"),
  );
  assert.match(source, /\.from\("users"\)[\s\S]*\.select\("role"\)/);
  assert.match(source, /userRole: profile\.data\.role/);
  assert.match(source, /stripe\.checkout\.sessions\.create\(/);
  assert.match(source, /idempotencyKey: input\.idempotencyKey/);
  assert.match(source, /mode: "subscription"/);
  assert.doesNotMatch(source, /body\.(?:priceId|amount|mode|tier|customerId)/);
  assert.doesNotMatch(source, /stripe\.customers\.(?:create|retrieve|update)/);
  assert.doesNotMatch(source, /stripe\.subscriptions\.(?:create|list|retrieve)/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_STRIPE_PRICE_ID_/);
});
