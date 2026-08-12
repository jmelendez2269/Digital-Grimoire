import { NextRequest, NextResponse } from "next/server";

import {
  LEARNER_SAVE_CONTRACT_VERSION,
  getFreeLearnerCourse,
  type LearnerContractErrorCode,
  type LearnerCourseIdentity,
} from "@/lib/courses/learner-save-contract.server";
import {
  mapLearnerJournalDatabaseError,
  parseSaveLearnerWeekCommand,
  parseStoredLearnerWeekSave,
} from "@/lib/courses/learner-journal.server";
import { parseStoredLearnerProgress } from "@/lib/courses/learner-progress.server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const ERROR_MESSAGES: Record<LearnerContractErrorCode, string> = {
  INVALID_REQUEST: "The Journal save request is invalid.",
  AUTH_REQUIRED: "Sign in to save course work.",
  EMAIL_VERIFICATION_REQUIRED: "Verify your email before saving course work.",
  COURSE_NOT_ALLOWLISTED: "This course is not available for free Journal saves.",
  COURSE_NOT_FOUND: "The course could not be found.",
  ENROLLMENT_REQUIRED: "Enroll in this course before saving course work.",
  WEEK_NOT_FOUND: "That week is not part of this course.",
  JOURNAL_LIMIT_REACHED: "Archive a Journal page before creating another active page.",
  SAVE_CONFLICT: "Your saved Journal page changed. Reload before trying again.",
  REQUEST_REPLAY_MISMATCH: "That request ID was already used for different Journal work.",
  SERVER_ERROR: "Journal work could not be saved right now.",
};

function errorResponse(
  code: LearnerContractErrorCode,
  status: number,
  retryable = false,
) {
  return NextResponse.json(
    { error: ERROR_MESSAGES[code], code, retryable },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

interface LearnerJournalContext {
  serviceSupabase: ReturnType<typeof createServiceClient>;
  userId: string;
  course: LearnerCourseIdentity;
  courseContent: unknown;
  enrollmentProgress: unknown;
}

async function resolveLearnerJournalContext(
  id: string,
): Promise<LearnerJournalContext | NextResponse> {
  const authSupabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();

  if (authError || !user) return errorResponse("AUTH_REQUIRED", 401);
  if (!user.email_confirmed_at) {
    return errorResponse("EMAIL_VERIFICATION_REQUIRED", 403);
  }

  const freeCourse = getFreeLearnerCourse(id);
  if (!freeCourse) return errorResponse("COURSE_NOT_ALLOWLISTED", 403);

  const serviceSupabase = createServiceClient();
  const { data: courseRow, error: courseError } = await serviceSupabase
    .from("courses")
    .select("id, slug, content")
    .eq("slug", freeCourse.slug)
    .maybeSingle();

  if (courseError || !courseRow) return errorResponse("COURSE_NOT_FOUND", 404);

  const content = courseRow.content;
  const courseIdTag =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as Record<string, unknown>).course_id_tag
      : null;
  if (courseIdTag !== freeCourse.courseIdTag) {
    return errorResponse("COURSE_NOT_FOUND", 404);
  }

  const { data: enrollment, error: enrollmentError } = await serviceSupabase
    .from("course_enrollments")
    .select("id, progress")
    .eq("user_id", user.id)
    .eq("course_id", courseRow.id)
    .maybeSingle();
  if (enrollmentError || !enrollment) {
    return errorResponse("ENROLLMENT_REQUIRED", 403);
  }

  return {
    serviceSupabase,
    userId: user.id,
    course: {
      courseId: String(courseRow.id),
      courseSlug: freeCourse.slug,
      courseIdTag: freeCourse.courseIdTag,
    },
    courseContent: content,
    enrollmentProgress: enrollment.progress,
  };
}

function isResponse(
  value: LearnerJournalContext | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}

function courseHasWeek(content: unknown, weekNumber: number): boolean {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return false;
  }
  const weeks = (content as Record<string, unknown>).weeks;
  if (!Array.isArray(weeks)) return false;

  return weeks.some(
    (week) =>
      week !== null &&
      typeof week === "object" &&
      !Array.isArray(week) &&
      (week as Record<string, unknown>).week_number === weekNumber,
  );
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const context = await resolveLearnerJournalContext(id);
  if (isResponse(context)) return context;

  const progress = parseStoredLearnerProgress(
    context.enrollmentProgress,
    context.course,
  );
  if (progress === undefined) return errorResponse("SERVER_ERROR", 500, true);

  const { data: rows, error } = await context.serviceSupabase
    .from("journal_pages")
    .select(
      "id, week_number, source_key, entry_type, artifact_name, title, content, learner_revision, learner_saved_at",
    )
    .eq("user_id", context.userId)
    .eq("course_id", context.course.courseId)
    .not("source_key", "is", null)
    .order("week_number", { ascending: true })
    .order("source_key", { ascending: true });

  if (error) return errorResponse("SERVER_ERROR", 500, true);

  const weekSaves = (rows ?? []).map((row) =>
    parseStoredLearnerWeekSave(
      {
        contractVersion: LEARNER_SAVE_CONTRACT_VERSION,
        pageId: row.id,
        weekNumber: row.week_number,
        sourceKey: row.source_key,
        entryType: row.entry_type,
        artifactName: row.artifact_name,
        title: row.title,
        content: row.content,
        revision: row.learner_revision,
        savedAt: row.learner_saved_at,
      },
      context.course,
    ),
  );
  if (weekSaves.some((save) => save === undefined)) {
    return errorResponse("SERVER_ERROR", 500, true);
  }

  return NextResponse.json(
    {
      contractVersion: LEARNER_SAVE_CONTRACT_VERSION,
      course: context.course,
      progress,
      weekSaves,
      loadedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const context = await resolveLearnerJournalContext(id);
  if (isResponse(context)) return context;

  const body = await request.json().catch(() => null);
  const parsed = parseSaveLearnerWeekCommand(body, context.course.courseSlug);
  if (!parsed.ok) return errorResponse(parsed.code, 400);
  if (!courseHasWeek(context.courseContent, parsed.command.weekNumber)) {
    return errorResponse("WEEK_NOT_FOUND", 404);
  }

  const { data, error } = await context.serviceSupabase.rpc(
    "save_learner_journal_page_v1",
    {
      p_user_id: context.userId,
      p_course_id: context.course.courseId,
      p_request_id: parsed.command.requestId,
      p_week_number: parsed.command.weekNumber,
      p_source_key: parsed.command.sourceKey,
      p_entry_type: parsed.command.entryType,
      p_artifact_name: parsed.command.artifactName,
      p_title: parsed.command.title,
      p_content: parsed.command.content,
      p_page_id: parsed.command.pageId,
      p_expected_revision: parsed.command.expectedRevision,
    },
  );

  if (error) {
    const mapped = mapLearnerJournalDatabaseError(error.message);
    return errorResponse(mapped.code, mapped.status, mapped.retryable);
  }

  const weekSave = parseStoredLearnerWeekSave(data, context.course);
  if (!weekSave) return errorResponse("SERVER_ERROR", 500, true);

  return NextResponse.json(
    { contractVersion: LEARNER_SAVE_CONTRACT_VERSION, weekSave },
    {
      status: parsed.command.pageId === null ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
