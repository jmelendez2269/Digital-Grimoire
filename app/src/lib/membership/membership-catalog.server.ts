import "server-only";

import { FREE_LEARNER_COURSES } from "@/lib/courses/learner-save-contract.server";

export const MEMBERSHIP_CATALOG_VERSION = 1 as const;

export const APPROVED_STUDENT_LAUNCH_COURSE_SLUG =
  "c01-how-humans-know-what-they-know" as const;

export const MEMBERSHIP_PLAN_CODES = [
  "reader",
  "student",
  "scholar",
  "adept",
] as const;

export const MEMBERSHIP_OFFER_CODES = [
  "student_founding_monthly",
  "student_standard_monthly",
  "scholar_monthly",
  "adept_monthly",
] as const;

export const METERED_ACTION_CODES = [
  "working.generate",
  "seven_lenses.expand",
  "seven_lenses.standard",
  "seven_lenses.long",
  "deep_search.fresh",
  "image.generate",
] as const;

export type MembershipPlanCode = (typeof MEMBERSHIP_PLAN_CODES)[number];
export type MembershipOfferCode = (typeof MEMBERSHIP_OFFER_CODES)[number];
export type MeteredActionCode = (typeof METERED_ACTION_CODES)[number];
export type CatalogEnvironment = Record<string, string | undefined>;

type CourseAccessPolicy =
  | "free-path"
  | "student-launch-course"
  | "all-member-released";
type OfferLaunchGate = "paid-launch" | "future-decision" | "cost-evidence";
type ActionLaunchState = "metering-required" | "beta-disabled" | "not-offered";

interface PlanDefinition {
  code: MembershipPlanCode;
  name: string;
  monthlyCredits: number;
  journalActivePageLimit: number | null;
  courseAccess: CourseAccessPolicy;
}

interface OfferDefinition {
  code: MembershipOfferCode;
  planCode: Exclude<MembershipPlanCode, "reader">;
  amountCents: number;
  currency: "usd";
  interval: "month";
  launchGate: OfferLaunchGate;
  acceptsNewCheckout: boolean;
  stripePriceEnvironmentKey: string;
}

interface ActionDefinition {
  code: MeteredActionCode;
  customerLabel: string;
  creditCost: number | null;
  launchState: ActionLaunchState;
}

export interface SafeMembershipCatalog {
  version: typeof MEMBERSHIP_CATALOG_VERSION;
  plans: Array<PlanDefinition & { publiclyAvailable: boolean }>;
  offers: Array<
    Omit<OfferDefinition, "stripePriceEnvironmentKey"> & {
      publiclyAvailable: boolean;
    }
  >;
  actions: Array<ActionDefinition & { launchEnabled: boolean }>;
  courses: {
    freeCourseSlugs: string[];
    memberReleasedCourseSlugs: string[];
    studentLaunchCourseSlug: string | null;
  };
  launch: {
    paidSalesEnabled: boolean;
    initialPaidCourseConfigurationValid: boolean;
    adeptDecision: "enable" | "hold" | "revise";
  };
}

export interface ResolvedMembershipOffer {
  code: MembershipOfferCode;
  planCode: Exclude<MembershipPlanCode, "reader">;
  amountCents: number;
  currency: "usd";
  interval: "month";
}

export interface ResolvedMembershipCheckoutOffer
  extends ResolvedMembershipOffer {
  stripePriceId: string;
}

const ENV = Object.freeze({
  paidSalesEnabled: "PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED",
  enabledOffers: "PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS",
  enabledActions: "PRISMARIUM_ENABLED_METERED_ACTIONS",
  memberReleasedCourses: "PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS",
  studentLaunchCourse: "PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG",
  adeptDecision: "PRISMARIUM_ADEPT_LAUNCH_DECISION",
} as const);

const PLAN_DEFINITIONS = Object.freeze<readonly PlanDefinition[]>([
  {
    code: "reader",
    name: "Reader",
    monthlyCredits: 10,
    journalActivePageLimit: 50,
    courseAccess: "free-path",
  },
  {
    code: "student",
    name: "Student",
    monthlyCredits: 30,
    journalActivePageLimit: null,
    courseAccess: "student-launch-course",
  },
  {
    code: "scholar",
    name: "Scholar",
    monthlyCredits: 100,
    journalActivePageLimit: null,
    courseAccess: "all-member-released",
  },
  {
    code: "adept",
    name: "Adept",
    monthlyCredits: 300,
    journalActivePageLimit: null,
    courseAccess: "all-member-released",
  },
]);

