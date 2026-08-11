"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Code2,
  Compass,
  ExternalLink,
  Feather,
  FlaskConical,
  Layers3,
  Lightbulb,
  Map,
  Maximize2,
  Menu,
  Quote,
  Search,
  ShieldCheck,
  Share2,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { CourseBookGallery } from "@/components/courses/CourseBookGallery";
import {
  buildCourseBookDisplay,
  type CourseBookMetadata,
} from "@/lib/courses/course-book-presentation";
import type {
  CompanionCard,
  CourseContent,
  CourseReading,
  CourseWeek,
  LearnerMarkdownSection,
} from "@/lib/parsers/course-markdown-parser";

export interface LearnerRenderableCourse {
  title: string;
  premise?: string | null;
  learning_outcomes?: string[] | null;
  content: CourseContent | null;
}

type JourneySelection = "overview" | number;
type WeekStage = "start" | "read" | "companions" | "practice" | "finish";
type WeekStageTab = {
  id: WeekStage;
  label: string;
  icon: typeof Compass;
  count?: number;
  countLabel?: string;
};
type ToolKind = "concept_search" | "seven_lenses" | "knowledge_graph";
type MarkdownPanel = { title: string; markdown: string };
type JourneyStop = {
  id: JourneySelection;
  eyebrow: string;
  label: string;
  icon: typeof Compass;
};

function learnerCaseWeekNumber(
  section: LearnerMarkdownSection
): number | undefined {
  const match = section.heading.match(/^Week\s+(\d+)\b/i);
  return match ? Number(match[1]) : undefined;
}

const TIER_LABELS = {
  keystone: {
    title: "Essential",
    time: "Start here",
    description: "The shortest path into the idea.",
  },
  passage: {
    title: "Explore",
    time: "Go deeper",
    description: "A fuller passage with more context.",
  },
  full: {
    title: "Full text",
    time: "Take your time",
    description: "The complete source or assigned work.",
  },
} as const;

const EMPTY_BOOK_METADATA: readonly CourseBookMetadata[] = [];

const KNOWN_COURSE_HEADINGS = new Set([
  "course metadata",
  "course premise",
  "curator's note",
  "curator note",
  "jack's curator note",
  "limits of this investigation",
  "scope and limits",
  "scope, context, and safety",
  "tone & safety note",
  "care note",
  "learning outcomes",
  "key tensions",
  "completion pathways",
  "how to use this course",
  "how the course works",
  "the six questions we will ask of a claim",
  "the five distinctions we will keep making",
  "reading guidance",
  "source/context notes",
]);

const TOOL_PRESENTATION: Record<
  ToolKind,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: typeof Search;
    accent: string;
    iconClass: string;
  }
> = {
  concept_search: {
    label: "Concept Search",
    shortLabel: "Search",
    description: "Trace one idea across different kinds of texts.",
    icon: Search,
    accent: "border-cyan-300/20 bg-cyan-300/[0.055]",
    iconClass: "bg-cyan-300 text-zinc-950",
  },
  seven_lenses: {
    label: "Seven Lenses",
    shortLabel: "Compare",
    description: "Test one question through distinct ways of knowing.",
    icon: Compass,
    accent: "border-violet-300/20 bg-violet-300/[0.055]",
    iconClass: "bg-violet-300 text-zinc-950",
  },
  knowledge_graph: {
    label: "Knowledge Graph",
    shortLabel: "Connect",
    description: "Inspect relationships without assuming what they prove.",
    icon: Share2,
    accent: "border-amber-300/20 bg-amber-300/[0.055]",
    iconClass: "bg-amber-300 text-zinc-950",
  },
};

function splitMarkdownPanels(
  markdown: string,
  headingLevel = 3
): {
  intro: string;
  panels: MarkdownPanel[];
} {
  const marker = "#".repeat(headingLevel);
  const regex = new RegExp(`^${marker}\\s+(.+)$`, "gm");
  const matches = [...markdown.matchAll(regex)];
  if (!matches.length) return { intro: markdown.trim(), panels: [] };
  return {
    intro: markdown.slice(0, matches[0].index).trim(),
    panels: matches.map((match, index) => ({
      title: match[1].trim(),
      markdown: markdown
        .slice(
          (match.index ?? 0) + match[0].length,
          matches[index + 1]?.index ?? markdown.length
        )
        .trim(),
    })),
  };
}

function parseToolPracticePanels(
  markdown: string,
  sectionHeading?: string
): {
  intro: string;
  panels: MarkdownPanel[];
} {
  const headingPanels = splitMarkdownPanels(markdown);
  if (headingPanels.panels.length) return headingPanels;

  const intro: string[] = [];
  const panels: MarkdownPanel[] = [];
  let current: MarkdownPanel | null = null;

  for (const line of markdown.split("\n")) {
    const option = line.match(
      /^[-*]\s+\*\*(Concept Search|Parallax(?:\s*\/\s*Seven Lenses)?|Seven Lenses|Knowledge Graph):\*\*\s*(.*)$/i
    );
    if (option) {
      if (current)
        panels.push({ ...current, markdown: current.markdown.trim() });
      current = { title: option[1].trim(), markdown: option[2].trim() };
      continue;
    }
    if (current) current.markdown += `${current.markdown ? "\n" : ""}${line}`;
    else intro.push(line);
  }
  if (current) panels.push({ ...current, markdown: current.markdown.trim() });
  if (!panels.length && sectionHeading) {
    const normalizedHeading = sectionHeading
      .replace(/\u2014|\u2013/g, "-")
      .replace(/^OPTIONAL PRODUCT PRACTICE\s*-\s*/i, "")
      .trim();
    if (/Concept Search|Parallax|Seven Lenses|Knowledge Graph/i.test(normalizedHeading)) {
      return {
        intro: "",
        panels: [{ title: normalizedHeading, markdown: markdown.trim() }],
      };
    }
  }
  return { intro: intro.join("\n").trim(), panels };
}

function parseNumberedExercise(markdown: string): {
  intro: string;
  panels: MarkdownPanel[];
} {
  const lines = markdown.split("\n");
  const panels: MarkdownPanel[] = [];
  const intro: string[] = [];
  let current: MarkdownPanel | null = null;

  for (const line of lines) {
    const step = line.match(/^(\d+)\.\s+(.+)$/);
    if (step) {
      if (current)
        panels.push({ ...current, markdown: current.markdown.trim() });
      const content = step[2].trim();
      const labeled = content.match(/^\*\*(.+?):\*\*\s*(.*)$/);
      current = {
        title: labeled?.[1]?.trim() || `Step ${step[1]}`,
        markdown: labeled ? labeled[2].trim() : content,
      };
      continue;
    }
    if (current) current.markdown += `${current.markdown ? "\n" : ""}${line}`;
    else intro.push(line);
  }
  if (current) panels.push({ ...current, markdown: current.markdown.trim() });
  return { intro: intro.join("\n").trim(), panels };
}

