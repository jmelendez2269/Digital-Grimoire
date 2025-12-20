'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Calendar, Clock, Search, GraduationCap, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { tiptapToText } from '@/lib/tiptap/render';

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

function CoursesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Read search query from URL params on mount
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchQuery(decodeURIComponent(urlSearch));
    }
  }, [searchParams]);

  // Fetch courses
  useEffect(() => {
    if (authLoading) return;

    const fetchCourses = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (filterType !== 'all') params.append('type', filterType);
        if (filterLevel !== 'all') params.append('level', filterLevel);
        params.append('published', 'true'); // Only show published courses

        const response = await fetch(`/api/courses?${params.toString()}`);
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch courses');
        }

        const data = await response.json();
        if (data.success) {
          setCourses(data.courses || []);
        } else {
          throw new Error(data.error || 'Failed to fetch courses');
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [authLoading, searchQuery, filterType, filterLevel]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

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

  // Helper to clean description by removing redundant metadata
  const cleanDescription = (text: string | null | undefined): string | null => {
    if (!text || typeof text !== 'string') return null;
    
    let cleaned = text;
    
    // Remove the entire metadata block that appears in the description
    // Pattern matches: "Course Length: X weeksLevel: ... (no prior...)Orientation: ..."
    // This removes everything from "Course Length:" through "Orientation:" and the text after it
    // until we hit a proper sentence (starts with capital letter followed by lowercase)
    cleaned = cleaned.replace(/Course\s*Length:.*?Orientation:\s*[A-Z][a-z]*?\s*[a-z]*?\.\.\./gi, '');
    cleaned = cleaned.replace(/Course\s*Length:.*?Orientation:\s*[^\n]*?(?=\s+[A-Z][a-z]|$)/gi, '');
    
    // Remove "A Synthesis Course for the Seeker" if it appears as a prefix before metadata
    cleaned = cleaned.replace(/^A\s+Synthesis\s+Course\s+for\s+the\s+Seeker\s+(?=Course\s*Length:)/i, '');
    
    // Clean up any remaining individual metadata fragments
    cleaned = cleaned.replace(/Course\s*Length:\s*\d+\s*weeks?/gi, '');
    cleaned = cleaned.replace(/Level:\s*[^\n(]*?(?=\s*\(|Orientation:|$)/gi, '');
    cleaned = cleaned.replace(/\(no\s+prior\s+academic\s+training\s+required\)/gi, '');
    cleaned = cleaned.replace(/Orientation:\s*[^\n]*?(?=\s+[A-Z][a-z]|$)/gi, '');
    cleaned = cleaned.replace(/\bFoundational-Intermediate\b/gi, '');
    
    // Clean up multiple spaces and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  };

  // Helper to safely extract text from description/premise (handles JSON strings)
  const getTextPreview = (text: string | null | undefined, maxLength: number = 150): string | null => {
    if (!text || typeof text !== 'string') return null;
    
    // Check if it's a JSON string (starts with { or [)
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        // If it's TipTap JSON, extract text
        const extracted = tiptapToText(parsed);
        if (extracted) {
          const cleaned = cleanDescription(extracted);
          if (cleaned) {
            return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
          }
          return extracted.length > maxLength ? extracted.substring(0, maxLength) + '...' : extracted;
        }
      } catch {
        // Not valid JSON, treat as plain text
      }
    }
    
    // Clean the text first, then truncate if needed
    const cleaned = cleanDescription(text);
    if (!cleaned) return null;
    
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <div className="border-b border-amber-900/20 bg-zinc-900/50">
          <div className="max-w-screen-2xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-amber-100 mb-2">
                  Convergence Courses
                </h1>
                <p className="text-zinc-400">
                  Explore foundational courses and rotating themes
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/60 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10 pr-4 py-2 text-sm bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 transition-colors w-64"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 text-sm hover:bg-zinc-800/50 hover:border-amber-600/50 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-zinc-900/30 border border-amber-900/20 rounded-lg">
                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <label className="block text-xs font-medium text-amber-100/60 mb-2">
                      Course Type
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-1.5 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-600/50"
                    >
                      <option value="all">All Types</option>
                      <option value="foundational">Foundational</option>
                      <option value="theme">Theme</option>
                      <option value="rotation">Rotation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-100/60 mb-2">
                      Level
                    </label>
                    <select
                      value={filterLevel}
                      onChange={(e) => setFilterLevel(e.target.value)}
                      className="px-3 py-1.5 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-600/50"
                    >
                      <option value="all">All Levels</option>
                      <option value="foundational">Foundational</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-screen-2xl mx-auto px-4 py-8">
          {/* Error State */}
          {error && !authLoading && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-400 mb-1">Error Loading Courses</h3>
                  <p className="text-sm text-red-300/80">{error}</p>
                  {!user && (
                    <Link
                      href="/login"
                      className="inline-block mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Go to Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/30 border border-amber-900/20 rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-zinc-800/50 rounded w-3/4" />
                    <div className="h-4 bg-zinc-800/50 rounded w-full" />
                    <div className="h-4 bg-zinc-800/50 rounded w-2/3" />
                    <div className="flex gap-2 mt-4">
                      <div className="h-6 bg-zinc-800/50 rounded w-20" />
                      <div className="h-6 bg-zinc-800/50 rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
              <h3 className="text-lg font-medium text-amber-100 mb-2">
                {searchQuery || filterType !== 'all' || filterLevel !== 'all'
                  ? 'No courses found'
                  : 'No courses available yet'}
              </h3>
              <p className="text-sm text-amber-100/60 mb-6">
                {searchQuery || filterType !== 'all' || filterLevel !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Courses will appear here once they are published'}
              </p>
            </div>
          ) : (
            /* Courses Grid */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug || course.id}`}
                  className="bg-zinc-900/30 border border-amber-900/20 rounded-xl overflow-hidden hover:border-amber-600/50 hover:bg-zinc-900/50 transition-all group"
                >
                  <div className="p-6">
                    {/* Course Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-amber-100 group-hover:text-amber-400 transition-colors mb-2">
                          {course.title}
                        </h3>
                        {course.course_type && (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-amber-600/20 text-amber-400 rounded">
                            {getCourseTypeLabel(course.course_type)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Course Description */}
                    {(() => {
                      const descriptionText = getTextPreview(course.description, 500);
                      return descriptionText ? (
                        <p className="text-sm text-zinc-400 mb-4 line-clamp-6">
                          {descriptionText}
                        </p>
                      ) : null;
                    })()}

                    {/* Course Premise */}
                    {(() => {
                      const premiseText = getTextPreview(course.premise, 300);
                      return premiseText ? (
                        <p className="text-sm text-amber-100/80 italic mb-4 line-clamp-3">
                          {premiseText}
                        </p>
                      ) : null;
                    })()}

                    {/* Course Metadata */}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mt-4 pt-4 border-t border-amber-900/20">
                      {course.duration_weeks && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{course.duration_weeks} week</span>
                        </div>
                      )}
                      {course.level && (
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          <span>{getLevelLabel(course.level)}</span>
                        </div>
                      )}
                    </div>

                    {/* Learning Outcomes Preview */}
                    {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-amber-900/20">
                        <p className="text-xs font-medium text-amber-100/60 mb-2">
                          Learning Outcomes:
                        </p>
                        <ul className="text-xs text-zinc-400 space-y-1">
                          {course.learning_outcomes.map((outcome, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-600 mt-1">•</span>
                              <span className="line-clamp-2">{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Link>
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
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
          <Header />
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          </div>
          <Footer />
        </div>
      }
    >
      <CoursesPageContent />
    </Suspense>
  );
}
