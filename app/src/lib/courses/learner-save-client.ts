export const PRE_LEARNER_COURSE_SLUG =
  "pre-how-to-hold-two-things-at-once" as const;

export const LEARNER_SAVE_CONTRACT_VERSION = 1 as const;

export type LearnerWeekStage =
  | "start"
  | "read"
  | "companions"
  | "practice"
  | "finish";

export type LearnerContractErrorCode =
  | "INVALID_REQUEST"
  | "AUTH_REQUIRED"
  | "EMAIL_VERIFICATION_REQUIRED"
  | "COURSE_NOT_ALLOWLISTED"
  | "COURSE_NOT_FOUND"
  | "ENROLLMENT_REQUIRED"
  | "WEEK_NOT_FOUND"
  | "JOURNAL_LIMIT_REACHED"
  | "SAVE_CONFLICT"
  | "REQUEST_REPLAY_MISMATCH"
  | "SERVER_ERROR";

export interface LearnerProgressSnapshot {
  currentWeekNumber: number;
  currentStage: LearnerWeekStage;
  visitedWeekNumbers: number[];
  revision: number;
  savedAt: string;
}

export interface LearnerWeekSaveSnapshot {
  pageId: string;
  weekNumber: number;
  sourceKey: string;
  entryType: "lens_exercise" | "synthesis" | "note" | "capstone";
  artifactName: string | null;
  title: string;
  content: unknown;
  revision: number;
  savedAt: string;
}

export interface LearnerReloadSnapshot {
  contractVersion: typeof LEARNER_SAVE_CONTRACT_VERSION;
  progress: LearnerProgressSnapshot | null;
  weekSaves: LearnerWeekSaveSnapshot[];
  loadedAt: string;
}

export interface LearnerSaveError {
  code: LearnerContractErrorCode;
  message: string;
  retryable: boolean;
}

export type LearnerWeekDraftStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; savedAt: string }
  | { kind: "error"; message: string; canRetry: boolean }
  | { kind: "limit"; message: string }
  | { kind: "conflict"; message: string; reloadRequired: boolean };

export interface LearnerWeekDraft {
  text: string;
  savedText: string;
  save: LearnerWeekSaveSnapshot | null;
  status: LearnerWeekDraftStatus;
}

export const LEARNER_WEEK_SOURCE_KEY = "synthesis:week-reflection";

export function isLearnerReloadSnapshot(
  value: unknown
): value is LearnerReloadSnapshot {
  if (!isRecord(value)) return false;
  return (
    value.contractVersion === LEARNER_SAVE_CONTRACT_VERSION &&
    (value.progress === null || isProgressSnapshot(value.progress)) &&
    Array.isArray(value.weekSaves) &&
    value.weekSaves.every(isWeekSaveSnapshot) &&
    typeof value.loadedAt === "string" &&
    Number.isFinite(Date.parse(value.loadedAt))
  );
}

export function createEmptyLearnerWeekDraft(): LearnerWeekDraft {
  return {
    text: "",
    savedText: "",
    save: null,
    status: { kind: "idle" },
  };
}

