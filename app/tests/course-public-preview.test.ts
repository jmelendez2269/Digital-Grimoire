import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

test("published course cards always open a public preview", () => {
  const catalog = readSource("src/app/courses/page.tsx");

  assert.ok(catalog.includes("Public preview"));
  assert.ok(!catalog.includes("LockKeyhole"));
  assert.ok(
    catalog.includes(
      "isOpen && enrollment\n      ? `/courses/${course.slug}/learn`\n      : `/courses/${course.slug}`",
    ),
  );
  assert.ok(
    catalog.includes(
      '<Link href={href} className={cardClassName}>',
    ),
  );
});

test("anonymous course requests receive only the sanitized published preview", () => {
  const route = readSource("src/app/api/courses/[id]/route.ts");

  assert.ok(route.includes("if (!course.is_published && !viewer.isAdmin)"));
  assert.ok(route.includes("sanitizeCourseForPreview(enrichedCourse)"));
  assert.ok(
    route.includes(
      "viewer.isAdmin || (wantsFullAccess && canViewFullCourse)",
    ),
  );
  assert.ok(
    route.includes(
      "wantsFullAccess && !courseAvailable && !viewer.isAdmin",
    ),
  );
  assert.ok(route.includes("matchCourseTextsFromContent"));
  assert.ok(!route.includes("matchAndPersistCourseTexts"));
});
