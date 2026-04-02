"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Plus, BookOpen, Edit, Loader2, Search, ChevronUp, ChevronDown } from "lucide-react";

interface Course {
    id: string;
    title: string;
    slug: string;
    description: string;
    course_type: string;
    level: string;
    is_published: boolean;
    sort_order: number;
    created_at: string;
}

export default function AdminCoursesPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    const [reordering, setReordering] = useState<string | null>(null);

    useEffect(() => {
        fetchCourses();
    }, [search]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.append("search", search);

            const res = await fetch(`/api/courses?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                setCourses(data.courses);
            }
        } catch (error) {
            console.error("Failed to fetch courses", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            setCreating(true);
            const res = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "New Course",
                    slug: `new-course-${Date.now()}`,
                    description: "Draft course description",
                    course_type: "foundational",
                    level: "foundational",
                    is_published: false,
                    sort_order: courses.length,
                })
            });

            const data = await res.json();
            if (data.success && data.course) {
                router.push(`/admin/courses/${data.course.id}`);
            }
        } catch (error) {
            console.error("Failed to create course", error);
        } finally {
            setCreating(false);
        }
    };

    const moveOrder = async (index: number, direction: "up" | "down") => {
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= courses.length) return;

        const updated = [...courses];
        const aOrder = updated[index].sort_order;
        const bOrder = updated[swapIndex].sort_order;

        // Swap sort_order values (or use position if both equal)
        const newAOrder = aOrder !== bOrder ? bOrder : (direction === "up" ? aOrder - 1 : aOrder + 1);
        const newBOrder = aOrder !== bOrder ? aOrder : (direction === "up" ? bOrder + 1 : bOrder - 1);

        updated[index] = { ...updated[index], sort_order: newAOrder };
        updated[swapIndex] = { ...updated[swapIndex], sort_order: newBOrder };

        // Re-sort locally so display updates immediately
        updated.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
        setCourses(updated);

        setReordering(updated[index].id);
        try {
            await Promise.all([
                fetch(`/api/courses/${courses[index].id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sort_order: newAOrder }),
                }),
                fetch(`/api/courses/${courses[swapIndex].id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sort_order: newBOrder }),
                }),
            ]);
        } catch (error) {
            console.error("Failed to reorder courses", error);
            fetchCourses(); // Revert on error
        } finally {
            setReordering(null);
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-50">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8 mt-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-200">
                            Course Management
                        </h1>
                        <p className="text-zinc-400 mt-2">Create and manage curriculum content</p>
                    </div>

                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={creating}
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-cyan-500 hover:to-teal-500 transition-all font-medium disabled:opacity-50"
                    >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        <span>Create Course</span>
                    </button>
                </div>

                {/* Search */}
                <div className="mb-6 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    />
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
                        <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-300">No courses found</h3>
                        <p className="text-zinc-500 mt-1">Get started by creating a new course.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {!search && (
                            <p className="text-xs text-zinc-500 mb-4">
                                Courses are displayed in this order to users. Use the arrows to reorder, or set a precise number in each course&apos;s &quot;Display Order&quot; field.
                            </p>
                        )}
                        {courses.map((course, index) => (
                            <div
                                key={course.id}
                                className="group flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-4 hover:border-cyan-500/30 hover:bg-zinc-900/80 transition-all duration-200"
                            >
                                {/* Order controls — hidden when searching */}
                                {!search && (
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => moveOrder(index, "up")}
                                            disabled={index === 0 || reordering !== null}
                                            aria-label={`Move "${course.title}" up`}
                                            className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveOrder(index, "down")}
                                            disabled={index === courses.length - 1 || reordering !== null}
                                            aria-label={`Move "${course.title}" down`}
                                            className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Position badge */}
                                {!search && (
                                    <span className="text-xs font-mono text-zinc-600 w-5 text-center shrink-0">
                                        {index + 1}
                                    </span>
                                )}

                                {/* Course info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-semibold text-zinc-100 truncate group-hover:text-cyan-400 transition-colors">
                                            {course.title}
                                        </h3>
                                        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${
                                            course.is_published
                                                ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                                                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400'
                                        }`}>
                                            {course.is_published ? 'Published' : 'Draft'}
                                        </span>
                                        <span className="shrink-0 text-xs text-zinc-500 uppercase tracking-wider">{course.level}</span>
                                    </div>
                                    <p className="text-zinc-500 text-sm truncate">
                                        {course.description || 'No description provided.'}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className="text-xs text-zinc-600 font-mono hidden sm:block">
                                        {new Date(course.created_at).toLocaleDateString()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/admin/courses/${course.id}`)}
                                        className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
