"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  groupCourseBooksByWeek,
  type CourseBookDisplay,
} from "@/lib/courses/course-book-presentation";

interface CourseWeekSummary {
  week_number: number;
  title: string;
}

const COVER_THEMES = [
  {
    shell: "from-[#24170f] via-[#68451e] to-[#160f0a]",
    wash: "bg-amber-300/20",
    line: "border-amber-200/40",
    ink: "text-amber-50",
    accent: "text-amber-200",
  },
  {
    shell: "from-[#081c22] via-[#0c4d59] to-[#071316]",
    wash: "bg-cyan-200/20",
    line: "border-cyan-100/35",
    ink: "text-cyan-50",
    accent: "text-cyan-200",
  },
  {
    shell: "from-[#281218] via-[#6b2635] to-[#15090d]",
    wash: "bg-rose-200/20",
    line: "border-rose-100/35",
    ink: "text-rose-50",
    accent: "text-rose-200",
  },
  {
    shell: "from-[#102016] via-[#315c3f] to-[#0a120d]",
    wash: "bg-emerald-200/20",
    line: "border-emerald-100/35",
    ink: "text-emerald-50",
    accent: "text-emerald-200",
  },
  {
    shell: "from-[#1d1429] via-[#593a70] to-[#100b17]",
    wash: "bg-violet-200/20",
    line: "border-violet-100/35",
    ink: "text-violet-50",
    accent: "text-violet-200",
  },
  {
    shell: "from-[#101a2a] via-[#2c4f7b] to-[#090e18]",
    wash: "bg-blue-200/20",
    line: "border-blue-100/35",
    ink: "text-blue-50",
    accent: "text-blue-200",
  },
] as const;

function bookByline(book: CourseBookDisplay): string {
  if (book.author) return book.author;
  if (book.weekNumbers.length === 1) {
    return `Week ${book.weekNumbers[0]} primary source`;
  }
  return `Weeks ${book.weekNumbers.join(" & ")} primary source`;
}

