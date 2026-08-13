import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  APPROVED_STUDENT_LAUNCH_COURSE_TITLE,
  APPROVED_STUDENT_LAUNCH_COURSE_SLUG,
  getSafeMembershipCatalog,
  resolveMembershipOfferByStripePriceId,
  type CatalogEnvironment,
} from "../src/lib/membership/membership-catalog.server";
import { GET as getMembershipCatalogResponse } from "../src/app/api/membership/catalog/route";
import { getPublicPricingEntries } from "../src/lib/membership/membership-pricing";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8").replace(
    /\r\n/g,
    "\n"
  );
}

function launchEnvironment(
  overrides: CatalogEnvironment = {}
): CatalogEnvironment {
  return {
    PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED: "true",
    PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS:
      "student_founding_monthly,scholar_monthly,adept_monthly",
    PRISMARIUM_ENABLED_METERED_ACTIONS:
      "working.generate,seven_lenses.expand,seven_lenses.standard,seven_lenses.long,deep_search.fresh,image.generate",
    PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS:
      APPROVED_STUDENT_LAUNCH_COURSE_SLUG,
    PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG: APPROVED_STUDENT_LAUNCH_COURSE_SLUG,
    PRISMARIUM_ADEPT_LAUNCH_DECISION: "hold",
    PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY: "price_studentFounding",
    PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY: "price_studentStandard",
    PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY: "price_scholarMonthly",
    PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY: "price_adeptMonthly",
    ...overrides,
  };
}

test("the frozen launch contract has the intended plans, prices, credits, and action costs", () => {
  const catalog = getSafeMembershipCatalog({});

  assert.deepEqual(
    catalog.plans.map(({ code, monthlyCredits, journalActivePageLimit }) => ({
      code,
      monthlyCredits,
      journalActivePageLimit,
    })),
    [
      { code: "reader", monthlyCredits: 0, journalActivePageLimit: 50 },
      { code: "student", monthlyCredits: 30, journalActivePageLimit: null },
      { code: "scholar", monthlyCredits: 100, journalActivePageLimit: null },
      { code: "adept", monthlyCredits: 300, journalActivePageLimit: null },
    ]
  );
  assert.deepEqual(
    catalog.offers.map(({ code, amountCents, acceptsNewCheckout }) => ({
      code,
      amountCents,
      acceptsNewCheckout,
    })),
    [
      {
        code: "student_founding_monthly",
        amountCents: 1500,
        acceptsNewCheckout: true,
      },
      {
        code: "student_standard_monthly",
        amountCents: 1900,
        acceptsNewCheckout: false,
      },
      { code: "scholar_monthly", amountCents: 3900, acceptsNewCheckout: true },
      { code: "adept_monthly", amountCents: 6900, acceptsNewCheckout: true },
    ]
  );
  assert.deepEqual(
    catalog.actions.map(({ code, creditCost }) => [code, creditCost]),
    [
      ["working.generate", 1],
      ["seven_lenses.expand", 1],
      ["seven_lenses.standard", 2],
      ["seven_lenses.long", 3],
      ["deep_search.fresh", 3],
      ["image.generate", null],
    ]
  );
});

test("empty configuration keeps paid plans, releases, offers, and actions closed", () => {
  const catalog = getSafeMembershipCatalog({});

  assert.deepEqual(
    catalog.plans.map(({ code, publiclyAvailable }) => [
      code,
      publiclyAvailable,
    ]),
    [
      ["reader", true],
      ["student", false],
      ["scholar", false],
      ["adept", false],
    ]
  );
  assert.ok(catalog.offers.every((offer) => !offer.publiclyAvailable));
  assert.ok(catalog.actions.every((action) => !action.launchEnabled));
  assert.deepEqual(catalog.courses.memberReleasedCourseSlugs, []);
  assert.equal(catalog.courses.studentLaunchCourseSlug, null);
  assert.equal(catalog.courses.studentLaunchCourseTitle, null);
  assert.equal(catalog.launch.paidSalesEnabled, false);
  assert.equal(catalog.launch.initialPaidCourseConfigurationValid, false);
  assert.equal(catalog.launch.adeptDecision, "hold");
});

