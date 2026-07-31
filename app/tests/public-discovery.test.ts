import assert from "node:assert/strict";
import test from "node:test";

import {
  sanitizePublicCatalogSearch,
  sanitizePublicLibraryMetadata,
} from "../src/lib/library/public-catalog";
import { isPublicPath } from "../src/lib/routing/public-access";

test("public discovery routes do not expose protected Library descendants", () => {
  assert.equal(isPublicPath("/library"), true);
  assert.equal(isPublicPath("/library/"), true);
  assert.equal(isPublicPath("/explore"), true);
  assert.equal(isPublicPath("/api/library/catalog"), true);

  assert.equal(isPublicPath("/library/book-id"), false);
  assert.equal(isPublicPath("/library/media"), false);
  assert.equal(isPublicPath("/library/my-library"), false);
  assert.equal(isPublicPath("/api/library/catalog/internal"), false);
});

test("intentionally shared Explore spaces remain public", () => {
  assert.equal(isPublicPath("/explore/workings"), true);
  assert.equal(isPublicPath("/explore/workings/shared-id"), true);
  assert.equal(isPublicPath("/api/working/community"), true);
  assert.equal(isPublicPath("/api/working/community/shared-id"), true);
  assert.equal(isPublicPath("/seven-lenses"), false);
  assert.equal(isPublicPath("/journal"), false);
});

test("public catalog metadata strips reader-only and internal values", () => {
  const sanitized = sanitizePublicLibraryMetadata({
    cover_position: "40% center",
    isCorpusCollection: true,
    corpus: {
      groups: [
        { works: [{ title: "One" }, { title: "Two" }] },
        { items: [{ title: "Three" }] },
      ],
    },
    content: "full protected book text",
    s3_key: "private/object.pdf",
    curator_note_draft: "not approved",
    uploaded_by: "private-user-id",
  });

  assert.deepEqual(sanitized, {
    cover_position: "40% center",
    isCorpusCollection: true,
    corpusWorkCount: 3,
  });
});

test("public catalog search removes PostgREST control punctuation", () => {
  assert.equal(
    sanitizePublicCatalogSearch("  tao,te%_(ching).  "),
    "tao te ching",
  );
});
