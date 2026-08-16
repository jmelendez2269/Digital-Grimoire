import assert from "node:assert/strict";
import test from "node:test";

import { shapePublicCatalogCourse } from "../src/lib/courses/public-catalog";

test("public catalog projection contains presentation fields without course bodies", () => {
  const course = shapePublicCatalogCourse({
    id: "course-1",
    title: "A Question",
    slug: "a-question",
    description: "Description",
    premise: "Premise",
    learning_outcomes: ["Compare ideas"],
    course_type: "foundational",
    level: "foundational",
    duration_weeks: 8,
    is_published: true,
    created_at: "2026-08-16T00:00:00.000Z",
    course_id_tag: "C01",
    core_question: "What changes?",
    arc: "Foundation Doors",
    arc_position: 1,
    curator_note_public: "Public note",
    key_tensions: [{ label: "A / B", description: "Compare" }],
    completion_pathways: [{ code: "C02", title: "Next" }],
  });

  assert.equal(course.content?.core_question, "What changes?");
  assert.equal(course.content?.arc_position, 1);
  assert.equal(course.is_published, true);
  assert.equal("weeks" in (course.content ?? {}), false);
  assert.equal("curator_note" in (course.content ?? {}), false);
});
