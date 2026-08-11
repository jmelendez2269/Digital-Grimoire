import assert from "node:assert/strict";
import test from "node:test";
import { parseCourseMarkdown } from "../src/lib/parsers/course-markdown-parser";

const courseMarkdown = `# Course PRE — Reading Context Test

## COURSE METADATA

| Field | Value |
| --- | --- |
| course_id | PRE |
| title | Reading Context Test |
| production_slug | reading-context-test |

## COURSE PREMISE

Test how reading identities and selections are retained.

## LEARNING OUTCOMES

1. Identify a source and its assigned passage.

## KEY TENSIONS

1. **Belief** vs **Evidence** — A useful tension.

## COMPLETION PATHWAYS

- **C01 — Continue:** Follow the next question.

# WEEK 1 — WHEN MUST WE DECIDE?

**Week type:** Standard
**Core question:** When is belief responsible?
**Key tension:** Evidence / commitment

## READINGS

### 1. The Ethics of Belief — W. K. Clifford

**Why it is here:** Clifford makes belief formation a moral question.

| Tier | Selection | What this depth adds |
| --- | --- | --- |
| **Keystone** | Part I, opening shipowner example | Clifford asks us to imagine a shipowner who suppresses serious doubts about an unsafe vessel, convinces himself it is sound, and sends passengers to their deaths. |
| **Passage** | Part I | Connects the case to Clifford's wider argument. |
| **Full Text** | Complete essay | Shows the full reach and limits of the claim. |
`;

test("V2 reading headings retain a trailing person as the author", () => {
  const result = parseCourseMarkdown(courseMarkdown);
  assert.equal(result.success, true, result.success ? undefined : result.error);
  if (!result.success) return;

  const reading = result.course.content.weeks[0].readings[0];
  assert.equal(reading.title, "The Ethics of Belief");
  assert.equal(reading.author, "W. K. Clifford");
  assert.equal(reading.section, undefined);
  assert.equal(
    reading.tiers.keystone.reference,
    "Part I, opening shipowner example"
  );
  assert.match(reading.tiers.keystone.description, /unsafe vessel/);
});
