import "server-only";

import {
  LEARNER_SAVE_CONTRACT_VERSION,
  LEARNER_WEEK_STAGES,
  type FreeLearnerCourseSlug,
  type LearnerContractErrorCode,
  type LearnerCourseIdentity,
  type LearnerProgressStateV1,
  type SaveLearnerProgressCommandV1,
  isLearnerWeekNumber,
} from "./learner-save-contract.server";

type ParseResult =
  | { ok: true; command: SaveLearnerProgressCommandV1 }
  | { ok: false; code: "INVALID_REQUEST" };

const COMMAND_KEYS = new Set([
  "contractVersion",
  "requestId",
  "courseSlug",
  "expectedRevision",
  "currentWeekNumber",
  "currentStage",
  "visitedWeekNumbers",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isSortedUniqueWeekList(
  value: unknown,
  currentWeekNumber: number,
): value is number[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every(isLearnerWeekNumber)) return false;
  if (!value.includes(currentWeekNumber)) return false;

  return value.every((week, index) => index === 0 || week > value[index - 1]);
}

export function parseSaveLearnerProgressCommand(
  value: unknown,
  expectedSlug: FreeLearnerCourseSlug,
): ParseResult {
  if (!isRecord(value)) return { ok: false, code: "INVALID_REQUEST" };
  if (Object.keys(value).some((key) => !COMMAND_KEYS.has(key))) {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  const currentWeekNumber = value.currentWeekNumber;
  if (
    value.contractVersion !== LEARNER_SAVE_CONTRACT_VERSION ||
    typeof value.requestId !== "string" ||
    !UUID_PATTERN.test(value.requestId) ||
    value.courseSlug !== expectedSlug ||
    (value.expectedRevision !== null && !isRevision(value.expectedRevision)) ||
    !isLearnerWeekNumber(currentWeekNumber) ||
    typeof value.currentStage !== "string" ||
    !LEARNER_WEEK_STAGES.includes(value.currentStage as never) ||
    !isSortedUniqueWeekList(value.visitedWeekNumbers, currentWeekNumber)
  ) {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  return {
    ok: true,
    command: {
      contractVersion: LEARNER_SAVE_CONTRACT_VERSION,
      requestId: value.requestId,
      courseSlug: expectedSlug,
      expectedRevision: value.expectedRevision as number | null,
      currentWeekNumber,
      currentStage: value.currentStage as SaveLearnerProgressCommandV1["currentStage"],
      visitedWeekNumbers: [...value.visitedWeekNumbers],
    },
  };
}

export function parseStoredLearnerProgress(
  value: unknown,
  course: LearnerCourseIdentity,
): LearnerProgressStateV1 | null | undefined {
  if (value === null || value === undefined) return null;
  if (isRecord(value) && Object.keys(value).length === 0) return null;
  if (!isRecord(value)) return undefined;

  const currentWeekNumber = value.currentWeekNumber;
  if (
    value.contractVersion !== LEARNER_SAVE_CONTRACT_VERSION ||
    !isLearnerWeekNumber(currentWeekNumber) ||
    typeof value.currentStage !== "string" ||
    !LEARNER_WEEK_STAGES.includes(value.currentStage as never) ||
    !isSortedUniqueWeekList(value.visitedWeekNumbers, currentWeekNumber) ||
    !isRevision(value.revision) ||
    value.revision < 1 ||
    typeof value.savedAt !== "string" ||
    !Number.isFinite(Date.parse(value.savedAt))
  ) {
    return undefined;
  }

  return {
    contractVersion: LEARNER_SAVE_CONTRACT_VERSION,
    course,
    currentWeekNumber,
    currentStage: value.currentStage as LearnerProgressStateV1["currentStage"],
    visitedWeekNumbers: [...value.visitedWeekNumbers],
    revision: value.revision,
    savedAt: value.savedAt,
  };
}

export interface LearnerProgressErrorMapping {
  code: LearnerContractErrorCode;
  status: number;
  retryable: boolean;
}

export function mapLearnerProgressDatabaseError(
  message: string | null | undefined,
): LearnerProgressErrorMapping {
  const mappings: Array<[
    string,
    LearnerProgressErrorMapping,
  ]> = [
    ["INVALID_REQUEST", { code: "INVALID_REQUEST", status: 400, retryable: false }],
    ["COURSE_NOT_ALLOWLISTED", { code: "COURSE_NOT_ALLOWLISTED", status: 403, retryable: false }],
    ["ENROLLMENT_REQUIRED", { code: "ENROLLMENT_REQUIRED", status: 403, retryable: false }],
    ["WEEK_NOT_FOUND", { code: "WEEK_NOT_FOUND", status: 404, retryable: false }],
    ["SAVE_CONFLICT", { code: "SAVE_CONFLICT", status: 409, retryable: false }],
    ["REQUEST_REPLAY_MISMATCH", { code: "REQUEST_REPLAY_MISMATCH", status: 409, retryable: false }],
  ];

  for (const [marker, mapping] of mappings) {
    if (message?.includes(`LEAN_L1_02:${marker}`)) return mapping;
  }

  return { code: "SERVER_ERROR", status: 500, retryable: true };
}
