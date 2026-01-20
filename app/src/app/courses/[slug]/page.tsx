'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, GraduationCap, BookOpen, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { tiptapToHtml } from '@/lib/tiptap/render';

const PROSE_CLASSES = `prose prose-invert prose-amber max-w-none
  prose-headings:text-amber-100
  prose-p:text-zinc-300
  prose-strong:text-amber-200
  prose-em:text-amber-200
  prose-code:text-amber-300
  prose-code:bg-zinc-800/50
  prose-code:px-1
  prose-code:py-0.5
  prose-code:rounded
  prose-pre:bg-zinc-900/50
  prose-pre:border
  prose-pre:border-amber-900/20
  prose-blockquote:border-amber-600/50
  prose-blockquote:text-zinc-400
  prose-a:text-amber-400
  prose-a:hover:text-amber-300
  prose-ul:text-zinc-300
  prose-ol:text-zinc-300
  prose-li:text-zinc-300`;

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
  content: Record<string, any> | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

function CourseDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = params?.slug as string;

  useEffect(() => {
    if (authLoading || !slug) return;

    const fetchCourse = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/courses/${slug}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch course');
        }

        const data = await response.json();
        if (data.success && data.course) {
          setCourse(data.course);
        } else {
          throw new Error(data.error || 'Course not found');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [authLoading, slug]);

  const getCourseTypeLabel = (type: string | null) => {
    switch (type) {
      case 'foundational':
        return 'Foundational';
      case 'theme':
        return 'Theme';
      case 'rotation':
        return 'Rotation';
      default:
        return 'Course';
    }
  };

  const getLevelLabel = (level: string | null) => {
    switch (level) {
      case 'foundational':
        return 'Foundational';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      default:
        return 'All Levels';
    }
  };

  const renderRichText = (content: string | null, fallbackClassName: string = 'text-zinc-300 leading-relaxed') => {
    if (!content) return null;

    // Check if it looks like a JSON object/array (simple heuristic)
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const html = tiptapToHtml(content);
        if (html) {
          return (
            <div
              className={PROSE_CLASSES}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
      } catch (e) {
        // Fallback to plain text if something goes wrong
      }
    }

    // Plain text fallback
    return <p className={fallbackClassName}>{content}</p>;
  };

  const renderedContent = course?.content ? tiptapToHtml(course.content) : '';

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-amber-100/60 hover:text-amber-400 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>

          {/* Error State */}
          {error && !authLoading && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-400 mb-1">Error Loading Course</h3>
                  <p className="text-sm text-red-300/80">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="space-y-6">
              <div className="h-8 bg-zinc-800/50 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-zinc-800/50 rounded w-full animate-pulse" />
              <div className="h-4 bg-zinc-800/50 rounded w-2/3 animate-pulse" />
            </div>
          ) : course ? (
            <div className="space-y-8">
              {/* Course Header */}
              <div className="border-b border-amber-900/20 pb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold text-amber-100 mb-3">
                      {course.title}
                    </h1>
                    {course.course_type && (
                      <span className="inline-block px-3 py-1 text-sm font-medium bg-amber-600/20 text-amber-400 rounded">
                        {getCourseTypeLabel(course.course_type)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Course Metadata */}
                <div className="flex items-center gap-6 text-sm text-zinc-400 mt-4">
                  {course.duration_weeks && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration_weeks} weeks</span>
                    </div>
                  )}
                  {course.level && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>{getLevelLabel(course.level)}</span>
                    </div>
                  )}
                  {course.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(course.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Description */}
              {course.description && (
                <div>
                  <h2 className="text-xl font-semibold text-amber-100 mb-3">Description</h2>
                  {renderRichText(course.description)}
                </div>
              )}

              {/* Course Premise */}
              {course.premise && (
                <div>
                  <h2 className="text-xl font-semibold text-amber-100 mb-3">Premise</h2>
                  {renderRichText(course.premise, "text-amber-100/80 italic leading-relaxed")}
                </div>
              )}

              {/* Learning Outcomes */}
              {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-amber-100 mb-3">Learning Outcomes</h2>
                  <ul className="space-y-2">
                    {course.learning_outcomes.map((outcome, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-zinc-300">
                        <span className="text-amber-600 mt-1">•</span>
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Course Content */}
              {renderedContent && (
                <div>
                  <h2 className="text-xl font-semibold text-amber-100 mb-3">Course Content</h2>
                  <div
                    className={PROSE_CLASSES}
                    dangerouslySetInnerHTML={{ __html: renderedContent }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-6 border-t border-amber-900/20">
                <Link
                  href={`/courses/${course.slug}/learn`}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                >
                  <BookOpen className="w-4 h-4 inline-block mr-2" />
                  Start Course
                </Link>
                <Link
                  href="/courses"
                  className="px-6 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-amber-100 rounded-lg font-medium transition-colors"
                >
                  Browse More Courses
                </Link>
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
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
          <Header />
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          </div>
          <Footer />
        </div>
      }
    >
      <CourseDetailContent />
    </Suspense>
  );
}
