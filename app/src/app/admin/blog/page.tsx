"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarkdownViewer from "@/components/Wiki/MarkdownViewer";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  X,
  Search,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content?: string;
  cover_image_url: string | null;
  tags: string[];
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  id: null as string | null,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  tags: "",
  authorName: "",
  isPublished: false,
};

export default function BlogAdminPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/admin");
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    void fetchPosts();
  }, [search]);

  const fetchPosts = async () => {
    try {
      setIsLoadingPosts(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      const res = await fetch(`/api/admin/blog?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setPosts(data.posts || []);
      } else {
        setError(data.error || "Failed to load posts");
      }
    } catch (err) {
      console.error("Failed to fetch posts", err);
      setError("Failed to load posts");
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSlugTouched(false);
    setShowPreview(false);
  };

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched ? f.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    }));
  };

  const handleEdit = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load post");
        return;
      }
      const full: BlogPost = data.post;
      setForm({
        id: full.id,
        title: full.title,
        slug: full.slug,
        excerpt: full.excerpt || "",
        content: full.content || "",
        coverImageUrl: full.cover_image_url || "",
        tags: full.tags.join(", "),
        authorName: full.author_name || "",
        isPublished: full.is_published,
      });
      setSlugTouched(true);
      setShowPreview(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to load post for edit", err);
      toast.error("Failed to load post");
    }
  };

  const handleSubmit = async (publish?: boolean) => {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      toast.error("Title, slug, and content are required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        cover_image_url: form.coverImageUrl.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        author_name: form.authorName.trim() || undefined,
        is_published: publish !== undefined ? publish : form.isPublished,
      };

      const res = await fetch(form.id ? `/api/admin/blog/${form.id}` : "/api/admin/blog", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(form.id ? "Post updated" : "Post created");
        resetForm();
        fetchPosts();
      } else {
        toast.error(data.error || "Failed to save post");
      }
    } catch (err) {
      console.error("Failed to save post", err);
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    const previous = posts;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_published: !p.is_published } : p)));
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !post.is_published }),
      });
      if (!res.ok) {
        setPosts(previous);
        toast.error("Failed to toggle publish state");
      }
    } catch (err) {
      console.error("Failed to toggle publish", err);
      setPosts(previous);
      toast.error("Failed to toggle publish state");
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeletingId(post.id);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Post deleted");
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
        if (form.id === post.id) resetForm();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete post");
      }
    } catch (err) {
      console.error("Failed to delete post", err);
      toast.error("Failed to delete post");
    } finally {
      setDeletingId(null);
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
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-300 bg-clip-text text-transparent">
              Blog Management
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Write, edit, and publish essays for the public blog.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Editor */}
          <div className="lg:col-span-3 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 h-fit">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                {form.id ? "Edit Post" : "New Post"}
              </h2>
              {form.id && (
                <button
                  onClick={resetForm}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel edit
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Post Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                  placeholder="Enter post title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Slug (URL-friendly ID)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((f) => ({ ...f, slug: e.target.value }));
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all font-mono text-sm"
                  placeholder="post-slug-here"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Excerpt</label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  className="w-full h-16 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all resize-none text-sm"
                  placeholder="Short teaser shown on the blog listing page..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Cover Image URL</label>
                  <input
                    type="text"
                    value={form.coverImageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Author Name</label>
                  <input
                    type="text"
                    value={form.authorName}
                    onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-sm"
                    placeholder="Prismarium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-sm"
                  placeholder="ritual, correspondence, updates"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-zinc-400">Content (Markdown)</label>
                  <button
                    type="button"
                    onClick={() => setShowPreview((v) => !v)}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                  >
                    {showPreview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPreview ? "Edit" : "Preview"}
                  </button>
                </div>
                {showPreview ? (
                  <div className="h-96 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3">
                    {form.content.trim() ? (
                      <MarkdownViewer content={form.content} />
                    ) : (
                      <p className="text-zinc-600 text-sm">Nothing to preview yet.</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all font-mono text-sm resize-none"
                    placeholder="# Hello World..."
                  />
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSaving}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Draft
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-black font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                  {form.isPublished || form.id ? "Publish" : "Publish Post"}
                </button>
              </div>
            </div>
          </div>

          {/* Existing Posts List */}
          <div className="lg:col-span-2 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-zinc-400" />
                All Posts
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 transition-colors"
                title="New post"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-4 text-sm transition-all focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
              />
            </div>

            {isLoadingPosts ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No posts found.</p>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-lg hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-zinc-200 truncate">{post.title}</h3>
                        <p className="text-xs text-zinc-500 font-mono truncate">/blog/{post.slug}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(post)}
                        className={`flex-shrink-0 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors ${
                          post.is_published
                            ? "bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/30"
                            : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                        }`}
                      >
                        {post.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {post.is_published ? "Live" : "Draft"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(post)}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(post)}
                        disabled={deletingId === post.id}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-900/10 transition-colors disabled:opacity-50"
                      >
                        {deletingId === post.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Delete
                      </button>
                    </div>
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
