"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  BookOpen,
  LockKeyhole,
  ArrowUpDown,
  ChevronDown,
  Search,
  Shuffle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Pagination from "@/components/Pagination";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppLoader from "@/components/ui/AppLoader";
import {
  useLibraryTexts,
  useLibraryFilterOptions,
  type FilterValues,
} from "@/hooks/useLibrary";
import { invalidateTextCaches } from "@/lib/cache-invalidation";
import LibraryGrid from "@/components/LibraryGrid";
import AdvancedFilters from "@/components/AdvancedFilters";

// Dynamically import FloatingAISearch with explicit error handling
const FloatingAISearch = dynamic(
  () =>
    import("@/components/FloatingAISearch").catch((err) => {
      console.error("Failed to load FloatingAISearch:", err);
      // Return a no-op component if import fails
      return { default: () => null };
    }),
  {
    ssr: false,
    loading: () => null,
  }
);

// Types are now imported from useLibrary hook

function LibraryPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState(() => {
    const urlSearch = searchParams.get("search");
    return urlSearch ? decodeURIComponent(urlSearch) : "";
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24; // Optimized page size for better performance

  // Sort state
  const [sortBy, setSortBy] = useState<
    "title" | "author" | "year" | "created_at" | "domain" | "type"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Shuffle state - disabled for server-side pagination performance
  const [isShuffled, setIsShuffled] = useState(false);

  // Advanced filter state
  const [filterValues, setFilterValues] = useState<FilterValues>({
    domain: "all",
    type: "all",
    yearMin: null,
    yearMax: null,
    tags: [],
    lenses: [],
  });

  // Use React Query hooks for data fetching
  const filterOptionsQuery = useLibraryFilterOptions();
  const filterOptions = filterOptionsQuery.data || {
    domains: [],
    types: [],
    allTags: [],
    allLenses: [],
  };

  // SERVER-SIDE PAGINATION - Only fetch current page data
  const textsQuery = useLibraryTexts({
    page: currentPage,
    limit: itemsPerPage,
    searchQuery: searchQuery,
    filterValues: filterValues,
    sortBy: isShuffled ? "created_at" : sortBy, // Use created_at for shuffle simulation
    sortOrder: isShuffled ? "desc" : sortOrder,
    enabled: !authLoading,
  });

  const paginatedTexts = textsQuery.data?.texts || [];
  const totalCount = textsQuery.data?.total || 0;
  const totalPages = textsQuery.data?.totalPages || 0;
  const loading =
    authLoading || textsQuery.isLoading || filterOptionsQuery.isLoading;
  const error =
    textsQuery.error?.message || filterOptionsQuery.error?.message || null;

  const toggleShuffle = () => {
    const newState = !isShuffled;
    setIsShuffled(newState);
    // For server-side, shuffle is simulated by randomizing sort
    if (newState) {
      setSortBy("created_at");
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // CLIENT-SIDE SUGGESTIONS for search autocomplete
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; title: string; author: string | null }>
  >([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2) {
        try {
          const params = new URLSearchParams({
            search: searchQuery,
            limit: "6",
            sortBy: "title",
            sortOrder: "asc",
          });
          const res = await fetch(`/api/library/catalog?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(
              (data.texts || []).map(
                (text: {
                  id: string;
                  title: string;
                  author: string | null;
                }) => ({
                  id: text.id,
                  title: text.title,
                  author: text.author,
                })
              )
            );
          }
        } catch (error) {
          console.error("Error fetching suggestions:", error);
        }
      } else {
        setSuggestions([]);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFilterChange = (newValues: FilterValues) => {
    setFilterValues(newValues);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setCurrentPage(1); // Reset to first page when search changes
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (title: string) => {
    setSearchQuery(title);
    setShowSuggestions(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (
    newSortBy: typeof sortBy,
    newSortOrder: typeof sortOrder
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setIsShuffled(false); // Disable shuffle when user explicitly sorts
    setCurrentPage(1); // Reset to first page when sort changes
    setShowSortDropdown(false);
  };

  // Memoize getSortLabel function
  const getSortLabel = useCallback(() => {
    if (isShuffled) return "Shuffle";

    const labels: Record<typeof sortBy, string> = {
      title: "Title",
      author: "Author",
      year: "Year",
      created_at: "Date Added",
      domain: "Domain",
      type: "Type",
    };
    const orderLabel = sortOrder === "asc" ? "Ascending" : "Descending";
    return `${labels[sortBy]} (${orderLabel})`;
  }, [sortBy, sortOrder, isShuffled]);

  const deleteText = async (textId: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${title}"?\n\nThis will remove the document and all associated data (bookmarks, annotations, etc.). This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/texts/${textId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        invalidateTextCaches(queryClient, textId);
        alert("Document deleted successfully");
      } else {
        const data = await response.json();
        alert(`Failed to delete document: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("An error occurred while deleting the document");
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <div className="border-b border-amber-900/20 bg-zinc-900/50">
          <div className="mx-auto max-w-screen-2xl px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h1 className="text-lg font-semibold text-amber-100">
                The Prismarium Library
              </h1>

              <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex sm:flex-wrap sm:justify-end lg:w-auto">
                {/* Compact Search Bar with Suggestions */}
                <div className="group relative min-w-0">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-amber-100/60" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full rounded-lg border border-amber-900/20 bg-zinc-900/50 py-1.5 pr-3 pl-9 text-sm text-amber-100 placeholder-amber-100/40 transition-all duration-200 focus:border-amber-600/50 focus:outline-none sm:w-44 sm:focus:w-64"
                  />

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSuggestions(false)}
                      />
                      <div className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-amber-900/30 bg-zinc-900 shadow-2xl backdrop-blur-md">
                        <div className="max-h-64 overflow-y-auto py-1">
                          {suggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              onClick={() =>
                                handleSuggestionClick(suggestion.title)
                              }
                              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-amber-100/80 transition-colors hover:bg-amber-600/20 hover:text-amber-100"
                            >
                              <span className="truncate">
                                {suggestion.title}
                              </span>
                              {suggestion.author && (
                                <span className="ml-2 text-[10px] text-amber-100/40 italic">
                                  by {suggestion.author}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Compact Advanced Filters */}
                <div className="flex-shrink-0">
                  <AdvancedFilters
                    options={filterOptions}
                    values={filterValues}
                    onChange={handleFilterChange}
                  />
                </div>

                {/* Shuffle Button */}
                <button
                  onClick={toggleShuffle}
                  title={
                    isShuffled
                      ? "Shuffle On (Click to disable in Sort)"
                      : "Shuffle Off"
                  }
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    isShuffled
                      ? "border-amber-600/50 bg-amber-600/20 text-amber-300"
                      : "border-amber-900/20 bg-zinc-900/50 text-amber-100/60 hover:bg-zinc-800/50 hover:text-amber-100"
                  }`}
                >
                  <Shuffle className="h-4 w-4" />
                </button>

                {/* Sort Button */}
                <div className="relative col-span-full sm:col-span-1">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-zinc-900/50 px-3 py-1.5 text-sm transition-colors sm:w-auto ${
                      isShuffled
                        ? "border-amber-900/20 text-amber-100/60"
                        : "border-amber-600/30 text-amber-100"
                    }`}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    <span>Sort: {getSortLabel()}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showSortDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showSortDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSortDropdown(false)}
                      />
                      <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-amber-900/20 bg-zinc-900 shadow-xl shadow-black/50">
                        <div className="p-2">
                          <div className="px-3 py-2 text-xs font-medium tracking-wide text-amber-100/60 uppercase">
                            Sort By
                          </div>

                          {(
                            [
                              "title",
                              "author",
                              "year",
                              "created_at",
                              "domain",
                              "type",
                            ] as const
                          ).map((field) => {
                            const labels: Record<typeof field, string> = {
                              title: "Title",
                              author: "Author",
                              year: "Year",
                              created_at: "Date Added",
                              domain: "Domain",
                              type: "Type",
                            };

                            return (
                              <div key={field} className="py-1">
                                <button
                                  onClick={() => {
                                    if (sortBy === field && !isShuffled) {
                                      handleSortChange(
                                        field,
                                        sortOrder === "asc" ? "desc" : "asc"
                                      );
                                    } else {
                                      handleSortChange(field, "desc");
                                    }
                                    setShowSortDropdown(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                    sortBy === field && !isShuffled
                                      ? "bg-amber-600/20 text-amber-400"
                                      : "text-amber-100/80 hover:bg-zinc-800/50"
                                  }`}
                                >
                                  <span>{labels[field]}</span>
                                  {sortBy === field && !isShuffled && (
                                    <span className="text-xs text-amber-400/60">
                                      {sortOrder === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!authLoading && !user && (
          <section className="border-b border-cyan-400/10 bg-cyan-400/[0.035]">
            <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex max-w-3xl items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-200">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">
                    Browse the Library before you join
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Explore{" "}
                    {totalCount > 0
                      ? `${totalCount.toLocaleString()} ready Library entries`
                      : "the ready Library collection"}{" "}
                    by cover, title, author, summary, and curator note. Sign in
                    only when you want to open a full text, save a book, or keep
                    notes. Some entries are collections that contain several
                    works.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:border-cyan-300/30 hover:bg-cyan-300/[0.06] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
              >
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                Sign in to read
              </Link>
            </div>
          </section>
        )}

        {/* Main Content */}
        <div className="mx-auto flex min-h-0 max-w-screen-2xl flex-1 flex-col px-4 py-2">
          {error && !authLoading && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-900/20 p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="mb-1 text-sm font-medium text-red-400">
                    Error Loading Library
                  </h3>
                  <p className="text-sm text-red-300/80">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center py-20">
              <AppLoader message="Opening the Library..." />
            </div>
          ) : error ? null : paginatedTexts.length === 0 ? (
            /* Empty State */
            <div className="py-16 text-center">
              <FileText className="mx-auto mb-4 h-16 w-16 text-amber-100/20" />
              <h3 className="mb-2 text-lg font-medium text-amber-100">
                {searchQuery ||
                filterValues.domain !== "all" ||
                filterValues.type !== "all"
                  ? "No texts found"
                  : user
                    ? "No texts yet"
                    : "No Library entries are available yet"}
              </h3>
              <p className="mb-6 text-sm text-amber-100/60">
                {searchQuery ||
                filterValues.domain !== "all" ||
                filterValues.type !== "all"
                  ? "Try adjusting your search or filters"
                  : user
                    ? "Upload your first text to get started"
                    : "Please check back as the collection grows"}
              </p>
              {isAdmin &&
                !searchQuery &&
                filterValues.domain === "all" &&
                filterValues.type === "all" && (
                  <Link
                    href="/admin/upload"
                    className="inline-block rounded-lg bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700"
                  >
                    Upload Text
                  </Link>
                )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Document Grid - Virtualized */}
              <div className="min-h-0 flex-1">
                <LibraryGrid
                  texts={paginatedTexts}
                  isAdmin={isAdmin}
                  isAuthenticated={!!user}
                  onDelete={deleteText}
                />
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex-shrink-0">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCount}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {user && <FloatingAISearch defaultCollapsed={true} />}

      <Footer />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
          <Header />
          <main className="flex flex-1 items-center justify-center">
            <AppLoader />
          </main>
          <Footer />
        </div>
      }
    >
      <LibraryPageContent />
    </Suspense>
  );
}
