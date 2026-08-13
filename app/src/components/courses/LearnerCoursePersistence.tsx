"use client";

import Link from "next/link";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import {
  LEARNER_SAVE_CONTRACT_VERSION,
  LEARNER_WEEK_SOURCE_KEY,
  createEmptyLearnerWeekDraft,
  createLearnerJournalContent,
  isLearnerReloadSnapshot,
  mergeLearnerWeekSaves,
  parseLearnerSaveError,
  type LearnerProgressSnapshot,
  type LearnerSaveError,
  type LearnerWeekDraft,
  type LearnerWeekSaveSnapshot,
  type LearnerWeekStage,
} from "@/lib/courses/learner-save-client";
import type { CourseWeek } from "@/lib/parsers/course-markdown-parser";

type ProgressStatus =
  | { kind: "loading" }
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; savedAt: string }
  | { kind: "error"; message: string; canRetry: boolean }
  | { kind: "conflict"; message: string };

interface ProgressTarget {
  currentWeekNumber: number;
  currentStage: LearnerWeekStage;
  visitedWeekNumbers: number[];
}

interface ProgressCommand extends ProgressTarget {
  contractVersion: typeof LEARNER_SAVE_CONTRACT_VERSION;
  requestId: string;
  courseSlug: string;
  expectedRevision: number | null;
}

interface WeekCommand {
  contractVersion: typeof LEARNER_SAVE_CONTRACT_VERSION;
  requestId: string;
  courseSlug: string;
  weekNumber: number;
  sourceKey: typeof LEARNER_WEEK_SOURCE_KEY;
  entryType: "synthesis" | "capstone";
  artifactName: string | null;
  title: string;
  content: ReturnType<typeof createLearnerJournalContent>;
  pageId: string | null;
  expectedRevision: number | null;
}

interface PendingWeekSave {
  command: WeekCommand;
  text: string;
}

interface UseLearnerCoursePersistenceOptions {
  enabled: boolean;
  courseSlug: string;
  courseTitle: string;
  weeks: readonly CourseWeek[];
  onRestoreProgress: (weekNumber: number, stage: LearnerWeekStage) => void;
}

export interface LearnerCoursePersistence {
  progressStatus: ProgressStatus;
  saveProgress: (weekNumber: number, stage: LearnerWeekStage) => void;
  retryProgress: () => void;
  reloadSavedWork: () => Promise<void>;
  draftForWeek: (weekNumber: number) => LearnerWeekDraft;
  updateWeekDraft: (weekNumber: number, text: string) => void;
  saveWeekDraft: (week: CourseWeek) => void;
  retryWeekDraft: (week: CourseWeek) => void;
}

