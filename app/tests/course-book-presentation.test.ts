import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCourseBookDisplay,
  groupCourseBooksByWeek,
  type CourseBookMetadata,
} from "../src/lib/courses/course-book-presentation";
import type {
  CourseContent,
  CourseReading,
  CourseWeek,
} from "../src/lib/parsers/course-markdown-parser";

function reading(title: string, author?: string): CourseReading {
  return {
    sort_order: 1,
    title,
    author,
    selection_rationale: "",
    tiers: {
      keystone: { reference: "", description: "" },
      passage: { reference: "", description: "" },
      full: { reference: "", description: "" },
    },
  };
}

function week(weekNumber: number, readings: CourseReading[]): CourseWeek {
  return {
    week_number: weekNumber,
    title: `Week ${weekNumber}`,
    week_type: "standard",
    core_question: "",
    key_tension: "",
    lens_focus: [],
    readings,
  };
}

function content(weeks: CourseWeek[]): CourseContent {
  return {
    arc: "",
    arc_position: 0,
    core_question: "",
    course_id_tag: "TEST",
    key_tensions: [],
    completion_pathways: [],
    weeks,
  };
}

test("course book display preserves week order and keeps unmatched readings", () => {
  const result = buildCourseBookDisplay(
    content([
      week(2, [reading("Zhuangzi", "Zhuangzi")]),
      week(1, [
        reading("The Ethics of Belief", "W. K. Clifford"),
        reading("The Will to Believe", "William James"),
      ]),
    ])
  );

  assert.deepEqual(
    result.map((book) => book.title),
    ["The Ethics of Belief", "The Will to Believe", "Zhuangzi"]
  );
  assert.equal(result[0].coverImageUrl, null);
  assert.equal(result[0].href, null);
});

test("course book display deduplicates repeated works and records every week", () => {
  const result = buildCourseBookDisplay(
    content([
      week(1, [reading("The Dhammapada", "F. Max Müller")]),
      week(2, [reading("Dhammapada", "F. Max Müller")]),
    ])
  );

  assert.equal(result.length, 1);
  assert.deepEqual(result[0].weekNumbers, [1, 2]);
  assert.deepEqual(result[0].weekAssignments, [
    { weekNumber: 1, readingOrder: 0 },
    { weekNumber: 2, readingOrder: 0 },
  ]);
});

test("weekly book groups restore local reading order after bibliography deduplication", () => {
  const result = buildCourseBookDisplay(
    content([
      week(2, [
        reading("The Will to Believe", "William James"),
        reading("Tao Te Ching", "Lao Tzu"),
      ]),
      week(1, [
        reading("Tao Te Ching", "Lao Tzu"),
        reading("The Ethics of Belief", "W. K. Clifford"),
      ]),
    ])
  );
  const groups = groupCourseBooksByWeek(result);

  assert.equal(result.length, 3);
  assert.deepEqual(
    groups.map((group) => ({
      weekNumber: group.weekNumber,
      titles: group.books.map((book) => book.title),
    })),
    [
      {
        weekNumber: 1,
        titles: ["Tao Te Ching", "The Ethics of Belief"],
      },
      {
        weekNumber: 2,
        titles: ["The Will to Believe", "Tao Te Ching"],
      },
    ]
  );
  assert.equal(
    groups.reduce((total, group) => total + group.books.length, 0),
    4
  );
});

test("verified library metadata adds the real cover and library destination", () => {
  const metadata: CourseBookMetadata[] = [
    {
      textId: "text-123",
      title: "An Enquiry Concerning Human Understanding",
      author: "David Hume",
      coverImageUrl: "https://example.test/hume.jpg",
    },
  ];
  const result = buildCourseBookDisplay(
    content([
      week(1, [
        reading("An Enquiry Concerning Human Understanding", "David Hume"),
      ]),
    ]),
    metadata
  );

  assert.equal(result[0].coverImageUrl, "https://example.test/hume.jpg");
  assert.equal(result[0].href, "/library/text-123");
});

test("text ID metadata enriches a title variant without renaming the syllabus reading", () => {
  const kena = reading("The Kena Upanishad") as CourseReading & {
    text_id: string;
  };
  kena.text_id = "upanishads-123";

  const result = buildCourseBookDisplay(content([week(2, [kena])]), [
    {
      textId: "upanishads-123",
      title: "The Upanishads",
      author: "Swami Paramananda",
      coverImageUrl: "https://example.test/upanishads.jpg",
    },
  ]);

  assert.equal(result[0].title, "The Kena Upanishad");
  assert.equal(result[0].author, "Swami Paramananda");
  assert.equal(result[0].href, "/library/upanishads-123");
});
