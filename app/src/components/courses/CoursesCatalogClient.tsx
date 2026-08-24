"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Search, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseReleaseBadge from "@/components/CourseReleaseBadge";
import {
  getCourseReleaseStatus,
  groupCoursesByRelease,
  isCourseAvailable,
  isIntroductionCourse,
  isMainCourse,
} from "@/lib/courses/presentation";
import { type PlatformTotals } from "@/lib/platform/catalog";
import { tiptapToText } from "@/lib/tiptap/render";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseContent {
  arc?: string;
  arc_position?: number;
  core_question?: string;
  course_id_tag?: string;
  curator_note_public?: string;
  curator_note?: string;
  key_tensions?: Array<{ label: string; description: string }>;
  completion_pathways?: Array<{ code: string; title: string }>;
  weeks?: unknown[];
}

interface Text {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
}

interface CourseText {
  id: string;
  text_id: string;
  is_required: boolean;
  texts: Text | null;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  premise: string | null;
  learning_outcomes: string[] | null;
  course_type: "foundational" | "theme" | "rotation" | null;
  level: "foundational" | "intermediate" | "advanced" | null;
  duration_weeks: number | null;
  content: CourseContent | null;
  is_published: boolean;
  created_at: string;
  course_texts?: CourseText[];
}

interface Enrollment {
  current_week: number;
  progress: Record<string, unknown> | null;
}

interface EnrolledCourse extends Course {
  enrollment: Enrollment;
}

type ViewMode = "arcs" | "catalog";

// ─── Constants / helpers ──────────────────────────────────────────────────────

// Spectrum palette from colors_and_type.css, assigned by arc index.
const ARC_PALETTE = [
  "#20E0F5", // cyan
  "#FF8C2A", // amber
  "#2AFFA0", // emerald
  "#3A7FFF", // sapphire
  "#F5D020", // gold
  "#B03AFF", // violet
  "#FF3A5C", // ruby
  "#B48F4A", // brass
];

const DEFAULT_ARC_NAME = "Foundation Doors";

function formatPlatformTotal(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

function PlatformTotalsLine({
  totals,
  className,
}: {
  totals: PlatformTotals;
  className: string;
}) {
  return (
    <p className={className}>
      <b className="font-medium text-amber-300">
        {formatPlatformTotal(totals.tools)}
      </b>
      {" study tools · "}
      <b className="font-medium text-amber-300">
        {formatPlatformTotal(totals.books)}
      </b>
      {" books · "}
      <b className="font-medium text-amber-300">
        {formatPlatformTotal(totals.courses)}
      </b>
      {" courses"}
    </p>
  );
}

// 7 Spectrum lenses — mapped to design tokens, with heuristic keyword sets
// for deriving per-course lens tags from title/description/key-tension text.
const LENS_DEFS: Array<{
  key: string;
  label: string;
  color: string;
  keywords: RegExp;
}> = [
  {
    key: "scientific",
    label: "Scientific",
    color: "#FF3A5C", // --spectrum-ruby
    keywords:
      /\b(science|scientif|empiric|physic|biolog|chemist|evidence|hypothesi|experiment|data|methodolog|cognit|neuro)/i,
  },
  {
    key: "psychological",
    label: "Psychological",
    color: "#FF8C2A", // --spectrum-amber
    keywords:
      /\b(psycholog|psyche|mind|conscious|unconscious|jung|dream|archetyp|ego|identity|trauma|emotion|attention)/i,
  },
  {
    key: "philosophical",
    label: "Philosophical",
    color: "#F5D020", // --spectrum-gold
    keywords:
      /\b(philosoph|epistemolog|ontolog|metaphys|ethic|virtue|reason|logic|dialect|plato|aristotle|kant|stoic)/i,
  },
  {
    key: "religious",
    label: "Religious/Spiritual",
    color: "#2AFFA0", // --spectrum-emerald
    keywords:
      /\b(religion|religious|spirit|sacred|divine|god|devot|mystic|prayer|soul|salvation|ritual|monastic|gnos)/i,
  },
  {
    key: "historical",
    label: "Historical/Anthropological",
    color: "#20E0F5", // --spectrum-cyan
    keywords:
      /\b(histor|tradition|transmiss|inherit|lineage|ancient|century|era|archive|colonial|antiquity)/i,
  },
  {
    key: "symbolic",
    label: "Symbolic/Occult",
    color: "#3A7FFF", // --spectrum-sapphire
    keywords:
      /\b(symbol|sign|hermetic|alchem|kabbal|qabal|occult|magic|esoter|tarot|sigil|correspond|myth)/i,
  },
  {
    key: "mathematical",
    label: "Mathematical",
    color: "#B03AFF", // --spectrum-violet
    keywords:
      /\b(math|geometr|number|proportion|pattern|ratio|symmetr|fractal|pythagor|formula|topolog)/i,
  },
];

function deriveLenses(course: Course): number[] {
  const parts: string[] = [
    course.title,
    course.description ?? "",
    course.premise ?? "",
    course.content?.core_question ?? "",
    ...(course.content?.key_tensions?.map(
      (t) => `${t.label} ${t.description}`
    ) ?? []),
    ...(course.learning_outcomes ?? []),
  ];
  const blob = parts.join(" ");
  return LENS_DEFS.map((def, i) => (def.keywords.test(blob) ? i : -1)).filter(
    (i) => i >= 0
  );
}

function getCoreQuestion(course: Course, maxLength = 200): string | null {
  const direct = course.content?.core_question;
  if (direct)
    return direct.length > maxLength
      ? direct.slice(0, maxLength) + "…"
      : direct;
  return (
    getTextExcerpt(course.description, maxLength) ||
    getTextExcerpt(course.premise, maxLength)
  );
}

function getTextExcerpt(
  text: string | null | undefined,
  maxLength = 120
): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const extracted = tiptapToText(JSON.parse(trimmed));
      if (extracted)
        return extracted.length > maxLength
          ? extracted.slice(0, maxLength) + "…"
          : extracted;
    } catch {
      /* fall through */
    }
  }
  const clean = trimmed.replace(/\s+/g, " ");
  return clean.length > maxLength ? clean.slice(0, maxLength) + "…" : clean;
}

interface ArcBucket {
  key: string;
  name: string;
  color: string;
  courses: Course[];
  totalWeeks: number;
}

