'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, GraduationCap, BookOpen, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { tiptapToHtml } from '@/lib/tiptap/render';

const PROSE_CLASSES = `prose prose-invert prose-amber max-w-none
  prose-headings:text-zinc-100 prose-headings:font-bold prose-headings:tracking-tight
  prose-p:text-zinc-400 prose-p:leading-relaxed
  prose-strong:text-amber-500
  prose-em:text-amber-400/80
  prose-code:text-amber-400 prose-code:font-mono prose-code:bg-amber-900/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-amber-500/10
  prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10
  prose-blockquote:border-l-2 prose-blockquote:border-amber-500/50 prose-blockquote:bg-amber-500/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r prose-blockquote:text-zinc-300
  prose-a:text-cyan-400 prose-a:no-underline prose-a:border-b prose-a:border-cyan-500/30 prose-a:transition-colors hover:prose-a:border-cyan-400 hover:prose-a:text-cyan-300
  prose-ul:text-zinc-400 prose-ul:list-disc prose-ul:pl-4
  prose-ol:text-zinc-400 prose-ol:list-decimal prose-ol:pl-4
  prose-li:marker:text-amber-500/50`;

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
  content: Record<string, unknown> | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface Enrollment {
  id: string;
  current_week: number;
  progress: Record<string, unknown>;
  enrolled_at?: string;
}

function CourseDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const slug = params?.slug as string;

  // Fetch course
  useEffect(() => {
    if (authLoading || !slug) return;

    const fetchCourse = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/courses/${slug}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch course');
        }
        const data = await res.json();
        if (data.success && data.course) {
          setCourse(data.course);
        } else {
          throw new Error(data.error || 'Course not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [authLoading, slug]);

  // Fetch enrollment status once course is loaded and user is known
  useEffect(() => {
    if (!course || !user || authLoading) return;

    const fetchEnrollment = async () => {
      setEnrollmentLoading(true);
      try {
        const res = await fetch(`/api/courses/${slug}/enroll`);
        const data = await res.json();
        if (data.success && data.enrollment) {
          setEnrollment(data.enrollment);
        }
      } catch (err) {
        console.error('Error fetching enrollment:', err);
      } finally {
        setEnrollmentLoading(false);
      }
    };

    fetchEnrollment();
  }, [course, user, authLoading, slug]);

  const handleEnroll = async () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${slug}`);
      return;
    }

    setIsEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${slug}/enroll`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.enrollment) {
        setEnrollment(data.enrollment);
        router.push(`/courses/${slug}/learn`);
      }
    } catch (err) {
      console.error('Enrollment failed:', err);
    } finally {
      setIsEnrolling(false);
    }
  };

  const getCourseTypeLabel = (type: string | null) => {
    switch (type) {
      case 'foundational': return 'Foundational';
      case 'theme': return 'Theme';
      case 'rotation': return 'Rotation';
      default: return 'Course';
    }
  };

  const getLevelLabel = (level: string | null) => {
    switch (level) {
      case 'foundational': return 'Foundational';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      default: return 'All Levels';
    }
  };

  const renderRichText = (content: string | null, fallbackClassName = 'text-zinc-400 leading-relaxed') => {
    if (!content) return null;
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const html = tiptapToHtml(content);
        if (html) return <div className={PROSE_CLASSES} dangerouslySetInnerHTML={{ __html: html }} />;
      } catch { /* fall through */ }
    }
    return <p className={fallbackClassName}>{content}</p>;
  };

  const renderedContent = course?.content ? tiptapToHtml(course.content) : '';
  const currentWeek = enrollment?.current_week || 1;
  const totalWeeks = course?.duration_weeks || 8;
  const progressPct = Math.min(100, Math.round((currentWeek / totalWeeks) * 100));

  // Structured content fields from JSONB
  const courseContent = course?.content as Record<string, unknown> | null;
  const coreQuestion = courseContent?.core_question as string | undefined;
  const courseIdTag = courseContent?.course_id_tag as string | undefined;
  const arc = courseContent?.arc as string | undefined;
  const arcPosition = courseContent?.arc_position as number | undefined;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-200 font-sans selection:bg-amber-500/30">
      <Header />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/5 rounded-full blur-[100px]" />
      </div>

      <main className="flex-1 relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/courses"
            className="group inline-flex items-center gap-2 text-zinc-500 hover:text-amber-400 transition-colors mb-8 text-xs font-mono uppercase tracking-wide"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            The Paths
          </Link>

          {error && !authLoading && (
            <div className="mb-6 p-4 bg-red-900/10 border border-red-500/20 rounded-lg">
              <h3 className="text-sm font-mono text-red-400 mb-1 uppercase tracking-wide">Module Load Failed</h3>
              <p className="text-sm text-red-400/70">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-8 animate-pulse">
              <div className="h-12 bg-zinc-900/50 rounded-lg w-3/4 border border-white/5" />
              <div className="flex gap-4">
                <div className="h-6 bg-zinc-900/50 rounded w-24" />
                <div className="h-6 bg-zinc-900/50 rounded w-24" />
              </div>
              <div className="h-64 bg-zinc-900/30 rounded-lg border border-white/5" />
            </div>
          ) : course ? (
            <div className="space-y-12">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {courseIdTag && (
                    <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                      {courseIdTag}
                    </span>
                  )}
                  {course.course_type && (
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border rounded ${
                      course.course_type === 'foundational'
                        ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                        : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                    }`}>
                      {getCourseTypeLabel(course.course_type)}
                    </span>
                  )}
                  {arc && (
                    <span className="text-[10px] font-mono text-zinc-600">
                      {arc}{arcPosition ? ` · ${arcPosition}` : ''}
                    </span>
                  )}
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
                  {course.title}
                </h1>

                {coreQuestion && (
                  <p className="text-lg text-amber-400/70 italic leading-relaxed">
                    {coreQuestion}
                  </p>
                )}

                <div className="flex items-center gap-6 text-xs text-zinc-500 font-mono mt-6 pt-6 border-t border-white/10">
                  {course.duration_weeks && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-600" />
                      <span>{course.duration_weeks} WEEKS</span>
                    </div>
                  )}
                  {course.level && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-zinc-600" />
                      <span>{getLevelLabel(course.level)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Premise */}
              {course.premise && (
                <div className="relative p-6 md:p-8 bg-zinc-900/30 border-l-2 border-amber-500 rounded-r-lg">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <BookOpen className="w-24 h-24 text-amber-500" />
                  </div>
                  <h2 className="text-xs font-mono text-amber-500 uppercase tracking-widest mb-4">Core Premise</h2>
                  <div className="relative z-10 text-lg md:text-xl text-zinc-200 font-light italic leading-relaxed">
                    {renderRichText(course.premise, 'text-zinc-200')}
                  </div>
                </div>
              )}

              {/* Content grid */}
              <div className="grid md:grid-cols-[1fr,300px] gap-8">
                <div className="space-y-8">
                  {course.description && (
                    <div>
                      <h2 className="text-lg font-bold text-amber-500 mb-4">Module Overview</h2>
                      {renderRichText(course.description)}
                    </div>
                  )}

                  {renderedContent && (
                    <div className="pt-8 border-t border-white/5">
                      <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-4">Syllabus</h2>
                      <div className={PROSE_CLASSES} dangerouslySetInnerHTML={{ __html: renderedContent }} />
                    </div>
                  )}

                  {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                    <div className="pt-8 border-t border-white/5">
                      <h2 className="text-lg font-bold text-amber-500 mb-4">Learning Outcomes</h2>
                      <ul className="grid gap-3">
                        {course.learning_outcomes.map((outcome, idx) => (
                          <li key={idx} className="flex items-start gap-3 p-3 bg-zinc-900/30 border border-white/5 rounded-lg text-sm text-zinc-300">
                            <span className="text-amber-500 mt-0.5 font-mono text-xs shrink-0">0{idx + 1}</span>
                            <span>{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* ── Enrollment Sidebar ── */}
                <div className="md:pl-8 md:border-l border-white/5">
                  <div className="sticky top-24 space-y-4">
                    <div className="p-1 rounded-xl bg-gradient-to-b from-amber-500/20 to-cyan-500/10">
                      <div className="bg-black/80 rounded-lg p-6 backdrop-blur-xl border border-white/10">
                        <h3 className="text-base font-bold text-white mb-1">
                          {enrollment ? 'Path Active' : 'Initialize Path'}
                        </h3>

                        {enrollmentLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                          </div>
                        ) : enrollment ? (
                          <>
                            <p className="text-xs text-zinc-500 mb-4">
                              Currently on{' '}
                              <span className="text-amber-400 font-mono">Week {currentWeek}</span>
                              {' '}of {totalWeeks}
                            </p>

                            {/* Progress bar */}
                            <div className="h-0.5 bg-zinc-800 rounded-full mb-5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>

                            <Link
                              href={`/courses/${course.slug}/learn`}
                              className="flex items-center justify-center gap-2 w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-sm transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                            >
                              <BookOpen className="w-4 h-4" />
                              Continue — Week {currentWeek}
                            </Link>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-zinc-500 mb-5">
                              Enter this path and access the knowledge data stream.
                            </p>

                            <button
                              type="button"
                              onClick={handleEnroll}
                              disabled={isEnrolling}
                              className="flex items-center justify-center gap-2 w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                            >
                              {isEnrolling ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Initializing...
                                </>
                              ) : (
                                <>
                                  <BookOpen className="w-4 h-4" />
                                  {user ? 'Enter Path' : 'Sign In to Begin'}
                                </>
                              )}
                            </button>

                            {!user && (
                              <p className="text-[10px] text-zinc-600 text-center mt-2 font-mono">
                                Authentication required
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="bg-zinc-900/30 rounded-lg p-4 border border-white/5">
                      <h4 className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Module Status</h4>
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        Online / Available
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-zinc-950">
          <Header />
          <div className="flex flex-1 items-center justify-center">
            <div className="w-64 h-0.5 bg-zinc-900 rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-amber-500 animate-loading-bar" />
            </div>
          </div>
          <Footer />
        </div>
      }
    >
      <CourseDetailContent />
    </Suspense>
  );
}
