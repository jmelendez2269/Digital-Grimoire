import { NextRequest, NextResponse } from "next/server";

import {
  LEARNER_SAVE_CONTRACT_VERSION,
  getFreeLearnerCourse,
  type LearnerContractErrorCode,
  type LearnerCourseIdentity,
} from "@/lib/courses/learner-save-contract.server";
import {
  mapLearnerProgressDatabaseError,
  parseSaveLearnerProgressCommand,
  parseStoredLearnerProgress,
} from "@/lib/courses/learner-progress.server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const ERROR_MESSAGES: Record<LearnerContractErrorCode, string> = {
  INVALID_REQUEST: "The progress request is invalid.",
  AUTH_REQUIRED: "Sign in to save course progress.",
  EMAIL_VERIFICATION_REQUIRED: "Verify your email before saving progress.",
  COURSE_NOT_ALLOWLISTED: "This course is not available for free progress saves.",
  COURSE_NOT_FOUND: "The course could not be found.",
  ENROLLMENT_REQUIRED: "Enroll in this course before saving progress.",
  WEEK_NOT_FOUND: "That week is not part of this course.",
  JOURNAL_LIMIT_REACHED: "The Journal limit has been reached.",
  SAVE_CONFLICT: "Your saved progress changed. Reload before trying again.",
  REQUEST_REPLAY_MISMATCH: "That request ID was already used for different progress.",
  SERVER_ERROR: "Progress could not be saved right now.",
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

interface LearnerProgressContext {
  serviceSupabase: ReturnType<typeof createServiceClient>;
  userId: string;
  course: LearnerCourseIdentity;
  enrollment: { id: string; progress: unknown };
}

async function resolveLearnerProgressContext(
  id: string,
): Promise<LearnerProgressContext | NextResponse> {
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
  if (!freeCourse) {
    return errorResponse("COURSE_NOT_ALLOWLISTED", 403);
  }

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

  const course: LearnerCourseIdentity = {
    courseId: String(courseRow.id),
    courseSlug: freeCourse.slug,
    courseIdTag: freeCourse.courseIdTag,
  };

  return {
    serviceSupabase,
    userId: user.id,
    course,
    enrollment: { id: String(enrollment.id), progress: enrollment.progress },
  };
}

function isResponse(
  value: LearnerProgressContext | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const context = await resolveLearnerProgressContext(id);
  if (isResponse(context)) return context;

  const progress = parseStoredLearnerProgress(
    context.enrollment.progress,
    context.course,
  );
  if (progress === undefined) return errorResponse("SERVER_ERROR", 500, true);

  return NextResponse.json(
    { contractVersion: LEARNER_SAVE_CONTRACT_VERSION, progress },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const context = await resolveLearnerProgressContext(id);
  if (isResponse(context)) return context;

  const body = await request.json().catch(() => null);
  const parsed = parseSaveLearnerProgressCommand(body, context.course.courseSlug);
  if (!parsed.ok) return errorResponse(parsed.code, 400);

  const { data, error } = await context.serviceSupabase.rpc(
    "save_learner_course_progress_v1",
    {
      p_user_id: context.userId,
      p_course_id: context.course.courseId,
      p_request_id: parsed.command.requestId,
      p_expected_revision: parsed.command.expectedRevision,
      p_current_week: parsed.command.currentWeekNumber,
      p_current_stage: parsed.command.currentStage,
      p_visited_weeks: parsed.command.visitedWeekNumbers,
    },
  );

  if (error) {
    const mapped = mapLearnerProgressDatabaseError(error.message);
    return errorResponse(mapped.code, mapped.status, mapped.retryable);
  }

  const progress = parseStoredLearnerProgress(data, context.course);
  if (!progress) return errorResponse("SERVER_ERROR", 500, true);

  return NextResponse.json(
    { contractVersion: LEARNER_SAVE_CONTRACT_VERSION, progress },
    { headers: { "Cache-Control": "no-store" } },
  );
}
