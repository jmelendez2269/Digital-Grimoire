"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Book,
  AlertCircle,
  Lightbulb,
  ShoppingCart,
} from "lucide-react";
import {
  generateAffiliateLink,
  generateTrackedLink,
} from "@/lib/utils/affiliate";
import ArcaneLoader from "@/components/ui/ArcaneLoader";
import StatusLoader from "@/components/ui/StatusLoader";
import StelloquyOrb from "@/components/ui/StelloquyOrb";
import { RECORDED_CONCEPT_SEARCH_DEMO } from "@/lib/concept-search/recorded-demo";
import type { ConceptSearchResult } from "@/lib/concept-search/types";

interface ConceptSuggestion {
  id: string;
  name: string;
  slug: string;
}
interface DeepSearchPanelProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  demoMode?: boolean;
}

type DemoStage =
  | "idle"
  | "searching"
  | "comparing"
  | "synthesizing"
  | "complete";

const DEMO_STAGE_MESSAGES: Record<DemoStage, string> = {
  idle: "READY TO REPLAY THE RECORDED EXAMPLE",
  searching: "SEARCHING THE RECORDED LIBRARY SNAPSHOT...",
  comparing: "COMPARING THE RECORDED PASSAGES...",
  synthesizing: "ASSEMBLING THE RECORDED SYNTHESIS...",
  complete: "RECORDED EXAMPLE READY",
};

function getPurchaseLink(
  demoMode: boolean,
  title: string,
  author: string,
  source: string
): string {
  return demoMode
    ? generateAffiliateLink(title, author)
    : generateTrackedLink(title, author, source);
}

