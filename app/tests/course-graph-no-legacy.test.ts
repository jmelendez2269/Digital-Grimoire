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
const candidateRouteSource = readFileSync(
  new URL("../src/app/api/course-graph/route.ts", import.meta.url),
  "utf8",
);

test("the Concepts surface only loads Course Knowledge", () => {
  assert.match(graphPageSource, /`\/api\/course-graph\?\$\{selector\}`/);
  assert.match(
    graphPageSource,
    /Boolean\(selectedCandidateBundle\)[\s\S]*Boolean\(selectedPublicCourse\)/,
  );
  assert.match(graphPageSource, /params\.delete\("source"\)/);

  assert.doesNotMatch(graphPageSource, /\/api\/concepts/);
  assert.doesNotMatch(graphPageSource, /ConceptGraphSource/);
  assert.doesNotMatch(graphPageSource, /Legacy concepts/i);
  assert.doesNotMatch(graphPageSource, /Open legacy concepts/i);
  assert.doesNotMatch(graphPageSource, /source === "legacy"/);
});

test("the public course branch uses only the learner endpoint and exact static view", () => {
  assert.match(graphPageSource, /requestedGraphType === "course"/);
  assert.match(graphPageSource, /\/api\/course-graph\/learner\?course=/);
  assert.match(graphPageSource, /FD01_PATTERN_TEST_FALLBACK/);
  assert.match(graphPageSource, /selectedPublicView !== FD01_PATTERN_TEST_VIEW/);
  assert.match(graphPageSource, /isFd01GraphPreviewEnabled/);
});

test("candidate graph selection is explicit and never falls back to the newest import", () => {
  assert.match(
    candidateRouteSource,
    /Boolean\(bundleSlug\) === Boolean\(courseSlug\)/,
  );
  assert.match(
    candidateRouteSource,
    /COURSE_GRAPH_EXACT_SELECTION_REQUIRED/,
  );
  assert.match(
    candidateRouteSource,
    /COURSE_GRAPH_BUNDLE_SELECTION_REQUIRED/,
  );
  assert.doesNotMatch(
    candidateRouteSource,
    /\.order\("imported_at", \{ ascending: false \}\)/,
  );
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

  assert.match(
    redirectSource,
    /type=parallax&course=pre-how-to-hold-two-things-at-once/,
  );
  assert.doesNotMatch(redirectSource, /source=legacy/);
});
