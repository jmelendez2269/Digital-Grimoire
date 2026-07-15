"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Loader2, RefreshCw, Search, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";

interface Video {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  tags: string[];
  is_published: boolean;
  published_at: string | null;
  synced_at: string;
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchVideos();
  }, [search]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());

      const response = await fetch(`/api/admin/videos?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();

      if (response.ok) {
        setVideos(data.videos || []);
      } else {
        setVideos([]);
        setError(data.error || "Failed to load videos");
      }
    } catch (err) {
      console.error("Failed to fetch videos", err);
      setError("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      setError(null);
      const response = await fetch("/api/admin/videos/sync", { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        setSyncResult(`${data.created} created, ${data.updated} updated`);
        void fetchVideos();
      } else {
        setError(data.error || "Sync failed");
      }
    } catch (err) {
      console.error("Failed to sync videos", err);
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const toggleExpand = (video: Video) => {
    if (expandedId === video.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(video.id);
    setEditTags(video.tags.join(", "));
  };

  const handleTogglePublish = async (video: Video) => {
    const previousVideos = videos;
    setVideos((prev) =>
      prev.map((v) => (v.id === video.id ? { ...v, is_published: !v.is_published } : v))
    );
    try {
      const response = await fetch(`/api/admin/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !video.is_published }),
      });
      if (!response.ok) {
        setVideos(previousVideos);
        setError("Failed to toggle publish state");
      }
    } catch (err) {
      console.error("Failed to toggle publish", err);
      setVideos(previousVideos);
      setError("Failed to toggle publish state");
    }
  };

  const handleSaveTags = async (video: Video) => {
    try {
      setSavingId(video.id);
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const response = await fetch(`/api/admin/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      const data = await response.json();

      if (response.ok) {
        setVideos((prev) => prev.map((v) => (v.id === video.id ? data.video : v)));
        setExpandedId(null);
      } else {
        setError(data.error || "Failed to save tags");
      }
    } catch (err) {
      console.error("Failed to save tags", err);
      setError("Failed to save tags");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-zinc-100 selection:bg-cyan-900 selection:text-cyan-50">
      <Header />

      <main className="container mx-auto mt-24 flex-grow px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-cyan-400 to-teal-200 bg-clip-text text-3xl font-bold text-transparent">
              Video Library
            </h1>
            <p className="mt-2 text-zinc-400">Synced from YouTube. Edit tags or hide videos from the public page.</p>
          </div>

          <div className="flex items-center gap-3">
            {syncResult && <span className="text-sm text-emerald-400">{syncResult}</span>}
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 font-medium text-white transition-all hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>Sync Now</span>
            </button>
          </div>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
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
        ) : videos.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 py-16 text-center text-zinc-500">
            No videos yet. Configure YOUTUBE_API_KEY / YOUTUBE_CHANNEL_ID and hit &quot;Sync Now&quot;.
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((video) => (
              <div key={video.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                <div className="flex items-center gap-4 p-3">
                  {video.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="h-14 w-24 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-100">{video.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {video.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-cyan-900/30 bg-cyan-950/30 px-2 py-0.5 text-xs text-cyan-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(video)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      video.is_published
                        ? "bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/30"
                        : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                    }`}
                  >
                    {video.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {video.is_published ? "Published" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(video)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    {expandedId === video.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {expandedId === video.id && (
                  <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="mb-3 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTags(video)}
                      disabled={savingId === video.id}
                      className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
                    >
                      {savingId === video.id ? "Saving..." : "Save Tags"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
