"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { Loader2, Search, Pin, Lock, MessageSquare, Plus, ArrowLeft } from "lucide-react";

interface Topic {
  id: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string;
  author?: { name: string; avatar_url: string | null };
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ForumCategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = usePromise(params);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/community/forum/categories")
      .then((res) => res.json())
      .then((data) => {
        const match = (data.categories ?? []).find((c: { slug: string; name: string }) => c.slug === categorySlug);
        setCategoryName(match?.name ?? categorySlug);
      })
      .catch(() => setCategoryName(categorySlug));
  }, [categorySlug]);

  const fetchTopics = async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ category: categorySlug, offset: String(offset) });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/community/forum/topics?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTopics((prev) => (append ? [...prev, ...(data.topics ?? [])] : data.topics ?? []));
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load topics");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void fetchTopics(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, search]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Link href="/community/forum" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-300 transition-colors mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> All Categories
      </Link>

      <div className="flex items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-zinc-100">{categoryName ?? categorySlug}</h1>
        <Link
          href={`/community/forum/${categorySlug}/new`}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> New Topic
        </Link>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
        />
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : topics.length === 0 ? (
        <p className="text-sm text-zinc-600 py-16 text-center border border-white/5 rounded-lg bg-zinc-900/20">
          No topics here yet. Start the first discussion.
        </p>
      ) : (
        <>
          <div className="divide-y divide-white/5 border border-white/5 rounded-lg bg-zinc-900/20 overflow-hidden">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/community/forum/topic/${topic.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {topic.is_pinned && <Pin className="w-3 h-3 text-cyan-500 flex-shrink-0" />}
                    {topic.is_locked && <Lock className="w-3 h-3 text-zinc-500 flex-shrink-0" />}
                    <span className="text-sm text-zinc-200 truncate">{topic.title}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{topic.author?.name}</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {topic.reply_count}
                </div>
                <span className="text-xs text-zinc-600 font-mono flex-shrink-0 w-16 text-right">
                  {relativeTime(topic.last_reply_at ?? topic.created_at)}
                </span>
              </Link>
            ))}
          </div>

          {topics.length < total && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => fetchTopics(topics.length, true)}
                disabled={loadingMore}
                className="text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
