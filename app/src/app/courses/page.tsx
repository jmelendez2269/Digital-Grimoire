'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseReleaseBadge from '@/components/CourseReleaseBadge';
import {
  getCourseReleaseStatus,
  groupCoursesByRelease,
  isCourseAvailable,
  isIntroductionCourse,
  isMainCourse,
} from '@/lib/courses/presentation';
import {
  EMPTY_PLATFORM_TOTALS,
  type PlatformTotals,
} from '@/lib/platform/catalog';
import { tiptapToText } from '@/lib/tiptap/render';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseContent {
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

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  premise: string | null;
  learning_outcomes: string[] | null;
  course_type: 'foundational' | 'theme' | 'rotation' | null;
  level: 'foundational' | 'intermediate' | 'advanced' | null;
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

type ViewMode = 'arcs' | 'map' | 'catalog';

// ─── Constants / helpers ──────────────────────────────────────────────────────

// Spectrum palette from colors_and_type.css, assigned by arc index.
const ARC_PALETTE = [
  '#20E0F5', // cyan
  '#FF8C2A', // amber
  '#2AFFA0', // emerald
  '#3A7FFF', // sapphire
  '#F5D020', // gold
  '#B03AFF', // violet
  '#FF3A5C', // ruby
  '#B48F4A', // brass
];

function formatPlatformTotal(value: number | null): string {
  return value === null ? '—' : value.toLocaleString();
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
      <b className="font-medium text-amber-300">{formatPlatformTotal(totals.tools)}</b>
      {' study tools · '}
      <b className="font-medium text-amber-300">{formatPlatformTotal(totals.books)}</b>
      {' books · '}
      <b className="font-medium text-amber-300">{formatPlatformTotal(totals.courses)}</b>
      {' courses'}
    </p>
  );
}

// 7 Spectrum lenses — mapped to design tokens, with heuristic keyword sets
// for deriving per-course lens tags from title/description/key-tension text.
const LENS_DEFS: Array<{ key: string; label: string; color: string; keywords: RegExp }> = [
  {
    key: 'scientific',
    label: 'Scientific',
    color: '#FF3A5C', // --spectrum-ruby
    keywords: /\b(science|scientif|empiric|physic|biolog|chemist|evidence|hypothesi|experiment|data|methodolog|cognit|neuro)/i,
  },
  {
    key: 'psychological',
    label: 'Psychological',
    color: '#FF8C2A', // --spectrum-amber
    keywords: /\b(psycholog|psyche|mind|conscious|unconscious|jung|dream|archetyp|ego|identity|trauma|emotion|attention)/i,
  },
  {
    key: 'philosophical',
    label: 'Philosophical',
    color: '#F5D020', // --spectrum-gold
    keywords: /\b(philosoph|epistemolog|ontolog|metaphys|ethic|virtue|reason|logic|dialect|plato|aristotle|kant|stoic)/i,
  },
  {
    key: 'religious',
    label: 'Religious/Spiritual',
    color: '#2AFFA0', // --spectrum-emerald
    keywords: /\b(religion|religious|spirit|sacred|divine|god|devot|mystic|prayer|soul|salvation|ritual|monastic|gnos)/i,
  },
  {
    key: 'historical',
    label: 'Historical/Anthropological',
    color: '#20E0F5', // --spectrum-cyan
    keywords: /\b(histor|tradition|transmiss|inherit|lineage|ancient|century|era|archive|colonial|antiquity)/i,
  },
  {
    key: 'symbolic',
    label: 'Symbolic/Occult',
    color: '#3A7FFF', // --spectrum-sapphire
    keywords: /\b(symbol|sign|hermetic|alchem|kabbal|qabal|occult|magic|esoter|tarot|sigil|correspond|myth)/i,
  },
  {
    key: 'mathematical',
    label: 'Mathematical',
    color: '#B03AFF', // --spectrum-violet
    keywords: /\b(math|geometr|number|proportion|pattern|ratio|symmetr|fractal|pythagor|formula|topolog)/i,
  },
];

function deriveLenses(course: Course): number[] {
  const parts: string[] = [
    course.title,
    course.description ?? '',
    course.premise ?? '',
    course.content?.core_question ?? '',
    ...(course.content?.key_tensions?.map((t) => `${t.label} ${t.description}`) ?? []),
    ...(course.learning_outcomes ?? []),
  ];
  const blob = parts.join(' ');
  return LENS_DEFS.map((def, i) => (def.keywords.test(blob) ? i : -1)).filter((i) => i >= 0);
}

function getCoreQuestion(course: Course, maxLength = 200): string | null {
  const direct = course.content?.core_question;
  if (direct) return direct.length > maxLength ? direct.slice(0, maxLength) + '…' : direct;
  return getTextExcerpt(course.description, maxLength) || getTextExcerpt(course.premise, maxLength);
}

