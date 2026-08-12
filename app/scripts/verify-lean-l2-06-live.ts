import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const CUSTOMER_PATTERN = /^cus_[A-Za-z0-9]+$/;
const PORTAL_CONFIGURATION_PATTERN = /^bpc_[A-Za-z0-9]+$/;
const SUBSCRIPTION_PATTERN = /^sub_[A-Za-z0-9]+$/;

interface Arguments {
  confirmReadOnly: boolean;
  expectedStripeAccountFingerprint: string;
  expectedSupabaseProjectRef: string;
  targetEmail: string;
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function parseArguments(argv: string[]): Arguments {
  const values = new Map<string, string>();
  let confirmReadOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--confirm-read-only") {
      confirmReadOnly = true;
      continue;
    }
    if (!argument.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) continue;
    values.set(argument, value);
    index += 1;
  }

  const targetEmail = values.get("--target-email")?.trim().toLowerCase();
  const expectedSupabaseProjectRef = values
    .get("--expected-supabase-project-ref")
    ?.trim();
  const expectedStripeAccountFingerprint = values
    .get("--expected-stripe-account-fingerprint")
    ?.trim();

  if (
    !confirmReadOnly ||
    !targetEmail ||
    !expectedSupabaseProjectRef ||
    !expectedStripeAccountFingerprint
  ) {
    throw Object.assign(new Error("INVALID_ARGUMENTS"), {
      stage: "arguments",
    });
  }

  return {
    confirmReadOnly,
    expectedStripeAccountFingerprint,
    expectedSupabaseProjectRef,
    targetEmail,
  };
}

