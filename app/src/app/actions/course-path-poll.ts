"use server";

import { cookies, headers } from "next/headers";
import {
  castCoursePathVote,
  CoursePollDataError,
  readCoursePathPollView,
} from "@/lib/course-polls/data.server";
import {
  COURSE_POLL_VOTER_COOKIE,
  generateCoursePollVoterToken,
  getCoursePollCookieOptions,
  hashCoursePollIdentifier,
  isCoursePollHashSecretValid,
  isCoursePollVoterToken,
  readTrustedCoursePollNetwork,
} from "@/lib/course-polls/privacy";
import type { CoursePathVoteActionResult } from "@/lib/course-polls/types";

const POLL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unavailableResult(
  message = "Voting is temporarily unavailable. The rest of the page still works.",
): CoursePathVoteActionResult {
  return {
    ok: false,
    code: "not_available",
    message,
    poll: null,
  };
}

export async function castCoursePathVoteAction(input: {
  pollSlug: string;
  optionId: string;
}): Promise<CoursePathVoteActionResult> {
  const pollSlug =
    typeof input?.pollSlug === "string" ? input.pollSlug.trim() : "";
  const optionId =
    typeof input?.optionId === "string" ? input.optionId.trim() : "";
  if (
    !POLL_SLUG_PATTERN.test(pollSlug) ||
    !UUID_PATTERN.test(optionId)
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "That ballot choice is not valid.",
      poll: null,
    };
  }

  const secret = process.env.COURSE_POLL_HASH_SECRET;
  if (!isCoursePollHashSecretValid(secret)) return unavailableResult();

  let voterHashForRefresh: string | null = null;

  try {
    const [cookieStore, headerStore] = await Promise.all([
      cookies(),
      headers(),
    ]);
    const existingToken = cookieStore.get(COURSE_POLL_VOTER_COOKIE)?.value;
    const validExistingToken = isCoursePollVoterToken(existingToken)
      ? existingToken
      : null;
    const hasExistingToken = validExistingToken !== null;
    const voterToken =
      validExistingToken ?? generateCoursePollVoterToken();
    const voterHash = hashCoursePollIdentifier(
      secret,
      pollSlug,
      "voter",
      voterToken,
    );
    voterHashForRefresh = voterHash;

    const trustedNetwork = readTrustedCoursePollNetwork(
      headerStore,
      process.env.COURSE_POLL_TRUSTED_NETWORK_HEADER ||
        "x-vercel-forwarded-for",
    );
    const networkHash = trustedNetwork
      ? hashCoursePollIdentifier(
          secret,
          pollSlug,
          "network",
          trustedNetwork,
        )
      : null;

    const poll = await castCoursePathVote({
      pollSlug,
      optionId,
      voterHash,
      networkHash,
    });

    let cookieRemembered = hasExistingToken;
    if (!hasExistingToken) {
      try {
        cookieStore.set(
          COURSE_POLL_VOTER_COOKIE,
          voterToken,
          getCoursePollCookieOptions(process.env.NODE_ENV === "production"),
        );
        cookieRemembered = true;
      } catch {
        cookieRemembered = false;
      }
    }

    return {
      ok: true,
      code: "accepted",
      message: cookieRemembered
        ? "Your choice is counted. You can change it while voting is open."
        : "Your choice is counted, but this browser could not remember it for a later visit.",
      poll,
    };
  } catch (error) {
    if (error instanceof CoursePollDataError) {
      if (error.code === "rate_limited") {
        return {
          ok: false,
          code: "rate_limited",
          message: "Please wait a moment before changing your vote again.",
          poll: null,
        };
      }
      if (error.code === "invalid") {
        return {
          ok: false,
          code: "invalid",
          message: "That option does not belong to this ballot.",
          poll: null,
        };
      }
      if (error.code === "not_open" && voterHashForRefresh) {
        try {
          const closedPoll = await readCoursePathPollView({
            pollSlug,
            voterHash: voterHashForRefresh,
          });
          if (closedPoll?.status === "closed") {
            return {
              ok: false,
              code: "not_available",
              message: "Voting has closed. Final results are now visible.",
              poll: closedPoll,
            };
          }
        } catch {
          // Fall through to the generic fail-closed response.
        }
      }
    }

    console.warn("[Course poll] Vote was not accepted");
    return unavailableResult(
      "Your vote was not recorded. Please try again in a moment.",
    );
  }
}
