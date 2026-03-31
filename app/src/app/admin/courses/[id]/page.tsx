"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Save, Trash2, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";

interface Course {
    id: string;
    title: string;
    slug: string;
    description: string;
    premise: string;
    learning_outcomes: string[];
    course_type: string;
    level: string;
    duration_weeks: number;
    is_published: boolean;
    content: Record<string, unknown>;
}

const COURSE_TYPES = ["foundational", "intermediate", "advanced", "specialized"];
const LEVELS = ["foundational", "intermediate", "advanced"];

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [outcomesText, setOutcomesText] = useState("");

    useEffect(() => {
        fetchCourse();
    }, [id]);

    const fetchCourse = async () => {
        try {
            const res = await fetch(`/api/courses/${id}`);
            const data = await res.json();
            if (data.success) {
                setCourse(data.course);
                setOutcomesText((data.course.learning_outcomes || []).join("\n"));
            } else {
                setError(data.error || "Course not found");
            }
        } catch {
            setError("Failed to load course");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!course) return;
        setSaving(true);
        setSaveError(null);

        const learning_outcomes = outcomesText
            .split("\n")
            .map(s => s.trim())
            .filter(Boolean);

        try {
            const res = await fetch(`/api/courses/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...course, learning_outcomes }),
            });
            const data = await res.json();
            if (data.success) {
                setCourse(data.course);
            } else {
                setSaveError(data.error || "Failed to save");
            }
        } catch {
            setSaveError("Failed to save course");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                router.push("/admin/courses");
            } else {
                setSaveError(data.error || "Failed to delete");
                setConfirmDelete(false);
            }
        } catch {
            setSaveError("Failed to delete course");
            setConfirmDelete(false);
        } finally {
            setDeleting(false);
        }
    };

    const slugify = (title: string) =>
        title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const set = (field: keyof Course) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setCourse(prev => prev ? { ...prev, [field]: e.target.value } : prev);

    return (
        <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-50">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8 mt-24 max-w-3xl">
                <button
                    onClick={() => router.push("/admin/courses")}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-6 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Courses
                </button>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20 text-red-400">{error}</div>
                ) : course ? (
                    <>
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-200">
                                Edit Course
                            </h1>
                            <div className="flex items-center gap-3">
                                {!confirmDelete ? (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                        <span className="text-sm text-red-300">Delete permanently?</span>
                                        <button
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="text-sm text-red-400 hover:text-red-200 font-medium ml-1 disabled:opacity-50"
                                        >
                                            {deleting ? "Deleting..." : "Yes, delete"}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="text-sm text-zinc-400 hover:text-zinc-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-cyan-500 hover:to-teal-500 transition-all font-medium text-sm disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                        </div>

                        {saveError && (
                            <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-sm">
                                {saveError}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Title</label>
                                <input
                                    value={course.title}
                                    onChange={(e) => {
                                        setCourse(prev => prev ? {
                                            ...prev,
                                            title: e.target.value,
                                            slug: slugify(e.target.value)
                                        } : prev);
                                    }}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                />
                            </div>

                            {/* Slug */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Slug</label>
                                <input
                                    value={course.slug}
                                    onChange={set("slug")}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                />
                            </div>

                            {/* Type + Level + Duration */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Type</label>
                                    <select
                                        value={course.course_type}
                                        onChange={set("course_type")}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                                    >
                                        {COURSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Level</label>
                                    <select
                                        value={course.level}
                                        onChange={set("level")}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                                    >
                                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Duration (weeks)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={course.duration_weeks}
                                        onChange={(e) => setCourse(prev => prev ? { ...prev, duration_weeks: parseInt(e.target.value) || 1 } : prev)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Published toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCourse(prev => prev ? { ...prev, is_published: !prev.is_published } : prev)}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${course.is_published ? 'bg-cyan-600' : 'bg-zinc-700'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${course.is_published ? 'translate-x-5' : ''}`} />
                                </button>
                                <span className="text-sm text-zinc-300">{course.is_published ? 'Published' : 'Draft'}</span>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
                                <textarea
                                    value={course.description || ""}
                                    onChange={set("description")}
                                    rows={3}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                />
                            </div>

                            {/* Premise */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Premise</label>
                                <textarea
                                    value={course.premise || ""}
                                    onChange={set("premise")}
                                    rows={3}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                />
                            </div>

                            {/* Learning Outcomes */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                                    Learning Outcomes <span className="text-zinc-500 font-normal">(one per line)</span>
                                </label>
                                <textarea
                                    value={outcomesText}
                                    onChange={(e) => setOutcomesText(e.target.value)}
                                    rows={5}
                                    placeholder="Students will understand..."
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                                />
                            </div>
                        </div>
                    </>
                ) : null}
            </main>
            <Footer />
        </div>
    );
}
