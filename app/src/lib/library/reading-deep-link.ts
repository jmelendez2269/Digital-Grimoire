export interface ReadingTocItem {
  id: string;
  title: string;
}

export interface CourseReadingDeepLinkOptions {
  courseSlug: string;
  location?: string | null;
  selection?: string | null;
  tier?: "keystone" | "passage" | "full" | null;
}

export interface CourseReadingTextTarget {
  id: string;
  kind: "text";
  label: string;
  chapterId?: string;
  matchText: string;
}

export interface CourseReadingChapterTarget {
  id: string;
  kind: "chapter";
  label: string;
  chapterId: string;
}

export interface CourseReadingPageTarget {
  id: string;
  kind: "page";
  label: string;
  page: number;
}

export type CourseReadingTarget =
  | CourseReadingTextTarget
  | CourseReadingChapterTarget
  | CourseReadingPageTarget;

export interface CourseReadingLocator {
  id: string;
  courseSlug: string;
  documentId: string;
  targets: readonly CourseReadingTarget[];
}

type PresetCourseReadingLocator = CourseReadingLocator & {
  selectionIncludes?: string;
};

const INTERNAL_URL_ORIGIN = "https://prismarium.local";

const PRE_COURSE_SLUG = "pre-how-to-hold-two-things-at-once";
const C01_COURSE_SLUG = "c01-how-humans-know-what-they-know";
const ETHICS_OF_BELIEF_ID = "e784a267-94f2-4a8b-86fb-da10b97b60b9";
const WILL_TO_BELIEVE_ID = "74657b33-8138-4337-8358-2657f89ea8a4";
const ZHUANGZI_ID = "7d7118b5-f527-4259-acd6-a728f4dd473a";

const C01_DOCUMENT_IDS = {
  taoTeChing: "6afbea89-7308-4f1a-a7c2-fb7fc79c79e5",
  prolegomena: "f497cf8b-eb52-4940-9327-d329c04ac4b4",
  mythsOfGreeceAndRome: "0c1ed233-97ff-490f-9d1b-06763858966e",
  chandogyaUpanishad: "f56d0fcc-81af-4bba-9b5e-818a4e80e3e0",
  divinePymander: "933af65d-dc4b-47ba-99ba-046df87dffc7",
  varieties: "7f708035-2317-4e74-94a5-bb9874af2fe7",
  songCelestial: "4807b1ee-02af-4250-9247-e65b0f2f7602",
  meditations: "fc5471cd-2644-4b35-b184-94b6ac659d6e",
  interiorCastle: "35ab49c4-85bc-42f9-b24f-729c0642c162",
  gatelessGate: "f775eea8-78bf-497f-9c5f-db03da6ed0d0",
  revelations: "c670ae09-94ce-4d37-a00e-d170ac0c10b4",
  naturalHistoryReligion: "64fbad47-8f64-412e-81ad-d33a45521f99",
  masnavi: "268f0e61-f779-4645-8c91-103a10d4e818",
  tertiumOrganum: "e70371cd-51b5-47ff-a69c-b92044d9479f",
} as const;

const pageTarget = (
  id: string,
  label: string,
  page: number
): CourseReadingPageTarget => ({ id, kind: "page", label, page });

const chapterTarget = (
  id: string,
  label: string,
  chapterId: string
): CourseReadingChapterTarget => ({ id, kind: "chapter", label, chapterId });

const textTarget = (
  id: string,
  label: string,
  matchText: string,
  chapterId?: string
): CourseReadingTextTarget => ({
  id,
  kind: "text",
  label,
  matchText,
  ...(chapterId ? { chapterId } : {}),
});

