"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Plus, BookOpen, Edit, Trash2, Loader2, Search } from "lucide-react";

interface Course {
    id: string;
    title: string;
    slug: string;
    description: string;
    course_type: string;
    level: string;
    is_published: boolean;
    created_at: string;
}

export default function AdminCoursesPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);

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
                    is_published: false
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <div
                                key={course.id}
                                className="group bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-cyan-500/30 hover:bg-zinc-900/80 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${course.is_published
                                            ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                                            : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400'
                                        }`}>
                                        {course.is_published ? 'Published' : 'Draft'}
                                    </span>
                                    <span className="text-xs text-zinc-500 uppercase tracking-wider">{course.level}</span>
                                </div>

                                <h3 className="text-xl font-bold text-zinc-100 mb-2 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                                    {course.title}
                                </h3>
                                <p className="text-zinc-400 text-sm line-clamp-2 mb-6 h-10">
                                    {course.description || 'No description provided.'}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                                    <span className="text-xs text-zinc-500 font-mono">
                                        {new Date(course.created_at).toLocaleDateString()}
                                    </span>

                                    <button
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