test("PRE free access comes from the L1 authority and is not duplicated", () => {
  const catalog = getSafeMembershipCatalog({});
  const source = readSource("src/lib/membership/membership-catalog.server.ts");

  assert.deepEqual(catalog.courses.freeCourseSlugs, [
    "pre-how-to-hold-two-things-at-once",
  ]);
  assert.match(source, /import \{ FREE_LEARNER_COURSES \}/);
  assert.doesNotMatch(source, /["']pre-practical-rational-epistemology["']/);
});

test("paid launch needs one exact non-free course and exact known tokens", () => {
  const valid = getSafeMembershipCatalog(launchEnvironment());
  const [freeCourseSlug] = valid.courses.freeCourseSlugs;
  assert.equal(valid.launch.paidSalesEnabled, true);
  assert.deepEqual(valid.courses.memberReleasedCourseSlugs, [
    APPROVED_STUDENT_LAUNCH_COURSE_SLUG,
  ]);
  assert.equal(
    valid.courses.studentLaunchCourseSlug,
    APPROVED_STUDENT_LAUNCH_COURSE_SLUG
  );
  assert.equal(
    valid.courses.studentLaunchCourseTitle,
    APPROVED_STUDENT_LAUNCH_COURSE_TITLE
  );
  assert.deepEqual(
    valid.offers.map(({ code, publiclyAvailable }) => [
      code,
      publiclyAvailable,
    ]),
    [
      ["student_founding_monthly", true],
      ["student_standard_monthly", false],
      ["scholar_monthly", true],
      ["adept_monthly", false],
    ]
  );
  assert.deepEqual(
    valid.actions.map(({ code, launchEnabled }) => [code, launchEnabled]),
    [
      ["working.generate", true],
      ["seven_lenses.expand", true],
      ["seven_lenses.standard", true],
      ["seven_lenses.long", true],
      ["deep_search.fresh", false],
      ["image.generate", false],
    ]
  );

  for (const environment of [
    launchEnvironment({
      PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS: `${APPROVED_STUDENT_LAUNCH_COURSE_SLUG},c02-another-course`,
    }),
    launchEnvironment({
      PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG: "different-course",
    }),
    launchEnvironment({
      PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS: freeCourseSlug,
      PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG: freeCourseSlug,
    }),
    launchEnvironment({
      PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS:
        "student_founding_monthly,unknown_offer",
    }),
  ]) {
    const catalog = getSafeMembershipCatalog(environment);
    assert.ok(catalog.offers.every((offer) => !offer.publiclyAvailable));
  }
});

test("Adept needs its exact cost decision while disabled action classes stay disabled", () => {
  const catalog = getSafeMembershipCatalog(
    launchEnvironment({ PRISMARIUM_ADEPT_LAUNCH_DECISION: "enable" })
  );

  assert.equal(
    catalog.offers.find((offer) => offer.code === "adept_monthly")
      ?.publiclyAvailable,
    true
  );
  assert.equal(
    catalog.actions.find((action) => action.code === "deep_search.fresh")
      ?.launchEnabled,
    false
  );
  assert.equal(
    catalog.actions.find((action) => action.code === "image.generate")
      ?.launchEnabled,
    false
  );
});

test("Stripe projection uses exact server-only Prices and rejects unknown or ambiguous Prices", () => {
  const environment = launchEnvironment();

  assert.deepEqual(
    resolveMembershipOfferByStripePriceId("price_scholarMonthly", environment),
    {
      code: "scholar_monthly",
      planCode: "scholar",
      amountCents: 3900,
      currency: "usd",
      interval: "month",
    }
  );
  assert.equal(
    resolveMembershipOfferByStripePriceId("price_studentStandard", environment)
      ?.planCode,
    "student"
  );
  assert.equal(
    resolveMembershipOfferByStripePriceId("price_unknown", environment),
    null
  );
  assert.equal(
    resolveMembershipOfferByStripePriceId("not-a-price", environment),
    null
  );
  assert.equal(
    resolveMembershipOfferByStripePriceId(undefined, environment),
    null
  );
  assert.equal(
    resolveMembershipOfferByStripePriceId(
      "price_duplicate",
      launchEnvironment({
        PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY: "price_duplicate",
        PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY: "price_duplicate",
      })
    ),
    null
  );
});

test("the browser projection omits raw Price IDs and configuration keys", async () => {
  const serialized = JSON.stringify(
    getSafeMembershipCatalog(launchEnvironment())
  );
  const route = readSource("src/app/api/membership/catalog/route.ts");
  const middleware = readSource("src/middleware.ts");
  const response = await getMembershipCatalogResponse();
  const responseBody = await response.json();

  assert.doesNotMatch(serialized, /price_/);
  assert.doesNotMatch(serialized, /stripePrice|EnvironmentKey|PRISMARIUM_/i);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(responseBody.catalog);
  assert.doesNotMatch(
    JSON.stringify(responseBody),
    /price_|stripePrice|EnvironmentKey|PRISMARIUM_/i
  );
  assert.match(route, /getSafeMembershipCatalog\(\)/);
  assert.match(route, /Cache-Control["']:\s*["']no-store/);
  assert.doesNotMatch(route, /process\.env|NextRequest|request\.json/);
  assert.match(
    middleware,
    /request\.method === "GET" && pathname === "\/api\/membership\/catalog"/
  );
  assert.ok(
    middleware.indexOf('pathname === "/api/membership/catalog"') <
      middleware.indexOf("updateSession(request)")
  );
});

test("the customer subscription UI creates Checkout only from a public offer code", () => {
  const subscriptionUi = readSource("src/components/SubscriptionTab.tsx");
  const availabilityUi = readSource(
    "src/components/membership/MembershipAvailability.tsx"
  );

  assert.match(subscriptionUi, /<MembershipAvailability \/>/);
  assert.match(availabilityUi, /fetch\("\/api\/membership\/catalog"/);
  assert.match(availabilityUi, /cache: "no-store"/);
  assert.match(availabilityUi, /offer\.publiclyAvailable/);
  assert.match(availabilityUi, /Access one member course at a time/);
  assert.match(availabilityUi, /Early access to newly released member courses/);
  assert.doesNotMatch(availabilityUi, /Currently available:/);
  assert.match(availabilityUi, /catalog\?\.launch\.paidSalesEnabled/);
  assert.match(availabilityUi, /Paid memberships are not open yet/);
  assert.match(
    availabilityUi,
    /fetch\("\/api\/stripe\/create-checkout-session"/
  );
  assert.match(availabilityUi, /offerCode,/);
  assert.match(availabilityUi, /requestId: crypto\.randomUUID\(\)/);
  assert.match(availabilityUi, /No charge was created/);
  assert.doesNotMatch(availabilityUi, /priceId|NEXT_PUBLIC_STRIPE_PRICE_ID_/);
  assert.doesNotMatch(subscriptionUi, /NEXT_PUBLIC_STRIPE_PRICE_ID_/);
});

test("the public pricing surface renders only catalog-public launch offers", () => {
  const closedEntries = getPublicPricingEntries(getSafeMembershipCatalog({}));
  assert.deepEqual(
    closedEntries.map(({ plan, offer }) => [plan.code, offer?.code ?? null]),
    [["reader", null]]
  );

  const launchEntries = getPublicPricingEntries(
    getSafeMembershipCatalog(launchEnvironment())
  );
  assert.deepEqual(
    launchEntries.map(({ plan, offer }) => [plan.code, offer?.code ?? null]),
    [
      ["reader", null],
      ["student", "student_founding_monthly"],
      ["scholar", "scholar_monthly"],
    ]
  );
  assert.ok(
    launchEntries.every(
      ({ offer }) => offer?.code !== "student_standard_monthly"
    )
  );

  const adeptEntries = getPublicPricingEntries(
    getSafeMembershipCatalog(
      launchEnvironment({ PRISMARIUM_ADEPT_LAUNCH_DECISION: "enable" })
    )
  );
  assert.deepEqual(
    adeptEntries.map(({ plan }) => plan.code),
    ["reader", "student", "scholar", "adept"]
  );
});

test("the public pricing page uses shared catalog truth and exact launch positioning", () => {
  const page = readSource("src/app/pricing/page.tsx");
  const pricing = readSource("src/components/membership/MembershipPricing.tsx");
  const pricingProjection = readSource(
    "src/lib/membership/membership-pricing.ts"
  );
  const header = readSource("src/components/Header.tsx");
  const footer = readSource("src/components/Footer.tsx");
  const sitemap = readSource("src/app/sitemap.ts");

  assert.match(page, /getSafeMembershipCatalog\(\)/);
  assert.match(page, /<MembershipPricing catalog=\{catalog\} \/>/);
  assert.match(pricingProjection, /offer\.publiclyAvailable/);
  assert.match(pricingProjection, /offer\.acceptsNewCheckout/);
  assert.match(pricing, /Access to one member course at a time/);
  assert.match(pricing, /Early access to newly released member courses/);
  assert.doesNotMatch(pricing, /Currently available:/);
  assert.match(pricing, /Unlimited active Journal pages/);
  assert.match(
    pricing,
    /Up to \$\{plan\.journalActivePageLimit\} active Journal pages/
  );
  assert.match(pricing, /Choose how you learn\./);
  assert.match(
    pricing,
    /Move between structured study and independent research/
  );
  assert.match(pricing, /Public learning stays open\./);
  assert.match(
    pricing,
    /Paid membership adds full access to your included member\s+courses/
  );
  assert.match(pricing, /Generative credits require a paid membership/);
  assert.doesNotMatch(pricing, /10 monthly credits/);
  assert.doesNotMatch(pricing, /Courses are optional|new-video schedule/);
  assert.doesNotMatch(pricing, /student_standard_monthly|\$19/);
  assert.doesNotMatch(pricing, /stripePrice|price_/i);
  assert.doesNotMatch(pricing, /create-checkout-session|handleUpgrade/);
  assert.match(header, /\{ name: "Membership", path: "\/pricing" \}/);
  assert.match(footer, /href="\/pricing"[\s\S]{0,300}Membership/);
  assert.match(sitemap, /`\$\{baseUrl\}\/pricing`/);
});

test("the public pricing surface renders only catalog-public launch offers", () => {
  const closedEntries = getPublicPricingEntries(getSafeMembershipCatalog({}));
  assert.deepEqual(
    closedEntries.map(({ plan, offer }) => [plan.code, offer?.code ?? null]),
    [["reader", null]]
  );

  const launchEntries = getPublicPricingEntries(
    getSafeMembershipCatalog(launchEnvironment())
  );
  assert.deepEqual(
    launchEntries.map(({ plan, offer }) => [plan.code, offer?.code ?? null]),
    [
      ["reader", null],
      ["student", "student_founding_monthly"],
      ["scholar", "scholar_monthly"],
    ]
  );
  assert.ok(
    launchEntries.every(
      ({ offer }) => offer?.code !== "student_standard_monthly"
    )
  );

  const adeptEntries = getPublicPricingEntries(
    getSafeMembershipCatalog(
      launchEnvironment({ PRISMARIUM_ADEPT_LAUNCH_DECISION: "enable" })
    )
  );
  assert.deepEqual(
    adeptEntries.map(({ plan }) => plan.code),
    ["reader", "student", "scholar", "adept"]
  );
});

test("the public pricing page uses shared catalog truth and exact launch positioning", () => {
  const page = readSource("src/app/pricing/page.tsx");
  const pricing = readSource("src/components/membership/MembershipPricing.tsx");
  const pricingProjection = readSource(
    "src/lib/membership/membership-pricing.ts"
  );
  const header = readSource("src/components/Header.tsx");
  const footer = readSource("src/components/Footer.tsx");
  const sitemap = readSource("src/app/sitemap.ts");

  assert.match(page, /getSafeMembershipCatalog\(\)/);
  assert.match(page, /<MembershipPricing catalog=\{catalog\} \/>/);
  assert.match(pricingProjection, /offer\.publiclyAvailable/);
  assert.match(pricingProjection, /offer\.acceptsNewCheckout/);
  assert.match(pricing, /Access to one member course at a time/);
  assert.doesNotMatch(pricing, /Currently available:/);
  assert.match(pricing, /Unlimited active Journal pages/);
  assert.match(
    pricing,
    /Up to \$\{plan\.journalActivePageLimit\} active Journal pages/
  );
  assert.match(pricing, /Choose how you learn\./);
  assert.match(
    pricing,
    /Move between structured study and independent research/
  );
  assert.match(pricing, /Public learning stays open\./);
  assert.match(
    pricing,
    /Paid membership adds full access to your included member\s+courses/
  );
  assert.doesNotMatch(pricing, /Courses are optional|new-video schedule/);
  assert.doesNotMatch(pricing, /student_standard_monthly|\$19/);
  assert.doesNotMatch(pricing, /stripePrice|price_/i);
  assert.doesNotMatch(pricing, /create-checkout-session|handleUpgrade/);
  assert.match(header, /\{ name: "Membership", path: "\/pricing" \}/);
  assert.match(footer, /href="\/pricing"[\s\S]{0,300}Membership/);
  assert.match(sitemap, /`\$\{baseUrl\}\/pricing`/);
});