const PRE_COURSE_LOCATORS: readonly PresetCourseReadingLocator[] = [
  {
    id: "pre-ethics-keystone",
    courseSlug: PRE_COURSE_SLUG,
    documentId: ETHICS_OF_BELIEF_ID,
    targets: [
      {
        id: "ethics-shipowner",
        kind: "text",
        label: "the shipowner example",
        chapterId: "chapter-1",
        matchText: "A shipowner was about to send to sea an emigrant-ship",
      },
    ],
  },
  {
    id: "pre-ethics-passage",
    courseSlug: PRE_COURSE_SLUG,
    documentId: ETHICS_OF_BELIEF_ID,
    targets: [
      {
        id: "ethics-part-one",
        kind: "text",
        label: "Part I — The Duty of Inquiry",
        chapterId: "chapter-1",
        matchText: "I. The Duty of Inquiry",
      },
      {
        id: "ethics-part-two",
        kind: "text",
        label: "Part II — The Weight of Authority",
        chapterId: "chapter-1",
        matchText: "II. The Weight of Authority",
      },
    ],
  },
  {
    id: "pre-ethics-full",
    courseSlug: PRE_COURSE_SLUG,
    documentId: ETHICS_OF_BELIEF_ID,
    targets: [
      {
        id: "ethics-complete",
        kind: "text",
        label: "the beginning of the complete essay",
        chapterId: "chapter-1",
        matchText: "I. The Duty of Inquiry",
      },
    ],
  },
  {
    id: "pre-will-keystone",
    courseSlug: PRE_COURSE_SLUG,
    documentId: WILL_TO_BELIEVE_ID,
    targets: [
      {
        id: "will-genuine-option",
        kind: "text",
        label: "James’s definition of a genuine option",
        chapterId: "chapter-1",
        matchText:
          "Next, let us call the decision between two hypotheses an option",
      },
    ],
  },
  {
    id: "pre-will-passage",
    courseSlug: PRE_COURSE_SLUG,
    documentId: WILL_TO_BELIEVE_ID,
    targets: [
      {
        id: "will-definitions",
        kind: "text",
        label: "Section I — definitions",
        chapterId: "chapter-1",
        matchText: "Let us give the name of hypothesis",
      },
      {
        id: "will-avoid-error",
        kind: "text",
        label: "avoiding error and gaining truth",
        chapterId: "chapter-1",
        matchText:
          "There are two ways of looking at our duty in the matter of opinion",
      },
    ],
  },
  {
    id: "pre-will-full",
    courseSlug: PRE_COURSE_SLUG,
    documentId: WILL_TO_BELIEVE_ID,
    targets: [
      {
        id: "will-complete",
        kind: "text",
        label: "the beginning of the complete essay",
        chapterId: "chapter-1",
        matchText: "In the recently published Life by Leslie Stephen",
      },
    ],
  },
  {
    id: "pre-zhuangzi-keystone",
    courseSlug: PRE_COURSE_SLUG,
    documentId: ZHUANGZI_ID,
    targets: [
      {
        id: "zhuangzi-butterfly",
        kind: "page",
        label: "Butterfly Dream",
        page: 71,
      },
    ],
  },
  {
    id: "pre-zhuangzi-passage",
    courseSlug: PRE_COURSE_SLUG,
    documentId: ZHUANGZI_ID,
    targets: [
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
    ],
  },
  {
    id: "pre-zhuangzi-full",
    courseSlug: PRE_COURSE_SLUG,
    documentId: ZHUANGZI_ID,
    targets: [
      {
        id: "zhuangzi-chapter-two",
        kind: "page",
        label: "Chapter 2",
        page: 60,
      },
      {
        id: "zhuangzi-chapter-three",
        kind: "page",
        label: "Chapter 3",
        page: 83,
      },
    ],
  },
];