function createRequestId(): string {
  return crypto.randomUUID();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProgressResponse(
  value: unknown
): value is { progress: LearnerProgressSnapshot } {
  if (!isRecord(value) || !isRecord(value.progress)) return false;
  const progress = value.progress;
  return (
    Number.isSafeInteger(progress.currentWeekNumber) &&
    typeof progress.currentStage === "string" &&
    Array.isArray(progress.visitedWeekNumbers) &&
    Number.isSafeInteger(progress.revision) &&
    typeof progress.savedAt === "string"
  );
}

function isWeekSaveResponse(
  value: unknown
): value is { weekSave: LearnerWeekSaveSnapshot } {
  if (!isRecord(value) || !isRecord(value.weekSave)) return false;
  const save = value.weekSave;
  return (
    typeof save.pageId === "string" &&
    Number.isSafeInteger(save.weekNumber) &&
    typeof save.sourceKey === "string" &&
    Number.isSafeInteger(save.revision) &&
    typeof save.savedAt === "string"
  );
}

function normalizedStageForWeek(
  week: CourseWeek,
  stage: LearnerWeekStage
): LearnerWeekStage {
  if (
    stage === "read" &&
    !week.readings.length &&
    !(week.return_readings?.length ?? 0)
  ) {
    return "start";
  }
  if (stage === "companions" && !(week.companion_cards?.length ?? 0)) {
    return "start";
  }
  return stage;
}

function safelyUpdateDrafts(
  draftsRef: MutableRefObject<Record<number, LearnerWeekDraft>>,
  setDrafts: Dispatch<SetStateAction<Record<number, LearnerWeekDraft>>>,
  update: (
    current: Record<number, LearnerWeekDraft>
  ) => Record<number, LearnerWeekDraft>
) {
  setDrafts((current) => {
    const next = update(current);
    draftsRef.current = next;
    return next;
  });
}

export function useLearnerCoursePersistence({
  enabled,
  courseSlug,
  courseTitle,
  weeks,
  onRestoreProgress,
}: UseLearnerCoursePersistenceOptions): LearnerCoursePersistence {
  const [progressStatus, setProgressStatus] = useState<ProgressStatus>(
    enabled ? { kind: "loading" } : { kind: "idle" }
  );
  const [drafts, setDrafts] = useState<Record<number, LearnerWeekDraft>>({});
  const draftsRef = useRef(drafts);
  const mountedRef = useRef(true);
  const progressRef = useRef<LearnerProgressSnapshot | null>(null);
  const visitedWeeksRef = useRef<number[]>([]);
  const desiredProgressRef = useRef<ProgressTarget | null>(null);
  const pendingProgressRef = useRef<ProgressCommand | null>(null);
  const progressSavingRef = useRef(false);
  const pendingWeekSavesRef = useRef<Record<number, PendingWeekSave>>({});
  const savingWeeksRef = useRef(new Set<number>());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(
    async (restoreProgress: boolean) => {
      if (!enabled) return;
      if (progressSavingRef.current || savingWeeksRef.current.size > 0) return;
      setProgressStatus({ kind: "loading" });

      try {
        const response = await fetch(
          `/api/courses/${encodeURIComponent(courseSlug)}/journal`,
          { cache: "no-store" }
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const error = parseLearnerSaveError(
            body,
            "Saved course work could not be loaded right now."
          );
          if (!mountedRef.current) return;
          setProgressStatus({
            kind: "error",
            message: error.message,
            canRetry: true,
          });
          return;
        }
        if (!isLearnerReloadSnapshot(body)) {
          throw new Error("The saved course response was incomplete.");
        }
        if (!mountedRef.current) return;

        progressRef.current = body.progress;
        visitedWeeksRef.current = body.progress?.visitedWeekNumbers ?? [];
        pendingProgressRef.current = null;
        desiredProgressRef.current = null;
        pendingWeekSavesRef.current = {};
        safelyUpdateDrafts(draftsRef, setDrafts, (current) =>
          mergeLearnerWeekSaves(current, body.weekSaves)
        );

        if (restoreProgress && body.progress) {
          const savedWeek = weeks.find(
            (week) => week.week_number === body.progress?.currentWeekNumber
          );
          if (savedWeek) {
            onRestoreProgress(
              savedWeek.week_number,
              normalizedStageForWeek(savedWeek, body.progress.currentStage)
            );
          }
        }

        setProgressStatus(
          body.progress
            ? { kind: "saved", savedAt: body.progress.savedAt }
            : { kind: "idle" }
        );
      } catch (error) {
        if (!mountedRef.current) return;
        setProgressStatus({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Saved course work could not be loaded right now.",
          canRetry: true,
        });
      }
    },
    [courseSlug, enabled, onRestoreProgress, weeks]
  );

  useEffect(() => {
    if (!enabled) return;
    void reload(true);
  }, [enabled, reload]);

  const sendProgressCommand = useCallback(
    async (command: ProgressCommand): Promise<boolean> => {
      pendingProgressRef.current = command;
      setProgressStatus({ kind: "saving" });

      try {
        const response = await fetch(
          `/api/courses/${encodeURIComponent(courseSlug)}/progress`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command),
          }
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const error = parseLearnerSaveError(
            body,
            "Your place could not be saved right now."
          );
          if (!mountedRef.current) return false;
          setProgressStatus(
            error.code === "SAVE_CONFLICT" ||
              error.code === "REQUEST_REPLAY_MISMATCH"
              ? { kind: "conflict", message: error.message }
              : {
                  kind: "error",
                  message: error.message,
                  canRetry: error.retryable,
                }
          );
          return false;
        }
        if (!isProgressResponse(body)) {
          throw new Error("The saved progress response was incomplete.");
        }
        if (!mountedRef.current) return false;

        progressRef.current = body.progress;
        visitedWeeksRef.current = body.progress.visitedWeekNumbers;
        pendingProgressRef.current = null;
        setProgressStatus({ kind: "saved", savedAt: body.progress.savedAt });
        return true;
      } catch (error) {
        if (!mountedRef.current) return false;
        setProgressStatus({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Your place could not be saved right now.",
          canRetry: true,
        });
        return false;
      }
    },
    [courseSlug]
  );

  const drainProgressQueue = useCallback(async () => {
    if (!enabled || progressSavingRef.current) return;
    progressSavingRef.current = true;

    try {
      while (desiredProgressRef.current) {
        const target = desiredProgressRef.current;
        desiredProgressRef.current = null;
        const command: ProgressCommand = {
          ...target,
          contractVersion: LEARNER_SAVE_CONTRACT_VERSION,
          requestId: createRequestId(),
          courseSlug,
          expectedRevision: progressRef.current?.revision ?? null,
        };
        const saved = await sendProgressCommand(command);
        if (!saved) break;
      }
    } finally {
      progressSavingRef.current = false;
    }
  }, [courseSlug, enabled, sendProgressCommand]);

  const saveProgress = useCallback(
    (weekNumber: number, stage: LearnerWeekStage) => {
      if (!enabled) return;
      const visitedWeekNumbers = Array.from(
        new Set([...visitedWeeksRef.current, weekNumber])
      ).sort((a, b) => a - b);
      visitedWeeksRef.current = visitedWeekNumbers;
      desiredProgressRef.current = {
        currentWeekNumber: weekNumber,
        currentStage: stage,
        visitedWeekNumbers,
      };
      void drainProgressQueue();
    },
    [drainProgressQueue, enabled]
  );

  const retryProgress = useCallback(() => {
    if (!enabled || progressSavingRef.current) return;
    const pending = pendingProgressRef.current;
    if (!pending) {
      void reload(false);
      return;
    }
    progressSavingRef.current = true;
    void sendProgressCommand(pending).finally(() => {
      progressSavingRef.current = false;
      if (desiredProgressRef.current) void drainProgressQueue();
    });
  }, [drainProgressQueue, enabled, reload, sendProgressCommand]);

  const updateWeekDraft = useCallback((weekNumber: number, text: string) => {
    safelyUpdateDrafts(draftsRef, setDrafts, (current) => {
      const existing = current[weekNumber] ?? createEmptyLearnerWeekDraft();
      return {
        ...current,
        [weekNumber]: {
          ...existing,
          text,
          status:
            existing.status.kind === "saving"
              ? existing.status
              : { kind: "idle" },
        },
      };
    });
  }, []);

  const sendWeekCommand = useCallback(
    async (weekNumber: number, pending: PendingWeekSave) => {
      if (savingWeeksRef.current.has(weekNumber)) return;
      savingWeeksRef.current.add(weekNumber);
      safelyUpdateDrafts(draftsRef, setDrafts, (current) => ({
        ...current,
        [weekNumber]: {
          ...(current[weekNumber] ?? createEmptyLearnerWeekDraft()),
          status: { kind: "saving" },
        },
      }));
      pendingWeekSavesRef.current[weekNumber] = pending;

      try {
        const response = await fetch(
          `/api/courses/${encodeURIComponent(courseSlug)}/journal`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pending.command),
          }
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const error = parseLearnerSaveError(
            body,
            "Your Journal work could not be saved right now."
          );
          if (!mountedRef.current) return;
          safelyUpdateDrafts(draftsRef, setDrafts, (current) => ({
            ...current,
            [weekNumber]: {
              ...(current[weekNumber] ?? createEmptyLearnerWeekDraft()),
              status: weekErrorStatus(error),
            },
          }));
          return;
        }
        if (!isWeekSaveResponse(body)) {
          throw new Error("The Journal save response was incomplete.");
        }
        if (!mountedRef.current) return;

        delete pendingWeekSavesRef.current[weekNumber];
        safelyUpdateDrafts(draftsRef, setDrafts, (current) => {
          const existing = current[weekNumber] ?? createEmptyLearnerWeekDraft();
          const stillMatchesSavedRequest = existing.text === pending.text;
          return {
            ...current,
            [weekNumber]: {
              ...existing,
              savedText: pending.text,
              save: body.weekSave,
              status: stillMatchesSavedRequest
                ? { kind: "saved", savedAt: body.weekSave.savedAt }
                : { kind: "idle" },
            },
          };
        });
      } catch (error) {
        if (!mountedRef.current) return;
        safelyUpdateDrafts(draftsRef, setDrafts, (current) => ({
          ...current,
          [weekNumber]: {
            ...(current[weekNumber] ?? createEmptyLearnerWeekDraft()),
            status: {
              kind: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Your Journal work could not be saved right now.",
              canRetry: true,
            },
          },
        }));
      } finally {
        savingWeeksRef.current.delete(weekNumber);
      }
    },
    [courseSlug]
  );

  const buildWeekCommand = useCallback(
    (week: CourseWeek, requestId: string): PendingWeekSave | null => {
      const draft =
        draftsRef.current[week.week_number] ?? createEmptyLearnerWeekDraft();
      const text = draft.text;
      if (!text.trim()) return null;
      const artifactName =
        week.micro_artifact?.name ?? week.capstone_artifact?.name ?? null;
      const baseTitle =
        artifactName?.trim() || `Week ${week.week_number} reflection`;

      return {
        text,
        command: {
          contractVersion: LEARNER_SAVE_CONTRACT_VERSION,
          requestId,
          courseSlug,
          weekNumber: week.week_number,
          sourceKey: LEARNER_WEEK_SOURCE_KEY,
          entryType: week.week_type === "capstone" ? "capstone" : "synthesis",
          artifactName,
          title: `${baseTitle} — ${courseTitle}`.slice(0, 200),
          content: createLearnerJournalContent(text),
          pageId: draft.save?.pageId ?? null,
          expectedRevision: draft.save?.revision ?? null,
        },
      };
    },
    [courseSlug, courseTitle]
  );

  const saveWeekDraft = useCallback(
    (week: CourseWeek) => {
      if (!enabled) return;
      const pending = buildWeekCommand(week, createRequestId());
      if (pending) void sendWeekCommand(week.week_number, pending);
    },
    [buildWeekCommand, enabled, sendWeekCommand]
  );

  const retryWeekDraft = useCallback(
    (week: CourseWeek) => {
      if (!enabled) return;
      const existing = pendingWeekSavesRef.current[week.week_number];
      const currentText = draftsRef.current[week.week_number]?.text ?? "";
      const pending =
        existing && existing.text === currentText
          ? existing
          : buildWeekCommand(week, createRequestId());
      if (pending) void sendWeekCommand(week.week_number, pending);
    },
    [buildWeekCommand, enabled, sendWeekCommand]
  );

  const draftForWeek = useCallback(
    (weekNumber: number) => drafts[weekNumber] ?? createEmptyLearnerWeekDraft(),
    [drafts]
  );

  return {
    progressStatus,
    saveProgress,
    retryProgress,
    reloadSavedWork: () => reload(false),
    draftForWeek,
    updateWeekDraft,
    saveWeekDraft,
    retryWeekDraft,
  };
}

