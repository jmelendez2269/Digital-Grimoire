import "server-only";

import {
  LEARNER_JOURNAL_ENTRY_TYPES,
  LEARNER_SAVE_CONTRACT_VERSION,
  isLearnerSourceKey,
  isLearnerWeekNumber,
  type FreeLearnerCourseSlug,
  type JsonValue,
  type LearnerContractErrorCode,
  type LearnerCourseIdentity,
  type LearnerWeekSaveStateV1,
  type SaveLearnerWeekCommandV1,
} from "./learner-save-contract.server";

type ParseResult =
  | { ok: true; command: SaveLearnerWeekCommandV1 }
  | { ok: false; code: "INVALID_REQUEST" };

const COMMAND_KEYS = new Set([
  "contractVersion",
  "requestId",
  "courseSlug",
  "weekNumber",
  "sourceKey",
  "entryType",
  "artifactName",
  "title",
  "content",
  "pageId",
  "expectedRevision",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

function isArtifactName(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      value.trim().length >= 1 &&
      value.trim().length <= 200)
  );
}

export function parseSaveLearnerWeekCommand(
  value: unknown,
  expectedSlug: FreeLearnerCourseSlug,
): ParseResult {
  if (!isRecord(value)) return { ok: false, code: "INVALID_REQUEST" };
  if (Object.keys(value).some((key) => !COMMAND_KEYS.has(key))) {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const isCreate = value.pageId === null && value.expectedRevision === null;
  const isUpdate = isUuid(value.pageId) && isRevision(value.expectedRevision);

  if (
    value.contractVersion !== LEARNER_SAVE_CONTRACT_VERSION ||
    !isUuid(value.requestId) ||
    value.courseSlug !== expectedSlug ||
    !isLearnerWeekNumber(value.weekNumber) ||
    !isLearnerSourceKey(value.sourceKey) ||
    typeof value.entryType !== "string" ||
    !LEARNER_JOURNAL_ENTRY_TYPES.includes(value.entryType as never) ||
    !isArtifactName(value.artifactName) ||
    title.length < 1 ||
    title.length > 200 ||
    !isJsonValue(value.content) ||
    (!isCreate && !isUpdate)
  ) {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  return {
    ok: true,
    command: {
      contractVersion: LEARNER_SAVE_CONTRACT_VERSION,
      requestId: value.requestId,
      courseSlug: expectedSlug,
      weekNumber: value.weekNumber,
      sourceKey: value.sourceKey,
      entryType: value.entryType as SaveLearnerWeekCommandV1["entryType"],
      artifactName:
        value.artifactName === null ? null : value.artifactName.trim(),
      title,
      content: value.content,
      pageId: isCreate ? null : (value.pageId as string),
      expectedRevision: isCreate ? null : (value.expectedRevision as number),
    },
  };
}

export function parseStoredLearnerWeekSave(
  value: unknown,
  course: LearnerCourseIdentity,
): LearnerWeekSaveStateV1 | undefined {
  if (!isRecord(value)) return undefined;

  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (
    value.contractVersion !== LEARNER_SAVE_CONTRACT_VERSION ||
    !isUuid(value.pageId) ||
    !isLearnerWeekNumber(value.weekNumber) ||
    !isLearnerSourceKey(value.sourceKey) ||
    typeof value.entryType !== "string" ||
    !LEARNER_JOURNAL_ENTRY_TYPES.includes(value.entryType as never) ||
    !isArtifactName(value.artifactName) ||
    title.length < 1 ||
    title.length > 200 ||
    !isJsonValue(value.content) ||
    !isRevision(value.revision) ||
    typeof value.savedAt !== "string" ||
    !Number.isFinite(Date.parse(value.savedAt))
  ) {
    return undefined;
  }

  return {
    contractVersion: LEARNER_SAVE_CONTRACT_VERSION,
    pageId: value.pageId,
    course,
    weekNumber: value.weekNumber,
    sourceKey: value.sourceKey,
    entryType: value.entryType as LearnerWeekSaveStateV1["entryType"],
    artifactName:
      value.artifactName === null ? null : value.artifactName.trim(),
    title,
    content: value.content,
    revision: value.revision,
    savedAt: value.savedAt,
  };
}

export interface LearnerJournalErrorMapping {
  code: LearnerContractErrorCode;
  status: number;
  retryable: boolean;
}

export function mapLearnerJournalDatabaseError(
  message: string | null | undefined,
): LearnerJournalErrorMapping {
  const mappings: Array<[string, LearnerJournalErrorMapping]> = [
    ["INVALID_REQUEST", { code: "INVALID_REQUEST", status: 400, retryable: false }],
    ["COURSE_NOT_ALLOWLISTED", { code: "COURSE_NOT_ALLOWLISTED", status: 403, retryable: false }],
    ["ENROLLMENT_REQUIRED", { code: "ENROLLMENT_REQUIRED", status: 403, retryable: false }],
    ["WEEK_NOT_FOUND", { code: "WEEK_NOT_FOUND", status: 404, retryable: false }],
    ["JOURNAL_LIMIT_REACHED", { code: "JOURNAL_LIMIT_REACHED", status: 403, retryable: false }],
    ["SAVE_CONFLICT", { code: "SAVE_CONFLICT", status: 409, retryable: false }],
    ["REQUEST_REPLAY_MISMATCH", { code: "REQUEST_REPLAY_MISMATCH", status: 409, retryable: false }],
  ];

  for (const [marker, mapping] of mappings) {
    if (message?.includes(`LEAN_L1_03:${marker}`)) return mapping;
  }

  return { code: "SERVER_ERROR", status: 500, retryable: true };
}