function getTextExcerpt(text: string | null | undefined, maxLength = 120): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const extracted = tiptapToText(JSON.parse(trimmed));
      if (extracted) return extracted.length > maxLength ? extracted.slice(0, maxLength) + '…' : extracted;
    } catch { /* fall through */ }
  }
  const clean = trimmed.replace(/\s+/g, ' ');
  return clean.length > maxLength ? clean.slice(0, maxLength) + '…' : clean;
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
    const key = (c.content?.arc?.trim() || 'Open Paths');
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

type LengthBucket = 'all' | 'short' | 'mid' | 'long';
function inLengthBucket(weeks: number | null, bucket: LengthBucket): boolean {
  if (bucket === 'all') return true;
  const w = weeks ?? 0;
  if (bucket === 'short') return w > 0 && w <= 6;
  if (bucket === 'mid') return w >= 7 && w <= 9;
  if (bucket === 'long') return w >= 10;
  return true;
}

function courseStatus(course: Course, enrollment: Enrollment | undefined): {
  state: 'done' | 'current' | 'enter';
  pct: number;
  label: string;
} {
  const total = course.duration_weeks || 8;
  if (!enrollment) return { state: 'enter', pct: 0, label: 'Not started' };
  const week = enrollment.current_week || 1;
  const pct = Math.min(100, Math.round((week / total) * 100));
  const progress = enrollment.progress ?? {};
  const completed =
    progress.completed === true ||
    progress.status === 'completed' ||
    week >= total;
  if (completed) return { state: 'done', pct: 100, label: 'Completed' };
  return { state: 'current', pct, label: `Week ${week} of ${total}` };
}

// ─── Book cover stack (used by both concepts) ────────────────────────────────

