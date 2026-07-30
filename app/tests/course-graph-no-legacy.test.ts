import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const graphPageSource = readFileSync(
  new URL("../src/app/graph/page.tsx", import.meta.url),
  "utf8",
);
const onboardingSource = readFileSync(
  new URL("../src/components/FeatureOnboardingModal.tsx", import.meta.url),
  "utf8",
);

test("the Concepts surface only loads Course Knowledge", () => {
  assert.match(graphPageSource, /fetch\("\/api\/course-graph"/);
  assert.match(graphPageSource, /params\.delete\("source"\)/);

  assert.doesNotMatch(graphPageSource, /\/api\/concepts/);
  assert.doesNotMatch(graphPageSource, /ConceptGraphSource/);
  assert.doesNotMatch(graphPageSource, /Legacy concepts/i);
  assert.doesNotMatch(graphPageSource, /Open legacy concepts/i);
  assert.doesNotMatch(graphPageSource, /source === "legacy"/);
});

test("onboarding describes Course Knowledge instead of the retired concept map", () => {
  assert.match(onboardingSource, /Course Knowledge: concepts, books, authors/);
  assert.doesNotMatch(onboardingSource, /Parallax concept map/i);
  assert.doesNotMatch(onboardingSource, /cross-tradition concept similarity/i);
});

test("the retired Parallax route resolves to the course-backed Concepts surface", () => {
  const redirectSource = readFileSync(
    new URL("../src/app/parallax-graph/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(redirectSource, /redirect\("\/graph\?type=parallax"\)/);
  assert.doesNotMatch(redirectSource, /source=legacy/);
});
