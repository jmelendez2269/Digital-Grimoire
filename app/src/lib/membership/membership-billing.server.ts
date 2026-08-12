import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type Stripe from "stripe";

import {
  getSafeMembershipCatalog,
  type CatalogEnvironment,
  type MembershipOfferCode,
  type MembershipPlanCode,
} from "@/lib/membership/membership-catalog.server";
import {
  MEMBERSHIP_PRICING_COHORTS,
  MEMBERSHIP_STRIPE_STATUSES,
  type MembershipPricingCohort,
  type MembershipStripeStatus,
} from "@/lib/membership/membership-entitlement-resolver.server";
import {
  normalizeMembershipSubscriptionSnapshot,
  type NormalizedMembershipSubscriptionSnapshot,
} from "@/lib/membership/membership-webhook.server";

export const BILLING_OPERATIONS_ENABLED_ENV =
  "PRISMARIUM_BILLING_OPERATIONS_ENABLED" as const;
export const STRIPE_PORTAL_CONFIGURATION_ENV =
  "PRISMARIUM_STRIPE_PORTAL_CONFIGURATION_ID" as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUSTOMER_PATTERN = /^cus_[A-Za-z0-9]+$/;
const SUBSCRIPTION_PATTERN = /^sub_[A-Za-z0-9]+$/;
const PORTAL_CONFIGURATION_PATTERN = /^bpc_[A-Za-z0-9]+$/;
const PAID_ACTIVE_STATUSES = new Set<MembershipStripeStatus>([
  "active",
  "trialing",
]);

export interface BillingMembershipProjection {
  user_id: string;
  plan_code: MembershipPlanCode;
  stripe_status: MembershipStripeStatus;
  pricing_cohort: MembershipPricingCohort;
  offer_code: MembershipOfferCode | null;
  billing_interval: "month" | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  access_until: string | null;
  billing_hold: boolean;
}

export interface SafeBillingSummary {
  planCode: MembershipPlanCode;
  planName: string;
  stripeStatus: MembershipStripeStatus;
  pricingCohort: MembershipPricingCohort;
  offerCode: MembershipOfferCode | null;
  billingInterval: "month" | null;
  amountCents: number | null;
  currency: "usd" | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  accessUntil: string | null;
  paidEntitlementsActive: boolean;
  billingHold: boolean;
  portalAvailable: boolean;
  reconcileAvailable: boolean;
}

export type BillingOperationErrorCode =
  | "BILLING_OPERATIONS_UNAVAILABLE"
  | "BILLING_MEMBERSHIP_UNAVAILABLE"
  | "BILLING_PORTAL_CONFIGURATION_UNSAFE"
  | "BILLING_RECONCILIATION_QUARANTINED";

export class BillingOperationError extends Error {
  constructor(
    readonly code: BillingOperationErrorCode,
    readonly status: 409 | 503,
  ) {
    super(code);
  }
}

export interface PortalConfigurationProjection {
  id: string;
  active: boolean;
  features: {
    customer_update: { enabled: boolean };
    invoice_history: { enabled: boolean };
    payment_method_update: { enabled: boolean };
    subscription_cancel: { enabled: boolean };
    subscription_pause?: { enabled: boolean };
    subscription_update: { enabled: boolean };
  };
}

export interface MembershipPortalDependencies {
  environment?: CatalogEnvironment;
  loadMembership: (userId: string) => Promise<unknown>;
  retrievePortalConfiguration: (
    configurationId: string,
  ) => Promise<PortalConfigurationProjection>;
  createPortalSession: (input: {
    customerId: string;
    configurationId: string;
    returnUrl: string;
  }) => Promise<{ url: string }>;
  returnUrl: string;
}

export interface MembershipReconciliationDependencies {
  environment?: CatalogEnvironment;
  loadMembership: (userId: string) => Promise<unknown>;
  retrieveSubscription: (subscriptionId: string) => Promise<Stripe.Subscription>;
  applySnapshot: (input: {
    requestId: string;
    userId: string;
    retrievedAt: number;
    snapshotSha256: string;
    snapshot: NormalizedMembershipSubscriptionSnapshot;
  }) => Promise<string>;
  now?: () => Date;
  requestId?: () => string;
}

function isIsoTimestamp(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" && Number.isFinite(Date.parse(value)))
  );
}

