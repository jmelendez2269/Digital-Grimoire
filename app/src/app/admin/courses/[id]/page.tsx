'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, Save, ArrowLeft, BookOpen, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import CourseEditor from '@/components/CourseEditor';

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

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [premise, setPremise] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([]);
  const [newOutcome, setNewOutcome] = useState('');
  const [courseType, setCourseType] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [durationWeeks, setDurationWeeks] = useState<number | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [courseContent, setCourseContent] = useState<Record<string, any>>({});
  const [availableTexts, setAvailableTexts] = useState<Array<{ id: string; title: string; author: string | null }>>([]);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  const courseId = params.id as string;

  useEffect(() => {
    if (courseId) {
      checkAdminAndFetchCourse();
    }
  }, [courseId]);

  const checkAdminAndFetchCourse = async () => {
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
    await fetchCourse();
  };

  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/courses/${courseId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load course');
      }

      const courseData = data.course;
      setCourse(courseData);
      setTitle(courseData.title || '');
      setSlug(courseData.slug || '');
      
      // Handle description - could be JSON string, object, or plain text
      if (courseData.description) {
        if (typeof courseData.description === 'string') {
          // If it's already a string, use it directly (could be JSON string or plain text)
          setDescription(courseData.description);
        } else if (typeof courseData.description === 'object') {
          // If it's an object, stringify it
          setDescription(JSON.stringify(courseData.description));
        } else {
          setDescription('');
        }
      } else {
        setDescription('');
      }
      
      // Handle premise - could be JSON string, object, or plain text
      if (courseData.premise) {
        if (typeof courseData.premise === 'string') {
          setPremise(courseData.premise);
        } else if (typeof courseData.premise === 'object') {
          setPremise(JSON.stringify(courseData.premise));
        } else {
          setPremise('');
        }
      } else {
        setPremise('');
      }
      
      setLearningOutcomes(courseData.learning_outcomes || []);
      setCourseType(courseData.course_type || '');
      setLevel(courseData.level || '');
      setDurationWeeks(courseData.duration_weeks || null);
      setIsPublished(courseData.is_published || false);
      setCourseContent(courseData.content || {});
      
      // Start with all weeks collapsed by default
      setExpandedWeeks(new Set());
      
      // Fetch available texts for dropdowns
      await fetchAvailableTexts();
    } catch (err) {
      console.error('Error fetching course:', err);
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTexts = async () => {
    try {
      setLoadingTexts(true);
      const response = await fetch('/api/texts?limit=1000&sortBy=title&sortOrder=asc');
      const data = await response.json();
      
      if (response.ok && data.texts) {
        setAvailableTexts(data.texts.map((text: any) => ({
          id: text.id,
          title: text.title || 'Untitled',
          author: text.author || null,
        })));
      }
    } catch (err) {
      console.error('Error fetching texts:', err);
    } finally {
      setLoadingTexts(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      if (!title.trim()) {
        setError('Title is required');
        return;
      }

      if (!slug.trim()) {
        setError('Slug is required');
        return;
      }

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          premise: premise.trim() || null,
          learning_outcomes: learningOutcomes,
          course_type: courseType || null,
          level: level || null,
          duration_weeks: durationWeeks || null,
          is_published: isPublished,
          content: courseContent,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update course');
      }

      setCourse(data.course);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating course:', err);
      setError(err instanceof Error ? err.message : 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const addOutcome = () => {
    if (newOutcome.trim() && !learningOutcomes.includes(newOutcome.trim())) {
      setLearningOutcomes([...learningOutcomes, newOutcome.trim()]);
      setNewOutcome('');
    }
  };

  const removeOutcome = (outcomeToRemove: string) => {
    setLearningOutcomes(learningOutcomes.filter(o => o !== outcomeToRemove));
  };

  // Course weeks/readings management
  const getWeeks = () => {
    if (!courseContent.weeks || !Array.isArray(courseContent.weeks)) {
      return [];
    }
    return courseContent.weeks.sort((a: any, b: any) => (a.week_number || 0) - (b.week_number || 0));
  };

  const addWeek = () => {
    const weeks = getWeeks();
    const newWeekNumber = weeks.length > 0 
      ? Math.max(...weeks.map((w: any) => w.week_number || 0)) + 1
      : 1;
    
    const newWeek = {
      week_number: newWeekNumber,
      title: '',
      description: '',
      readings: [],
    };
    
    setCourseContent({
      ...courseContent,
      weeks: [...weeks, newWeek],
    });
    setExpandedWeeks(new Set([...expandedWeeks, newWeekNumber]));
  };

  const updateWeek = (weekIndex: number, updates: any) => {
    const weeks = getWeeks();
    const updatedWeeks = [...weeks];
    updatedWeeks[weekIndex] = { ...updatedWeeks[weekIndex], ...updates };
    
    setCourseContent({
      ...courseContent,
      weeks: updatedWeeks,
    });
  };

  const removeWeek = (weekIndex: number) => {
    const weeks = getWeeks();
    const updatedWeeks = weeks.filter((_: any, idx: number) => idx !== weekIndex);
    
    setCourseContent({
      ...courseContent,
      weeks: updatedWeeks,
    });
  };

  const addReadingToWeek = (weekIndex: number) => {
    const weeks = getWeeks();
    const week = weeks[weekIndex];
    const updatedReadings = [...(week.readings || []), { text_id: '', title: '', notes: '' }];
    
    updateWeek(weekIndex, { readings: updatedReadings });
  };

  const updateReading = (weekIndex: number, readingIndex: number, updates: any) => {
    const weeks = getWeeks();
    const week = weeks[weekIndex];
    const readings = [...(week.readings || [])];
    readings[readingIndex] = { ...readings[readingIndex], ...updates };
    
    updateWeek(weekIndex, { readings });
  };

  const removeReading = (weekIndex: number, readingIndex: number) => {
    const weeks = getWeeks();
    const week = weeks[weekIndex];
    const readings = (week.readings || []).filter((_: any, idx: number) => idx !== readingIndex);
    
    updateWeek(weekIndex, { readings });
  };

  const toggleWeekExpanded = (weekNumber: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedWeeks(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(weekNumber)) {
        newExpanded.delete(weekNumber);
      } else {
        newExpanded.add(weekNumber);
      }
      return newExpanded;
    });
  };

  const getTextDisplayName = (textId: string) => {
    const text = availableTexts.find(t => t.id === textId);
    if (!text) return textId;
    return text.author ? `${text.title} by ${text.author}` : text.title;
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-amber-50">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-zinc-950 text-amber-50">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
            <Link
              href="/admin/courses"
              className="inline-block mt-4 text-amber-400 hover:text-amber-300"
            >
              Return to Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-zinc-950 text-amber-50">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <Link
                href="/admin/courses"
                className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Courses
              </Link>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-amber-100 mb-2">Edit Course</h1>
                  <p className="text-amber-100/60">
                    Update course information and settings
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Success Alert */}
            {success && (
              <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-400">Course updated successfully!</p>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Edit Form */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-100">Basic Information</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-amber-100/80 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Course title"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-amber-100/80 mb-2">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                      placeholder="course-slug"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                      required
                    />
                    <p className="text-xs text-amber-100/50 mt-1">
                      URL-friendly identifier (lowercase, hyphens only)
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-amber-100/80 mb-2">
                        Course Type
                      </label>
                      <select
                        value={courseType}
                        onChange={(e) => setCourseType(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:border-amber-600/50"
                      >
                        <option value="">Select type</option>
                        <option value="foundational">Foundational</option>
                        <option value="theme">Theme</option>
                        <option value="rotation">Rotation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-amber-100/80 mb-2">
                        Level
                      </label>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:border-amber-600/50"
                      >
                        <option value="">Select level</option>
                        <option value="foundational">Foundational</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-amber-100/80 mb-2">
                      Duration (weeks)
                    </label>
                    <input
                      type="number"
                      value={durationWeeks || ''}
                      onChange={(e) => setDurationWeeks(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="8"
                      min="1"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-100">Description</h3>
                </div>
                <div>
                  <label className="block text-sm text-amber-100/80 mb-2">
                    Course Description
                  </label>
                  <CourseEditor
                    content={description || ''}
                    onUpdate={(content) => setDescription(content)}
                    placeholder="Describe the course content, objectives, and approach..."
                  />
                </div>
              </div>

              {/* Premise */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-100">Premise</h3>
                </div>
                <div>
                  <label className="block text-sm text-amber-100/80 mb-2">
                    Course Premise Statement
                  </label>
                  <CourseEditor
                    content={premise || ''}
                    onUpdate={(content) => setPremise(content)}
                    placeholder="The core premise or foundational statement for this course..."
                  />
                </div>
              </div>

              {/* Learning Outcomes */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-100">Learning Outcomes</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addOutcome()}
                      placeholder="Add a learning outcome..."
                      className="flex-1 px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                    />
                    <button
                      onClick={addOutcome}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  {learningOutcomes.length > 0 && (
                    <div className="space-y-2">
                      {learningOutcomes.map((outcome, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 flex items-center justify-between"
                        >
                          <span>{outcome}</span>
                          <button
                            onClick={() => removeOutcome(outcome)}
                            className="text-amber-100/50 hover:text-amber-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Course Weeks */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                    <h3 className="text-lg font-semibold text-amber-100">Course Weeks</h3>
                  </div>
                  <button
                    onClick={addWeek}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Week
                  </button>
                </div>
                
                {loadingTexts ? (
                  <div className="text-center py-4 text-amber-100/60">Loading texts...</div>
                ) : (
                  <div className="space-y-4">
                    {getWeeks().map((week: any, weekIndex: number) => {
                      const weekNumber = week.week_number || weekIndex + 1;
                      const isExpanded = expandedWeeks.has(weekNumber);
                      
                      return (
                        <div key={weekIndex} className="bg-zinc-800/50 border border-amber-900/30 rounded-lg overflow-hidden">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                type="button"
                                onClick={(e) => toggleWeekExpanded(weekNumber, e)}
                                className="flex items-center gap-2 text-amber-100 hover:text-amber-400 transition-colors cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                                <h4 className="text-lg font-semibold">
                                  Week {weekNumber}: {week.title || 'Untitled Week'}
                                </h4>
                              </button>
                              <button
                                onClick={() => removeWeek(weekIndex)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Remove week"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {isExpanded && (
                              <div className="mt-4 space-y-4">
                                <div>
                                  <label className="block text-sm text-amber-100/80 mb-2">
                                    Week Title
                                  </label>
                                  <input
                                    type="text"
                                    value={week.title || ''}
                                    onChange={(e) => updateWeek(weekIndex, { title: e.target.value })}
                                    placeholder="Week title"
                                    className="w-full px-4 py-2 bg-zinc-900 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm text-amber-100/80 mb-2">
                                    Week Description
                                  </label>
                                  <textarea
                                    value={week.description || ''}
                                    onChange={(e) => updateWeek(weekIndex, { description: e.target.value })}
                                    placeholder="Week description..."
                                    rows={3}
                                    className="w-full px-4 py-2 bg-zinc-900 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 resize-none"
                                  />
                                </div>
                                
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm text-amber-100/80">
                                      Readings
                                    </label>
                                    <button
                                      onClick={() => addReadingToWeek(weekIndex)}
                                      className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded text-sm font-medium transition-colors flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Reading
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {(week.readings || []).map((reading: any, readingIndex: number) => (
                                      <div key={readingIndex} className="flex gap-2 items-start">
                                        <select
                                          value={reading.text_id || ''}
                                          onChange={(e) => {
                                            const selectedText = availableTexts.find(t => t.id === e.target.value);
                                            updateReading(weekIndex, readingIndex, {
                                              text_id: e.target.value,
                                              title: selectedText?.title || '',
                                            });
                                          }}
                                          className="flex-1 px-4 py-2 bg-zinc-900 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:border-amber-600/50"
                                        >
                                          <option value="">Select a text...</option>
                                          {availableTexts.map((text) => (
                                            <option key={text.id} value={text.id}>
                                              {text.author ? `${text.title} by ${text.author}` : text.title}
                                            </option>
                                          ))}
                                        </select>
                                        <input
                                          type="text"
                                          value={reading.notes || ''}
                                          onChange={(e) => updateReading(weekIndex, readingIndex, { notes: e.target.value })}
                                          placeholder="Notes (optional)"
                                          className="flex-1 px-4 py-2 bg-zinc-900 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                                        />
                                        <button
                                          onClick={() => removeReading(weekIndex, readingIndex)}
                                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                          title="Remove reading"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                    {(!week.readings || week.readings.length === 0) && (
                                      <p className="text-sm text-amber-100/50 italic">No readings added yet</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {getWeeks().length === 0 && (
                      <p className="text-center py-8 text-amber-100/50">No weeks added yet. Click "Add Week" to get started.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Publishing */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-amber-100 mb-1">Publishing</h3>
                    <p className="text-sm text-amber-100/60">
                      Control whether this course is visible to students
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-800/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    <span className="ml-3 text-sm font-medium text-amber-100">
                      {isPublished ? 'Published' : 'Unpublished'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
                {course && (
                  <Link
                    href={`/courses/${course.slug || course.id}`}
                    target="_blank"
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    View Course
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

