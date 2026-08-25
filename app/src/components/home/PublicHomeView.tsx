import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  Layers3,
  Network,
  NotebookPen,
  Play,
  Search,
  Sparkles,
} from "lucide-react";

import PrismAnimation from "@/components/ui/PrismAnimation";
import type { PublicLaunchPresentation } from "@/lib/courses/launch-presentation";
import type { PlatformTotals } from "@/lib/platform/catalog";
import { LENSES } from "@/lib/parallax/lenses";
import { getLensColorStyle } from "@/lib/utils/lens-colors";

const sevenLenses = Object.values(LENSES);

interface PublicHomeViewProps {
  platformTotals: PlatformTotals;
  launch: PublicLaunchPresentation;
  pollPanel?: ReactNode;
}

const questionTools = [
  {
    title: "Library",
    description: "Meet the books, then follow a reading into the collection.",
    href: "/library",
    icon: BookOpen,
  },
  {
    title: "Seven Lenses",
    description: "Compare what seven different perspectives notice.",
    href: "/seven-lenses",
    icon: Layers3,
  },
  {
    title: "Concept Search",
    description: "Find where an idea appears across books and passages.",
    href: "/search",
    icon: Search,
  },
  {
    title: "Knowledge Graph",
    description: "Inspect connections, evidence, and the limits of a claim.",
    href: "/graph",
    icon: Network,
  },
  {
    title: "Study Journal",
    description: "Keep your notes, questions, and discoveries together.",
    href: "/journal",
    icon: NotebookPen,
  },
] as const;

