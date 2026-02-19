"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface BlogPost {
    slug: string;
    filename: string;
}

export default function BlogAdminPage() {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);

    // New Post State
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!loading && !isAdmin) {
            router.push("/admin");
        }
    }, [loading, isAdmin, router]);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/blog');
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts);
            }
        } catch (error) {
            console.error("Failed to fetch posts", error);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        // Auto-generate slug from title if slug is empty or matches previous slugified title
        const generatedSlug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        setSlug(generatedSlug);
    };

    const handleCreatePost = async () => {
        if (!slug || !content) {
            toast.error("Slug and content are required");
            return;
        }

        setIsSaving(true);
        try {
            // Prepend frontmatter to content if not present (simple check)
            let finalContent = content;
            if (!content.startsWith('---')) {
                finalContent = `---
title: "${title}"
date: "${new Date().toISOString()}"
---

${content}`;
            }

            const res = await fetch('/api/blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, content: finalContent }),
            });

            if (res.ok) {
                toast.success("Blog post created successfully!");
                setTitle("");
                setSlug("");
                setContent("");
                fetchPosts(); // Refresh list
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to create post");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !isAdmin) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-zinc-950 text-amber-50">
            <Header />
            <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">

                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin" className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-zinc-400" />
                    </Link>
                    <h1 className="text-3xl font-bold text-amber-500">Blog Management</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Create New Post Section */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-400" />
                            Create New Post
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">
                                    Post Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={handleTitleChange}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                    placeholder="Enter post title..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">
                                    Slug (URL-friendly ID)
                                </label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all font-mono text-sm"
                                    placeholder="post-slug-here"
                                />
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm font-medium text-zinc-400 mb-1">
                                    Content (Markdown)
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all font-mono text-sm resize-none"
                                    placeholder="# Hello World..."
                                />
                            </div>

                            <button
                                onClick={handleCreatePost}
                                disabled={isSaving}
                                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {isSaving ? "Saving..." : "Publish Post"}
                            </button>
                        </div>
                    </div>

                    {/* Existing Posts List */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-zinc-400" />
                            Existing Posts
                        </h2>

                        {isLoadingPosts ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
                            </div>
                        ) : posts.length === 0 ? (
                            <p className="text-zinc-500 text-center py-8">No posts found.</p>
                        ) : (
                            <div className="space-y-3">
                                {posts.map((post) => (
                                    <div key={post.slug} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800/50 rounded-lg hover:border-zinc-700 transition-colors">
                                        <div>
                                            <h3 className="font-medium text-zinc-200">{post.filename}</h3>
                                            <p className="text-xs text-zinc-500 font-mono">/blog/{post.slug}</p>
                                        </div>
                                        {/* Future: Add Edit/Delete buttons */}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </main>
            <Footer />
        </div>
    );
}