export function createLearnerJournalContent(text: string) {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

export function readLearnerJournalText(content: unknown): string {
  if (!isRecord(content) || content.type !== "doc") return "";
  if (!Array.isArray(content.content)) return "";

  return content.content
    .filter((node): node is Record<string, unknown> => isRecord(node))
    .filter((node) => node.type === "paragraph")
    .map((paragraph) => {
      if (!Array.isArray(paragraph.content)) return "";
      return paragraph.content
        .filter((node): node is Record<string, unknown> => isRecord(node))
        .map((node) => (typeof node.text === "string" ? node.text : ""))
        .join("");
    })
    .join("\n");
}

/**
 * Merge a server reload into browser drafts. A clean field accepts server
 * truth. A field with newer browser words keeps those words and receives the
 * latest page/revision metadata so the learner can deliberately save again.
 */
export function mergeLearnerWeekSaves(
  drafts: Record<number, LearnerWeekDraft>,
  weekSaves: readonly LearnerWeekSaveSnapshot[]
): Record<number, LearnerWeekDraft> {
  const next = { ...drafts };
  const reflectionSaves = weekSaves.filter(
    (save) => save.sourceKey === LEARNER_WEEK_SOURCE_KEY
  );
  const savedWeeks = new Set(reflectionSaves.map((save) => save.weekNumber));

  for (const [rawWeekNumber, existing] of Object.entries(next)) {
    const weekNumber = Number(rawWeekNumber);
    if (!existing.save || savedWeeks.has(weekNumber)) continue;
    const hasUnsavedInput = existing.text !== existing.savedText;
    next[weekNumber] = hasUnsavedInput
      ? {
          ...existing,
          savedText: "",
          save: null,
          status: {
            kind: "conflict",
            reloadRequired: false,
            message:
              "The former saved page is no longer available, and your unsaved draft was kept.",
          },
        }
      : createEmptyLearnerWeekDraft();
  }

  for (const save of reflectionSaves) {
    const savedText = readLearnerJournalText(save.content);
    const existing = next[save.weekNumber];
    const hasUnsavedInput = Boolean(
      existing && existing.text !== existing.savedText
    );

    next[save.weekNumber] = hasUnsavedInput
      ? {
          ...existing,
          savedText,
          save,
          status: {
            kind: "conflict",
            reloadRequired: false,
            message:
              "The newest saved copy was loaded, and your unsaved draft was kept.",
          },
        }
      : {
          text: savedText,
          savedText,
          save,
          status: { kind: "saved", savedAt: save.savedAt },
        };
  }

  return next;
}

export function parseLearnerSaveError(
  value: unknown,
  fallback: string
): LearnerSaveError {
  if (!isRecord(value)) {
    return { code: "SERVER_ERROR", message: fallback, retryable: true };
  }

  const knownCodes = new Set<LearnerContractErrorCode>([
    "INVALID_REQUEST",
    "AUTH_REQUIRED",
    "EMAIL_VERIFICATION_REQUIRED",
    "COURSE_NOT_ALLOWLISTED",
    "COURSE_NOT_FOUND",
    "ENROLLMENT_REQUIRED",
    "WEEK_NOT_FOUND",
    "JOURNAL_LIMIT_REACHED",
    "SAVE_CONFLICT",
    "REQUEST_REPLAY_MISMATCH",
    "SERVER_ERROR",
  ]);
  const code =
    typeof value.code === "string" &&
    knownCodes.has(value.code as LearnerContractErrorCode)
      ? (value.code as LearnerContractErrorCode)
      : "SERVER_ERROR";

  return {
    code,
    message:
      typeof value.error === "string" && value.error.trim()
        ? value.error.trim()
        : fallback,
    retryable: value.retryable === true || code === "SERVER_ERROR",
  };
}

function isProgressSnapshot(value: unknown): value is LearnerProgressSnapshot {
  if (!isRecord(value)) return false;
  return (
    Number.isSafeInteger(value.currentWeekNumber) &&
    Number(value.currentWeekNumber) > 0 &&
    typeof value.currentStage === "string" &&
    ["start", "read", "companions", "practice", "finish"].includes(
      value.currentStage
    ) &&
    Array.isArray(value.visitedWeekNumbers) &&
    value.visitedWeekNumbers.every(
      (week) => Number.isSafeInteger(week) && Number(week) > 0
    ) &&
    Number.isSafeInteger(value.revision) &&
    Number(value.revision) >= 1 &&
    typeof value.savedAt === "string" &&
    Number.isFinite(Date.parse(value.savedAt))
  );
}

function isWeekSaveSnapshot(value: unknown): value is LearnerWeekSaveSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.pageId === "string" &&
    Number.isSafeInteger(value.weekNumber) &&
    Number(value.weekNumber) > 0 &&
    typeof value.sourceKey === "string" &&
    typeof value.entryType === "string" &&
    ["lens_exercise", "synthesis", "note", "capstone"].includes(
      value.entryType
    ) &&
    (value.artifactName === null || typeof value.artifactName === "string") &&
    typeof value.title === "string" &&
    Number.isSafeInteger(value.revision) &&
    Number(value.revision) >= 1 &&
    typeof value.savedAt === "string" &&
    Number.isFinite(Date.parse(value.savedAt))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
