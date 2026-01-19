'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BookOpen, Search, Filter, Eye, EyeOff, Edit, Plus, CheckCircle, XCircle } from 'lucide-react';
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
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterPublished, setFilterPublished] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    checkAdminAndFetchCourses();
  }, [filterType, filterLevel, filterPublished]);

  const checkAdminAndFetchCourses = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setIsAdmin(true);
    await fetchCourses();
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterType !== 'all') params.append('type', filterType);
      if (filterLevel !== 'all') params.append('level', filterLevel);
      if (filterPublished === 'true') params.append('published', 'true');
      else if (filterPublished === 'false') params.append('published', 'false');
      // If 'all', don't add published param to show all

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
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (courseId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', courseId);

      if (error) throw error;

      // Update local state
      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, is_published: !currentStatus, updated_at: new Date().toISOString() }
          : course
      ));
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Failed to update course status');
    }
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
        return 'N/A';
    }
  };

  // Helper to clean description by removing redundant metadata
  const cleanDescription = (text: string | null | undefined): string | null => {
    if (!text || typeof text !== 'string') return null;
    
    let cleaned = text;
    
    // Remove the entire metadata block that appears in the description
    cleaned = cleaned.replace(/Course\s*Length:.*?Orientation:\s*[A-Z][a-z]*?\s*[a-z]*?\.\.\./gi, '');
    cleaned = cleaned.replace(/Course\s*Length:.*?Orientation:\s*[^\n]*?(?=\s+[A-Z][a-z]|$)/gi, '');
    cleaned = cleaned.replace(/^A\s+Synthesis\s+Course\s+for\s+the\s+Seeker\s+(?=Course\s*Length:)/i, '');
    cleaned = cleaned.replace(/Course\s*Length:\s*\d+\s*weeks?/gi, '');
    cleaned = cleaned.replace(/Level:\s*[^\n(]*?(?=\s*\(|Orientation:|$)/gi, '');
    cleaned = cleaned.replace(/\(no\s+prior\s+academic\s+training\s+required\)/gi, '');
    cleaned = cleaned.replace(/Orientation:\s*[^\n]*?(?=\s+[A-Z][a-z]|$)/gi, '');
    cleaned = cleaned.replace(/\bFoundational-Intermediate\b/gi, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  };

  // Helper to safely extract text from description/premise (handles JSON strings)
  const getTextPreview = (text: string | null | undefined, maxLength: number = 200): string | null => {
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCourses();
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-zinc-950 text-amber-50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-amber-100 mb-2">
                    Course Management
                  </h1>
                  <p className="text-amber-100/60">
                    Manage all courses (published and unpublished)
                  </p>
                </div>
                <Link
                  href="/admin/upload"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Course
                </Link>
              </div>

              {/* Search and Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/60 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 transition-colors"
                  />
                </form>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 text-sm hover:bg-zinc-800/50 hover:border-amber-600/50 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
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

                    <div>
                      <label className="block text-xs font-medium text-amber-100/60 mb-2">
                        Published Status
                      </label>
                      <select
                        value={filterPublished}
                        onChange={(e) => setFilterPublished(e.target.value)}
                        className="px-3 py-1.5 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-600/50"
                      >
                        <option value="all">All</option>
                        <option value="true">Published</option>
                        <option value="false">Unpublished</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-amber-100/60">Loading courses...</p>
                </div>
              </div>
            ) : courses.length === 0 ? (
              /* Empty State */
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
                <h3 className="text-lg font-medium text-amber-100 mb-2">
                  {searchQuery || filterType !== 'all' || filterLevel !== 'all' || filterPublished !== 'all'
                    ? 'No courses found'
                    : 'No courses available yet'}
                </h3>
                <p className="text-sm text-amber-100/60 mb-6">
                  {searchQuery || filterType !== 'all' || filterLevel !== 'all' || filterPublished !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first course to get started'}
                </p>
              </div>
            ) : (
              /* Courses List */
              <div className="space-y-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6 hover:border-amber-600/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-amber-100">
                            {course.title}
                          </h3>
                          {course.is_published ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-600/20 text-green-400 rounded border border-green-600/30 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Published
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-zinc-600/20 text-zinc-400 rounded border border-zinc-600/30 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Unpublished
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-amber-100/60 mb-3">
                          {course.course_type && (
                            <span className="px-2 py-1 bg-amber-600/20 text-amber-400 rounded text-xs">
                              {getCourseTypeLabel(course.course_type)}
                            </span>
                          )}
                          {course.level && (
                            <span className="text-amber-100/60">
                              Level: {getLevelLabel(course.level)}
                            </span>
                          )}
                          {course.duration_weeks && (
                            <span className="text-amber-100/60">
                              {course.duration_weeks} weeks
                            </span>
                          )}
                          <span className="text-amber-100/40">
                            Created: {new Date(course.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {(() => {
                          const descriptionText = getTextPreview(course.description, 200);
                          return descriptionText ? (
                            <p className="text-sm text-amber-100/70 mb-3 line-clamp-2">
                              {descriptionText}
                            </p>
                          ) : null;
                        })()}

                        {course.slug && (
                          <div className="text-xs text-amber-100/50">
                            Slug: <code className="bg-zinc-800/50 px-1 py-0.5 rounded">{course.slug}</code>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePublish(course.id, course.is_published)}
                          className={`p-2 rounded-lg transition-colors ${
                            course.is_published
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-100'
                              : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400'
                          }`}
                          title={course.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {course.is_published ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <Link
                          href={`/courses/${course.slug || course.id}`}
                          target="_blank"
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg transition-colors"
                          title="View Course"
                        >
                          <BookOpen className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/courses/${course.id}`}
                          className="p-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg transition-colors"
                          title="Edit Course"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats Summary */}
            {!loading && courses.length > 0 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
                  <div className="text-amber-100/60 text-sm mb-1">Total Courses</div>
                  <div className="text-2xl font-bold text-amber-100">{courses.length}</div>
                </div>
                <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
                  <div className="text-amber-100/60 text-sm mb-1">Published</div>
                  <div className="text-2xl font-bold text-green-400">
                    {courses.filter(c => c.is_published).length}
                  </div>
                </div>
                <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
                  <div className="text-amber-100/60 text-sm mb-1">Unpublished</div>
                  <div className="text-2xl font-bold text-zinc-400">
                    {courses.filter(c => !c.is_published).length}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

