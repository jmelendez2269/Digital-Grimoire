import "server-only";

/**
 * LEAN-L1-01: the single normative contract for V2 learner progress and
 * workbook saves. Later route and database packets must implement this shape
 * without weakening its authorization rules.
 */

export const LEARNER_SAVE_CONTRACT_VERSION = 1 as const;

export const PRE_FREE_COURSE = Object.freeze({
  key: "PRE",
  slug: "pre-how-to-hold-two-things-at-once",
  courseIdTag: "PRE",
} as const);

/**
 * Server-owned access authority. Database publication is intentionally absent:
 * a published row may be previewable, but it never grants learner save access.
 */
export const FREE_LEARNER_COURSES = Object.freeze([PRE_FREE_COURSE] as const);

export const LEARNER_WEEK_STAGES = Object.freeze([
  "start",
  "read",
  "companions",
  "practice",
  "finish",
] as const);

export const LEARNER_JOURNAL_ENTRY_TYPES = Object.freeze([
  "lens_exercise",
  "synthesis",
  "note",
  "capstone",
] as const);

export const LEARNER_CONTRACT_ERROR_CODES = Object.freeze([
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
] as const);

export const LEARNER_SAVE_EXCLUSIONS = Object.freeze([
  "billing_effects",
  "retained_completed_course_access",
  "membership_slot_release",
  "certificates",
  "generalized_completion_lifecycle",
] as const);

export type FreeLearnerCourse = (typeof FREE_LEARNER_COURSES)[number];
export type FreeLearnerCourseSlug = FreeLearnerCourse["slug"];
export type LearnerWeekStage = (typeof LEARNER_WEEK_STAGES)[number];
export type LearnerJournalEntryType =
  (typeof LEARNER_JOURNAL_ENTRY_TYPES)[number];
export type LearnerContractErrorCode =
  (typeof LEARNER_CONTRACT_ERROR_CODES)[number];
export type LearnerSaveExclusion = (typeof LEARNER_SAVE_EXCLUSIONS)[number];

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface LearnerCourseIdentity {
  /** Server-resolved database UUID. Clients never use this to prove access. */
  courseId: string;
  /** Stable server-allowlisted authorization key. */
  courseSlug: FreeLearnerCourseSlug;
  /** Editorial cross-check only; it is not sufficient authorization alone. */
  courseIdTag: FreeLearnerCourse["courseIdTag"];
}

export interface LearnerProgressStateV1 {
  contractVersion: typeof LEARNER_SAVE_CONTRACT_VERSION;
  course: LearnerCourseIdentity;
  /** The last week explicitly opened; moving backward is allowed. */
  currentWeekNumber: number;
  /** The current V2 stage inside currentWeekNumber. */
  currentStage: LearnerWeekStage;
  /** A sorted, unique, never-shrinking set of weeks the learner has opened. */
  visitedWeekNumbers: number[];
  /** Server-incremented optimistic concurrency number. */
  revision: number;
  /** Server-generated ISO timestamp. */
  savedAt: string;
}

export interface SaveLearnerProgressCommandV1 {
  contractVersion: typeof LEARNER_SAVE_CONTRACT_VERSION;
  /** Client-generated UUID reused only when retrying the identical command. */
  requestId: string;
  courseSlug: FreeLearnerCourseSlug;
  /** Revision from the last reload; null means no progress record exists yet. */
  expectedRevision: number | null;
  currentWeekNumber: number;
  currentStage: LearnerWeekStage;
  visitedWeekNumbers: number[];
}

export interface LearnerWeekSaveStateV1 {
  contractVersion: typeof LEARNER_SAVE_CONTRACT_VERSION;
  pageId: string;
  course: LearnerCourseIdentity;
  weekNumber: number;
  /** Stable machine key such as `synthesis:week-reflection`, never a title. */
  sourceKey: string;
  entryType: LearnerJournalEntryType;
  artifactName: string | null;
  title: string;
  content: JsonValue;
  revision: number;
  savedAt: string;
}

export interface SaveLearnerWeekCommandV1 {
  contractVersion: typeof LEARNER_SAVE_CONTRACT_VERSION;
  /** Client-generated UUID reused only when retrying the identical command. */
  requestId: string;
  courseSlug: FreeLearnerCourseSlug;
  weekNumber: number;
  sourceKey: string;
  entryType: LearnerJournalEntryType;
  artifactName: string | null;
  title: string;
  content: JsonValue;
  /** Null creates; a UUID updates the matching owned logical save. */
  pageId: string | null;
  /** Null creates; a number must equal the server's current revision. */
  expectedRevision: number | null;
}

export interface LearnerReloadSnapshotV1 {
  contractVersion: typeof LEARNER_SAVE_CONTRACT_VERSION;
  course: LearnerCourseIdentity;
  progress: LearnerProgressStateV1 | null;
  weekSaves: LearnerWeekSaveStateV1[];
  loadedAt: string;
}

export interface LearnerContractErrorV1 {
  error: string;
  code: LearnerContractErrorCode;
  /** True only when retrying the identical requestId and payload is safe. */
  retryable: boolean;
}

/**
 * Machine-readable rules shared by the implementation packets.
 *
 * Authorization order:
 * 1. verify the signed-in user's server session and confirmed email;
 * 2. resolve an exact slug from FREE_LEARNER_COURSES;
 * 3. resolve the course row and cross-check its tag;
 * 4. verify an enrollment owned by that user;
 * 5. verify the positive integer week exists in that course;
 * 6. only then read or write through server-owned database authority.
 *
 * The server supplies userId, courseId, revision, and timestamps. Client
 * versions of those fields must never decide ownership or access.
 */
export const LEARNER_SAVE_CONTRACT = Object.freeze({
  version: LEARNER_SAVE_CONTRACT_VERSION,
  authority: Object.freeze({
    requiresServerVerifiedSession: true,
    requiresConfirmedEmail: true,
    requiresOwnedEnrollment: true,
    freeCourseSlugs: FREE_LEARNER_COURSES.map((course) => course.slug),
    databasePublishedGrantsAccess: false,
    clientSuppliedUserIdGrantsAccess: false,
    clientSuppliedCourseIdGrantsAccess: false,
  }),
  progress: Object.freeze({
    storage: "course_enrollments",
    oneRecordPer: "user-and-course",
    currentWeekMeans: "last-explicitly-opened-week",
    visitedWeeksAre: "sorted-unique-never-shrinking",
    supportsCourseCompletion: false,
  }),
  weekSave: Object.freeze({
    storage: "journal_pages",
    oneLogicalPagePer: "user-course-week-source",
    createRequiresNullPageAndRevision: true,
    updateRequiresOwnedMatchingPageAndRevision: true,
    identicalRequestReplayIsIdempotent: true,
    changedPayloadWithReusedRequestIdConflicts: true,
  }),
  reload: Object.freeze({
    serverSnapshotIsAuthoritative: true,
    responseCacheable: false,
    unsavedClientInputSurvivesErrorsAndConflicts: true,
  }),
  exclusions: LEARNER_SAVE_EXCLUSIONS,
});

/** Exact, case-sensitive lookup. Unknown values fail closed. */
export function getFreeLearnerCourse(
  slug: string,
): FreeLearnerCourse | null {
  return FREE_LEARNER_COURSES.find((course) => course.slug === slug) ?? null;
}

export function isLearnerWeekNumber(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

export function isLearnerSourceKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 80 &&
    /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/.test(value)
  );
}
