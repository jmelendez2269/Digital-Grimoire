import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCourseReadingDeepLink,
  findCourseReadingTocItem,
  resolveCourseReadingLocator,
} from "../src/lib/library/reading-deep-link";

test("builds an encoded internal library deep link", () => {
  assert.equal(
    buildCourseReadingDeepLink("/library/text-1", {
      courseSlug: "pre-how-to-hold-two-things-at-once",
      location: "Section IV: Sceptical Doubts",
      selection: "Section IV, Part I",
    }),
    "/library/text-1?course=pre-how-to-hold-two-things-at-once&courseLocation=Section+IV%3A+Sceptical+Doubts&courseSelection=Section+IV%2C+Part+I"
  );
});

test("does not pretend to deep-link an external source", () => {
  assert.equal(
    buildCourseReadingDeepLink("https://example.com/book", {
      courseSlug: "pre-how-to-hold-two-things-at-once",
      location: "Chapter 1",
    }),
    null
  );
});

test("adds edition-specific PRE locators for every formerly unstructured tier", () => {
  const cases = [
    {
      documentId: "e784a267-94f2-4a8b-86fb-da10b97b60b9",
      tier: "keystone" as const,
      locatorId: "pre-ethics-keystone",
    },
    {
      documentId: "e784a267-94f2-4a8b-86fb-da10b97b60b9",
      tier: "passage" as const,
      locatorId: "pre-ethics-passage",
    },
    {
      documentId: "e784a267-94f2-4a8b-86fb-da10b97b60b9",
      tier: "full" as const,
      locatorId: "pre-ethics-full",
    },
    {
      documentId: "74657b33-8138-4337-8358-2657f89ea8a4",
      tier: "keystone" as const,
      locatorId: "pre-will-keystone",
    },
    {
      documentId: "74657b33-8138-4337-8358-2657f89ea8a4",
      tier: "passage" as const,
      locatorId: "pre-will-passage",
    },
    {
      documentId: "74657b33-8138-4337-8358-2657f89ea8a4",
      tier: "full" as const,
      locatorId: "pre-will-full",
    },
    {
      documentId: "7d7118b5-f527-4259-acd6-a728f4dd473a",
      tier: "keystone" as const,
      locatorId: "pre-zhuangzi-keystone",
    },
    {
      documentId: "7d7118b5-f527-4259-acd6-a728f4dd473a",
      tier: "passage" as const,
      locatorId: "pre-zhuangzi-passage",
    },
    {
      documentId: "7d7118b5-f527-4259-acd6-a728f4dd473a",
      tier: "full" as const,
      locatorId: "pre-zhuangzi-full",
    },
  ];

  for (const item of cases) {
    const href = buildCourseReadingDeepLink(`/library/${item.documentId}`, {
      courseSlug: "pre-how-to-hold-two-things-at-once",
      location: "Assigned reading",
      selection: "Assigned tier",
      tier: item.tier,
    });
    const url = new URL(href!, "https://prismarium.local");
    assert.equal(url.searchParams.get("courseLocator"), item.locatorId);
    assert.ok(
      resolveCourseReadingLocator(
        "pre-how-to-hold-two-things-at-once",
        item.documentId,
        item.locatorId
      )
    );
  }
});

test("resolves the Zhuangzi passage as two verified PDF destinations", () => {
  const locator = resolveCourseReadingLocator(
    "pre-how-to-hold-two-things-at-once",
    "7d7118b5-f527-4259-acd6-a728f4dd473a",
    "pre-zhuangzi-passage"
  );

  assert.deepEqual(locator?.targets, [
    {
      id: "zhuangzi-butterfly",
      kind: "page",
      label: "Butterfly Dream",
      page: 71,
    },
    {
      id: "zhuangzi-cook-ding",
      kind: "page",
      label: "Cook Ding",
      page: 84,
    },
  ]);
});

test("disambiguates C01's two Tao Te Ching passage assignments", () => {
  const documentId = "6afbea89-7308-4f1a-a7c2-fb7fc79c79e5";
  const courseSlug = "c01-how-humans-know-what-they-know";
  const weekOneHref = buildCourseReadingDeepLink(`/library/${documentId}`, {
    courseSlug,
    location: "Chapters 1–16",
    selection: "Chapters 1–4",
    tier: "passage",
  });
  const weekSevenHref = buildCourseReadingDeepLink(`/library/${documentId}`, {
    courseSlug,
    location: "Complete text",
    selection: "Chapters 1, 14, 25, and 56",
    tier: "passage",
  });

  const weekOneLocatorId = new URL(
    weekOneHref!,
    "https://prismarium.local"
  ).searchParams.get("courseLocator");
  const weekSevenLocatorId = new URL(
    weekSevenHref!,
    "https://prismarium.local"
  ).searchParams.get("courseLocator");

  assert.equal(weekOneLocatorId, "c01-tao-week-one-passage");
  assert.equal(weekSevenLocatorId, "c01-tao-week-seven-passage");
  assert.deepEqual(
    resolveCourseReadingLocator(courseSlug, documentId, weekOneLocatorId!)
      ?.targets.map((target) => target.kind === "page" && target.page),
    [20, 21, 22, 23]
  );
  assert.deepEqual(
    resolveCourseReadingLocator(courseSlug, documentId, weekSevenLocatorId!)
      ?.targets.map((target) => target.kind === "page" && target.page),
    [20, 33, 44, 76]
  );
});

