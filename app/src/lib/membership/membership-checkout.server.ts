import "server-only";

import { createHash } from "node:crypto";

import {
  MEMBERSHIP_CATALOG_VERSION,
  MEMBERSHIP_PLAN_CODES,
  resolveMembershipCheckoutOffer,
  type CatalogEnvironment,
  type MembershipOfferCode,
  type MembershipPlanCode,
} from "@/lib/membership/membership-catalog.server";

// Keep this local to avoid coupling Checkout eligibility to entitlement dates.
const CHECKOUT_BLOCKING_STATUSES = new Set([
  "active",
  "trialing",
  "incomplete",
  "past_due",
  "paused",
  "unpaid",
  "unknown",
]);
const CHECKOUT_STRIPE_STATUSES = [
  "none",
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
  "unknown",
] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STRIPE_CUSTOMER_PATTERN = /^cus_[A-Za-z0-9]+$/;
const STRIPE_SESSION_PATTERN = /^cs_(?:test_|live_)?[A-Za-z0-9]+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export interface MembershipCheckoutRequest {
  offerCode: MembershipOfferCode;
  requestId: string;
}

export interface CheckoutMembershipProjection {
  plan_code: MembershipPlanCode;
  stripe_status: string;
  billing_hold: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface CheckoutRequestRecord {
  request_fingerprint: string;
  state: "pending" | "session_created";
  stripe_checkout_session_id: string | null;
  checkout_url: string | null;
}

export interface CheckoutSessionCreation {
  customerId: string | null;
  customerEmail: string | null;
  offerCode: MembershipOfferCode;
  planCode: Exclude<MembershipPlanCode, "reader">;
  priceId: string;
  requestId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export interface CreatedCheckoutSession {
  id: string;
  url: string | null;
}

export interface MembershipCheckoutDependencies {
  environment?: CatalogEnvironment;
  loadMembership: (
    userId: string,
  ) => Promise<CheckoutMembershipProjection | null>;
  reserveRequest: (input: {
    userId: string;
    requestId: string;
    offerCode: MembershipOfferCode;
    requestFingerprint: string;
  }) => Promise<{ inserted: boolean; record: CheckoutRequestRecord }>;
  completeRequest: (input: {
    userId: string;
    requestId: string;
    requestFingerprint: string;
    sessionId: string;
    checkoutUrl: string;
  }) => Promise<void>;
  createSession: (
    input: CheckoutSessionCreation,
  ) => Promise<CreatedCheckoutSession>;
  appUrl: string;
}

export type MembershipCheckoutErrorCode =
  | "INVALID_CHECKOUT_REQUEST"
  | "CHECKOUT_UNAVAILABLE"
  | "ACTIVE_MEMBERSHIP_EXISTS"
  | "CHECKOUT_REQUEST_CONFLICT";

export class MembershipCheckoutError extends Error {
  constructor(
    readonly code: MembershipCheckoutErrorCode,
    readonly status: 400 | 409 | 503,
  ) {
    super(code);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseMembershipCheckoutRequest(
  value: unknown,
): MembershipCheckoutRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MembershipCheckoutError("INVALID_CHECKOUT_REQUEST", 400);
  }
  const body = value as Record<string, unknown>;
  const keys = Object.keys(body).sort();
  if (
    keys.length !== 2 ||
    keys[0] !== "offerCode" ||
    keys[1] !== "requestId" ||
    typeof body.offerCode !== "string" ||
    typeof body.requestId !== "string" ||
    !UUID_PATTERN.test(body.requestId)
  ) {
    throw new MembershipCheckoutError("INVALID_CHECKOUT_REQUEST", 400);
  }

