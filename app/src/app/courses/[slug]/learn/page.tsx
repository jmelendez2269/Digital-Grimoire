'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    BookOpen,
    ChevronRight,
    CheckCircle,
    Circle,
    Menu,
    X,
    Compass,
    Search,
    PenTool,
    Share2,
    Sparkles,
    ExternalLink,
    Bookmark,
    Globe,
    ArrowRight,
    Lock,
    Unlock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reading {
    text_id?: string;
    title: string;
    notes?: string;
    author?: string;
    section?: string;
    selection_rationale?: string;
    sort_order?: number;
    tiers?: {
        keystone: { reference: string; description: string };
        passage: { reference: string; description: string };
        full: { reference: string; description: string };
    };
    status?: 'completed' | 'pending';
}

interface LensExercise {
    prompt: string;
    instructions?: string[];
    lens_config?: Record<string, number>;
}

interface SynthesisPrompt {
    prompt: string;
    expansion?: string[];
}

interface MicroArtifact {
    name: string;
    description: string;
    purpose: string;
    capstone_connection: string;
}

interface Week {
    week_number: number;
    title: string;
    description?: string;
    core_question?: string;
    key_tension?: string;
    lens_focus?: string[];
    readings: Reading[];
    lens_exercise?: LensExercise;
    synthesis_prompt?: SynthesisPrompt;
    micro_artifact?: MicroArtifact;
    concept_seeds?: string[];
    week_type?: 'standard' | 'capstone';
}

interface Course {
    id: string;
    title: string;
    slug: string;
    content: {
        weeks: Week[];
        concept_seeds?: string[];
    } | null;
}

// ─── Section Tab Type ─────────────────────────────────────────────────────────

type SectionTab = 'readings' | 'lens' | 'concepts' | 'synthesis' | 'community';

// ─── Main Component ──────────────────────────────────────────────────────────