function formatCount(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

function formatPlatformSummary(platformTotals: PlatformTotals): string {
  return [
    `${formatCount(platformTotals.tools)} study tools`,
    platformTotals.books === null
      ? null
      : `${formatCount(platformTotals.books)} Library entries`,
    platformTotals.courses === null
      ? null
      : `${formatCount(platformTotals.courses)} courses`,
  ]
    .filter((metric): metric is string => metric !== null)
    .join(" · ");
}

function CourseCandidateCard({
  course,
  accent,
}: {
  course: PublicLaunchPresentation["candidateCourses"][number];
  accent: "amber" | "cyan";
}) {
  const accentClasses =
    accent === "amber"
      ? {
          border: "hover:border-amber-300/40",
          badge: "border-amber-300/25 bg-amber-300/[0.08] text-amber-200",
          text: "text-amber-200 group-hover:text-amber-100",
          glow: "bg-[radial-gradient(circle_at_100%_0%,rgba(245,158,11,0.12),transparent_42%)]",
        }
      : {
          border: "hover:border-cyan-300/40",
          badge: "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-200",
          text: "text-cyan-200 group-hover:text-cyan-100",
          glow: "bg-[radial-gradient(circle_at_100%_0%,rgba(34,211,238,0.11),transparent_42%)]",
        };

  return (
    <article
      className={`group relative flex min-h-[25rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/75 p-6 transition duration-300 motion-reduce:transition-none sm:p-8 ${accentClasses.border}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${accentClasses.glow}`}
        aria-hidden="true"
      />
      <div className="relative flex h-full flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`inline-flex min-h-8 items-center rounded-full border px-3 font-mono text-[0.68rem] font-semibold tracking-[0.18em] uppercase ${accentClasses.badge}`}
          >
            {course.code} · {course.pathLabel}
          </span>
          <span className="font-mono text-[0.68rem] tracking-[0.14em] text-zinc-400 uppercase">
            {course.durationWeeks} weeks
          </span>
        </div>

        <h3 className="mt-8 max-w-xl font-serif text-3xl leading-tight text-zinc-50 sm:text-4xl">
          {course.title}
        </h3>
        <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
          {course.coreQuestion}
        </p>

        <div className="mt-7 flex flex-wrap gap-2 text-xs text-zinc-400">
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
            Public preview
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
            Next-series candidate
          </span>
        </div>

        <Link
          href={course.href}
          className={`mt-auto inline-flex min-h-11 w-fit items-center gap-2 pt-9 text-sm font-semibold focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none ${accentClasses.text}`}
        >
          Preview {course.code}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
}

function VoteFallback({
  status,
  startingCourseTitle,
}: {
  status: PublicLaunchPresentation["voteStatus"];
  startingCourseTitle: string;
}) {
  const message =
    status === "open"
      ? "The ballot is temporarily unavailable. Both public course previews are still open."
      : status === "closed"
        ? "Voting is closed. The audience result and editorial decision will appear here when they are recorded."
        : status === "unavailable"
          ? "The ballot is temporarily unavailable. Both public course previews still work, and no vote has been recorded from this page."
          : `The ballot opens when ${startingCourseTitle} launches. No sign-in will be required.`;

  return (
    <div
      className="flex flex-col gap-5 rounded-[1.75rem] border border-white/10 bg-black/30 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
      role="status"
    >
      <div>
        <p className="font-mono text-[0.68rem] tracking-[0.2em] text-amber-200 uppercase">
          {status === "open"
            ? "Ballot unavailable"
            : status === "closed"
              ? "Ballot closed"
              : status === "unavailable"
                ? "Ballot unavailable"
                : "Ballot announced"}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          {message}
        </p>
      </div>
      <Link
        href="/courses"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none sm:self-auto"
      >
        Explore every course
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function PublicHomeView({
  platformTotals,
  launch,
  pollPanel,
}: PublicHomeViewProps) {
  const pre = launch.startingCourse;
  const [c01, fd01] = launch.candidateCourses;
  const youtubeHref =
    launch.youtube.prePlaylistUrl ?? launch.youtube.channelUrl;
  const youtubeLabel = launch.youtube.prePlaylistUrl
    ? `Watch the ${pre.title} series`
    : "Visit our YouTube channel";

  return (
    <div className="overflow-hidden">
      <section className="relative isolate">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_73%_31%,rgba(29,72,123,0.34),transparent_25%),radial-gradient(circle_at_19%_25%,rgba(180,143,74,0.1),transparent_32%)]"
          aria-hidden="true"
        />
        <div className="mx-auto grid min-h-[72dvh] max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.12fr_0.88fr] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-semibold tracking-[0.3em] text-amber-300/80 uppercase">
              A place to keep learning
            </p>
            <h1 className="font-serif text-5xl leading-[1.03] font-medium text-balance text-zinc-50 sm:text-6xl lg:text-7xl">
              Bring a question.
              <span className="mt-2 block text-zinc-400">
                We’ll look from more than one direction.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              Prismarium is a shared study space for reading deeply, comparing
              perspectives, and building your own understanding without being
              handed one final answer.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={pre.href}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-200 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
              >
                Begin with {pre.title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-zinc-200 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
              >
                See how it works
              </Link>
            </div>

            <p className="mt-8 font-mono text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase tabular-nums">
              {formatPlatformSummary(platformTotals)}
            </p>
          </div>

          <div className="mx-auto w-full max-w-[27rem]">
            <PrismAnimation />
            <p className="mt-7 text-center font-mono text-[0.65rem] tracking-[0.24em] text-zinc-500 uppercase">
              Seven lenses on every question
            </p>
            <ul
              className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
              aria-label="The seven lenses Prismarium looks through"
            >
              {sevenLenses.map((lens) => (
                <li
                  key={lens.id}
                  className="flex items-center gap-1.5 text-[0.68rem] font-medium tracking-wide text-zinc-400"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getLensColorStyle(lens.id).hex }}
                    aria-hidden="true"
                  />
                  {lens.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="tools-heading"
        className="scroll-mt-24 border-t border-white/5 bg-black/20"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300/70 uppercase">
                Five ways to investigate
              </p>
              <h2
                id="tools-heading"
                className="mt-4 font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl"
              >
                One question. More than one way in.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-400">
              Start with a course, a book, a concept, or a connection. The tools
              meet again as your understanding grows.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {questionTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className="group flex min-h-56 flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 font-serif text-xl text-zinc-50">
                    {tool.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {tool.description}
                  </p>
                  <ArrowRight
                    className="mt-auto h-4 w-4 self-end text-cyan-200 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="start-with-pre"
        aria-labelledby="pre-launch-heading"
        className="scroll-mt-24 border-y border-white/5 bg-zinc-950/55"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <article className="relative overflow-hidden rounded-[2.25rem] border border-amber-300/20 bg-[linear-gradient(120deg,rgba(39,31,19,0.92),rgba(9,9,11,0.96)_56%,rgba(6,30,38,0.7))] p-7 shadow-2xl shadow-black/20 sm:p-10 lg:p-12">
            <div
              className="pointer-events-none absolute -top-28 right-[-5rem] h-80 w-80 rounded-full border border-cyan-300/10"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -right-12 bottom-[-8rem] h-64 w-64 rotate-45 border border-amber-300/10"
              aria-hidden="true"
            />

            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 font-mono text-[0.68rem] font-semibold tracking-[0.2em] text-amber-200 uppercase">
                    <Play
                      className="h-3.5 w-3.5 fill-current"
                      aria-hidden="true"
                    />
                    First on YouTube
                  </span>
                  <span className="font-mono text-[0.68rem] tracking-[0.16em] text-zinc-400 uppercase">
                    {pre.pathLabel} · {pre.durationWeeks} weeks
                  </span>
                </div>

                <h2
                  id="pre-launch-heading"
                  className="mt-7 max-w-3xl font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl lg:text-6xl"
                >
                  We’re starting together with {pre.title}.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
                  <span className="font-semibold text-amber-100">
                    Highly recommended, never required.
                  </span>{" "}
                  {pre.title} is the first Prismarium course series launching on
                  YouTube—a recorded study series we can follow together. This
                  short orientation introduces how we keep uncertainty open
                  without giving up evidence, care, or judgment.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-6 sm:p-7">
                <p className="font-mono text-[0.68rem] tracking-[0.18em] text-zinc-400 uppercase">
                  {pre.title}
                </p>
                <p className="mt-4 font-serif text-2xl leading-snug text-zinc-100">
                  {pre.coreQuestion}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <Link
                    href={pre.href}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-200 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
                  >
                    Preview {pre.title}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  {youtubeHref ? (
                    <a
                      href={youtubeHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                    >
                      {youtubeLabel}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </article>

          <div className="mt-20 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300/75 uppercase">
                Help shape what follows
              </p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl">
                Which question should become the next series?
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
                C01 and FD01 are different doors into Prismarium. Compare both
                public previews before you vote.
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
            >
              See the complete course map
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <CourseCandidateCard course={c01} accent="amber" />
            <CourseCandidateCard course={fd01} accent="cyan" />
          </div>

          <div
            id="choose-the-next-show"
            className="scroll-mt-24 pt-8"
            aria-label="Choose the next Prismarium YouTube series"
          >
            {pollPanel ?? (
              <VoteFallback
                status={launch.voteStatus}
                startingCourseTitle={pre.title}
              />
            )}
          </div>
        </div>
      </section>

      <section
        id="origin"
        aria-labelledby="origin-heading"
        className="scroll-mt-24"
      >
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[0.72fr_1.28fr] lg:px-8 lg:py-28">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-amber-300/70 uppercase">
              Why Prismarium exists
            </p>
            <Compass
              className="mt-6 h-9 w-9 text-amber-200/70"
              strokeWidth={1.25}
              aria-hidden="true"
            />
          </div>
          <div className="max-w-3xl">
            <h2
              id="origin-heading"
              className="font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl"
            >
              The place I was looking for didn’t exist.
            </h2>
            <div className="mt-7 grid gap-6 text-base leading-7 text-zinc-300 sm:grid-cols-2">
              <p>
                I wanted room to follow questions across religion, mythology,
                philosophy, science, symbolism, and consciousness—without
                pretending only one way of looking could matter.
              </p>
              <p>
                So I began building that room. I gathered the texts, made the
                tools, and shaped courses we can investigate together. I’m still
                a learner here too.
              </p>
            </div>
            <p className="mt-8 border-l border-amber-300/30 pl-5 font-serif text-xl leading-8 text-zinc-200">
              This isn’t about being told what to believe. It’s about learning
              how to look carefully—and deciding what holds up for you.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-5xl px-6 py-20 text-center lg:px-8 lg:py-28">
          <Sparkles
            className="mx-auto h-8 w-8 text-amber-200/80"
            strokeWidth={1.25}
            aria-hidden="true"
          />
          <h2 className="mt-7 font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl">
            If this feels like the place you were looking for too, come in.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            You don’t need the right background, a settled worldview, or a
            perfect question. Curiosity is enough to begin.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={pre.href}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-zinc-200 focus-visible:outline-none"
            >
              Preview {pre.title}
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-200 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
            >
              Join Prismarium
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