function weekErrorStatus(error: LearnerSaveError): LearnerWeekDraft["status"] {
  if (error.code === "JOURNAL_LIMIT_REACHED") {
    return { kind: "limit", message: error.message };
  }
  if (
    error.code === "SAVE_CONFLICT" ||
    error.code === "REQUEST_REPLAY_MISMATCH"
  ) {
    return {
      kind: "conflict",
      message: error.message,
      reloadRequired: true,
    };
  }
  return {
    kind: "error",
    message: error.message,
    canRetry: error.retryable,
  };
}

function savedTime(savedAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(savedAt));
}

export function LearnerProgressStatus({
  status,
  onRetry,
  onReload,
}: {
  status: ProgressStatus;
  onRetry: () => void;
  onReload: () => void;
}) {
  const isProblem = status.kind === "error" || status.kind === "conflict";

  return (
    <div
      className={`border-b px-4 py-2 md:px-6 ${
        isProblem
          ? "border-rose-300/20 bg-rose-300/[0.07]"
          : "border-white/10 bg-zinc-950/85"
      }`}
    >
      <div className="mx-auto flex min-h-10 max-w-[90rem] flex-wrap items-center justify-between gap-2 text-sm">
        <div
          className="flex min-w-0 items-center gap-2"
          role={isProblem ? "alert" : "status"}
          aria-live={isProblem ? "assertive" : "polite"}
        >
          {status.kind === "loading" || status.kind === "saving" ? (
            <LoaderCircle
              className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : status.kind === "saved" ? (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-300"
              aria-hidden="true"
            />
          ) : isProblem ? (
            <AlertCircle
              className="h-4 w-4 shrink-0 text-rose-200"
              aria-hidden="true"
            />
          ) : (
            <Save
              className="h-4 w-4 shrink-0 text-zinc-500"
              aria-hidden="true"
            />
          )}
          <span className={isProblem ? "text-rose-100" : "text-zinc-400"}>
            {status.kind === "loading"
              ? "Loading your saved place and Journal work…"
              : status.kind === "saving"
                ? "Saving your place…"
                : status.kind === "saved"
                  ? `Place saved at ${savedTime(status.savedAt)}`
                  : status.kind === "conflict"
                    ? `${status.message} Reload to use the newest saved place.`
                    : status.kind === "error"
                      ? status.message
                      : "Your place will save when you open a week."}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {status.kind === "error" && status.canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200/25 px-3 font-medium text-rose-100 transition hover:bg-rose-200/10 focus-visible:ring-2 focus-visible:ring-rose-200"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReload}
            disabled={status.kind === "loading" || status.kind === "saving"}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-3 font-medium text-zinc-300 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reload saved work
          </button>
        </div>
      </div>
    </div>
  );
}

export function LearnerWeekJournalPanel({
  week,
  journalName,
  draft,
  onChange,
  onSave,
  onRetry,
  onReload,
}: {
  week: CourseWeek;
  journalName: string;
  draft: LearnerWeekDraft;
  onChange: (text: string) => void;
  onSave: () => void;
  onRetry: () => void;
  onReload: () => void;
}) {
  const fieldId = `week-${week.week_number}-journal-reflection`;
  const helpId = `${fieldId}-help`;
  const statusId = `${fieldId}-status`;
  const hasChanges = draft.text !== draft.savedText;
  const canSave = Boolean(draft.text.trim()) && hasChanges;
  const isSaving = draft.status.kind === "saving";
  const isProblem = ["error", "limit", "conflict"].includes(draft.status.kind);

  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.045] p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-cyan-200 uppercase">
            Your workbook
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Keep your Week {week.week_number} reflection
          </h3>
        </div>
        {draft.save ? (
          <Link
            href={`/journal/${draft.save.pageId}`}
            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-3 text-sm font-medium text-zinc-300 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            Open saved page
          </Link>
        ) : null}
      </div>

      <label htmlFor={fieldId} className="mt-5 block font-medium text-zinc-100">
        Reflection or synthesis
      </label>
      <p id={helpId} className="mt-1 text-sm leading-6 text-zinc-400">
        Write in your own words. Saving keeps this in your {journalName}; it is
        not a grade or a test.
      </p>
      <textarea
        id={fieldId}
        value={draft.text}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${helpId} ${statusId}`}
        rows={8}
        className="mt-3 min-h-44 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base leading-7 text-zinc-100 transition outline-none placeholder:text-zinc-600 focus:border-cyan-200/50 focus:ring-2 focus:ring-cyan-200/40"
        placeholder="What changed, became clearer, or still feels unresolved?"
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div
          id={statusId}
          className={`min-h-11 text-sm leading-6 ${
            isProblem ? "text-rose-100" : "text-zinc-400"
          }`}
          role={isProblem ? "alert" : "status"}
          aria-live={isProblem ? "assertive" : "polite"}
        >
          <WeekDraftStatus status={draft.status} hasChanges={hasChanges} />
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {draft.status.kind === "conflict" && draft.status.reloadRequired ? (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200/25 px-4 font-medium text-rose-100 transition hover:bg-rose-200/10 focus-visible:ring-2 focus-visible:ring-rose-200"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reload saved copy; keep draft
            </button>
          ) : null}
          {draft.status.kind === "error" && draft.status.canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 font-medium text-zinc-200 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry save
            </button>
          ) : null}
          {draft.status.kind === "limit" ? (
            <>
              <Link
                href="/journal"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200/25 px-4 font-medium text-amber-100 transition hover:bg-amber-200/10 focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                Open Journal to archive a page
              </Link>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 font-medium text-zinc-200 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry after archiving
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={
              draft.status.kind === "conflict" && !draft.status.reloadRequired
                ? onRetry
                : onSave
            }
            disabled={!canSave || isSaving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-200 px-5 font-semibold text-zinc-950 transition hover:bg-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? (
              <LoaderCircle
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {isSaving
              ? "Saving…"
              : draft.status.kind === "conflict" && !draft.status.reloadRequired
                ? "Save kept draft"
                : draft.save
                  ? "Save changes"
                  : `Save to ${journalName}`}
          </button>
        </div>
      </div>
    </section>
  );
}

function WeekDraftStatus({
  status,
  hasChanges,
}: {
  status: LearnerWeekDraft["status"];
  hasChanges: boolean;
}) {
  if (status.kind === "saving") return <>Saving your words…</>;
  if (status.kind === "saved") {
    return (
      <span className="inline-flex items-center gap-2 text-emerald-200">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Saved at {savedTime(status.savedAt)}
      </span>
    );
  }
  if (status.kind === "limit") {
    return (
      <>
        <strong>Journal full.</strong> Reader includes 50 active pages. Your
        draft is safe here. Open the Journal in a new tab, archive one active
        page, then retry.
      </>
    );
  }
  if (status.kind === "conflict") {
    return (
      <>
        <strong>Saved copy changed.</strong> {status.message} Your draft has not
        been replaced.
      </>
    );
  }
  if (status.kind === "error") {
    return (
      <>
        <strong>Not saved.</strong> {status.message} Your draft is still here.
      </>
    );
  }
  return hasChanges ? (
    <>Changes not saved yet. Your draft stays here while this page is open.</>
  ) : (
    <>Start writing, then save when you are ready.</>
  );
}
