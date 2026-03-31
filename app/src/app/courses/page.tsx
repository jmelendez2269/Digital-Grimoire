'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Clock, ChevronRight } from 'lucide-react';
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
  key_tensions?: Array<{ label: string; description: string }>;
  completion_pathways?: Array<{ code: string; title: string }>;
  weeks?: unknown[];
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

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({
  course,
  enrollment,
}: {
  course: Course;
  enrollment?: { current_week: number; progress: Record<string, unknown> };
}) {
  const router = useRouter();
  const content = course.content;
  const tag = content?.course_id_tag;
  const arc = content?.arc;
  const arcPos = content?.arc_position;
  const coreQuestion = content?.core_question || getTextExcerpt(course.description, 120) || getTextExcerpt(course.premise, 120);
  const tensions = content?.key_tensions?.slice(0, 2) || [];
  const pathways = content?.completion_pathways?.slice(0, 3) || [];

  const currentWeek = enrollment?.current_week || 0;
  const totalWeeks = course.duration_weeks || 8;
  const pct = enrollment ? Math.min(100, Math.round((currentWeek / totalWeeks) * 100)) : 0;

  return (
    <div
      onClick={() => router.push(`/courses/${course.slug}`)}
      className="group relative flex flex-col bg-zinc-900/40 backdrop-blur-md border border-white/8 rounded-lg overflow-hidden cursor-pointer hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-all duration-300 min-h-[240px]"
    >
      {/* Hover background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-amber-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Enrolled progress ring indicator */}
      {enrollment && (
        <div className="absolute top-3 right-3 z-20">
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="none" stroke="rgb(63,63,70)" strokeWidth="2.5" />
              <circle
                cx="16" cy="16" r="12" fill="none"
                stroke="rgb(245,158,11)" strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 12}`}
                strokeDashoffset={`${2 * Math.PI * 12 * (1 - pct / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-amber-400">
              {currentWeek}
            </span>
          </div>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col relative z-10">
        {/* Top row: tag + arc */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {tag && (
            <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          )}
          {arc && (
            <span className="text-[10px] font-mono text-zinc-500">
              {arc}{arcPos ? ` · ${arcPos}` : ''}
            </span>
          )}
          {course.course_type && !tag && (
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
              course.course_type === 'foundational'
                ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
            }`}>
              {course.course_type}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-zinc-100 group-hover:text-amber-100 transition-colors leading-snug mb-2 line-clamp-2">
          {course.title}
        </h3>

        {/* Core question */}
        {coreQuestion && (
          <p className="text-sm text-amber-400/70 italic leading-relaxed line-clamp-2 mb-auto">
            {coreQuestion}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 pt-4 mt-4 border-t border-white/5 text-[11px] text-zinc-600 font-mono">
          {course.duration_weeks && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{course.duration_weeks} WKS</span>
            </div>
          )}
          {course.level && (
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${levelColor(course.level)}`} />
              <span className="uppercase">{course.level}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover overlay: key tensions + CTA */}
      <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20">
        <div className="p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/98 to-transparent">
          {tensions.length > 0 && (
            <div className="space-y-1 mb-3">
              {tensions.map((t) => (
                <div key={t.label} className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                  ↔ {t.label}
                </div>
              ))}
            </div>
          )}

          {pathways.length > 0 && (
            <div className="text-[10px] text-zinc-600 font-mono mb-3">
              → {pathways.map((p) => p.code).join(', ')}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 font-mono">
              {enrollment ? `Week ${currentWeek} active` : ''}
            </span>
            <span className="text-sm font-mono text-amber-400 group-hover:text-amber-300 transition-colors flex items-center gap-1">
              {enrollment ? 'Continue' : 'Enter'}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
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

        const res = await fetch(`/api/courses?${params}`);
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
