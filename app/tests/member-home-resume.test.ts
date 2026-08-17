import assert from "node:assert/strict";
import test from "node:test";

import {
  getResumeCourse,
  type HomeEnrollmentRow,
} from "../src/lib/home/member-home-data";

function enrollment(
  overrides: Partial<HomeEnrollmentRow> = {}
): HomeEnrollmentRow {
  return {
    course_id: "course-1",
    current_week: 1,
    progress: {},
    enrolled_at: "2026-01-01T00:00:00.000Z",
    courses: {
      slug: "course-one",
      title: "Course One",
      duration_weeks: 8,
      is_published: true,
    },
    ...overrides,
  };
}

test("returns the most recently active unfinished course to resume", () => {
  const result = getResumeCourse([
    enrollment({
      course_id: "course-1",
      current_week: 3,
      progress: { savedAt: "2026-08-17T12:00:00.000Z" },
    }),
    enrollment({
      course_id: "course-2",
      current_week: 2,
      enrolled_at: "2026-08-16T12:00:00.000Z",
      courses: {
        slug: "course-two",
        title: "Course Two",
        duration_weeks: 8,
        is_published: true,
      },
    }),
  ]);

  assert.deepEqual(result, {
    slug: "course-one",
    title: "Course One",
    currentWeek: 3,
    isCompleted: false,
  });
});

test("prefers an unfinished course and ignores unpublished enrollments", () => {
  const result = getResumeCourse([
    enrollment({
      current_week: 8,
      progress: { savedAt: "2026-08-17T12:00:00.000Z" },
    }),
    enrollment({
      course_id: "course-2",
      current_week: 4,
      progress: { savedAt: "2026-08-14T12:00:00.000Z" },
      courses: {
        slug: "course-two",
        title: "Course Two",
        duration_weeks: 8,
        is_published: true,
      },
    }),
    enrollment({
      course_id: "course-3",
      current_week: 2,
      progress: { savedAt: "2026-08-16T12:00:00.000Z" },
      courses: {
        slug: "hidden-course",
        title: "Hidden Course",
        duration_weeks: 8,
        is_published: false,
      },
    }),
  ]);

  assert.equal(result?.slug, "course-two");
});

test("returns null when there is no published course enrollment", () => {
  assert.equal(
    getResumeCourse([
      enrollment({
        courses: {
          slug: "hidden-course",
          title: "Hidden Course",
          duration_weeks: 8,
          is_published: false,
        },
      }),
    ]),
    null
  );
});