const OFFER_DEFINITIONS = Object.freeze<readonly OfferDefinition[]>([
  {
    code: "student_founding_monthly",
    planCode: "student",
    amountCents: 1500,
    currency: "usd",
    interval: "month",
    launchGate: "paid-launch",
    acceptsNewCheckout: true,
    stripePriceEnvironmentKey:
      "PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY",
  },
  {
    code: "student_standard_monthly",
    planCode: "student",
    amountCents: 1900,
    currency: "usd",
    interval: "month",
    launchGate: "future-decision",
    acceptsNewCheckout: false,
    stripePriceEnvironmentKey:
      "PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY",
  },
  {
    code: "scholar_monthly",
    planCode: "scholar",
    amountCents: 3900,
    currency: "usd",
    interval: "month",
    launchGate: "paid-launch",
    acceptsNewCheckout: true,
    stripePriceEnvironmentKey: "PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY",
  },
  {
    code: "adept_monthly",
    planCode: "adept",
    amountCents: 6900,
    currency: "usd",
    interval: "month",
    launchGate: "cost-evidence",
    acceptsNewCheckout: true,
    stripePriceEnvironmentKey: "PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY",
  },
]);

const ACTION_DEFINITIONS = Object.freeze<readonly ActionDefinition[]>([
  {
    code: "working.generate",
    customerLabel: "The Working",
    creditCost: 1,
    launchState: "metering-required",
  },
  {
    code: "seven_lenses.expand",
    customerLabel: "Expand one lens",
    creditCost: 1,
    launchState: "metering-required",
  },
  {
    code: "seven_lenses.standard",
    customerLabel: "Standard Seven Lenses synthesis",
    creditCost: 2,
    launchState: "metering-required",
  },
  {
    code: "seven_lenses.long",
    customerLabel: "Long Seven Lenses synthesis",
    creditCost: 3,
    launchState: "metering-required",
  },
  {
    code: "deep_search.fresh",
    customerLabel: "Fresh Deep Search synthesis",
    creditCost: 3,
    launchState: "beta-disabled",
  },
  {
    code: "image.generate",
    customerLabel: "Image generation",
    creditCost: null,
    launchState: "not-offered",
  },
]);

const COURSE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STRIPE_PRICE_PATTERN = /^price_[A-Za-z0-9]+$/;

function exactCsv(value: string | undefined): {
  values: string[];
  valid: boolean;
} {
  if (!value?.trim()) return { values: [], valid: true };

  const values = value.split(",").map((entry) => entry.trim());
  const unique = new Set(values);
  return {
    values,
    valid: values.every(Boolean) && unique.size === values.length,
  };
}

function exactEnabled(value: string | undefined): boolean {
  return value === "true";
}

function adeptDecision(
  value: string | undefined
): "enable" | "hold" | "revise" {
  return value === "enable" || value === "revise" ? value : "hold";
}

function getCourseConfiguration(environment: CatalogEnvironment) {
  const freeCourseSlugs = FREE_LEARNER_COURSES.map((course) => course.slug);
  const freeCourseSet = new Set<string>(freeCourseSlugs);
  const memberConfig = exactCsv(environment[ENV.memberReleasedCourses]);
  const studentSlug = environment[ENV.studentLaunchCourse]?.trim() || null;
  const memberSlugsValid =
    memberConfig.valid &&
    memberConfig.values.every(
      (slug) => COURSE_SLUG_PATTERN.test(slug) && !freeCourseSet.has(slug)
    );
  const studentSlugValid =
    studentSlug === APPROVED_STUDENT_LAUNCH_COURSE_SLUG &&
    !freeCourseSet.has(studentSlug);
  const initialPaidCourseConfigurationValid =
    memberSlugsValid &&
    studentSlugValid &&
    memberConfig.values.length === 1 &&
    memberConfig.values[0] === studentSlug;

  return {
    freeCourseSlugs,
    memberReleasedCourseSlugs: memberSlugsValid ? memberConfig.values : [],
    studentLaunchCourseSlug: studentSlugValid ? studentSlug : null,
    initialPaidCourseConfigurationValid,
  };
}

function getConfiguredStripePrice(
  offer: OfferDefinition,
  environment: CatalogEnvironment
): string | null {
  const value = environment[offer.stripePriceEnvironmentKey];
  return value && STRIPE_PRICE_PATTERN.test(value) ? value : null;
}

function getEnabledCodeSet<T extends string>(
  value: string | undefined,
  allowed: readonly T[]
): Set<T> {
  const parsed = exactCsv(value);
  if (
    !parsed.valid ||
    parsed.values.some((entry) => !allowed.includes(entry as T))
  ) {
    return new Set();
  }
  return new Set(parsed.values as T[]);
}

function offerCanBePublic(
  offer: OfferDefinition,
  environment: CatalogEnvironment,
  enabledOffers: Set<MembershipOfferCode>,
  paidSalesEnabled: boolean,
  courseConfigurationValid: boolean,
  decision: "enable" | "hold" | "revise"
): boolean {
  if (
    !paidSalesEnabled ||
    !courseConfigurationValid ||
    !offer.acceptsNewCheckout ||
    !enabledOffers.has(offer.code) ||
    !getConfiguredStripePrice(offer, environment)
  ) {
    return false;
  }

  return offer.launchGate !== "cost-evidence" || decision === "enable";
}

