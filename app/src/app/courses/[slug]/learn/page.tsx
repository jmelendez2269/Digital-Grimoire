'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    BookOpen,
    ChevronDown,
    ChevronRight,
    CheckCircle,
    Circle,
    Menu,
    X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Reading {
    text_id: string;
    title: string;
    notes?: string;
    status?: 'completed' | 'pending';
}

interface Week {
    week_number: number;
    title: string;
    description: string;
    readings: Reading[];
}

interface Course {
    id: string;
    title: string;
    slug: string;
    content: {
        weeks: Week[];
    } | null;
}

function CourseLearnContent() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null); // Week number
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [readingProgress, setReadingProgress] = useState<Record<string, boolean>>({});

    const slug = params?.slug as string;

    useEffect(() => {
        if (authLoading) return;

        // Check authentication
        if (!user) {
            // Optional: Redirect to login or show restricted access
            // router.push(`/login?redirect=/courses/${slug}/learn`);
        }

        if (!slug) return;

        const fetchCourse = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch course data
                const courseResponse = await fetch(`/api/courses/${slug}`);

                if (!courseResponse.ok) {
                    const data = await courseResponse.json();
                    throw new Error(data.error || 'Failed to fetch course');
                }

                const courseData = await courseResponse.json();

                if (courseData.success && courseData.course) {
                    setCourse(courseData.course);

                    // Auto-select first week if available
                    if (courseData.course.content?.weeks?.length > 0) {
                        const sortedWeeks = courseData.course.content.weeks.sort((a: Week, b: Week) => a.week_number - b.week_number);
                        setSelectedWeek(sortedWeeks[0].week_number);
                    }
                } else {
                    throw new Error(courseData.error || 'Course not found');
                }

                // Fetch reading progress
                try {
                    const progressResponse = await fetch('/api/reading-progress');
                    if (progressResponse.ok) {
                        const progressData = await progressResponse.json();
                        const progressMap: Record<string, boolean> = {};
                        if (Array.isArray(progressData.progress)) {
                            progressData.progress.forEach((p: any) => {
                                if (p.text_id && p.completed) {
                                    progressMap[p.text_id] = true;
                                }
                            });
                        }
                        setReadingProgress(progressMap);
                    }
                } catch (progressErr) {
                    console.error('Error fetching reading progress:', progressErr);
                    // Don't fail the whole page load if progress fetch fails
                }

            } catch (err) {
                console.error('Error fetching course:', err);
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [authLoading, slug, user, router]);

    const toggleReadingComplete = async (textId: string) => {
        if (!textId) return;

        const isCompleted = !!readingProgress[textId];
        const newStatus = !isCompleted;

        // Optimistic update
        setReadingProgress(prev => ({
            ...prev,
            [textId]: newStatus
        }));

        try {
            const response = await fetch('/api/reading-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text_id: textId,
                    completed: newStatus,
                    progress_percent: newStatus ? 100 : 0 // Reset or maximize based on state? Usually 100 on complete.
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update progress');
            }
        } catch (err) {
            console.error('Error toggling completion:', err);
            // Revert on error
            setReadingProgress(prev => ({
                ...prev,
                [textId]: isCompleted
            }));
        }
    };

    const getCurrentWeek = () => {
        if (!course?.content?.weeks || selectedWeek === null) return null;
        return course.content.weeks.find(w => w.week_number === selectedWeek);
    };

    const currentWeekContent = getCurrentWeek();

    // Sort weeks for sidebar
    const sortedWeeks = course?.content?.weeks?.slice().sort((a, b) => a.week_number - b.week_number) || [];

    return (
        <div className="flex h-screen flex-col bg-zinc-950 text-zinc-200 font-sans selection:bg-amber-500/30 overflow-hidden">
            {/* Navigation Bar */}
            <Header />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile Menu Button - Positioned over content/sidebar when needed or part of sub-nav */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute top-4 left-4 z-50 md:hidden p-2 bg-zinc-900/80 border border-white/10 rounded-lg text-zinc-400 hover:text-white"
                >
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                {/* Sidebar Navigation */}
                <aside className={`
                absolute md:relative inset-y-0 left-0 z-20 w-80 bg-black/60 backdrop-blur-xl border-r border-white/5 transition-transform duration-300 transform
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'}
            `}>
                    <div className="h-full overflow-y-auto w-80">
                        <div className="p-4">
                            <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-4 px-2">Course Syllabus</h2>
                            <div className="space-y-1">
                                {sortedWeeks.map((week) => (
                                    <button
                                        key={week.week_number}
                                        onClick={() => {
                                            setSelectedWeek(week.week_number);
                                            if (window.innerWidth < 768) setSidebarOpen(false);
                                        }}
                                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${selectedWeek === week.week_number
                                            ? 'bg-amber-500/10 text-amber-100 border border-amber-500/20'
                                            : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-1 min-w-[24px]">
                                            <span className="text-[10px] font-mono opacity-50">WK</span>
                                            <span className="text-lg font-bold leading-none">{week.week_number}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{week.title || `Week ${week.week_number}`}</p>
                                            <p className="text-xs opacity-60 truncate">{week.readings?.length || 0} readings</p>
                                        </div>
                                        {selectedWeek === week.week_number && (
                                            <ChevronRight className="w-4 h-4 text-amber-500 mt-1" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-zinc-950 relative">
                    {/* Background ambient light */}
                    <div className="fixed inset-0 pointer-events-none z-0">
                        <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-amber-900/5 rounded-full blur-[100px]" />
                    </div>

                    <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                        {loading ? (
                            <div className="animate-pulse space-y-8">
                                <div className="h-8 bg-zinc-900 rounded w-1/3" />
                                <div className="h-32 bg-zinc-900 rounded" />
                                <div className="space-y-4">
                                    <div className="h-16 bg-zinc-900 rounded" />
                                    <div className="h-16 bg-zinc-900 rounded" />
                                </div>
                            </div>
                        ) : error ? (
                            <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-lg">
                                <h3 className="text-red-400 font-mono mb-2">ERROR_LOAD_FAILED</h3>
                                <p className="text-zinc-400">{error}</p>
                            </div>
                        ) : currentWeekContent ? (
                            <div className="space-y-12 animate-in fade-in duration-500">
                                {/* Week Header */}
                                <div>
                                    <div className="flex items-center gap-3 text-amber-500 mb-4">
                                        <span className="px-2 py-0.5 border border-amber-500/30 bg-amber-500/10 rounded text-xs font-mono uppercase tracking-wider">
                                            Week {currentWeekContent.week_number}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                        {currentWeekContent.title}
                                    </h2>
                                    {currentWeekContent.description && (
                                        <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl">
                                            {currentWeekContent.description}
                                        </p>
                                    )}
                                </div>

                                {/* Readings List */}
                                <div>
                                    <h3 className="flex items-center gap-2 text-sm font-mono text-zinc-500 uppercase tracking-wider mb-6">
                                        <BookOpen className="w-4 h-4" />
                                        Required Readings
                                    </h3>

                                    <div className="grid gap-4">
                                        {currentWeekContent.readings?.map((reading, idx) => {
                                            const isCompleted = !!readingProgress[reading.text_id];
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`group relative border rounded-lg p-6 transition-all ${isCompleted
                                                        ? 'bg-emerald-950/10 border-emerald-500/20 hover:bg-emerald-950/20'
                                                        : 'bg-zinc-900/30 border-white/5 hover:border-amber-500/30 hover:bg-zinc-900/50'
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex-1">
                                                            <h4 className={`text-lg font-semibold transition-colors mb-2 ${isCompleted ? 'text-emerald-300' : 'text-zinc-200 group-hover:text-amber-100'
                                                                }`}>
                                                                {reading.title}
                                                            </h4>
                                                            {reading.notes && (
                                                                <p className="text-sm text-zinc-400 italic">
                                                                    "{reading.notes}"
                                                                </p>
                                                            )}

                                                            <div className="mt-4 flex gap-3">
                                                                <Link
                                                                    href={`/library?text=${reading.text_id}`}
                                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-zinc-300 transition-colors"
                                                                >
                                                                    <BookOpen className="w-3.5 h-3.5" />
                                                                    Open in Library
                                                                </Link>
                                                            </div>
                                                        </div>

                                                        {/* Status Indicator */}
                                                        <button
                                                            onClick={() => toggleReadingComplete(reading.text_id)}
                                                            className={`transition-all duration-300 ${isCompleted
                                                                ? 'text-emerald-500 hover:text-emerald-400 scale-110'
                                                                : 'text-zinc-600 hover:text-emerald-500'
                                                                }`}
                                                            title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
                                                        >
                                                            {isCompleted ? (
                                                                <CheckCircle className="w-8 h-8 fill-emerald-500/20" />
                                                            ) : (
                                                                <Circle className="w-8 h-8" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {(!currentWeekContent.readings || currentWeekContent.readings.length === 0) && (
                                            <div className="p-8 border border-dashed border-white/10 rounded-lg text-center text-zinc-500 italic">
                                                No readings assigned for this week.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20">
                                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
                                    <BookOpen className="w-8 h-8 text-zinc-600" />
                                </div>
                                <h3 className="text-zinc-400 font-medium">Select a week to begin</h3>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function CourseLearnPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-zinc-950 flex items-center justify-center text-amber-500">Loading Interface...</div>}>
            <CourseLearnContent />
        </Suspense>
    );
}