const C01_COURSE_LOCATORS: readonly PresetCourseReadingLocator[] = [
  // Tao Te Ching is assigned twice in C01, so the selection disambiguates the weeks.
  {
    id: "c01-tao-week-one-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.taoTeChing,
    selectionIncludes: "Chapters 1–4",
    targets: [
      pageTarget("tao-1", "Chapter 1", 20),
      pageTarget("tao-2", "Chapter 2", 21),
      pageTarget("tao-3", "Chapter 3", 22),
      pageTarget("tao-4", "Chapter 4", 23),
    ],
  },
  {
    id: "c01-tao-week-seven-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.taoTeChing,
    selectionIncludes: "Chapters 1, 14, 25, and 56",
    targets: [
      pageTarget("tao-1", "Chapter 1", 20),
      pageTarget("tao-14", "Chapter 14", 33),
      pageTarget("tao-25", "Chapter 25", 44),
      pageTarget("tao-56", "Chapter 56", 76),
    ],
  },
  {
    id: "c01-tao-week-one-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.taoTeChing,
    selectionIncludes: "Chapter 1",
    targets: [pageTarget("tao-1", "Chapter 1", 20)],
  },
  {
    id: "c01-tao-week-seven-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.taoTeChing,
    selectionIncludes: "Chapter 14",
    targets: [pageTarget("tao-14", "Chapter 14", 33)],
  },
  {
    id: "c01-tao-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.taoTeChing,
    targets: [pageTarget("tao-1", "Chapter 1", 20)],
  },
  {
    id: "c01-prolegomena-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.prolegomena,
    targets: [
      pageTarget("prolegomena-preface", "Preface", 49),
      pageTarget("prolegomena-preamble", "Preamble", 61),
      pageTarget("prolegomena-first-part", "First Part", 67),
    ],
  },
  {
    id: "c01-prolegomena-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.prolegomena,
    targets: [
      pageTarget("prolegomena-preface", "Preface", 49),
      pageTarget("prolegomena-first-part", "First Part", 67),
    ],
  },
  {
    id: "c01-prolegomena-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.prolegomena,
    targets: [pageTarget("prolegomena-hume", "Preface — Hume discussion", 51)],
  },
  {
    id: "c01-myths-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.mythsOfGreeceAndRome,
    targets: [
      textTarget(
        "myths-titans",
        "the Titans",
        "In addition to those children of heaven and earth already enumerated"
      ),
      textTarget(
        "myths-demeter",
        "Demeter and the Eleusinian cycle",
        "Demeter (from Ge-meter, earth-mother)"
      ),
    ],
  },
  {
    id: "c01-myths-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.mythsOfGreeceAndRome,
    targets: [
      textTarget("myths-prometheus", "Prometheus", "The theory of Hesiod"),
      textTarget(
        "myths-demeter",
        "Demeter",
        "Demeter (from Ge-meter, earth-mother)"
      ),
    ],
  },
  {
    id: "c01-myths-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.mythsOfGreeceAndRome,
    targets: [textTarget("myths-prometheus", "Prometheus steals fire", "The theory of Hesiod")],
  },
  {
    id: "c01-chandogya-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.chandogyaUpanishad,
    targets: [
      chapterTarget("chandogya-6-1", "6.1 — First Khanda", "khanda-1"),
      chapterTarget("chandogya-6-16", "6.16 — Sixteenth Khanda", "khanda-16"),
    ],
  },
  {
    id: "c01-chandogya-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.chandogyaUpanishad,
    targets: [
      chapterTarget("chandogya-6-1", "6.1 — First Khanda", "khanda-1"),
      chapterTarget("chandogya-6-16", "6.16 — Sixteenth Khanda", "khanda-16"),
    ],
  },
  {
    id: "c01-chandogya-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.chandogyaUpanishad,
    targets: [
      chapterTarget("chandogya-6-8", "6.8 — Eighth Khanda", "khanda-8"),
      chapterTarget("chandogya-6-16", "6.16 — Sixteenth Khanda", "khanda-16"),
    ],
  },
  {
    id: "c01-pymander-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.divinePymander,
    targets: [
      chapterTarget("pymander-book-1", "Book I — Poemander", "chapter-4"),
      chapterTarget("pymander-book-2", "Book II", "chapter-5"),
      chapterTarget("pymander-book-3", "Book III", "chapter-6"),
    ],
  },
  {
    id: "c01-pymander-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.divinePymander,
    targets: [chapterTarget("pymander-book-1", "Book I — Poemander", "chapter-4")],
  },
  {
    id: "c01-pymander-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.divinePymander,
    targets: [
      textTarget(
        "pymander-opening",
        "Book I, sections 1–6",
        "MY THOUGHTS being once seriously busied about things that are",
        "chapter-4"
      ),
    ],
  },
  {
    id: "c01-varieties-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.varieties,
    targets: [
      textTarget(
        "varieties-lecture-1",
        "Lecture I",
        "But since I have received the honor of this appointment"
      ),
    ],
  },
  {
    id: "c01-varieties-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.varieties,
    targets: [
      textTarget(
        "varieties-lecture-1",
        "Lecture I",
        "But since I have received the honor of this appointment"
      ),
    ],
  },
  {
    id: "c01-varieties-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.varieties,
    targets: [
      textTarget(
        "varieties-medical-materialism",
        "Lecture I — medical materialism",
        "Medical materialism seems indeed a good appellation"
      ),
    ],
  },
  {
    id: "c01-song-celestial-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.songCelestial,
    targets: [
      textTarget(
        "song-nature-action",
        "3.27–3.35 — nature and action",
        "All things are everywhere by Nature wrought"
      ),
    ],
  },
  {
    id: "c01-meditations-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.meditations,
    targets: [
      textTarget(
        "meditations-book-2",
        "Book II",
        "I. Remember how long thou hast already put off these things"
      ),
      textTarget("meditations-book-4", "Book IV", "I. That inward mistress part of man"),
    ],
  },
  {
    id: "c01-meditations-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.meditations,
    targets: [
      textTarget(
        "meditations-book-2",
        "Book II, 1–17",
        "I. Remember how long thou hast already put off these things"
      ),
      textTarget("meditations-book-4", "Book IV, 1–12", "I. That inward mistress part of man"),
    ],
  },
  {
    id: "c01-meditations-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.meditations,
    targets: [
      textTarget(
        "meditations-judgment",
        "Book IV — thought and judgment",
        "VII. Let opinion be taken away"
      ),
    ],
  },
  {
    id: "c01-interior-castle-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.interiorCastle,
    targets: [pageTarget("interior-title", "beginning of the complete work", 5)],
  },
  {
    id: "c01-interior-castle-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.interiorCastle,
    targets: [
      pageTarget("interior-first", "First Mansions", 21),
      pageTarget("interior-second", "Second Mansions", 30),
      pageTarget("interior-third", "Third Mansions", 35),
    ],
  },
  {
    id: "c01-interior-castle-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.interiorCastle,
    targets: [pageTarget("interior-first-chapter", "First Mansion, Chapter 1", 21)],
  },
  {
    id: "c01-gateless-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.gatelessGate,
    targets: [chapterTarget("gateless-complete", "the complete collection", "chapter-1")],
  },
  {
    id: "c01-gateless-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.gatelessGate,
    targets: [textTarget("gateless-case-1", "Case 1 — Joshu’s dog", "A monk asked Joshu, Has a dog", "chapter-1")],
  },
  {
    id: "c01-gateless-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.gatelessGate,
    targets: [textTarget("gateless-case-1", "Case 1, comment, and verse", "A monk asked Joshu, Has a dog", "chapter-1")],
  },
  {
    id: "c01-revelations-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.revelations,
    targets: [chapterTarget("revelations-long-text", "beginning of the Long Text", "section-8")],
  },
  {
    id: "c01-revelations-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.revelations,
    targets: [chapterTarget("revelations-first", "First Revelation", "section-8")],
  },
  {
    id: "c01-revelations-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.revelations,
    targets: [
      textTarget(
        "revelations-hazelnut",
        "First Revelation — the hazelnut",
        "Also in this He shewed me a little thing, the quantity",
        "section-11"
      ),
    ],
  },
  {
    id: "c01-natural-history-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.naturalHistoryReligion,
    targets: [pageTarget("natural-history-start", "beginning of the complete work", 14)],
  },
  {
    id: "c01-natural-history-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.naturalHistoryReligion,
    targets: [
      pageTarget("natural-history-1", "Section I", 15),
      pageTarget("natural-history-6", "Section VI", 30),
    ],
  },
  {
    id: "c01-natural-history-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.naturalHistoryReligion,
    targets: [
      pageTarget("natural-history-1", "Section I", 15),
      pageTarget("natural-history-4", "Section IV", 23),
    ],
  },
  {
    id: "c01-masnavi-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.masnavi,
    targets: [chapterTarget("masnavi-book-3", "Book III story cluster", "chapter-4")],
  },
  {
    id: "c01-masnavi-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.masnavi,
    targets: [
      textTarget(
        "masnavi-elephant",
        "The Elephant in a Dark Room",
        "STORY V. The Elephant in a Dark Room",
        "chapter-4"
      ),
    ],
  },
  {
    id: "c01-tertium-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.tertiumOrganum,
    targets: [
      chapterTarget("tertium-1", "Chapter I", "chapter-5"),
      chapterTarget("tertium-5", "Chapter V", "chapter-9"),
    ],
  },
  {
    id: "c01-tertium-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.tertiumOrganum,
    targets: [
      chapterTarget("tertium-1", "Chapter I", "chapter-5"),
      chapterTarget("tertium-3", "Chapter III", "chapter-7"),
    ],
  },
  {
    id: "c01-tertium-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: C01_DOCUMENT_IDS.tertiumOrganum,
    targets: [chapterTarget("tertium-1", "Chapter I", "chapter-5")],
  },
  {
    id: "c01-zhuangzi-full",
    courseSlug: C01_COURSE_SLUG,
    documentId: ZHUANGZI_ID,
    targets: [pageTarget("zhuangzi-chapter-one", "Chapter 1", 50)],
  },
  {
    id: "c01-zhuangzi-passage",
    courseSlug: C01_COURSE_SLUG,
    documentId: ZHUANGZI_ID,
    targets: [
      pageTarget("zhuangzi-butterfly", "Butterfly Dream", 71),
      pageTarget("zhuangzi-cook-ding", "Cook Ding", 84),
    ],
  },
  {
    id: "c01-zhuangzi-keystone",
    courseSlug: C01_COURSE_SLUG,
    documentId: ZHUANGZI_ID,
    targets: [pageTarget("zhuangzi-butterfly", "Butterfly Dream", 71)],
  },
];

