"use client";

import { useRef, useState, useTransition } from "react";
import { castCoursePathVoteAction } from "@/app/actions/course-path-poll";
import type {
  CoursePathPollOptionView,
  CoursePathPollView,
} from "@/lib/course-polls/types";

function optionBySlug(
  poll: CoursePathPollView,
  courseSlug: string | null,
): CoursePathPollOptionView | null {
  if (!courseSlug) return null;
  return (
    poll.options.find((option) => option.courseSlug === courseSlug) ?? null
  );
}

function audienceResultText(poll: CoursePathPollView): string {
  if (poll.audienceResult.kind === "leader") {
    const leader = optionBySlug(
      poll,
      poll.audienceResult.leaderCourseSlug,
    );
    return leader
      ? `Audience choice: ${leader.code} - ${leader.title}.`
      : "The audience leader has been recorded.";
  }
  if (poll.audienceResult.kind === "tie") {
    return "Audience result: a tie.";
  }
  if (poll.audienceResult.kind === "no_votes") {
    return "The ballot closed without a recorded vote.";
  }
  return "Audience result pending.";
}

function editorialDecisionText(poll: CoursePathPollView): string | null {
  if (!poll.editorialDecision) return null;
  const selected = optionBySlug(
    poll,
    poll.editorialDecision.courseSlug,
  );
  if (!selected) return null;

  const audienceLeader =
    poll.audienceResult.kind === "leader"
      ? poll.audienceResult.leaderCourseSlug
      : null;
  const differsFromAudience =
    audienceLeader !== null && audienceLeader !== selected.courseSlug;
  const lead = differsFromAudience
    ? `Prismarium selected ${selected.code} - ${selected.title}, which differs from the audience leader.`
    : `Prismarium selected ${selected.code} - ${selected.title} as the editorial next series.`;

  return poll.editorialDecision.note
    ? `${lead} ${poll.editorialDecision.note}`
    : lead;
}

export function CoursePathPollPanel({
  initialPoll,
}: {
  initialPoll: CoursePathPollView;
}) {
  const [poll, setPoll] = useState(initialPoll);
  const [announcement, setAnnouncement] = useState(
    poll.status === "closed"
      ? "Voting is closed. Final results are visible."
      : poll.viewerChoiceOptionId
        ? "Your current choice is selected. You can change it while voting is open."
        : "Choose a course to reveal the live result.",
  );
  const [isPending, startTransition] = useTransition();
  const voteInFlight = useRef(false);

  const vote = (optionId: string) => {
    if (poll.status !== "open" || isPending || voteInFlight.current) return;
    voteInFlight.current = true;
    setAnnouncement("Recording your choice...");

    startTransition(async () => {
      try {
        const result = await castCoursePathVoteAction({
          pollSlug: poll.slug,
          optionId,
        });
        if (result.poll) {
          setPoll(result.poll);
        }
        setAnnouncement(result.message);
      } catch {
        setAnnouncement(
          "Your vote was not recorded. Please try again in a moment.",
        );
      } finally {
        voteInFlight.current = false;
      }
    });
  };

  const editorialText =
    poll.status === "closed" ? editorialDecisionText(poll) : null;

  return (
    <section
      aria-labelledby="course-path-poll-heading"
      aria-busy={isPending}
      className="scroll-mt-28 border-y border-cyan-300/15 bg-[linear-gradient(100deg,rgba(8,47,73,0.22),rgba(9,9,11,0.86)_45%,rgba(88,28,135,0.16))]"
    >
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:items-center lg:px-8">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cyan-200">
            Advisory community ballot
          </p>
          <h2
            id="course-path-poll-heading"
            className="mt-2 text-xl font-semibold text-zinc-50 sm:text-2xl"
          >
            Help shape what follows
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            {poll.question} One browser gets one current choice, and you can
            change it while the ballot is open.
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Advisory only: this result never changes course access or release
            order automatically.
          </p>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {poll.options.map((option) => {
              const isSelected =
                option.optionId === poll.viewerChoiceOptionId;
              return (
                <div
                  key={option.optionId}
                  className={`rounded-xl border p-3 ${
                    isSelected
                      ? "border-cyan-300/55 bg-cyan-300/10"
                      : "border-zinc-800 bg-black/35"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-amber-300">
                        {option.code}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-100">
                        {option.title}
                      </p>
                    </div>
                    {poll.resultsVisible ? (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-200">
                        {option.percentage ?? 0}%
                      </span>
                    ) : null}
                  </div>

                  {poll.resultsVisible ? (
                    <div className="mt-3">
                      <div
                        role="progressbar"
                        aria-label={`${option.title} share of recorded votes`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={option.percentage ?? 0}
                        className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
                      >
                        <div
                          className="h-full rounded-full bg-cyan-300 transition-[width] duration-300 motion-reduce:transition-none"
                          style={{ width: `${option.percentage ?? 0}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {option.voteCount ?? 0}{" "}
                        {option.voteCount === 1 ? "vote" : "votes"}
                      </p>
                    </div>
                  ) : null}

                  {poll.status === "open" ? (
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      disabled={isPending}
                      onClick={() => vote(option.optionId)}
                      className={`mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-wait disabled:opacity-60 ${
                        isSelected
                          ? "bg-cyan-200 text-zinc-950"
                          : "border border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-cyan-300/50 hover:bg-zinc-900"
                      }`}
                    >
                      {isPending
                        ? "Saving..."
                        : isSelected
                          ? "Your choice"
                          : poll.viewerChoiceOptionId
                            ? `Change to ${option.code}`
                            : `Vote for ${option.code}`}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <p>
              {poll.resultsVisible
                ? `${poll.totalVotes ?? 0} total ${
                    poll.totalVotes === 1 ? "vote" : "votes"
                  }`
                : "Live totals appear after you vote."}
            </p>
            <p>{poll.status === "open" ? "Voting open" : "Voting closed"}</p>
          </div>

          {poll.status === "closed" ? (
            <div className="mt-4 grid gap-2 text-sm leading-6">
              <p className="text-cyan-100">{audienceResultText(poll)}</p>
              {editorialText ? (
                <p className="border-l-2 border-violet-300/50 pl-3 text-violet-100/90">
                  <span className="font-semibold">Editorial decision:</span>{" "}
                  {editorialText}
                </p>
              ) : (
                <p className="text-zinc-500">
                  The editorial next-series decision has not been recorded yet.
                </p>
              )}
            </div>
          ) : null}

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
        </div>
      </div>
    </section>
  );
}
