import assert from "node:assert/strict";
import test from "node:test";
import {
  findingInput,
  publicFinding,
  reviewProblems,
  safeUrl,
  sourceHref,
  exportInquiry,
  type Finding,
  type Inquiry,
} from "../src/lib/inquiries/model";
import { trustedLibraryResults } from "../src/lib/concept-search/trusted-results";
import { isPublicPath } from "../src/lib/routing/public-access";

test("only map and suggestions are public, never curator authoring routes", () => {
  assert.equal(isPublicPath("/api/knowledge/map"), true);
  assert.equal(isPublicPath("/api/knowledge/suggestions"), true);
  assert.equal(isPublicPath("/api/knowledge/entities"), false);
  assert.equal(isPublicPath("/api/inquiries"), false);
  assert.equal(isPublicPath("/api/knowledge/map/private"), false);
});

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const ready = findingInput.parse({
  title: "Christ in an alchemical manuscript",
  source_kind: "external",
  claim: "This manuscript depicts the Resurrection.",
  source_title: "Rosarium manuscript",
  source_url: "https://example.org/manuscript",
  source_locator: "Illustration 20",
  excerpt: "Description of the image, checked against the source.",
  context:
    "An eighteenth-century English copy; this claim concerns this specific witness.",
  source_entity_id: first,
  target_entity_id: second,
});

test("AI and personal notes remain leads until evidence is attached", () => {
  assert.deepEqual(reviewProblems(ready), []);
  for (const source_kind of ["ai", "note"] as const)
    assert.match(
      reviewProblems({ ...ready, source_kind }).join(" "),
      /Attach a library passage/
    );
  assert.match(
    reviewProblems({ ...ready, context: "" }).join(" "),
    /Explain the author/
  );
  assert.match(
    reviewProblems({ ...ready, source_locator: "" }).join(" "),
    /specific location/
  );
});
test("publication requires identifiable endpoints and an external source link", () => {
  assert.match(
    reviewProblems({ ...ready, target_entity_id: null }).join(" "),
    /two entries/
  );
  assert.match(
    reviewProblems({ ...ready, source_url: "" }).join(" "),
    /source URL/
  );
  assert.throws(() =>
    findingInput.parse({ ...ready, target_entity_id: first })
  );
  assert.throws(() =>
    findingInput.parse({
      ...ready,
      predicate: "proves_all_religions_identical",
    })
  );
});
test("public projections cannot expose inquiry notes or AI provenance", () => {
  const finding = {
    ...ready,
    id: first,
    inquiry_id: second,
    status: "published",
    revision: 3,
    sort_order: 1,
    published_at: "2026-09-15",
    note: "PRIVATE THOUGHT",
    provenance: { query: "PRIVATE QUESTION" },
  } as Finding;
  const projection = publicFinding(finding);
  assert.equal(projection.claim, ready.claim);
  assert.doesNotMatch(
    JSON.stringify(projection),
    /PRIVATE|inquiry_id|provenance|revision|sort_order/
  );
});
test("source URLs reject executable and local schemes", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
  ])
    assert.equal(safeUrl.safeParse(url).success, false);
  assert.equal(safeUrl.safeParse("https://example.org/text").success, true);
  assert.equal(
    sourceHref({
      source_kind: "library",
      source_url: "",
      text_id: first,
      chunk_id: second,
    }),
    `/library/${first}?chunk=${second}`
  );
});
test("search excerpts retain source identifiers and never invent a page", () => {
  const books = trustedLibraryResults([
    {
      text_id: first,
      text_title: "Actual title",
      text_author: "Actual author",
      content: "Actual source passage",
      chunk_id: second,
    },
    { text_id: first, content: "Another actual passage" },
    { text_id: first, content: "Actual source passage", chunk_id: second },
  ]);
  assert.equal(books.length, 1);
  assert.equal(books[0].title, "Actual title");
  assert.equal(books[0].excerpts.length, 2);
  assert.equal(books[0].excerpts[0].text, "Actual source passage");
  assert.equal(books[0].excerpts[0].chunk_id, second);
  assert.equal(books[0].excerpts[0].page_number, null);
});
test("episode export retains trail order, context, evidence, and private notes", () => {
  const inquiry = {
    title: "WTF is Alchemy?",
    question: "What changed?",
    notes: "Open questions",
  } as Inquiry;
  const findings = [
    {
      ...ready,
      title: "First discovery",
      status: "published",
      note: "Follow up",
    },
    { ...ready, title: "Second discovery", status: "draft" },
  ] as Finding[];
  const markdown = exportInquiry(inquiry, findings, []);
  assert.ok(
    markdown.indexOf("First discovery") < markdown.indexOf("Second discovery")
  );
  assert.match(markdown, /Status: draft/);
  assert.match(markdown, /eighteenth-century/);
  assert.match(markdown, /Follow up/);
});
