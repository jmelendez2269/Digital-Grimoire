"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, Save, Loader2, Eye, LayoutTemplate, Settings } from "lucide-react";
import CourseEditor from "@/components/CourseEditor"; // Restoring usage of this component
import { toast } from "sonner";

interface Course {
    id: string;
    title: string;
    slug: string;
    description: string;
    course_type: string;
    level: string;
    is_published: boolean;
    content: any;
    premise: string;
}

export default function AdminCourseEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

    // Form State
    const [formData, setFormData] = useState<Partial<Course>>({});

    useEffect(() => {
        fetchCourse();
    }, [id]);

    const fetchCourse = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/courses/${id}`);
            const data = await res.json();

            if (data.success) {
                setCourse(data.course);
                setFormData({
                    title: data.course.title,
                    slug: data.course.slug,
                    description: data.course.description,
                    premise: data.course.premise,
                    course_type: data.course.course_type,
                    level: data.course.level,
                    is_published: data.course.is_published,
                    content: data.course.content || {}
                });
            } else {
                toast.error("Failed to find course");
                router.push("/admin/courses");
            }
        } catch (error) {
            console.error("Failed to fetch course", error);
            toast.error("Error loading course");
        } finally {
            setLoading(false);
        }
    };

    const handeSave = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/courses/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                setCourse(data.course); // Update local state
                toast.success("Course saved successfully");
            } else {
                toast.error("Failed to save course: " + data.error);
            }
        } catch (error) {
            console.error("Save error", error);
            toast.error("Error saving course");
        } finally {
            setSaving(false);
        }
    };

    // Handler for the CourseEditor content change
    // Note: CourseEditor usually returns HTML or JSON. We need to see what `onChange` provides.
    // Looking at CourseEditor definition: `onChange: (content: any) => void`
    const handleContentChange = (content: any) => {
        setFormData(prev => ({ ...prev, content }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (!course) return null;

    return (
        <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-50">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8 mt-24">
                {/* Toolbar */}
                <div className="sticky top-24 z-10 bg-black/80 backdrop-blur-md pb-4 mb-6 border-b border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/admin/courses")}
                            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">{formData.title || 'Untitled Course'}</h1>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <span className="uppercase">{formData.level}</span>
                                <span>•</span>
                                <span className={formData.is_published ? "text-emerald-500" : "text-amber-500"}>
                                    {formData.is_published ? "Published" : "Draft"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('content')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'content'
                                ? 'bg-zinc-800 text-cyan-400'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <LayoutTemplate className="w-4 h-4" />
                            Content
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'settings'
                                ? 'bg-zinc-800 text-cyan-400'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                        <div className="w-px h-6 bg-zinc-800 mx-2" />
                        <button
                            onClick={handeSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-500 transition-colors font-medium disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>Save Changes</span>
                        </button>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto">
                    {activeTab === 'content' ? (
                        <div className="space-y-6">
                            {/* Restored CourseEditor integration */}
                            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-1 min-h-[500px]">
                                <CourseEditor
                                    content={typeof formData.content === 'string' ? formData.content : JSON.stringify(formData.content || "")}
                                    onUpdate={handleContentChange}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Title</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Slug</label>
                                    <input
                                        type="text"
                                        value={formData.slug || ''}
                                        onChange={e => setFormData(d => ({ ...d, slug: e.target.value }))}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Description</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                                        rows={4}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Premise (Context)</label>
                                    <textarea
                                        value={formData.premise || ''}
                                        onChange={e => setFormData(d => ({ ...d, premise: e.target.value }))}
                                        rows={4}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-400">Level</label>
                                        <select
                                            value={formData.level}
                                            onChange={e => setFormData(d => ({ ...d, level: e.target.value }))}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50"
                                        >
                                            <option value="foundational">Foundational</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-400">Type</label>
                                        <select
                                            value={formData.course_type}
                                            onChange={e => setFormData(d => ({ ...d, course_type: e.target.value }))}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50"
                                        >
                                            <option value="foundational">Foundational</option>
                                            <option value="theme">Theme</option>
                                            <option value="rotation">Rotation</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-zinc-200">Publication Status</h4>
                                        <p className="text-xs text-zinc-500">Visible to all users when published</p>
                                    </div>
                                    <button
                                        onClick={() => setFormData(d => ({ ...d, is_published: !d.is_published }))}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_published ? 'bg-cyan-600' : 'bg-zinc-700'
                                            }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_published ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </main >
            <Footer />
        </div >
    );
}
