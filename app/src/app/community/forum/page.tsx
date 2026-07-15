"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, Pin, Lock } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  topic_count: number;
}

interface RecentTopic {
  id: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string;
  author?: { name: string; avatar_url: string | null };
  category?: { slug: string; name: string } | null;
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

export default function ForumIndexPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentTopics, setRecentTopics] = useState<RecentTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/community/forum/categories").then((res) => res.json()),
      fetch("/api/community/forum/topics").then((res) => res.json()),
    ])
      .then(([categoriesData, topicsData]) => {
        if (categoriesData.error) throw new Error(categoriesData.error);
        if (topicsData.error) throw new Error(topicsData.error);
        setCategories(categoriesData.categories ?? []);
        setRecentTopics((topicsData.topics ?? []).slice(0, 6));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load forum"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-10">
        <p className="text-xs font-mono text-cyan-500/70 uppercase tracking-widest mb-3">Community</p>
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">Forum</h1>
        <p className="text-sm text-zinc-500 max-w-xl leading-relaxed">
          Ask questions, share workings, and discuss the corpus with other practitioners.
        </p>
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
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/community/forum/${category.slug}`}
                className="group rounded-lg border border-white/5 bg-zinc-900/30 p-5 hover:border-cyan-500/30 hover:bg-zinc-900/50 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                    {category.name}
                  </h2>
                  <span className="flex-shrink-0 text-xs font-mono text-zinc-500 bg-white/5 rounded-full px-2 py-0.5">
                    {category.topic_count}
                  </span>
                </div>
                {category.description && (
                  <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">{category.description}</p>
                )}
              </Link>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">Recent Activity</h2>
            {recentTopics.length === 0 ? (
              <p className="text-sm text-zinc-600 py-8 text-center border border-white/5 rounded-lg bg-zinc-900/20">
                No topics yet. Be the first to start a discussion.
              </p>
            ) : (
              <div className="divide-y divide-white/5 border border-white/5 rounded-lg bg-zinc-900/20 overflow-hidden">
                {recentTopics.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/community/forum/topic/${topic.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {topic.is_pinned && <Pin className="w-3 h-3 text-cyan-500 flex-shrink-0" />}
                        {topic.is_locked && <Lock className="w-3 h-3 text-zinc-500 flex-shrink-0" />}
                        <span className="text-sm text-zinc-200 truncate">{topic.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                        {topic.category && (
                          <span className="text-cyan-500/70 font-mono">{topic.category.name}</span>
                        )}
                        <span>·</span>
                        <span>{topic.author?.name}</span>
                      </div>
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
