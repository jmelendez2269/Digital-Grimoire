"use client";

import { useEffect, useState, useCallback, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Pin,
  Lock,
  Eye,
  Pencil,
  Trash2,
  Send,
  Unlock,
  PinOff,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MarkdownViewer from "@/components/Wiki/MarkdownViewer";

interface Author {
  name: string;
  avatar_url: string | null;
}

interface Topic {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  created_at: string;
  updated_at: string;
  author?: Author;
  category?: { slug: string; name: string } | null;
}

interface Reply {
  id: string;
  topic_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: Author;
}

function Avatar({ author }: { author?: Author }) {
  const name = author?.name ?? "?";
  if (author?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={author.avatar_url} alt={name} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0" />;
  }
  return (
    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-cyan-900/40 flex items-center justify-center text-[10px] font-bold text-cyan-500 ring-1 ring-cyan-500/30">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ForumTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingTopic, setEditingTopic] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [savingTopic, setSavingTopic] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [replyPreview, setReplyPreview] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyBody, setEditReplyBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [topicRes, repliesRes] = await Promise.all([
        fetch(`/api/community/forum/topics/${id}`, { cache: "no-store" }),
        fetch(`/api/community/forum/topics/${id}/replies`, { cache: "no-store" }),
      ]);
      const topicData = await topicRes.json();
      const repliesData = await repliesRes.json();
      if (!topicRes.ok) throw new Error(topicData.error || "Topic not found");
      if (!repliesRes.ok) throw new Error(repliesData.error || "Failed to load replies");
      setTopic(topicData.topic);
      setReplies(repliesData.replies ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load topic");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwnerOrAdmin = (ownerId: string) => user?.id === ownerId || isAdmin;

  const startEditTopic = () => {
    if (!topic) return;
    setEditTitle(topic.title);
    setEditBody(topic.body);
    setEditingTopic(true);
  };

  const saveTopic = async () => {
    if (!topic) return;
    setSavingTopic(true);
    try {
      const res = await fetch(`/api/community/forum/topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), body: editBody.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update topic");
      setTopic((prev) => (prev ? { ...prev, title: data.topic.title, body: data.topic.body } : prev));
      setEditingTopic(false);
      toast.success("Topic updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update topic");
    } finally {
      setSavingTopic(false);
    }
  };

  const deleteTopic = async () => {
    if (!topic) return;
    if (!confirm("Delete this topic? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/community/forum/topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_deleted: true }),
      });
      if (!res.ok) throw new Error("Failed to delete topic");
      toast.success("Topic deleted");
      router.push(topic.category ? `/community/forum/${topic.category.slug}` : "/community/forum");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete topic");
    }
  };

  const toggleModeration = async (field: "is_pinned" | "is_locked") => {
    if (!topic) return;
    const next = !topic[field];
    try {
      const res = await fetch(`/api/admin/forum/topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      });
      if (!res.ok) throw new Error("Failed to update topic");
      setTopic((prev) => (prev ? { ...prev, [field]: next } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update topic");
    }
  };

  const submitReply = async () => {
    if (!replyBody.trim() || !topic) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/community/forum/topics/${topic.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post reply");
      setReplies((prev) => [...prev, data.reply]);
      setReplyBody("");
      setReplyPreview(false);
      setTopic((prev) => (prev ? { ...prev, reply_count: prev.reply_count + 1 } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setSendingReply(false);
    }
  };

  const startEditReply = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditReplyBody(reply.body);
  };

  const saveReply = async (replyId: string) => {
    if (!topic) return;
    try {
      const res = await fetch(`/api/community/forum/topics/${topic.id}/replies/${replyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editReplyBody.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update reply");
      setReplies((prev) => prev.map((r) => (r.id === replyId ? { ...r, body: data.reply.body } : r)));
      setEditingReplyId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update reply");
    }
  };

  const deleteReply = async (replyId: string) => {
    if (!topic) return;
    if (!confirm("Delete this reply?")) return;
    try {
      const res = await fetch(`/api/community/forum/topics/${topic.id}/replies/${replyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_deleted: true }),
      });
      if (!res.ok) throw new Error("Failed to delete reply");
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setTopic((prev) => (prev ? { ...prev, reply_count: Math.max(0, prev.reply_count - 1) } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete reply");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <p className="text-red-400 text-sm">{error || "Topic not found"}</p>
        <Link href="/community/forum" className="text-cyan-400 hover:text-cyan-300 text-sm mt-4 inline-block">
          Back to Forum
        </Link>
      </div>
    );
  }

  const canManageTopic = isOwnerOrAdmin(topic.user_id);

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link
        href={topic.category ? `/community/forum/${topic.category.slug}` : "/community/forum"}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {topic.category?.name ?? "Forum"}
      </Link>

      <div className="border border-white/5 rounded-lg bg-zinc-900/30 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {topic.is_pinned && <Pin className="w-4 h-4 text-cyan-500" />}
            {topic.is_locked && <Lock className="w-4 h-4 text-zinc-500" />}
            {editingTopic ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold bg-zinc-950 border border-white/10 rounded px-2 py-1 text-zinc-100 focus:outline-none focus:border-cyan-500/40"
              />
            ) : (
              <h1 className="text-xl md:text-2xl font-bold text-zinc-100">{topic.title}</h1>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => toggleModeration("is_pinned")}
                title={topic.is_pinned ? "Unpin" : "Pin"}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
              >
                {topic.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
              <button
                onClick={() => toggleModeration("is_locked")}
                title={topic.is_locked ? "Unlock" : "Lock"}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
              >
                {topic.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <Avatar author={topic.author} />
          <div className="text-sm">
            <span className="text-zinc-200 font-medium">{topic.author?.name}</span>
            <span className="text-zinc-600 mx-1.5">·</span>
            <span className="text-zinc-500 font-mono text-xs">{formatDate(topic.created_at)}</span>
          </div>
        </div>

        {editingTopic ? (
          <div className="space-y-3">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full h-56 bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-200 font-mono focus:outline-none focus:border-cyan-500/40 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={saveTopic}
                disabled={savingTopic}
                className="text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                {savingTopic ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingTopic(false)}
                className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <MarkdownViewer content={topic.body} />
        )}

        {canManageTopic && !editingTopic && (
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
            <button
              onClick={startEditTopic}
              className="text-xs text-zinc-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={deleteTopic}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div className="space-y-4 mb-6">
          {replies.map((reply) => (
            <div key={reply.id} className="border border-white/5 rounded-lg bg-zinc-900/20 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <Avatar author={reply.author} />
                <div className="text-sm">
                  <span className="text-zinc-200 font-medium">{reply.author?.name}</span>
                  <span className="text-zinc-600 mx-1.5">·</span>
                  <span className="text-zinc-500 font-mono text-xs">{formatDate(reply.created_at)}</span>
                </div>
              </div>

              {editingReplyId === reply.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editReplyBody}
                    onChange={(e) => setEditReplyBody(e.target.value)}
                    className="w-full h-32 bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-200 font-mono focus:outline-none focus:border-cyan-500/40 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveReply(reply.id)}
                      className="text-sm bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingReplyId(null)}
                      className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <MarkdownViewer content={reply.body} />
                  {isOwnerOrAdmin(reply.user_id) && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                      <button
                        onClick={() => startEditReply(reply)}
                        className="text-xs text-zinc-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => deleteReply(reply.id)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {topic.is_locked ? (
        <div className="text-center text-sm text-zinc-500 border border-white/5 rounded-lg bg-zinc-900/20 py-6">
          <Lock className="w-4 h-4 inline mr-1.5 -mt-0.5" /> This topic is locked. No new replies.
        </div>
      ) : (
        <div className="border border-white/5 rounded-lg bg-zinc-900/20 p-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-zinc-400">Reply</label>
            <button
              type="button"
              onClick={() => setReplyPreview((v) => !v)}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              {replyPreview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {replyPreview ? "Edit" : "Preview"}
            </button>
          </div>
          {replyPreview ? (
            <div className="h-32 overflow-y-auto bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 mb-3">
              {replyBody.trim() ? <MarkdownViewer content={replyBody} /> : <p className="text-zinc-600 text-sm">Nothing to preview.</p>}
            </div>
          ) : (
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              className="w-full h-32 bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/40 resize-none mb-3"
              placeholder="Write a reply..."
            />
          )}
          <button
            onClick={submitReply}
            disabled={sendingReply || !replyBody.trim()}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post Reply
          </button>
        </div>
      )}
    </div>
  );
}