test("does not confuse Tao Chapter 14 with Chapter 1", () => {
  const documentId = "6afbea89-7308-4f1a-a7c2-fb7fc79c79e5";
  const href = buildCourseReadingDeepLink(`/library/${documentId}`, {
    courseSlug: "c01-how-humans-know-what-they-know",
    location: "Complete text",
    selection: "Chapter 14",
    tier: "keystone",
  });

  assert.equal(
    new URL(href!, "https://prismarium.local").searchParams.get(
      "courseLocator"
    ),
    "c01-tao-week-seven-keystone"
  );
});

test("resolves C01 Poemandres to the verified chapters in The Divine Pymander", () => {
  const courseSlug = "c01-how-humans-know-what-they-know";
  const documentId = "933af65d-dc4b-47ba-99ba-046df87dffc7";
  const href = buildCourseReadingDeepLink(`/library/${documentId}`, {
    courseSlug,
    location: "Books I–III",
    selection: "Book I",
    tier: "full",
  });
  const locatorId = new URL(
    href!,
    "https://prismarium.local"
  ).searchParams.get("courseLocator");
  const locator = resolveCourseReadingLocator(
    courseSlug,
    documentId,
    locatorId!
  );

  assert.equal(locatorId, "c01-pymander-full");
  assert.deepEqual(
    locator?.targets.map((target) =>
      target.kind === "chapter" ? target.chapterId : null
    ),
    ["chapter-4", "chapter-5", "chapter-6"]
  );
});

test("keeps C01 edition-specific locators scoped to C01", () => {
  assert.equal(
    resolveCourseReadingLocator(
      "pre-how-to-hold-two-things-at-once",
      "933af65d-dc4b-47ba-99ba-046df87dffc7",
      "c01-pymander-full"
    ),
    null
  );
});

test("does not apply a locator to a different edition", () => {
  assert.equal(
    resolveCourseReadingLocator(
      "pre-how-to-hold-two-things-at-once",
      "another-zhuangzi-edition",
      "pre-zhuangzi-passage"
    ),
    null
  );
});

test("matches an Arabic course reference to a Roman-numeral Hume section", () => {
  const result = findCourseReadingTocItem(
    [
      { id: "section-iii", title: "SECTION III. Of the Association of Ideas" },
      {
        id: "section-iv",
        title: "SECTION IV. Sceptical Doubts concerning the Operations of the Understanding",
      },
      { id: "section-v", title: "SECTION V. Sceptical Solution of these Doubts" },
    ],
    { selection: "Section 4, Part I: the bread-and-nourishment argument" }
  );

  assert.equal(result?.id, "section-iv");
});

test("matches PRE chapter and case selections", () => {
  const chapters = [
    { id: "chapter-1", title: "Chapter I — The Twin Verses" },
    { id: "chapter-2", title: "Chapter II — Heedfulness" },
  ];
  assert.equal(
    findCourseReadingTocItem(chapters, {
      selection: "Chapter 1, verses 1–2",
    })?.id,
    "chapter-1"
  );

  assert.equal(
    findCourseReadingTocItem(
      [
        { id: "case-1", title: "Case 1: Joshu's Dog" },
        { id: "case-2", title: "Case 2: Hyakujo's Fox" },
      ],
      { selection: "Case 1 (Joshu's Dog) with Mumon's commentary" }
    )?.id,
    "case-1"
  );
});

test("matches the live PRE HTML headings", () => {
  assert.equal(
    findCourseReadingTocItem(
      [
        { id: "hume-section-iii", title: "SECTION III." },
        { id: "hume-section-iv", title: "SECTION IV." },
        { id: "hume-part-i", title: "PART I." },
      ],
      { selection: "Section IV, the central problem of induction" }
    )?.id,
    "hume-section-iv"
  );

  assert.equal(
    findCourseReadingTocItem(
      [
        { id: "dhammapada-1", title: "Chapter I. The Twin-Verses" },
        { id: "dhammapada-2", title: "Chapter II. On Earnestness" },
      ],
      { selection: "Selected Twin Verses" }
    )?.id,
    "dhammapada-1"
  );

  assert.equal(
    findCourseReadingTocItem(
      [
        { id: "upanishad-peace", title: "OM! PEACE! PEACE! PEACE!" },
        { id: "upanishad-kena", title: "KENA-UPANISHAD" },
        { id: "upanishad-part-first", title: "Part First" },
      ],
      {
        location: "Kena Upanishad",
        selection: "Opening questions and the passage on knowing and not-knowing",
      }
    )?.id,
    "upanishad-kena"
  );
});

test("rejects an unrelated TOC instead of guessing", () => {
  assert.equal(
    findCourseReadingTocItem(
      [
        { id: "preface", title: "Translator's Preface" },
        { id: "index", title: "Index" },
      ],
      { selection: "The Cook Ding story" }
    ),
    null
  );
});