function CoverStack({ texts, compact = false }: { texts?: CourseText[]; compact?: boolean }) {
  const limit = compact ? 3 : 5;
  if (!texts || texts.length === 0) return null;
  const visible = texts.slice(0, limit);
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {visible.map((ct, idx) => (
          <div
            key={ct.id}
            className={`${compact ? 'w-6 h-9' : 'w-8 h-11'} rounded-[2px] bg-zinc-800 border border-white/10 overflow-hidden shadow-md`}
            style={{ zIndex: 10 - idx }}
            title={ct.texts?.title}
          >
            {ct.texts?.cover_image_url ? (
              <img src={ct.texts.cover_image_url} alt={ct.texts?.title ?? ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                <BookOpen className="w-3 h-3 text-zinc-600" />
              </div>
            )}
          </div>
        ))}
        {texts.length > limit && (
          <div className={`${compact ? 'w-6 h-9 text-[11px]' : 'w-8 h-11 text-xs'} rounded-[2px] bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 font-mono`}>
            +{texts.length - limit}
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
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-start">
      {/* Left rail */}
      <aside className="lg:sticky lg:top-4">
        <p className="text-xs font-mono uppercase tracking-[0.22em] text-zinc-500 mb-4">
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
                className={`flex items-center gap-3 px-3.5 py-3 rounded-[10px] border text-left transition-all ${
                  active
                    ? 'border-cyan-500/55 bg-cyan-500/[0.06] shadow-[inset_0_0_24px_rgba(34,211,238,0.08)]'
                    : 'border-white/6 bg-zinc-900/40 hover:border-white/10'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: arc.color, boxShadow: `0 0 8px ${arc.color}` }}
                />
                <span className="font-serif text-[17px] leading-tight text-zinc-100 flex-1">
                  {arc.name}
                </span>
                <span className="font-mono text-xs text-zinc-500">{arc.courses.length}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Arc stage */}
      <section className="relative pl-7">
        {/* spine */}
        <div
          className="absolute left-2 top-3.5 bottom-0 w-px"
          style={{
            background:
              'linear-gradient(180deg, #22D3EE 0%, rgba(34,211,238,0.25) 30%, rgba(180,143,74,0.25) 70%, transparent 100%)',
          }}
        >
          <span
            className="absolute -left-[3px] -top-[2px] w-[7px] h-[7px] rounded-full"
            style={{ background: '#22D3EE', boxShadow: '0 0 12px #22D3EE' }}
          />
        </div>

        {/* arc header */}
        {activeArc && (
          <div className="flex flex-wrap items-end justify-between gap-4 mb-7 pb-4 border-b border-white/6">
            <div>
              <h3 className="font-serif italic text-3xl text-zinc-100 m-0">{activeArc.name}</h3>
              {activeArc.courses[0]?.content?.core_question && (
                <p className="font-serif italic text-amber-400 text-lg mt-2 leading-relaxed">
                  {activeArc.courses[0].content.core_question}
                </p>
              )}
            </div>
            <div className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-400">
              <b className="text-amber-400 font-medium">{activeArc.courses.length} courses</b>
              {activeArc.totalWeeks > 0 && <> · ~{activeArc.totalWeeks} weeks</>}
            </div>
          </div>
        )}

        {/* course rows */}
        <div>
          {activeArc?.courses.map((course, idx) => (
            <ArcCourseRow
              key={course.id}
              course={course}
              positionLabel={String(course.content?.arc_position ?? idx + 1).padStart(2, '0')}
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
    course.level === 'advanced' ? '#B03AFF' :
    course.level === 'intermediate' ? '#22D3EE' :
    '#B48F4A';

  const href =
    isOpen && enrollment
      ? `/courses/${course.slug}/learn`
      : `/courses/${course.slug}`;

  const rowContent = (
    <>
      {/* spine dot */}
      <span
        className="absolute -left-[24px] top-6 w-[14px] h-[14px] rounded-full bg-zinc-950 border-[2px]"
        style={{
          borderColor: status.state === 'done' ? '#C5A05B' : status.state === 'current' ? '#B48F4A' : '#52525B',
          background: status.state === 'current' ? '#B48F4A' : '#0A1212',
          boxShadow: status.state === 'current' ? '0 0 16px rgba(180,143,74,0.45)' : 'none',
        }}
      />

      <div className="grid grid-cols-1 gap-4 items-center md:grid-cols-[72px_1fr_240px] md:gap-6">
        <div className="font-display font-semibold text-[28px] leading-none text-amber-500/70 md:text-[34px]">
          {positionLabel}
        </div>

        <div>
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            {tag && (
              <span className="inline-flex items-center rounded-[3px] border border-amber-500/25 bg-amber-500/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
                {tag}
              </span>
            )}
            <CourseReleaseBadge status={releaseStatus} />
            {introductionCourse && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300">
                Introduction
              </span>
            )}
          </div>
          <h4
            className="m-0 font-sans text-xl font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-amber-100"
          >
            {course.title}
          </h4>

          {coreQuestion && (
            <p className="font-serif italic text-base text-zinc-300 mt-2 leading-relaxed">
              “{coreQuestion}”
            </p>
          )}

          <div className="font-mono text-xs tracking-wider uppercase text-zinc-400 mt-3 flex flex-wrap gap-4">
            {course.level && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: levelDotColor }} />
                {course.level}
              </span>
            )}
            {course.duration_weeks && <span>{course.duration_weeks} weeks</span>}
            {course.course_texts && course.course_texts.length > 0 && (
              <span>
                {course.course_texts.length} text{course.course_texts.length !== 1 ? 's' : ''}
              </span>
            )}
            {tensionsCount > 0 && <span>↔ {tensionsCount} key tensions</span>}
          </div>

          {isOpen && status.state === 'current' ? (
            <div className="h-[2px] rounded-[2px] bg-white/6 overflow-hidden mt-2">
              <div
                className="h-full rounded-[2px]"
                style={{
                  width: `${status.pct}%`,
                  background: 'linear-gradient(90deg, #B48F4A, #C5A05B)',
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
              className={`font-mono text-xs tracking-[0.18em] uppercase inline-flex items-center gap-1.5 ${
                status.state === 'done'
                  ? 'text-amber-400'
                  : status.state === 'current'
                  ? 'text-cyan-400'
                  : 'text-cyan-500 group-hover:text-cyan-300'
              }`}
            >
              {status.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-cyan-300">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Public preview
            </span>
          )}
        </div>
      </div>

      {/* faint hover wash tinted by arc color */}
      <span
        className="pointer-events-none absolute inset-x-0 -inset-y-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${arcColor}10, transparent 60%)` }}
      />
    </>
  );

  const rowClassName =
    'group relative block w-full cursor-pointer border-b border-white/6 py-[18px] pb-[22px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-inset';

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
  'Standalone Entry Point',
  'Foundation Doors',
  'Foundational Synthesis',
  'Traditions Across Time',
  'Esoteric Practice',
  'Visual & Mathematical Imagination',
  'The Practical Arts',
  'Convergence & Modern Application',
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
  height: number;
} {
  const included = courses.filter((c) => isMainCourse(c) || isIntroductionCourse(c));

  const byArc = new Map<string, Course[]>();
  for (const c of included) {
    const arc = c.content?.arc?.trim() || 'Open Paths';
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
  for (const c of included) {
    const sourceTag = (c.content?.course_id_tag || c.slug).toUpperCase();
    const sourceSlug = tagToSlug.get(sourceTag);
    if (!sourceSlug) continue;
    for (const pathway of c.content?.completion_pathways ?? []) {
      const targetSlug = tagToSlug.get((pathway.code ?? '').toUpperCase());
      if (!targetSlug || targetSlug === sourceSlug) continue;
      const key = [sourceSlug, targetSlug].sort().join('|');
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ a: sourceSlug, b: targetSlug });
    }
  }

  const height = MAP_TOP_MARGIN + bands.length * MAP_BAND_HEIGHT;
  return { nodes, edges, bands, height };
}

