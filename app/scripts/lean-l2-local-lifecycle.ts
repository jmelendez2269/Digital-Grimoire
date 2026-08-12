import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import Stripe from "stripe";

import { resolveMembershipEntitlement } from "../src/lib/membership/membership-entitlement-resolver.server";

const FIXTURE_EMAIL = "lean-l2-membership-reader@example.test";
const FIXTURE_MARKER = "lean-l2-local-membership-reader-v1";
const STRIPE_MARKER = "lean-l2-local-founding-v1";
const OFFER_CODE = "student_founding_monthly";
const COURSE_SLUG = "c01-how-humans-know-what-they-know";
const AMOUNT_CENTS = 1500;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function localSupabaseUrl(): string {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(url)) {
    throw new Error(`Refusing non-local Supabase URL: ${url}`);
  }
  return url;
}

function stripeClient(): Stripe {
  const secretKey = required("STRIPE_SECRET_KEY");
  if (!/^(?:sk|rk)_test_/.test(secretKey)) {
    throw new Error("Refusing non-test Stripe key");
  }
  return new Stripe(secretKey, { maxNetworkRetries: 1 });
}

function catalogEnvironment(priceId: string) {
  return {
    PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED: "true",
    PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS: OFFER_CODE,
    PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS: COURSE_SLUG,
    PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG: COURSE_SLUG,
    PRISMARIUM_ADEPT_LAUNCH_DECISION: "hold",
    PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY: priceId,
  };
}

async function markedPrice(stripe: Stripe): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({ active: true, limit: 100 });
  const matches = prices.data.filter(
    (price) =>
      !price.livemode &&
      price.active &&
      price.unit_amount === AMOUNT_CENTS &&
      price.currency === "usd" &&
      price.recurring?.interval === "month" &&
      price.recurring.interval_count === 1 &&
      price.metadata.prismarium_fixture === STRIPE_MARKER &&
      price.metadata.prismarium_offer_code === OFFER_CODE,
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one marked Stripe test Price; found ${matches.length}`);
  }
  return matches[0];
}

async function markedSessions(stripe: Stripe) {
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  return sessions.data
    .filter(
      (session) =>
        !session.livemode &&
        session.metadata?.prismarium_fixture === STRIPE_MARKER &&
        session.metadata?.offer_code === OFFER_CODE,
    )
    .sort((left, right) => right.created - left.created);
}

async function checkoutSession(
  stripe: Stripe,
  expectedStatus: "open" | "complete",
) {
  const session = (await markedSessions(stripe)).find(
    (candidate) => candidate.status === expectedStatus,
  );
  if (!session) throw new Error(`No marked ${expectedStatus} Checkout Session`);
  return stripe.checkout.sessions.retrieve(session.id, {
    expand: ["subscription"],
  });
}

function subscriptionFromSession(
  session: Stripe.Checkout.Session,
): Stripe.Subscription {
  if (!session.subscription || typeof session.subscription === "string") {
    throw new Error("Checkout Session has no expanded Subscription");
  }
  return session.subscription;
}

async function fixtureContext() {
  const url = localSupabaseUrl();
  const service = createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await service
    .from("users")
    .select("id, role, subscription_status, stripe_customer_id, stripe_subscription_id")
    .eq("email", FIXTURE_EMAIL)
    .single();
  if (profileError) throw new Error("Local fixture profile unavailable");
  const { data: auth, error: authError } =
    await service.auth.admin.getUserById(profile.id);
  if (
    authError ||
    auth.user?.user_metadata?.fixture_marker !== FIXTURE_MARKER ||
    profile.role !== "user"
  ) {
    throw new Error("Local fixture ownership or role check failed");
  }
  return { service, profile };
}

async function matchingStripeEvent(
  stripe: Stripe,
  eventType:
    | "customer.subscription.created"
    | "customer.subscription.deleted",
  subscriptionId: string,
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const events = await stripe.events.list({ type: eventType, limit: 100 });
    const event = events.data.find(
      (candidate) =>
        candidate.data.object.object === "subscription" &&
        candidate.data.object.id === subscriptionId,
    );
    if (event) return event;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Stripe test event not found: ${eventType}`);
}

async function postSignedEvent(event: Stripe.Event) {
  const payload = JSON.stringify(event);
  const secret = required("STRIPE_WEBHOOK_SECRET");
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  const response = await fetch(
    `${required("LEAN_L2_LOCAL_APP_URL").replace(/\/+$/, "")}/api/stripe/webhook`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
      body: payload,
    },
  );
  const body = (await response.json()) as Record<string, unknown>;
  if (
    response.status !== 200 ||
    body.received !== true ||
    (body.disposition !== "processed" &&
      body.disposition !== "duplicate_processed")
  ) {
    throw new Error(
      `Local webhook rejected event with status ${response.status} and disposition ${String(body.disposition ?? "missing")}`,
    );
  }
  return body.disposition;
}

async function membershipRow(
  service: Awaited<ReturnType<typeof fixtureContext>>["service"],
  userId: string,
) {
  const { data, error } = await service
    .from("billing_memberships")
    .select(
      "plan_code, stripe_status, pricing_cohort, billing_hold, access_until, cancel_at_period_end, stripe_customer_id, stripe_subscription_id",
    )
    .eq("user_id", userId)
    .single();
  if (error) throw new Error("Local membership projection unavailable");
  return data;
}

