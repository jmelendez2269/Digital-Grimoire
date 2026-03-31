"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Loader2, CheckCircle2, XCircle, FileText, Sparkles, AlertCircle } from "lucide-react";

interface TextStatus {
  id: string;
  title: string;
  author: string;
  type: string;
  hasContent: boolean;
  hasEmbeddings: boolean;
  chunkCount: number;
}

interface EmbeddingsStatus {
  texts: TextStatus[];
  summary: {
    total: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
    withContent: number;
    withoutContent: number;
  };
  message: string;
}

export default function AdminEmbeddingsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EmbeddingsStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [progress, setProgress] = useState<Map<string, { current: number; total: number }>>(new Map());

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setIsAdmin(true);
    await fetchStatus();
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/convergence/embeddings-status?limit=200");
      if (!response.ok) {
        throw new Error("Failed to fetch embeddings status");
      }
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error fetching status:", error);
      setErrors(prev => {
        const newMap = new Map(prev);
        newMap.set("fetch", error instanceof Error ? error.message : "Failed to fetch status");
        return newMap;
      });
    } finally {
      setLoading(false);
    }
  };

  const generateEmbeddings = async (textId: string, title: string) => {
    try {
      setGenerating(prev => new Set(prev).add(textId));
      setErrors(prev => {
        const newMap = new Map(prev);
        newMap.delete(textId);
        return newMap;
      });
      setProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(textId, { current: 0, total: 1 });
        return newMap;
      });

      // Start polling for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch("/api/convergence/embeddings-status");
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const text = statusData.texts?.find((t: TextStatus) => t.id === textId);
            if (text?.hasEmbeddings) {
              clearInterval(pollInterval);
              setGenerating(prev => {
                const next = new Set(prev);
                next.delete(textId);
                return next;
              });
              setProgress(prev => {
                const newMap = new Map(prev);
                newMap.delete(textId);
                return newMap;
              });
              // Refresh status
              await fetchStatus();
            }
          }
        } catch (error) {
          // Ignore polling errors
        }
      }, 2000);

      // Make the generation request
      const response = await fetch("/api/convergence/generate-embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to generate embeddings");
      }

      const result = await response.json();
      
      // Clear polling after a delay to allow final status check
      setTimeout(() => {
        clearInterval(pollInterval);
        setGenerating(prev => {
          const next = new Set(prev);
          next.delete(textId);
          return next;
        });
        setProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(textId);
          return newMap;
        });
        fetchStatus();
      }, 3000);

    } catch (error) {
      console.error(`Error generating embeddings for ${title}:`, error);
      setErrors(prev => {
        const newMap = new Map(prev);
        newMap.set(textId, error instanceof Error ? error.message : "Failed to generate embeddings");
        return newMap;
      });
      setGenerating(prev => {
        const next = new Set(prev);
        next.delete(textId);
        return next;
      });
      setProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(textId);
        return newMap;
      });
    }
  };

  // Filter texts based on search query
  const filteredTexts = status?.texts.filter(text =>
    text.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    text.author.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-100 mb-2">
                Embeddings Management
              </h1>
              <p className="text-amber-100/60">
                Generate and manage text embeddings for deep search
              </p>
            </div>
            <button
              onClick={fetchStatus}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {status && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900/40 border border-amber-900/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-100/60 text-sm">Total Texts</span>
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-bold text-amber-100">{status.summary.total}</div>
            </div>
            
            <div className="bg-zinc-900/40 border border-green-900/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-100/60 text-sm">With Embeddings</span>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-400">{status.summary.withEmbeddings}</div>
            </div>
            
            <div className="bg-zinc-900/40 border border-red-900/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-100/60 text-sm">Without Embeddings</span>
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-red-400">{status.summary.withoutEmbeddings}</div>
            </div>
            
            <div className="bg-zinc-900/40 border border-amber-900/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-100/60 text-sm">With Content</span>
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-bold text-amber-100">{status.summary.withContent}</div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-100/40" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-900/40 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
        </div>

        {/* Error Message */}
        {errors.has("fetch") && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error fetching status</p>
              <p className="text-sm text-red-200/80">{errors.get("fetch")}</p>
            </div>
          </div>
        )}

        {/* Texts Table */}
        <div className="bg-zinc-900/40 border border-amber-900/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900/60 border-b border-amber-900/20">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-100">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-100">Author</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-100">Type</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-amber-100">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-amber-100">Chunks</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-amber-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-900/10">
                {filteredTexts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-amber-100/60">
                      {searchQuery ? "No texts found matching your search" : "No texts found"}
                    </td>
                  </tr>
                ) : (
                  filteredTexts.map((text) => {
                    const isGenerating = generating.has(text.id);
                    const error = errors.get(text.id);
                    const textProgress = progress.get(text.id);

                    return (
                      <tr key={text.id} className="hover:bg-zinc-900/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-amber-100">{text.title}</div>
                        </td>
                        <td className="px-6 py-4 text-amber-100/80">{text.author || "Unknown"}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-zinc-800 text-amber-100/60">
                            {text.type || "misc"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {text.hasEmbeddings ? (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-900/20 text-green-400 border border-green-700/30">
                                <CheckCircle2 className="w-3 h-3" />
                                Has Embeddings
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-900/20 text-red-400 border border-red-700/30">
                                <XCircle className="w-3 h-3" />
                                Missing
                              </span>
                            )}
                            {!text.hasContent && (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-900/20 text-amber-400 border border-amber-700/30">
                                <AlertCircle className="w-3 h-3" />
                                No Content
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-amber-100/80">
                          {text.hasEmbeddings ? (
                            <span className="font-medium">{text.chunkCount}</span>
                          ) : (
                            <span className="text-amber-100/40">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {isGenerating ? (
                              <div className="flex items-center gap-2 text-amber-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Generating...</span>
                              </div>
                            ) : error ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs text-red-400">{error}</span>
                                <button
                                  onClick={() => generateEmbeddings(text.id, text.title)}
                                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                                >
                                  Retry
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => generateEmbeddings(text.id, text.title)}
                                disabled={text.hasEmbeddings || !text.hasContent}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                  text.hasEmbeddings || !text.hasContent
                                    ? "bg-zinc-800 text-amber-100/40 cursor-not-allowed"
                                    : "bg-amber-600 hover:bg-amber-700 text-white"
                                }`}
                              >
                                <Sparkles className="w-4 h-4" />
                                {text.hasEmbeddings ? "Already Generated" : "Generate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-amber-900/10 border border-amber-900/20 rounded-lg text-amber-100/80 text-sm">
          <p className="font-medium mb-2">About Embeddings</p>
          <ul className="list-disc list-inside space-y-1 text-amber-100/60">
            <li>Embeddings enable semantic search across your library</li>
            <li>Texts must have content before embeddings can be generated</li>
            <li>Generation uses OpenAI API and may take a few minutes for large texts</li>
            <li>Each text is split into chunks (~500 tokens each) for better search results</li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
}
