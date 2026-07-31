import "server-only";

import { cookies } from "next/headers";
import {
  readCoursePathPollLifecycleStatus,
  readCoursePathPollView,
} from "./data.server";
import {
  COURSE_POLL_VOTER_COOKIE,
  hashCoursePollIdentifier,
  isCoursePollHashSecretValid,
  isCoursePollVoterToken,
} from "./privacy";
import type { CoursePathPollView } from "./types";

const POLL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PublicCoursePathPollLoad = {
  poll: CoursePathPollView | null;
  voteStatus: "announced" | "open" | "closed" | "unavailable";
};

/**
 * Safe Server Component read. Drafts and not-yet-created ballots remain
 * announced; broken configuration or storage fails closed as unavailable.
 */
export async function loadPublicCoursePathPoll(
  requestedPollSlug?: string | null,
): Promise<PublicCoursePathPollLoad> {
  const pollSlug =
    requestedPollSlug?.trim() || process.env.COURSE_PATH_POLL_SLUG?.trim();
  const secret = process.env.COURSE_POLL_HASH_SECRET;

  if (!pollSlug) {
    return { poll: null, voteStatus: "announced" };
  }
  if (!POLL_SLUG_PATTERN.test(pollSlug)) {
    return { poll: null, voteStatus: "unavailable" };
  }

  try {
    const lifecycleStatus =
      await readCoursePathPollLifecycleStatus(pollSlug);
    if (lifecycleStatus === null || lifecycleStatus === "draft") {
      return { poll: null, voteStatus: "announced" };
    }
    if (!isCoursePollHashSecretValid(secret)) {
      return { poll: null, voteStatus: "unavailable" };
    }

    const cookieStore = await cookies();
    const voterToken = cookieStore.get(COURSE_POLL_VOTER_COOKIE)?.value;
    const voterHash = isCoursePollVoterToken(voterToken)
      ? hashCoursePollIdentifier(secret, pollSlug, "voter", voterToken)
      : null;
    const poll = await readCoursePathPollView({ pollSlug, voterHash });

    if (!poll) {
      return { poll: null, voteStatus: "unavailable" };
    }
    return { poll, voteStatus: poll.status };
  } catch {
    console.warn("[Course poll] Public ballot is temporarily unavailable");
    return { poll: null, voteStatus: "unavailable" };
  }
}
