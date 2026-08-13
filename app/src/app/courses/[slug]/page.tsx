"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  GraduationCap,
  BookOpen,
  Loader2,
  Lock,
  Compass,
  Sparkles,
  Target,
  Layers3,
  Feather,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseReleaseBadge from "@/components/CourseReleaseBadge";
import {
  getCourseReleaseStatus,
  isCourseAvailable,
  isIntroductionCourse,
} from "@/lib/courses/presentation";
import { tiptapToHtml } from "@/lib/tiptap/render";

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
  course_type: "foundational" | "theme" | "rotation" | null;
  level: "foundational" | "intermediate" | "advanced" | null;
  duration_weeks: number | null;
  content: Record<string, unknown> | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  course_texts?: CourseText[];
}

interface Enrollment {
  id: string;
  current_week: number;
  progress: Record<string, unknown>;
  enrolled_at?: string;
}

interface CoursePreviewWeek {
  week_number?: number;
  title?: string;
  description?: string;
  week_summary?: string;
  core_question?: string;
  key_tension?: string;
  readings?: Array<{
    title?: string;
    author?: string;
    section?: string;
  }>;
}

interface CourseAccess {
  tier: "free" | "paid";
  upgradeRequired: boolean;
}

function CoursePreviewAtmosphere() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute top-[-14rem] left-[8%] h-[38rem] w-[38rem] rounded-full bg-amber-400/[0.075] blur-3xl" />
      <div className="absolute top-[30%] right-[-16rem] h-[40rem] w-[40rem] rounded-full bg-violet-500/[0.055] blur-3xl" />
      <div className="absolute bottom-[-18rem] left-[20%] h-[36rem] w-[36rem] rounded-full bg-cyan-400/[0.045] blur-3xl" />
      <div className="absolute top-24 right-[8%] h-72 w-72 rotate-45 rounded-[4rem] border border-amber-300/[0.055]" />
      <div className="absolute top-40 right-[12%] h-48 w-48 rotate-45 rounded-[3rem] border border-cyan-300/[0.045]" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(circle at 70% 20%, black, transparent 58%)",
        }}
      />
    </div>
  );
}

function CoursePathEmblem({
  weekCount,
  arc,
}: {
  weekCount: number;
  arc?: string;
}) {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[19rem]"
      aria-hidden="true"
    >
      <div className="absolute inset-[3%] rounded-full bg-amber-300/10 blur-3xl" />
      <div className="absolute inset-[7%] rounded-full border border-amber-200/15 shadow-[inset_0_0_60px_rgba(251,191,36,0.06),0_0_60px_rgba(251,191,36,0.08)]" />
      <div className="absolute inset-[19%] rotate-45 rounded-[2.25rem] border border-cyan-200/15 bg-cyan-300/[0.025]" />
      <div className="absolute inset-[29%] rounded-full border border-violet-200/15 bg-zinc-950/70 shadow-[0_0_45px_rgba(167,139,250,0.1)]" />
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-amber-200/25 bg-amber-300/[0.09] text-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.12)]">
            <Compass className="h-6 w-6" />
          </span>
          <p className="mt-3 text-3xl font-semibold text-white">{weekCount}</p>
          <p className="font-mono text-[10px] tracking-[0.18em] text-zinc-400 uppercase">
            guided weeks
          </p>
        </div>
      </div>
      <span className="absolute top-[13%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-amber-200 shadow-[0_0_18px_rgba(253,230,138,0.9)]" />
      <span className="absolute top-1/2 right-[12%] h-2 w-2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_16px_rgba(165,243,252,0.75)]" />
      <span className="absolute bottom-[14%] left-[28%] h-2 w-2 rounded-full bg-violet-200 shadow-[0_0_16px_rgba(221,214,254,0.7)]" />
      <div className="absolute right-0 bottom-[7%] flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-xl">
        <Sparkles className="h-3.5 w-3.5 text-amber-200" />
        <span className="max-w-32 truncate font-mono text-[9px] tracking-[0.14em] text-zinc-300 uppercase">
          {arc || "A Prismarium path"}
        </span>
      </div>
    </div>
  );
}

function CourseDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [access, setAccess] = useState<CourseAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

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
          throw new Error(data.error || "Failed to fetch course");
        }
        const data = await res.json();
        if (data.success && data.course) {
          setCourse(data.course);
          setAccess(data.access || null);
        } else {
          throw new Error(data.error || "Course not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [authLoading, slug]);

  // Fetch enrollment status once course is loaded and user is known
  useEffect(() => {
    if (
      !course ||
      !user ||
      authLoading ||
      !isCourseAvailable(getCourseReleaseStatus(course))
    ) {
      return;
    }

    const fetchEnrollment = async () => {
      setEnrollmentLoading(true);
      try {
        const res = await fetch(`/api/courses/${slug}/enroll`);
        const data = await res.json();
        if (data.success && data.enrollment) {
          setEnrollment(data.enrollment);
        }
      } catch (err) {
        console.error("Error fetching enrollment:", err);
      } finally {
        setEnrollmentLoading(false);
      }
    };

    fetchEnrollment();
  }, [course, user, authLoading, slug]);

  const handleEnroll = async () => {
    setEnrollmentError(null);

    if (!course || !isCourseAvailable(getCourseReleaseStatus(course))) {
      setEnrollmentError("This path isn’t available yet.");
      return;
    }

    if (!user) {
      router.push(`/login?redirect=/courses/${slug}`);
      return;
    }

    setIsEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${slug}/enroll`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.enrollment) {
        setEnrollment(data.enrollment);
        router.push(`/courses/${slug}/learn`);
      } else if (res.status === 402 || data.code === "UPGRADE_REQUIRED") {
        router.push("/profile?tab=subscription");
      } else if (res.status === 401) {
        router.push(`/login?redirect=/courses/${slug}`);
      } else {
        setEnrollmentError("We couldn’t start this path. Please try again.");
      }
    } catch (err) {
      console.error("Enrollment failed:", err);
      setEnrollmentError("We couldn’t start this path. Please try again.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const getCourseTypeLabel = (type: string | null) => {
    switch (type) {
      case "foundational":
        return "Foundational";
      case "theme":
        return "Theme";
      case "rotation":
        return "Rotation";
      default:
        return "Course";
    }
  };

  const getLevelLabel = (level: string | null) => {
    switch (level) {
      case "foundational":
        return "Foundational";
      case "intermediate":
        return "Intermediate";
      case "advanced":
        return "Advanced";
      default:
        return "All Levels";
    }
  };

  const renderRichText = (
    content: string | null,
    fallbackClassName = "text-zinc-400 leading-relaxed"
  ) => {
    if (!content) return null;
    const trimmed = content.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const html = tiptapToHtml(content);
        if (html)
          return (
            <div
              className={PROSE_CLASSES}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
      } catch {
        /* fall through */
      }
    }
    return <p className={fallbackClassName}>{content}</p>;
  };

  const renderedContent = course?.content ? tiptapToHtml(course.content) : "";
  const currentWeek = enrollment?.current_week || 1;
  const totalWeeks = course?.duration_weeks || 8;
  const progressPct = Math.min(
    100,
    Math.round((currentWeek / totalWeeks) * 100)
  );
  const upgradeRequired = access?.upgradeRequired === true;
  const isFreeCourse = access?.tier === "free";

  // Structured content fields from JSONB
  const courseContent = course?.content as Record<string, unknown> | null;
  const coreQuestion = courseContent?.core_question as string | undefined;
  const courseIdTag = courseContent?.course_id_tag as string | undefined;
  const arc = courseContent?.arc as string | undefined;
  const arcPosition = courseContent?.arc_position as number | undefined;
  const previewWeeks = Array.isArray(courseContent?.weeks)
    ? (courseContent.weeks as CoursePreviewWeek[])
    : [];
  const curatorNote = (courseContent?.curator_note_public ||
    courseContent?.curator_note) as string | undefined;
  const releaseStatus = course ? getCourseReleaseStatus(course) : null;
  const courseAvailable = releaseStatus
    ? isCourseAvailable(releaseStatus)
    : false;
  const introductionCourse = course ? isIntroductionCourse(course) : false;

  return (
    <div className="flex min-h-screen flex-col bg-[#09090b] font-sans text-zinc-200 selection:bg-amber-300/30">
      <Header />

      <CoursePreviewAtmosphere />

      <main className="relative z-10 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <Link
            href="/courses"
            className="group mb-8 inline-flex items-center gap-2 font-mono text-xs tracking-wide text-zinc-500 uppercase transition-colors hover:text-amber-400"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Courses
          </Link>

          {error && !authLoading && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-900/10 p-4">
              <h3 className="mb-1 font-mono text-sm tracking-wide text-red-400 uppercase">
                We couldn’t open this path
              </h3>
              <p className="text-sm text-red-400/70">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="animate-pulse space-y-8">
              <div className="h-12 w-3/4 rounded-lg border border-white/5 bg-zinc-900/50" />
              <div className="flex gap-4">
                <div className="h-6 w-24 rounded bg-zinc-900/50" />
                <div className="h-6 w-24 rounded bg-zinc-900/50" />
              </div>
              <div className="h-64 rounded-lg border border-white/5 bg-zinc-900/30" />
            </div>
          ) : course ? (
            <div className="space-y-8 md:space-y-10">
              {/* Header */}
              <section className="relative overflow-hidden rounded-[2rem] border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.075] via-zinc-900/80 to-violet-400/[0.055] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.38)] md:p-10 lg:p-12">
                <div
                  className="absolute -top-28 -left-20 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl"
                  aria-hidden="true"
                />
                <div
                  className="absolute right-[18%] -bottom-40 h-80 w-80 rounded-full bg-cyan-300/[0.06] blur-3xl"
                  aria-hidden="true"
                />
                <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,.75fr)] lg:items-center">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-amber-200 uppercase">
                      <Compass className="h-4 w-4" aria-hidden="true" />
                      Course preview
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {courseIdTag && (
                        <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-amber-200 uppercase">
                          {courseIdTag}
                        </span>
                      )}
                      {releaseStatus && (
                        <CourseReleaseBadge status={releaseStatus} />
                      )}
                      {(introductionCourse || course.course_type) && (
                        <span
                          className={`rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.14em] uppercase ${
                            introductionCourse ||
                            course.course_type === "foundational"
                              ? "border-amber-300/25 bg-amber-300/[0.07] text-amber-200"
                              : "border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-200"
                          }`}
                        >
                          {introductionCourse
                            ? "Introduction"
                            : getCourseTypeLabel(course.course_type)}
                        </span>
                      )}
                      {arc && (
                        <span className="font-mono text-[10px] tracking-[0.12em] text-zinc-400 uppercase">
                          {arc}
                          {arcPosition ? ` · ${arcPosition}` : ""}
                        </span>
                      )}
                    </div>

                    <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance text-white md:text-6xl">
                      {course.title}
                    </h1>

                    {coreQuestion && (
                      <p className="mt-6 max-w-2xl text-lg leading-8 text-amber-100/90 italic md:text-xl">
                        {coreQuestion}
                      </p>
                    )}

                    <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/10 pt-6 font-mono text-xs tracking-[0.08em] text-zinc-300 uppercase">
                      {course.duration_weeks && (
                        <div className="flex items-center gap-2">
                          <Clock
                            className="h-4 w-4 text-amber-300"
                            aria-hidden="true"
                          />
                          <span>{course.duration_weeks} weeks</span>
                        </div>
                      )}
                      {course.level && (
                        <div className="flex items-center gap-2">
                          <GraduationCap
                            className="h-4 w-4 text-cyan-300"
                            aria-hidden="true"
                          />
                          <span>{getLevelLabel(course.level)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <BookOpen
                          className="h-4 w-4 text-violet-300"
                          aria-hidden="true"
                        />
                        <span>{course.course_texts?.length || 0} readings</span>
                      </div>
                    </div>
                  </div>
                  <CoursePathEmblem weekCount={totalWeeks} arc={arc} />
                </div>
              </section>

              {/* Curator's Note */}
              {curatorNote && (
                <section className="relative overflow-hidden rounded-[1.75rem] border border-cyan-300/20 bg-cyan-300/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] md:p-8">
                  <div
                    className="absolute -top-20 right-0 h-48 w-48 rounded-full bg-cyan-300/[0.07] blur-3xl"
                    aria-hidden="true"
                  />
                  <h2 className="relative flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-cyan-200 uppercase">
                    <Feather className="h-4 w-4" aria-hidden="true" />
                    Why I chose this path
                  </h2>
                  <div className="relative mt-5 max-w-4xl text-base leading-7 whitespace-pre-line text-zinc-300 md:text-lg md:leading-8">
                    {curatorNote}
                  </div>
                </section>
              )}

              {/* Premise */}
              {course.premise && (
                <div className="relative overflow-hidden rounded-[1.75rem] border border-amber-300/20 bg-amber-300/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] md:p-8">
                  <div
                    className="absolute -right-8 -bottom-10 opacity-[0.07]"
                    aria-hidden="true"
                  >
                    <BookOpen className="h-44 w-44 text-amber-200" />
                  </div>
                  <h2 className="relative flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-amber-200 uppercase">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Why this question
                  </h2>
                  <div className="relative z-10 mt-5 max-w-4xl text-lg leading-8 text-zinc-200 italic md:text-xl md:leading-9">
                    {renderRichText(course.premise, "text-zinc-200")}
                  </div>
                </div>
              )}

              {/* Content grid */}
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
                <div className="space-y-8 md:space-y-10">
                  {course.description && (
                    <div className="rounded-[1.75rem] border border-white/10 bg-zinc-900/65 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] md:p-8">
                      <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-amber-200 uppercase">
                        <Compass className="h-4 w-4" aria-hidden="true" />
                        About this path
                      </h2>
                      {renderRichText(course.description)}
                    </div>
                  )}

                  {/* Core Texts Section */}
                  {course.course_texts && course.course_texts.length > 0 && (
                    <div className="rounded-[1.75rem] border border-white/10 bg-zinc-900/50 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-8">
                      <h2 className="mb-6 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-cyan-200 uppercase">
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        Readings we’ll use
                      </h2>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {course.course_texts.map((ct) => (
                          <Link
                            key={ct.id}
                            href={`/library/${ct.text_id}`}
                            className="group relative flex min-h-32 gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 transition duration-200 ease-out hover:border-amber-300/35 hover:bg-amber-300/[0.035] focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:outline-none"
                          >
                            <div className="h-24 w-16 flex-shrink-0">
                              <div className="h-full w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-800 shadow-lg">
                                {ct.texts?.cover_image_url ? (
                                  <img
                                    src={ct.texts.cover_image_url}
                                    alt={ct.texts.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-zinc-500" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col justify-center py-1">
                              <h3 className="line-clamp-2 text-sm font-bold text-zinc-100 transition-colors group-hover:text-amber-300">
                                {ct.texts?.title}
                              </h3>
                              <p className="mt-1 font-mono text-xs text-zinc-300">
                                {ct.texts?.author || "Unknown Author"}
                              </p>
                            </div>

                            {/* Full-screen spotlight preview on hover */}
                            <div
                              aria-hidden="true"
                              className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/80 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none motion-reduce:group-hover:opacity-0 motion-reduce:group-focus-visible:opacity-0"
                            >
                              <div className="flex scale-95 flex-col items-center gap-6 transition-transform duration-300 ease-out group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:transform-none">
                                {ct.texts?.cover_image_url ? (
                                  <img
                                    src={ct.texts.cover_image_url}
                                    alt=""
                                    className="h-[70vh] max-h-[640px] w-auto rounded-xl border border-amber-500/30 shadow-[0_30px_80px_-20px_rgba(245,158,11,0.45)]"
                                  />
                                ) : (
                                  <div className="flex aspect-[2/3] h-[70vh] max-h-[640px] items-center justify-center rounded-xl border border-amber-500/30 bg-zinc-900">
                                    <BookOpen className="h-24 w-24 text-zinc-600" />
                                  </div>
                                )}
                                <div className="max-w-2xl px-6 text-center">
                                  <h3 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                                    {ct.texts?.title}
                                  </h3>
                                  <p className="mt-2 font-mono text-sm tracking-wider text-amber-300 uppercase">
                                    {ct.texts?.author || "Unknown Author"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {renderedContent && (
                    <div className="rounded-[1.75rem] border border-white/10 bg-zinc-900/50 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-8">
                      <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-amber-200 uppercase">
                        <Layers3 className="h-4 w-4" aria-hidden="true" />
                        The path
                      </h2>
                      <div
                        className={PROSE_CLASSES}
                        dangerouslySetInnerHTML={{ __html: renderedContent }}
                      />
                    </div>
                  )}

                  {previewWeeks.length > 0 && (
                    <div className="rounded-[1.75rem] border border-white/10 bg-zinc-900/50 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-8">
                      <h2 className="mb-6 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-amber-200 uppercase">
                        <Layers3 className="h-4 w-4" aria-hidden="true" />A look
                        at the path
                      </h2>
                      <div className="relative space-y-4 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-px before:bg-gradient-to-b before:from-amber-300/60 before:via-cyan-300/30 before:to-violet-300/10">
                        {previewWeeks.map((week) => {
                          const summary = week.description || week.week_summary;
                          return (
                            <div
                              key={`${week.week_number}-${week.title}`}
                              className="relative ml-11 rounded-2xl border border-white/10 bg-black/25 p-5 transition duration-200 hover:border-amber-300/20 hover:bg-white/[0.035]"
                            >
                              <span className="absolute top-4 -left-[3.25rem] grid h-10 w-10 place-items-center rounded-xl border border-amber-300/25 bg-zinc-950 font-mono text-xs text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.12)]">
                                {String(week.week_number || 0).padStart(2, "0")}
                              </span>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                {week.week_number && (
                                  <span className="font-mono text-[10px] tracking-wider text-amber-300 uppercase">
                                    Week {week.week_number}
                                  </span>
                                )}
                                {week.key_tension && (
                                  <span className="font-mono text-[10px] text-zinc-300">
                                    {week.key_tension}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm font-semibold text-zinc-100">
                                {week.title || `Week ${week.week_number}`}
                              </h3>
                              {week.core_question && (
                                <p className="mt-1 text-sm text-amber-300 italic">
                                  {week.core_question}
                                </p>
                              )}
                              {summary && (
                                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                                  {summary}
                                </p>
                              )}
                              {week.readings && week.readings.length > 0 && (
                                <p className="mt-3 font-mono text-xs text-zinc-400">
                                  {week.readings.length} public reading
                                  reference
                                  {week.readings.length === 1 ? "" : "s"}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {course.learning_outcomes &&
                    course.learning_outcomes.length > 0 && (
                      <div className="rounded-[1.75rem] border border-violet-300/15 bg-violet-300/[0.035] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-8">
                        <h2 className="mb-6 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-violet-200 uppercase">
                          <Target className="h-4 w-4" aria-hidden="true" />
                          What we’ll explore
                        </h2>
                        <ul className="grid gap-3">
                          {course.learning_outcomes.map((outcome, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300"
                            >
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-200 font-mono text-xs font-semibold text-zinc-950">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="pt-1.5">{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>

                {/* ── Enrollment Sidebar ── */}
                <div className="lg:border-l lg:border-white/10 lg:pl-8">
                  <div className="sticky top-24 space-y-4">
                    <div className="relative overflow-hidden rounded-[1.75rem] border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.08] via-zinc-900/90 to-cyan-300/[0.045] p-1 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
                      <div
                        className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl"
                        aria-hidden="true"
                      />
                      <div className="relative rounded-[1.5rem] border border-white/10 bg-black/65 p-6 backdrop-blur-xl">
                        <p className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-amber-200 uppercase">
                          <Sparkles
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Enter the path
                        </p>
                        <h3 className="mb-1 text-base font-bold text-white">
                          {!courseAvailable
                            ? "Not available yet"
                            : enrollment
                              ? "You’re on this path"
                              : upgradeRequired
                                ? "This path is for members"
                                : "Start this path"}
                        </h3>

                        {!courseAvailable ? (
                          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                              <Lock
                                className="h-4 w-4 text-zinc-500"
                                aria-hidden="true"
                              />
                              This course is not open yet.
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                              You can read this preview, but starting the course
                              and its learning materials will become available
                              when it opens.
                            </p>
                          </div>
                        ) : enrollmentLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                          </div>
                        ) : enrollment ? (
                          <>
                            <p className="mb-4 text-xs text-zinc-400">
                              You’re on{" "}
                              <span className="font-mono text-amber-400">
                                Week {currentWeek}
                              </span>{" "}
                              of {totalWeeks}
                            </p>

                            {/* Progress bar */}
                            <div className="mb-5 h-0.5 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-500 motion-reduce:transition-none"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>

                            <Link
                              href={`/courses/${course.slug}/learn`}
                              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 hover:shadow-[0_0_28px_rgba(253,230,138,0.18)] focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:outline-none"
                            >
                              <BookOpen className="h-4 w-4" />
                              Continue this path · Week {currentWeek}
                            </Link>
                          </>
                        ) : (
                          <>
                            <p className="mb-5 text-xs text-zinc-400">
                              {upgradeRequired
                                ? "How to Hold Two Things at Once and taster paths are open to everyone. Join Prismarium to start this path."
                                : introductionCourse
                                  ? `${course?.title} stays open as the introduction. Start whenever you’re ready.`
                                  : isFreeCourse
                                    ? "This taster path is open to everyone. Start whenever you’re ready."
                                    : "Start this path and keep your reading, notes, and progress together."}
                            </p>

                            <button
                              type="button"
                              onClick={handleEnroll}
                              disabled={isEnrolling}
                              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 hover:shadow-[0_0_28px_rgba(253,230,138,0.18)] focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isEnrolling ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  {upgradeRequired ? (
                                    <Lock className="h-4 w-4" />
                                  ) : (
                                    <BookOpen className="h-4 w-4" />
                                  )}
                                  {user
                                    ? upgradeRequired
                                      ? "Join to start"
                                      : "Start this path"
                                    : "Log in to start"}
                                </>
                              )}
                            </button>

                            {enrollmentError && (
                              <p className="mt-3 rounded-md border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs leading-relaxed text-red-300">
                                {enrollmentError}
                              </p>
                            )}

                            {!user && (
                              <p className="mt-3 text-center font-mono text-[10px] leading-relaxed text-zinc-400">
                                Log in or join Prismarium to save your place.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-zinc-900/55 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
                      <h4 className="mb-2 font-mono text-[10px] tracking-wider text-amber-400 uppercase">
                        <ShieldCheck
                          className="mr-1.5 inline h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        About these materials
                      </h4>
                      <p className="text-xs leading-relaxed text-zinc-400">
                        Public previews are shareable with attribution. Full
                        Prismarium course prompts, exercises, sequencing, and
                        artifacts are for personal use inside Prismarium unless
                        written permission is granted.
                      </p>
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
            <div className="h-0.5 w-64 overflow-hidden rounded-full bg-zinc-900">
              <div className="animate-loading-bar h-full w-1/2 bg-amber-500" />
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
