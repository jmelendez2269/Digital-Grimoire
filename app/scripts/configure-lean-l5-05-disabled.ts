/**
 * LEAN-L5-05 disabled live Stripe/Vercel configuration.
 *
 * This helper creates or reuses exactly one marker-owned safe Billing Portal
 * configuration and one marker-owned subscription webhook endpoint, disables
 * the endpoint immediately, then sends the two resulting values directly to
 * Vercel Production over stdin. It never reads or mutates Customers,
 * Subscriptions, Checkout Sessions, invoices, payments, or application data.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import Stripe from "stripe";

const EXPECTED_PROJECT = "digital-grimoire-96dg";
const EXPECTED_SCOPE = "ravemage444s-projects";
const EXPECTED_WEBHOOK_URL = "https://prismarium.xyz/api/stripe/webhook";
const PORTAL_MARKER = "prismarium_lean_l5_05_safe_portal_v1";
const WEBHOOK_MARKER = "prismarium_lean_l5_05_subscription_webhook_v1";
const STAGED_WEBHOOK_SECRET_ENV = "PRISMARIUM_STRIPE_WEBHOOK_SECRET_STAGED";
const REQUIRED_PRICE_ENVS = [
  "PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY",
  "PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY",
  "PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY",
  "PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY",
] as const;
const CLOSED_GATE_ENVS = [
  "PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED",
  "PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS",
  "PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS",
  "PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG",
  "PRISMARIUM_ENABLED_METERED_ACTIONS",
  "PRISMARIUM_MEMBERSHIP_CANARY_ENABLED",
  "PRISMARIUM_MEMBERSHIP_CANARY_USER_IDS",
  "PRISMARIUM_MEMBERSHIP_CANARY_OFFERS",
  "PRISMARIUM_BILLING_OPERATIONS_ENABLED",
  "PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS",
] as const;
const EXPECTED_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

interface Arguments {
  apply: boolean;
  acceptSafeDefault: boolean;
  confirmProduction: boolean;
  confirmPriceMappingNamesPresent: boolean;
  confirmProtectedGateNamesAbsent: boolean;
  expectedAccountFingerprint: string;
  expectedProject: string;
  inspectOnly: boolean;
  portalEnvironmentAlreadyStored: boolean;
  replacementWebhookFingerprint: string;
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function parseArguments(argv: string[]): Arguments {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(argument, next);
      index += 1;
    }
  }

  const expectedAccountFingerprint = values
    .get("--expected-stripe-account-fingerprint")
    ?.trim()
    .toLowerCase();
  const expectedProject = values.get("--expected-vercel-project")?.trim();
  const replacementWebhookFingerprint = values
    .get("--replace-disabled-webhook-fingerprint")
    ?.trim()
    .toLowerCase();
  const args = {
    apply: argv.includes("--apply"),
    acceptSafeDefault: argv.includes("--accept-safe-default"),
    confirmProduction: argv.includes("--confirm-production"),
    confirmPriceMappingNamesPresent: argv.includes(
      "--confirm-price-mapping-names-present",
    ),
    confirmProtectedGateNamesAbsent: argv.includes(
      "--confirm-protected-gate-names-absent",
    ),
    expectedAccountFingerprint: expectedAccountFingerprint ?? "",
    expectedProject: expectedProject ?? "",
    inspectOnly: argv.includes("--inspect-only"),
    portalEnvironmentAlreadyStored: argv.includes(
      "--portal-environment-already-stored",
    ),
    replacementWebhookFingerprint: replacementWebhookFingerprint ?? "",
  };
  if (
    (!args.apply && !args.inspectOnly) ||
    (args.apply && args.inspectOnly) ||
    !args.acceptSafeDefault ||
    !args.confirmProduction ||
    !args.confirmPriceMappingNamesPresent ||
    !args.confirmProtectedGateNamesAbsent ||
    !/^[a-f0-9]{12}$/.test(args.expectedAccountFingerprint) ||
    !/^[a-f0-9]{12}$/.test(args.replacementWebhookFingerprint) ||
    (args.apply && !args.portalEnvironmentAlreadyStored) ||
    args.expectedProject !== EXPECTED_PROJECT
  ) {
    throw new Error("invalid_or_incomplete_production_confirmation");
  }
  return args;
}

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing_required_environment:${name}`);
  return value;
}

function assertGatesClosed(args: Arguments): void {
  const open = CLOSED_GATE_ENVS.filter((name) =>
    Object.prototype.hasOwnProperty.call(process.env, name),
  );
  if (open.length > 0) {
    throw new Error(`protected_gate_variable_present:${open.join(",")}`);
  }
  if (
    !args.confirmPriceMappingNamesPresent ||
    REQUIRED_PRICE_ENVS.length !== 4
  ) {
    throw new Error("required_price_mapping_name_preflight_missing");
  }
}

function portalConfigurationIsSafe(
  configuration: Stripe.BillingPortal.Configuration,
  acceptSafeDefault: boolean,
): boolean {
  const features = configuration.features;
  const pause = (
    features as typeof features & {
      subscription_pause?: { enabled: boolean };
    }
  ).subscription_pause;
  return (
    configuration.active === true &&
    (configuration.is_default === false || acceptSafeDefault) &&
    features.customer_update.enabled === false &&
    features.customer_update.allowed_updates.length === 0 &&
    features.invoice_history.enabled === true &&
    features.payment_method_update.enabled === true &&
    features.subscription_cancel.enabled === true &&
    features.subscription_cancel.mode === "at_period_end" &&
    features.subscription_cancel.proration_behavior === "none" &&
    pause?.enabled !== true &&
    features.subscription_update.enabled === false &&
    features.subscription_update.default_allowed_updates.length === 0
  );
}

function portalSafetyFacts(
  configuration: Stripe.BillingPortal.Configuration,
): Record<string, unknown> {
  const features = configuration.features;
  const pause = (
    features as typeof features & {
      subscription_pause?: { enabled: boolean };
    }
  ).subscription_pause;
  return {
    fingerprint: fingerprint(configuration.id),
    active: configuration.active,
    isDefault: configuration.is_default,
    customerUpdateEnabled: features.customer_update.enabled,
    customerAllowedUpdateCount:
      features.customer_update.allowed_updates.length,
    invoiceHistoryEnabled: features.invoice_history.enabled,
    paymentMethodUpdateEnabled: features.payment_method_update.enabled,
    cancellationEnabled: features.subscription_cancel.enabled,
    cancellationMode: features.subscription_cancel.mode,
    cancellationProration: features.subscription_cancel.proration_behavior,
    pauseEnabled: pause?.enabled ?? false,
    subscriptionUpdateEnabled: features.subscription_update.enabled,
    subscriptionAllowedUpdateCount:
      features.subscription_update.default_allowed_updates.length,
  };
}

function webhookEndpointIsExact(endpoint: Stripe.WebhookEndpoint): boolean {
  const events = [...endpoint.enabled_events].sort();
  const expected = [...EXPECTED_EVENTS].sort();
  return (
    endpoint.livemode === true &&
    endpoint.status === "disabled" &&
    endpoint.url === EXPECTED_WEBHOOK_URL &&
    events.length === expected.length &&
    events.every((event, index) => event === expected[index])
  );
}

async function assertVercelProject(): Promise<void> {
  const projectFile = resolve(process.cwd(), ".vercel", "project.json");
  const project = JSON.parse(await readFile(projectFile, "utf8")) as {
    projectName?: unknown;
  };
  if (project.projectName !== EXPECTED_PROJECT) {
    throw new Error("vercel_project_link_mismatch");
  }
}

function addSensitiveProductionEnvironment(name: string, value: string): void {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const vercelArguments = [
      "env",
      "add",
      name,
      "production",
      "--sensitive",
      "--force",
      "--yes",
      "--scope",
      EXPECTED_SCOPE,
      "--no-color",
    ];
    const command =
      process.platform === "win32"
        ? process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe"
        : "vercel";
    const commandArguments =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "vercel.cmd", ...vercelArguments]
        : vercelArguments;
    const result = spawnSync(
      command,
      commandArguments,
      {
        cwd: process.cwd(),
        env: process.env,
        input: `${value}\n`,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    if (result.status === 0) return;
    if (attempt === 2) {
      const safeDetail = `${result.stdout || ""}\n${result.stderr || ""}`
        .replace(/whsec_[A-Za-z0-9]+/g, "[redacted-webhook-secret]")
        .replace(/bpc_[A-Za-z0-9]+/g, "[redacted-portal-id]")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400);
      throw new Error(
        `vercel_environment_write_failed:${name}:${safeDetail || "no_detail"}`,
      );
    }
  }
}

async function findOrCreatePortal(
  stripe: Stripe,
  acceptSafeDefault: boolean,
): Promise<{ configuration: Stripe.BillingPortal.Configuration; action: string }> {
  const configurations = await stripe.billingPortal.configurations
    .list({ limit: 100 })
    .autoPagingToArray({ limit: 500 });
  const marked = configurations.filter(
    (configuration) => configuration.metadata?.prismarium_marker === PORTAL_MARKER,
  );
  if (marked.length > 1) throw new Error("ambiguous_marker_owned_portal_configurations");

  const configuration =
    marked[0] ??
    (await stripe.billingPortal.configurations.create(
      {
        business_profile: {
          headline: "Manage payment methods, invoices, and cancellation.",
        },
        default_return_url: "https://prismarium.xyz/profile",
        features: {
          customer_update: { enabled: false, allowed_updates: [] },
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
            proration_behavior: "none",
            cancellation_reason: {
              enabled: false,
              options: [
                "too_expensive",
                "missing_features",
                "switched_service",
                "unused",
                "other",
              ],
            },
          },
          subscription_update: {
            enabled: false,
            default_allowed_updates: [],
            proration_behavior: "none",
          },
        },
        metadata: {
          prismarium_marker: PORTAL_MARKER,
          prismarium_description: "Safe lean membership portal; no plan switching",
        },
      },
      { idempotencyKey: PORTAL_MARKER },
    ));

  if (!portalConfigurationIsSafe(configuration, acceptSafeDefault)) {
    throw new Error(
      `portal_configuration_failed_safe_contract:${JSON.stringify(
        portalSafetyFacts(configuration),
      )}`,
    );
  }
  return { configuration, action: marked[0] ? "reused" : "created" };
}

async function findOrCreateDisabledWebhook(
  stripe: Stripe,
  args: Arguments,
): Promise<{
  endpoint: Stripe.WebhookEndpoint;
  signingSecret: string;
  action: string;
}> {
  const endpoints = await stripe.webhookEndpoints
    .list({ limit: 100 })
    .autoPagingToArray({ limit: 500 });
  const marked = endpoints.filter(
    (endpoint) => endpoint.metadata?.prismarium_marker === WEBHOOK_MARKER,
  );
  if (marked.length > 1) throw new Error("ambiguous_marker_owned_webhook_endpoints");

  let signingSecret = "";
  let action = "inspected";
  let endpoint: Stripe.WebhookEndpoint | undefined = marked[0];

  if (args.inspectOnly) {
    const isOriginalTarget =
      endpoint &&
      fingerprint(endpoint.id) === args.replacementWebhookFingerprint;
    const isVerifiedReplacement =
      endpoint?.metadata?.prismarium_replaces_fingerprint ===
      args.replacementWebhookFingerprint;
    if (
      !endpoint ||
      (!isOriginalTarget && !isVerifiedReplacement) ||
      !webhookEndpointIsExact(endpoint)
    ) {
      throw new Error("replacement_webhook_inspection_failed");
    }
    return { endpoint, signingSecret, action };
  }

  if (endpoint) {
    if (!webhookEndpointIsExact(endpoint)) {
      throw new Error("replacement_target_not_exact_and_disabled");
    }
    if (fingerprint(endpoint.id) !== args.replacementWebhookFingerprint) {
      throw new Error("replacement_target_fingerprint_mismatch");
    }
    const deleted = await stripe.webhookEndpoints.del(endpoint.id);
    if (!deleted.deleted || fingerprint(deleted.id) !== args.replacementWebhookFingerprint) {
      throw new Error("replacement_target_delete_not_confirmed");
    }
    endpoint = undefined;
  }

  if (!endpoint) {
    const created = await stripe.webhookEndpoints.create(
      {
        url: EXPECTED_WEBHOOK_URL,
        enabled_events: [...EXPECTED_EVENTS],
        connect: false,
        description: "Prismarium LEAN-L5-05 subscription projector",
        metadata: {
          prismarium_marker: WEBHOOK_MARKER,
          prismarium_replaces_fingerprint: args.replacementWebhookFingerprint,
        },
      },
      {
        idempotencyKey: `${WEBHOOK_MARKER}-replace-${args.replacementWebhookFingerprint}`,
      },
    );
    if (!created.secret) throw new Error("webhook_signing_secret_not_returned");
    signingSecret = created.secret;
    endpoint = await stripe.webhookEndpoints.update(created.id, {
      disabled: true,
    });
    action = "replaced_and_disabled";
  }

  if (!endpoint || !webhookEndpointIsExact(endpoint)) {
    throw new Error("webhook_endpoint_failed_disabled_contract");
  }
  if (!signingSecret.startsWith("whsec_")) {
    throw new Error(
      `webhook_signing_secret_unavailable:${fingerprint(endpoint.id)}`,
    );
  }
  return { endpoint, signingSecret, action };
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  await assertVercelProject();
  assertGatesClosed(args);

  const secretKey = requiredEnvironmentValue("STRIPE_SECRET_KEY");
  if (!secretKey.startsWith("sk_live_")) {
    throw new Error("refusing_non_live_stripe_key");
  }
  const stripe = new Stripe(secretKey, { maxNetworkRetries: 1 });
  const account = await stripe.accounts.retrieve();
  if (fingerprint(account.id) !== args.expectedAccountFingerprint) {
    throw new Error("stripe_account_fingerprint_mismatch");
  }

  const portal = await findOrCreatePortal(stripe, args.acceptSafeDefault);
  const webhook = await findOrCreateDisabledWebhook(stripe, args);

  if (!args.inspectOnly) {
    addSensitiveProductionEnvironment(
      STAGED_WEBHOOK_SECRET_ENV,
      webhook.signingSecret,
    );
  }

  console.log(
    JSON.stringify(
      {
        status: args.inspectOnly ? "verified_disabled" : "configured_disabled",
        stripeMode: "live",
        stripeAccountFingerprint: args.expectedAccountFingerprint,
        portal: {
          action: portal.action,
          fingerprint: fingerprint(portal.configuration.id),
          safe: true,
          active: true,
          isDefault: portal.configuration.is_default,
          safeDefaultExplicitlyAccepted: args.acceptSafeDefault,
          planSwitchingEnabled: false,
        },
        webhook: {
          action: webhook.action,
          fingerprint: fingerprint(webhook.endpoint.id),
          status: webhook.endpoint.status,
          livemode: webhook.endpoint.livemode,
          host: new URL(webhook.endpoint.url).host,
          path: new URL(webhook.endpoint.url).pathname,
          exactEventAllowlist: true,
        },
        vercelProduction: {
          portalConfigurationStoredSensitive: true,
          webhookSecretStagedSensitive: args.inspectOnly ? null : true,
          activeWebhookSecretUntouched: true,
          deploymentTriggered: false,
        },
        protectedGatesClosed: true,
        customerOrSubscriptionDataAccessed: false,
        checkoutOrPaymentCreated: false,
        rawStripeIdsEmitted: false,
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: "stopped",
      reason: error instanceof Error ? error.message : "unknown_error",
      rawStripeIdsEmitted: false,
    }),
  );
  process.exitCode = 1;
});