function identifyTool(title: string): ToolKind {
  if (/seven lenses|parallax/i.test(title)) return "seven_lenses";
  if (/knowledge graph/i.test(title)) return "knowledge_graph";
  return "concept_search";
}

function toolHref(
  kind: ToolKind,
  markdown: string,
  courseSlug?: string,
  weekNumber?: number
): string {
  if (kind === "seven_lenses") {
    const prompt = markdown.match(/^>\s*(.+)$/m)?.[1]?.trim();
    return prompt
      ? `/seven-lenses?query=${encodeURIComponent(prompt)}`
      : "/seven-lenses";
  }
  if (
    kind === "knowledge_graph" &&
    courseSlug ===
      "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning" &&
    weekNumber === 3
  ) {
    const params = new URLSearchParams({
      type: "course",
      course: courseSlug,
      view: "fd01-w03-pattern-test",
      focus: `lesson:${courseSlug}:w03`,
    });
    return `/graph?${params.toString()}`;
  }
  if (kind === "knowledge_graph") return "/graph";
  return "/search";
}

function Markdown({
  children,
  compact = false,
  size = "base",
}: {
  children?: string | null;
  compact?: boolean;
  size?: "base" | "lg";
}) {
  if (!children?.trim()) return null;
  const scale =
    size === "lg"
      ? "max-w-none text-lg leading-8 prose-p:my-4 prose-p:leading-8 prose-li:my-2 prose-li:leading-8 prose-headings:mt-6 prose-headings:mb-3 md:text-xl md:leading-9"
      : compact
        ? "max-w-[72ch] prose-p:my-2 prose-p:leading-6 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:leading-6 text-sm"
        : "max-w-[72ch] prose-p:leading-7 prose-li:my-1 prose-li:leading-7 text-base md:text-[1.0625rem]";
  return (
    <div
      className={[
        "prose prose-invert prose-zinc text-zinc-300",
        "prose-headings:font-semibold prose-headings:text-zinc-50",
        "prose-a:text-cyan-300 prose-a:no-underline hover:prose-a:text-cyan-200",
        "prose-strong:font-semibold prose-strong:text-zinc-100",
        "prose-blockquote:border-amber-400/50 prose-blockquote:text-zinc-300",
        scale,
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: label }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-baseline gap-1"
            >
              {label}
              <ExternalLink
                className="inline h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-xl border border-white/15">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/[0.06]">{children}</thead>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-white/10 last:border-b-0 even:bg-white/[0.02]">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border-r border-white/10 px-3 py-2 text-left font-semibold text-zinc-100 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-r border-white/10 px-3 py-2 align-top text-zinc-300 last:border-r-0">
              {children}
            </td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function Kicker({
  icon: Icon,
  children,
}: {
  icon: typeof Compass;
  children: ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-amber-300 uppercase">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </p>
  );
}

function Surface({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "amber" | "cyan" | "violet";
}) {
  const tones = {
    default: "border-white/10 bg-zinc-900/70",
    amber: "border-amber-300/20 bg-amber-300/[0.055]",
    cyan: "border-cyan-300/20 bg-cyan-300/[0.055]",
    violet: "border-violet-300/20 bg-violet-300/[0.055]",
  };
  return (
    <section
      className={`rounded-[1.75rem] border shadow-[0_24px_80px_rgba(0,0,0,0.22)] ${tones[tone]} ${className}`}
    >
      {children}
    </section>
  );
}

function Disclosure({
  title,
  children,
  icon: Icon = ChevronDown,
  defaultOpen = false,
  onExpand,
}: {
  title: string;
  children: ReactNode;
  icon?: typeof ChevronDown;
  defaultOpen?: boolean;
  onExpand?: () => void;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-white/10 bg-black/20 transition-colors open:border-white/15 open:bg-black/30"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left font-medium text-zinc-100 transition-colors outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-300/70">
        <span className="flex items-center gap-3">
          <Icon
            className="h-4 w-4 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          {title}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {onExpand ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onExpand();
              }}
              aria-label={`Pop out "${title}" into a larger reading view`}
              title="Pop out for a larger view"
              className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
          <ChevronDown
            className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </span>
      </summary>
      <div className="border-t border-white/10 px-4 py-5 md:px-6">
        {children}
      </div>
    </details>
  );
}

function GuidanceReaderModal({
  items,
  initialIndex,
  onClose,
}: {
  items: { title: string; body?: string | null; icon: typeof Compass }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % items.length);
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + items.length) % items.length);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [items.length, onClose]);

  const item = items[index];
  const Icon = item.icon;

  const modal = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        onClick={(event) => event.stopPropagation()}
        className="animate-in fade-in zoom-in-95 relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-300/20 bg-zinc-950/98 shadow-2xl duration-200"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-black/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-300/15 text-amber-200">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-[11px] tracking-[0.16em] text-zinc-500 uppercase">
                Before you begin · {index + 1} / {items.length}
              </p>
              <h3 className="text-xl font-semibold text-white">
                {item.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8">
          <Markdown size="lg">{item.body}</Markdown>
        </div>

        {items.length > 1 ? (
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-black/20 px-4 py-3 md:px-6">
            <button
              type="button"
              onClick={() =>
                setIndex((current) => (current - 1 + items.length) % items.length)
              }
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="flex gap-1.5">
              {items.map((entry, entryIndex) => (
                <button
                  key={entry.title}
                  type="button"
                  onClick={() => setIndex(entryIndex)}
                  aria-label={`Go to ${entry.title}`}
                  className={`h-1.5 rounded-full transition-all ${
                    entryIndex === index
                      ? "w-6 bg-amber-300"
                      : "w-1.5 bg-white/15 hover:bg-white/30"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIndex((current) => (current + 1) % items.length)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function SlideDeck<T>({
  items,
  label,
  renderItem,
  getTitle,
}: {
  items: T[];
  label: string;
  renderItem: (item: T, index: number) => ReactNode;
  getTitle: (item: T) => string;
}) {
  const [active, setActive] = useState(0);
  if (!items.length) return null;
  const safeActive = Math.min(active, items.length - 1);
  const item = items[safeActive];
  const move = (direction: -1 | 1) => {
    setActive((current) => (current + direction + items.length) % items.length);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-zinc-100">{label}</span>
          <span className="ml-2 font-mono text-xs text-zinc-500">
            {safeActive + 1} / {items.length}
          </span>
        </p>
        {items.length > 1 ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={`Previous ${label.toLowerCase()}`}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={`Next ${label.toLowerCase()}`}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>
      <div
        key={`${safeActive}-${getTitle(item)}`}
        className="animate-in fade-in slide-in-from-right-2 duration-300 motion-reduce:animate-none"
      >
        {renderItem(item, safeActive)}
      </div>
      {items.length > 1 ? (
        <div
          className="mt-2 flex flex-wrap justify-center"
          aria-label={`${label} slides`}
        >
          {items.map((entry, index) => (
            <button
              key={`${getTitle(entry)}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show ${getTitle(entry)}`}
              aria-current={index === safeActive ? "true" : undefined}
              className="grid h-11 w-11 place-items-center rounded-full transition outline-none hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              <span
                aria-hidden="true"
                className={`h-2.5 rounded-full transition-all ${
                  index === safeActive
                    ? "w-8 bg-amber-300"
                    : "w-2.5 bg-white/20"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GuidedExercise({ markdown }: { markdown: string }) {
  const headingPanels = splitMarkdownPanels(markdown);
  const exercise = headingPanels.panels.length
    ? headingPanels
    : parseNumberedExercise(markdown);

  if (!exercise.panels.length) return <Markdown>{markdown}</Markdown>;

  return (
    <div>
      {exercise.intro ? (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <Markdown compact>{exercise.intro}</Markdown>
        </div>
      ) : null}
      <SlideDeck
        items={exercise.panels}
        label={
          headingPanels.panels.length ? "Exercise parts" : "Exercise steps"
        }
        getTitle={(panel) => panel.title}
        renderItem={(panel, index) => (
          <div className="min-h-52 rounded-2xl border border-violet-300/15 bg-violet-300/[0.04] p-5 md:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-300 font-semibold text-zinc-950">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[11px] tracking-[0.16em] text-violet-300 uppercase">
                  {headingPanels.panels.length
                    ? `Part ${index + 1}`
                    : `Step ${index + 1}`}
                </p>
                <h4 className="mt-1 text-xl font-semibold text-white md:text-2xl">
                  {panel.title}
                </h4>
              </div>
            </div>
            <div className="mt-5 md:pl-14">
              <Markdown>{panel.markdown}</Markdown>
            </div>
          </div>
        )}
      />
    </div>
  );
}

function ToolPracticeChooser({
  heading,
  markdown,
  courseSlug,
  weekNumber,
}: {
  heading: string;
  markdown: string;
  courseSlug?: string;
  weekNumber: number;
}) {
  const parsed = parseToolPracticePanels(markdown, heading);
  const options = parsed.panels.map((panel) => ({
    ...panel,
    kind: identifyTool(panel.title),
  }));
  const [selectedKind, setSelectedKind] = useState<ToolKind>(
    options[0]?.kind ?? "concept_search"
  );
  const selected =
    options.find((option) => option.kind === selectedKind) ?? options[0];

  if (!selected) return <Markdown>{markdown}</Markdown>;
  const hasMultipleOptions = options.length > 1;
  const presentation = TOOL_PRESENTATION[selected.kind];
  const Icon = presentation.icon;
  const href = toolHref(
    selected.kind,
    selected.markdown,
    courseSlug,
    weekNumber
  );
  const optionLabel = selected.title
    .match(/^Option\s+([A-Z])/i)?.[1]
    ?.toUpperCase();

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/[0.035]">
      <div className="border-b border-cyan-300/10 p-5 md:p-7">
        <Kicker icon={Sparkles}>
          {hasMultipleOptions
            ? "Choose your Prismarium tool"
            : "Prismarium tool practice"}
        </Kicker>
        <h4 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
          {hasMultipleOptions
            ? "Take the question into the wider library"
            : `Continue in ${presentation.label}`}
        </h4>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          {hasMultipleOptions
            ? "Choose one or try them all. Each one opens in a new tab, so your place in the course stays here. These tools deepen the exploration; they are not a test of whether you understood the course."
            : "The tool opens in a new tab, so this course and your place in it stay here."}
        </p>
      </div>

      <div
        className={`grid gap-5 p-4 md:p-6 ${
          hasMultipleOptions
            ? "lg:grid-cols-[17rem_minmax(0,1fr)]"
            : "grid-cols-1"
        }`}
      >
        {hasMultipleOptions ? (
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1"
            role="tablist"
            aria-label="Prismarium practice tools"
          >
            {options.map((option) => {
              const optionPresentation = TOOL_PRESENTATION[option.kind];
              const OptionIcon = optionPresentation.icon;
              const active = option.kind === selected.kind;
              return (
                <button
                  key={option.kind}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedKind(option.kind)}
                  className={`flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
                    active
                      ? `${optionPresentation.accent} text-white`
                      : "border-transparent bg-black/15 text-zinc-500 hover:border-white/10 hover:bg-white/[0.035] hover:text-zinc-200"
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                      active
                        ? optionPresentation.iconClass
                        : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    <OptionIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                      {optionPresentation.shortLabel}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold">
                      {optionPresentation.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          key={selected.kind}
          role={hasMultipleOptions ? "tabpanel" : undefined}
          className={`animate-in fade-in slide-in-from-right-2 rounded-2xl border p-5 duration-300 motion-reduce:animate-none md:p-7 ${presentation.accent}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${presentation.iconClass}`}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-[11px] tracking-[0.16em] text-zinc-500 uppercase">
                  {optionLabel ? `Option ${optionLabel}` : "Tool practice"}
                </p>
                <h5 className="mt-1 text-2xl font-semibold text-white">
                  {presentation.label}
                </h5>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {presentation.description}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-cyan-300 uppercase">
              Your mission
            </p>
            <Markdown>{selected.markdown}</Markdown>
          </div>

          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-zinc-100">Ready to try it?</p>
              <p className="mt-1 text-sm text-zinc-500">
                Launch the tool, complete the mission, then return here.
              </p>
            </div>
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-100"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              Open {presentation.label}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function CourseOverview({
  course,
  books,
}: {
  course: LearnerRenderableCourse;
  books: ReturnType<typeof buildCourseBookDisplay>;
}) {
  const content = course.content;
  const outcomes = course.learning_outcomes ?? [];
  const [expandedGuidanceIndex, setExpandedGuidanceIndex] = useState<
    number | null
  >(null);
  const premiseParagraphs = (course.premise ?? "")
    .split(/\n\s*\n/)
    .filter(Boolean);
  const premisePreview = premiseParagraphs.slice(0, 2).join("\n\n");
  const premiseMore = premiseParagraphs.slice(2).join("\n\n");
  const retainedSections = (content?.sections ?? []).filter(
    (section) => !KNOWN_COURSE_HEADINGS.has(section.heading.toLowerCase())
  );
  const guidance = [
    {
      title: "Recommended preparation",
      body: content?.recommended_preparation,
      icon: Compass,
    },
    {
      title: "What you’ll build",
      body: content?.primary_artifact,
      icon: Target,
    },
    {
      title: "Why I chose this path",
      body: content?.curator_note_public,
      icon: Feather,
    },
    { title: "Scope and limits", body: content?.scope_limits, icon: Map },
    { title: "Tone and safety", body: content?.tone_safety, icon: ShieldCheck },
    {
      title: "How to use this course",
      body: content?.course_use_guidance,
      icon: Compass,
    },
    {
      title: "Source and context notes",
      body: content?.source_context_notes,
      icon: BookOpen,
    },
  ].filter((item) => item.body?.trim());

  return (
    <div className="space-y-6 md:space-y-8">
      <Surface tone="amber" className="relative overflow-hidden p-6 md:p-10">
        <div
          className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
          <div>
            <Kicker icon={Compass}>About this path</Kicker>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance text-white md:text-6xl">
              {course.title}
            </h2>
            <div className="mt-5 max-w-2xl">
              {premisePreview ? (
                <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-amber-200 uppercase">
                  Why this question
                </p>
              ) : null}
              <Markdown>{premisePreview}</Markdown>
              {premiseMore ? (
                <div className="mt-4">
                  <Disclosure
                    title="Read more about this question"
                    icon={BookOpen}
                  >
                    <Markdown>{premiseMore}</Markdown>
                  </Disclosure>
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-3xl font-semibold text-white">
                {content?.weeks.length ?? 0}
              </p>
              <p className="mt-1 text-sm text-zinc-400">guided weeks</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-3xl font-semibold text-white">
                {outcomes.length}
              </p>
              <p className="mt-1 text-sm text-zinc-400">ideas to explore</p>
            </div>
          </div>
        </div>
      </Surface>

      <CourseBookGallery books={books} weeks={content?.weeks ?? []} />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Surface className="p-5 md:p-7">
          <Kicker icon={Target}>What we’ll explore</Kicker>
          <div className="mt-5">
            <SlideDeck
              items={outcomes}
              label="What we’ll explore"
              getTitle={(outcome) => outcome}
              renderItem={(outcome, index) => (
                <div className="flex min-h-44 items-start gap-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5 md:p-6">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-300 text-lg font-semibold text-zinc-950">
                    {index + 1}
                  </span>
                  <p className="text-lg leading-8 text-zinc-100 md:text-xl">
                    {outcome}
                  </p>
                </div>
              )}
            />
          </div>
        </Surface>

        <Surface className="p-5 md:p-7">
          <Kicker icon={ShieldCheck}>Before you begin</Kicker>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Open these when you need orientation, boundaries, or support. You
            do not need to memorize them — tap{" "}
            <Maximize2
              className="inline h-3.5 w-3.5 -translate-y-px text-amber-300"
              aria-hidden="true"
            />{" "}
            on any of them to pop it into a larger reading view.
          </p>
          <div className="mt-5 space-y-3">
            {guidance.map((item, index) => (
              <Disclosure
                key={item.title}
                title={item.title}
                icon={item.icon}
                onExpand={() => setExpandedGuidanceIndex(index)}
              >
                <Markdown>{item.body}</Markdown>
              </Disclosure>
            ))}
          </div>
        </Surface>
      </div>

      {expandedGuidanceIndex !== null ? (
        <GuidanceReaderModal
          items={guidance}
          initialIndex={expandedGuidanceIndex}
          onClose={() => setExpandedGuidanceIndex(null)}
        />
      ) : null}

      {content?.reference_materials?.length ? (
        <Surface tone="cyan" className="p-5 md:p-7">
          <Kicker icon={BookOpen}>Reference desk</Kicker>
          <h3 className="mt-3 text-2xl font-semibold text-white">
            Labels to keep beside you
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            These compact guides help you name connections and uncertainty
            consistently throughout the course.
          </p>
          <div className="mt-5">
            <SlideDeck
              items={content.reference_materials}
              label="Course reference materials"
              getTitle={(section) => section.heading}
              renderItem={(section) => (
                <div className="rounded-2xl border border-cyan-300/15 bg-black/20 p-5 md:p-7">
                  <h4 className="text-xl font-semibold text-white">
                    {section.heading}
                  </h4>
                  <div className="mt-4">
                    <Markdown>{section.markdown}</Markdown>
                  </div>
                </div>
              )}
            />
          </div>
        </Surface>
      ) : null}

      {content?.key_tensions?.length ? (
        <Surface tone="violet" className="p-5 md:p-7">
          <Kicker icon={Layers3}>Ideas to explore together</Kicker>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            These pairs can help us notice different parts of a question. They
            are not facts to memorize or sides you have to choose between.
          </p>
          <div className="mt-5">
            <SlideDeck
              items={content.key_tensions}
              label="Ideas to explore together"
              getTitle={(tension) => tension.label}
              renderItem={(tension) => (
                <div className="flex min-h-44 flex-col justify-center rounded-2xl border border-violet-300/15 bg-violet-300/[0.04] p-6 md:p-8">
                  <p className="text-xl font-semibold text-violet-200 md:text-2xl">
                    {tension.label}
                  </p>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">
                    {tension.description}
                  </p>
                </div>
              )}
            />
          </div>
        </Surface>
      ) : null}

      {retainedSections.map((section) => (
        <Disclosure
          key={section.heading}
          title={section.heading}
          icon={CircleHelp}
        >
          <Markdown>{section.markdown}</Markdown>
        </Disclosure>
      ))}
    </div>
  );
}

function ReadingCard({ reading }: { reading: CourseReading }) {
  const [tier, setTier] = useState<keyof typeof TIER_LABELS>("keystone");
  const tierKeys = Object.keys(TIER_LABELS) as Array<keyof typeof TIER_LABELS>;
  const availableTiers = tierKeys.filter((key) =>
    Boolean(reading.tiers[key].reference)
  );
  const activeTier = availableTiers.includes(tier) ? tier : availableTiers[0];
  const tierData = activeTier ? reading.tiers[activeTier] : undefined;
  const notes = [
    { title: "Source role", body: reading.source_role },
    { title: "Historical context", body: reading.historical_note },
    { title: "Translation note", body: reading.translation_note },
    { title: "Reading note", body: reading.reading_note },
    { title: "Interpretive caution", body: reading.interpretive_caution },
  ].filter((note) => note.body?.trim());

  return (
    <Surface className="overflow-hidden">
      <div className="border-b border-white/10 p-5 md:p-7">
        <Kicker icon={BookOpen}>Primary source</Kicker>
        <h4 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
          {reading.title}
        </h4>
        {reading.author ? (
          <p className="mt-2 text-base text-amber-200">{reading.author}</p>
        ) : null}
        {reading.selection_rationale ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <p className="mb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Why it is here
            </p>
            <Markdown compact>{reading.selection_rationale}</Markdown>
          </div>
        ) : null}
      </div>

      <div className="p-5 md:p-7">
        {tierData && activeTier ? (
          <>
            <p className="mb-3 text-sm font-medium text-zinc-200">
              Choose your reading depth
            </p>
            <div
              className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/25 p-1.5"
              role="tablist"
              aria-label="Reading depth"
            >
              {tierKeys.map((key) => {
                const available = Boolean(reading.tiers[key].reference);
                const active = activeTier === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    disabled={!available}
                    aria-selected={active}
                    onClick={() => setTier(key)}
                    className={`min-h-12 rounded-xl px-2 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-amber-300/70 ${
                      active
                        ? "bg-amber-300 text-zinc-950 shadow-lg shadow-amber-300/10"
                        : available
                          ? "text-zinc-400 hover:bg-white/5 hover:text-white"
                          : "cursor-not-allowed text-zinc-700"
                    }`}
                  >
                    <span className="block">{TIER_LABELS[key].title}</span>
                    <span
                      className={`hidden text-[11px] font-normal sm:block ${active ? "text-zinc-800" : "text-zinc-500"}`}
                    >
                      {available ? TIER_LABELS[key].time : "Not assigned"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className="mt-4 min-h-40 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5 md:p-6"
              role="tabpanel"
            >
              <p className="mb-3 text-sm text-zinc-400">
                {TIER_LABELS[activeTier].description}
              </p>
              <Markdown>{tierData.reference}</Markdown>
              <Markdown compact>{tierData.description}</Markdown>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-5">
            <p className="font-semibold text-amber-100">
              Reading depths still need to be assigned
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              This source is retained, but its Essential, Explore, and Full Text
              selections are missing from the course draft.
            </p>
          </div>
        )}
        {notes.length ? (
          <div className="mt-4 space-y-2">
            {notes.map((note) => (
              <Disclosure key={note.title} title={note.title} icon={Quote}>
                <Markdown compact>{note.body}</Markdown>
              </Disclosure>
            ))}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}

function CompanionCardView({ card }: { card: CompanionCard }) {
  const coreSections = card.sections.filter(
    (section) => !/^go deeper/i.test(section.heading)
  );
  const deeper = card.sections.find((section) =>
    /^go deeper/i.test(section.heading)
  );
  return (
    <Surface tone="cyan" className="overflow-hidden">
      <div className="border-b border-cyan-300/10 p-5 md:p-7">
        <Kicker icon={Sparkles}>
          {card.companion_type.replace("_", " ")} companion
        </Kicker>
        <h4 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
          {card.title}
        </h4>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          A present-day or tradition-aware voice to help you test the
          week&apos;s central ideas.
        </p>
      </div>
      <div className="space-y-3 p-5 md:p-7">
        {coreSections.map((section, index) => (
          <Disclosure
            key={section.heading}
            title={section.heading}
            icon={index === 0 ? Users : Lightbulb}
            defaultOpen={index === 0}
          >
            <Markdown>{section.markdown}</Markdown>
          </Disclosure>
        ))}
        {deeper ? (
          <Disclosure title={deeper.heading} icon={ExternalLink}>
            <Markdown>{deeper.markdown}</Markdown>
          </Disclosure>
        ) : null}
      </div>
    </Surface>
  );
}

function LearningStudio({
  sections,
  courseSlug,
  weekNumber,
  finalReflection,
  cases = [],
  workedExample,
}: {
  sections: LearnerMarkdownSection[];
  courseSlug?: string;
  weekNumber: number;
  finalReflection?: string;
  cases?: LearnerMarkdownSection[];
  workedExample?: LearnerMarkdownSection;
}) {
  if (!sections.length && !finalReflection && !cases.length && !workedExample)
    return null;
  return (
    <Surface tone="violet" className="p-5 md:p-7">
      <Kicker icon={FlaskConical}>Learning studio</Kicker>
      <h3 className="mt-3 text-2xl font-semibold text-white">
        Turn the ideas into something you can use
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
        Work through one panel at a time. Your goal is a thoughtful next move,
        not a perfect answer.
      </p>
      <div className="mt-6 space-y-3">
        {sections.map((section, index) => {
          if (
            /^(?:PRISMARIUM PRACTICE|OPTIONAL PRODUCT PRACTICE)/i.test(
              section.heading
            )
          ) {
            return (
              <ToolPracticeChooser
                key={`${section.heading}-${index}`}
                heading={section.heading}
                markdown={section.markdown}
                courseSlug={courseSlug}
                weekNumber={weekNumber}
              />
            );
          }
          const isGuidedExercise =
            /^CENTRAL (?:LENS )?EXERCISE|^CENTRAL ENCOUNTER/i.test(
              section.heading
            );
          return (
            <Disclosure
              key={`${section.heading}-${index}`}
              title={section.heading}
              icon={/capstone/i.test(section.heading) ? Map : FlaskConical}
            >
              {isGuidedExercise ? (
                <GuidedExercise markdown={section.markdown} />
              ) : (
                <Markdown>{section.markdown}</Markdown>
              )}
            </Disclosure>
          );
        })}
        {finalReflection ? (
          <Disclosure title="Final reflection" icon={Feather}>
            <Markdown>{finalReflection}</Markdown>
          </Disclosure>
        ) : null}
        {cases.length ? (
          <Disclosure
            title={
              cases.length === 1
                ? "Try the supplied case"
                : "Choose a supplied case"
            }
            icon={Users}
          >
            <SlideDeck
              items={cases}
              label="Practice cases"
              getTitle={(item) => item.heading}
              renderItem={(item, index) => {
                const caseLabel =
                  item.heading.match(/^Case\s+([A-Z])/i)?.[1]?.toUpperCase() ??
                  String.fromCharCode(65 + index);
                return (
                  <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5 md:p-6">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-300 font-semibold text-zinc-950">
                        {caseLabel}
                      </span>
                      <h4 className="text-xl font-semibold text-white">
                        {item.heading}
                      </h4>
                    </div>
                    <div className="mt-5">
                      <Markdown>{item.markdown}</Markdown>
                    </div>
                    <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
                      <p className="font-semibold text-amber-100">
                        Try this first
                      </p>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">
                        Work through the prompt in your own words before
                        comparing your reasoning with any supplied notes or
                        completed example.
                      </p>
                    </div>
                  </div>
                );
              }}
            />
          </Disclosure>
        ) : null}
        {workedExample ? (
          <Disclosure
            title={
              /tension map/i.test(workedExample.heading)
                ? "See a completed tension map"
                : "See a completed example"
            }
            icon={Map}
          >
            <div className="mb-4 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-4 text-sm leading-6 text-zinc-300">
              Use this as a model for the shape of the thinking—not as an answer
              key.
            </div>
            <Markdown>{workedExample.markdown}</Markdown>
          </Disclosure>
        ) : null}
      </div>
    </Surface>
  );
}

function WeekView({
  week,
  courseSlug,
  cases = [],
  workedExample,
  completionPathways = [],
  stage,
  onStageChange,
}: {
  week: CourseWeek;
  courseSlug?: string;
  cases?: LearnerMarkdownSection[];
  workedExample?: LearnerMarkdownSection;
  completionPathways?: CourseContent["completion_pathways"];
  stage: WeekStage;
  onStageChange: (stage: WeekStage) => void;
}) {
  const studioSections = (week.sections ?? []).filter((section) => {
    const heading = section.heading.toLowerCase();
    return (
      !heading.startsWith("plain-language doorway") &&
      !heading.startsWith("why this week matters") &&
      !heading.startsWith("core question") &&
      !heading.startsWith("capstone purpose") &&
      !heading.startsWith("key tension") &&
      !heading.startsWith("readings") &&
      !heading.startsWith("return readings") &&
      !heading.startsWith("supplied case") &&
      !heading.includes("companion") &&
      !heading.startsWith("synthesis prompt") &&
      !heading.startsWith("final reflection") &&
      !heading.startsWith("completion pathways")
    );
  });
  const finishSections = (week.sections ?? []).filter((section) =>
    section.heading.toLowerCase().startsWith("completion pathways")
  );
  const stages: WeekStageTab[] = [
    { id: "start" as const, label: "Start", icon: Lightbulb },
    ...(week.readings.length || (week.return_readings ?? []).length
      ? [
          {
            id: "read" as const,
            label: "Readings",
            icon: BookOpen,
            count: week.readings.length + (week.return_readings?.length ?? 0),
            countLabel: week.readings.length
              ? `assigned reading${
                  week.readings.length + (week.return_readings?.length ?? 0) ===
                  1
                    ? ""
                    : "s"
                }`
              : `return-reading choice${
                  (week.return_readings?.length ?? 0) === 1 ? "" : "s"
                }`,
          },
        ]
      : []),
    ...((week.companion_cards ?? []).length
      ? [{ id: "companions" as const, label: "Companions", icon: Sparkles }]
      : []),
    { id: "practice" as const, label: "Practice", icon: FlaskConical },
    { id: "finish" as const, label: "Finish", icon: Target },
  ];
  const activeStageIndex = stages.findIndex((item) => item.id === stage);

  return (
    <div className="space-y-6 md:space-y-8">
      <Surface tone="amber" className="relative overflow-hidden p-6 md:p-10">
        <div
          className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <Kicker icon={Compass}>
            Week {week.week_number} · {week.week_type}
          </Kicker>
          <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-balance text-white md:text-6xl">
            {week.title}
          </h2>
          {week.core_question ? (
            <p className="mt-6 max-w-3xl text-xl leading-8 text-amber-100/90 md:text-2xl">
              {week.core_question}
            </p>
          ) : null}
          <div className="mt-7 flex flex-wrap gap-2">
            {week.key_tension ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-300">
                <span className="text-zinc-500">Exploring:</span>{" "}
                {week.key_tension.replace(/\s+vs\s+/i, " and ")}
              </span>
            ) : null}
            {week.lens_focus.map((lens) => (
              <span
                key={lens}
                className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-4 py-2 text-sm text-amber-100"
              >
                {lens}
              </span>
            ))}
          </div>
        </div>
      </Surface>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-2">
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-5"
          role="group"
          aria-label={`Week ${week.week_number} stages`}
        >
          {stages.map((item, index) => {
            const Icon = item.icon;
            const active = stage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                aria-label={`${index + 1}. ${item.label}${
                  item.count
                    ? `, ${item.count} ${item.countLabel ?? "items"}`
                    : ""
                }`}
                onClick={() => onStageChange(item.id)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-amber-300/70 ${
                  active
                    ? "bg-amber-300 text-zinc-950 shadow-lg shadow-amber-300/10"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span>
                  {index + 1}. {item.label}
                </span>
                {item.count ? (
                  <span
                    aria-hidden="true"
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[10px] ${
                      active
                        ? "bg-zinc-950/10 text-zinc-950"
                        : "bg-white/[0.07] text-zinc-500"
                    }`}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        key={stage}
        role="region"
        aria-label={`Week ${week.week_number} ${stages[activeStageIndex]?.label ?? stage} content`}
        className="animate-in fade-in slide-in-from-right-2 duration-300 motion-reduce:animate-none"
      >
        {stage === "start" ? (
          <Surface className="grid gap-5 p-5 md:grid-cols-[auto_1fr] md:p-7">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300 text-zinc-950">
              <Lightbulb className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <Kicker icon={Lightbulb}>Plain-language doorway</Kicker>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                Begin with what you already know
              </h3>
              <div className="mt-4">
                <Markdown>{week.doorway}</Markdown>
              </div>
            </div>
          </Surface>
        ) : null}

        {stage === "read" ? (
          <div className="space-y-8">
            {week.readings.length ? (
              <div>
                <div className="mb-4">
                  <Kicker icon={BookOpen}>
                    Week {week.week_number} reading list
                  </Kicker>
                  <h3 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                    {week.readings.length} assigned reading
                    {week.readings.length === 1 ? "" : "s"} for this week
                  </h3>
                </div>
                <SlideDeck
                  items={week.readings}
                  label={`Week ${week.week_number} readings`}
                  getTitle={(reading) => reading.title}
                  renderItem={(reading) => <ReadingCard reading={reading} />}
                />
              </div>
            ) : null}
            {week.return_readings?.length ? (
              <div>
                <div className="mb-4">
                  <Kicker icon={ArrowLeft}>Return readings</Kicker>
                  <h3 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                    Choose what deserves a second look
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    You do not need to reread everything. Choose the return
                    that best supports your final synthesis.
                  </p>
                </div>
                <SlideDeck
                  items={week.return_readings}
                  label={`Week ${week.week_number} return readings`}
                  getTitle={(reading) => reading.heading}
                  renderItem={(reading, index) => (
                    <Surface className="p-5 md:p-7">
                      <div className="flex items-start gap-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-300 font-semibold text-zinc-950">
                          {index + 1}
                        </span>
                        <div>
                          <Kicker icon={BookOpen}>Return choice</Kicker>
                          <h4 className="mt-2 text-2xl font-semibold text-white">
                            {reading.heading}
                          </h4>
                        </div>
                      </div>
                      <div className="mt-5 md:pl-14">
                        <Markdown>{reading.markdown}</Markdown>
                      </div>
                    </Surface>
                  )}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {stage === "companions" ? (
          <div>
            <div className="mb-4">
              <Kicker icon={Sparkles}>Companion gallery</Kicker>
              <h3 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                Add another voice to the conversation
              </h3>
            </div>
            <SlideDeck
              items={week.companion_cards ?? []}
              label="Companion sources"
              getTitle={(card) => card.title}
              renderItem={(card) => <CompanionCardView card={card} />}
            />
          </div>
        ) : null}

        {stage === "practice" ? (
          <LearningStudio
            sections={studioSections}
            courseSlug={courseSlug}
            weekNumber={week.week_number}
            cases={cases}
            workedExample={workedExample}
          />
        ) : null}

        {stage === "finish" ? (
          <div className="space-y-5">
            {week.synthesis_prompt?.prompt ? (
              <Surface tone="cyan" className="p-5 md:p-7">
                <Kicker icon={Feather}>Pause and connect</Kicker>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  Synthesis prompt
                </h3>
                <div className="mt-4">
                  <Markdown>{week.synthesis_prompt.prompt}</Markdown>
                </div>
              </Surface>
            ) : null}
            {week.final_reflection ? (
              <Surface className="p-5 md:p-7">
                <Kicker icon={Feather}>Look back</Kicker>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  Final reflection
                </h3>
                <div className="mt-4">
                  <Markdown>{week.final_reflection}</Markdown>
                </div>
              </Surface>
            ) : null}
            {finishSections.map((section) => (
              <Disclosure
                key={section.heading}
                title="Where to go next"
                icon={ArrowRight}
              >
                <Markdown>{section.markdown}</Markdown>
              </Disclosure>
            ))}
            {!finishSections.length && completionPathways.length ? (
              <Disclosure title="Where to go next" icon={ArrowRight}>
                <div className="grid gap-3 md:grid-cols-2">
                  {completionPathways.map((pathway) => (
                    <div
                      key={`${pathway.code}-${pathway.title}`}
                      className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
                    >
                      <p className="font-semibold text-zinc-100">
                        <span className="mr-2 font-mono text-xs text-cyan-300">
                          {pathway.code}
                        </span>
                        {pathway.title}
                      </p>
                      {pathway.description ? (
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {pathway.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Disclosure>
            ) : null}
            {!week.synthesis_prompt?.prompt &&
            !week.final_reflection &&
            !finishSections.length &&
            !completionPathways.length ? (
              <Surface tone="cyan" className="p-5 md:p-7">
                <Kicker icon={Check}>Week complete</Kicker>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  Carry your map panel forward
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  Revisit the Practice step whenever you want to revise this
                  week&apos;s exercise or map panel.
                </p>
              </Surface>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3">
        <button
          type="button"
          disabled={activeStageIndex <= 0}
          onClick={() => onStageChange(stages[activeStageIndex - 1].id)}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous step
        </button>
        <span className="font-mono text-xs text-zinc-600">
          {activeStageIndex + 1} / {stages.length}
        </span>
        <button
          type="button"
          disabled={activeStageIndex >= stages.length - 1}
          onClick={() => onStageChange(stages[activeStageIndex + 1].id)}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next step
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function JourneyNavigation({
  stops,
  selection,
  onSelect,
}: {
  stops: JourneyStop[];
  selection: JourneySelection;
  onSelect: (selection: JourneySelection) => void;
}) {
  return (
    <nav
      aria-label="Course journey"
      className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0"
    >
      {stops.map((stop, index) => {
        const Icon = stop.icon;
        const active = selection === stop.id;
        return (
          <button
            key={String(stop.id)}
            type="button"
            onClick={() => onSelect(stop.id)}
            aria-current={active ? "step" : undefined}
            className={`group flex min-h-16 min-w-56 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-amber-300/70 lg:w-full lg:min-w-0 ${
              active
                ? "border-amber-300/30 bg-amber-300/[0.09] text-white shadow-lg shadow-black/20"
                : "border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.035] hover:text-zinc-200"
            }`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                active
                  ? "bg-amber-300 text-zinc-950"
                  : "bg-white/5 text-zinc-500 group-hover:text-zinc-300"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
                {String(index + 1).padStart(2, "0")} · {stop.eyebrow}
              </span>
              <span className="mt-0.5 block truncate text-sm font-medium">
                {stop.label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function CourseLearnerRenderer({
  course,
  warnings = [],
  preview = false,
  bookMetadata = EMPTY_BOOK_METADATA,
}: {
  course: LearnerRenderableCourse;
  warnings?: string[];
  preview?: boolean;
  bookMetadata?: readonly CourseBookMetadata[];
}) {
  const weeks = useMemo(
    () =>
      (course.content?.weeks ?? [])
        .slice()
        .sort((a, b) => a.week_number - b.week_number),
    [course.content?.weeks]
  );
  const books = useMemo(
    () => buildCourseBookDisplay(course.content, bookMetadata),
    [bookMetadata, course.content]
  );
  const learnerSections = course.content?.learner_case_deck ?? [];
  const completedExamples = course.content?.completed_examples ?? [];
  const hasWeekTaggedCases = learnerSections.some(
    (section) => learnerCaseWeekNumber(section) !== undefined
  );
  const untaggedSections = learnerSections.filter(
    (section) => learnerCaseWeekNumber(section) === undefined
  );
  const untaggedWorkedExample = untaggedSections.find((section) =>
    /completed|worked example/i.test(section.heading)
  );
  const untaggedCases = untaggedSections.filter(
    (section) => section !== untaggedWorkedExample
  );
  const stops = useMemo<JourneyStop[]>(() => {
    const result: JourneyStop[] = [
      {
        id: "overview",
        eyebrow: "Start here",
        label: "Course welcome",
        icon: Compass,
      },
    ];
    weeks.forEach((week, index) => {
      result.push({
        id: week.week_number,
        eyebrow: `Week ${week.week_number}`,
        label: week.title,
        icon: index === 0 ? Lightbulb : Layers3,
      });
    });
    return result;
  }, [weeks]);
  const [selection, setSelection] = useState<JourneySelection>("overview");
  const [weekStage, setWeekStage] = useState<WeekStage>("start");
  const [debug, setDebug] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const currentIndex = Math.max(
    0,
    stops.findIndex((stop) => stop.id === selection)
  );
  const currentStop = stops[currentIndex] ?? stops[0];
  const week =
    typeof selection === "number"
      ? weeks.find((item) => item.week_number === selection)
      : undefined;
  const weekIndex = week
    ? weeks.findIndex((item) => item.week_number === week.week_number)
    : -1;
  const taggedWeekSections = week
    ? learnerSections.filter(
        (section) => learnerCaseWeekNumber(section) === week.week_number
      )
    : [];
  const taggedWorkedExample = taggedWeekSections.find((section) =>
    /completed|worked example/i.test(section.heading)
  );
  const weekCases = hasWeekTaggedCases
    ? taggedWeekSections.filter((section) => section !== taggedWorkedExample)
    : week?.supplied_cases?.length
      ? week.supplied_cases
      : weekIndex === 0
        ? untaggedCases.slice(0, 1)
        : weekIndex > 0
          ? untaggedCases.slice(1)
          : [];
  const weekWorkedExample = hasWeekTaggedCases
    ? taggedWorkedExample
    : weekIndex === weeks.length - 1
      ? completedExamples[0] ?? untaggedWorkedExample
      : undefined;
  const select = (next: JourneySelection) => {
    setSelection(next);
    setWeekStage("start");
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const go = (direction: -1 | 1) => {
    const next = stops[currentIndex + direction];
    if (next) select(next.id);
  };

  return (
    <div className="min-h-dvh bg-[#09090b] text-zinc-200 selection:bg-amber-300/30">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-[-12rem] left-[12%] h-[32rem] w-[32rem] rounded-full bg-amber-400/[0.055] blur-3xl" />
        <div className="absolute right-[8%] bottom-[-16rem] h-[36rem] w-[36rem] rounded-full bg-violet-500/[0.045] blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl">
        {preview ? (
          <div className="border-b border-amber-300/15 bg-amber-300/[0.06] px-4 py-2 text-center font-mono text-[11px] tracking-[0.16em] text-amber-200 uppercase">
            Local Parser Preview — Not Imported
          </div>
        ) : null}
        <div className="mx-auto flex min-h-16 max-w-[90rem] items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-zinc-300 focus-visible:ring-2 focus-visible:ring-amber-300/70 lg:hidden"
            aria-label="Open course journey"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {course.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {currentStop?.eyebrow} · {currentStop?.label}
            </p>
          </div>
          <div className="hidden w-40 sm:block">
            <div className="mb-1 flex justify-between font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
              <span>Journey</span>
              <span>
                {currentIndex + 1}/{stops.length}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber-300 transition-[width] duration-300 motion-reduce:transition-none"
                style={{
                  width: `${((currentIndex + 1) / stops.length) * 100}%`,
                }}
              />
            </div>
          </div>
          {preview ? (
            <button
              type="button"
              onClick={() => setDebug((value) => !value)}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-zinc-300 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {debug ? "Hide JSON" : "JSON"}
              </span>
            </button>
          ) : null}
        </div>
      </header>

      {warnings.length ? (
        <div className="relative z-30 border-b border-amber-300/15 bg-amber-300/[0.055]">
          <div className="mx-auto max-w-[90rem] px-4 py-2 md:px-6">
            <button
              type="button"
              onClick={() => setWarningsOpen((value) => !value)}
              aria-expanded={warningsOpen}
              className="flex min-h-11 w-full items-center justify-between gap-4 text-left text-sm text-amber-100 focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Parser notes ({warnings.length})
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${warningsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {warningsOpen ? (
              <ul className="space-y-2 pb-4 text-sm leading-6 text-amber-100/75">
                {warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {debug ? (
        <pre className="relative z-20 mx-auto max-h-[70vh] max-w-[90rem] overflow-auto border-b border-white/10 bg-black p-5 text-xs text-emerald-300">
          {JSON.stringify(course, null, 2)}
        </pre>
      ) : null}

      <div className="relative z-10 mx-auto grid max-w-[90rem] lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 px-4 py-8 lg:sticky lg:top-16 lg:block lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto">
          <p className="mb-4 px-3 font-mono text-[10px] tracking-[0.18em] text-zinc-600 uppercase">
            Your journey
          </p>
          <JourneyNavigation
            stops={stops}
            selection={selection}
            onSelect={select}
          />
        </aside>

        <main
          id="course-content"
          className="min-w-0 px-4 py-6 md:px-8 md:py-10 xl:px-14"
        >
          <div className="mx-auto max-w-5xl">
            {selection === "overview" ? (
              <CourseOverview course={course} books={books} />
            ) : null}
            {week ? (
              <WeekView
                key={week.week_number}
                week={week}
                courseSlug={course.content?.production_slug}
                cases={weekCases}
                workedExample={weekWorkedExample}
                completionPathways={
                  weekIndex === weeks.length - 1
                    ? (course.content?.completion_pathways ?? [])
                    : []
                }
                stage={weekStage}
                onStageChange={setWeekStage}
              />
            ) : null}

            <div className="mt-10 flex items-center justify-between gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={currentIndex === 0}
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-zinc-300 transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>
              <p className="hidden text-center text-xs text-zinc-600 sm:block">
                {currentIndex + 1} of {stops.length}
              </p>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={currentIndex === stops.length - 1}
                className="flex min-h-12 items-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 focus-visible:ring-2 focus-visible:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close course journey"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(90vw,22rem)] overflow-y-auto border-r border-white/10 bg-zinc-950 p-4 shadow-2xl">
            <div className="mb-5 flex min-h-12 items-center justify-between">
              <div>
                <p className="font-semibold text-white">Course journey</p>
                <p className="text-xs text-zinc-500">Choose where to go next</p>
              </div>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-zinc-300 focus-visible:ring-2 focus-visible:ring-amber-300/70"
                aria-label="Close course journey"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <JourneyNavigation
              stops={stops}
              selection={selection}
              onSelect={select}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
