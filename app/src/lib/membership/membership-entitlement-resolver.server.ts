import "server-only";

import {
  MEMBERSHIP_PLAN_CODES,
  getSafeMembershipCatalog,
  type CatalogEnvironment,
  type MembershipPlanCode,
} from "@/lib/membership/membership-catalog.server";
import { createServiceClient } from "@/lib/supabase/service";

export const MEMBERSHIP_STRIPE_STATUSES = [
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

export const MEMBERSHIP_PRICING_COHORTS = [
  "none",
  "founding",
  "standard",
  "legacy",
  "unknown",
] as const;

export type MembershipStripeStatus =
  (typeof MEMBERSHIP_STRIPE_STATUSES)[number];
export type MembershipPricingCohort =
  (typeof MEMBERSHIP_PRICING_COHORTS)[number];

interface BillingMembershipRow {
  plan_code: MembershipPlanCode;
  stripe_status: MembershipStripeStatus;
  pricing_cohort: MembershipPricingCohort;
  billing_hold: boolean;
  access_until: string | null;
}

export interface MembershipEntitlementRequest {
  userId: string;
  courseSlug?: string | null;
}

export type MembershipResolutionReason =
  | "active_membership"
  | "reader_default"
  | "billing_hold"
  | "inactive_billing_status"
  | "invalid_membership_projection"
  | "membership_lookup_failed";

export interface MembershipEntitlementResolution {
  planCode: MembershipPlanCode;
  monthlyCredits: number;
  paidEntitlementsActive: boolean;
  failClosed: boolean;
  reason: MembershipResolutionReason;
  course: {
    slug: string | null;
    entitled: boolean;
    source: "free_allowlist" | "member_release_allowlist" | "not_allowlisted";
  };
}

interface MembershipResolverDependencies {
  environment?: CatalogEnvironment;
  loadMembership?: (userId: string) => Promise<unknown>;
  now?: Date;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COURSE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PAID_ACTIVE_STATUSES = new Set<MembershipStripeStatus>([
  "active",
  "trialing",
]);
const PAID_COHORTS = new Set<MembershipPricingCohort>([
  "founding",
  "standard",
  "legacy",
]);

function isPlanCode(value: unknown): value is MembershipPlanCode {
  return (
    typeof value === "string" &&
    MEMBERSHIP_PLAN_CODES.includes(value as MembershipPlanCode)
  );
}

function isStripeStatus(value: unknown): value is MembershipStripeStatus {
  return (
    typeof value === "string" &&
    MEMBERSHIP_STRIPE_STATUSES.includes(value as MembershipStripeStatus)
  );
}

function isPricingCohort(value: unknown): value is MembershipPricingCohort {
  return (
    typeof value === "string" &&
    MEMBERSHIP_PRICING_COHORTS.includes(value as MembershipPricingCohort)
  );
}

function isBillingMembershipRow(value: unknown): value is BillingMembershipRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    isPlanCode(row.plan_code) &&
    isStripeStatus(row.stripe_status) &&
    isPricingCohort(row.pricing_cohort) &&
    typeof row.billing_hold === "boolean" &&
    (typeof row.access_until === "string" || row.access_until === null)
  );
}