function buildArcs(courses: Course[]): ArcBucket[] {
  const map = new Map<string, Course[]>();
  for (const c of courses) {
    const key = c.content?.arc?.trim() || "Open Paths";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return [...map.entries()].map(([name, list], i) => {
    const sorted = [...list].sort((a, b) => {
      const ap = a.content?.arc_position ?? 99;
      const bp = b.content?.arc_position ?? 99;
      if (ap !== bp) return ap - bp;
      return a.title.localeCompare(b.title);
    });
    const totalWeeks = sorted.reduce((s, c) => s + (c.duration_weeks ?? 0), 0);
    return {
      key: name,
      name,
      color: ARC_PALETTE[i % ARC_PALETTE.length],
      courses: sorted,
      totalWeeks,
    };
  });
}

type LengthBucket = "all" | "short" | "mid" | "long";
function inLengthBucket(weeks: number | null, bucket: LengthBucket): boolean {
  if (bucket === "all") return true;
  const w = weeks ?? 0;
  if (bucket === "short") return w > 0 && w <= 6;
  if (bucket === "mid") return w >= 7 && w <= 9;
  if (bucket === "long") return w >= 10;
  return true;
}

function courseStatus(
  course: Course,
  enrollment: Enrollment | undefined
): {
  state: "done" | "current" | "enter";
  pct: number;
  label: string;
} {
  const total = course.duration_weeks || 8;
  if (!enrollment) return { state: "enter", pct: 0, label: "Not started" };
  const week = enrollment.current_week || 1;
  const pct = Math.min(100, Math.round((week / total) * 100));
  const progress = enrollment.progress ?? {};
  const completed =
    progress.completed === true ||
    progress.status === "completed" ||
    week >= total;
  if (completed) return { state: "done", pct: 100, label: "Completed" };
  return { state: "current", pct, label: `Week ${week} of ${total}` };
}

// ─── Book cover stack (used by both concepts) ────────────────────────────────

const COURSE_COVER_THEMES = [
  {
    shell: "from-amber-950 via-amber-800 to-zinc-950",
    line: "border-amber-200/35",
    accent: "text-amber-100/80",
  },
  {
    shell: "from-cyan-950 via-cyan-800 to-zinc-950",
    line: "border-cyan-100/30",
    accent: "text-cyan-100/80",
  },
  {
    shell: "from-rose-950 via-rose-800 to-zinc-950",
    line: "border-rose-100/30",
    accent: "text-rose-100/80",
  },
  {
    shell: "from-emerald-950 via-emerald-800 to-zinc-950",
    line: "border-emerald-100/30",
    accent: "text-emerald-100/80",
  },
] as const;

function CourseCover({
  text,
  index,
  sizes,
}: {
  text: Text | null;
  index: number;
  sizes: string;
}) {
  if (text?.cover_image_url) {
    return (
      <Image
        src={text.cover_image_url}
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
      />
    );
  }

  const theme = COURSE_COVER_THEMES[index % COURSE_COVER_THEMES.length];

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${theme.shell} text-white`}
    >
      <div className={`absolute inset-[10%] border ${theme.line}`} />
      <div
        className={`absolute inset-x-[18%] top-[18%] border-t ${theme.line}`}
      />
      <div className="relative flex h-full flex-col items-center justify-center px-[12%] text-center">
        <BookOpen
          className={`mb-[10%] h-[18%] w-[18%] ${theme.accent}`}
          aria-hidden="true"
        />
        <span className="line-clamp-4 font-serif text-[clamp(0.38rem,10cqw,1rem)] leading-tight font-semibold text-balance">
          {text?.title ?? "Course reading"}
        </span>
      </div>
    </div>
  );
}

function CoverStack({
  texts,
  compact = false,
}: {
  texts?: CourseText[];
  compact?: boolean;
}) {
  const limit = compact ? 4 : 6;
  if (!texts || texts.length === 0) return null;

  // Lead with available artwork so real covers never disappear behind the
  // overflow count, while retaining source order within each group.
  const ordered = texts
    .map((courseText, index) => ({ courseText, index }))
    .sort((a, b) => {
      const aHasCover = Boolean(a.courseText.texts?.cover_image_url);
      const bHasCover = Boolean(b.courseText.texts?.cover_image_url);
      return Number(bHasCover) - Number(aHasCover) || a.index - b.index;
    });
  const visible = ordered.slice(0, limit);
  const hiddenCount = Math.max(0, texts.length - visible.length);

  return (
    <div className="min-w-0">
      <span className="sr-only">
        {texts.length} course reading{texts.length === 1 ? "" : "s"}
      </span>
      <div className="flex items-end gap-1 sm:gap-1.5" aria-hidden="true">
        {visible.map(({ courseText: ct }, idx) => (
          <div
            key={ct.id}
            className="group/book relative"
            title={ct.texts?.title}
          >
            <div
              className={`[container-type:inline-size] relative ${compact ? "h-12 w-8 sm:h-[54px] sm:w-9" : "h-[66px] w-11"} overflow-hidden rounded-[3px] border border-white/15 bg-zinc-800 shadow-md transition duration-200 ease-out group-hover/book:-translate-y-1.5 group-hover/book:scale-105 group-hover/book:border-amber-200/50 group-hover/book:shadow-[0_12px_28px_-10px_rgba(245,158,11,0.55)] motion-reduce:transform-none motion-reduce:transition-none`}
            >
              <CourseCover
                text={ct.texts}
                index={idx}
                sizes={compact ? "(max-width: 639px) 32px, 36px" : "44px"}
              />
            </div>

            <div
              className={`pointer-events-none absolute bottom-[calc(100%+0.75rem)] z-40 hidden w-40 translate-y-2 rounded-xl border border-amber-300/25 bg-zinc-950/98 p-2.5 text-left opacity-0 shadow-[0_24px_70px_-18px_rgba(245,158,11,0.55)] backdrop-blur-xl transition duration-200 group-hover/book:translate-y-0 group-hover/book:opacity-100 motion-reduce:transform-none motion-reduce:transition-none md:block ${idx < 2 ? "left-0" : "right-0"}`}
            >
              <div className="[container-type:inline-size] relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                <CourseCover text={ct.texts} index={idx} sizes="160px" />
              </div>
              <p className="mt-2.5 line-clamp-2 text-sm leading-snug font-semibold text-zinc-100">
                {ct.texts?.title ?? "Course reading"}
              </p>
              {ct.texts?.author ? (
                <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                  {ct.texts.author}
                </p>
              ) : null}
            </div>
          </div>
        ))}

        {hiddenCount > 0 && (
          <div
            className={`${compact ? "h-12 w-7 text-[10px] sm:h-[54px] sm:w-8 sm:text-[11px]" : "h-[66px] w-10 text-xs"} flex flex-col items-center justify-center rounded-[3px] border border-dashed border-white/15 bg-zinc-900/80 font-mono text-zinc-400 shadow-md`}
            title={`${hiddenCount} more reading${hiddenCount === 1 ? "" : "s"}`}
          >
            <BookOpen
              className="mb-1 h-3 w-3 text-zinc-500"
              aria-hidden="true"
            />
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONCEPT A · Arc Spine View ───────────────────────────────────────────────

function ArcSpineView({
  arcs,
  activeArcKey,
  setActiveArcKey,
  enrollmentMap,
}: {
  arcs: ArcBucket[];
  activeArcKey: string | null;
  setActiveArcKey: (k: string) => void;
  enrollmentMap: Record<string, Enrollment>;
}) {
  const activeArc = arcs.find((a) => a.key === activeArcKey) ?? arcs[0];

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[220px_1fr]">
      {/* Left rail */}
      <aside className="lg:sticky lg:top-4">
        <p className="mb-4 font-mono text-xs tracking-[0.22em] text-zinc-500 uppercase">
          Course arcs
        </p>
        <div className="flex flex-col gap-2">
          {arcs.map((arc) => {
            const active = arc.key === activeArc?.key;
            return (
              <button
                key={arc.key}
                type="button"
                onClick={() => setActiveArcKey(arc.key)}
                className={`flex items-center gap-3 rounded-[10px] border px-3.5 py-3 text-left transition-all ${
                  active
                    ? "border-cyan-500/55 bg-cyan-500/[0.06] shadow-[inset_0_0_24px_rgba(34,211,238,0.08)]"
                    : "border-white/6 bg-zinc-900/40 hover:border-white/10"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{
                    background: arc.color,
                    boxShadow: `0 0 8px ${arc.color}`,
                  }}
                />
                <span className="flex-1 font-serif text-[17px] leading-tight text-zinc-100">
                  {arc.name}
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  {arc.courses.length}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Arc stage */}
      <section className="relative pl-7">
        {/* spine */}
        <div
          className="absolute top-3.5 bottom-0 left-2 w-px"
          style={{
            background:
              "linear-gradient(180deg, #22D3EE 0%, rgba(34,211,238,0.25) 30%, rgba(180,143,74,0.25) 70%, transparent 100%)",
          }}
        >
          <span
            className="absolute -top-[2px] -left-[3px] h-[7px] w-[7px] rounded-full"
            style={{ background: "#22D3EE", boxShadow: "0 0 12px #22D3EE" }}
          />
        </div>

        {/* arc header */}
        {activeArc && (
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-white/6 pb-4">
            <div>
              <h3 className="m-0 font-serif text-3xl text-zinc-100 italic">
                {activeArc.name}
              </h3>
              {activeArc.courses[0]?.content?.core_question && (
                <p className="mt-2 font-serif text-lg leading-relaxed text-amber-400 italic">
                  {activeArc.courses[0].content.core_question}
                </p>
              )}
            </div>
            <div className="font-mono text-xs tracking-[0.2em] text-zinc-400 uppercase">
              <b className="font-medium text-amber-400">
                {activeArc.courses.length} courses
              </b>
              {activeArc.totalWeeks > 0 && (
                <> · ~{activeArc.totalWeeks} weeks</>
              )}
            </div>
          </div>
        )}

        {/* course rows */}
        <div>
          {activeArc?.courses.map((course, idx) => (
            <ArcCourseRow
              key={course.id}
              course={course}
              positionLabel={String(
                course.content?.arc_position ?? idx + 1
              ).padStart(2, "0")}
              enrollment={enrollmentMap[course.id]}
              arcColor={activeArc.color}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ArcCourseRow({
  course,
  positionLabel,
  enrollment,
  arcColor,
}: {
  course: Course;
  positionLabel: string;
  enrollment?: Enrollment;
  arcColor: string;
}) {
  const tag = course.content?.course_id_tag;
  const coreQuestion = getCoreQuestion(course, 220);
  const tensionsCount = course.content?.key_tensions?.length ?? 0;
  const status = courseStatus(course, enrollment);
  const releaseStatus = getCourseReleaseStatus(course);
  const isOpen = isCourseAvailable(releaseStatus);
  const introductionCourse = isIntroductionCourse(course);

  const levelDotColor =
    course.level === "advanced"
      ? "#B03AFF"
      : course.level === "intermediate"
        ? "#22D3EE"
        : "#B48F4A";

  const href =
    isOpen && enrollment
      ? `/courses/${course.slug}/learn`
      : `/courses/${course.slug}`;

  const rowContent = (
    <>
      {/* spine dot */}
      <span
        className="absolute top-6 -left-[24px] h-[14px] w-[14px] rounded-full border-[2px] bg-zinc-950"
        style={{
          borderColor:
            status.state === "done"
              ? "#C5A05B"
              : status.state === "current"
                ? "#B48F4A"
                : "#52525B",
          background: status.state === "current" ? "#B48F4A" : "#0A1212",
          boxShadow:
            status.state === "current"
              ? "0 0 16px rgba(180,143,74,0.45)"
              : "none",
        }}
      />

      <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[72px_1fr_240px] md:gap-6">
        <div className="font-display text-[28px] leading-none font-semibold text-amber-500/70 md:text-[34px]">
          {positionLabel}
        </div>

        <div>
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            {tag && (
              <span className="inline-flex items-center rounded-[3px] border border-amber-500/25 bg-amber-500/[0.06] px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-amber-300 uppercase">
                {tag}
              </span>
            )}
            <CourseReleaseBadge status={releaseStatus} />
            {introductionCourse && (
              <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-300 uppercase">
                Introduction
              </span>
            )}
          </div>
          <h4 className="m-0 font-sans text-xl leading-snug font-semibold text-zinc-100 transition-colors group-hover:text-amber-100">
            {course.title}
          </h4>

          {coreQuestion && (
            <p className="mt-2 font-serif text-base leading-relaxed text-zinc-300 italic">
              “{coreQuestion}”
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs tracking-wider text-zinc-400 uppercase">
            {course.level && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: levelDotColor }}
                />
                {course.level}
              </span>
            )}
            {course.duration_weeks && (
              <span>{course.duration_weeks} weeks</span>
            )}
            {course.course_texts && course.course_texts.length > 0 && (
              <span>
                {course.course_texts.length} text
                {course.course_texts.length !== 1 ? "s" : ""}
              </span>
            )}
            {tensionsCount > 0 && <span>↔ {tensionsCount} key tensions</span>}
          </div>

          {isOpen && status.state === "current" ? (
            <div className="mt-2 h-[2px] overflow-hidden rounded-[2px] bg-white/6">
              <div
                className="h-full rounded-[2px]"
                style={{
                  width: `${status.pct}%`,
                  background: "linear-gradient(90deg, #B48F4A, #C5A05B)",
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="text-left md:text-right">
          <div className="mb-2 flex md:justify-end">
            <CoverStack texts={course.course_texts} compact />
          </div>
          {isOpen ? (
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.18em] uppercase ${
                status.state === "done"
                  ? "text-amber-400"
                  : status.state === "current"
                    ? "text-cyan-400"
                    : "text-cyan-500 group-hover:text-cyan-300"
              }`}
            >
              {status.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Public preview
            </span>
          )}
        </div>
      </div>

      {/* faint hover wash tinted by arc color */}
      <span
        className="pointer-events-none absolute inset-x-0 -inset-y-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, ${arcColor}10, transparent 60%)`,
        }}
      />
    </>
  );

  const rowClassName =
    "group relative block w-full cursor-pointer border-b border-white/6 py-[18px] pb-[22px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-inset";

  return (
    <Link href={href} className={rowClassName}>
      {rowContent}
    </Link>
  );
}

// ─── CONCEPT C · Constellation Map View ──────────────────────────────────────
// Real curriculum data, not seed/mock nodes: bands come from each course's
// `content.arc`, position within a band from `content.arc_position`, and
// edges from each course's own `content.completion_pathways` codes. The
// Hero's Journey Taster is excluded — per Mission Control's live-course audit
// (2026-07-29), it is retired from the future learner pathway even though its
// app record stays live until a separately approved migration.

const ARC_BAND_ORDER = [
  "Standalone Entry Point",
  DEFAULT_ARC_NAME,
  "Foundational Synthesis",
  "Traditions Across Time",
  "Esoteric Practice",
  "Visual & Mathematical Imagination",
  "The Practical Arts",
  "Convergence & Modern Application",
];

const MAP_WIDTH = 760;
const MAP_BAND_HEIGHT = 84;
const MAP_TOP_MARGIN = 50;

interface ConstellationNode {
  slug: string;
  tag: string;
  title: string;
  coreQuestion: string | null;
  arc: string;
  color: string;
  x: number;
  y: number;
}

interface ConstellationEdge {
  a: string;
  b: string;
}

interface ConstellationBand {
  name: string;
  color: string;
  y: number;
}

function buildConstellation(courses: Course[]): {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  bands: ConstellationBand[];
  outgoingBySlug: Map<string, string[]>;
  height: number;
} {
  const included = courses.filter(
    (c) => isMainCourse(c) || isIntroductionCourse(c)
  );

  const byArc = new Map<string, Course[]>();
  for (const c of included) {
    const arc = c.content?.arc?.trim() || "Open Paths";
    if (!byArc.has(arc)) byArc.set(arc, []);
    byArc.get(arc)!.push(c);
  }

  const orderedArcNames = [...byArc.keys()].sort((a, b) => {
    const ai = ARC_BAND_ORDER.indexOf(a);
    const bi = ARC_BAND_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const bands: ConstellationBand[] = orderedArcNames.map((name, i) => ({
    name,
    color: ARC_PALETTE[i % ARC_PALETTE.length],
    y: MAP_TOP_MARGIN + i * MAP_BAND_HEIGHT,
  }));
  const bandByName = new Map(bands.map((b) => [b.name, b]));

  const nodes: ConstellationNode[] = [];
  const tagToSlug = new Map<string, string>();

  for (const arcName of orderedArcNames) {
    const band = bandByName.get(arcName)!;
    const list = [...byArc.get(arcName)!].sort((a, b) => {
      const ap = a.content?.arc_position ?? 99;
      const bp = b.content?.arc_position ?? 99;
      if (ap !== bp) return ap - bp;
      return a.title.localeCompare(b.title);
    });
    const step = (MAP_WIDTH - 100) / Math.max(list.length - 1, 1);
    list.forEach((c, i) => {
      const tag = (c.content?.course_id_tag || c.slug).toUpperCase();
      tagToSlug.set(tag, c.slug);
      nodes.push({
        slug: c.slug,
        tag,
        title: c.title,
        coreQuestion: getCoreQuestion(c, 130),
        arc: arcName,
        color: band.color,
        x: list.length === 1 ? MAP_WIDTH / 2 : 50 + i * step,
        y: band.y,
      });
    });
  }

  const edgeKeys = new Set<string>();
  const edges: ConstellationEdge[] = [];
  const outgoingSets = new Map<string, Set<string>>();
  for (const c of included) {
    const sourceTag = (c.content?.course_id_tag || c.slug).toUpperCase();
    const sourceSlug = tagToSlug.get(sourceTag);
    if (!sourceSlug) continue;
    for (const pathway of c.content?.completion_pathways ?? []) {
      const targetSlug = tagToSlug.get((pathway.code ?? "").toUpperCase());
      if (!targetSlug || targetSlug === sourceSlug) continue;
      if (!outgoingSets.has(sourceSlug)) outgoingSets.set(sourceSlug, new Set());
      outgoingSets.get(sourceSlug)!.add(targetSlug);
      const key = [sourceSlug, targetSlug].sort().join("|");
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ a: sourceSlug, b: targetSlug });
    }
  }

  const outgoingBySlug = new Map(
    [...outgoingSets].map(([slug, targets]) => [slug, [...targets]])
  );
  const height = MAP_TOP_MARGIN + bands.length * MAP_BAND_HEIGHT;
  return { nodes, edges, bands, outgoingBySlug, height };
}

function MapView({ courses }: { courses: Course[] }) {
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const { nodes, edges, bands, outgoingBySlug, height } = useMemo(
    () => buildConstellation(courses),
    [courses]
  );
  const nodeBySlug = useMemo(
    () => new Map(nodes.map((n) => [n.slug, n])),
    [nodes]
  );

  const degree = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of edges) {
      m.set(e.a, (m.get(e.a) ?? 0) + 1);
      m.set(e.b, (m.get(e.b) ?? 0) + 1);
    }
    return m;
  }, [edges]);

  const radius = (slug: string) => 8 + Math.min(degree.get(slug) ?? 0, 6) * 2;

  const edgePath = (aSlug: string, bSlug: string) => {
    const pa = nodeBySlug.get(aSlug);
    const pb = nodeBySlug.get(bSlug);
    if (!pa || !pb) return "";
    const dy = pb.y - pa.y;
    const dx = pb.x - pa.x;
    if (Math.abs(dy) < 20) {
      const mx = (pa.x + pb.x) / 2;
      const arch = pa.y - Math.max(24, Math.abs(dx) * 0.18);
      return `M${pa.x},${pa.y} Q${mx},${arch} ${pb.x},${pb.y}`;
    }
    const cp1x = pa.x + dx * 0.15;
    const cp1y = pa.y + dy * 0.5;
    const cp2x = pb.x - dx * 0.15;
    const cp2y = pb.y - dy * 0.5;
    return `M${pa.x},${pa.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${pb.x},${pb.y}`;
  };

  const connected = useMemo(() => {
    if (!hoverSlug) return new Set<string>();
    const s = new Set<string>();
    for (const e of edges) {
      if (e.a === hoverSlug) s.add(e.b);
      if (e.b === hoverSlug) s.add(e.a);
    }
    return s;
  }, [hoverSlug, edges]);

  const hoverNode = hoverSlug ? (nodeBySlug.get(hoverSlug) ?? null) : null;
  const hoverLinks = hoverNode
    ? (outgoingBySlug.get(hoverNode.slug) ?? [])
        .map((slug) => nodeBySlug.get(slug))
        .filter((n): n is ConstellationNode => !!n)
        .sort((a, b) => a.title.localeCompare(b.title))
    : [];

  if (nodes.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-zinc-950/40">
      {/* Legend bar */}
      <div className="flex flex-wrap items-center gap-4 border-b border-white/6 px-6 py-4">
        <span className="font-mono text-xs tracking-[0.2em] text-zinc-400 uppercase">
          Arc
        </span>
        {bands.map((band) => (
          <span
            key={band.name}
            className="inline-flex items-center gap-2 font-mono text-xs text-zinc-300"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: band.color,
                boxShadow: `0 0 6px ${band.color}`,
              }}
            />
            {band.name}
          </span>
        ))}
        <span className="ml-2 font-mono text-xs tracking-[0.2em] text-zinc-400 uppercase">
          Size
        </span>
        <span className="inline-flex items-center gap-2 font-mono text-xs text-zinc-300">
          <span className="h-2 w-2 rounded-full bg-zinc-500" /> fewer pathways
          <span className="ml-1.5 h-3.5 w-3.5 rounded-full bg-zinc-500" /> more
          pathways
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Graph */}
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Constellation map of course pathways"
        >
          {bands.map((band) => (
            <text
              key={band.name}
              x={12}
              y={band.y - 22}
              className="fill-zinc-600"
              style={{
                fontSize: 9,
                fontFamily: "monospace",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {band.name}
            </text>
          ))}

          {edges.map(({ a, b }) => {
            const dim = hoverSlug && a !== hoverSlug && b !== hoverSlug;
            const lit = hoverSlug && (a === hoverSlug || b === hoverSlug);
            return (
              <path
                key={`${a}-${b}`}
                d={edgePath(a, b)}
                fill="none"
                stroke={
                  lit
                    ? (nodeBySlug.get(hoverSlug!)?.color ?? "#52525B")
                    : "#3F3F46"
                }
                strokeWidth={lit ? 1.6 : 1}
                opacity={dim ? 0.08 : lit ? 0.85 : 0.35}
              />
            );
          })}

          {nodes.map((n) => {
            const isHover = n.slug === hoverSlug;
            const isConnected = connected.has(n.slug);
            const dim = hoverSlug && !isHover && !isConnected;
            return (
              <g
                key={n.slug}
                transform={`translate(${n.x}, ${n.y})`}
                onMouseEnter={() => setHoverSlug(n.slug)}
                onMouseLeave={() => setHoverSlug(null)}
                style={{ cursor: "pointer", opacity: dim ? 0.25 : 1 }}
              >
                <Link href={`/courses/${n.slug}`} aria-label={n.title}>
                  <circle
                    r={radius(n.slug)}
                    fill={isHover || isConnected ? n.color : "#18181B"}
                    stroke={n.color}
                    strokeWidth={isHover ? 2 : 1.25}
                    style={{
                      filter: isHover
                        ? `drop-shadow(0 0 6px ${n.color})`
                        : undefined,
                    }}
                  />
                  <text
                    y={radius(n.slug) + 12}
                    textAnchor="middle"
                    className="fill-zinc-400"
                    style={{ fontSize: 8, fontFamily: "monospace" }}
                  >
                    {n.tag}
                  </text>
                </Link>
              </g>
            );
          })}
        </svg>

        {/* Detail panel */}
        <div className="border-t border-white/6 p-5 lg:border-t-0 lg:border-l">
          {hoverNode ? (
            <div>
              <p
                className="font-mono text-[10px] tracking-[0.2em] uppercase"
                style={{ color: hoverNode.color }}
              >
                {hoverNode.arc}
              </p>
              <h4 className="mt-1.5 font-serif text-xl text-zinc-100">
                {hoverNode.title}
              </h4>
              {hoverNode.coreQuestion && (
                <p className="mt-2 font-serif text-sm leading-relaxed text-amber-400/90 italic">
                  {hoverNode.coreQuestion}
                </p>
              )}
              {hoverLinks.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
                    Next doorways
                  </p>
                  <ul className="space-y-1.5">
                    {hoverLinks.map((n) => (
                      <li key={n.slug}>
                        <Link
                          href={`/courses/${n.slug}`}
                          className="text-sm text-zinc-300 transition-colors hover:text-cyan-300"
                        >
                          {n.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-zinc-500">
              Hover or focus a node to see the doorways recommended from that
              course.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CONCEPT B · Catalog View ─────────────────────────────────────────────────

function CatalogView({
  courses,
  arcs,
  enrollmentMap,
  filterArc,
  setFilterArc,
  filterLevel,
  setFilterLevel,
  filterLength,
  setFilterLength,
  filterLens,
  setFilterLens,
  clearFilters,
}: {
  courses: Course[];
  arcs: ArcBucket[];
  enrollmentMap: Record<string, Enrollment>;
  filterArc: string;
  setFilterArc: (v: string) => void;
  filterLevel: string;
  setFilterLevel: (v: string) => void;
  filterLength: LengthBucket;
  setFilterLength: (v: LengthBucket) => void;
  filterLens: number | null;
  setFilterLens: (v: number | null) => void;
  clearFilters: () => void;
}) {
  // Precompute lenses per course
  const courseLenses = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const c of courses) m.set(c.id, deriveLenses(c));
    return m;
  }, [courses]);

  const filtered = courses.filter((c) => {
    if (
      filterArc !== "all" &&
      (c.content?.arc?.trim() ?? "Open Paths") !== filterArc
    )
      return false;
    if (filterLevel !== "all" && c.level !== filterLevel) return false;
    if (!inLengthBucket(c.duration_weeks, filterLength)) return false;
    if (
      filterLens !== null &&
      !(courseLenses.get(c.id) ?? []).includes(filterLens)
    )
      return false;
    return true;
  });

  // Levels with counts for chips
  const levelCount = (lvl: string) =>
    lvl === "all"
      ? courses.length
      : courses.filter((c) => c.level === lvl).length;

  // Per-lens counts
  const lensCount = (idx: number) =>
    courses.filter((c) => (courseLenses.get(c.id) ?? []).includes(idx)).length;

  return (
    <div>
      {/* Lens filter rail */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <span className="mr-2 font-mono text-xs tracking-[0.26em] text-zinc-400 uppercase">
          Lens
        </span>
        <button
          type="button"
          onClick={() => setFilterLens(null)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs tracking-[0.16em] uppercase transition-colors ${
            filterLens === null
              ? "border-white/25 bg-white/8 text-zinc-100"
              : "border-white/6 bg-zinc-900/30 text-zinc-400 hover:border-white/15"
          }`}
        >
          All{" "}
          <span className="ml-1 text-xs text-zinc-500">{courses.length}</span>
        </button>
        {LENS_DEFS.map((lens, i) => {
          const active = filterLens === i;
          const ct = lensCount(i);
          return (
            <button
              key={lens.key}
              type="button"
              onClick={() => setFilterLens(active ? null : i)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs tracking-[0.16em] uppercase transition-colors`}
              style={
                active
                  ? {
                      background: `${lens.color}18`,
                      borderColor: `${lens.color}66`,
                      color: lens.color,
                    }
                  : {
                      background: "rgba(13,20,37,0.3)",
                      borderColor: "rgba(255,255,255,0.06)",
                      color: "#a1a1aa",
                    }
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: lens.color,
                  boxShadow: `0 0 6px ${lens.color}`,
                }}
              />
              {lens.label}
              <span className="ml-1 text-xs" style={{ opacity: 0.7 }}>
                {ct}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chip rails */}
      <div className="mb-7 flex flex-wrap items-center gap-2 border-b border-white/6 pb-4">
        <span className="mr-2 font-mono text-xs tracking-[0.26em] text-zinc-400 uppercase">
          Arc
        </span>
        <Chip active={filterArc === "all"} onClick={() => setFilterArc("all")}>
          All <Count>{courses.length}</Count>
        </Chip>
        {arcs.map((arc) => (
          <Chip
            key={arc.key}
            active={filterArc === arc.key}
            onClick={() => setFilterArc(arc.key)}
            dotColor={arc.color}
          >
            {arc.name} <Count>{arc.courses.length}</Count>
          </Chip>
        ))}

        <ChipSep />

        <span className="mr-2 font-mono text-xs tracking-[0.26em] text-zinc-400 uppercase">
          Level
        </span>
        {(["all", "foundational", "intermediate", "advanced"] as const).map(
          (lvl) => (
            <Chip
              key={lvl}
              active={filterLevel === lvl}
              onClick={() => setFilterLevel(lvl)}
            >
              {lvl === "all" ? "All" : lvl} <Count>{levelCount(lvl)}</Count>
            </Chip>
          )
        )}

        <ChipSep />

        <span className="mr-2 font-mono text-xs tracking-[0.26em] text-zinc-400 uppercase">
          Length
        </span>
        <Chip
          active={filterLength === "all"}
          onClick={() => setFilterLength("all")}
        >
          Any
        </Chip>
        <Chip
          active={filterLength === "short"}
          onClick={() => setFilterLength("short")}
        >
          ≤ 6 wks
        </Chip>
        <Chip
          active={filterLength === "mid"}
          onClick={() => setFilterLength("mid")}
        >
          8 wks
        </Chip>
        <Chip
          active={filterLength === "long"}
          onClick={() => setFilterLength("long")}
        >
          10+
        </Chip>

        <button
          type="button"
          onClick={clearFilters}
          className="ml-auto px-3 py-2 font-mono text-xs tracking-[0.18em] text-zinc-500 uppercase transition-colors hover:text-amber-400"
        >
          Clear all
        </button>
      </div>

      {/* Catalog grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900/10 py-20 text-center">
          <div className="mb-3 font-mono text-5xl text-zinc-800">∅</div>
          <p className="font-mono text-base tracking-wide text-zinc-500 uppercase">
            No courses match your filters
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const arc = arcs.find(
              (a) => a.key === (course.content?.arc?.trim() ?? "Open Paths")
            );
            return (
              <CatalogCard
                key={course.id}
                course={course}
                enrollment={enrollmentMap[course.id]}
                arcColor={arc?.color}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  dotColor,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  dotColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs tracking-[0.16em] uppercase transition-colors ${
        active
          ? "border-amber-500/40 bg-amber-500/[0.08] text-amber-400"
          : "border-white/6 bg-zinc-900/30 text-zinc-400 hover:border-white/15"
      }`}
    >
      {dotColor && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
        />
      )}
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 text-xs text-zinc-500">{children}</span>;
}

function ChipSep() {
  return <span className="mx-2.5 h-5 w-px bg-white/8" aria-hidden />;
}

function ReleaseSpotlight({
  course,
  enrollment,
}: {
  course: Course;
  enrollment?: Enrollment;
}) {
  const tag = course.content?.course_id_tag;
  const arc = course.content?.arc;
  const arcPos = course.content?.arc_position;
  const coreQuestion = getCoreQuestion(course, 260);
  const status = courseStatus(course, enrollment);
  const releaseStatus = getCourseReleaseStatus(course);
  const isOpen = isCourseAvailable(releaseStatus);
  const supportingLine =
    "This is the question I’m personally working through right now — follow along, or move at your own pace.";
  const primaryAction =
    status.state === "current"
      ? "Continue this path"
      : isOpen
        ? "See this path"
        : "Preview this path";

  return (
    <article
      className="relative mb-2 grid gap-7 overflow-hidden rounded-2xl border border-cyan-500/30 p-7 md:grid-cols-[1.4fr_1fr]"
      style={{
        background:
          "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(13,20,37,0.6) 60%, rgba(180,143,74,0.04))",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 80% 0%, rgba(34,211,238,0.12), transparent 50%)",
        }}
      />
      <div className="relative">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          {tag && (
            <span className="inline-flex items-center rounded-[3px] border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-1 font-mono text-[10px] tracking-[0.2em] text-amber-300 uppercase">
              {tag}
            </span>
          )}
          <CourseReleaseBadge status={releaseStatus} />
          {isIntroductionCourse(course) && (
            <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-400 uppercase">
              Introduction
            </span>
          )}
        </div>
        <h3 className="font-display m-0 mb-3 text-[30px] leading-tight font-semibold text-zinc-100">
          {course.title}
        </h3>
        {coreQuestion && (
          <p className="m-0 mb-4 max-w-[480px] font-serif text-[17px] leading-relaxed text-amber-400 italic">
            “{coreQuestion}”
          </p>
        )}
        <p className="mb-5 max-w-[520px] text-sm leading-relaxed text-zinc-300">
          {supportingLine}
        </p>
        <div className="mb-6 flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-wider text-zinc-500 uppercase">
          {arc && (
            <span>
              Arc ·{" "}
              <b className="font-medium text-zinc-100">
                {arc}
                {arcPos ? ` · ${String(arcPos).padStart(2, "0")}` : ""}
              </b>
            </span>
          )}
          {course.duration_weeks && (
            <>
              <span>·</span>
              <span>{course.duration_weeks} weeks</span>
            </>
          )}
          {course.course_texts && course.course_texts.length > 0 && (
            <>
              <span>·</span>
              <span>
                {course.course_texts.length} core text
                {course.course_texts.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isOpen ? (
            <>
              <Link
                href={
                  enrollment
                    ? `/courses/${course.slug}/learn`
                    : `/courses/${course.slug}`
                }
                className="inline-flex min-h-11 items-center gap-2.5 rounded-md border border-cyan-500 bg-cyan-500/10 px-5 py-3 font-mono text-[12px] tracking-[0.18em] text-cyan-400 uppercase transition-all hover:bg-cyan-500/15 hover:shadow-[0_0_24px_rgba(34,211,238,0.18)] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
              >
                {primaryAction} →
              </Link>
              {course.content?.curator_note_public ? (
                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex items-center gap-2 rounded-md border border-white/8 px-4 py-2.5 font-mono text-[11px] tracking-[0.18em] text-zinc-400 uppercase transition-colors hover:border-white/20 hover:text-zinc-100"
                >
                  Why I chose this path
                </Link>
              ) : null}
            </>
          ) : (
            <Link
              href={`/courses/${course.slug}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/[0.06] px-4 py-2.5 font-mono text-[11px] tracking-[0.16em] text-cyan-300 uppercase transition-colors hover:border-cyan-400/70 hover:bg-cyan-500/10 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Public preview
            </Link>
          )}
        </div>
      </div>

      {/* Prism graphic */}
      <div className="relative hidden items-center justify-center md:flex">
        <svg viewBox="0 0 260 260" className="h-[260px] w-[260px]" fill="none">
          <g opacity="0.9">
            <polygon
              points="130,50 210,180 50,180"
              stroke="rgba(34,211,238,0.55)"
              strokeWidth="1"
              fill="rgba(34,211,238,0.04)"
            />
            <polygon
              points="130,50 210,180 50,180"
              stroke="rgba(34,211,238,0.2)"
              strokeWidth="1"
              fill="none"
              transform="translate(2,1)"
            />
          </g>
          <line
            x1="-10"
            y1="115"
            x2="130"
            y2="115"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.3"
            strokeDasharray="3 2"
          />
          <circle cx="-5" cy="115" r="2" fill="rgba(255,255,255,0.7)" />
          <line
            x1="130"
            y1="115"
            x2="260"
            y2="74"
            stroke="#FF3A5C"
            strokeWidth="1.3"
          />
          <line
            x1="130"
            y1="115"
            x2="260"
            y2="90"
            stroke="#FF8C2A"
            strokeWidth="1.3"
          />
          <line
            x1="130"
            y1="115"
            x2="260"
            y2="106"
            stroke="#F5D020"
            strokeWidth="1.3"
          />
          <line
            x1="130"
            y1="115"
            x2="260"
            y2="122"
            stroke="#2AFFA0"
            strokeWidth="1.3"
          />
          <line
            x1="130"
            y1="115"
            x2="260"
            y2="138"
            stroke="#20E0F5"
            strokeWidth="1.3"
          />
          <line
            x1="130"
            y1="115"
            x2="260"
            y2="154"
            stroke="#3A7FFF"
            strokeWidth="1.3"
          />
          <line
            x1="130"
            y1="115"
            x2="260"
            y2="170"
            stroke="#B03AFF"
            strokeWidth="1.3"
          />
          <circle cx="258" cy="74" r="2" fill="#FF3A5C" />
          <circle cx="258" cy="90" r="2" fill="#FF8C2A" />
          <circle cx="258" cy="106" r="2" fill="#F5D020" />
          <circle cx="258" cy="122" r="2" fill="#2AFFA0" />
          <circle cx="258" cy="138" r="2" fill="#20E0F5" />
          <circle cx="258" cy="154" r="2" fill="#3A7FFF" />
          <circle cx="258" cy="170" r="2" fill="#B03AFF" />
        </svg>
      </div>
    </article>
  );
}

function CatalogCard({
  course,
  enrollment,
  arcColor,
}: {
  course: Course;
  enrollment?: Enrollment;
  arcColor?: string;
}) {
  const arc = course.content?.arc;
  const arcPos = course.content?.arc_position;
  const tag = course.content?.course_id_tag;
  const coreQuestion = getCoreQuestion(course, 180);
  const status = courseStatus(course, enrollment);
  const releaseStatus = getCourseReleaseStatus(course);
  const isOpen = isCourseAvailable(releaseStatus);

  const pip = isIntroductionCourse(course)
    ? {
        label: "Introduction",
        cls: "text-amber-300 border-amber-400/30 bg-amber-500/[0.08]",
      }
    : course.level === "advanced"
      ? {
          label: "Advanced",
          cls: "text-violet-400 border-violet-500/30 bg-violet-500/[0.06]",
        }
      : course.level === "intermediate"
        ? {
            label: "Theme",
            cls: "text-cyan-400 border-cyan-500/25 bg-cyan-500/[0.06]",
          }
        : {
            label: "Foundational",
            cls: "text-amber-400 border-amber-500/25 bg-amber-500/[0.06]",
          };

  const href =
    isOpen && enrollment
      ? `/courses/${course.slug}/learn`
      : `/courses/${course.slug}`;

  const cardContent = (
    <>
      <span
        className={`absolute top-3.5 right-3.5 rounded-[3px] border px-2 py-1 font-mono text-xs tracking-[0.18em] uppercase ${pip.cls}`}
      >
        {pip.label}
      </span>

      <div className="mb-4 flex min-h-7 flex-wrap items-center gap-2 pr-28">
        {tag && (
          <span className="inline-flex items-center rounded-[3px] border border-amber-500/25 bg-amber-500/[0.06] px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-amber-300 uppercase">
            {tag}
          </span>
        )}
        <CourseReleaseBadge status={releaseStatus} />
      </div>

      <div className="mb-3 flex items-center gap-2.5 font-mono text-xs tracking-[0.22em] text-amber-500 uppercase">
        <span className="text-zinc-500">
          {arcPos ? String(arcPos).padStart(2, "0") : "—"}
        </span>
        <span>{arc ?? "Open Paths"}</span>
        <span
          className="h-px flex-1"
          style={{
            background: `linear-gradient(90deg, ${arcColor ?? "rgba(180,143,74,0.4)"}, transparent)`,
          }}
        />
      </div>

      <h3 className="font-display m-0 mb-3 text-[22px] leading-tight font-semibold text-zinc-100">
        {course.title}
      </h3>

      {coreQuestion && (
        <p className="m-0 mb-4 flex-grow font-serif text-base leading-relaxed text-amber-400/90 italic">
          “{coreQuestion}”
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-dashed border-white/8 pt-3.5">
        <CoverStack texts={course.course_texts} compact />
        <div className="flex items-center gap-3 font-mono text-xs tracking-[0.18em] text-zinc-400 uppercase">
          {!isOpen ? (
            <span className="inline-flex items-center gap-2 text-cyan-300">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Public preview
            </span>
          ) : status.state === "current" ? (
            <span className="flex items-center gap-2 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Week {enrollment?.current_week ?? 1} of{" "}
              {course.duration_weeks || 8}
            </span>
          ) : status.state === "done" ? (
            <span className="text-amber-400">Completed</span>
          ) : (
            <span>Not started</span>
          )}
        </div>
      </div>
    </>
  );

  const cardClassName =
    "relative flex min-h-[280px] cursor-pointer flex-col rounded-[14px] border border-white/6 bg-zinc-900/35 p-6 text-left transition-colors hover:border-amber-500/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70";

  return (
    <Link href={href} className={cardClassName}>
      {cardContent}
    </Link>
  );
}

function ReleaseOverview({
  courses,
  arcs,
  enrollmentMap,
}: {
  courses: Course[];
  arcs: ArcBucket[];
  enrollmentMap: Record<string, Enrollment>;
}) {
  const groups = groupCoursesByRelease(courses);
  const activeCourse = courses.find((course) => {
    const enrollment = enrollmentMap[course.id];
    return enrollment && courseStatus(course, enrollment).state === "current";
  });
  const getArcColor = (course: Course) =>
    arcs.find(
      (arc) => arc.key === (course.content?.arc?.trim() ?? "Open Paths")
    )?.color;

  return (
    <div className="space-y-12">
      {activeCourse ? (
        <section aria-labelledby="studying-together-now">
          <div className="mb-5">
            <h2
              id="studying-together-now"
              className="font-display text-2xl font-semibold tracking-tight text-zinc-100"
            >
              What I’m working through right now
            </h2>
          </div>
          <ReleaseSpotlight
            course={activeCourse}
            enrollment={enrollmentMap[activeCourse.id]}
          />
        </section>
      ) : null}

      <section aria-labelledby="open-paths">
        <div className="mb-5 max-w-2xl">
          <h2
            id="open-paths"
            className="font-display text-2xl font-semibold tracking-tight text-zinc-100"
          >
            Open paths
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            How to Hold Two Things at Once stays open as the introduction, and
            paths that have already opened stay in the collection.
          </p>
        </div>
        {groups.open.length > 0 ? (
          <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
            {groups.open.map((course) => (
              <CatalogCard
                key={course.id}
                course={course}
                enrollment={enrollmentMap[course.id]}
                arcColor={getArcColor(course)}
              />
            ))}
          </div>
        ) : (
          <ReleaseSlotPlaceholder>
            Open paths will appear here as the shared collection grows.
          </ReleaseSlotPlaceholder>
        )}
      </section>
    </div>
  );
}

function ReleaseSlotPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/20 px-5 py-6 text-sm leading-relaxed text-zinc-400">
      {children}
    </div>
  );
}

interface CoursesCatalogClientProps {
  initialCourses: Course[];
  initialTotals: PlatformTotals;
}

function CoursesPageContent({
  initialCourses,
  initialTotals,
}: CoursesCatalogClientProps) {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const courses = initialCourses;
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const totals = initialTotals;
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") ?? ""
  );

  // View toggle (default: arcs — first tab)
  const [viewMode, setViewMode] = useState<ViewMode>("arcs");

  // Concept A state
  const [activeArcKey, setActiveArcKey] = useState<string | null>(
    DEFAULT_ARC_NAME
  );

  // Concept B state
  const [filterArc, setFilterArc] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterLength, setFilterLength] = useState<LengthBucket>("all");
  const [filterLens, setFilterLens] = useState<number | null>(null);

  const enrollmentMap: Record<string, Enrollment> = useMemo(() => {
    const m: Record<string, Enrollment> = {};
    if (!user) return m;
    for (const ec of enrolledCourses) m[ec.id] = ec.enrollment;
    return m;
  }, [enrolledCourses, user]);

  // Fetch enrolled courses
  useEffect(() => {
    if (authLoading) return;

    if (!user) return;

    let cancelled = false;

    const fetchEnrolled = async () => {
      try {
        const res = await fetch("/api/courses/my-courses");
        const data = await res.json();
        if (!cancelled && data.success && data.courses) {
          setEnrolledCourses(
            data.courses.filter((c: EnrolledCourse) => c.enrollment)
          );
        }
      } catch (err) {
        console.error("Error fetching enrolled courses:", err);
      }
    };

    fetchEnrolled();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const visibleCourses = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return courses;

    return courses.filter((course) =>
      [
        course.title,
        course.description,
        course.premise,
        course.content?.core_question,
        course.content?.arc,
        course.content?.course_id_tag,
      ]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLocaleLowerCase().includes(query))
    );
  }, [courses, searchQuery]);

  // Build arc buckets from the already-loaded catalog. Search is entirely
  // local, so typing never starts another server request.
  const arcs = useMemo(() => buildArcs(visibleCourses), [visibleCourses]);

  // Fall back gracefully if Foundation Doors is absent from a filtered result.
  const resolvedActiveArcKey = useMemo(() => {
    if (arcs.some((arc) => arc.key === activeArcKey)) return activeArcKey;
    const enrolledArc = arcs.find((arc) =>
      arc.courses.some((course) => enrollmentMap[course.id])
    );
    return (enrolledArc ?? arcs[0])?.key ?? null;
  }, [activeArcKey, arcs, enrollmentMap]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 font-sans text-zinc-200">
      <Header />

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-15%] left-[-10%] h-[45%] w-[45%] rounded-full bg-amber-900/8 blur-[130px]" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-cyan-900/6 blur-[120px]" />
      </div>

      <main className="relative z-10 flex-1">
        {/* Course introduction */}
        <div className="border-b border-white/8 bg-zinc-900/20 backdrop-blur-md">
          <div className="mx-auto max-w-screen-2xl px-6 py-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl">
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-px w-8 bg-amber-500/40" />
                  <span className="font-mono text-xs tracking-widest text-amber-500/80 uppercase">
                    Courses
                  </span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Follow a question. See where it leads.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
                  Prismarium courses aren’t expert-led classes or finished
                  answers. They are questions we can read, compare, and think
                  through together.
                </p>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
                  How to Hold Two Things at Once is the recommended starting
                  point, never a requirement. Every published course keeps a
                  public preview, while starting the full path follows its
                  existing access policy.
                </p>
              </div>

              <div className="flex w-full flex-col items-start gap-2.5 sm:w-auto sm:items-end">
                {/* Search */}
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-amber-500/50" />
                  <input
                    type="text"
                    aria-label="Search courses"
                    placeholder="SEARCH_COURSES..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/8 bg-black/40 py-2.5 pr-4 pl-10 font-mono text-sm tracking-[0.16em] text-amber-400 placeholder-amber-500/25 transition-all focus:border-amber-500/40 focus:outline-none sm:w-80"
                  />
                </div>

                <PlatformTotalsLine
                  totals={totals}
                  className="font-mono text-xs tracking-[0.22em] text-zinc-300 uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-screen-2xl px-6 py-8">
          {visibleCourses.length > 0 && (
            <ReleaseOverview
              courses={visibleCourses}
              arcs={arcs}
              enrollmentMap={enrollmentMap}
            />
          )}

          {/* Switch between the two collection-browsing views. */}
          {visibleCourses.length > 0 && (
            <section
              aria-labelledby="course-collection"
              className="mt-16 border-t border-white/8 pt-10"
            >
              <div className="mb-7">
                <h2
                  id="course-collection"
                  className="font-display text-3xl font-semibold tracking-tight text-zinc-100"
                >
                  Explore every path
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  Browse the collection by course arc or scan the complete
                  catalog.
                </p>
              </div>

              <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <div
                  className="inline-flex max-w-full gap-[2px] overflow-x-auto rounded-lg border border-white/8 bg-black/40 p-[3px]"
                  aria-label="Course collection view"
                >
                  {(["arcs", "catalog"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setViewMode(m)}
                      aria-pressed={viewMode === m}
                      className={`min-h-11 rounded-[5px] px-5 py-3 font-mono text-sm tracking-[0.22em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:outline-none ${
                        viewMode === m
                          ? "bg-cyan-500/10 text-cyan-300"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <PlatformTotalsLine
                  totals={totals}
                  className="font-mono text-xs tracking-[0.22em] text-zinc-400 uppercase"
                />
              </div>
            </section>
          )}

          {/* Loading / Empty / View */}
          {visibleCourses.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-zinc-900/10 py-28 text-center">
              <div className="mb-4 font-mono text-4xl text-zinc-800">∅</div>
              <p className="font-mono text-sm tracking-wide text-zinc-600 uppercase">
                {searchQuery
                  ? "No courses match your query"
                  : "No courses available yet"}
              </p>
            </div>
          ) : viewMode === "arcs" ? (
            <ArcSpineView
              arcs={arcs}
              activeArcKey={resolvedActiveArcKey}
              setActiveArcKey={setActiveArcKey}
              enrollmentMap={enrollmentMap}
            />
          ) : (
            <CatalogView
              courses={visibleCourses}
              arcs={arcs}
              enrollmentMap={enrollmentMap}
              filterArc={filterArc}
              setFilterArc={setFilterArc}
              filterLevel={filterLevel}
              setFilterLevel={setFilterLevel}
              filterLength={filterLength}
              setFilterLength={setFilterLength}
              filterLens={filterLens}
              setFilterLens={setFilterLens}
              clearFilters={() => {
                setFilterArc("all");
                setFilterLevel("all");
                setFilterLength("all");
                setFilterLens(null);
              }}
            />
          )}

          {visibleCourses.length > 0 && (
            <section
              aria-labelledby="larger-map"
              className="mt-16 border-t border-white/8 pt-10"
            >
              <div className="mb-7">
                <h2
                  id="larger-map"
                  className="font-display text-3xl font-semibold tracking-tight text-zinc-100"
                >
                  The larger map
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  See how questions and possible pathways connect across the
                  full curriculum.
                </p>
              </div>
              <MapView courses={visibleCourses} />
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CoursesCatalogClient(props: CoursesCatalogClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-zinc-950">
          <Header />
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
          <Footer />
        </div>
      }
    >
      <CoursesPageContent {...props} />
    </Suspense>
  );
}
