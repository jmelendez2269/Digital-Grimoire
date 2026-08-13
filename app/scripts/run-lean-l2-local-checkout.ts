import { createHash, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import {
  createMembershipCheckout,
  type CheckoutRequestRecord,
  type MembershipCheckoutDependencies,
} from "../src/lib/membership/membership-checkout.server";

const FIXTURE_EMAIL = "lean-l2-membership-reader@example.test";
const FIXTURE_MARKER = "lean-l2-local-membership-reader-v1";
const STRIPE_MARKER = "lean-l2-local-founding-v1";
const OFFER_CODE = "student_founding_monthly" as const;
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

function productId(price: Stripe.Price): string | null {
  return typeof price.product === "string"
    ? price.product
    : price.product?.id ?? null;
}

function isExactPrice(price: Stripe.Price, expectedProductId: string): boolean {
  return (
    !price.livemode &&
    price.active &&
    productId(price) === expectedProductId &&
    price.currency === "usd" &&
    price.unit_amount === AMOUNT_CENTS &&
    price.type === "recurring" &&
    price.recurring?.interval === "month" &&
    price.recurring.interval_count === 1 &&
    price.recurring.usage_type === "licensed" &&
    price.metadata.prismarium_fixture === STRIPE_MARKER &&
    price.metadata.prismarium_offer_code === OFFER_CODE
  );
}

async function resolveTestPrice(stripe: Stripe) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const matchingProducts = products.data.filter(
    (product) =>
      !product.livemode &&
      product.metadata.prismarium_fixture === STRIPE_MARKER,
  );
  if (matchingProducts.length > 1) {
    throw new Error("Ambiguous marked Stripe test Products");
  }

  const product =
    matchingProducts[0] ??
    (await stripe.products.create(
      {
        name: "Prismarium Student Founding (Local Test)",
        metadata: { prismarium_fixture: STRIPE_MARKER },
      },
      { idempotencyKey: `prismarium-${STRIPE_MARKER}-product` },
    ));
  if (product.livemode || !product.active) {
    throw new Error("Marked Stripe test Product is not safely active");
  }

  const prices = await stripe.prices.list({
    active: true,
    product: product.id,
    limit: 100,
  });
  const matchingPrices = prices.data.filter((price) =>
    isExactPrice(price, product.id),
  );
  if (matchingPrices.length > 1) {
    throw new Error("Ambiguous marked Stripe test Prices");
  }

  const price =
    matchingPrices[0] ??
    (await stripe.prices.create(
      {
        active: true,
        currency: "usd",
        unit_amount: AMOUNT_CENTS,
        product: product.id,
        recurring: {
          interval: "month",
          interval_count: 1,
          usage_type: "licensed",
        },
        lookup_key: "prismarium_local_student_founding_monthly_v1",
        nickname: "Prismarium local Student founding monthly v1",
        metadata: {
          prismarium_fixture: STRIPE_MARKER,
          prismarium_offer_code: OFFER_CODE,
        },
      },
      { idempotencyKey: `prismarium-${STRIPE_MARKER}-price` },
    ));
  if (!isExactPrice(price, product.id)) {
    throw new Error("Marked Stripe test Price failed exact validation");
  }

  return { product, price };
}

