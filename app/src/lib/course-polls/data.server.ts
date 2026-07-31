import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import {
  parseCoursePathPollView,
  type CoursePathPollStatus,
  type CoursePathPollView,
} from "./types";

export type CoursePollDataErrorCode =
  | "admin_required"
  | "invalid"
  | "not_available"
  | "not_open"
  | "rate_limited"
  | "storage_error";

export class CoursePollDataError extends Error {
  constructor(
    public readonly code: CoursePollDataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CoursePollDataError";
  }
}

function classifyDatabaseMessage(message: string): CoursePollDataErrorCode {
  if (message.includes("COURSE_POLL_RATE_LIMITED")) return "rate_limited";
  if (message.includes("COURSE_POLL_PUBLIC_PREVIEWS_REQUIRED")) {
    return "not_available";
  }
  if (
    message.includes("COURSE_POLL_NOT_OPEN") ||
    message.includes("COURSE_POLL_NOT_DRAFT") ||
    message.includes("COURSE_POLL_NOT_CLOSED") ||
    message.includes("COURSE_POLL_MUST_BE_CLOSED")
  ) {
    return "not_open";
  }
  if (message.includes("COURSE_POLL_ADMIN_REQUIRED")) return "admin_required";
  if (
    message.includes("COURSE_POLL_INVALID") ||
    message.includes("COURSE_POLL_OPTION_MISMATCH") ||
    message.includes("COURSE_POLL_REQUIRES_TWO") ||
    message.includes("COURSE_POLL_OPTIONS_MUST_BE_PUBLISHED") ||
    message.includes("COURSE_POLL_PRE_PUBLIC_RECORD_REQUIRED") ||
    message.includes("COURSE_POLL_LAUNCH_CANDIDATES_REQUIRED") ||
    message.includes("COURSE_POLL_OPTIONS_LOCKED")
  ) {
    return "invalid";
  }
  return "storage_error";
}

function throwDatabaseError(context: string, error: { message: string }): never {
  const code = classifyDatabaseMessage(error.message);
  throw new CoursePollDataError(code, `${context} failed`);
}

export async function readCoursePathPollView(input: {
  pollSlug: string;
  voterHash: string | null;
}): Promise<CoursePathPollView | null> {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.rpc(
    "course_path_poll_public_view",
    {
      p_poll_slug: input.pollSlug,
      p_voter_hash: input.voterHash,
    },
  );

  if (error) throwDatabaseError("Course poll read", error);
  if (data === null) return null;

  const parsed = parseCoursePathPollView(data);
  if (!parsed) {
    throw new CoursePollDataError(
      "storage_error",
      "Course poll returned an invalid public shape",
    );
  }
  return parsed;
}

export async function readCoursePathPollLifecycleStatus(
  pollSlug: string,
): Promise<CoursePathPollStatus | null> {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("course_path_polls")
    .select("status")
    .eq("slug", pollSlug)
    .maybeSingle();

  if (error) throwDatabaseError("Course poll lifecycle read", error);
  if (!data) return null;

  const status = data.status;
  if (
    status !== "draft" &&
    status !== "open" &&
    status !== "closed" &&
    status !== "archived"
  ) {
    throw new CoursePollDataError(
      "storage_error",
      "Course poll returned an invalid lifecycle state",
    );
  }
  return status;
}

export async function castCoursePathVote(input: {
  pollSlug: string;
  optionId: string;
  voterHash: string;
  networkHash: string | null;
}): Promise<CoursePathPollView> {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.rpc(
    "course_path_poll_cast_vote",
    {
      p_poll_slug: input.pollSlug,
      p_option_id: input.optionId,
      p_voter_hash: input.voterHash,
      p_network_hash: input.networkHash,
      p_voter_limit: 10,
      p_network_limit: 60,
    },
  );

  if (error) throwDatabaseError("Course poll vote", error);

  if (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    "errorCode" in data
  ) {
    if (data.errorCode === "option_mismatch") {
      throw new CoursePollDataError(
        "invalid",
        "Course poll option does not belong to this ballot",
      );
    }
    if (data.errorCode === "not_available") {
      throw new CoursePollDataError(
        "not_available",
        "Course poll previews are not publicly available",
      );
    }
  }

  const parsed = parseCoursePathPollView(data);
  if (!parsed || parsed.viewerChoiceOptionId !== input.optionId) {
    throw new CoursePollDataError(
      "storage_error",
      "Course poll vote was not confirmed",
    );
  }
  return parsed;
}

export interface CoursePathPollAdminCourse {
  id: string;
  slug: string;
  title: string;
  code: string;
  isPublished: boolean;
}

export interface CoursePathPollAdminOption {
  id: string;
  courseId: string;
  courseSlug: string;
  title: string;
  code: string;
  sortOrder: number;
  voteCount: number;
}

export interface CoursePathPollAdminRecord {
  id: string;
  slug: string;
  question: string;
  status: CoursePathPollStatus;
  audienceResultKind: string;
  audienceLeaderOptionId: string | null;
  editorialSelectionOptionId: string | null;
  editorialDecisionNote: string | null;
  createdAt: string;
  openedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  options: CoursePathPollAdminOption[];
}

interface PollRow {
  id: string;
  slug: string;
  question: string;
  status: CoursePathPollStatus;
  audience_result_kind: string;
  audience_leader_option_id: string | null;
  editorial_selection_option_id: string | null;
  editorial_decision_note: string | null;
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
}

interface OptionRow {
  id: string;
  poll_id: string;
  course_id: string;
  sort_order: number;
}

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  content: Record<string, unknown> | null;
}