function isProjection(value: unknown): value is BillingMembershipProjection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.user_id === "string" &&
    UUID_PATTERN.test(row.user_id) &&
    typeof row.plan_code === "string" &&
    ["reader", "student", "scholar", "adept"].includes(row.plan_code) &&
    typeof row.stripe_status === "string" &&
    MEMBERSHIP_STRIPE_STATUSES.includes(
      row.stripe_status as MembershipStripeStatus,
    ) &&
    typeof row.pricing_cohort === "string" &&
    MEMBERSHIP_PRICING_COHORTS.includes(
      row.pricing_cohort as MembershipPricingCohort,
    ) &&
    (row.offer_code === null || typeof row.offer_code === "string") &&
    (row.billing_interval === null || row.billing_interval === "month") &&
    (row.stripe_customer_id === null ||
      (typeof row.stripe_customer_id === "string" &&
        CUSTOMER_PATTERN.test(row.stripe_customer_id))) &&
    (row.stripe_subscription_id === null ||
      (typeof row.stripe_subscription_id === "string" &&
        SUBSCRIPTION_PATTERN.test(row.stripe_subscription_id))) &&
    isIsoTimestamp(row.current_period_start) &&
    isIsoTimestamp(row.current_period_end) &&
    typeof row.cancel_at_period_end === "boolean" &&
    isIsoTimestamp(row.access_until) &&
    typeof row.billing_hold === "boolean"
  );
}

function paidEntitlementsAreActive(
  row: BillingMembershipProjection,
  now: Date,
): boolean {
  return (
    row.plan_code !== "reader" &&
    PAID_ACTIVE_STATUSES.has(row.stripe_status) &&
    row.billing_hold === false &&
    row.access_until !== null &&
    Date.parse(row.access_until) > now.getTime()
  );
}

function readerSummary(environment: CatalogEnvironment): SafeBillingSummary {
  const reader = getSafeMembershipCatalog(environment).plans.find(
    (plan) => plan.code === "reader",
  );
  if (!reader) throw new Error("MEMBERSHIP_CATALOG_READER_MISSING");
  return {
    planCode: "reader",
    planName: reader.name,
    stripeStatus: "none",
    pricingCohort: "none",
    offerCode: null,
    billingInterval: null,
    amountCents: null,
    currency: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    accessUntil: null,
    paidEntitlementsActive: false,
    billingHold: false,
    portalAvailable: false,
    reconcileAvailable: false,
  };
}

export function billingOperationsEnabled(
  environment: CatalogEnvironment = process.env,
): boolean {
  return environment[BILLING_OPERATIONS_ENABLED_ENV] === "true";
}

export function billingSummaryFromProjection(
  value: unknown,
  environment: CatalogEnvironment = process.env,
  now = new Date(),
): SafeBillingSummary {
  if (value === null) return readerSummary(environment);
  if (!isProjection(value)) {
    throw new BillingOperationError("BILLING_MEMBERSHIP_UNAVAILABLE", 503);
  }

  const catalog = getSafeMembershipCatalog(environment);
  const plan = catalog.plans.find((candidate) => candidate.code === value.plan_code);
  const offer = value.offer_code
    ? catalog.offers.find((candidate) => candidate.code === value.offer_code)
    : null;
  if (!plan || (value.offer_code !== null && !offer)) {
    throw new BillingOperationError("BILLING_MEMBERSHIP_UNAVAILABLE", 503);
  }

  const operationsAvailable = billingOperationsEnabled(environment);
  const hasExactStripeIdentity =
    value.stripe_customer_id !== null && value.stripe_subscription_id !== null;
  return {
    planCode: value.plan_code,
    planName: plan.name,
    stripeStatus: value.stripe_status,
    pricingCohort: value.pricing_cohort,
    offerCode: value.offer_code,
    billingInterval: value.billing_interval,
    amountCents: offer?.amountCents ?? null,
    currency: offer?.currency ?? null,
    currentPeriodStart: value.current_period_start,
    currentPeriodEnd: value.current_period_end,
    cancelAtPeriodEnd: value.cancel_at_period_end,
    accessUntil: value.access_until,
    paidEntitlementsActive: paidEntitlementsAreActive(value, now),
    billingHold: value.billing_hold,
    portalAvailable:
      operationsAvailable && hasExactStripeIdentity && !value.billing_hold,
    reconcileAvailable:
      operationsAvailable && hasExactStripeIdentity && !value.billing_hold,
  };
}