async function main() {
  if (!process.argv.includes("--apply-test")) {
    throw new Error("Refusing without --apply-test");
  }

  const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(supabaseUrl)) {
    throw new Error(`Refusing non-local Supabase URL: ${supabaseUrl}`);
  }
  const secretKey = required("STRIPE_SECRET_KEY");
  if (!/^(?:sk|rk)_test_/.test(secretKey)) {
    throw new Error("Refusing non-test Stripe key");
  }

  const service = createClient(
    supabaseUrl,
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const publicClient = createClient(
    supabaseUrl,
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
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
    profile.role !== "user" ||
    profile.subscription_status !== "free" ||
    profile.stripe_customer_id !== null ||
    profile.stripe_subscription_id !== null
  ) {
    throw new Error("Local fixture is not the expected regular Reader");
  }
  const { data: signIn, error: signInError } =
    await publicClient.auth.signInWithPassword({
      email: FIXTURE_EMAIL,
      password: required("LEAN_L2_LOCAL_TEST_USER_PASSWORD"),
    });
  if (signInError || signIn.user?.id !== profile.id) {
    throw new Error("Local fixture password sign-in failed");
  }
  await publicClient.auth.signOut();

  const stripe = new Stripe(secretKey, { maxNetworkRetries: 1 });
  const account = await stripe.accounts.retrieve();
  const { product, price } = await resolveTestPrice(stripe);
  const requestId = randomUUID();
  const environment = {
    PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED: "true",
    PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS: OFFER_CODE,
    PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS: COURSE_SLUG,
    PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG: COURSE_SLUG,
    PRISMARIUM_ADEPT_LAUNCH_DECISION: "hold",
    PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY: price.id,
  };

  let stripeSessionCreates = 0;
  const dependencies: MembershipCheckoutDependencies = {
    environment,
    appUrl: "http://127.0.0.1:3000",
    async loadMembership(userId: string) {
      const { data, error } = await service
        .from("billing_memberships")
        .select(
          "plan_code, stripe_status, billing_hold, stripe_customer_id, stripe_subscription_id",
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error("Membership lookup failed");
      return data;
    },
    async reserveRequest(input) {
      const inserted = await service
        .from("billing_checkout_requests")
        .insert({
          user_id: input.userId,
          request_id: input.requestId,
          offer_code: input.offerCode,
          request_fingerprint: input.requestFingerprint,
        })
        .select(
          "request_fingerprint, state, stripe_checkout_session_id, checkout_url",
        )
        .single();
      if (!inserted.error && inserted.data) {
        return {
          inserted: true,
          record: inserted.data as CheckoutRequestRecord,
        };
      }
      if (inserted.error?.code !== "23505") {
        throw new Error("Checkout reservation failed");
      }
      const existing = await service
        .from("billing_checkout_requests")
        .select(
          "request_fingerprint, state, stripe_checkout_session_id, checkout_url",
        )
        .eq("user_id", input.userId)
        .eq("request_id", input.requestId)
        .single();
      if (existing.error) throw new Error("Checkout replay lookup failed");
      return {
        inserted: false,
        record: existing.data as CheckoutRequestRecord,
      };
    },
    async completeRequest(input) {
      const { error } = await service
        .from("billing_checkout_requests")
        .update({
          state: "session_created",
          stripe_checkout_session_id: input.sessionId,
          checkout_url: input.checkoutUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", input.userId)
        .eq("request_id", input.requestId)
        .eq("request_fingerprint", input.requestFingerprint)
        .eq("state", "pending");
      if (error) throw new Error("Checkout completion failed");
    },
    async createSession(input) {
      stripeSessionCreates += 1;
      const session = await stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer_email: input.customerEmail ?? undefined,
          line_items: [{ price: input.priceId, quantity: 1 }],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          client_reference_id: input.userId,
          metadata: {
            user_id: input.userId,
            offer_code: input.offerCode,
            request_id: input.requestId,
            prismarium_fixture: STRIPE_MARKER,
          },
          subscription_data: {
            metadata: {
              user_id: input.userId,
              offer_code: input.offerCode,
              request_id: input.requestId,
              prismarium_fixture: STRIPE_MARKER,
            },
          },
        },
        { idempotencyKey: input.idempotencyKey },
      );
      return { id: session.id, url: session.url };
    },
  };

  const request = { offerCode: OFFER_CODE, requestId };
  const created = await createMembershipCheckout(
    { userId: profile.id, userEmail: FIXTURE_EMAIL, userRole: "user", request },
    dependencies,
  );
  const replayed = await createMembershipCheckout(
    { userId: profile.id, userEmail: FIXTURE_EMAIL, userRole: "user", request },
    dependencies,
  );
  const session = await stripe.checkout.sessions.retrieve(created.sessionId, {
    expand: ["line_items"],
  });
  if (
    session.livemode ||
    session.mode !== "subscription" ||
    session.amount_total !== AMOUNT_CENTS ||
    session.metadata?.user_id !== profile.id ||
    session.metadata?.offer_code !== OFFER_CODE ||
    !replayed.replayed ||
    replayed.sessionId !== created.sessionId ||
    stripeSessionCreates !== 1
  ) {
    throw new Error("Stripe test Checkout verification failed");
  }

  console.log(
    JSON.stringify(
      {
        result: "local-stripe-test-checkout-ready",
        supabase: {
          local: true,
          userFingerprint: fingerprint(profile.id),
          role: profile.role,
          passwordSignInVerified: true,
        },
        stripe: {
          mode: "test",
          accountFingerprint: fingerprint(account.id),
          productFingerprint: fingerprint(product.id),
          priceFingerprint: fingerprint(price.id),
          checkoutSessionFingerprint: fingerprint(session.id),
          amountCents: session.amount_total,
          currency: session.currency,
          recurring: "month",
          checkoutSessionCreates: stripeSessionCreates,
          replayReturnedSameSession: true,
        },
        productionReads: 0,
        productionMutations: 0,
        rawStripeIdsEmitted: false,
        rawCheckoutUrlEmitted: false,
      },
      null,
      2,
    ),
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
