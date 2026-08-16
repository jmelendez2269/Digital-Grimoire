import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Normalize CRLF so these source assertions hold on Windows checkouts too.
function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8").replace(
    /\r\n/g,
    "\n"
  );
}

// Collapse whitespace runs so an assertion describes the code's shape rather
// than its formatting — reindenting or rewrapping must not fail these tests.
function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function assertContains(
  source: string,
  expected: string,
  sourceName: string
): void {
  assert.ok(
    normalizeWhitespace(source).includes(normalizeWhitespace(expected)),
    `${sourceName} is missing: ${expected}`
  );
}

function assertOmits(
  source: string,
  forbidden: string,
  sourceName: string
): void {
  assert.ok(
    !normalizeWhitespace(source).includes(normalizeWhitespace(forbidden)),
    `${sourceName} should no longer contain: ${forbidden}`
  );
}

test("published course cards always open a public preview", () => {
  const sourceName = "src/components/courses/CoursesCatalogClient.tsx";
  const catalog = readSource(sourceName);

  assertContains(catalog, "Public preview", sourceName);

  // No lock affordance: every published card stays reachable.
  assertOmits(catalog, "LockKeyhole", sourceName);

  // The card only deep-links into /learn for an enrolled viewer of an open
  // course; everyone else lands on the public preview page.
  assertContains(
    catalog,
    "isOpen && enrollment ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`",
    sourceName
  );

  // The whole card is the link, so there is no separate gated action.
  assertContains(
    catalog,
    "<Link href={href} className={cardClassName}>",
    sourceName
  );
});

test("the catalog renders server data before enrollment enhancement finishes", () => {
  const clientSourceName = "src/components/courses/CoursesCatalogClient.tsx";
  const pageSourceName = "src/app/courses/page.tsx";
  const catalog = readSource(clientSourceName);
  const page = readSource(pageSourceName);

  assertContains(catalog, "const courses = initialCourses", clientSourceName);
  assertContains(catalog, 'fetch("/api/courses/my-courses")', clientSourceName);
  assertOmits(catalog, "fetch(`/api/courses?${params}`", clientSourceName);
  assertOmits(catalog, "presentationLoading", clientSourceName);
  assertContains(page, "getPublicCourseCatalog()", pageSourceName);
});

test("anonymous course requests receive only the sanitized published preview", () => {
  const sourceName = "src/app/api/courses/[id]/route.ts";
  const route = readSource(sourceName);

  assertContains(
    route,
    "if (!course.is_published && !viewer.isAdmin)",
    sourceName
  );
  assertContains(route, "sanitizeCourseForPreview(enrichedCourse)", sourceName);
  assertContains(
    route,
    "viewer.isAdmin || (wantsFullAccess && canViewFullCourse)",
    sourceName
  );
  assertContains(
    route,
    "wantsFullAccess && !courseAvailable && !viewer.isAdmin",
    sourceName
  );
  assertContains(route, "matchCourseTextsFromContent", sourceName);
  assertContains(route, "resolveMembershipEntitlement", sourceName);
  assertContains(route, "entitlement?.course.entitled === true", sourceName);
  assertOmits(route, "subscription_status", sourceName);
  assertOmits(route, "hasPaidCourseAccess", sourceName);
  assertOmits(route, "matchAndPersistCourseTexts", sourceName);
});

test("course enrollment uses the service-owned membership projection", () => {
  const sourceName = "src/app/api/courses/[id]/enroll/route.ts";
  const route = readSource(sourceName);

  assertContains(route, "resolveMembershipEntitlement", sourceName);
  assertContains(route, "courseSlug: String(course.slug)", sourceName);
  assertOmits(route, "subscription_status", sourceName);
  assertOmits(route, "hasPaidCourseAccess", sourceName);
});