function CourseLearnContent() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [readingProgress, setReadingProgress] = useState<Record<string, boolean>>({});
    const [activeSection, setActiveSection] = useState<SectionTab>('readings');
    const [synthesisText, setSynthesisText] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedPageId, setSavedPageId] = useState<string | null>(null);
    const [contributionSent, setContributionSent] = useState(false);
    const [communityResponses, setCommunityResponses] = useState<any[]>([]);
    const [communityGated, setCommunityGated] = useState(true);
    const [communityLoading, setCommunityLoading] = useState(false);

    const slug = params?.slug as string;

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            // Optional: router.push(`/login?redirect=/courses/${slug}/learn`);
        }
        if (!slug) return;

        const fetchCourse = async () => {
            setLoading(true);
            setError(null);

            try {
                const courseResponse = await fetch(`/api/courses/${slug}`);
                if (!courseResponse.ok) {
                    const data = await courseResponse.json();
                    throw new Error(data.error || 'Failed to fetch course');
                }
                const courseData = await courseResponse.json();

                if (courseData.success && courseData.course) {
                    setCourse(courseData.course);
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

    // Reset section state when week changes
    useEffect(() => {
        setActiveSection('readings');
        setSynthesisText('');
        setSavedPageId(null);
        setContributionSent(false);
        setCommunityResponses([]);
        setCommunityGated(true);
    }, [selectedWeek]);

    const toggleReadingComplete = async (textId: string) => {
        if (!textId) return;
        const isCompleted = !!readingProgress[textId];
        const newStatus = !isCompleted;

        setReadingProgress(prev => ({ ...prev, [textId]: newStatus }));

        try {
            const response = await fetch('/api/reading-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text_id: textId,
                    completed: newStatus,
                    progress_percent: newStatus ? 100 : 0
                }),
            });
            if (!response.ok) throw new Error('Failed to update progress');
        } catch (err) {
            console.error('Error toggling completion:', err);
            setReadingProgress(prev => ({ ...prev, [textId]: isCompleted }));
        }
    };

    const saveSynthesisToJournal = async () => {
        if (!course || selectedWeek === null || !synthesisText.trim()) return;
        const currentWeek = getCurrentWeek();
        if (!currentWeek) return;

        setSaving(true);
        try {
            const content = {
                type: 'doc',
                content: [
                    {
                        type: 'heading',
                        attrs: { level: 2 },
                        content: [{ type: 'text', text: currentWeek.synthesis_prompt?.prompt || 'Synthesis Response' }],
                    },
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: synthesisText }],
                    },
                ],
            };

            const response = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `${currentWeek.micro_artifact?.name || `Week ${selectedWeek} Synthesis`} — ${course.title}`,
                    content,
                    icon: '🎯',
                    course_id: course.id,
                    week_number: selectedWeek,
                    entry_type: 'synthesis',
                    artifact_name: currentWeek.micro_artifact?.name || null,
                }),
            });

            if (!response.ok) throw new Error('Failed to save');
            const data = await response.json();
            setSavedPageId(data.page.id);
        } catch (err) {
            console.error('Error saving synthesis:', err);
        } finally {
            setSaving(false);
        }
    };

    const contributeToCommmunity = async () => {
        if (!savedPageId || !course || selectedWeek === null) return;
        try {
            const response = await fetch('/api/community/contribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    journal_page_id: savedPageId,
                    course_id: course.id,
                    week_number: selectedWeek,
                }),
            });
            if (response.ok) {
                setContributionSent(true);
                loadCommunityResponses();
            }
        } catch (err) {
            console.error('Error contributing:', err);
        }
    };

    const loadCommunityResponses = async () => {
        if (!course || selectedWeek === null) return;
        setCommunityLoading(true);
        try {
            const response = await fetch(`/api/community/contribute?course_id=${course.id}&week_number=${selectedWeek}`);
            if (response.ok) {
                const data = await response.json();
                setCommunityResponses(data.contributions || []);
                setCommunityGated(false);
            } else if (response.status === 403) {
                setCommunityGated(true);
            }
        } catch (err) {
            console.error('Error loading community responses:', err);
        } finally {
            setCommunityLoading(false);
        }
    };

    const getCurrentWeek = (): Week | null => {
        if (!course?.content?.weeks || selectedWeek === null) return null;
        return course.content.weeks.find(w => w.week_number === selectedWeek) || null;
    };

    const currentWeek = getCurrentWeek();
    const sortedWeeks = course?.content?.weeks?.slice().sort((a, b) => a.week_number - b.week_number) || [];

    // Determine available sections for this week
    const availableSections: { id: SectionTab; label: string; icon: any; available: boolean }[] = [
        { id: 'readings', label: 'Readings', icon: BookOpen, available: true },
        { id: 'lens', label: 'Lens Exercise', icon: Compass, available: !!currentWeek?.lens_exercise },
        { id: 'concepts', label: 'Concept Seeds', icon: Search, available: !!(currentWeek?.concept_seeds && currentWeek.concept_seeds.length > 0) },
        { id: 'synthesis', label: 'Synthesis', icon: PenTool, available: !!currentWeek?.synthesis_prompt },
        { id: 'community', label: 'Community', icon: Globe, available: !!currentWeek?.synthesis_prompt },
    ];

    // Calculate reading completion for sidebar
    const getWeekReadingCompletion = (week: Week) => {
        if (!week.readings?.length) return { completed: 0, total: 0 };
        const completed = week.readings.filter(r => r.text_id && !!readingProgress[r.text_id]).length;
        return { completed, total: week.readings.length };
    };

    return (
        <div className="flex h-screen flex-col bg-zinc-950 text-zinc-200 font-sans selection:bg-amber-500/30 overflow-hidden">
            <Header />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile Menu Button */}
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
                                {sortedWeeks.map((week) => {
                                    const completion = getWeekReadingCompletion(week);
                                    const hasActivity = !!week.lens_exercise || !!week.synthesis_prompt;
                                    return (
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
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] opacity-60">
                                                        {completion.completed}/{completion.total} readings
                                                    </span>
                                                    {hasActivity && (
                                                        <span className="flex items-center gap-0.5">
                                                            {week.lens_exercise && <Compass className="w-2.5 h-2.5 text-purple-400/60" />}
                                                            {week.synthesis_prompt && <PenTool className="w-2.5 h-2.5 text-amber-400/60" />}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {selectedWeek === week.week_number && (
                                                <ChevronRight className="w-4 h-4 text-amber-500 mt-1" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-zinc-950 relative">
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
                        ) : currentWeek ? (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {/* Week Header */}
                                <div>
                                    <div className="flex items-center gap-3 text-amber-500 mb-3">
                                        <span className="px-2 py-0.5 border border-amber-500/30 bg-amber-500/10 rounded text-xs font-mono uppercase tracking-wider">
                                            Week {currentWeek.week_number}
                                        </span>
                                        {currentWeek.week_type === 'capstone' && (
                                            <span className="px-2 py-0.5 border border-purple-500/30 bg-purple-500/10 rounded text-xs font-mono uppercase tracking-wider text-purple-400">
                                                Capstone
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                        {currentWeek.title}
                                    </h2>
                                    {currentWeek.core_question && (
                                        <p className="text-lg text-amber-200/80 italic mb-2">
                                            &ldquo;{currentWeek.core_question}&rdquo;
                                        </p>
                                    )}
                                    {currentWeek.key_tension && (
                                        <p className="text-sm text-zinc-500">
                                            <span className="text-zinc-600">Key tension:</span> {currentWeek.key_tension}
                                        </p>
                                    )}
                                    {currentWeek.lens_focus && currentWeek.lens_focus.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {currentWeek.lens_focus.map((lens, i) => (
                                                <span key={i} className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-white/10 bg-white/5 rounded text-zinc-400">
                                                    {lens}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Section Tabs */}
                                <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/5 pb-px">
                                    {availableSections.filter(s => s.available).map(section => {
                                        const Icon = section.icon;
                                        const isActive = activeSection === section.id;
                                        return (
                                            <button
                                                key={section.id}
                                                onClick={() => {
                                                    setActiveSection(section.id);
                                                    if (section.id === 'community') loadCommunityResponses();
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap ${isActive
                                                    ? 'bg-white/5 text-amber-300 border-b-2 border-amber-500'
                                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {section.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Section Content */}
                                <div className="min-h-[400px]">
                                    {/* ── Readings Section ─────────────────────────────────── */}
                                    {activeSection === 'readings' && (
                                        <ReadingsSection
                                            readings={currentWeek.readings}
                                            readingProgress={readingProgress}
                                            onToggleComplete={toggleReadingComplete}
                                        />
                                    )}

                                    {/* ── Lens Exercise Section ────────────────────────────── */}
                                    {activeSection === 'lens' && currentWeek.lens_exercise && (
                                        <LensExerciseSection
                                            exercise={currentWeek.lens_exercise}
                                            courseSlug={slug}
                                        />
                                    )}

                                    {/* ── Concept Seeds Section ────────────────────────────── */}
                                    {activeSection === 'concepts' && currentWeek.concept_seeds && (
                                        <ConceptSeedsSection seeds={currentWeek.concept_seeds} />
                                    )}

                                    {/* ── Synthesis Section ────────────────────────────────── */}
                                    {activeSection === 'synthesis' && currentWeek.synthesis_prompt && (
                                        <SynthesisSection
                                            prompt={currentWeek.synthesis_prompt}
                                            artifact={currentWeek.micro_artifact}
                                            text={synthesisText}
                                            onChange={setSynthesisText}
                                            onSave={saveSynthesisToJournal}
                                            saving={saving}
                                            savedPageId={savedPageId}
                                            onContribute={contributeToCommmunity}
                                            contributionSent={contributionSent}
                                        />
                                    )}

                                    {/* ── Community Section ────────────────────────────────── */}
                                    {activeSection === 'community' && (
                                        <CommunitySection
                                            responses={communityResponses}
                                            gated={communityGated}
                                            loading={communityLoading}
                                        />
                                    )}
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

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ReadingsSection({
    readings,
    readingProgress,
    onToggleComplete,
}: {
    readings: Reading[];
    readingProgress: Record<string, boolean>;
    onToggleComplete: (textId: string) => void;
}) {
    return (
        <div>
            <h3 className="flex items-center gap-2 text-sm font-mono text-zinc-500 uppercase tracking-wider mb-6">
                <BookOpen className="w-4 h-4" />
                Required Readings
            </h3>

            <div className="grid gap-4">
                {readings?.map((reading, idx) => {
                    const isCompleted = reading.text_id ? !!readingProgress[reading.text_id] : false;
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
                                    <h4 className={`text-lg font-semibold transition-colors mb-1 ${isCompleted ? 'text-emerald-300' : 'text-zinc-200 group-hover:text-amber-100'
                                        }`}>
                                        {reading.title}
                                    </h4>
                                    {reading.author && (
                                        <p className="text-sm text-zinc-500 mb-1">{reading.author}</p>
                                    )}
                                    {reading.section && (
                                        <p className="text-xs text-zinc-600 font-mono">{reading.section}</p>
                                    )}
                                    {reading.selection_rationale && (
                                        <p className="text-sm text-zinc-400 italic mt-2 opacity-70">
                                            {reading.selection_rationale}
                                        </p>
                                    )}
                                    {reading.notes && (
                                        <p className="text-sm text-zinc-400 italic mt-2">
                                            &ldquo;{reading.notes}&rdquo;
                                        </p>
                                    )}
                                    {reading.text_id && (
                                        <div className="mt-4 flex gap-3">
                                            <Link
                                                href={`/library?text=${reading.text_id}`}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-zinc-300 transition-colors"
                                            >
                                                <BookOpen className="w-3.5 h-3.5" />
                                                Open in Library
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => reading.text_id && onToggleComplete(reading.text_id)}
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

                {(!readings || readings.length === 0) && (
                    <div className="p-8 border border-dashed border-white/10 rounded-lg text-center text-zinc-500 italic">
                        No readings assigned for this week.
                    </div>
                )}
            </div>
        </div>
    );
}

function LensExerciseSection({
    exercise,
    courseSlug,
}: {
    exercise: LensExercise;
    courseSlug: string;
}) {
    const encodedPrompt = encodeURIComponent(exercise.prompt);
    // Build lens config query params if available
    const lensParams = exercise.lens_config
        ? '&' + Object.entries(exercise.lens_config).map(([k, v]) => `lens_${k}=${v}`).join('&')
        : '';

    return (
        <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-mono text-zinc-500 uppercase tracking-wider">
                <Compass className="w-4 h-4" />
                Lens Exercise
            </h3>

            {/* Prompt Card */}
            <div className="border border-purple-500/20 bg-purple-950/10 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <p className="text-lg text-purple-100 leading-relaxed">
                        {exercise.prompt}
                    </p>
                </div>

                {exercise.instructions && exercise.instructions.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <p className="text-xs font-mono text-purple-400/60 uppercase tracking-wider">Instructions</p>
                        <ol className="space-y-2">
                            {exercise.instructions.map((instruction, i) => (
                                <li key={i} className="flex gap-3 text-sm text-zinc-300">
                                    <span className="text-purple-400/60 font-mono text-xs mt-0.5">{i + 1}.</span>
                                    {instruction}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-purple-500/10">
                    <Link
                        href={`/parallax-engine?prompt=${encodedPrompt}${lensParams}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-200 text-sm font-medium transition-all hover:scale-[1.02]"
                    >
                        <Compass className="w-4 h-4" />
                        Run in Seven Lenses
                        <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function ConceptSeedsSection({ seeds }: { seeds: string[] }) {
    return (
        <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-mono text-zinc-500 uppercase tracking-wider">
                <Search className="w-4 h-4" />
                Concept Seeds
            </h3>

            <p className="text-sm text-zinc-400 max-w-2xl">
                These concepts appear across traditions in the Digital Grimoire library.
                Explore them to discover surprising convergences between different systems of thought.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
                {seeds.map((seed, i) => (
                    <Link
                        key={i}
                        href={`/deep-search?q=${encodeURIComponent(seed)}`}
                        className="group flex items-center justify-between p-4 border border-white/5 bg-zinc-900/30 rounded-lg hover:border-amber-500/30 hover:bg-amber-950/10 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <Search className="w-4 h-4 text-amber-400" />
                            </div>
                            <span className="text-zinc-200 group-hover:text-amber-100 font-medium capitalize">
                                {seed}
                            </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                    </Link>
                ))}
            </div>
        </div>
    );
}

function SynthesisSection({
    prompt,
    artifact,
    text,
    onChange,
    onSave,
    saving,
    savedPageId,
    onContribute,
    contributionSent,
}: {
    prompt: SynthesisPrompt;
    artifact?: MicroArtifact;
    text: string;
    onChange: (text: string) => void;
    onSave: () => void;
    saving: boolean;
    savedPageId: string | null;
    onContribute: () => void;
    contributionSent: boolean;
}) {
    return (
        <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-mono text-zinc-500 uppercase tracking-wider">
                <PenTool className="w-4 h-4" />
                Synthesis Response
            </h3>

            {/* Artifact Info */}
            {artifact && (
                <div className="border border-amber-500/20 bg-amber-950/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Bookmark className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-mono text-amber-400/80 uppercase tracking-wider">Micro-Artifact</span>
                    </div>
                    <h4 className="text-lg font-semibold text-amber-100 mb-1">{artifact.name}</h4>
                    <p className="text-sm text-zinc-400">{artifact.description}</p>
                    {artifact.capstone_connection && (
                        <p className="text-xs text-zinc-500 mt-2 italic">
                            Capstone connection: {artifact.capstone_connection}
                        </p>
                    )}
                </div>
            )}

            {/* Prompt */}
            <div className="border border-white/5 bg-zinc-900/30 rounded-lg p-6">
                <p className="text-lg text-zinc-200 leading-relaxed mb-4">
                    {prompt.prompt}
                </p>
                {prompt.expansion && prompt.expansion.length > 0 && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs font-mono text-zinc-600 uppercase tracking-wider">Consider exploring</p>
                        <ul className="space-y-1.5">
                            {prompt.expansion.map((point, i) => (
                                <li key={i} className="flex gap-2 text-sm text-zinc-400">
                                    <span className="text-zinc-600">•</span>
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Editor */}
            <div className="relative">
                <textarea
                    value={text}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Write your synthesis response here..."
                    className="w-full min-h-[200px] p-6 bg-zinc-900/50 border border-white/10 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/20 resize-y transition-colors"
                    disabled={!!savedPageId}
                />
                <div className="absolute bottom-3 right-3 text-xs text-zinc-600 font-mono">
                    {text.length} chars
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
                {!savedPageId ? (
                    <button
                        onClick={onSave}
                        disabled={saving || !text.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                    >
                        <PenTool className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save to Workbook'}
                    </button>
                ) : (
                    <>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-900/20 border border-emerald-500/20 rounded-lg text-emerald-300 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Saved to Workbook
                        </div>
                        <Link
                            href={`/journal/${savedPageId}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-300 text-sm transition-colors"
                        >
                            Open in Journal
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        {!contributionSent ? (
                            <button
                                onClick={onContribute}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-200 text-sm font-medium transition-all"
                            >
                                <Share2 className="w-4 h-4" />
                                Contribute to Community
                            </button>
                        ) : (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/20 border border-purple-500/20 rounded-lg text-purple-300 text-sm">
                                <Globe className="w-4 h-4" />
                                Shared with Community
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function CommunitySection({
    responses,
    gated,
    loading,
}: {
    responses: any[];
    gated: boolean;
    loading: boolean;
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Loading community responses...</p>
                </div>
            </div>
        );
    }

    if (gated) {
        return (
            <div className="space-y-6">
                <h3 className="flex items-center gap-2 text-sm font-mono text-zinc-500 uppercase tracking-wider">
                    <Globe className="w-4 h-4" />
                    Community Synthesis Pool
                </h3>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-4">
                        <Lock className="w-7 h-7 text-zinc-600" />
                    </div>
                    <h4 className="text-zinc-300 font-medium mb-2">Complete Your Synthesis First</h4>
                    <p className="text-sm text-zinc-500 max-w-md">
                        To prevent anchoring bias, community responses are only visible after
                        you&apos;ve submitted your own synthesis. Write yours in the Synthesis tab first.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-mono text-zinc-500 uppercase tracking-wider">
                <Globe className="w-4 h-4" />
                Community Synthesis Pool
            </h3>

            {responses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-4">
                        <Unlock className="w-7 h-7 text-zinc-600" />
                    </div>
                    <h4 className="text-zinc-300 font-medium mb-2">No Community Responses Yet</h4>
                    <p className="text-sm text-zinc-500 max-w-md">
                        You&apos;re among the first! Other seekers&apos; synthesis responses will appear here as they share.
                    </p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-zinc-500">
                        {responses.length} seeker{responses.length !== 1 ? 's have' : ' has'} shared responses
                    </p>
                    <div className="space-y-4">
                        {responses.map((response) => (
                            <div
                                key={response.id}
                                className="border border-white/5 bg-zinc-900/30 rounded-lg p-5"
                            >
                                <p className="text-zinc-300 leading-relaxed">
                                    {response.content_preview || 'No preview available'}
                                </p>
                                <p className="text-xs text-zinc-600 mt-3 font-mono">
                                    Anonymous Seeker · {new Date(response.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function CourseLearnPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-zinc-950 flex items-center justify-center text-amber-500">Loading Interface...</div>}>
            <CourseLearnContent />
        </Suspense>
    );
}
