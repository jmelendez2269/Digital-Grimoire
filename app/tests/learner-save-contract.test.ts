import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  FREE_LEARNER_COURSES,
  LEARNER_CONTRACT_ERROR_CODES,
  LEARNER_SAVE_CONTRACT,
  LEARNER_SAVE_EXCLUSIONS,
  LEARNER_WEEK_STAGES,
  PRE_FREE_COURSE,
  getFreeLearnerCourse,
  isLearnerSourceKey,
  isLearnerWeekNumber,
} from "../src/lib/courses/learner-save-contract.server";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("the server-owned free-course authority contains PRE and nothing else", () => {
  assert.deepEqual(FREE_LEARNER_COURSES, [PRE_FREE_COURSE]);
  assert.deepEqual(PRE_FREE_COURSE, {
    key: "PRE",
    slug: "pre-how-to-hold-two-things-at-once",
    courseIdTag: "PRE",
  });

  assert.equal(getFreeLearnerCourse(PRE_FREE_COURSE.slug), PRE_FREE_COURSE);
  assert.equal(getFreeLearnerCourse("c01-how-humans-know-what-they-know"), null);
  assert.equal(getFreeLearnerCourse(PRE_FREE_COURSE.slug.toUpperCase()), null);
  assert.equal(getFreeLearnerCourse(` ${PRE_FREE_COURSE.slug}`), null);
});

test("publication and browser-supplied identity never grant save access", () => {
  assert.equal(LEARNER_SAVE_CONTRACT.authority.databasePublishedGrantsAccess, false);
  assert.equal(LEARNER_SAVE_CONTRACT.authority.clientSuppliedUserIdGrantsAccess, false);
  assert.equal(LEARNER_SAVE_CONTRACT.authority.clientSuppliedCourseIdGrantsAccess, false);
  assert.equal(LEARNER_SAVE_CONTRACT.authority.requiresServerVerifiedSession, true);
  assert.equal(LEARNER_SAVE_CONTRACT.authority.requiresConfirmedEmail, true);
  assert.equal(LEARNER_SAVE_CONTRACT.authority.requiresOwnedEnrollment, true);
});

test("progress is resumable navigation state, not a completion lifecycle", () => {
  assert.deepEqual(LEARNER_WEEK_STAGES, [
    "start",
    "read",
    "companions",
    "practice",
    "finish",
  ]);
  assert.equal(
    LEARNER_SAVE_CONTRACT.progress.currentWeekMeans,
    "last-explicitly-opened-week",
  );
  assert.equal(
    LEARNER_SAVE_CONTRACT.progress.visitedWeeksAre,
    "sorted-unique-never-shrinking",
  );
  assert.equal(LEARNER_SAVE_CONTRACT.progress.supportsCourseCompletion, false);
});

test("week saves are uniquely addressed, revision-checked, and replay-safe", () => {
  assert.equal(
    LEARNER_SAVE_CONTRACT.weekSave.oneLogicalPagePer,
    "user-course-week-source",
  );
  assert.equal(LEARNER_SAVE_CONTRACT.weekSave.createRequiresNullPageAndRevision, true);
  assert.equal(
    LEARNER_SAVE_CONTRACT.weekSave.updateRequiresOwnedMatchingPageAndRevision,
    true,
  );
  assert.equal(LEARNER_SAVE_CONTRACT.weekSave.identicalRequestReplayIsIdempotent, true);
  assert.equal(
    LEARNER_SAVE_CONTRACT.weekSave.changedPayloadWithReusedRequestIdConflicts,
    true,
  );
});

test("identifiers fail closed when malformed", () => {
  for (const valid of [1, 2, 99]) assert.equal(isLearnerWeekNumber(valid), true);
  for (const invalid of [0, -1, 1.5, "1", null, Number.NaN]) {
    assert.equal(isLearnerWeekNumber(invalid), false);
  }

  for (const valid of ["synthesis:week-reflection", "practice.truth_inventory", "capstone-1"]) {
    assert.equal(isLearnerSourceKey(valid), true, valid);
  }
  for (const invalid of ["", "Has Spaces", "UPPERCASE", "../escape", "x".repeat(81)]) {
    assert.equal(isLearnerSourceKey(invalid), false, invalid);
  }
});

test("the contract names stable failures and all explicit exclusions", () => {
  assert.deepEqual(LEARNER_SAVE_EXCLUSIONS, [
    "billing_effects",
    "retained_completed_course_access",
    "membership_slot_release",
    "certificates",
    "generalized_completion_lifecycle",
  ]);

  for (const code of [
    "AUTH_REQUIRED",
    "COURSE_NOT_ALLOWLISTED",
    "ENROLLMENT_REQUIRED",
    "WEEK_NOT_FOUND",
    "JOURNAL_LIMIT_REACHED",
    "SAVE_CONFLICT",
    "REQUEST_REPLAY_MISMATCH",
    "SERVER_ERROR",
  ]) {
    assert.ok(LEARNER_CONTRACT_ERROR_CODES.includes(code as never), code);
  }
});

test("reload is server-authoritative, non-cacheable, and preserves unsaved input", () => {
  assert.equal(LEARNER_SAVE_CONTRACT.reload.serverSnapshotIsAuthoritative, true);
  assert.equal(LEARNER_SAVE_CONTRACT.reload.responseCacheable, false);
  assert.equal(
    LEARNER_SAVE_CONTRACT.reload.unsavedClientInputSurvivesErrorsAndConflicts,
    true,
  );
});

test("the normative contract remains a server-only module", () => {
  const source = readFileSync(
    resolve(appRoot, "src/lib/courses/learner-save-contract.server.ts"),
    "utf8",
  );
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /process\.env/);
});
