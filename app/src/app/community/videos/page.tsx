"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, ChevronDown, X, Play } from "lucide-react";

type Video = {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  tags: string[];
  published_at: string | null;
};

export default function CommunityVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  useEffect(() => {
    void fetchVideos(search, selectedTags);
  }, [search, selectedTags]);

  const fetchVideos = async (searchTerm: string, tags: string[]) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (tags.length > 0) params.set("tags", tags.join(","));

    try {
      const res = await fetch(`/api/community/videos?${params.toString()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setVideos(data.videos ?? []);
      setAllTags(data.allTags ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="mb-8">
        <p className="text-xs font-mono text-cyan-500/70 uppercase tracking-widest mb-3">Community</p>
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">Videos</h1>
        <p className="text-sm text-zinc-500 max-w-xl leading-relaxed">
          Search and filter the video library.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowTagDropdown(!showTagDropdown)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""}` : "Filter by tag"}
            <ChevronDown className="h-4 w-4" />
          </button>

          {showTagDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTagDropdown(false)} />
              <div className="absolute z-20 mt-1 max-h-60 w-56 overflow-y-auto rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
                {allTags.length > 0 ? (
                  allTags.map((tag) => (
                    <label
                      key={tag}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={() => toggleTag(tag)}
                        className="h-4 w-4 rounded border-white/20 bg-zinc-800 text-cyan-600 focus:ring-cyan-600 focus:ring-offset-0"
                      />
                      {tag}
                    </label>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-sm text-zinc-600">No tags yet</div>
                )}
              </div>
            </>
          )}
        </div>

        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-300"
          >
            {tag}
            <button onClick={() => toggleTag(tag)} aria-label={`Remove ${tag}`} className="rounded-full p-0.5 hover:bg-cyan-500/20">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-lg border border-white/5 bg-zinc-900/30 py-16 text-center text-zinc-600">
          No videos found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <button
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="group text-left rounded-lg border border-white/5 bg-zinc-900/30 overflow-hidden hover:border-cyan-500/30 transition-colors"
            >
              <div className="relative aspect-video bg-zinc-800">
                {video.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <Play className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                </div>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium text-zinc-200">{video.title}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {video.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-200 truncate pr-4">{activeVideo.title}</p>
              <button
                onClick={() => setActiveVideo(null)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video overflow-hidden rounded-lg border border-white/10">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtube_video_id}?autoplay=1`}
                title={activeVideo.title}
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