async function loadMembershipFromDatabase(userId: string): Promise<unknown> {
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase
    .from("billing_memberships")
    .select(
      "plan_code, stripe_status, pricing_cohort, billing_hold, access_until",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("MEMBERSHIP_LOOKUP_FAILED");
  return data;
}

function resolveCourse(
  courseSlug: string | null,
  planCode: MembershipPlanCode,
  paidEntitlementsActive: boolean,
  environment: CatalogEnvironment,
): MembershipEntitlementResolution["course"] {
  const catalog = getSafeMembershipCatalog(environment);
  if (!courseSlug || !COURSE_SLUG_PATTERN.test(courseSlug)) {
    return { slug: courseSlug, entitled: false, source: "not_allowlisted" };
  }

  if (catalog.courses.freeCourseSlugs.includes(courseSlug)) {
    return { slug: courseSlug, entitled: true, source: "free_allowlist" };
  }

  if (!paidEntitlementsActive) {
    return { slug: courseSlug, entitled: false, source: "not_allowlisted" };
  }

  const memberReleased = catalog.courses.memberReleasedCourseSlugs.includes(
    courseSlug,
  );
  const planAllowsCourse =
    (planCode === "student" &&
      courseSlug === catalog.courses.studentLaunchCourseSlug) ||
    ((planCode === "scholar" || planCode === "adept") && memberReleased);

  return planAllowsCourse && memberReleased
    ? {
        slug: courseSlug,
        entitled: true,
        source: "member_release_allowlist",
      }
    : { slug: courseSlug, entitled: false, source: "not_allowlisted" };
}

function readerResolution(
  courseSlug: string | null,
  environment: CatalogEnvironment,
  reason: Exclude<MembershipResolutionReason, "active_membership">,
  failClosed: boolean,
): MembershipEntitlementResolution {
  const catalog = getSafeMembershipCatalog(environment);
  const reader = catalog.plans.find((plan) => plan.code === "reader");
  if (!reader) throw new Error("MEMBERSHIP_CATALOG_READER_MISSING");

  return {
    planCode: "reader",
    monthlyCredits: reader.monthlyCredits,
    paidEntitlementsActive: false,
    failClosed,
    reason,
    course: resolveCourse(courseSlug, "reader", false, environment),
  };
}

/**
 * Resolve effective membership entirely on the server. The database row can
 * identify a paid member, but only a recognized active/trialing state, known
 * cohort, absent billing hold, and the explicit catalog release allowlist can
 * grant paid course access. Database course publication is never consulted.
 */
export async function resolveMembershipEntitlement(
  request: MembershipEntitlementRequest,
  dependencies: MembershipResolverDependencies = {},
): Promise<MembershipEntitlementResolution> {
  const environment = dependencies.environment ?? process.env;
  const now = dependencies.now ?? new Date();
  const courseSlug = request.courseSlug ?? null;

  if (!UUID_PATTERN.test(request.userId)) {
    return readerResolution(
      courseSlug,
      environment,
      "invalid_membership_projection",
      true,
    );
  }

  let rawMembership: unknown;
  try {
    rawMembership = await (dependencies.loadMembership ??
      loadMembershipFromDatabase)(request.userId);
  } catch {
    return readerResolution(
      courseSlug,
      environment,
      "membership_lookup_failed",
      true,
    );
  }

  if (rawMembership === null) {
    return readerResolution(
      courseSlug,
      environment,
      "reader_default",
      false,
    );
  }
  if (!isBillingMembershipRow(rawMembership)) {
    return readerResolution(
      courseSlug,
      environment,
      "invalid_membership_projection",
      true,
    );
  }

  if (rawMembership.plan_code === "reader") {
    const readerStateValid =
      rawMembership.stripe_status === "none" &&
      rawMembership.pricing_cohort === "none" &&
      rawMembership.billing_hold === false &&
      rawMembership.access_until === null;
    return readerResolution(
      courseSlug,
      environment,
      readerStateValid ? "reader_default" : "invalid_membership_projection",
      !readerStateValid,
    );
  }

  if (rawMembership.billing_hold) {
    return readerResolution(
      courseSlug,
      environment,
      "billing_hold",
      true,
    );
  }
  if (
    !PAID_ACTIVE_STATUSES.has(rawMembership.stripe_status) ||
    !PAID_COHORTS.has(rawMembership.pricing_cohort) ||
    rawMembership.access_until === null ||
    !Number.isFinite(Date.parse(rawMembership.access_until)) ||
    Date.parse(rawMembership.access_until) <= now.getTime()
  ) {
    return readerResolution(
      courseSlug,
      environment,
      "inactive_billing_status",
      true,
    );
  }

  const catalog = getSafeMembershipCatalog(environment);
  const plan = catalog.plans.find(
    (candidate) => candidate.code === rawMembership.plan_code,
  );
  if (!plan) {
    return readerResolution(
      courseSlug,
      environment,
      "invalid_membership_projection",
      true,
    );
  }

  const course = resolveCourse(
    courseSlug,
    plan.code,
    true,
    environment,
  );
  const paidCourseConfigurationFailedClosed =
    courseSlug !== null &&
    !catalog.courses.freeCourseSlugs.includes(courseSlug) &&
    !catalog.launch.initialPaidCourseConfigurationValid;

  return {
    planCode: plan.code,
    monthlyCredits: plan.monthlyCredits,
    paidEntitlementsActive: true,
    failClosed: paidCourseConfigurationFailedClosed,
    reason: "active_membership",
    course,
  };
}