function DesignedCover({
  book,
  index,
}: {
  book: CourseBookDisplay;
  index: number;
}) {
  const theme = COVER_THEMES[index % COVER_THEMES.length];
  const byline = bookByline(book);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${theme.shell} ${theme.ink}`}
      aria-hidden="true"
    >
      <div
        className={`absolute -top-[12%] -right-[28%] aspect-square w-[90%] rounded-full ${theme.wash} blur-xl`}
      />
      <div
        className={`absolute -bottom-[24%] -left-[30%] aspect-square w-[95%] rounded-full border ${theme.line}`}
      />
      <div
        className={`absolute inset-x-[12%] top-[14%] border-t ${theme.line}`}
      />
      <div
        className={`absolute inset-x-[12%] bottom-[15%] border-t ${theme.line}`}
      />
      <div className="relative flex h-full flex-col justify-between p-[10%]">
        <p
          className={`font-mono text-[clamp(0.34rem,1.2cqw,0.62rem)] tracking-[0.2em] uppercase ${theme.accent}`}
        >
          Prismarium reading
        </p>
        <div>
          <p className="font-serif text-[clamp(0.72rem,8cqw,2.25rem)] leading-[1.08] font-semibold tracking-tight text-balance">
            {book.title}
          </p>
          <p
            className={`mt-[8%] font-mono text-[clamp(0.38rem,3.6cqw,0.85rem)] tracking-[0.14em] uppercase ${theme.accent}`}
          >
            {byline}
          </p>
        </div>
        <p className="font-serif text-[clamp(0.45rem,1.7cqw,0.78rem)] text-white/55 italic">
          A source for careful inquiry
        </p>
      </div>
    </div>
  );
}

function BookCover({
  book,
  index,
}: {
  book: CourseBookDisplay;
  index: number;
}) {
  if (!book.coverImageUrl) return <DesignedCover book={book} index={index} />;

  return (
    // Cover hosts vary across the library, so this intentionally mirrors the
    // legacy course page instead of coupling preview rendering to Next hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={book.coverImageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
    />
  );
}

function BookCardContents({
  book,
  index,
}: {
  book: CourseBookDisplay;
  index: number;
}) {
  const byline = bookByline(book);

  return (
    <>
      <div className="[container-type:inline-size] h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-800 shadow-lg transition-transform duration-300 ease-out group-hover:-translate-y-1 group-focus-visible:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none">
        <BookCover book={book} index={index} />
      </div>
      <div className="min-w-0 flex-1 self-center py-1">
        <h3 className="line-clamp-2 text-base leading-snug font-semibold text-zinc-100 transition-colors group-hover:text-amber-200 group-focus-visible:text-amber-200">
          {book.title}
        </h3>
        <p className="mt-1.5 line-clamp-1 text-sm text-zinc-400">{byline}</p>
      </div>
      {book.href ? (
        <ExternalLink
          className="h-4 w-4 shrink-0 self-center text-zinc-600 transition-colors group-hover:text-amber-300 group-focus-visible:text-amber-300"
          aria-hidden="true"
        />
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-5 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        <div className="flex max-h-full scale-[0.97] flex-col items-center gap-5 transition-transform duration-300 ease-out group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:transform-none motion-reduce:transition-none">
          <div className="[container-type:inline-size] aspect-[2/3] h-[min(64dvh,38rem)] max-w-[78vw] overflow-hidden rounded-xl border border-amber-300/25 bg-zinc-900 shadow-[0_30px_90px_-20px_rgba(245,158,11,0.5)]">
            <BookCover book={book} index={index} />
          </div>
          <div className="max-w-2xl px-4 text-center">
            <h3 className="text-2xl font-semibold tracking-tight text-balance text-white md:text-3xl">
              {book.title}
            </h3>
            <p className="mt-2 font-mono text-xs tracking-[0.16em] text-amber-300 uppercase md:text-sm">
              {byline}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function BookCard({ book, index }: { book: CourseBookDisplay; index: number }) {
  const className = [
    "group relative flex min-h-32 gap-4 rounded-xl border border-white/10 bg-zinc-900/40 p-3 text-left",
    "outline-none transition duration-200 ease-out hover:border-amber-300/45 hover:bg-zinc-900/75",
    "focus-visible:border-amber-300/60 focus-visible:ring-2 focus-visible:ring-amber-300/60",
  ].join(" ");

  if (!book.href) {
    return (
      <article
        tabIndex={0}
        aria-label={`${book.title}, ${bookByline(book)}. Focus to enlarge the cover.`}
        className={className}
      >
        <BookCardContents book={book} index={index} />
      </article>
    );
  }

  if (/^https?:\/\//i.test(book.href)) {
    return (
      <a
        href={book.href}
        target="_blank"
        rel="noreferrer noopener"
        className={className}
      >
        <BookCardContents book={book} index={index} />
      </a>
    );
  }

  return (
    <Link href={book.href} className={className}>
      <BookCardContents book={book} index={index} />
    </Link>
  );
}

export function CourseBookGallery({
  books,
  weeks = [],
}: {
  books: readonly CourseBookDisplay[];
  weeks?: readonly CourseWeekSummary[];
}) {
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const weekGroups = groupCourseBooksByWeek(books);

  if (!weekGroups.length) return null;

  const safeActiveWeekIndex = Math.min(activeWeekIndex, weekGroups.length - 1);
  const activeGroup = weekGroups[safeActiveWeekIndex];
  const weekDetails = new Map(weeks.map((week) => [week.week_number, week]));
  const activeWeek = weekDetails.get(activeGroup.weekNumber);
  const bookIndex = new Map(books.map((book, index) => [book.key, index]));
  const assignmentCount = weekGroups.reduce(
    (total, group) => total + group.books.length,
    0
  );
  const move = (direction: -1 | 1) => {
    setActiveWeekIndex((current) =>
      Math.max(0, Math.min(current + direction, weekGroups.length - 1))
    );
  };

  return (
    <section aria-labelledby="course-readings-heading" className="py-2">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-amber-300 uppercase">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Course library
          </p>
          <h2
            id="course-readings-heading"
            className="mt-2 text-2xl font-semibold text-white md:text-3xl"
          >
            Readings by week
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-zinc-500">
          {books.length} distinct work{books.length === 1 ? "" : "s"}
          <span aria-hidden="true"> &middot; </span>
          {assignmentCount} weekly assignment
          {assignmentCount === 1 ? "" : "s"}
          <span aria-hidden="true"> &middot; </span>
          {weekGroups.length} reading week
          {weekGroups.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/35 shadow-2xl shadow-black/20">
        <div className="border-b border-white/10 bg-black/15 p-4 md:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                Choose a reading week
              </p>
              <p className="mt-1 hidden text-sm text-zinc-500 sm:block">
                Each week reveals only the sources assigned to that part of the
                journey.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => move(-1)}
                disabled={safeActiveWeekIndex === 0}
                aria-label="Show previous reading week"
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition outline-none hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                disabled={safeActiveWeekIndex === weekGroups.length - 1}
                aria-label="Show next reading week"
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition outline-none hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7"
            aria-label="Choose a week to browse its assigned readings"
          >
            {weekGroups.map((group, index) => {
              const active = index === safeActiveWeekIndex;
              const details = weekDetails.get(group.weekNumber);

              return (
                <button
                  key={group.weekNumber}
                  type="button"
                  onClick={() => setActiveWeekIndex(index)}
                  aria-pressed={active}
                  aria-label={`Week ${group.weekNumber}: ${group.books.length} assigned reading${group.books.length === 1 ? "" : "s"}${details?.title ? `, ${details.title}` : ""}`}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 ${
                    active
                      ? "border-amber-300 bg-amber-300 text-zinc-950 shadow-lg shadow-amber-300/10"
                      : "border-white/10 bg-black/20 text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>
                    <span className="sm:hidden">W</span>
                    <span className="hidden sm:inline">Week </span>
                    {group.weekNumber}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[10px] ${
                      active
                        ? "bg-zinc-950/10 text-zinc-950"
                        : "bg-white/[0.07] text-zinc-500"
                    }`}
                  >
                    {group.books.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          key={activeGroup.weekNumber}
          className="animate-in fade-in slide-in-from-right-2 p-4 duration-300 motion-reduce:animate-none md:p-6"
          role="region"
          aria-labelledby="active-reading-week-heading"
        >
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className="font-mono text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase"
                aria-live="polite"
              >
                Week {activeGroup.weekNumber}
                <span aria-hidden="true"> &middot; </span>
                {activeGroup.books.length} assigned reading
                {activeGroup.books.length === 1 ? "" : "s"}
              </p>
              <h3
                id="active-reading-week-heading"
                className="mt-2 text-xl font-semibold text-white md:text-2xl"
              >
                {activeWeek?.title ?? `Week ${activeGroup.weekNumber}`}
              </h3>
            </div>
            <p className="hidden text-sm text-zinc-500 sm:block">
              Hover or focus to bring a cover forward.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {activeGroup.books.map((book) => (
              <BookCard
                key={book.key}
                book={book}
                index={bookIndex.get(book.key) ?? 0}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
