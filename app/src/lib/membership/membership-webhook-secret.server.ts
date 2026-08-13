import "server-only";

import type Stripe from "stripe";

export const STAGED_WEBHOOK_SECRET_ENV =
  "PRISMARIUM_STRIPE_WEBHOOK_SECRET_STAGED" as const;
export const LEGACY_WEBHOOK_SECRET_ENV = "STRIPE_WEBHOOK_SECRET" as const;

type WebhookEnvironment = Record<string, string | undefined>;

const WEBHOOK_SECRET_PATTERN = /^whsec_[A-Za-z0-9]+$/;

export function configuredMembershipWebhookSecrets(
  environment: WebhookEnvironment = process.env,
): string[] {
  const secrets = [
    environment[STAGED_WEBHOOK_SECRET_ENV],
    environment[LEGACY_WEBHOOK_SECRET_ENV],
  ].filter(
    (value): value is string =>
      typeof value === "string" && WEBHOOK_SECRET_PATTERN.test(value),
  );

  return [...new Set(secrets)];
}

/**
 * Accept the staged endpoint first while retaining legacy delivery during the
 * cutover. Raw secrets and signature failures never leave this server helper.
 */
export function constructMembershipWebhookEvent(
  stripe: Stripe,
  rawBody: string,
  signature: string,
  environment: WebhookEnvironment = process.env,
): Stripe.Event | null {
  for (const secret of configuredMembershipWebhookSecrets(environment)) {
    try {
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      // Try the next configured endpoint secret without logging either value.
    }
  }
  return null;
}
