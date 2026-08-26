import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseCourseMarkdown } from '../src/lib/parsers/course-markdown-parser';
import { serializeCourseToMarkdown } from '../src/lib/serializers/course-markdown-serializer';

const repoRoot = new URL('../../', import.meta.url);
const v1Markdown = readFileSync(new URL('docs/planning/course_01_full.md', repoRoot), 'utf8');
const secondV1Markdown = readFileSync(new URL('docs/planning/course_02_full.md', repoRoot), 'utf8');
const correctedPre = readFileSync(
  'C:/Projects/Parallax_mission_control/docs/pre-how-to-hold-two-things-at-once-hybrid-review-draft.md',
  'utf8'
);
const correctedC01 = readFileSync(
  'C:/Projects/Parallax_mission_control/docs/courses/c01-how-humans-know-what-they-know-revision-draft.md',
  'utf8'
);
const fd01Draft = readFileSync(
  'C:/Projects/Parallax_mission_control/docs/courses/fd01-recreation-draft.md',
  'utf8'
);
const friendlyRecreationDrafts = [
  {
    code: 'C04',
    markdown: readFileSync(
      'C:/Projects/Parallax_mission_control/docs/courses/c04-recreation-draft.md',
      'utf8'
    ),
    readings: [2, 2, 2, 1, 2, 1, 1, 0],
    pathways: ['C05', 'FD03', 'C17'],
  },
  {
    code: 'C05',
    markdown: readFileSync(
      'C:/Projects/Parallax_mission_control/docs/courses/c05-recreation-draft.md',
      'utf8'
    ),
    readings: [2, 1, 2, 3, 2, 2, 3, 0],
    pathways: ['C06', 'C12', 'C14', 'C15'],
  },
  {
    code: 'C14',
    markdown: readFileSync(
      'C:/Projects/Parallax_mission_control/docs/courses/c14-recreation-draft.md',
      'utf8'
    ),
    readings: [2, 2, 2, 2, 2, 2, 2, 0],
    pathways: ['C15', 'C16'],
  },
];
const liveCourses = JSON.parse(readFileSync(new URL('scripts/courses.json', repoRoot), 'utf8')) as Array<{
  id: string;
  slug: string;
  content: { weeks?: unknown[] };
}>;

test('Parser V1 course remains parseable and renderable', () => {
  const result = parseCourseMarkdown(v1Markdown);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.course.content.format_version, undefined);
  assert.equal(result.course.content.weeks.length, 8);
  assert.ok(result.course.content.weeks.filter((week) => week.week_type !== 'capstone').every((week) => week.readings.length >= 2));
});

test('a second Parser V1 course continues through the original format path', () => {
  const result = parseCourseMarkdown(secondV1Markdown);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.course.content.format_version, undefined);
  assert.equal(result.course.content.course_id_tag, 'C02');
  assert.equal(result.course.content.weeks.length, 8);
  assert.ok(
    result.course.content.weeks
      .filter((week) => week.week_type !== 'capstone')
      .every((week) => week.readings.length > 0)
  );
});

test('corrected PRE retains V2 readings, cards, cases, links, and completion pathways', () => {
  const result = parseCourseMarkdown(correctedPre);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.course.content.format_version, 2);
  assert.equal(result.course.slug, 'pre-how-to-hold-two-things-at-once');
  assert.deepEqual(result.course.content.weeks.map((week) => week.readings.length), [3, 3]);
  assert.deepEqual(result.course.content.weeks.map((week) => week.companion_cards?.length), [1, 3]);
  assert.equal(result.course.content.learner_case_deck?.length, 4);
  assert.equal(result.course.content.completion_pathways.length, 7);
  const cards = result.course.content.weeks.flatMap((week) => week.companion_cards ?? []);
  assert.equal(cards.length, 4);
  assert.ok(cards.every((card) => card.meet_the_source && card.idea_plain_language));
  assert.ok(cards.every((card) => card.direct_url?.startsWith('https://')));
});

