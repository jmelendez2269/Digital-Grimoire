"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCoursePollAdminActor } from "@/lib/course-polls/admin.server";
import {
  archiveCoursePathPoll,
  closeCoursePathPoll,
  CoursePollDataError,
  createCoursePathPollDraft,
  openCoursePathPoll,
  recordCoursePathPollEditorialDecision,
} from "@/lib/course-polls/data.server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ADMIN_PATH = "/admin/course-polls";

function adminLocation(
  kind: "notice" | "error",
  message: string,
): string {
  const params = new URLSearchParams({ [kind]: message });
  return `${ADMIN_PATH}?${params.toString()}`;
}

async function requireAdminId(): Promise<string | null> {
  const actor = await getCoursePollAdminActor();
  if (!actor.userId || !actor.isAdmin) return null;
  return actor.userId;
}

function safeAdminError(error: unknown): string {
  if (error instanceof CoursePollDataError) {
    switch (error.code) {
      case "invalid":
        return "The ballot or options are invalid.";
      case "not_open":
        return "The ballot is not in the required state.";
      case "admin_required":
        return "Administrator access is required.";
      default:
        return "The ballot database is unavailable.";
    }
  }
  return "The ballot action could not be completed.";
}

async function completeAdminAction(
  operation: (actorId: string) => Promise<void>,
  successMessage: string,
): Promise<never> {
  const actorId = await requireAdminId();
  if (!actorId) {
    redirect(`/login?redirect=${encodeURIComponent(ADMIN_PATH)}`);
  }

  let destination: string;
  try {
    await operation(actorId);
    destination = adminLocation("notice", successMessage);
  } catch (error) {
    destination = adminLocation("error", safeAdminError(error));
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath("/");
  redirect(destination);
}

export async function createCoursePathPollDraftAction(
  formData: FormData,
): Promise<never> {
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const question = String(formData.get("question") ?? "").trim();
  const firstCourseId = String(formData.get("firstCourseId") ?? "").trim();
  const secondCourseId = String(formData.get("secondCourseId") ?? "").trim();

  if (
    !SLUG_PATTERN.test(slug) ||
    !question ||
    question.length > 240 ||
    !UUID_PATTERN.test(firstCourseId) ||
    !UUID_PATTERN.test(secondCourseId) ||
    firstCourseId === secondCourseId
  ) {
    redirect(
      adminLocation(
        "error",
        "Choose two different published courses and provide a valid slug and question.",
      ),
    );
  }

  return completeAdminAction(
    async (actorId) => {
      await createCoursePathPollDraft({
        slug,
        question,
        courseIds: [firstCourseId, secondCourseId],
        actorId,
      });
    },
    "Draft ballot created.",
  );
}

export async function openCoursePathPollAction(
  formData: FormData,
): Promise<never> {
  const pollId = String(formData.get("pollId") ?? "").trim();
  if (!UUID_PATTERN.test(pollId)) {
    redirect(adminLocation("error", "The ballot identifier is invalid."));
  }
  return completeAdminAction(
    (actorId) => openCoursePathPoll(pollId, actorId),
    "Ballot opened. Options are now locked.",
  );
}

export async function closeCoursePathPollAction(
  formData: FormData,
): Promise<never> {
  const pollId = String(formData.get("pollId") ?? "").trim();
  if (!UUID_PATTERN.test(pollId)) {
    redirect(adminLocation("error", "The ballot identifier is invalid."));
  }
  return completeAdminAction(
    (actorId) => closeCoursePathPoll(pollId, actorId),
    "Ballot closed and its audience result recorded.",
  );
}

export async function archiveCoursePathPollAction(
  formData: FormData,
): Promise<never> {
  const pollId = String(formData.get("pollId") ?? "").trim();
  if (!UUID_PATTERN.test(pollId)) {
    redirect(adminLocation("error", "The ballot identifier is invalid."));
  }
  return completeAdminAction(
    (actorId) => archiveCoursePathPoll(pollId, actorId),
    "Ballot archived.",
  );
}

export async function recordCoursePathPollEditorialDecisionAction(
  formData: FormData,
): Promise<never> {
  const pollId = String(formData.get("pollId") ?? "").trim();
  const optionId = String(formData.get("optionId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!UUID_PATTERN.test(pollId) || !UUID_PATTERN.test(optionId)) {
    redirect(adminLocation("error", "The editorial decision is invalid."));
  }

  return completeAdminAction(
    (actorId) =>
      recordCoursePathPollEditorialDecision({
        pollId,
        optionId,
        note: note || null,
        actorId,
      }),
    "Editorial decision recorded separately from the audience result.",
  );
}
