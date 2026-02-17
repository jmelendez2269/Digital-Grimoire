'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Calendar, User, BookOpen, Tag, Eye, Edit, Trash2, ArrowUpDown, ChevronDown, Search, Shuffle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Pagination from '@/components/Pagination';
import BookmarkButton from '@/components/BookmarkButton';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatFileSize, formatDate, getStatusColor } from '@/lib/utils/formatting';
import AppLoader from '@/components/ui/AppLoader';
import { useLibraryTexts, useLibraryFilterOptions, type FilterValues } from '@/hooks/useLibrary';
import { invalidateTextCaches } from '@/lib/cache-invalidation';
import LibraryGrid from '@/components/LibraryGrid';
import AdvancedFilters from '@/components/AdvancedFilters';

// Dynamically import FloatingAISearch with explicit error handling
const FloatingAISearch = dynamic(
  () => import('@/components/FloatingAISearch').catch((err) => {
    console.error('Failed to load FloatingAISearch:', err);
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Read search query from URL params on mount
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchQuery(decodeURIComponent(urlSearch));
    }
  }, [searchParams]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24; // Optimized page size for better performance

  // Sort state
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'year' | 'created_at' | 'domain' | 'type'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Shuffle state - disabled for server-side pagination performance
  const [isShuffled, setIsShuffled] = useState(false);

  // Advanced filter state
  const [filterValues, setFilterValues] = useState<FilterValues>({
    domain: 'all',
    type: 'all',
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
    sortBy: isShuffled ? 'created_at' : sortBy, // Use created_at for shuffle simulation
    sortOrder: isShuffled ? 'desc' : sortOrder,
    enabled: !authLoading && !!user,
  });

  const paginatedTexts = textsQuery.data?.texts || [];
  const totalCount = textsQuery.data?.total || 0;
  const totalPages = textsQuery.data?.totalPages || 0;
  const loading = textsQuery.isLoading || filterOptionsQuery.isLoading;
  const error = textsQuery.error?.message || filterOptionsQuery.error?.message || null;

  const toggleShuffle = () => {
    const newState = !isShuffled;
    setIsShuffled(newState);
    // For server-side, shuffle is simulated by randomizing sort
    if (newState) {
      setSortBy('created_at');
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // CLIENT-SIDE SUGGESTIONS for search autocomplete
  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string; author: string | null }>>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2) {
        try {
          const res = await fetch(`/api/library/suggestions?query=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data.suggestions || []);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSortBy: typeof sortBy, newSortOrder: typeof sortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setIsShuffled(false); // Disable shuffle when user explicitly sorts
    setCurrentPage(1); // Reset to first page when sort changes
    setShowSortDropdown(false);
  };

  // Memoize getSortLabel function
  const getSortLabel = useCallback(() => {
    if (isShuffled) return 'Shuffle';

    const labels: Record<typeof sortBy, string> = {
      title: 'Title',
      author: 'Author',
      year: 'Year',
      created_at: 'Date Added',
      domain: 'Domain',
      type: 'Type',
    };
    const orderLabel = sortOrder === 'asc' ? 'Ascending' : 'Descending';
    return `${labels[sortBy]} (${orderLabel})`;
  }, [sortBy, sortOrder, isShuffled]);

  const deleteText = async (textId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?\n\nThis will remove the document and all associated data (bookmarks, annotations, etc.). This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/texts/${textId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        invalidateTextCaches(queryClient, textId);
        alert('Document deleted successfully');
      } else {
        const data = await response.json();
        alert(`Failed to delete document: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('An error occurred while deleting the document');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <div className="border-b border-amber-900/20 bg-zinc-900/50">
          <div className="max-w-screen-2xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="text-lg font-semibold text-amber-100">
                The Convergence Library
              </h1>

              <div className="flex items-center gap-2 flex-1 justify-end">
                {/* Compact Search Bar with Suggestions */}
                <div className="relative group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/60 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-40 pl-9 pr-3 py-1.5 text-sm bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 focus:w-64 transition-all duration-200"
                  />

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSuggestions(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 w-full bg-zinc-900 border border-amber-900/30 rounded-lg shadow-2xl z-20 overflow-hidden backdrop-blur-md">
                        <div className="py-1 max-h-64 overflow-y-auto">
                          {suggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              onClick={() => handleSuggestionClick(suggestion.title)}
                              className="w-full px-4 py-2 text-left text-sm text-amber-100/80 hover:bg-amber-600/20 hover:text-amber-100 transition-colors flex items-center justify-between"
                            >
                              <span className="truncate">{suggestion.title}</span>
                              {suggestion.author && (
                                <span className="text-[10px] text-amber-100/40 ml-2 italic">
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
                  title={isShuffled ? "Shuffle On (Click to disable in Sort)" : "Shuffle Off"}
                  className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm transition-colors ${isShuffled
                    ? 'bg-amber-600/20 border-amber-600/50 text-amber-300'
                    : 'bg-zinc-900/50 border-amber-900/20 text-amber-100/60 hover:bg-zinc-800/50 hover:text-amber-100'
                    }`}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Sort Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border rounded-lg text-sm transition-colors ${isShuffled
                      ? 'border-amber-900/20 text-amber-100/60'
                      : 'border-amber-600/30 text-amber-100'
                      }`}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    <span>Sort: {getSortLabel()}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showSortDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSortDropdown(false)}
                      />
                      <div className="absolute right-0 z-20 mt-2 w-64 bg-zinc-900 border border-amber-900/20 rounded-lg shadow-xl shadow-black/50 overflow-hidden">
                        <div className="p-2">
                          <div className="px-3 py-2 text-xs font-medium text-amber-100/60 uppercase tracking-wide">
                            Sort By
                          </div>

                          {(['title', 'author', 'year', 'created_at', 'domain', 'type'] as const).map((field) => {
                            const labels: Record<typeof field, string> = {
                              title: 'Title',
                              author: 'Author',
                              year: 'Year',
                              created_at: 'Date Added',
                              domain: 'Domain',
                              type: 'Type',
                            };

                            return (
                              <div key={field} className="py-1">
                                <button
                                  onClick={() => {
                                    if (sortBy === field && !isShuffled) {
                                      handleSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      handleSortChange(field, 'desc');
                                    }
                                    setShowSortDropdown(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors flex items-center justify-between ${sortBy === field && !isShuffled
                                    ? 'bg-amber-600/20 text-amber-400'
                                    : 'text-amber-100/80 hover:bg-zinc-800/50'
                                    }`}
                                >
                                  <span>{labels[field]}</span>
                                  {sortBy === field && !isShuffled && (
                                    <span className="text-xs text-amber-400/60">
                                      {sortOrder === 'asc' ? '↑' : '↓'}
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

        {/* Main Content */}
        <div className="max-w-screen-2xl mx-auto px-4 py-2 flex flex-col flex-1 min-h-0">
          {error && !authLoading && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-400 mb-1">Error Loading Library</h3>
                  <p className="text-sm text-red-300/80">{error}</p>
                  {!user && (
                    <Link
                      href="/login"
                      className="inline-block mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Go to Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Loading State */}
          {!user ? null : loading ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 p-1">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/30 border border-amber-900/20 rounded-lg overflow-hidden animate-pulse h-full"
                >
                  <div className="aspect-[2/3] bg-zinc-800/50 w-full" />
                </div>
              ))}
            </div>
          ) : error ? null : paginatedTexts.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
              <h3 className="text-lg font-medium text-amber-100 mb-2">
                {searchQuery || filterValues.domain !== 'all' || filterValues.type !== 'all'
                  ? 'No texts found'
                  : 'No texts yet'}
              </h3>
              <p className="text-sm text-amber-100/60 mb-6">
                {searchQuery || filterValues.domain !== 'all' || filterValues.type !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first text to get started'}
              </p>
              {!searchQuery && filterValues.domain === 'all' && filterValues.type === 'all' && (
                <Link
                  href="/admin/upload"
                  className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                >
                  Upload Text
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Document Grid - Virtualized */}
              <div className="flex-1 min-h-0">
                <LibraryGrid
                  texts={paginatedTexts}
                  isAdmin={isAdmin}
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

      <FloatingAISearch defaultCollapsed={true} />

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
          <main className="flex-1 flex items-center justify-center">
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

