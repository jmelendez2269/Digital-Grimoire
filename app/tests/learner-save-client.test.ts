import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  LEARNER_WEEK_SOURCE_KEY,
  createLearnerJournalContent,
  isLearnerReloadSnapshot,
  mergeLearnerWeekSaves,
  parseLearnerSaveError,
  readLearnerJournalText,
  type LearnerWeekDraft,
  type LearnerWeekSaveSnapshot,
} from "../src/lib/courses/learner-save-client";

function savedPage(text: string, revision = 1): LearnerWeekSaveSnapshot {
  return {
    pageId: "11111111-1111-4111-8111-111111111111",
    weekNumber: 1,
    sourceKey: LEARNER_WEEK_SOURCE_KEY,
    entryType: "synthesis",
    artifactName: "A small map",
    title: "Week 1 reflection",
    content: createLearnerJournalContent(text),
    revision,
    savedAt: "2026-08-11T12:00:00.000Z",
  };
}

test("Journal text round-trips without dropping blank lines", () => {
  const text = "First thought\n\nA second thought";
  assert.equal(readLearnerJournalText(createLearnerJournalContent(text)), text);
});

test("a clean reload restores saved Journal work", () => {
  const merged = mergeLearnerWeekSaves({}, [savedPage("Saved words")]);

  assert.equal(merged[1].text, "Saved words");
  assert.equal(merged[1].savedText, "Saved words");
  assert.equal(merged[1].save?.revision, 1);
  assert.deepEqual(merged[1].status, {
    kind: "saved",
    savedAt: "2026-08-11T12:00:00.000Z",
  });
});

test("reload keeps newer unsaved browser input and adopts the latest revision", () => {
  const draft: LearnerWeekDraft = {
    text: "My newer unsaved words",
    savedText: "Old saved words",
    save: savedPage("Old saved words", 1),
    status: { kind: "error", message: "Network failed", canRetry: true },
  };

  const merged = mergeLearnerWeekSaves({ 1: draft }, [
    savedPage("Changed in another session", 2),
  ]);

  assert.equal(merged[1].text, "My newer unsaved words");
  assert.equal(merged[1].savedText, "Changed in another session");
  assert.equal(merged[1].save?.revision, 2);
  assert.deepEqual(merged[1].status, {
    kind: "conflict",
    reloadRequired: false,
    message:
      "The newest saved copy was loaded, and your unsaved draft was kept.",
  });
});

test("unrelated Journal sources do not replace a course reflection draft", () => {
  const unrelated = { ...savedPage("Other"), sourceKey: "note:reading" };
  assert.deepEqual(mergeLearnerWeekSaves({}, [unrelated]), {});
});

test("reload keeps unsaved words when a formerly saved page is gone", () => {
  const existing: LearnerWeekDraft = {
    text: "Keep these newer words",
    savedText: "Former saved words",
    save: savedPage("Former saved words"),
    status: { kind: "idle" },
  };

  const merged = mergeLearnerWeekSaves({ 1: existing }, []);
  assert.equal(merged[1].text, "Keep these newer words");
  assert.equal(merged[1].savedText, "");
  assert.equal(merged[1].save, null);
  assert.deepEqual(merged[1].status, {
    kind: "conflict",
    reloadRequired: false,
    message:
      "The former saved page is no longer available, and your unsaved draft was kept.",
  });
});

test("reload clears a clean browser copy when the server page is gone", () => {
  const existing: LearnerWeekDraft = {
    text: "Former saved words",
    savedText: "Former saved words",
    save: savedPage("Former saved words"),
    status: { kind: "saved", savedAt: "2026-08-11T12:00:00.000Z" },
  };

  assert.deepEqual(mergeLearnerWeekSaves({ 1: existing }, [])[1], {
    text: "",
    savedText: "",
    save: null,
    status: { kind: "idle" },
  });
});

test("safe error parsing preserves cap and retry meaning", () => {
  assert.deepEqual(
    parseLearnerSaveError(
      {
        error: "Archive a Journal page before creating another active page.",
        code: "JOURNAL_LIMIT_REACHED",
        retryable: false,
      },
      "Fallback"
    ),
    {
      code: "JOURNAL_LIMIT_REACHED",
      message: "Archive a Journal page before creating another active page.",
      retryable: false,
    }
  );

  assert.deepEqual(parseLearnerSaveError(null, "Try again."), {
    code: "SERVER_ERROR",
    message: "Try again.",
    retryable: true,
  });
});

test("reload snapshots are checked before the UI trusts their shape", () => {
  assert.equal(
    isLearnerReloadSnapshot({
      contractVersion: 1,
      progress: null,
      weekSaves: [savedPage("Saved")],
      loadedAt: "2026-08-11T12:01:00.000Z",
    }),
    true
  );
  assert.equal(
    isLearnerReloadSnapshot({
      contractVersion: 1,
      progress: null,
      weekSaves: "not-an-array",
      loadedAt: "2026-08-11T12:01:00.000Z",
    }),
    false
  );
});

test("the live V2 learner page enables persistence for PRE only", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/app/courses/[slug]/learn/page.tsx"),
    "utf8"
  );

  assert.match(source, /slug === PRE_LEARNER_COURSE_SLUG/);
  assert.match(
    source,
    /persistence=\{[\s\S]*courseSlug: PRE_LEARNER_COURSE_SLUG[\s\S]*journalName/
  );
});

test("the V2 renderer wires both journey and stage progress to durable saves", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/courses/CourseLearnerRenderer.tsx"),
    "utf8"
  );

  assert.match(source, /learnerPersistence\.saveProgress\(next, "start"\)/);
  assert.match(
    source,
    /learnerPersistence\.saveProgress\([\s\S]*week\.week_number,[\s\S]*nextStage/
  );
  assert.match(source, /<LearnerWeekJournalPanel/);
});

test("the recovery UI names draft safety and the archive-to-make-room path", () => {
  const source = readFileSync(
    resolve(
      process.cwd(),
      "src/components/courses/LearnerCoursePersistence.tsx"
    ),
    "utf8"
  );

  assert.match(source, /Your\s+draft is safe here/);
  assert.match(source, /href="\/journal"[\s\S]*target="_blank"/);
  assert.match(source, /Retry after archiving/);
  assert.match(source, /Reload saved copy; keep draft/);
  assert.match(source, /Your draft has not\s+been replaced/);
});