const COURSE_READING_LOCATORS = [
  ...PRE_COURSE_LOCATORS,
  ...C01_COURSE_LOCATORS,
] as const;

function findPresetCourseReadingLocator(
  courseSlug: string,
  documentId: string,
  tier: CourseReadingDeepLinkOptions["tier"],
  selection?: string | null
): CourseReadingLocator | null {
  if (!tier) return null;
  const candidates = COURSE_READING_LOCATORS.filter(
    (locator) =>
      locator.courseSlug === courseSlug &&
      locator.documentId === documentId &&
      locator.id.endsWith(`-${tier}`)
  );
  const normalizedSelection = normalizeLocator(selection ?? "");

  return (
    candidates.find(
      (locator) =>
        locator.selectionIncludes &&
        ` ${normalizedSelection} `.includes(
          ` ${normalizeLocator(locator.selectionIncludes)} `
        )
    ) ??
    candidates.find((locator) => !locator.selectionIncludes) ??
    null
  );
}

export function resolveCourseReadingLocator(
  courseSlug: string,
  documentId: string,
  locatorId: string
): CourseReadingLocator | null {
  return (
    COURSE_READING_LOCATORS.find(
      (locator) =>
        locator.id === locatorId &&
        locator.courseSlug === courseSlug &&
        locator.documentId === documentId
    ) ?? null
  );
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "complete",
  "from",
  "in",
  "of",
  "on",
  "opening",
  "selected",
  "selection",
  "the",
  "through",
  "to",
  "with",
]);

