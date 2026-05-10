'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Clock, ChevronRight, BookOpen, Target, Layers, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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

interface EnrolledCourse extends Course {
  enrollment: {
    current_week: number;
    progress: Record<string, unknown>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function levelColor(level: string | null) {
  if (level === 'advanced') return 'bg-purple-500';
  if (level === 'intermediate') return 'bg-cyan-500';
  return 'bg-amber-500';
}

// ─── Active Transmissions Rail ────────────────────────────────────────────────

function ActiveTransmissionsRail({ courses }: { courses: EnrolledCourse[] }) {
  if (courses.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        <span className="text-[10px] uppercase tracking-widest font-mono text-amber-500">
          Active Transmissions
        </span>
        <div className="flex-1 h-px bg-amber-500/10" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {courses.map((course) => {
          const tag = course.content?.course_id_tag || '';
          const currentWeek = course.enrollment.current_week || 1;
          const totalWeeks = course.duration_weeks || 8;
          const pct = Math.min(100, Math.round((currentWeek / totalWeeks) * 100));

          return (
            <div
              key={course.id}
              className="min-w-[260px] max-w-[300px] flex-shrink-0 bg-zinc-900/60 border border-amber-500/20 rounded-lg p-4 relative overflow-hidden"
            >
              {/* Subtle glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  {tag && (
                    <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-zinc-500">
                    Wk {currentWeek}/{totalWeeks}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-3 line-clamp-2">
                  {course.title}
                </h3>

                {/* Progress bar */}
                <div className="h-1 bg-zinc-800 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <Link
                  href={`/courses/${course.slug}/learn`}
                  className="flex items-center justify-between w-full text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Course Hover Card (portal) ───────────────────────────────────────────────

function CourseHoverCard({
  course,
  enrollment,
  anchorRect,
}: {
  course: Course;
  enrollment?: { current_week: number; progress: Record<string, unknown> };
  anchorRect: DOMRect;
}) {
  const content = course.content;
  const coreQuestion = content?.core_question || getTextExcerpt(course.description, 300) || getTextExcerpt(course.premise, 300);
  const tensions = content?.key_tensions || [];
  const pathways = content?.completion_pathways || [];
  const outcomes = course.learning_outcomes || [];
  const currentWeek = enrollment?.current_week || 0;
  const totalWeeks = course.duration_weeks || 8;
  const pct = enrollment ? Math.min(100, Math.round((currentWeek / totalWeeks) * 100)) : 0;

  const cardWidth = 380;
  const gap = 10;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Prefer right side; fall back to left
  let left = anchorRect.right + gap;
  if (left + cardWidth > viewportWidth - 12) {
    left = anchorRect.left - cardWidth - gap;
  }
  // Clamp top so card doesn't go below viewport
  const cardHeight = 560;
  let top = anchorRect.top;
  if (top + cardHeight > viewportHeight - 12) {
    top = Math.max(12, viewportHeight - cardHeight - 12);
  }

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left, top, width: cardWidth }}
    >
      <div
        className="hover-card-animate bg-zinc-900 border border-amber-500/25 rounded-xl shadow-[0_8px_48px_rgba(0,0,0,0.6),0_0_0_1px_rgba(245,158,11,0.08)] overflow-hidden"
      >
        {/* Header band */}
        <div className="px-5 pt-5 pb-4 border-b border-white/6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {content?.course_id_tag && (
                <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                  {content.course_id_tag}
                </span>
              )}
              {course.course_type && (
                <span className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${
                  course.course_type === 'foundational'
                    ? 'border-amber-500/25 text-amber-400/80 bg-amber-500/8'
                    : 'border-cyan-500/25 text-cyan-400/80 bg-cyan-500/8'
                }`}>
                  {course.course_type}
                </span>
              )}
              {course.level && (
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${levelColor(course.level)}`} />
                  {course.level}
                </span>
              )}
            </div>
            {course.duration_weeks && (
              <div className="flex items-center gap-1 text-xs font-mono text-zinc-500 shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>{course.duration_weeks} wks</span>
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-white leading-snug mb-2">
            {course.title}
          </h3>

          {content?.arc && (
            <p className="text-xs font-mono text-zinc-500">
              {content.arc}{content.arc_position ? ` · position ${content.arc_position}` : ''}
            </p>
          )}
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[420px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Core question / description */}
          {coreQuestion && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-zinc-600 mb-1.5">Core Question</div>
              <p className="text-sm text-amber-300/80 italic leading-relaxed">{coreQuestion}</p>
            </div>
          )}

          {/* Learning outcomes */}
          {outcomes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-zinc-600 mb-2">
                <Target className="w-3 h-3" />
                Learning Outcomes
              </div>
              <ul className="space-y-1.5">
                {outcomes.slice(0, 4).map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300 leading-snug">
                    <span className="text-amber-500/60 font-mono mt-0.5 shrink-0">→</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Core texts */}
          {course.course_texts && course.course_texts.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-zinc-600 mb-2.5">
                <BookOpen className="w-3 h-3" />
                Core Reading · {course.course_texts.length} text{course.course_texts.length !== 1 ? 's' : ''}
              </div>
              <div className="space-y-2">
                {course.course_texts.map((ct) => (
                  <div key={ct.id} className="flex items-center gap-3">
                    <div className="w-8 h-11 rounded bg-zinc-800 border border-white/8 overflow-hidden shrink-0 shadow-md">
                      {ct.texts?.cover_image_url ? (
                        <img
                          src={ct.texts.cover_image_url}
                          alt={ct.texts.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-3 h-3 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 leading-snug truncate">{ct.texts?.title}</p>
                      {ct.texts?.author && (
                        <p className="text-xs text-zinc-600 font-mono truncate">{ct.texts.author}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key tensions */}
          {tensions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-zinc-600 mb-2">
                <Layers className="w-3 h-3" />
                Key Tensions
              </div>
              <div className="space-y-2">
                {tensions.map((t) => (
                  <div key={t.label} className="border border-white/5 rounded-lg p-2.5 bg-zinc-800/40">
                    <p className="text-xs font-mono text-zinc-300 mb-0.5">↔ {t.label}</p>
                    {t.description && (
                      <p className="text-xs text-zinc-500 leading-relaxed">{t.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion pathways */}
          {pathways.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-zinc-600 mb-2">Pathways</div>
              <div className="flex flex-wrap gap-1.5">
                {pathways.map((p) => (
                  <span key={p.code} className="text-xs font-mono text-zinc-400 bg-zinc-800 border border-white/6 px-2 py-0.5 rounded">
                    {p.code}
                    {p.title && <span className="text-zinc-600 ml-1">· {p.title}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA footer */}
        <div className="px-5 py-3.5 border-t border-white/6 bg-zinc-950/60">
          {enrollment ? (
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                  <span>Week {currentWeek} of {totalWeeks}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-mono text-amber-400 flex items-center gap-1 shrink-0">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 font-mono">Click to view details</span>
              <span className="text-sm font-mono text-amber-400 flex items-center gap-1">
                Enter Path <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({
  course,
  enrollment,
}: {
  course: Course;
  enrollment?: { current_week: number; progress: Record<string, unknown> };
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const content = course.content;
  const tag = content?.course_id_tag;
  const arc = content?.arc;
  const arcPos = content?.arc_position;
  const coreQuestion = content?.core_question || getTextExcerpt(course.description, 160) || getTextExcerpt(course.premise, 160);

  const currentWeek = enrollment?.current_week || 0;
  const totalWeeks = course.duration_weeks || 8;
  const pct = enrollment ? Math.min(100, Math.round((currentWeek / totalWeeks) * 100)) : 0;

  const handleMouseEnter = () => {
    if (cardRef.current) {
      setAnchorRect(cardRef.current.getBoundingClientRect());
      setHovered(true);
    }
  };

  return (
    <>
      <div
        ref={cardRef}
        onClick={() => router.push(`/courses/${course.slug}`)}
        className={`relative flex flex-col bg-zinc-900/40 backdrop-blur-md border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 min-h-[280px] ${
          hovered
            ? 'border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.12)]'
            : 'border-white/8'
        }`}
      >
        {/* Enrolled progress ring */}
        {enrollment && (
          <div className="absolute top-4 right-4 z-20">
            <div className="relative w-9 h-9">
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgb(39,39,42)" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke="rgb(245,158,11)" strokeWidth="2.5"
                  strokeDasharray={`${2 * Math.PI * 14}`}
                  strokeDashoffset={`${2 * Math.PI * 14 * (1 - pct / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-amber-400 font-medium">
                {currentWeek}
              </span>
            </div>
          </div>
        )}

        <div className="p-6 flex-1 flex flex-col">
          {/* Tags row */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {tag && (
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                {tag}
              </span>
            )}
            {arc && (
              <span className="text-xs font-mono text-zinc-500">
                {arc}{arcPos ? ` · ${arcPos}` : ''}
              </span>
            )}
            {course.course_type && !tag && (
              <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded border ${
                course.course_type === 'foundational'
                  ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                  : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
              }`}>
                {course.course_type}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={`text-xl font-bold leading-snug mb-3 transition-colors line-clamp-2 ${
            hovered ? 'text-amber-100' : 'text-zinc-100'
          }`}>
            {course.title}
          </h3>

          {/* Core question — always visible, more lines */}
          {coreQuestion && (
            <p className="text-sm text-amber-400/65 italic leading-relaxed line-clamp-3 mb-auto">
              {coreQuestion}
            </p>
          )}

          {/* Book covers strip — always visible */}
          {course.course_texts && course.course_texts.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <div className="flex -space-x-1.5">
                {course.course_texts.slice(0, 5).map((ct, idx) => (
                  <div
                    key={ct.id}
                    className="w-7 h-10 rounded bg-zinc-800 border border-white/10 overflow-hidden shadow-md"
                    style={{ zIndex: 10 - idx }}
                    title={ct.texts?.title}
                  >
                    {ct.texts?.cover_image_url ? (
                      <img src={ct.texts.cover_image_url} alt={ct.texts?.title ?? ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <BookOpen className="w-2.5 h-2.5 text-zinc-600" />
                      </div>
                    )}
                  </div>
                ))}
                {course.course_texts.length > 5 && (
                  <div className="w-7 h-10 rounded bg-zinc-900 border border-white/8 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                    +{course.course_texts.length - 5}
                  </div>
                )}
              </div>
              <span className="text-xs text-zinc-600 font-mono">
                {course.course_texts.length} text{course.course_texts.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Footer metadata */}
          <div className="flex items-center gap-4 pt-4 mt-4 border-t border-white/5 text-xs text-zinc-500 font-mono">
            {course.duration_weeks && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{course.duration_weeks} wks</span>
              </div>
            )}
            {course.level && (
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${levelColor(course.level)}`} />
                <span className="uppercase">{course.level}</span>
              </div>
            )}
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={() => setHovered(false)}
              className={`ml-auto text-[10px] uppercase tracking-wider transition-colors ${
                hovered ? 'text-amber-400' : 'text-zinc-700 hover:text-amber-400'
              }`}
            >
              More details →
            </div>
          </div>
        </div>
      </div>

      {hovered && anchorRect && (
        <CourseHoverCard course={course} enrollment={enrollment} anchorRect={anchorRect} />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CoursesPageContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Build enrollment map for quick lookup
  const enrollmentMap: Record<string, EnrolledCourse['enrollment']> = {};
  for (const ec of enrolledCourses) {
    enrollmentMap[ec.id] = ec.enrollment;
  }

  // Seed search from URL
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) setSearchQuery(decodeURIComponent(urlSearch));
  }, [searchParams]);

  // Fetch catalog
  useEffect(() => {
    if (authLoading) return;

    const fetchCourses = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (filterType !== 'all') params.append('type', filterType);
        if (filterLevel !== 'all') params.append('level', filterLevel);
        params.append('published', 'true');

        const res = await fetch(`/api/courses?${params}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) setCourses(data.courses || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [authLoading, searchQuery, filterType, filterLevel]);

  // Fetch enrolled courses (user-specific)
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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-200 font-sans">
      <Header />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-amber-900/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/6 rounded-full blur-[120px]" />
      </div>

      <main className="flex-1 relative z-10">
        {/* Archive header */}
        <div className="border-b border-white/8 bg-zinc-900/20 backdrop-blur-md">
          <div className="max-w-screen-2xl mx-auto px-6 py-10">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px w-8 bg-amber-500/40" />
                  <span className="text-[10px] uppercase tracking-widest font-mono text-amber-500/80">
                    The Convergence Archive
                  </span>
                </div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                  The Paths
                </h1>
                <p className="text-zinc-500 max-w-md text-sm leading-relaxed">
                  Eight-week knowledge modules. Each path is a structured encounter with a domain of inquiry — not a course, but a sustained act of attention.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500/50" />
                  <input
                    type="text"
                    placeholder="SEARCH_PATHS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-black/40 border border-white/8 rounded-lg text-amber-400 placeholder-amber-500/25 font-mono text-xs focus:outline-none focus:border-amber-500/40 w-56 transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-mono transition-all ${
                    showFilters
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'bg-zinc-900/40 border-white/8 text-zinc-500 hover:text-amber-400 hover:border-amber-500/25'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  FILTER
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-8 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest font-mono text-zinc-600">Path Type</label>
                  <div className="flex gap-1.5">
                    {['all', 'foundational', 'theme', 'rotation'].map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`px-2.5 py-1 text-[10px] font-mono border rounded uppercase transition-colors ${
                          filterType === t
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                            : 'border-white/8 text-zinc-600 hover:border-amber-500/25 hover:text-zinc-400'
                        }`}
                      >
                        {t === 'all' ? 'All' : t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest font-mono text-zinc-600">Level</label>
                  <div className="flex gap-1.5">
                    {['all', 'foundational', 'intermediate', 'advanced'].map((l) => (
                      <button
                        type="button"
                        key={l}
                        onClick={() => setFilterLevel(l)}
                        className={`px-2.5 py-1 text-[10px] font-mono border rounded uppercase transition-colors ${
                          filterLevel === l
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                            : 'border-white/8 text-zinc-600 hover:border-cyan-500/25 hover:text-zinc-400'
                        }`}
                      >
                        {l === 'all' ? 'All' : l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          {/* Active Transmissions Rail */}
          {!authLoading && user && enrolledCourses.length > 0 && (
            <ActiveTransmissionsRail courses={enrolledCourses} />
          )}

          {/* Catalog section label */}
          {courses.length > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[9px] uppercase tracking-widest font-mono text-zinc-600">
                {courses.length} path{courses.length !== 1 ? 's' : ''} available
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          )}

          {/* Loading */}
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
                {searchQuery || filterType !== 'all' || filterLevel !== 'all'
                  ? 'No paths match your query'
                  : 'No paths available yet'}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={enrollmentMap[course.id]}
                />
              ))}
            </div>
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
