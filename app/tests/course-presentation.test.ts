import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCourseReleasePresentation,
  getCourseReleaseStatus,
  groupCoursesByRelease,
  isCourseAvailable,
  type CoursePresentationRecord,
  type CourseReleaseConfiguration,
} from '../src/lib/courses/presentation';

const configuration: CourseReleaseConfiguration = {
  currentCourseSlug: 'c01-how-humans-know-what-they-know',
  nextCourseSlug: 'c02-symbol-myth-and-psychotechnology',
  previouslyOpenedCourseSlugs: ['c00-an-earlier-question'],
};

const courses: CoursePresentationRecord[] = [
  {
    slug: 'pre-how-to-hold-two-things-at-once',
    title: 'How to Hold Two Things at Once',
    content: {
      course_id_tag: 'PRE',
      core_question: 'How do we keep a question open?',
    },
  },
  {
    slug: 'c00-an-earlier-question',
    title: 'An Earlier Question',
    content: { course_id_tag: 'C00' },
  },
  {
    slug: 'c01-how-humans-know-what-they-know',
    title: 'How Humans Know What They Know',
    content: {
      course_id_tag: 'C01',
      core_question: 'What counts as truth?',
    },
  },
  {
    slug: 'c02-symbol-myth-and-psychotechnology',
    title: 'Symbol, Myth, and Psychotechnology',
    content: { course_id_tag: 'C02' },
  },
  {
    slug: 'c03-correspondence-analogy-and-hidden-order',
    title: 'Correspondence, Analogy, and Hidden Order',
    content: { course_id_tag: 'C03' },
  },
  {
    slug: 'taster-the-heros-journey',
    title: "The Hero's Journey",
    content: { course_id_tag: 'TASTER' },
  },
];

test('release status remains separate from publication and access concepts', () => {
  assert.equal(getCourseReleaseStatus(courses[0], configuration), 'open-now');
  assert.equal(getCourseReleaseStatus(courses[1], configuration), 'open-now');
  assert.equal(getCourseReleaseStatus(courses[2], configuration), 'open-now');
  assert.equal(getCourseReleaseStatus(courses[3], configuration), 'coming-next');
  assert.equal(getCourseReleaseStatus(courses[4], configuration), 'coming-later');

  // A taster may be free to access, but is not release-open without an
  // explicit assignment in presentation metadata.
  assert.equal(getCourseReleaseStatus(courses[5], configuration), 'coming-later');
});

test('only courses with an open-now release status are available', () => {
  assert.equal(isCourseAvailable('open-now'), true);
  assert.equal(isCourseAvailable('coming-next'), false);
  assert.equal(isCourseAvailable('coming-later'), false);
  assert.deepEqual(
    courses.map((course) =>
      isCourseAvailable(getCourseReleaseStatus(course, configuration)),
    ),
    [true, true, true, false, false, false],
  );
});

test('shared release slots never infer current or next from course order', () => {
  const unassigned: CourseReleaseConfiguration = {
    currentCourseSlug: null,
    nextCourseSlug: null,
    previouslyOpenedCourseSlugs: [],
  };
  const groups = groupCoursesByRelease(courses, unassigned);

  assert.equal(groups.current, null);
  assert.equal(groups.next, null);
  assert.deepEqual(groups.open.map((course) => course.content?.course_id_tag), ['PRE']);
  assert.equal(groups.later.length, courses.length - 1);
});

test('presentation cards derive identity and question from authoritative course data', () => {
  assert.deepEqual(getCourseReleasePresentation(courses[2], configuration), {
    slug: 'c01-how-humans-know-what-they-know',
    title: 'How Humans Know What They Know',
    courseIdTag: 'C01',
    coreQuestion: 'What counts as truth?',
    releaseStatus: 'open-now',
  });
});

test('invalid release-slot collisions never create a contradictory coming-next card', () => {
  const invalidNextSlugs = [
    'pre-how-to-hold-two-things-at-once',
    'c00-an-earlier-question',
    'c01-how-humans-know-what-they-know',
    'taster-the-heros-journey',
  ];

  for (const nextCourseSlug of invalidNextSlugs) {
    const collisionConfiguration: CourseReleaseConfiguration = {
      ...configuration,
      nextCourseSlug,
    };
    const groups = groupCoursesByRelease(courses, collisionConfiguration);

    assert.equal(groups.next, null, `${nextCourseSlug} must not occupy Coming next`);
    assert.notEqual(
      getCourseReleaseStatus(
        courses.find((course) => course.slug === nextCourseSlug)!,
        collisionConfiguration,
      ),
      'coming-next',
    );
  }
});

test('PRE can spotlight as the current shared path while staying in open paths', () => {
  const preAsCurrent: CourseReleaseConfiguration = {
    currentCourseSlug: 'pre-how-to-hold-two-things-at-once',
    nextCourseSlug: 'c02-symbol-myth-and-psychotechnology',
    previouslyOpenedCourseSlugs: [],
  };
  const groups = groupCoursesByRelease(courses, preAsCurrent);

  assert.equal(groups.current?.slug, 'pre-how-to-hold-two-things-at-once');
  assert.equal(getCourseReleaseStatus(courses[0], preAsCurrent), 'open-now');
  assert.equal(groups.next?.slug, 'c02-symbol-myth-and-psychotechnology');

  // The introduction stays listed even while it spotlights as current.
  assert.ok(
    groups.open.some(
      (course) => course.slug === 'pre-how-to-hold-two-things-at-once',
    ),
  );
});