export function assertSafePortalConfiguration(
  configuration: PortalConfigurationProjection,
  expectedId: string,
): void {
  const features = configuration.features;
  if (
    configuration.id !== expectedId ||
    configuration.active !== true ||
    features?.customer_update?.enabled !== false ||
    features?.invoice_history?.enabled !== true ||
    features?.payment_method_update?.enabled !== true ||
    features?.subscription_cancel?.enabled !== true ||
    features?.subscription_pause?.enabled === true ||
    features?.subscription_update?.enabled !== false
  ) {
    throw new BillingOperationError(
      "BILLING_PORTAL_CONFIGURATION_UNSAFE",
      503,
    );
  }
}

function requireBillingOperations(environment: CatalogEnvironment): string {
  const configurationId = environment[STRIPE_PORTAL_CONFIGURATION_ENV];
  if (
    !billingOperationsEnabled(environment) ||
    !configurationId ||
    !PORTAL_CONFIGURATION_PATTERN.test(configurationId)
  ) {
    throw new BillingOperationError("BILLING_OPERATIONS_UNAVAILABLE", 503);
  }
  return configurationId;
}

function requireCustomerScopedProjection(
  value: unknown,
  userId: string,
): BillingMembershipProjection {
  if (
    !isProjection(value) ||
    value.user_id !== userId ||
    value.plan_code === "reader" ||
    value.offer_code === null ||
    value.billing_interval !== "month" ||
    value.billing_hold ||
    !value.stripe_customer_id ||
    !value.stripe_subscription_id
  ) {
    throw new BillingOperationError("BILLING_MEMBERSHIP_UNAVAILABLE", 409);
  }
  return value;
}

export async function createMembershipPortalSession(
  userId: string,
  dependencies: MembershipPortalDependencies,
): Promise<{ url: string }> {
  const environment = dependencies.environment ?? process.env;
  const configurationId = requireBillingOperations(environment);
  const projection = requireCustomerScopedProjection(
    await dependencies.loadMembership(userId),
    userId,
  );
  const configuration = await dependencies.retrievePortalConfiguration(
    configurationId,
  );
  assertSafePortalConfiguration(configuration, configurationId);

  const session = await dependencies.createPortalSession({
    customerId: projection.stripe_customer_id!,
    configurationId,
    returnUrl: dependencies.returnUrl,
  });
  try {
    if (new URL(session.url).protocol !== "https:") throw new Error();
  } catch {
    throw new BillingOperationError("BILLING_OPERATIONS_UNAVAILABLE", 503);
  }
  return { url: session.url };
}

function snapshotHash(
  userId: string,
  snapshot: NormalizedMembershipSubscriptionSnapshot,
): string {
  return createHash("sha256")
    .update(JSON.stringify({ userId, snapshot }))
    .digest("hex");
}

function quarantineSnapshot(
  snapshot: NormalizedMembershipSubscriptionSnapshot,
  errorCode: string,
): NormalizedMembershipSubscriptionSnapshot {
  return { ...snapshot, kind: "quarantine", errorCode };
}

export async function reconcileMembershipSubscription(
  userId: string,
  dependencies: MembershipReconciliationDependencies,
): Promise<{ disposition: string }> {
  const environment = dependencies.environment ?? process.env;
  requireBillingOperations(environment);
  const projection = requireCustomerScopedProjection(
    await dependencies.loadMembership(userId),
    userId,
  );
  const subscription = await dependencies.retrieveSubscription(
    projection.stripe_subscription_id!,
  );
  let snapshot = normalizeMembershipSubscriptionSnapshot(
    subscription,
    environment,
  );
  if (snapshot.userId !== userId) {
    snapshot = quarantineSnapshot(snapshot, "RECONCILIATION_USER_MISMATCH");
  }
  if (
    snapshot.stripeCustomerId !== projection.stripe_customer_id ||
    snapshot.stripeSubscriptionId !== projection.stripe_subscription_id
  ) {
    snapshot = quarantineSnapshot(snapshot, "RECONCILIATION_IDENTITY_MISMATCH");
  }

  const now = dependencies.now?.() ?? new Date();
  const retrievedAt = Math.floor(now.getTime() / 1000);
  const requestId = dependencies.requestId?.() ?? randomUUID();
  const disposition = await dependencies.applySnapshot({
    requestId,
    userId,
    retrievedAt,
    snapshotSha256: snapshotHash(userId, snapshot),
    snapshot,
  });
  if (snapshot.kind !== "project" || disposition.includes("quarantined")) {
    throw new BillingOperationError(
      "BILLING_RECONCILIATION_QUARANTINED",
      409,
    );
  }
  return { disposition };
}