export function getSafeMembershipCatalog(
  environment: CatalogEnvironment = process.env
): SafeMembershipCatalog {
  const courses = getCourseConfiguration(environment);
  const paidSalesRequested = exactEnabled(environment[ENV.paidSalesEnabled]);
  const enabledOffers = getEnabledCodeSet(
    environment[ENV.enabledOffers],
    MEMBERSHIP_OFFER_CODES
  );
  const enabledActions = getEnabledCodeSet(
    environment[ENV.enabledActions],
    METERED_ACTION_CODES
  );
  const decision = adeptDecision(environment[ENV.adeptDecision]);
  const paidSalesEnabled =
    paidSalesRequested && courses.initialPaidCourseConfigurationValid;
  const offerAvailability = new Map(
    OFFER_DEFINITIONS.map((offer) => [
      offer.code,
      offerCanBePublic(
        offer,
        environment,
        enabledOffers,
        paidSalesEnabled,
        courses.initialPaidCourseConfigurationValid,
        decision
      ),
    ])
  );

  return {
    version: MEMBERSHIP_CATALOG_VERSION,
    plans: PLAN_DEFINITIONS.map((plan) => ({
      ...plan,
      publiclyAvailable:
        plan.code === "reader" ||
        OFFER_DEFINITIONS.some(
          (offer) =>
            offer.planCode === plan.code &&
            offerAvailability.get(offer.code) === true
        ),
    })),
    offers: OFFER_DEFINITIONS.map((offer) => ({
      code: offer.code,
      planCode: offer.planCode,
      amountCents: offer.amountCents,
      currency: offer.currency,
      interval: offer.interval,
      launchGate: offer.launchGate,
      acceptsNewCheckout: offer.acceptsNewCheckout,
      publiclyAvailable: offerAvailability.get(offer.code) === true,
    })),
    actions: ACTION_DEFINITIONS.map((action) => ({
      ...action,
      launchEnabled:
        paidSalesEnabled &&
        action.launchState === "metering-required" &&
        enabledActions.has(action.code),
    })),
    courses: {
      freeCourseSlugs: [...courses.freeCourseSlugs],
      memberReleasedCourseSlugs: courses.initialPaidCourseConfigurationValid
        ? [...courses.memberReleasedCourseSlugs]
        : [],
      studentLaunchCourseSlug: courses.initialPaidCourseConfigurationValid
        ? courses.studentLaunchCourseSlug
        : null,
    },
    launch: {
      paidSalesEnabled,
      initialPaidCourseConfigurationValid:
        courses.initialPaidCourseConfigurationValid,
      adeptDecision: decision,
    },
  };
}

/**
 * Resolve a signed Stripe event through exact server-only Price configuration.
 * Missing, malformed, unknown, or ambiguously duplicated Prices return null.
 */
export function resolveMembershipOfferByStripePriceId(
  priceId: unknown,
  environment: CatalogEnvironment = process.env
): ResolvedMembershipOffer | null {
  if (typeof priceId !== "string" || !STRIPE_PRICE_PATTERN.test(priceId)) {
    return null;
  }

  const matches = OFFER_DEFINITIONS.filter(
    (offer) => getConfiguredStripePrice(offer, environment) === priceId
  );
  if (matches.length !== 1) return null;

  const offer = matches[0];
  return {
    code: offer.code,
    planCode: offer.planCode,
    amountCents: offer.amountCents,
    currency: offer.currency,
    interval: offer.interval,
  };
}

/**
 * Resolve a customer-submitted offer code to one exact server-owned Price.
 * The offer must pass every launch gate in the safe catalog and its Price must
 * map back to that same offer without ambiguity. Raw Price IDs are never input.
 */
export function resolveMembershipCheckoutOffer(
  offerCode: unknown,
  environment: CatalogEnvironment = process.env,
): ResolvedMembershipCheckoutOffer | null {
  if (
    typeof offerCode !== "string" ||
    !MEMBERSHIP_OFFER_CODES.includes(offerCode as MembershipOfferCode)
  ) {
    return null;
  }

  const definition = OFFER_DEFINITIONS.find(
    (offer) => offer.code === offerCode,
  );
  const safeOffer = getSafeMembershipCatalog(environment).offers.find(
    (offer) => offer.code === offerCode,
  );
  if (!definition || safeOffer?.publiclyAvailable !== true) return null;

  const stripePriceId = getConfiguredStripePrice(definition, environment);
  if (!stripePriceId) return null;

  const reverse = resolveMembershipOfferByStripePriceId(
    stripePriceId,
    environment,
  );
  if (!reverse || reverse.code !== definition.code) return null;

  return { ...reverse, stripePriceId };
}
