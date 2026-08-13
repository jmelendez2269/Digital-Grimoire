import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { RECORDED_CONCEPT_SEARCH_DEMO } from "../src/lib/concept-search/recorded-demo";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8").replace(
    /\r\n/g,
    "\n"
  );
}

test("the public Concept Search recording is complete and versioned", () => {
  const demo = RECORDED_CONCEPT_SEARCH_DEMO;

  assert.equal(demo.query, "belief");
  assert.equal(demo.capturedAt, "2026-08-10T13:59:54.252782+00:00");
  assert.ok(demo.results.summary.length > 500);
  assert.equal(demo.results.libraryResults.length, 2);
  assert.equal(demo.results.externalRecommendations.length, 3);

  const bookIds = demo.results.libraryResults.map((book) => book.book_id);
  assert.equal(new Set(bookIds).size, bookIds.length);

  for (const book of demo.results.libraryResults) {
    assert.ok(book.title.length > 0);
    assert.ok(book.author.length > 0);
    assert.ok(book.relevanceSentence.length > 0);
    assert.ok(book.excerpts.length > 0);
  }
});

test("recorded playback exits before either protected request path", () => {
  const panel = readSource("src/components/DeepSearch/DeepSearchPanel.tsx");
  const suggestionGuard = panel.indexOf("if (demoMode) return;");
  const suggestionFetch = panel.indexOf("`/api/concepts?q=${");
  const replayMatch = panel.match(
    /if \(demoMode\) \{\s+startRecordedReplay\(\);\s+return;/
  );
  const replayBranch = replayMatch ? panel.indexOf(replayMatch[0]) : -1;
  const generationFetch = panel.indexOf('fetch("/api/parallax/ai-search"');

  assert.ok(suggestionGuard >= 0 && suggestionGuard < suggestionFetch);
  assert.ok(replayBranch >= 0 && replayBranch < generationFetch);
  assert.match(panel, /prefers-reduced-motion: reduce/);
  assert.match(panel, /demoMode\s+\?\s+generateAffiliateLink\(title, author\)/);
  assert.doesNotMatch(panel, /\/library\/reader\//);
});

test("the recording is static and the public page selects it after auth resolves", () => {
  const fixture = readSource("src/lib/concept-search/recorded-demo.ts");
  const page = readSource("src/app/search/page.tsx");

  assert.doesNotMatch(fixture, /fetch\(|createClient\(|search_cache/);
  assert.match(page, /authLoading \? \(/);
  assert.match(page, /demoMode={!user}/);
  assert.match(
    page,
    /key={user \? `live-search-\$\{query\}` : "recorded-demo"}/
  );
});
