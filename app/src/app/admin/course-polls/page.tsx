import Link from "next/link";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getCoursePollAdminActor } from "@/lib/course-polls/admin.server";
import {
  listCoursePathPollAdminData,
  type CoursePathPollAdminRecord,
} from "@/lib/course-polls/data.server";
import {
  archiveCoursePathPollAction,
  closeCoursePathPollAction,
  createCoursePathPollDraftAction,
  openCoursePathPollAction,
  recordCoursePathPollEditorialDecisionAction,
} from "./actions";

export const dynamic = "force-dynamic";

const PRE_COURSE_SLUG = "pre-how-to-hold-two-things-at-once";
const LAUNCH_CANDIDATE_SLUGS = new Set([
  "c01-how-humans-know-what-they-know",
  "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning",
]);

type SearchParams = Promise<{
  notice?: string | string[];
  error?: string | string[];
}>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function statusLabel(status: CoursePathPollAdminRecord["status"]): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "open":
      return "Open";
    case "closed":
      return "Closed";
    case "archived":
      return "Archived";
  }
}

function audienceLabel(poll: CoursePathPollAdminRecord): string {
  if (poll.audienceResultKind === "leader") {
    const leader = poll.options.find(
      (option) => option.id === poll.audienceLeaderOptionId,
    );
    return leader ? `Audience leader: ${leader.code}` : "Audience leader recorded";
  }
  if (poll.audienceResultKind === "tie") return "Audience result: tie";
  if (poll.audienceResultKind === "no_votes") return "Audience result: no votes";
  return "Audience result pending";
}

