import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Layers3,
  LockKeyhole,
  Network,
  NotebookPen,
  Search,
} from "lucide-react";

import FeatureOnboardingModal from "@/components/FeatureOnboardingModal";
import type {
  HomeCoursePreview,
  MemberHomeData,
} from "@/lib/home/member-home-data";

interface DashboardViewProps {
  data: MemberHomeData;
}

function StatusBadge({
  children,
  tone = "amber",
}: {
  children: React.ReactNode;
  tone?: "amber" | "zinc";
}) {
  return (
    <span
      className={
        tone === "amber"
          ? "inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold tracking-[0.17em] text-amber-200 uppercase"
          : "inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-[0.17em] text-zinc-400 uppercase"
      }
    >
      {tone === "amber" ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-300"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}

function TextAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-fit items-center gap-2 py-2 text-sm font-semibold text-amber-200 transition-colors hover:text-amber-100 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function CourseHeading({ path }: { path: HomeCoursePreview }) {
  return (
    <>
      {path.courseIdTag ? (
        <p className="font-mono text-xs tracking-[0.2em] text-zinc-500 uppercase">
          {path.courseIdTag}
        </p>
      ) : null}
      <h2 className="mt-3 font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl">
        {path.title}
      </h2>
      <p className="mt-5 max-w-3xl text-xl leading-8 text-zinc-200">
        {path.question}
      </p>
    </>
  );
}

function formatCount(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

export default function DashboardView({ data }: DashboardViewProps) {
  const {
    memberName,
    journalName,
    platformTotals,
    currentPath,
    nextPath,
    currentEnrollment,
    recentJournalEntry,
    savedReading,
    graphConnection,
  } = data;

  const currentActionHref = currentPath
    ? currentEnrollment
      ? `/courses/${currentPath.slug}/learn`
      : `/courses/${currentPath.slug}`
    : "/courses";

  return (
    <>
      <FeatureOnboardingModal />
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(circle_at_75%_10%,rgba(29,72,123,0.25),transparent_32%),radial-gradient(circle_at_20%_8%,rgba(180,143,74,0.09),transparent_28%)]"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-6 py-14 sm:py-20 lg:px-8">
          <header className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.28em] text-amber-300/70 uppercase">
              Member home
            </p>
            <h1 className="mt-5 font-serif text-5xl leading-tight text-zinc-50 sm:text-6xl">
              Welcome back, {memberName}.
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Pick up the path you’re following, or go wherever your curiosity
              pulls today.
            </p>
          </header>

          <section className="mt-14" aria-labelledby="current-shared-path">
            <p
              id="current-shared-path"
              className="text-xs font-semibold tracking-[0.28em] text-amber-300/70 uppercase"
            >
              Studying together now
            </p>
            <article className="relative mt-5 overflow-hidden rounded-3xl border border-amber-300/20 bg-zinc-950/75 p-7 shadow-2xl shadow-black/20 sm:p-10 lg:p-12">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(180,143,74,0.13),transparent_42%)]"
                aria-hidden="true"
              />
              <div className="relative">
                {currentPath ? (
                  <>
                    <StatusBadge>Open now</StatusBadge>
                    <div className="mt-8">
                      <CourseHeading path={currentPath} />
                    </div>
                    <p className="mt-6 text-base leading-7 text-zinc-400">
                      We’re reading, comparing, and following this question
                      together.
                    </p>
                    <div className="mt-8 border-l border-amber-300/30 pl-5">
                      {currentEnrollment ? (
                        <p className="text-sm leading-6 text-zinc-300">
                          {currentEnrollment.isCompleted
                            ? "You’ve completed this path."
                            : `You’re on week ${currentEnrollment.currentWeek} of ${currentPath.durationWeeks}.`}
                        </p>
                      ) : (
                        <p className="text-sm leading-6 text-zinc-300">
                          This path is open whenever you’re ready.
                        </p>
                      )}
                    </div>
                    <div className="mt-5">
                      <TextAction href={currentActionHref}>
                        {currentEnrollment
                          ? currentEnrollment.isCompleted
                            ? "Return to this path"
                            : "Continue this path"
                          : "Start this path"}
                      </TextAction>
                    </div>
                  </>
                ) : (
                  <>
                    <StatusBadge tone="zinc">Assignment needed</StatusBadge>
                    <h2 className="mt-8 font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl">
                      The shared question is being chosen.
                    </h2>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
                      No current path has been assigned yet. The larger course
                      map is available in the meantime.
                    </p>
                    <div className="mt-6">
                      <TextAction href="/courses">See the whole map</TextAction>
                    </div>
                  </>
                )}

                <p className="mt-8 border-t border-white/10 pt-7 text-sm leading-6 text-zinc-500">
                  New here? PRE stays open as the introduction.{" "}
                  <Link
                    href="/courses/pre-how-to-hold-two-things-at-once"
                    className="font-semibold text-zinc-300 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
                  >
                    Begin with PRE.
                  </Link>
                </p>
              </div>
            </article>
          </section>

          <section
            className="mt-8 grid gap-6 lg:grid-cols-2"
            aria-label="What comes next"
          >
            <article className="flex min-h-80 flex-col rounded-3xl border border-white/10 bg-white/[0.025] p-7 sm:p-9">
              {nextPath ? (
                <>
                  <StatusBadge>Coming next</StatusBadge>
                  {nextPath.courseIdTag ? (
                    <p className="mt-7 font-mono text-xs tracking-[0.2em] text-zinc-500 uppercase">
                      {nextPath.courseIdTag}
                    </p>
                  ) : null}
                  <h2 className="mt-3 font-serif text-3xl leading-tight text-zinc-50">
                    {nextPath.title}
                  </h2>
                  <p className="mt-4 text-lg leading-8 text-zinc-300">
                    {nextPath.question}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-zinc-500">
                    This is the next shared path.
                  </p>
                  <p className="mt-auto inline-flex min-h-11 items-center gap-2 pt-6 text-sm font-semibold text-zinc-500">
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    Not available yet
                  </p>
                </>
              ) : (
                <>
                  <StatusBadge tone="zinc">Assignment needed</StatusBadge>
                  <h2 className="mt-7 font-serif text-3xl leading-tight text-zinc-50">
                    The next path has not been assigned yet.
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    When the next shared question is chosen, its preview will
                    appear here.
                  </p>
                  <div className="mt-auto pt-6">
                    <TextAction href="/courses">Explore the paths</TextAction>
                  </div>
                </>
              )}
            </article>

            <article className="flex min-h-80 flex-col rounded-3xl border border-white/10 bg-white/[0.025] p-7 sm:p-9">
              <p className="font-mono text-xs tracking-[0.22em] text-cyan-200/70 uppercase">
                {formatCount(platformTotals.tools)} study tools ·{" "}
                {formatCount(platformTotals.books)} Library entries ·{" "}
                {formatCount(platformTotals.courses)} courses
              </p>
              <h2 className="mt-7 font-serif text-3xl leading-tight text-zinc-50">
                There’s a larger map behind the current course.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-zinc-400">
                See how the questions connect and what lies ahead.
              </p>
              <div className="mt-auto pt-6">
                <TextAction href="/courses">See the whole map</TextAction>
              </div>
            </article>
          </section>

          <section className="mt-24" aria-labelledby="return-to-work">
            <h2
              id="return-to-work"
              className="font-serif text-4xl leading-tight text-zinc-50"
            >
              Return to your work
            </h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <article className="flex min-h-72 flex-col rounded-3xl border border-white/10 bg-zinc-950/55 p-7 sm:p-9">
                <div className="flex items-center gap-3 text-indigo-200">
                  <NotebookPen className="h-5 w-5" aria-hidden="true" />
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                    {journalName}
                  </p>
                </div>
                {recentJournalEntry ? (
                  <>
                    <h3 className="mt-7 font-serif text-3xl text-zinc-50">
                      {recentJournalEntry.title}
                    </h3>
                    <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-8">
                      <TextAction href={`/journal/${recentJournalEntry.id}`}>
                        Open this note
                      </TextAction>
                      <Link
                        href="/journal"
                        className="inline-flex min-h-11 items-center py-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:outline-none"
                      >
                        See all journal entries
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-7 max-w-md text-base leading-7 text-zinc-400">
                      Nothing here yet. Start a page for the question you’re
                      carrying.
                    </p>
                    <div className="mt-auto pt-8">
                      <TextAction href="/journal/new">Write a note</TextAction>
                    </div>
                  </>
                )}
              </article>

              <article className="flex min-h-72 flex-col rounded-3xl border border-white/10 bg-zinc-950/55 p-7 sm:p-9">
                <div className="flex items-center gap-3 text-cyan-200">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                    Saved for later
                  </p>
                </div>
                {savedReading ? (
                  <>
                    <h3 className="mt-7 font-serif text-3xl text-zinc-50">
                      {savedReading.title}
                    </h3>
                    {savedReading.author ? (
                      <p className="mt-3 text-sm text-zinc-500">
                        by {savedReading.author}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-8">
                      <TextAction href={`/library/${savedReading.id}`}>
                        Return to this reading
                      </TextAction>
                      <Link
                        href="/library/my-library"
                        className="inline-flex min-h-11 items-center py-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:outline-none"
                      >
                        See saved material
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-7 max-w-md text-base leading-7 text-zinc-400">
                      You haven’t saved anything yet. Browse until something
                      catches your attention.
                    </p>
                    <div className="mt-auto pt-8">
                      <TextAction href="/library">
                        Explore the Library
                      </TextAction>
                    </div>
                  </>
                )}
              </article>
            </div>
          </section>

          <section className="mt-24" aria-labelledby="follow-a-question">
            <h2
              id="follow-a-question"
              className="font-serif text-4xl leading-tight text-zinc-50"
            >
              Follow a question
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-300">
              Start with a word, person, symbol, idea, or question.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                {
                  title: "Library",
                  body: "Read until something catches your attention.",
                  href: "/library",
                  icon: BookOpen,
                },
                {
                  title: "Concept Search",
                  body: "Trace an idea across the Library.",
                  href: "/search",
                  icon: Search,
                },
                {
                  title: "Seven Lenses",
                  body: "Look at one question from seven directions.",
                  href: "/seven-lenses",
                  icon: Layers3,
                },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.title}
                    href={tool.href}
                    className="group flex min-h-56 flex-col rounded-3xl border border-white/10 bg-white/[0.025] p-7 transition-colors hover:border-cyan-300/30 hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                  >
                    <Icon
                      className="h-5 w-5 text-cyan-200"
                      aria-hidden="true"
                    />
                    <h3 className="mt-8 font-serif text-2xl text-zinc-50">
                      {tool.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">
                      {tool.body}
                    </p>
                    <ArrowRight
                      className="mt-auto h-4 w-4 text-cyan-200 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </section>

          <section
            className="mt-24 mb-8"
            aria-labelledby="connection-to-follow"
          >
            <article className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-zinc-950/60 p-7 sm:p-10">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.09),transparent_45%)]"
                aria-hidden="true"
              />
              <div className="relative grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200">
                  <Network className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="connection-to-follow"
                    className="font-serif text-3xl text-zinc-50"
                  >
                    A connection to follow
                  </h2>
                  {graphConnection ? (
                    <>
                      <h3 className="mt-4 font-serif text-2xl text-zinc-100">
                        {graphConnection.sourceName} and{" "}
                        {graphConnection.targetName}
                      </h3>
                      <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
                        See why these ideas meet in the Knowledge Graph.
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
                      Open the Knowledge Graph and begin anywhere. One
                      connection is usually enough to find another question.
                    </p>
                  )}
                </div>
                <TextAction href={graphConnection?.href ?? "/graph"}>
                  {graphConnection
                    ? "Follow the connection"
                    : "Discover a connection"}
                </TextAction>
              </div>
            </article>
          </section>
        </div>
      </div>
    </>
  );
}