interface VoteCountRow {
  poll_id: string;
  option_id: string;
  vote_count: number | string;
}

function courseCode(course: CourseRow): string {
  const configuredCode = course.content?.course_id_tag;
  if (typeof configuredCode === "string" && configuredCode.trim()) {
    return configuredCode.trim().toUpperCase();
  }
  return course.slug.split("-", 1)[0]?.toUpperCase() || "COURSE";
}

export async function listCoursePathPollAdminData(): Promise<{
  polls: CoursePathPollAdminRecord[];
  publishedCourses: CoursePathPollAdminCourse[];
}> {
  const serviceClient = createServiceClient();
  const [pollResult, optionResult, courseResult, voteResult] = await Promise.all([
    serviceClient
      .from("course_path_polls")
      .select(
        "id, slug, question, status, audience_result_kind, audience_leader_option_id, editorial_selection_option_id, editorial_decision_note, created_at, opened_at, closed_at, archived_at",
      )
      .order("created_at", { ascending: false }),
    serviceClient
      .from("course_path_poll_options")
      .select("id, poll_id, course_id, sort_order")
      .order("sort_order", { ascending: true }),
    serviceClient
      .from("courses")
      .select("id, slug, title, is_published, content")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    serviceClient.rpc("course_path_poll_admin_vote_counts"),
  ]);

  if (pollResult.error) {
    throwDatabaseError("Course poll admin read", pollResult.error);
  }
  if (optionResult.error) {
    throwDatabaseError("Course poll option read", optionResult.error);
  }
  if (courseResult.error) {
    throwDatabaseError("Course poll course read", courseResult.error);
  }
  if (voteResult.error) {
    throwDatabaseError("Course poll vote-count read", voteResult.error);
  }

  const pollRows = (pollResult.data ?? []) as PollRow[];
  const optionRows = (optionResult.data ?? []) as OptionRow[];
  const courseRows = (courseResult.data ?? []) as CourseRow[];
  const voteRows = (voteResult.data ?? []) as VoteCountRow[];
  const coursesById = new Map(courseRows.map((course) => [course.id, course]));

  const polls = pollRows.map((poll): CoursePathPollAdminRecord => {
    const options = optionRows
      .filter((option) => option.poll_id === poll.id)
      .map((option): CoursePathPollAdminOption => {
        const course = coursesById.get(option.course_id);
        return {
          id: option.id,
          courseId: option.course_id,
          courseSlug: course?.slug ?? "missing-course",
          title: course?.title ?? "Missing course record",
          code: course ? courseCode(course) : "UNKNOWN",
          sortOrder: option.sort_order,
          voteCount: Number(
            voteRows.find(
              (vote) =>
                vote.poll_id === poll.id && vote.option_id === option.id,
            )?.vote_count ?? 0,
          ),
        };
      });

    return {
      id: poll.id,
      slug: poll.slug,
      question: poll.question,
      status: poll.status,
      audienceResultKind: poll.audience_result_kind,
      audienceLeaderOptionId: poll.audience_leader_option_id,
      editorialSelectionOptionId: poll.editorial_selection_option_id,
      editorialDecisionNote: poll.editorial_decision_note,
      createdAt: poll.created_at,
      openedAt: poll.opened_at,
      closedAt: poll.closed_at,
      archivedAt: poll.archived_at,
      options,
    };
  });

  return {
    polls,
    publishedCourses: courseRows
      .filter((course) => course.is_published)
      .map((course) => ({
        id: course.id,
        slug: course.slug,
        title: course.title,
        code: courseCode(course),
        isPublished: true,
      })),
  };
}

async function callAdminRpc(
  functionName:
    | "course_path_poll_open"
    | "course_path_poll_close"
    | "course_path_poll_archive",
  pollId: string,
  actorId: string,
): Promise<void> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.rpc(functionName, {
    p_poll_id: pollId,
    p_actor_id: actorId,
  });
  if (error) throwDatabaseError(`Course poll ${functionName}`, error);
}

export async function createCoursePathPollDraft(input: {
  slug: string;
  question: string;
  courseIds: [string, string];
  actorId: string;
}): Promise<string> {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.rpc(
    "course_path_poll_create_draft",
    {
      p_slug: input.slug,
      p_question: input.question,
      p_course_ids: input.courseIds,
      p_actor_id: input.actorId,
    },
  );
  if (error) throwDatabaseError("Course poll draft creation", error);
  if (typeof data !== "string") {
    throw new CoursePollDataError(
      "storage_error",
      "Course poll draft was not confirmed",
    );
  }
  return data;
}

export async function openCoursePathPoll(
  pollId: string,
  actorId: string,
): Promise<void> {
  return callAdminRpc("course_path_poll_open", pollId, actorId);
}

export async function closeCoursePathPoll(
  pollId: string,
  actorId: string,
): Promise<void> {
  return callAdminRpc("course_path_poll_close", pollId, actorId);
}

export async function archiveCoursePathPoll(
  pollId: string,
  actorId: string,
): Promise<void> {
  return callAdminRpc("course_path_poll_archive", pollId, actorId);
}

export async function recordCoursePathPollEditorialDecision(input: {
  pollId: string;
  optionId: string;
  note: string | null;
  actorId: string;
}): Promise<void> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.rpc(
    "course_path_poll_record_editorial_decision",
    {
      p_poll_id: input.pollId,
      p_option_id: input.optionId,
      p_note: input.note,
      p_actor_id: input.actorId,
    },
  );
  if (error) throwDatabaseError("Course poll editorial decision", error);
}