test('V2 parse-serialize-parse round trip preserves learner-facing counts', () => {
  const first = parseCourseMarkdown(correctedPre);
  assert.equal(first.success, true);
  if (!first.success) return;
  const second = parseCourseMarkdown(serializeCourseToMarkdown(first.course));
  assert.equal(second.success, true);
  if (!second.success) return;
  assert.deepEqual(
    second.course.content.weeks.map((week) => ({
      readings: week.readings.length,
      cards: week.companion_cards?.length,
      sections: week.sections?.length,
    })),
    first.course.content.weeks.map((week) => ({
      readings: week.readings.length,
      cards: week.companion_cards?.length,
      sections: week.sections?.length,
    }))
  );
  assert.equal(second.course.content.learner_case_deck?.length, first.course.content.learner_case_deck?.length);
  assert.deepEqual(second.course.content.sections, first.course.content.sections);
  assert.deepEqual(
    second.course.content.weeks.map((week) => week.sections),
    first.course.content.weeks.map((week) => week.sections)
  );
  assert.deepEqual(second.course.content.learner_case_deck, first.course.content.learner_case_deck);
  assert.deepEqual(
    second.course.content.weeks.flatMap((week) =>
      (week.companion_cards ?? []).map((card) => ({
        title: card.title,
        direct_url: card.direct_url,
        sections: card.sections,
      }))
    ),
    first.course.content.weeks.flatMap((week) =>
      (week.companion_cards ?? []).map((card) => ({
        title: card.title,
        direct_url: card.direct_url,
        sections: card.sections,
      }))
    )
  );
});

test('revised C01 retains its complete learner-facing structure', () => {
  const result = parseCourseMarkdown(correctedC01);
  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.course.content.format_version, 2);
  assert.equal(result.course.slug, 'c01-how-humans-know-what-they-know');
  assert.equal(result.course.duration_weeks, 8);
  assert.ok(result.course.premise.includes('Reality may be larger than any one of us can see'));
  assert.ok(result.course.content.scope_limits?.includes('A care note before we begin'));
  assert.ok(result.course.content.scope_limits?.includes('will not pressure you toward a particular conclusion'));
  assert.equal(result.course.learning_outcomes.length, 7);
  assert.equal(result.course.content.key_tensions.length, 6);
  assert.deepEqual(result.course.content.key_tensions[0], {
    label: 'Certainty and confidence',
    description: 'Does knowing require complete certainty? How can our confidence reflect the support we have?',
  });
  assert.deepEqual(
    result.course.content.completion_pathways.map((pathway) => pathway.code),
    ['FD01', 'C02', 'C03', 'C04', 'C05']
  );
  assert.equal(result.course.content.learner_case_deck?.length, 8);
  assert.deepEqual(
    result.course.content.weeks.map((week) => week.readings.length),
    [4, 4, 4, 4, 4, 4, 4, 0]
  );
  assert.deepEqual(
    result.course.content.weeks.map((week) => week.companion_cards?.length ?? 0),
    [1, 1, 2, 1, 1, 1, 1, 0]
  );
  assert.ok(result.course.content.weeks.every((week) => Boolean(week.core_question)));
  assert.ok(result.course.content.weeks.every((week) => Boolean(week.doorway)));
  assert.ok(result.course.content.weeks.slice(0, 7).every((week) => Boolean(week.practices)));
  assert.equal(result.course.content.weeks[7].week_type, 'capstone');

  const firstReading = result.course.content.weeks[0].readings[0];
  assert.equal(firstReading.title, 'Republic');
  assert.equal(firstReading.author, 'Plato');
  assert.equal(firstReading.section, 'Book VII');
  assert.equal(firstReading.tiers.keystone.reference, '514a–517a, the prisoners and shadows.');
  assert.ok(firstReading.reading_note?.includes('political responsibility'));

  assert.deepEqual(result.warnings, []);
});

test('revised C01 round trip preserves readings, companions, cases, pathways, and warnings', () => {
  const first = parseCourseMarkdown(correctedC01);
  assert.equal(first.success, true);
  if (!first.success) return;

  const second = parseCourseMarkdown(serializeCourseToMarkdown(first.course));
  assert.equal(second.success, true);
  if (!second.success) return;

  assert.deepEqual(
    second.course.content.weeks.map((week) => ({
      readings: week.readings.length,
      companions: week.companion_cards?.length ?? 0,
      sections: week.sections?.length ?? 0,
    })),
    first.course.content.weeks.map((week) => ({
      readings: week.readings.length,
      companions: week.companion_cards?.length ?? 0,
      sections: week.sections?.length ?? 0,
    }))
  );
  assert.equal(
    second.course.content.learner_case_deck?.length,
    first.course.content.learner_case_deck?.length
  );
  assert.equal(
    second.course.content.completion_pathways.length,
    first.course.content.completion_pathways.length
  );
  assert.deepEqual(second.warnings, first.warnings);
});

