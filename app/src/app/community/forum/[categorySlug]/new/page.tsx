"use client";

import { useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Pencil, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import MarkdownViewer from "@/components/Wiki/MarkdownViewer";

export default function NewForumTopicPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = usePromise(params);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (!body.trim()) {
      toast.error("Body cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/community/forum/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), categorySlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create topic");
      toast.success("Topic created");
      router.push(`/community/forum/topic/${data.topic.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create topic");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link
        href={`/community/forum/${categorySlug}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </Link>

      <h1 className="text-2xl font-bold text-zinc-100 mb-6">New Topic</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/40"
            placeholder="What do you want to discuss?"
            maxLength={200}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-zinc-400">Body (Markdown)</label>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              {showPreview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>
          {showPreview ? (
            <div className="h-72 overflow-y-auto bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3">
              {body.trim() ? <MarkdownViewer content={body} /> : <p className="text-zinc-600 text-sm">Nothing to preview yet.</p>}
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-72 bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-200 font-mono focus:outline-none focus:border-cyan-500/40 resize-none"
              placeholder="Share the details..."
            />
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-5 py-2.5 text-sm font-medium text-white transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Post Topic
        </button>
      </div>
    </div>
  );
}