async function entitlement(
  service: Awaited<ReturnType<typeof fixtureContext>>["service"],
  userId: string,
  priceId: string,
) {
  return resolveMembershipEntitlement(
    { userId, courseSlug: COURSE_SLUG },
    {
      environment: catalogEnvironment(priceId),
      async loadMembership(id) {
        const { data, error } = await service
          .from("billing_memberships")
          .select(
            "plan_code, stripe_status, pricing_cohort, billing_hold, access_until",
          )
          .eq("user_id", id)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
    },
  );
}

async function projectActive() {
  const stripe = stripeClient();
  const price = await markedPrice(stripe);
  const session = await checkoutSession(stripe, "complete");
  const subscription = subscriptionFromSession(session);
  const { service, profile } = await fixtureContext();
  if (
    session.payment_status !== "paid" ||
    session.amount_total !== AMOUNT_CENTS ||
    subscription.status !== "active" ||
    subscription.metadata.user_id !== profile.id
  ) {
    throw new Error("Completed Checkout does not match the local Reader");
  }
  const event = await matchingStripeEvent(
    stripe,
    "customer.subscription.created",
    subscription.id,
  );
  const disposition = await postSignedEvent(event);
  const row = await membershipRow(service, profile.id);
  const resolved = await entitlement(service, profile.id, price.id);
  if (
    row.plan_code !== "student" ||
    row.stripe_status !== "active" ||
    row.pricing_cohort !== "founding" ||
    row.billing_hold ||
    !row.access_until ||
    resolved.planCode !== "student" ||
    !resolved.paidEntitlementsActive ||
    !resolved.course.entitled
  ) {
    throw new Error("Active Student projection or entitlement check failed");
  }
  console.log(
    JSON.stringify({
      result: "student-active",
      userFingerprint: fingerprint(profile.id),
      subscriptionFingerprint: fingerprint(subscription.id),
      eventFingerprint: fingerprint(event.id),
      webhookDisposition: disposition,
      planCode: resolved.planCode,
      monthlyCredits: resolved.monthlyCredits,
      paidEntitlementsActive: resolved.paidEntitlementsActive,
      launchCourseEntitled: resolved.course.entitled,
      productionReads: 0,
      productionMutations: 0,
    }),
  );
}

async function inspectActive() {
  const stripe = stripeClient();
  const price = await markedPrice(stripe);
  const { service, profile } = await fixtureContext();
  const row = await membershipRow(service, profile.id);
  const resolved = await entitlement(service, profile.id, price.id);
  if (
    row.plan_code !== "student" ||
    row.stripe_status !== "active" ||
    row.pricing_cohort !== "founding" ||
    row.billing_hold ||
    !row.access_until ||
    resolved.planCode !== "student" ||
    !resolved.paidEntitlementsActive ||
    !resolved.course.entitled
  ) {
    throw new Error("Active Student projection or entitlement check failed");
  }
  console.log(
    JSON.stringify({
      result: "student-active-inspected",
      userFingerprint: fingerprint(profile.id),
      planCode: resolved.planCode,
      monthlyCredits: resolved.monthlyCredits,
      paidEntitlementsActive: resolved.paidEntitlementsActive,
      launchCourseEntitled: resolved.course.entitled,
      productionReads: 0,
      productionMutations: 0,
    }),
  );
}

async function cancelAndProject() {
  const stripe = stripeClient();
  const price = await markedPrice(stripe);
  const session = await checkoutSession(stripe, "complete");
  const initial = subscriptionFromSession(session);
  const subscription =
    initial.status === "canceled"
      ? initial
      : await stripe.subscriptions.cancel(initial.id);
  if (subscription.status !== "canceled") {
    throw new Error("Stripe test Subscription did not cancel");
  }
  const event = await matchingStripeEvent(
    stripe,
    "customer.subscription.deleted",
    subscription.id,
  );
  const disposition = await postSignedEvent(event);
  const { service, profile } = await fixtureContext();
  const row = await membershipRow(service, profile.id);
  const resolved = await entitlement(service, profile.id, price.id);
  if (
    row.plan_code !== "student" ||
    row.stripe_status !== "canceled" ||
    row.billing_hold ||
    resolved.planCode !== "reader" ||
    resolved.paidEntitlementsActive ||
    resolved.course.entitled ||
    resolved.reason !== "inactive_billing_status"
  ) {
    throw new Error("Canceled Reader fallback check failed");
  }
  console.log(
    JSON.stringify({
      result: "subscription-canceled-reader-safe",
      userFingerprint: fingerprint(profile.id),
      subscriptionFingerprint: fingerprint(subscription.id),
      eventFingerprint: fingerprint(event.id),
      webhookDisposition: disposition,
      storedStripeStatus: row.stripe_status,
      effectivePlanCode: resolved.planCode,
      paidEntitlementsActive: resolved.paidEntitlementsActive,
      launchCourseEntitled: resolved.course.entitled,
      failClosed: resolved.failClosed,
      reason: resolved.reason,
      productionReads: 0,
      productionMutations: 0,
    }),
  );
}

async function main() {
  dotenv.config({ path: ".env.local", quiet: true });
  const [command] = process.argv.slice(2);
  const stripe = stripeClient();
  if (command === "price-id") {
    console.log((await markedPrice(stripe)).id);
    return;
  }
  if (command === "checkout-url") {
    const session = await checkoutSession(stripe, "open");
    if (!session.url) throw new Error("Checkout Session URL is missing");
    console.log(session.url);
    return;
  }
  if (command === "project-active") return projectActive();
  if (command === "inspect-active") return inspectActive();
  if (command === "cancel-and-project") return cancelAndProject();
  throw new Error(
    "Usage: lean-l2-local-lifecycle.ts <price-id|checkout-url|project-active|inspect-active|cancel-and-project>",
  );
}

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      result: "blocked",
      reason: error instanceof Error ? error.message : "unknown error",
      rawStripeErrorEmitted: false,
    }),
  );
  process.exitCode = 1;
});