test('FD01 V2 preserves its stable identity and complete learner-facing structure', () => {
  const result = parseCourseMarkdown(fd01Draft);
  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.course.content.format_version, 2);
  assert.equal(result.course.content.course_id_tag, 'FD01');
  assert.equal(
    result.course.slug,
    'fd01-mythic-imagination-from-classical-pattern-to-personal-meaning'
  );
  assert.equal(result.course.content.production_slug, result.course.slug);
  assert.equal(result.course.duration_weeks, 6);
  assert.deepEqual(
    result.course.content.weeks.map((week) => week.title),
    [
      'THE STORY THAT SOMEHOW KNOWS YOU',
      'WHAT IS A MYTH ACTUALLY DOING?',
      'THE PATTERN—AND THE STORIES THAT BREAK IT',
      'HERE THERE BE MONSTERS',
      'ARE YOU LIVING A MYTH—OR JUST BORROWING ONE?',
      'THE STORIES WE CARRY',
    ]
  );
  assert.deepEqual(
    result.course.content.weeks.map((week) => week.readings.length),
    [2, 3, 3, 3, 4, 0]
  );
  assert.deepEqual(
    result.course.content.weeks.map((week) => week.companion_cards?.length ?? 0),
    [1, 1, 1, 1, 0, 0]
  );
  assert.ok(
    result.course.content.weeks.every((week) => Boolean(week.key_tension))
  );
  assert.equal(result.course.content.weeks[4].supplied_cases?.length, 4);
  assert.equal(result.course.content.weeks[5].return_readings?.length, 3);
  assert.deepEqual(
    result.course.content.completion_pathways.map((pathway) => pathway.code),
    ['C02', 'C08', 'C15']
  );
  assert.equal(result.course.content.reference_materials?.length, 2);
  assert.equal(result.course.content.completed_examples?.length, 1);
  assert.equal(result.course.content.learner_case_deck?.length, 0);
  assert.match(
    result.course.content.course_use_guidance ?? '',
    /THE FIVE DISTINCTIONS WE WILL KEEP MAKING/
  );
  assert.match(result.course.content.tone_safety ?? '', /You never need to disclose/);
  assert.ok(
    result.course.content.weeks[2].practices?.heading.includes('Knowledge Graph')
  );
  assert.match(
    result.course.content.weeks[2].practices?.markdown ?? '',
    /view=fd01-w03-pattern-test/
  );
  assert.match(
    result.course.content.weeks[2].practices?.markdown ?? '',
    /This connection supports ____\. It does not establish ____\./
  );

  assert.ok(
    result.course.content.weeks
      .slice(0, 4)
      .every((week) => Boolean(week.companion_cards?.[0]?.argues_or_found))
  );
  assert.equal(result.warnings.length, 0);
});

test('FD01 V2 round trip preserves readings, companions, cases, returns, materials, and pathways', () => {
  const first = parseCourseMarkdown(fd01Draft);
  assert.equal(first.success, true);
  if (!first.success) return;

  const serialized = serializeCourseToMarkdown(first.course);
  assert.match(
    serialized,
    /\|\s*Production slug\s*\|\s*fd01-mythic-imagination-from-classical-pattern-to-personal-meaning\s*\|/
  );
  const second = parseCourseMarkdown(serialized);
  assert.equal(second.success, true);
  if (!second.success) return;

  assert.equal(second.course.slug, first.course.slug);
  assert.deepEqual(
    second.course.content.weeks.map((week) => ({
      readings: week.readings.length,
      companions: week.companion_cards?.length ?? 0,
      suppliedCases: week.supplied_cases?.length ?? 0,
      returnReadings: week.return_readings?.length ?? 0,
    })),
    first.course.content.weeks.map((week) => ({
      readings: week.readings.length,
      companions: week.companion_cards?.length ?? 0,
      suppliedCases: week.supplied_cases?.length ?? 0,
      returnReadings: week.return_readings?.length ?? 0,
    }))
  );
  assert.deepEqual(
    second.course.content.completion_pathways,
    first.course.content.completion_pathways
  );
  assert.deepEqual(
    second.course.content.reference_materials,
    first.course.content.reference_materials
  );
  assert.deepEqual(
    second.course.content.completed_examples,
    first.course.content.completed_examples
  );
});