function safeFailure(error: unknown): Record<string, unknown> {
  const candidate = error as {
    code?: unknown;
    name?: unknown;
    stage?: unknown;
    type?: unknown;
  };
  return {
    status: "stopped",
    stage:
      typeof candidate?.stage === "string"
        ? candidate.stage
        : "read-only-verification",
    errorType:
      typeof candidate?.type === "string"
        ? candidate.type
        : typeof candidate?.name === "string"
          ? candidate.name
          : "Error",
    errorCode:
      typeof candidate?.code === "string" ? candidate.code : null,
  };
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!url || !stripeKey) {
    console.log(
      JSON.stringify(
        {
          status: "stopped",
          stage: "required-environment",
          present: {
            nextPublicSupabaseUrl: Boolean(url),
            supabaseServiceRoleKey: Boolean(serviceKey),
            stripeSecretKey: Boolean(stripeKey),
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  const result: Record<string, unknown> = {
    target: "approved-email",
    targetFingerprint: fingerprint(args.targetEmail),
    expectedSupabaseProjectRef: args.expectedSupabaseProjectRef,
    expectedStripeAccountFingerprint:
      args.expectedStripeAccountFingerprint,
    portalConfigurationPresent: Boolean(
      process.env.PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID,
    ),
    billingOperationsFlagPresent: Object.prototype.hasOwnProperty.call(
      process.env,
      "PRISMARIUM_BILLING_OPERATIONS_ENABLED",
    ),
  };

  const projectRef = new URL(url).hostname.split(".")[0];
  result.supabaseProjectMatches =
    projectRef === args.expectedSupabaseProjectRef;
  if (!result.supabaseProjectMatches) {
    throw Object.assign(new Error("SUPABASE_PROJECT_MISMATCH"), {
      stage: "supabase-project-mismatch",
    });
  }

  const stripe = new Stripe(stripeKey, { maxNetworkRetries: 0 });
  const account = await stripe.accounts.retrieve();
  const accountFingerprint = fingerprint(account.id);
  result.stripeLiveMode = stripeKey.startsWith("sk_live_");
  result.stripeAccountFingerprint = accountFingerprint;
  result.stripeAccountMatches =
    result.stripeLiveMode === true &&
    accountFingerprint === args.expectedStripeAccountFingerprint;
  if (!result.stripeAccountMatches) {
    throw Object.assign(new Error("STRIPE_ACCOUNT_MISMATCH"), {
      stage: "stripe-account-mismatch",
    });
  }

  const configurationId =
    process.env.PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID;
  if (configurationId) {
    if (!PORTAL_CONFIGURATION_PATTERN.test(configurationId)) {
      throw Object.assign(new Error("PORTAL_CONFIGURATION_ID_INVALID"), {
        stage: "portal-configuration-id",
      });
    }
    const configuration =
      await stripe.billingPortal.configurations.retrieve(configurationId);
    const features = configuration.features;
    const pauseFeature = (
      features as typeof features & {
        subscription_pause?: { enabled: boolean };
      }
    ).subscription_pause;
    result.portalConfiguration = {
      fingerprint: fingerprint(configuration.id),
      active: configuration.active,
      customerProfileUpdatesEnabled:
        features.customer_update.enabled,
      invoiceHistoryEnabled: features.invoice_history.enabled,
      paymentMethodUpdatesEnabled:
        features.payment_method_update.enabled,
      cancellationEnabled: features.subscription_cancel.enabled,
      pauseEnabled: pauseFeature?.enabled ?? false,
      planSwitchingEnabled: features.subscription_update.enabled,
      safe:
        configuration.active === true &&
        features.customer_update.enabled === false &&
        features.invoice_history.enabled === true &&
        features.payment_method_update.enabled === true &&
        features.subscription_cancel.enabled === true &&
        pauseFeature?.enabled !== true &&
        features.subscription_update.enabled === false,
    };
  }

  if (!serviceKey) {
    result.membershipLookup = {
      status: "unavailable",
      code: "PROCESS_CREDENTIAL_UNAVAILABLE",
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const userRead = await supabase
    .from("users")
    .select("id,role")
    .ilike("email", args.targetEmail)
    .limit(2);

  if (userRead.error) {
    result.userLookup = {
      status: "error",
      code: userRead.error.code || "UNKNOWN",
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const users = userRead.data ?? [];
  result.userLookup = {
    status: users.length === 1 ? "exact" : "ambiguous",
    count: users.length,
  };
  if (users.length !== 1) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const user = users[0];
  const role = typeof user.role === "string" ? user.role.toLowerCase() : "unknown";
  result.userFingerprint = fingerprint(user.id);
  result.userRole = role;
  result.regularUser = role !== "admin";
  if (role === "admin") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const membershipRead = await supabase
    .from("billing_memberships")
    .select(
      "user_id,plan_code,stripe_status,pricing_cohort,offer_code,billing_interval,stripe_customer_id,stripe_subscription_id,current_period_start,current_period_end,cancel_at_period_end,access_until,billing_hold",
    )
    .eq("user_id", user.id)
    .limit(2);

  if (membershipRead.error) {
    result.membershipLookup = {
      status: "unavailable",
      code: membershipRead.error.code || "UNKNOWN",
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const memberships = membershipRead.data ?? [];
  result.membershipLookup = {
    status: memberships.length === 1 ? "exact" : "ambiguous",
    count: memberships.length,
  };
  if (memberships.length !== 1) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const membership = memberships[0];
  result.membership = {
    planCode: membership.plan_code,
    stripeStatus: membership.stripe_status,
    pricingCohort: membership.pricing_cohort,
    offerCode: membership.offer_code,
    billingInterval: membership.billing_interval,
    currentPeriodStart: membership.current_period_start,
    currentPeriodEnd: membership.current_period_end,
    cancelAtPeriodEnd: membership.cancel_at_period_end,
    accessUntil: membership.access_until,
    billingHold: membership.billing_hold,
    customerFingerprint: membership.stripe_customer_id
      ? fingerprint(membership.stripe_customer_id)
      : null,
    subscriptionFingerprint: membership.stripe_subscription_id
      ? fingerprint(membership.stripe_subscription_id)
      : null,
  };

  if (
    typeof membership.stripe_customer_id !== "string" ||
    !CUSTOMER_PATTERN.test(membership.stripe_customer_id) ||
    typeof membership.stripe_subscription_id !== "string" ||
    !SUBSCRIPTION_PATTERN.test(membership.stripe_subscription_id)
  ) {
    result.stripeBinding = { status: "missing-or-invalid" };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    membership.stripe_subscription_id,
  );
  const customer = await stripe.customers.retrieve(
    membership.stripe_customer_id,
  );
  const subscriptionCustomer =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const subscriptionUserId = subscription.metadata?.user_id;
  result.stripeBinding = {
    status: "retrieved",
    customerFingerprint: fingerprint(subscriptionCustomer),
    subscriptionFingerprint: fingerprint(subscription.id),
    customerNotDeleted: !("deleted" in customer && customer.deleted),
    customerMatches:
      subscriptionCustomer === membership.stripe_customer_id,
    subscriptionMatches:
      subscription.id === membership.stripe_subscription_id,
    userMatches: subscriptionUserId === user.id,
    stripeStatus: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.log(JSON.stringify(safeFailure(error), null, 2));
  process.exitCode = 1;
});