  return {
    offerCode: body.offerCode as MembershipOfferCode,
    requestId: body.requestId.toLowerCase(),
  };
}

function isProjectionShape(
  value: CheckoutMembershipProjection,
): value is CheckoutMembershipProjection {
  return (
    MEMBERSHIP_PLAN_CODES.includes(value.plan_code) &&
    CHECKOUT_STRIPE_STATUSES.includes(
      value.stripe_status as (typeof CHECKOUT_STRIPE_STATUSES)[number],
    ) &&
    typeof value.billing_hold === "boolean" &&
    (value.stripe_customer_id === null ||
      STRIPE_CUSTOMER_PATTERN.test(value.stripe_customer_id)) &&
    (value.stripe_subscription_id === null ||
      /^sub_[A-Za-z0-9]+$/.test(value.stripe_subscription_id))
  );
}

export function checkoutCustomerForProjection(
  projection: CheckoutMembershipProjection | null,
): string | null {
  if (projection === null) return null;
  if (!isProjectionShape(projection) || projection.billing_hold) {
    throw new MembershipCheckoutError("CHECKOUT_UNAVAILABLE", 503);
  }
  if (CHECKOUT_BLOCKING_STATUSES.has(projection.stripe_status)) {
    throw new MembershipCheckoutError("ACTIVE_MEMBERSHIP_EXISTS", 409);
  }

  const canonicalReader =
    projection.plan_code === "reader" &&
    projection.stripe_status === "none" &&
    projection.stripe_customer_id === null &&
    projection.stripe_subscription_id === null;
  const terminalPaid =
    projection.plan_code !== "reader" &&
    (projection.stripe_status === "canceled" ||
      projection.stripe_status === "incomplete_expired") &&
    projection.stripe_subscription_id !== null;
  if (!canonicalReader && !terminalPaid) {
    throw new MembershipCheckoutError("CHECKOUT_UNAVAILABLE", 503);
  }

  return projection.stripe_customer_id;
}

function assertStoredSession(record: CheckoutRequestRecord): {
  sessionId: string;
  url: string;
} {
  if (
    record.state !== "session_created" ||
    !record.stripe_checkout_session_id ||
    !STRIPE_SESSION_PATTERN.test(record.stripe_checkout_session_id) ||
    !record.checkout_url
  ) {
    throw new MembershipCheckoutError("CHECKOUT_UNAVAILABLE", 503);
  }
  try {
    if (new URL(record.checkout_url).protocol !== "https:") throw new Error();
  } catch {
    throw new MembershipCheckoutError("CHECKOUT_UNAVAILABLE", 503);
  }
  return {
    sessionId: record.stripe_checkout_session_id,
    url: record.checkout_url,
  };
}

export async function createMembershipCheckout(
  input: {
    userId: string;
    userEmail: string | null;
    request: MembershipCheckoutRequest;
  },
  dependencies: MembershipCheckoutDependencies,
): Promise<{ sessionId: string; url: string; replayed: boolean }> {
  const environment = dependencies.environment ?? process.env;
  const offer = resolveMembershipCheckoutOffer(
    input.request.offerCode,
    environment,
  );
  if (!offer) {
    throw new MembershipCheckoutError("CHECKOUT_UNAVAILABLE", 503);
  }

  const projection = await dependencies.loadMembership(input.userId);
  const customerId = checkoutCustomerForProjection(projection);
  if (!customerId && !input.userEmail) {
    throw new MembershipCheckoutError("CHECKOUT_UNAVAILABLE", 503);
  }

  const requestFingerprint = sha256(
    JSON.stringify({
      version: MEMBERSHIP_CATALOG_VERSION,
      userId: input.userId,
      requestId: input.request.requestId,
      offerCode: offer.code,
      priceId: offer.stripePriceId,
    }),
  );
  const reservation = await dependencies.reserveRequest({
    userId: input.userId,
    requestId: input.request.requestId,
    offerCode: offer.code,
    requestFingerprint,
  });
  if (
    !SHA256_PATTERN.test(reservation.record.request_fingerprint) ||
    reservation.record.request_fingerprint !== requestFingerprint
  ) {
    throw new MembershipCheckoutError("CHECKOUT_REQUEST_CONFLICT", 409);
  }
  if (!reservation.inserted && reservation.record.state === "session_created") {
    return { ...assertStoredSession(reservation.record), replayed: true };
  }

  const appUrl = dependencies.appUrl.replace(/\/+$/, "");
  const created = await dependencies.createSession({
    customerId,
    customerEmail: customerId ? null : input.userEmail,
    offerCode: offer.code,
    planCode: offer.planCode,
    priceId: offer.stripePriceId,
    requestId: input.request.requestId,
    userId: input.userId,
    successUrl: `${appUrl}/profile?tab=subscription&checkout=success`,
    cancelUrl: `${appUrl}/profile?tab=subscription&checkout=canceled`,
    idempotencyKey: `prismarium-checkout-v1-${sha256(
      `${input.userId}:${input.request.requestId}`,
    )}`,
  });
  if (!STRIPE_SESSION_PATTERN.test(created.id) || !created.url) {
    throw new MembershipCheckoutError("CHECKOUT_UNAVAILABLE", 503);
  }
  try {
    if (new URL(created.url).protocol !== "https:") throw new Error();
  } catch {
    throw new MembershipCheckoutError("CHECKOUT_UNAVAILABLE", 503);
  }

  await dependencies.completeRequest({
    userId: input.userId,
    requestId: input.request.requestId,
    requestFingerprint,
    sessionId: created.id,
    checkoutUrl: created.url,
  });
  return { sessionId: created.id, url: created.url, replayed: false };
}