function MapView({ courses }: { courses: Course[] }) {
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const { nodes, edges, bands, height } = useMemo(() => buildConstellation(courses), [courses]);
  const nodeBySlug = useMemo(() => new Map(nodes.map((n) => [n.slug, n])), [nodes]);

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
    if (!pa || !pb) return '';
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

  const hoverNode = hoverSlug ? nodeBySlug.get(hoverSlug) ?? null : null;
  const hoverLinks = hoverNode
    ? [...connected]
        .map((slug) => nodeBySlug.get(slug))
        .filter((n): n is ConstellationNode => !!n)
        .sort((a, b) => a.title.localeCompare(b.title))
    : [];

  if (nodes.length === 0) return null;

  return (
    <div className="border border-white/6 rounded-2xl overflow-hidden bg-zinc-950/40">
      {/* Legend bar */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-4 border-b border-white/6">
        <span className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-400">Arc</span>
        {bands.map((band) => (
          <span key={band.name} className="inline-flex items-center gap-2 font-mono text-xs text-zinc-300">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: band.color, boxShadow: `0 0 6px ${band.color}` }}
            />
            {band.name}
          </span>
        ))}
        <span className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-400 ml-2">Size</span>
        <span className="inline-flex items-center gap-2 font-mono text-xs text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-zinc-500" /> fewer pathways
          <span className="w-3.5 h-3.5 rounded-full bg-zinc-500 ml-1.5" /> more pathways
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Graph */}
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label="Constellation map of course pathways"
        >
          {bands.map((band) => (
            <text
              key={band.name}
              x={12}
              y={band.y - 22}
              className="fill-zinc-600"
              style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.14em', textTransform: 'uppercase' }}
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
                stroke={lit ? nodeBySlug.get(hoverSlug!)?.color ?? '#52525B' : '#3F3F46'}
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
                style={{ cursor: 'pointer', opacity: dim ? 0.25 : 1 }}
              >
                <Link href={`/courses/${n.slug}`} aria-label={n.title}>
                  <circle
                    r={radius(n.slug)}
                    fill={isHover || isConnected ? n.color : '#18181B'}
                    stroke={n.color}
                    strokeWidth={isHover ? 2 : 1.25}
                    style={{ filter: isHover ? `drop-shadow(0 0 6px ${n.color})` : undefined }}
                  />
                  <text
                    y={radius(n.slug) + 12}
                    textAnchor="middle"
                    className="fill-zinc-400"
                    style={{ fontSize: 8, fontFamily: 'monospace' }}
                  >
                    {n.tag}
                  </text>
                </Link>
              </g>
            );
          })}
        </svg>

        {/* Detail panel */}
        <div className="border-t lg:border-t-0 lg:border-l border-white/6 p-5">
          {hoverNode ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: hoverNode.color }}>
                {hoverNode.arc}
              </p>
              <h4 className="font-serif text-xl text-zinc-100 mt-1.5">{hoverNode.title}</h4>
              {hoverNode.coreQuestion && (
                <p className="font-serif italic text-amber-400/90 text-sm mt-2 leading-relaxed">
                  {hoverNode.coreQuestion}
                </p>
              )}
              {hoverLinks.length > 0 && (
                <div className="mt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">
                    Pathways
                  </p>
                  <ul className="space-y-1.5">
                    {hoverLinks.map((n) => (
                      <li key={n.slug}>
                        <Link
                          href={`/courses/${n.slug}`}
                          className="text-sm text-zinc-300 hover:text-cyan-300 transition-colors"
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
            <p className="text-sm text-zinc-500 leading-relaxed">
              Hover or focus a node to see how that course's questions connect onward.
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
    if (filterArc !== 'all' && (c.content?.arc?.trim() ?? 'Open Paths') !== filterArc) return false;
    if (filterLevel !== 'all' && c.level !== filterLevel) return false;
    if (!inLengthBucket(c.duration_weeks, filterLength)) return false;
    if (filterLens !== null && !(courseLenses.get(c.id) ?? []).includes(filterLens)) return false;
    return true;
  });

  // Levels with counts for chips
  const levelCount = (lvl: string) =>
    lvl === 'all' ? courses.length : courses.filter((c) => c.level === lvl).length;

  // Per-lens counts
  const lensCount = (idx: number) =>
    courses.filter((c) => (courseLenses.get(c.id) ?? []).includes(idx)).length;

  return (
    <div>
      {/* Lens filter rail */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <span className="font-mono text-xs tracking-[0.26em] uppercase text-zinc-400 mr-2">
          Lens
        </span>
        <button
          type="button"
          onClick={() => setFilterLens(null)}
          className={`inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] uppercase px-3 py-1.5 border rounded-full transition-colors ${
            filterLens === null
              ? 'bg-white/8 border-white/25 text-zinc-100'
              : 'bg-zinc-900/30 border-white/6 text-zinc-400 hover:border-white/15'
          }`}
        >
          All <span className="text-zinc-500 ml-1 text-xs">{courses.length}</span>
        </button>
        {LENS_DEFS.map((lens, i) => {
          const active = filterLens === i;
          const ct = lensCount(i);
          return (
            <button
              key={lens.key}
              type="button"
              onClick={() => setFilterLens(active ? null : i)}
              className={`inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] uppercase px-3 py-1.5 border rounded-full transition-colors`}
              style={
                active
                  ? { background: `${lens.color}18`, borderColor: `${lens.color}66`, color: lens.color }
                  : { background: 'rgba(13,20,37,0.3)', borderColor: 'rgba(255,255,255,0.06)', color: '#a1a1aa' }
              }
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: lens.color, boxShadow: `0 0 6px ${lens.color}` }}
              />
              {lens.label}
              <span className="text-xs ml-1" style={{ opacity: 0.7 }}>{ct}</span>
            </button>
          );
        })}
      </div>

      {/* Chip rails */}
      <div className="flex flex-wrap items-center gap-2 mb-7 pb-4 border-b border-white/6">
        <span className="font-mono text-xs tracking-[0.26em] uppercase text-zinc-400 mr-2">
          Arc
        </span>
        <Chip active={filterArc === 'all'} onClick={() => setFilterArc('all')}>
          All <Count>{courses.length}</Count>
        </Chip>
        {arcs.map((arc) => (
          <Chip key={arc.key} active={filterArc === arc.key} onClick={() => setFilterArc(arc.key)} dotColor={arc.color}>
            {arc.name} <Count>{arc.courses.length}</Count>
          </Chip>
        ))}

        <ChipSep />

        <span className="font-mono text-xs tracking-[0.26em] uppercase text-zinc-400 mr-2">
          Level
        </span>
        {(['all', 'foundational', 'intermediate', 'advanced'] as const).map((lvl) => (
          <Chip key={lvl} active={filterLevel === lvl} onClick={() => setFilterLevel(lvl)}>
            {lvl === 'all' ? 'All' : lvl} <Count>{levelCount(lvl)}</Count>
          </Chip>
        ))}

        <ChipSep />

        <span className="font-mono text-xs tracking-[0.26em] uppercase text-zinc-400 mr-2">
          Length
        </span>
        <Chip active={filterLength === 'all'} onClick={() => setFilterLength('all')}>
          Any
        </Chip>
        <Chip active={filterLength === 'short'} onClick={() => setFilterLength('short')}>
          ≤ 6 wks
        </Chip>
        <Chip active={filterLength === 'mid'} onClick={() => setFilterLength('mid')}>
          8 wks
        </Chip>
        <Chip active={filterLength === 'long'} onClick={() => setFilterLength('long')}>
          10+
        </Chip>

        <button
          type="button"
          onClick={clearFilters}
          className="ml-auto font-mono text-xs tracking-[0.18em] uppercase text-zinc-500 hover:text-amber-400 px-3 py-2 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Catalog grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-white/5 rounded-2xl bg-zinc-900/10">
          <div className="text-5xl font-mono text-zinc-800 mb-3">∅</div>
          <p className="text-base font-mono text-zinc-500 uppercase tracking-wide">
            No courses match your filters
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const arc = arcs.find((a) => a.key === (course.content?.arc?.trim() ?? 'Open Paths'));
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
      className={`inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] uppercase px-3 py-1.5 border rounded-full transition-colors ${
        active
          ? 'bg-amber-500/[0.08] border-amber-500/40 text-amber-400'
          : 'bg-zinc-900/30 border-white/6 text-zinc-400 hover:border-white/15'
      }`}
    >
      {dotColor && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
        />
      )}
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="text-zinc-500 ml-1 text-xs">{children}</span>;
}

function ChipSep() {
  return <span className="w-px h-5 bg-white/8 mx-2.5" aria-hidden />;
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
  const supportingLine = 'This is the question I’m personally working through right now — follow along, or move at your own pace.';
  const primaryAction = status.state === 'current'
    ? 'Continue this path'
    : isOpen
      ? 'See this path'
      : 'Preview this path';

  return (
    <article className="relative grid md:grid-cols-[1.4fr_1fr] gap-7 p-7 rounded-2xl border border-cyan-500/30 overflow-hidden mb-2"
         style={{
           background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(13,20,37,0.6) 60%, rgba(180,143,74,0.04))',
         }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 0%, rgba(34,211,238,0.12), transparent 50%)' }}
      />
      <div className="relative">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          {tag && (
            <span className="inline-flex items-center rounded-[3px] border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
              {tag}
            </span>
          )}
          <CourseReleaseBadge status={releaseStatus} />
          {isIntroductionCourse(course) && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              Introduction
            </span>
          )}
        </div>
        <h3 className="font-display font-semibold text-[30px] leading-tight text-zinc-100 m-0 mb-3">
          {course.title}
        </h3>
        {coreQuestion && (
          <p className="font-serif italic text-[17px] text-amber-400 m-0 mb-4 leading-relaxed max-w-[480px]">
            “{coreQuestion}”
          </p>
        )}
        <p className="mb-5 max-w-[520px] text-sm leading-relaxed text-zinc-300">
          {supportingLine}
        </p>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-wider uppercase text-zinc-500 mb-6">
          {arc && (
            <span>
              Arc · <b className="text-zinc-100 font-medium">{arc}{arcPos ? ` · ${String(arcPos).padStart(2, '0')}` : ''}</b>
            </span>
          )}
          {course.duration_weeks && <><span>·</span><span>{course.duration_weeks} weeks</span></>}
          {course.course_texts && course.course_texts.length > 0 && (
            <>
              <span>·</span>
              <span>{course.course_texts.length} core text{course.course_texts.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isOpen ? (
            <>
              <Link
                href={enrollment ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`}
                className="inline-flex min-h-11 items-center gap-2.5 rounded-md border border-cyan-500 bg-cyan-500/10 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-cyan-400 transition-all hover:bg-cyan-500/15 hover:shadow-[0_0_24px_rgba(34,211,238,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {primaryAction} →
              </Link>
              {course.content?.curator_note_public ? (
                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-white/8 text-zinc-400 font-mono text-[11px] tracking-[0.18em] uppercase hover:border-white/20 hover:text-zinc-100 transition-colors"
                >
                  Why I chose this path
                </Link>
              ) : null}
            </>
          ) : (
            <Link
              href={`/courses/${course.slug}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/[0.06] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-300 transition-colors hover:border-cyan-400/70 hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Public preview
            </Link>
          )}
        </div>
      </div>

      {/* Prism graphic */}
      <div className="relative hidden md:flex items-center justify-center">
        <svg viewBox="0 0 260 260" className="w-[260px] h-[260px]" fill="none">
          <g opacity="0.9">
            <polygon points="130,50 210,180 50,180" stroke="rgba(34,211,238,0.55)" strokeWidth="1" fill="rgba(34,211,238,0.04)" />
            <polygon points="130,50 210,180 50,180" stroke="rgba(34,211,238,0.2)" strokeWidth="1" fill="none" transform="translate(2,1)" />
          </g>
          <line x1="-10" y1="115" x2="130" y2="115" stroke="rgba(255,255,255,0.45)" strokeWidth="1.3" strokeDasharray="3 2" />
          <circle cx="-5" cy="115" r="2" fill="rgba(255,255,255,0.7)" />
          <line x1="130" y1="115" x2="260" y2="74" stroke="#FF3A5C" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="90" stroke="#FF8C2A" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="106" stroke="#F5D020" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="122" stroke="#2AFFA0" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="138" stroke="#20E0F5" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="154" stroke="#3A7FFF" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="170" stroke="#B03AFF" strokeWidth="1.3" />
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

  const pip =
    isIntroductionCourse(course)
      ? { label: 'Introduction', cls: 'text-amber-300 border-amber-400/30 bg-amber-500/[0.08]' }
      : course.level === 'advanced'
      ? { label: 'Advanced', cls: 'text-violet-400 border-violet-500/30 bg-violet-500/[0.06]' }
      : course.level === 'intermediate'
      ? { label: 'Theme', cls: 'text-cyan-400 border-cyan-500/25 bg-cyan-500/[0.06]' }
      : { label: 'Foundational', cls: 'text-amber-400 border-amber-500/25 bg-amber-500/[0.06]' };

  const href =
    isOpen && enrollment
      ? `/courses/${course.slug}/learn`
      : `/courses/${course.slug}`;

  const cardContent = (
    <>
      <span className={`absolute top-3.5 right-3.5 font-mono text-xs tracking-[0.18em] uppercase px-2 py-1 rounded-[3px] border ${pip.cls}`}>
        {pip.label}
      </span>

      <div className="mb-4 flex min-h-7 flex-wrap items-center gap-2 pr-28">
        {tag && (
          <span className="inline-flex items-center rounded-[3px] border border-amber-500/25 bg-amber-500/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
            {tag}
          </span>
        )}
        <CourseReleaseBadge status={releaseStatus} />
      </div>

      <div className="flex items-center gap-2.5 font-mono text-xs tracking-[0.22em] uppercase text-amber-500 mb-3">
        <span className="text-zinc-500">{arcPos ? String(arcPos).padStart(2, '0') : '—'}</span>
        <span>{arc ?? 'Open Paths'}</span>
        <span
          className="flex-1 h-px"
          style={{
            background: `linear-gradient(90deg, ${arcColor ?? 'rgba(180,143,74,0.4)'}, transparent)`,
          }}
        />
      </div>

      <h3 className="font-display font-semibold text-[22px] leading-tight text-zinc-100 m-0 mb-3">
        {course.title}
      </h3>

      {coreQuestion && (
        <p className="font-serif italic text-base leading-relaxed text-amber-400/90 m-0 mb-4 flex-grow">
          “{coreQuestion}”
        </p>
      )}

      <div className="flex justify-between items-center pt-3.5 border-t border-dashed border-white/8">
        <CoverStack texts={course.course_texts} compact />
        <div className="font-mono text-xs tracking-[0.18em] uppercase text-zinc-400 flex items-center gap-3">
          {!isOpen ? (
            <span className="inline-flex items-center gap-2 text-cyan-300">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Public preview
            </span>
          ) : status.state === 'current' ? (
            <span className="flex items-center gap-2 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Week {enrollment?.current_week ?? 1} of {course.duration_weeks || 8}
            </span>
          ) : status.state === 'done' ? (
            <span className="text-amber-400">Completed</span>
          ) : (
            <span>Not started</span>
          )}
        </div>
      </div>
    </>
  );

  const cardClassName =
    'relative flex min-h-[280px] cursor-pointer flex-col rounded-[14px] border border-white/6 bg-zinc-900/35 p-6 text-left transition-colors hover:border-amber-500/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70';

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
  const getArcColor = (course: Course) =>
    arcs.find((arc) => arc.key === (course.content?.arc?.trim() ?? 'Open Paths'))?.color;

  return (
    <div className="space-y-12">
      <section aria-labelledby="studying-together-now">
        <div className="mb-5">
          <h2
            id="studying-together-now"
            className="font-display text-2xl font-semibold tracking-tight text-zinc-100"
          >
            What I’m working through right now
          </h2>
        </div>
        {groups.current ? (
          <ReleaseSpotlight
            course={groups.current}
            enrollment={enrollmentMap[groups.current.id]}
          />
        ) : (
          <ReleaseSlotPlaceholder>
            The course I’m currently working through will appear here once it’s announced.
          </ReleaseSlotPlaceholder>
        )}
      </section>

      <section aria-labelledby="open-paths">
        <div className="mb-5 max-w-2xl">
          <h2
            id="open-paths"
            className="font-display text-2xl font-semibold tracking-tight text-zinc-100"
          >
            Open paths
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            How to Hold Two Things at Once stays open as the introduction, and paths that have already opened stay in the collection.
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

function CoursesPageContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [totals, setTotals] = useState<PlatformTotals>(EMPTY_PLATFORM_TOTALS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // View toggle (default: arcs — first tab)
  const [viewMode, setViewMode] = useState<ViewMode>('arcs');

  // Concept A state
  const [activeArcKey, setActiveArcKey] = useState<string | null>(null);

  // Concept B state
  const [filterArc, setFilterArc] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterLength, setFilterLength] = useState<LengthBucket>('all');
  const [filterLens, setFilterLens] = useState<number | null>(null);

  const enrollmentMap: Record<string, Enrollment> = useMemo(() => {
    const m: Record<string, Enrollment> = {};
    for (const ec of enrolledCourses) m[ec.id] = ec.enrollment;
    return m;
  }, [enrolledCourses]);

  // Seed search from URL
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) setSearchQuery(decodeURIComponent(urlSearch));
  }, [searchParams]);

  // Fetch catalog (server-side search only; level/length/arc filter client-side)
  useEffect(() => {
    if (authLoading) return;

    const fetchCourses = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        params.append('published', 'true');

        const res = await fetch(`/api/courses?${params}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setCourses(data.courses || []);
          if (data.totals) {
            setTotals({
              tools:
                typeof data.totals.tools === 'number'
                  ? data.totals.tools
                  : EMPTY_PLATFORM_TOTALS.tools,
              books: typeof data.totals.books === 'number' ? data.totals.books : null,
              courses: typeof data.totals.courses === 'number' ? data.totals.courses : null,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [authLoading, searchQuery]);

  // Fetch enrolled courses
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchEnrolled = async () => {
      try {
        const res = await fetch('/api/courses/my-courses');
        const data = await res.json();
        if (data.success && data.courses) {
          setEnrolledCourses(data.courses.filter((c: EnrolledCourse) => c.enrollment));
        }
      } catch (err) {
        console.error('Error fetching enrolled courses:', err);
      }
    };

    fetchEnrolled();
  }, [authLoading, user]);

  // Build arc buckets (client-side, filtered by search but not by chip filters,
  // so the rail shows the full landscape).
  const arcs = useMemo(() => buildArcs(courses), [courses]);

  // Pick a default active arc when arcs first arrive
  useEffect(() => {
    if (!activeArcKey && arcs.length > 0) {
      // Prefer the arc containing an enrolled course
      const enrolledArc = arcs.find((a) => a.courses.some((c) => enrollmentMap[c.id]));
      setActiveArcKey((enrolledArc ?? arcs[0]).key);
    }
  }, [arcs, activeArcKey, enrollmentMap]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-200 font-sans">
      <Header />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-amber-900/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/6 rounded-full blur-[120px]" />
      </div>

      <main className="flex-1 relative z-10">
        {/* Course introduction */}
        <div className="border-b border-white/8 bg-zinc-900/20 backdrop-blur-md">
          <div className="max-w-screen-2xl mx-auto px-6 py-10">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px w-8 bg-amber-500/40" />
                  <span className="text-xs uppercase tracking-widest font-mono text-amber-500/80">
                    Courses
                  </span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Follow a question. See where it leads.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
                  Prismarium courses aren’t expert-led classes or finished answers. They are questions
                  we can read, compare, and think through together.
                </p>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
                  How to Hold Two Things at Once is the recommended starting point, never a requirement. Every published course
                  keeps a public preview, while starting the full path follows its existing access policy.
                </p>
              </div>

              <div className="flex w-full flex-col items-start gap-2.5 sm:w-auto sm:items-end">
                {/* Search */}
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                  <input
                    type="text"
                    aria-label="Search courses"
                    placeholder="SEARCH_COURSES..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/8 bg-black/40 py-2.5 pl-10 pr-4 font-mono text-sm tracking-[0.16em] text-amber-400 placeholder-amber-500/25 transition-all focus:border-amber-500/40 focus:outline-none sm:w-80"
                  />
                </div>

                <PlatformTotalsLine
                  totals={totals}
                  className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-300"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          {!loading && courses.length > 0 && (
            <ReleaseOverview
              courses={courses}
              arcs={arcs}
              enrollmentMap={enrollmentMap}
            />
          )}

          {/* The larger curriculum map remains available below the release view. */}
          {!loading && courses.length > 0 && (
            <section aria-labelledby="larger-map" className="mt-16 border-t border-white/8 pt-10">
              <div className="mb-7">
                <h2
                  id="larger-map"
                  className="font-display text-3xl font-semibold tracking-tight text-zinc-100"
                >
                  The larger map
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  Explore how the questions connect across the full course map.
                </p>
              </div>

              <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <div
                  className="inline-flex max-w-full gap-[2px] overflow-x-auto rounded-lg border border-white/8 bg-black/40 p-[3px]"
                  aria-label="Course map view"
                >
                  {(['arcs', 'map', 'catalog'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setViewMode(m)}
                      aria-pressed={viewMode === m}
                      className={`min-h-11 rounded-[5px] px-5 py-3 font-mono text-sm uppercase tracking-[0.22em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                        viewMode === m
                          ? 'bg-cyan-500/10 text-cyan-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <PlatformTotalsLine
                  totals={totals}
                  className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-400"
                />
              </div>
            </section>
          )}

          {/* Loading / Empty / View */}
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-52 bg-zinc-900/20 border border-white/5 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-28 border border-white/5 rounded-2xl bg-zinc-900/10">
              <div className="text-4xl font-mono text-zinc-800 mb-4">∅</div>
              <p className="text-sm font-mono text-zinc-600 uppercase tracking-wide">
                {searchQuery ? 'No courses match your query' : 'No courses available yet'}
              </p>
            </div>
          ) : viewMode === 'arcs' ? (
            <ArcSpineView
              arcs={arcs}
              activeArcKey={activeArcKey}
              setActiveArcKey={setActiveArcKey}
              enrollmentMap={enrollmentMap}
            />
          ) : viewMode === 'map' ? (
            <MapView courses={courses} />
          ) : (
            <CatalogView
              courses={courses}
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
                setFilterArc('all');
                setFilterLevel('all');
                setFilterLength('all');
                setFilterLens(null);
              }}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CoursesPage() {
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
      <CoursesPageContent />
    </Suspense>
  );
}
