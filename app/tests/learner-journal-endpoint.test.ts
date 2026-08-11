import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  mapLearnerJournalDatabaseError,
  parseSaveLearnerWeekCommand,
  parseStoredLearnerWeekSave,
} from "../src/lib/courses/learner-journal.server";
import { PRE_FREE_COURSE } from "../src/lib/courses/learner-save-contract.server";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..");
const requestId = "11111111-1111-4111-8111-111111111111";
const pageId = "22222222-2222-4222-8222-222222222222";

function readSource(root: string, relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function validCreateCommand() {
  return {
    contractVersion: 1,
    requestId,
    courseSlug: PRE_FREE_COURSE.slug,
    weekNumber: 1,
    sourceKey: "synthesis:week-reflection",
    entryType: "synthesis",
    artifactName: "Two-Truth Reflection",
    title: "Week 1 reflection",
    content: { type: "doc", content: [{ type: "paragraph" }] },
    pageId: null,
    expectedRevision: null,
  };
}

test("the Journal parser accepts exact create and update commands", () => {
  const create = parseSaveLearnerWeekCommand(
    validCreateCommand(),
    PRE_FREE_COURSE.slug,
  );
  assert.equal(create.ok, true);
  if (!create.ok) return;
  assert.deepEqual(create.command, validCreateCommand());

  const updateInput = {
    ...validCreateCommand(),
    requestId: "33333333-3333-4333-8333-333333333333",
    pageId,
    expectedRevision: 2,
    title: "  Revised reflection  ",
  };
  const update = parseSaveLearnerWeekCommand(
    updateInput,
    PRE_FREE_COURSE.slug,
  );
  assert.equal(update.ok, true);
  if (!update.ok) return;
  assert.equal(update.command.title, "Revised reflection");
  assert.equal(update.command.pageId, pageId);
  assert.equal(update.command.expectedRevision, 2);
});

test("malformed, forged, non-PRE, and ambiguous Journal commands fail closed", () => {
  const invalidCommands = [
    { ...validCreateCommand(), courseSlug: "c01-how-humans-know-what-they-know" },
    { ...validCreateCommand(), userId: pageId },
    { ...validCreateCommand(), courseId: pageId },
    { ...validCreateCommand(), requestId: "not-a-uuid" },
    { ...validCreateCommand(), contractVersion: 2 },
    { ...validCreateCommand(), weekNumber: 0 },
    { ...validCreateCommand(), sourceKey: "Display Title" },
    { ...validCreateCommand(), sourceKey: "a".repeat(81) },
    { ...validCreateCommand(), entryType: "free" },
    { ...validCreateCommand(), artifactName: "" },
    { ...validCreateCommand(), title: "  " },
    { ...validCreateCommand(), content: { broken: Number.NaN } },
    { ...validCreateCommand(), pageId, expectedRevision: null },
    { ...validCreateCommand(), pageId: null, expectedRevision: 1 },
    { ...validCreateCommand(), pageId, expectedRevision: 0 },
  ];

  for (const command of invalidCommands) {
    assert.deepEqual(
      parseSaveLearnerWeekCommand(command, PRE_FREE_COURSE.slug),
      { ok: false, code: "INVALID_REQUEST" },
    );
  }
});

test("stored Journal work must contain valid version, identity, and revision metadata", () => {
  const course = {
    courseId: "44444444-4444-4444-8444-444444444444",
    courseSlug: PRE_FREE_COURSE.slug,
    courseIdTag: PRE_FREE_COURSE.courseIdTag,
  };
  const stored = {
    contractVersion: 1,
    pageId,
    weekNumber: 2,
    sourceKey: "lens:truth-inventory",
    entryType: "lens_exercise",
    artifactName: null,
    title: "Truth inventory",
    content: { type: "doc", content: [] },
    revision: 3,
    savedAt: "2026-08-10T23:00:00.000Z",
  };

  assert.deepEqual(parseStoredLearnerWeekSave(stored, course), {
    ...stored,
    course,
  });
  assert.equal(
    parseStoredLearnerWeekSave({ ...stored, revision: 0 }, course),
    undefined,
  );
  assert.equal(
    parseStoredLearnerWeekSave({ ...stored, entryType: "free" }, course),
    undefined,
  );
});

test("database failures map to stable safe Journal errors", () => {
  assert.deepEqual(
    mapLearnerJournalDatabaseError("LEAN_L1_03:JOURNAL_LIMIT_REACHED"),
    { code: "JOURNAL_LIMIT_REACHED", status: 403, retryable: false },
  );
  assert.deepEqual(
    mapLearnerJournalDatabaseError("LEAN_L1_03:SAVE_CONFLICT"),
    { code: "SAVE_CONFLICT", status: 409, retryable: false },
  );
  assert.deepEqual(
    mapLearnerJournalDatabaseError("LEAN_L1_03:REQUEST_REPLAY_MISMATCH"),
    { code: "REQUEST_REPLAY_MISMATCH", status: 409, retryable: false },
  );
  assert.deepEqual(mapLearnerJournalDatabaseError("database unavailable"), {
    code: "SERVER_ERROR",
    status: 500,
    retryable: true,
  });
});

test("the course Journal route authenticates before service reads and checks weeks before writes", () => {
  const source = readSource(
    appRoot,
    "src/app/api/courses/[id]/journal/route.ts",
  );
  const authIndex = source.indexOf("authSupabase.auth.getUser()");
  const allowlistIndex = source.indexOf("getFreeLearnerCourse(id)");
  const serviceIndex = source.indexOf("createServiceClient()");
  const weekIndex = source.indexOf("courseHasWeek(");
  const rpcIndex = source.lastIndexOf('"save_learner_journal_page_v1"');

  assert.ok(authIndex >= 0 && authIndex < allowlistIndex);
  assert.ok(allowlistIndex < serviceIndex);
  assert.ok(serviceIndex < rpcIndex);
  assert.ok(weekIndex >= 0 && weekIndex < rpcIndex);
  assert.match(source, /\.eq\("user_id", user\.id\)/);
  assert.match(source, /\.eq\("course_id", courseRow\.id\)/);
  assert.match(source, /\.not\("source_key", "is", null\)/);
  assert.match(source, /progress,[\s\S]*weekSaves,[\s\S]*loadedAt/);
  assert.match(source, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(source, /is_published/);
});

test("the migration protects metadata, replay, revisions, and the Reader active-page cap", () => {
  const source = readSource(
    repoRoot,
    "supabase/migrations/20260810230000_lean_l1_03_learner_journal.sql",
  );

  assert.match(source, /add column if not exists source_key text/);
  assert.match(source, /add column if not exists learner_revision integer/);
  assert.match(source, /journal_pages_learner_source_uidx/);
  assert.match(source, /alter table public\.learner_journal_requests enable row level security/);
  assert.match(source, /revoke all on table public\.learner_journal_requests[\s\S]*public, anon, authenticated/);
  assert.match(source, /revoke insert, update on table public\.journal_pages[\s\S]*public, anon, authenticated/);
  assert.match(source, /grant update \([\s\S]*is_archived[\s\S]*\) on table public\.journal_pages to authenticated/);
  assert.match(source, /create trigger enforce_journal_active_page_limit_v1/);
  assert.match(source, /v_active_count >= 50/);
  assert.match(source, /student', 'scholar', 'adept', 'premium', 'active/);
  assert.match(source, /security definer[\s\S]*set search_path = pg_catalog, public/);
  assert.match(source, /course\.slug = 'pre-how-to-hold-two-things-at-once'/);
  assert.match(source, /course\.content->>'course_id_tag' = 'PRE'/);
  assert.match(source, /grant execute on function public\.save_learner_journal_page_v1[\s\S]*to service_role/);
  assert.match(source, /REQUEST_REPLAY_MISMATCH/);
  assert.match(source, /SAVE_CONFLICT/);
  assert.doesNotMatch(source, /delete from public\.journal_pages|update public\.journal_pages\s+set is_archived = true\s+where user_id/);
});

test("ordinary Journal create and restore routes expose the database cap safely", () => {
  const collectionRoute = readSource(appRoot, "src/app/api/journal/route.ts");
  const pageRoute = readSource(appRoot, "src/app/api/journal/[id]/route.ts");

  for (const source of [collectionRoute, pageRoute]) {
    assert.match(source, /LEAN_L1_03:JOURNAL_LIMIT_REACHED/);
    assert.match(source, /code: 'JOURNAL_LIMIT_REACHED'/);
    assert.match(source, /status: 403/);
  }
});