export default function DeepSearchPanel({
  initialQuery = "",
  onSearch,
  demoMode = false,
}: DeepSearchPanelProps) {
  const [query, setQuery] = useState(
    demoMode ? RECORDED_CONCEPT_SEARCH_DEMO.query : initialQuery
  );
  const [loading, setLoading] = useState(false);
  const [aiResults, setAiResults] = useState<ConceptSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoStage, setDemoStage] = useState<DemoStage>("idle");

  // Collapsible states
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isExternalOpen, setIsExternalOpen] = useState(true);

  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState<ConceptSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const demoTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearDemoTimers = useCallback(() => {
    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [];
  }, []);

  const completeRecordedReplay = useCallback(() => {
    setDemoStage("complete");
    setAiResults(RECORDED_CONCEPT_SEARCH_DEMO.results);
    setLoading(false);
  }, []);

  const startRecordedReplay = useCallback(() => {
    clearDemoTimers();
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setError(null);
    setAiResults(null);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      completeRecordedReplay();
      return;
    }

    setLoading(true);
    setDemoStage("searching");
    demoTimersRef.current = [
      setTimeout(() => setDemoStage("comparing"), 350),
      setTimeout(() => setDemoStage("synthesizing"), 750),
      setTimeout(completeRecordedReplay, 1200),
    ];
  }, [clearDemoTimers, completeRecordedReplay]);

  useEffect(() => {
    return clearDemoTimers;
  }, [clearDemoTimers]);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      if (demoMode) return;

      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setLoadingSuggestions(true);

      try {
        const res = await fetch(
          `/api/concepts?q=${encodeURIComponent(searchQuery)}&limit=8`,
          {
            credentials: "include",
            signal: abortControllerRef.current.signal,
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch suggestions");
        }

        const data = (await res.json()) as {
          items?: Array<Partial<ConceptSuggestion>>;
        };
        const concepts = (data.items ?? []).flatMap((item) =>
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.slug === "string"
            ? [{ id: item.id, name: item.name, slug: item.slug }]
            : []
        );

        setSuggestions(concepts);
        setShowSuggestions(concepts.length > 0);
        setSelectedIndex(-1);
      } catch (err: unknown) {
        // Ignore abort errors
        if (!(err instanceof Error && err.name === "AbortError")) {
          console.error("Error fetching suggestions:", err);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        setLoadingSuggestions(false);
      }
    },
    [demoMode]
  );

  // Debounced suggestion fetching
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (demoMode) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (query.length >= 3) {
      // Debounce API call
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, 300);
    } else {
      // Hide suggestions if query is too short
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [demoMode, query, fetchSuggestions]);

  // Handle search
  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!query.trim()) return;

      if (demoMode) {
        startRecordedReplay();
        return;
      }

      // Hide suggestions when searching
      setShowSuggestions(false);
      setSelectedIndex(-1);

      setLoading(true);
      setError(null);
      setAiResults(null);

      if (onSearch) {
        void onSearch(query);
      }
      try {
        const res = await fetch("/api/parallax/ai-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ query }),
        });

        const resultData = await res.json();

        if (!res.ok) {
          const errorMessage =
            resultData.error || res.statusText || `Error ${res.status}`;
          throw new Error(errorMessage);
        }

        setAiResults(resultData);
      } catch (err) {
        console.error("Deep search error:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "An error occurred while searching. Please try again.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [demoMode, onSearch, query, startRecordedReplay]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) {
        // If Enter is pressed without suggestions, trigger search
        if (e.key === "Enter") {
          handleSearch(e);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            const selected = suggestions[selectedIndex];
            setQuery(selected.name);
            setShowSuggestions(false);
            setSelectedIndex(-1);
            inputRef.current?.blur();
          } else {
            handleSearch(e);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
        case "Tab":
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, handleSearch]
  );

  // Handle suggestion selection
  const handleSuggestionClick = useCallback((suggestion: ConceptSuggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    if (query.length >= 3 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [query.length, suggestions.length]);

  // Handle input blur (with delay to allow clicks)
  const handleInputBlur = useCallback(() => {
    // Small delay to allow click events on suggestions
    setTimeout(() => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(document.activeElement)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 200);
  }, []);

  return (
    <div className="w-full">
      {/* Search Input */}
      <div className="mb-8">
        {demoMode && (
          <div
            id="recorded-demo-description"
            role="note"
            className="mb-4 flex flex-col gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-cyan-200 uppercase">
                Recorded example
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-300">
                Replay a real result captured from Prismarium&apos;s Library. No
                live search, database, or AI request is made.
              </p>
            </div>
            <time
              dateTime={RECORDED_CONCEPT_SEARCH_DEMO.capturedAt}
              className="shrink-0 font-mono text-xs text-zinc-400"
            >
              August 10, 2026
            </time>
          </div>
        )}
        <form onSubmit={handleSearch} className="group relative">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-amber-600/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative flex items-center overflow-visible rounded-xl border border-amber-900/30 bg-zinc-900/80 shadow-2xl transition-all focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50">
            <label htmlFor="concept-search-input" className="sr-only">
              {demoMode
                ? "Recorded concept search example"
                : "Concept to search"}
            </label>
            <input
              id="concept-search-input"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                if (!demoMode) setQuery(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Enter a complex concept like 'Parabrahman' or 'Alchemy'..."
              readOnly={demoMode}
              aria-describedby={
                demoMode ? "recorded-demo-description" : undefined
              }
              className={`w-full bg-transparent px-6 py-4 text-lg text-amber-100 outline-none placeholder:text-amber-100/40 ${demoMode ? "cursor-default" : ""}`}
            />
            {/* Model selector removed for auto-balancing */}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              aria-label={
                demoMode
                  ? "Replay the recorded Belief example"
                  : "Search concepts"
              }
              className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 border-l border-amber-900/30 bg-amber-600/10 px-5 py-3 font-semibold text-amber-300 transition-colors hover:bg-amber-600/20 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <ArcaneLoader size="sm" />
              ) : demoMode ? (
                <>
                  <Search className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden sm:inline">Replay example</span>
                </>
              ) : (
                <Search className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {!demoMode && showSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-amber-900/30 bg-zinc-900/95 shadow-2xl"
            >
              {loadingSuggestions ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-amber-100/60">
                  <ArcaneLoader size="sm" className="h-4 w-4" />
                  <span>Loading suggestions...</span>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-amber-100/40">
                  No suggestions found
                </div>
              ) : (
                <div className="py-1">
                  {suggestions.map((suggestion, index) => {
                    // Highlight logic (inline for simplicity or extracted)
                    return (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          index === selectedIndex
                            ? "bg-amber-900/30 text-amber-200"
                            : "text-amber-100/80 hover:bg-amber-900/20 hover:text-amber-100"
                        }`}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        {suggestion.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {error && (
        <div className="animate-in fade-in slide-in-from-top-2 mb-6 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-900/20 p-4 text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading Feedback */}
      {loading && (
        <div
          className="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center py-20 duration-500 motion-reduce:animate-none"
          role="status"
          aria-live="polite"
        >
          <StelloquyOrb state="thinking" size="lg" className="mb-8" />
          <StatusLoader
            message={
              demoMode
                ? DEMO_STAGE_MESSAGES[demoStage]
                : "STELLOQUY IS ANALYZING THE CONCEPT..."
            }
          />
          {demoMode && (
            <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
              Illustrative playback from the saved result—nothing is being
              generated now.
            </p>
          )}
        </div>
      )}

      {aiResults && !loading && (
        <div
          className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-700 motion-reduce:animate-none"
          aria-label={
            demoMode
              ? "Recorded Concept Search results for Belief"
              : "Concept Search results"
          }
        >
          {demoMode && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-left">
              <div>
                <p className="text-sm font-semibold text-amber-100">
                  Recorded result: Belief
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Results reflect the Library snapshot available when this
                  example was captured.
                </p>
              </div>
              <button
                type="button"
                onClick={startRecordedReplay}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-300/25 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-300/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
              >
                Replay
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          {/* 1. CONCEPT SUMMARY */}
          <div className="group relative overflow-hidden rounded-xl border border-amber-900/20 bg-zinc-900/40 p-6 shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
              <Lightbulb className="h-24 w-24 text-amber-500" />
            </div>
            <h2 className="mb-4 flex items-center gap-2 font-serif text-xl text-amber-100">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              Concept Summary
            </h2>
            <div className="prose prose-invert prose-amber max-w-none leading-relaxed whitespace-pre-line text-amber-100/90">
              <p>{aiResults.summary}</p>
            </div>
          </div>

          {/* 2. LIBRARY RESULTS (Collapsible) */}
          <div className="overflow-hidden rounded-xl border border-amber-900/20 bg-zinc-900/20">
            <button
              type="button"
              onClick={() => setIsLibraryOpen(!isLibraryOpen)}
              aria-expanded={isLibraryOpen}
              aria-controls="concept-search-library-results"
              className="flex min-h-14 w-full items-center justify-between bg-zinc-900/60 p-4 text-left transition-colors hover:bg-zinc-900/80 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none focus-visible:ring-inset"
            >
              <h2 className="flex items-center gap-2 font-serif text-xl text-amber-100">
                <Book className="h-5 w-5 text-amber-400" />
                From the Prismarium Library
                <span className="ml-2 rounded-full bg-amber-900/30 px-2 py-0.5 font-sans text-sm text-amber-100/50">
                  {aiResults.libraryResults.length} Books
                </span>
              </h2>
              <span className="text-sm text-amber-100/50">
                {isLibraryOpen ? "Collapse" : "Expand"}
              </span>
            </button>

            {isLibraryOpen && (
              <div
                id="concept-search-library-results"
                className="space-y-8 p-4"
              >
                {/* TOP 3 RESULTS */}
                <div className="space-y-6">
                  {aiResults.libraryResults.slice(0, 3).map((book, idx) => (
                    <div
                      key={book.book_id}
                      className="group relative overflow-hidden rounded-lg border border-amber-900/20 bg-black/20 p-5 transition-all hover:border-amber-500/40"
                    >
                      {/* Rank Indicator */}
                      <div className="absolute top-0 left-0 rounded-br-lg border-r border-b border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-500">
                        #{idx + 1} Top Match
                      </div>

                      <div className="mt-2 mb-4 flex flex-col items-start justify-between gap-4 md:flex-row">
                        <div>
                          <div className="mb-1 flex items-center gap-3">
                            <h3 className="text-xl font-medium text-amber-100">
                              {book.title}
                            </h3>
                            {book.relevanceLabel && (
                              <span
                                className={`rounded border px-2 py-0.5 text-xs ${
                                  book.relevanceLabel.includes("High") ||
                                  book.relevanceLabel.includes("Foundational")
                                    ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                                    : "border-zinc-700 bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {book.relevanceLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-amber-100/60">
                            by {book.author}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <a
                            href={`/library/${book.book_id}`}
                            className="inline-flex min-h-11 items-center rounded-md border border-amber-600/20 bg-amber-600/20 px-3 py-2 text-xs text-amber-200 transition-colors hover:bg-amber-600/30 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
                          >
                            Read Book
                          </a>
                          <a
                            href={getPurchaseLink(
                              demoMode,
                              book.title,
                              book.author,
                              "DeepSearch_Library"
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:outline-none"
                          >
                            Buy Copy
                          </a>
                        </div>
                      </div>

                      <div className="mb-4 rounded-md border-l-2 border-amber-500/50 bg-amber-900/10 p-3">
                        <p className="text-sm text-amber-100/90 italic">
                          <span className="mr-2 font-semibold text-amber-400 not-italic">
                            Analysis:
                          </span>
                          {book.relevanceSentence}
                        </p>
                      </div>

                      <div className="space-y-3 border-l border-white/5 pl-2">
                        {book.excerpts.slice(0, 3).map((excerpt, idx) => (
                          <a
                            key={idx}
                            href={`/library/${book.book_id}`}
                            className="group/excerpt block rounded-md py-1 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
                          >
                            <div className="relative line-clamp-2 pl-3 text-sm text-amber-100/60 transition-colors group-hover/excerpt:text-amber-100">
                              <span className="absolute top-1.5 left-0 h-1 w-1 rounded-full bg-zinc-700 transition-colors group-hover/excerpt:bg-amber-500" />
                              &ldquo;{excerpt.text}&rdquo;
                              <span className="ml-2 text-xs text-amber-500/50 transition-colors group-hover/excerpt:text-amber-500">
                                Open text
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* OTHER RESULTS */}
                {aiResults.libraryResults.length > 3 && (
                  <div className="border-t border-white/5 pt-6">
                    <h3 className="mb-4 px-1 text-sm font-medium tracking-wider text-zinc-400 uppercase">
                      Other Relevant Texts
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {aiResults.libraryResults.slice(3).map((book) => (
                        <div
                          key={book.book_id}
                          className="group rounded-lg border border-white/5 bg-zinc-900/40 p-3 transition-all hover:border-amber-500/20 hover:bg-zinc-900/60"
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="truncate text-sm font-medium text-zinc-300 transition-colors group-hover:text-white">
                                  {book.title}
                                </h4>
                                {book.relevanceLabel && (
                                  <span className="rounded border border-white/5 bg-white/5 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-zinc-500">
                                    {book.relevanceLabel}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-zinc-500">
                                {book.author}
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 transition-all group-hover:opacity-100">
                              <a
                                href={getPurchaseLink(
                                  demoMode,
                                  book.title,
                                  book.author,
                                  "DeepSearch_Library_Small"
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex min-h-11 items-center gap-1 rounded border border-amber-600/20 bg-amber-600/10 px-3 py-2 text-xs text-amber-300 transition-all hover:bg-amber-600/20 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
                              >
                                <ShoppingCart className="h-2.5 w-2.5" />
                                Buy
                              </a>
                              <a
                                href={`/library/${book.book_id}`}
                                className="inline-flex min-h-11 items-center rounded bg-white/5 px-3 py-2 text-xs text-zinc-300 transition-all hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:outline-none"
                              >
                                Open
                              </a>
                            </div>
                          </div>

                          {/* Preview Snippet */}
                          {book.excerpts.length > 0 && (
                            <p className="line-clamp-2 text-xs text-zinc-600 italic transition-colors group-hover:text-zinc-500">
                              &ldquo;{book.excerpts[0].text}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. EXTERNAL RECOMMENDATIONS (Collapsible) */}
          {aiResults.externalRecommendations.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-amber-900/20 bg-zinc-900/20">
              <button
                type="button"
                onClick={() => setIsExternalOpen(!isExternalOpen)}
                aria-expanded={isExternalOpen}
                aria-controls="concept-search-further-reading"
                className="flex min-h-14 w-full items-center justify-between bg-zinc-900/60 p-4 text-left transition-colors hover:bg-zinc-900/80 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none focus-visible:ring-inset"
              >
                <h2 className="flex items-center gap-2 font-serif text-xl text-amber-100">
                  <Search className="h-5 w-5 text-amber-400" />
                  Further Reading (External)
                </h2>
                <span className="text-sm text-amber-100/50">
                  {isExternalOpen ? "Collapse" : "Expand"}
                </span>
              </button>

              {isExternalOpen && (
                <div
                  id="concept-search-further-reading"
                  className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3"
                >
                  {aiResults.externalRecommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col justify-between rounded-lg border border-amber-900/10 bg-black/20 p-5 transition-colors hover:border-amber-500/30"
                    >
                      <div>
                        <h3 className="mb-1 font-medium text-amber-100">
                          {rec.title}
                        </h3>
                        <p className="mb-3 text-sm text-amber-100/60">
                          {rec.author}
                        </p>
                        <p className="mb-4 line-clamp-3 text-xs text-amber-100/50">
                          {rec.reason}
                        </p>
                      </div>
                      <a
                        href={getPurchaseLink(
                          demoMode,
                          rec.title,
                          rec.author,
                          "DeepSearch_External"
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex min-h-11 w-full items-center justify-center rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-xs text-zinc-300 transition-colors hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:outline-none"
                      >
                        Buy on Amazon
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {demoMode && (
            <div className="rounded-2xl border border-cyan-300/20 bg-[linear-gradient(120deg,rgba(8,47,73,0.35),rgba(24,24,27,0.72))] p-6 text-left sm:p-7">
              <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-cyan-200 uppercase">
                Continue with your question
              </p>
              <h2 className="mt-3 font-serif text-2xl text-zinc-50">
                Search beyond the recorded example.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Join Prismarium to use Concept Search with your own ideas and
                keep your discoveries connected to the Library.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
                >
                  Join Prismarium
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-zinc-200 focus-visible:outline-none"
                >
                  View membership
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
