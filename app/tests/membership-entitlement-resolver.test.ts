import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { APPROVED_STUDENT_LAUNCH_COURSE_SLUG } from "../src/lib/membership/membership-catalog.server";
import { resolveMembershipEntitlement } from "../src/lib/membership/membership-entitlement-resolver.server";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const PRE_SLUG = "pre-how-to-hold-two-things-at-once";

function releaseEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED: "false",
    PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS:
      APPROVED_STUDENT_LAUNCH_COURSE_SLUG,
    PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG:
      APPROVED_STUDENT_LAUNCH_COURSE_SLUG,
    ...overrides,
  };
}

function activeMembership(
  planCode: "student" | "scholar" | "adept",
  overrides: Record<string, unknown> = {},
) {
  return {
    plan_code: planCode,
    stripe_status: "active",
    pricing_cohort: planCode === "student" ? "founding" : "standard",
    billing_hold: false,
    access_until: "2099-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("missing membership defaults to Reader while retaining the L1 free allowlist", async () => {
  const pre = await resolveMembershipEntitlement(
    { userId: USER_ID, courseSlug: PRE_SLUG },
    { environment: {}, loadMembership: async () => null },
  );
  const paid = await resolveMembershipEntitlement(
    { userId: USER_ID, courseSlug: APPROVED_STUDENT_LAUNCH_COURSE_SLUG },
    { environment: releaseEnvironment(), loadMembership: async () => null },
  );

  assert.deepEqual(
    {
      planCode: pre.planCode,
      monthlyCredits: pre.monthlyCredits,
      paidEntitlementsActive: pre.paidEntitlementsActive,
      failClosed: pre.failClosed,
      reason: pre.reason,
      course: pre.course,
    },
    {
      planCode: "reader",
      monthlyCredits: 10,
      paidEntitlementsActive: false,
      failClosed: false,
      reason: "reader_default",
      course: {
        slug: PRE_SLUG,
        entitled: true,
        source: "free_allowlist",
      },
    },
  );
  assert.equal(paid.course.entitled, false);
});

test("active paid rows resolve exact plan credits and allowlisted course access", async () => {
  for (const [planCode, monthlyCredits] of [
    ["student", 30],
    ["scholar", 100],
    ["adept", 300],
  ] as const) {
    const resolution = await resolveMembershipEntitlement(
      { userId: USER_ID, courseSlug: APPROVED_STUDENT_LAUNCH_COURSE_SLUG },
      {
        environment: releaseEnvironment(),
        loadMembership: async () => activeMembership(planCode),
      },
    );

    assert.equal(resolution.planCode, planCode);
    assert.equal(resolution.monthlyCredits, monthlyCredits);
    assert.equal(resolution.paidEntitlementsActive, true);
    assert.equal(resolution.failClosed, false);
    assert.equal(resolution.reason, "active_membership");
    assert.deepEqual(resolution.course, {
      slug: APPROVED_STUDENT_LAUNCH_COURSE_SLUG,
      entitled: true,
      source: "member_release_allowlist",
    });
  }
});

test("publication-like input and non-allowlisted courses never grant access", async () => {
  const resolution = await resolveMembershipEntitlement(
    { userId: USER_ID, courseSlug: "database-published-course" },
    {
      environment: releaseEnvironment(),
      loadMembership: async () => ({
        ...activeMembership("scholar"),
        published: true,
        is_published: true,
      }),
    },
  );

  assert.equal(resolution.planCode, "scholar");
  assert.equal(resolution.course.entitled, false);
  assert.equal(resolution.course.source, "not_allowlisted");

  const source = readFileSync(
    resolve(
      appRoot,
      "src/lib/membership/membership-entitlement-resolver.server.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /\.from\(["']courses["']\)/);
  assert.doesNotMatch(source, /is_published|\.published/);
});

test("held, terminal, delinquent, unknown, and malformed membership states fail to Reader", async () => {
  const rows: unknown[] = [
    activeMembership("student", { billing_hold: true }),
    activeMembership("student", { stripe_status: "canceled" }),
    activeMembership("student", { stripe_status: "past_due" }),
    activeMembership("student", { stripe_status: "unknown" }),
    activeMembership("student", { pricing_cohort: "unknown" }),
    activeMembership("student", { access_until: null }),
    activeMembership("student", { access_until: "2020-01-01T00:00:00.000Z" }),
    activeMembership("student", { access_until: "not-a-timestamp" }),
    activeMembership("student", { plan_code: "premium" }),
    activeMembership("student", { billing_hold: "false" }),
  ];

  for (const row of rows) {
    const resolution = await resolveMembershipEntitlement(
      { userId: USER_ID, courseSlug: APPROVED_STUDENT_LAUNCH_COURSE_SLUG },
      {
        environment: releaseEnvironment(),
        loadMembership: async () => row,
      },
    );
    assert.equal(resolution.planCode, "reader");
    assert.equal(resolution.monthlyCredits, 10);
    assert.equal(resolution.paidEntitlementsActive, false);
    assert.equal(resolution.failClosed, true);
    assert.equal(resolution.course.entitled, false);
  }
});

test("lookup failure and invalid identity fail closed without querying membership", async () => {
  const failed = await resolveMembershipEntitlement(
    { userId: USER_ID, courseSlug: APPROVED_STUDENT_LAUNCH_COURSE_SLUG },
    {
      environment: releaseEnvironment(),
      loadMembership: async () => {
        throw new Error("database unavailable");
      },
    },
  );
  let loaderCalled = false;
  const invalid = await resolveMembershipEntitlement(
    { userId: "not-a-user", courseSlug: PRE_SLUG },
    {
      environment: releaseEnvironment(),
      loadMembership: async () => {
        loaderCalled = true;
        return activeMembership("adept");
      },
    },
  );

  assert.equal(failed.reason, "membership_lookup_failed");
  assert.equal(failed.failClosed, true);
  assert.equal(invalid.reason, "invalid_membership_projection");
  assert.equal(invalid.planCode, "reader");
  assert.equal(invalid.course.entitled, true);
  assert.equal(loaderCalled, false);
});

test("ambiguous or unapproved course release configuration closes paid course access", async () => {
  for (const environment of [
    releaseEnvironment({
      PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS: `${APPROVED_STUDENT_LAUNCH_COURSE_SLUG},c02-another-course`,
    }),
    releaseEnvironment({
      PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS: "c01-unapproved-course",
      PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG: "c01-unapproved-course",
    }),
  ]) {
    const resolution = await resolveMembershipEntitlement(
      { userId: USER_ID, courseSlug: APPROVED_STUDENT_LAUNCH_COURSE_SLUG },
      {
        environment,
        loadMembership: async () => activeMembership("scholar"),
      },
    );

    assert.equal(resolution.planCode, "scholar");
    assert.equal(resolution.monthlyCredits, 100);
    assert.equal(resolution.course.entitled, false);
    assert.equal(resolution.failClosed, true);
  }
});

test("the resolver and its privileged database dependency remain server-only", () => {
  for (const relativePath of [
    "src/lib/membership/membership-entitlement-resolver.server.ts",
    "src/lib/supabase/service.ts",
  ]) {
    const source = readFileSync(resolve(appRoot, relativePath), "utf8");
    assert.match(source, /^import ["']server-only["'];/);
  }
});