const STRUCTURAL_UNIT_PATTERN =
  /\b(chapter|section|part|book|case|treatise|canto|verse)\s+(\d+)\b/g;

function romanToInteger(value: string): number | null {
  if (!/^[ivxlcdm]+$/i.test(value)) return null;

  const values: Record<string, number> = {
    i: 1,
    v: 5,
    x: 10,
    l: 50,
    c: 100,
    d: 500,
    m: 1000,
  };
  let total = 0;
  let previous = 0;

  for (const character of value.toLowerCase().split("").reverse()) {
    const current = values[character];
    total += current < previous ? -current : current;
    previous = current;
  }

  if (total <= 0 || total >= 4_000) return null;

  const numerals: Array<[number, string]> = [
    [1_000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remainder = total;
  let canonical = "";
  for (const [amount, numeral] of numerals) {
    while (remainder >= amount) {
      canonical += numeral;
      remainder -= amount;
    }
  }

  return canonical === value.toUpperCase() ? total : null;
}

function normalizeLocator(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/§{1,2}/g, " section ")
    .replace(/\bchap(?:ter)?s?\.?\b/g, " chapter ")
    .replace(/\bsect(?:ion)?s?\.?\b/g, " section ")
    .replace(/\bbk\.?\b/g, " book ")
    .replace(/\bpt\.?\b/g, " part ")
    .replace(/\b[ivxlcdm]+\b/gi, (token) => {
      const integer = romanToInteger(token);
      return integer === null ? token : String(integer);
    })
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(value: string): Set<string> {
  return new Set(
    normalizeLocator(value)
      .split(" ")
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
  );
}

function structuralUnits(value: string): Set<string> {
  const units = new Set<string>();
  for (const match of normalizeLocator(value).matchAll(STRUCTURAL_UNIT_PATTERN)) {
    units.add(`${match[1]}:${match[2]}`);
  }
  return units;
}

function scoreTocItem(query: string, item: ReadingTocItem): number {
  const normalizedQuery = normalizeLocator(query);
  const normalizedTitle = normalizeLocator(item.title);
  if (!normalizedQuery || !normalizedTitle) return 0;
  if (normalizedQuery === normalizedTitle) return 1_000;

  let score = 0;
  if (normalizedQuery.includes(normalizedTitle) && normalizedTitle.length >= 4) {
    score = Math.max(score, 800 + Math.min(normalizedTitle.length, 100));
  }
  if (normalizedTitle.includes(normalizedQuery) && normalizedQuery.length >= 4) {
    score = Math.max(score, 760 + Math.min(normalizedQuery.length, 100));
  }

  const queryUnits = structuralUnits(query);
  const titleUnits = structuralUnits(item.title);
  const sharedUnits = [...queryUnits].filter((unit) => titleUnits.has(unit));
  if (sharedUnits.length > 0) {
    score = Math.max(score, 650 + sharedUnits.length * 25);
  }

  const queryTokens = meaningfulTokens(query);
  const titleTokens = meaningfulTokens(item.title);
  const sharedTokens = [...queryTokens].filter((token) => titleTokens.has(token));
  const smallerTokenCount = Math.min(queryTokens.size, titleTokens.size);
  const overlapRatio = smallerTokenCount
    ? sharedTokens.length / smallerTokenCount
    : 0;

  if (sharedTokens.length >= 2 && overlapRatio >= 0.5) {
    score = Math.max(score, 250 + sharedTokens.length * 20 + overlapRatio * 100);
  }

  return score;
}

/**
 * Builds a course-to-library link without changing the normal book URL.
 * External source URLs return null because Prismarium cannot control them.
 */
export function buildCourseReadingDeepLink(
  href: string | null | undefined,
  options: CourseReadingDeepLinkOptions
): string | null {
  if (!href?.startsWith("/library/")) return null;

  const location = options.location?.trim();
  const selection = options.selection?.trim();
  if (!location && !selection) return null;

  const url = new URL(href, INTERNAL_URL_ORIGIN);
  url.searchParams.set("course", options.courseSlug);
  if (location) url.searchParams.set("courseLocation", location);
  if (selection) url.searchParams.set("courseSelection", selection);

  const documentId = url.pathname.split("/").filter(Boolean)[1];
  const preset = documentId
    ? findPresetCourseReadingLocator(
        options.courseSlug,
        documentId,
        options.tier,
        selection
      )
    : null;
  if (preset) url.searchParams.set("courseLocator", preset.id);

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Resolves human-authored course references against a book's real TOC. The
 * tier selection is tried first because it is usually narrower than the
 * reading-level location. Weak one-word coincidences are rejected.
 */
export function findCourseReadingTocItem<T extends ReadingTocItem>(
  items: readonly T[],
  options: Pick<CourseReadingDeepLinkOptions, "location" | "selection">
): T | null {
  const queries = [options.selection?.trim(), options.location?.trim()].filter(
    (value): value is string => Boolean(value)
  );

  for (const query of queries) {
    const ranked = items
      .map((item, index) => ({ item, index, score: scoreTocItem(query, item) }))
      .filter((candidate) => candidate.score >= 250)
      .sort(
        (left, right) =>
          right.score - left.score || left.index - right.index
      );
    if (ranked[0]) return ranked[0].item;
  }

  return null;
}
