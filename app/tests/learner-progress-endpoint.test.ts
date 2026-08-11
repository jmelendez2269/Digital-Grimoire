import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  mapLearnerProgressDatabaseError,
  parseSaveLearnerProgressCommand,
  parseStoredLearnerProgress,
} from "../src/lib/courses/learner-progress.server";
import { PRE_FREE_COURSE } from "../src/lib/courses/learner-save-contract.server";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..");
const requestId = "11111111-1111-4111-8111-111111111111";

function readSource(root: string, relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function validCommand() {
  return {
    contractVersion: 1,
    requestId,
    courseSlug: PRE_FREE_COURSE.slug,
    expectedRevision: null,
    currentWeekNumber: 1,
    currentStage: "read",
    visitedWeekNumbers: [1],
  };
}

test("the progress parser accepts the exact typed PRE command", () => {
  const parsed = parseSaveLearnerProgressCommand(
    validCommand(),
    PRE_FREE_COURSE.slug,
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.command, validCommand());
});

test("malformed, non-PRE, cross-user, and ambiguous commands fail closed", () => {
  const invalidCommands = [
    { ...validCommand(), courseSlug: "c01-how-humans-know-what-they-know" },
    { ...validCommand(), userId: "22222222-2222-4222-8222-222222222222" },
    { ...validCommand(), courseId: "33333333-3333-4333-8333-333333333333" },
    { ...validCommand(), requestId: "not-a-uuid" },
    { ...validCommand(), contractVersion: 2 },
    { ...validCommand(), currentWeekNumber: 0 },
    { ...validCommand(), currentStage: "completed" },
    { ...validCommand(), visitedWeekNumbers: [] },
    { ...validCommand(), currentWeekNumber: 2, visitedWeekNumbers: [2, 1] },
    { ...validCommand(), currentWeekNumber: 2, visitedWeekNumbers: [1] },
    { ...validCommand(), visitedWeekNumbers: [1, 1] },
    { ...validCommand(), expectedRevision: -1 },
  ];

  for (const command of invalidCommands) {
    assert.deepEqual(
      parseSaveLearnerProgressCommand(command, PRE_FREE_COURSE.slug),
      { ok: false, code: "INVALID_REQUEST" },
    );
  }
});

test("stored progress accepts only contract-shaped resumable state", () => {
  const course = {
    courseId: "33333333-3333-4333-8333-333333333333",
    courseSlug: PRE_FREE_COURSE.slug,
    courseIdTag: PRE_FREE_COURSE.courseIdTag,
  };
  const stored = {
    contractVersion: 1,
    currentWeekNumber: 2,
    currentStage: "practice",
    visitedWeekNumbers: [1, 2],
    revision: 3,
    savedAt: "2026-08-10T22:00:00.000Z",
  };

  assert.deepEqual(parseStoredLearnerProgress(stored, course), {
    ...stored,
    course,
  });
  assert.equal(parseStoredLearnerProgress({}, course), null);
  assert.equal(
    parseStoredLearnerProgress({ ...stored, currentStage: "completed" }, course),
    undefined,
  );
});

test("database failures map to stable safe endpoint errors", () => {
  assert.deepEqual(
    mapLearnerProgressDatabaseError("LEAN_L1_02:SAVE_CONFLICT"),
    { code: "SAVE_CONFLICT", status: 409, retryable: false },
  );
  assert.deepEqual(
    mapLearnerProgressDatabaseError("LEAN_L1_02:REQUEST_REPLAY_MISMATCH"),
    { code: "REQUEST_REPLAY_MISMATCH", status: 409, retryable: false },
  );
  assert.deepEqual(mapLearnerProgressDatabaseError("database unavailable"), {
    code: "SERVER_ERROR",
    status: 500,
    retryable: true,
  });
});

test("the endpoint authenticates before service writes and never reads publication", () => {
  const source = readSource(
    appRoot,
    "src/app/api/courses/[id]/progress/route.ts",
  );
  const authIndex = source.indexOf("authSupabase.auth.getUser()");
  const allowlistIndex = source.indexOf("getFreeLearnerCourse(id)");
  const serviceIndex = source.indexOf("createServiceClient()");
  const rpcIndex = source.indexOf('"save_learner_course_progress_v1"');

  assert.ok(authIndex >= 0 && authIndex < allowlistIndex);
  assert.ok(allowlistIndex < serviceIndex);
  assert.ok(serviceIndex < rpcIndex);
  assert.match(source, /getFreeLearnerCourse\(id\)/);
  assert.match(source, /\.eq\("user_id", user\.id\)/);
  assert.match(source, /\.eq\("course_id", courseRow\.id\)/);
  assert.match(source, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(source, /is_published/);
});

test("the migration keeps customer writes closed and the RPC service-only", () => {
  const source = readSource(
    repoRoot,
    "supabase/migrations/20260810220000_lean_l1_02_learner_progress.sql",
  );

  assert.match(source, /alter table public\.learner_progress_requests enable row level security/);
  assert.match(source, /revoke all on table public\.learner_progress_requests[\s\S]*from public, anon, authenticated/);
  assert.match(source, /revoke insert, update, delete, truncate, references, trigger[\s\S]*public\.course_enrollments[\s\S]*public, anon, authenticated/);
  assert.match(source, /using \(auth\.uid\(\) = user_id\)/);
  assert.match(source, /security definer[\s\S]*set search_path = pg_catalog, public/);
  assert.match(source, /course\.slug = 'pre-how-to-hold-two-things-at-once'/);
  assert.match(source, /course\.content->>'course_id_tag' = 'PRE'/);
  assert.match(source, /grant execute on function public\.save_learner_course_progress_v1[\s\S]*to service_role/);
  assert.match(source, /REQUEST_REPLAY_MISMATCH/);
  assert.match(source, /SAVE_CONFLICT/);
  assert.doesNotMatch(source, /is_published/);
});
