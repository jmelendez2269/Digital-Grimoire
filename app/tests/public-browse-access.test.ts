import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  sanitizePublicCatalogSearch,
  sanitizePublicLibraryMetadata,
} from "../src/lib/library/public-catalog";
import { isPublicPath } from "../src/lib/routing/public-access";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

test("public browse routes do not expose protected Library routes", () => {
  assert.equal(isPublicPath("/library"), true);
  assert.equal(isPublicPath("/library/"), true);
  assert.equal(isPublicPath("/explore"), true);
  assert.equal(isPublicPath("/explore/workings"), true);
  assert.equal(isPublicPath("/explore/workings/shared-id"), true);
  assert.equal(isPublicPath("/api/library/catalog"), true);
  assert.equal(isPublicPath("/api/working/community/shared-id"), true);

  assert.equal(isPublicPath("/library/private-text-id"), false);
  assert.equal(isPublicPath("/library/my-library"), false);
  assert.equal(isPublicPath("/library/media"), false);
  assert.equal(isPublicPath("/api/texts"), false);
  assert.equal(isPublicPath("/api/texts/private-text-id"), false);
  assert.equal(isPublicPath("/seven-lenses"), false);
});

test("public Library metadata strips reader-only values", () => {
  assert.deepEqual(
    sanitizePublicLibraryMetadata({
      cover_position: "50% 20%",
      isCorpusCollection: true,
      corpus: {
        groups: [
          { items: [{ id: "one" }, { id: "two" }] },
          { works: [{ id: "three" }] },
        ],
      },
      storage_path: "private/book.pdf",
      content: "full reader content",
      source_url: "https://example.com/private",
    }),
    {
      cover_position: "50% 20%",
      isCorpusCollection: true,
      corpusWorkCount: 3,
    }
  );

  assert.equal(
    sanitizePublicCatalogSearch("alchemy%,author.eq.secret_(test)"),
    "alchemy author eq secret test"
  );
});

test("the public catalog and homepage use one honest collection count", () => {
  const catalog = readSource("src/app/api/library/catalog/route.ts");
  const totals = readSource("src/lib/platform/totals.server.ts");
  const home = readSource("src/components/home/PublicHomeView.tsx");

  for (const source of [catalog, totals]) {
    assert.match(source, /\.is\("parent_id", null\)/);
    assert.match(source, /\.eq\("status", "ready"\)/);
  }

  assert.ok(!catalog.includes('.select("*"'));
  assert.ok(home.includes("Library entries"));
  assert.ok(home.includes("formatPlatformSummary(platformTotals)"));
  assert.ok(!home.includes("min-w-52"));
  assert.ok(!home.includes('{ value: platformTotals.books, label: "books" }'));
});

test("anonymous Library browsing uses metadata APIs while member actions stay gated", () => {
  const hook = readSource("src/hooks/useLibrary.ts");
  const page = readSource("src/app/library/page.tsx");
  const grid = readSource("src/components/LibraryGrid.tsx");

  assert.ok(hook.includes('user ? "/api/texts" : "/api/library/catalog"'));
  assert.ok(hook.includes('fetch("/api/library/catalog?mode=filters")'));
  assert.ok(!hook.includes('throw new Error("User not authenticated")'));
  assert.ok(page.includes("enabled: !authLoading"));
  assert.ok(page.includes("Browse the Library before you join"));
  assert.ok(page.includes("isAuthenticated={!!user}"));
  assert.ok(grid.includes('"Sign in to read"'));
  assert.ok(grid.includes("Preview details"));
});
