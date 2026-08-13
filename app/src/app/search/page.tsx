"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Brain, History, Clock, Loader2, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppLoader from "@/components/ui/AppLoader";
import DeepSearchPanel from "@/components/DeepSearch/DeepSearchPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import type { SearchHistoryEntry } from "@/lib/search/types";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const {
    history,
    loading: historyLoading,
    fetchHistory,
    addHistory,
    deleteHistory,
  } = useSearchHistory();

  const [selectedHistoryQuery, setSelectedHistoryQuery] = useState<
    string | null
  >(null);
  const query =
    selectedHistoryQuery ??
    searchParams.get("q") ??
    searchParams.get("query") ??
    "";

  // Initial load
  useEffect(() => {
    if (user) {
      fetchHistory("concept");
    }
  }, [user, fetchHistory]);

  const handleHistoryClick = (item: SearchHistoryEntry) => {
    setSelectedHistoryQuery(item.query);
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <Header />

      <main className="container mx-auto max-w-4xl flex-1 px-4 py-8">
        <div className="flex flex-col gap-8">
          {/* Hero / Search Section */}
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <div className="space-y-4">
              <h1 className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-amber-200 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                Concept Search
              </h1>
              <p className="mx-auto max-w-xl text-lg text-zinc-400">
                {user
                  ? "Explore philosophical, scientific, and spiritual concepts across the Prismarium Library."
                  : "Replay a real Concept Search and see how one idea changes across different texts."}
              </p>
            </div>

            <div className="w-full">
              {authLoading ? (
                <div
                  className="h-44 w-full animate-pulse rounded-xl border border-white/5 bg-zinc-900/30 motion-reduce:animate-none"
                  aria-label="Loading Concept Search"
                  aria-busy="true"
                />
              ) : (
                <DeepSearchPanel
                  key={user ? `live-search-${query}` : "recorded-demo"}
                  initialQuery={user ? query : undefined}
                  demoMode={!user}
                  onSearch={async (q) => {
                    if (user) {
                      await addHistory(q, "concept");
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* History Section */}
          {user && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h2 className="flex items-center gap-2 text-lg font-medium text-zinc-300">
                  <History className="h-4 w-4 text-amber-500" />
                  Recent Searches
                </h2>
                {/* <button className="text-xs text-zinc-500 hover:text-red-400">Clear History</button> */}
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
                </div>
              ) : history.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex min-h-16 items-stretch rounded-lg border border-white/5 bg-zinc-900/20 transition-all hover:border-amber-500/20 hover:bg-zinc-900/50"
                    >
                      <button
                        type="button"
                        onClick={() => handleHistoryClick(item)}
                        className="flex min-w-0 flex-1 items-start gap-3 rounded-l-lg p-3 text-left focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none focus-visible:ring-inset"
                      >
                        <Brain
                          className="mt-1 h-4 w-4 shrink-0 text-amber-400"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-300 group-hover:text-white">
                            {item.query}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[10px] tracking-wider text-cyan-500/70 uppercase">
                              Concept
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteHistory(item.id);
                        }}
                        className="flex min-w-11 items-center justify-center rounded-r-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:outline-none focus-visible:ring-inset"
                        aria-label="Delete history item"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-zinc-600 italic">
                  No recent history found. Start exploring...
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<AppLoader fullScreen />}>
      <SearchPageContent />
    </Suspense>
  );
}
