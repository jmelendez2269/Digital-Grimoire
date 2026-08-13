import "server-only";

import { createHash } from "node:crypto";

import Stripe from "stripe";

import {
  resolveMembershipOfferByStripePriceId,
  type CatalogEnvironment,
  type MembershipOfferCode,
  type MembershipPlanCode,
} from "@/lib/membership/membership-catalog.server";
import type {
  MembershipPricingCohort,
  MembershipStripeStatus,
} from "@/lib/membership/membership-entitlement-resolver.server";

const PROJECTED_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);
const STRIPE_STATUSES = new Set<MembershipStripeStatus>([
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUSTOMER_PATTERN = /^cus_[A-Za-z0-9]+$/;
const SUBSCRIPTION_PATTERN = /^sub_[A-Za-z0-9]+$/;

export type StripeWebhookKind = "project" | "quarantine" | "ignore";

export interface NormalizedMembershipSubscriptionSnapshot {
  kind: Exclude<StripeWebhookKind, "ignore">;
  errorCode: string | null;
  userId: string | null;
  planCode: MembershipPlanCode | null;
  pricingCohort: MembershipPricingCohort | null;
  offerCode: MembershipOfferCode | null;
  stripeStatus: MembershipStripeStatus | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
}

export interface NormalizedMembershipWebhookEvent {
  eventId: string;
  eventType: string;
  livemode: boolean;
  apiVersion: string | null;
  eventCreated: number;
  payloadSha256: string;
  kind: StripeWebhookKind;
  errorCode: string | null;
  userId: string | null;
  planCode: MembershipPlanCode | null;
  pricingCohort: MembershipPricingCohort | null;
  offerCode: MembershipOfferCode | null;
  stripeStatus: MembershipStripeStatus | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
}

export function stripeLivemodeFromSecretKey(
  secretKey: string,
): boolean | null {
  if (/^(?:sk|rk)_live_/.test(secretKey)) return true;
  if (/^(?:sk|rk)_test_/.test(secretKey)) return false;
  return null;
}

export function stripeWebhookPayloadSha256(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

function objectId(
  value: string | { id?: string } | null | undefined,
  pattern: RegExp,
): string | null {
  const id = typeof value === "string" ? value : value?.id;
  return typeof id === "string" && pattern.test(id) ? id : null;
}

function isoTimestamp(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  const date = new Date(value * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function baseEvent(
  event: Stripe.Event,
  payloadSha256: string,
): Omit<NormalizedMembershipWebhookEvent, "kind" | "errorCode"> {
  return {
    eventId: event.id,
    eventType: event.type,
    livemode: event.livemode,
    apiVersion: event.api_version ?? null,
    eventCreated: event.created,
    payloadSha256,
    userId: null,
    planCode: null,
    pricingCohort: null,
    offerCode: null,
    stripeStatus: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: null,
  };
}

function quarantine(
  base: Omit<NormalizedMembershipWebhookEvent, "kind" | "errorCode">,
  errorCode: string,
  partial: Partial<NormalizedMembershipWebhookEvent> = {},
): NormalizedMembershipWebhookEvent {
  return { ...base, ...partial, kind: "quarantine", errorCode };
}

function quarantineSubscription(
  errorCode: string,
  partial: Partial<NormalizedMembershipSubscriptionSnapshot> = {},
): NormalizedMembershipSubscriptionSnapshot {
  return {
    kind: "quarantine",
    errorCode,
    userId: null,
    planCode: null,
    pricingCohort: null,
    offerCode: null,
    stripeStatus: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: null,
    ...partial,
  };
}

/**
 * Normalize a Stripe Subscription obtained either from a verified webhook or
 * from an exact customer-scoped reconciliation read. It never infers a plan.
 */
export function normalizeMembershipSubscriptionSnapshot(
  subscription: Stripe.Subscription,
  environment: CatalogEnvironment = process.env,
): NormalizedMembershipSubscriptionSnapshot {
  const subscriptionId = objectId(subscription?.id, SUBSCRIPTION_PATTERN);
  const customerId = objectId(subscription?.customer, CUSTOMER_PATTERN);
  const userId = UUID_PATTERN.test(subscription?.metadata?.user_id ?? "")
    ? subscription.metadata.user_id.toLowerCase()
    : null;
  const identity = {
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
  };
  if (
    subscription?.object !== "subscription" ||
    !subscriptionId ||
    !customerId
  ) {
    return quarantineSubscription("INVALID_SUBSCRIPTION_IDENTITY", identity);
  }
  if (subscription.items?.data?.length !== 1) {
    return quarantineSubscription("AMBIGUOUS_SUBSCRIPTION_ITEMS", identity);
  }

  const item = subscription.items.data[0];
  const offer = resolveMembershipOfferByStripePriceId(
    item?.price?.id,
    environment,
  );
  if (!offer) {
    return quarantineSubscription("UNKNOWN_SUBSCRIPTION_PRICE", identity);
  }
  const offerIdentity = {
    ...identity,
    planCode: offer.planCode,
    offerCode: offer.code,
  };
  if (
    subscription.metadata?.offer_code &&
    subscription.metadata.offer_code !== offer.code
  ) {
    return quarantineSubscription(
      "SUBSCRIPTION_OFFER_METADATA_MISMATCH",
      offerIdentity,
    );
  }
  if (!STRIPE_STATUSES.has(subscription.status as MembershipStripeStatus)) {
    return quarantineSubscription("INVALID_SUBSCRIPTION_STATUS", offerIdentity);
  }

  const currentPeriodStart = isoTimestamp(item.current_period_start);
  const currentPeriodEnd = isoTimestamp(item.current_period_end);
  if (
    !currentPeriodStart ||
    !currentPeriodEnd ||
    Date.parse(currentPeriodEnd) < Date.parse(currentPeriodStart) ||
    item.quantity !== 1
  ) {
    return quarantineSubscription("INVALID_SUBSCRIPTION_PERIOD", offerIdentity);
  }

  return {
    ...offerIdentity,
    kind: "project",
    errorCode: null,
    pricingCohort:
      offer.code === "student_founding_monthly" ? "founding" : "standard",
    stripeStatus: subscription.status as MembershipStripeStatus,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

/**
 * Convert one verified Stripe Event into the narrow service-owned projection
 * input. No Stripe follow-up reads are necessary or allowed by this layer.
 */
export function normalizeMembershipWebhookEvent(
  event: Stripe.Event,
  payloadSha256: string,
  environment: CatalogEnvironment = process.env,
): NormalizedMembershipWebhookEvent {
  const base = baseEvent(event, payloadSha256);
  if (!PROJECTED_EVENT_TYPES.has(event.type)) {
    return { ...base, kind: "ignore", errorCode: "EVENT_TYPE_NOT_PROJECTED" };
  }

  const subscription = event.data.object as Stripe.Subscription;
  const snapshot = normalizeMembershipSubscriptionSnapshot(
    subscription,
    environment,
  );
  if (
    snapshot.kind === "project" &&
    event.type === "customer.subscription.deleted" &&
    snapshot.stripeStatus !== "canceled"
  ) {
    return quarantine(base, "INVALID_SUBSCRIPTION_STATUS", snapshot);
  }
  return {
    ...base,
    ...snapshot,
  };
}
