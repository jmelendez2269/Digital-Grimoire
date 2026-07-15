"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ScrollText } from "lucide-react";

export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  author_name: string;
  published_at: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogListing({ posts }: { posts: BlogPostSummary[] }) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      const matchesSearch =
        !q || p.title.toLowerCase().includes(q) || (p.excerpt ?? "").toLowerCase().includes(q);
      const matchesTag = !activeTag || p.tags.includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [posts, search, activeTag]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search essays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeTag === null
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeTag === tag
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-white/5 rounded-2xl bg-zinc-900/20">
          <ScrollText className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-zinc-500">
            {posts.length === 0 ? "No essays published yet. Check back soon." : "No posts match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-zinc-900/40 overflow-hidden hover:border-amber-500/30 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950">
                {post.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ScrollText className="w-10 h-10 text-amber-900/60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <div className="flex flex-col flex-1 p-5">
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                  <span>{formatDate(post.published_at)}</span>
                  <span className="text-zinc-700">&middot;</span>
                  <span className="truncate">{post.author_name}</span>
                </div>
                <h2 className="text-lg font-semibold text-zinc-100 leading-snug mb-2 group-hover:text-amber-300 transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-4">{post.excerpt}</p>
                )}
                {post.tags.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {post.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-amber-900/30 bg-amber-950/20 px-2 py-0.5 text-[10px] text-amber-300/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