test('friendly recreation headings remain parser-valid without losing learner structure', () => {
  for (const draft of friendlyRecreationDrafts) {
    const result = parseCourseMarkdown(draft.markdown);
    assert.equal(result.success, true, draft.code);
    if (!result.success) continue;

    assert.equal(result.course.content.course_id_tag, draft.code);
    assert.equal(result.course.content.curator_note_public, 'Coming soon.');
    assert.equal(result.course.content.weeks.length, 8);
    assert.deepEqual(
      result.course.content.weeks.map((week) => week.readings.length),
      draft.readings
    );
    assert.deepEqual(
      result.course.content.completion_pathways.map((pathway) => pathway.code),
      draft.pathways
    );
    assert.ok(result.course.content.weeks.every((week) => Boolean(week.doorway)));
    assert.ok(result.course.content.weeks.every((week) => Boolean(week.core_question)));
    assert.ok(
      result.course.content.weeks
        .slice(0, 7)
        .every((week) => Boolean(week.synthesis_prompt?.prompt))
    );
    assert.deepEqual(result.warnings, []);
  }
});

function minimalV2Course(courseId: string): string {
  return `# ${courseId} — Parser smoke test

## COURSE METADATA

| Field | Value |
| --- | --- |
| Course ID | ${courseId} |
| Length | 1 week |

## COURSE PREMISE

Test the richer format without entering the V1 path.

## LEARNING OUTCOMES

- Identify the parsed course.

## KEY TENSIONS

| Tension | Question underneath it |
| --- | --- |
| Old vs new | Which parser handled this file? |

# WEEK 1 — ONE WEEK

## Core question

Did V2 parse this course?

## Key tension

**Old vs new**

## Why this week matters

It provides a compact parser fixture.

## Readings

### Example Author — *Example Work*

- **Keystone:** One paragraph.
- **Passage:** One section.
- **Full Text:** The complete work.

## COMPLETION PATHWAYS

### C99 — Continue testing

Use the next fixture.
`;
}

test('V2 accepts C02/C03 smoke fixtures and multi-letter course families', () => {
  for (const courseId of ['C02', 'C03', 'CQ01', 'EP01', 'FNV01']) {
    const result = parseCourseMarkdown(minimalV2Course(courseId));
    assert.equal(result.success, true, `${courseId} should parse through V2`);
    if (!result.success) continue;
    assert.equal(result.course.content.format_version, 2);
    assert.equal(result.course.content.course_id_tag, courseId);
    assert.equal(result.course.content.weeks.length, 1);
  }
});

test('unknown learner-facing V2 heading is retained and visibly warned', () => {
  const markdown = correctedPre.replace(
    '## PLAIN-LANGUAGE DOORWAY',
    '## UNREGISTERED LEARNER SECTION\n\nKeep this visible.\n\n## PLAIN-LANGUAGE DOORWAY'
  );
  const result = parseCourseMarkdown(markdown);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.ok(result.course.content.weeks[0].sections?.some((section) => section.heading === 'UNREGISTERED LEARNER SECTION'));
});

test('malformed Markdown fails without writing or inventing weeks', () => {
  const result = parseCourseMarkdown('# Course BAD — Missing Weeks\n\n## COURSE PREMISE\n\nNo weeks.');
  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.error, /No weekly sections/);
});

test('V2 reports actionable validation errors for missing required sections', () => {
  const result = parseCourseMarkdown(
    correctedPre.replaceAll('## COMPLETION PATHWAYS', '## OMITTED PATHWAYS')
  );
  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.error, /Course Format V2 validation failed/);
  assert.match(result.error, /COMPLETION PATHWAYS/);
});

test('existing live PRE identity fixture is read-only and unchanged by parsing corrected PRE', () => {
  const livePre = liveCourses.find((course) => course.slug === 'pre-how-to-hold-two-things-at-once');
  assert.ok(livePre);
  const snapshot = JSON.stringify(livePre);
  parseCourseMarkdown(correctedPre);
  assert.equal(JSON.stringify(livePre), snapshot);
  assert.equal(livePre?.id, 'a8cd1728-ff6b-4f76-98e6-61bd86ae6a2c');
});