export default async function CoursePollAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  let actor;
  try {
    actor = await getCoursePollAdminActor();
  } catch {
    return (
      <AdminFrame>
        <AdminUnavailable message="Administrator access could not be verified." />
      </AdminFrame>
    );
  }

  if (!actor.userId) {
    redirect("/login?redirect=%2Fadmin%2Fcourse-polls");
  }
  if (!actor.isAdmin) redirect("/dashboard");

  const params = await searchParams;
  const notice = firstParam(params.notice);
  const actionError = firstParam(params.error);

  let adminData;
  try {
    adminData = await listCoursePathPollAdminData();
  } catch {
    return (
      <AdminFrame>
        <AdminUnavailable message="The ballot schema is unavailable in this environment. Apply the staged migration before testing this page." />
      </AdminFrame>
    );
  }

  const launchCandidates = adminData.publishedCourses.filter((course) =>
    LAUNCH_CANDIDATE_SLUGS.has(course.slug),
  );
  const preIsPublic = adminData.publishedCourses.some(
    (course) => course.slug === PRE_COURSE_SLUG,
  );
  const canCreate = launchCandidates.length === 2 && preIsPublic;

  return (
    <AdminFrame>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
              Advisory audience signal
            </p>
            <h1 className="text-3xl font-semibold text-zinc-50 sm:text-4xl">
              Course path ballots
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Open and close the public guest ballot manually. Audience results
              remain separate from the final editorial decision and never
              change course access or release configuration.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-full border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Back to command center
          </Link>
        </div>

        {notice ? (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
          >
            {notice}
          </div>
        ) : null}
        {actionError ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
          >
            {actionError}
          </div>
        ) : null}

        <section
          aria-labelledby="create-ballot-heading"
          className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-7"
        >
          <div className="mb-5">
            <h2
              id="create-ballot-heading"
              className="text-xl font-semibold text-zinc-100"
            >
              Create a draft
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              A ballot must contain exactly two different published courses.
              For this launch, PRE, C01, and FD01 must all have approved public
              records; C01 and FD01 are the locked candidate pair.
            </p>
          </div>

          <form
            action={createCoursePathPollDraftAction}
            className="grid gap-4 lg:grid-cols-2"
          >
            <label className="grid gap-2 text-sm text-zinc-300">
              Ballot slug
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                defaultValue="next-prismarium-youtube-series"
                className="min-h-11 rounded-lg border border-zinc-700 bg-black px-3 text-zinc-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Public question
              <input
                name="question"
                required
                maxLength={240}
                defaultValue="Which course should become the next Prismarium YouTube series?"
                className="min-h-11 rounded-lg border border-zinc-700 bg-black px-3 text-zinc-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              First candidate
              <select
                name="firstCourseId"
                required
                className="min-h-11 rounded-lg border border-zinc-700 bg-black px-3 text-zinc-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              >
                <option value="">Choose a published course</option>
                {launchCandidates.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Second candidate
              <select
                name="secondCourseId"
                required
                className="min-h-11 rounded-lg border border-zinc-700 bg-black px-3 text-zinc-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              >
                <option value="">Choose a different published course</option>
                {launchCandidates.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={!canCreate}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                Create draft ballot
              </button>
              {!canCreate ? (
                <p className="mt-2 text-sm text-amber-300">
                  Published PRE, C01, and FD01 course records are all required
                  before this launch ballot can be created and opened.
                </p>
              ) : null}
            </div>
          </form>
        </section>

        <section aria-labelledby="ballots-heading" className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2
                id="ballots-heading"
                className="text-xl font-semibold text-zinc-100"
              >
                Ballots
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Opening, closing, and archiving are always deliberate actions.
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-600">
              {adminData.polls.length} total
            </span>
          </div>

          {adminData.polls.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center text-sm text-zinc-500">
              No ballots have been created in this environment.
            </div>
          ) : (
            <div className="grid gap-5">
              {adminData.polls.map((poll) => {
                const totalVotes = poll.options.reduce(
                  (sum, option) => sum + option.voteCount,
                  0,
                );
                const selectedOption = poll.options.find(
                  (option) =>
                    option.id === poll.editorialSelectionOptionId,
                );

                return (
                  <article
                    key={poll.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-7"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-cyan-200">
                            {statusLabel(poll.status)}
                          </span>
                          <span className="font-mono text-xs text-zinc-600">
                            {poll.slug}
                          </span>
                        </div>
                        <h3 className="max-w-3xl text-lg font-medium text-zinc-100">
                          {poll.question}
                        </h3>
                      </div>
                      <div className="text-right text-sm text-zinc-400">
                        <p>{totalVotes} votes</p>
                        <p className="mt-1">{audienceLabel(poll)}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {poll.options.map((option) => (
                        <div
                          key={option.id}
                          className="rounded-xl border border-zinc-800 bg-black/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-xs text-amber-300">
                                {option.code}
                              </p>
                              <p className="mt-1 font-medium text-zinc-100">
                                {option.title}
                              </p>
                              <p className="mt-1 text-xs text-zinc-600">
                                {option.courseSlug}
                              </p>
                            </div>
                            <span className="text-sm tabular-nums text-zinc-400">
                              {option.voteCount}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-800 pt-5">
                      {poll.status === "draft" ? (
                        <form action={openCoursePathPollAction}>
                          <input type="hidden" name="pollId" value={poll.id} />
                          <button
                            type="submit"
                            className="min-h-11 rounded-full bg-emerald-300 px-5 text-sm font-semibold text-zinc-950 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                          >
                            Open ballot
                          </button>
                        </form>
                      ) : null}
                      {poll.status === "open" ? (
                        <form action={closeCoursePathPollAction}>
                          <input type="hidden" name="pollId" value={poll.id} />
                          <button
                            type="submit"
                            className="min-h-11 rounded-full bg-amber-300 px-5 text-sm font-semibold text-zinc-950 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                          >
                            Close and freeze result
                          </button>
                        </form>
                      ) : null}
                      {poll.status === "closed" ? (
                        <form action={archiveCoursePathPollAction}>
                          <input type="hidden" name="pollId" value={poll.id} />
                          <button
                            type="submit"
                            className="min-h-11 rounded-full border border-zinc-700 px-5 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                          >
                            Archive
                          </button>
                        </form>
                      ) : null}
                    </div>

                    {poll.status === "closed" || poll.status === "archived" ? (
                      <form
                        action={recordCoursePathPollEditorialDecisionAction}
                        className="mt-5 grid gap-3 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
                      >
                        <input type="hidden" name="pollId" value={poll.id} />
                        <label className="grid gap-2 text-sm text-zinc-300">
                          Editorial selection
                          <select
                            name="optionId"
                            required
                            defaultValue={poll.editorialSelectionOptionId ?? ""}
                            className="min-h-11 rounded-lg border border-zinc-700 bg-black px-3 text-zinc-100 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-300/30"
                          >
                            <option value="">Choose a course</option>
                            {poll.options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.code} - {option.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-2 text-sm text-zinc-300">
                          Public explanation (optional)
                          <input
                            name="note"
                            maxLength={1000}
                            defaultValue={poll.editorialDecisionNote ?? ""}
                            placeholder="Explain the final decision, especially if it differs from the audience result."
                            className="min-h-11 rounded-lg border border-zinc-700 bg-black px-3 text-zinc-100 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-300/30"
                          />
                        </label>
                        <button
                          type="submit"
                          className="min-h-11 self-end rounded-full bg-violet-300 px-5 text-sm font-semibold text-zinc-950 hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
                        >
                          {selectedOption ? "Update decision" : "Record decision"}
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminFrame>
  );
}

function AdminUnavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-6 py-16">
      <div className="w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
        <h1 className="text-2xl font-semibold text-amber-100">
          Course ballots unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-amber-50/80">{message}</p>
        <Link
          href="/admin"
          className="mt-5 inline-flex min-h-11 items-center rounded-full border border-amber-200/30 px-4 text-sm font-medium text-amber-100"
        >
          Back to command center
        </Link>
      </div>
    </div>
  );
}

function AdminFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
