const PLAN_CODES = ["reader", "student", "scholar", "adept"] as const;
const STRIPE_STATUSES = [
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
const PRICING_COHORTS = [
  "none",
  "founding",
  "standard",
  "legacy",
  "unknown",
] as const;
const SUMMARY_KEYS = new Set([
  "planCode",
  "planName",
  "stripeStatus",
  "pricingCohort",
  "offerCode",
  "billingInterval",
  "amountCents",
  "currency",
  "currentPeriodStart",
  "currentPeriodEnd",
  "cancelAtPeriodEnd",
  "accessUntil",
  "paidEntitlementsActive",
  "billingHold",
  "portalAvailable",
  "reconcileAvailable",
]);

export type SafeBillingSummary = {
  planCode: (typeof PLAN_CODES)[number];
  planName: string;
  stripeStatus: (typeof STRIPE_STATUSES)[number];
  pricingCohort: (typeof PRICING_COHORTS)[number];
  offerCode: string | null;
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
};

export type BillingTimeline = {
  kind: "renewal" | "scheduled_end" | "access_end";
  date: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" && Number.isFinite(Date.parse(value)))
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/**
 * Treat even the same-origin route response as untrusted input. The exact-key
 * check also prevents an accidental raw Stripe identifier from crossing into
 * the account UI unnoticed.
 */
export function parseSafeBillingSummary(
  value: unknown
): SafeBillingSummary | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== SUMMARY_KEYS.size ||
    !Object.keys(value).every((key) => SUMMARY_KEYS.has(key))
  ) {
    return null;
  }

  if (
    !PLAN_CODES.includes(value.planCode as SafeBillingSummary["planCode"]) ||
    typeof value.planName !== "string" ||
    value.planName.trim().length === 0 ||
    !STRIPE_STATUSES.includes(
      value.stripeStatus as SafeBillingSummary["stripeStatus"]
    ) ||
    !PRICING_COHORTS.includes(
      value.pricingCohort as SafeBillingSummary["pricingCohort"]
    ) ||
    !isNullableString(value.offerCode) ||
    (value.billingInterval !== null && value.billingInterval !== "month") ||
    (value.amountCents !== null &&
      (typeof value.amountCents !== "number" ||
        !Number.isInteger(value.amountCents) ||
        value.amountCents < 0)) ||
    (value.currency !== null && value.currency !== "usd") ||
    !isTimestamp(value.currentPeriodStart) ||
    !isTimestamp(value.currentPeriodEnd) ||
    typeof value.cancelAtPeriodEnd !== "boolean" ||
    !isTimestamp(value.accessUntil) ||
    typeof value.paidEntitlementsActive !== "boolean" ||
    typeof value.billingHold !== "boolean" ||
    typeof value.portalAvailable !== "boolean" ||
    typeof value.reconcileAvailable !== "boolean"
  ) {
    return null;
  }

  return value as SafeBillingSummary;
}

export function billingTimelineFromSummary(
  billing: SafeBillingSummary
): BillingTimeline | null {
  if (billing.billingInterval === null) return null;

  if (billing.cancelAtPeriodEnd) {
    const date = billing.currentPeriodEnd ?? billing.accessUntil;
    return date ? { kind: "scheduled_end", date } : null;
  }

  if (
    (billing.stripeStatus === "active" ||
      billing.stripeStatus === "trialing") &&
    billing.currentPeriodEnd
  ) {
    return { kind: "renewal", date: billing.currentPeriodEnd };
  }

  return billing.accessUntil
    ? { kind: "access_end", date: billing.accessUntil }
    : null;
}
