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
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-200 font-sans selection:bg-amber-500/30">
      <Header />
      <main className="flex-1 relative">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-900/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px]" />
        </div>

        {/* Page Header */}
        <div className="relative z-10 border-b border-white/10 bg-zinc-900/30 backdrop-blur-md">
          <div className="max-w-screen-2xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-8 bg-amber-500/50" />
                  <span className="text-[10px] uppercase tracking-wider font-mono text-amber-500">System.Courses</span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Convergence Courses
                </h1>
                <p className="text-zinc-400 mt-2 max-w-xl">
                  Explore foundational and thematic knowledge modules. Select a node to begin access.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Bar - Terminal Style */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-cyan-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-amber-500/60" />
                    <input
                      type="text"
                      placeholder="SEARCH_COURSES..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-lg text-amber-500 placeholder-amber-500/30 font-mono text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 w-64 transition-all"
                    />
                  </div>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${showFilters
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-zinc-900/40 border-white/10 text-zinc-400 hover:text-amber-400 hover:border-amber-500/30'
                    }`}
                >
                  <Filter className="w-4 h-4" />
                  FILTERS
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-6 p-6 bg-black/40 border border-white/10 rounded-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-8 flex-wrap">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-mono text-amber-500/60">
                      Module Type
                    </label>
                    <div className="flex gap-2">
                      {['all', 'foundational', 'theme', 'rotation'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-3 py-1.5 text-xs font-mono border rounded uppercase transition-colors ${filterType === type
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : 'bg-transparent border-white/10 text-zinc-500 hover:border-amber-500/30 hover:text-amber-400/80'
                            }`}
                        >
                          {type === 'all' ? 'All Types' : type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-mono text-amber-500/60">
                      Access Level
                    </label>
                    <div className="flex gap-2">
                      {['all', 'foundational', 'intermediate', 'advanced'].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setFilterLevel(lvl)}
                          className={`px-3 py-1.5 text-xs font-mono border rounded uppercase transition-colors ${filterLevel === lvl
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                            : 'bg-transparent border-white/10 text-zinc-500 hover:border-cyan-500/30 hover:text-cyan-400/80'
                            }`}
                        >
                          {lvl === 'all' ? 'All Levels' : lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 py-8">

          {/* MVP Info Banner */}
          <div className="mb-8 p-6 bg-gradient-to-br from-amber-500/5 to-cyan-500/5 border border-amber-500/20 rounded-lg backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <GraduationCap className="w-24 h-24 text-amber-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">First Edition</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">2026</span>
              </div>
              <h3 className="text-lg font-bold text-amber-100 mb-2">Welcome to the Academy</h3>
              <p className="text-sm text-zinc-400 max-w-2xl mb-4">
                This is our inaugural course module. We will be releasing more specialized courses throughout the year as the curriculum expands.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-500/80 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                YOUR FEEDBACK IS IMPORTANT AND WELCOME
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && !authLoading && (
            <div className="mb-6 p-4 bg-red-900/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-red-500/10 rounded">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-mono text-red-400 mb-1 uppercase tracking-wide">Error: Failed to Load Courses</h3>
                  <p className="text-sm text-red-400/70">{error}</p>
                  {!user && (
                    <Link
                      href="/login"
                      className="inline-block mt-3 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-xs font-mono uppercase tracking-wide transition-colors"
                    >
                      &gt; Authenticate
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
                  className="bg-zinc-900/20 border border-white/5 rounded-lg overflow-hidden h-64 animate-pulse"
                >
                  <div className="h-full w-full bg-gradient-to-b from-transparent to-black/20" />
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            /* Empty State */
            <div className="text-center py-24 border border-white/5 rounded-2xl bg-zinc-900/10 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-white/10 flex items-center justify-center mb-6">
                <GraduationCap className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-mono text-zinc-300 mb-2 uppercase tracking-wide">
                {searchQuery || filterType !== 'all' || filterLevel !== 'all'
                  ? 'No matching modules found'
                  : 'No modules available'}
              </h3>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                {searchQuery || filterType !== 'all' || filterLevel !== 'all'
                  ? 'Adjust your query parameters to find data.'
                  : 'Course availability is currently null. Check back later.'}
              </p>
            </div>
          ) : (
            /* Courses Grid - Data Nodes */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug || course.id}`}
                  className="group relative flex flex-col h-full bg-zinc-900/40 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all duration-300"
                >
                  {/* Card specific gradients */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-amber-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />



                  <div className="p-6 flex-1 flex flex-col relative z-10">
                    {/* Course Header */}
                    <div className="mb-4">
                      {course.course_type && (
                        <div className="mb-3">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded ${course.course_type === 'foundational'
                            ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                            : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                            }`}>
                            {getCourseTypeLabel(course.course_type)}
                          </span>
                        </div>
                      )}

                      <h3 className="text-xl font-bold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-2">
                        {course.title}
                      </h3>
                    </div>

                    {/* Course Description */}
                    <div className="flex-1 mb-6">
                      {(() => {
                        const descriptionText = getTextPreview(course.description, 180);
                        return descriptionText ? (
                          <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                            {descriptionText}
                          </p>
                        ) : (
                          <p className="text-sm text-zinc-600 italic">No briefing available.</p>
                        );
                      })()}
                    </div>

                    {/* Course Metadata */}
                    <div className="flex items-center gap-4 pt-4 border-t border-white/5 text-xs text-zinc-500 font-mono">
                      {course.duration_weeks && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{course.duration_weeks} WKS</span>
                        </div>
                      )}
                      {course.level && (
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${course.level === 'foundational' ? 'bg-amber-500' :
                            course.level === 'intermediate' ? 'bg-cyan-500' : 'bg-purple-500'
                            }`} />
                          <span className="uppercase">{course.level}</span>
                        </div>
                      )}
                    </div>
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

