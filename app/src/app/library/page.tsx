'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FileText, Search, Calendar, User, BookOpen, Tag, Eye, Edit, Trash2, ArrowUpDown, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Pagination from '@/components/Pagination';
import BookmarkButton from '@/components/BookmarkButton';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatFileSize, formatDate, getStatusColor } from '@/lib/utils/formatting';

// Lazy load AdvancedFilters - not needed on initial render
const AdvancedFilters = dynamic(() => import('@/components/AdvancedFilters'), {
  ssr: false,
  loading: () => (
    <div className="h-20 bg-zinc-900/30 border border-amber-900/20 rounded-lg animate-pulse" />
  ),
});

// Dynamically import FloatingAISearch
const FloatingAISearch = dynamic(() => import('@/components/FloatingAISearch'), {
  ssr: false,
  loading: () => null,
});

interface Text {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  type: string | null;
  domain: string | null;
  tags: string[] | null;
  lenses: string[] | null;
  file_size: number | null;
  status: string;
  created_at: string;
  cover_image_url: string | null;
  short_summary: string | null;
  curator_note: string | null;
  metadata?: any;
}

interface FilterValues {
  domain: string;
  type: string;
  yearMin: number | null;
  yearMax: number | null;
  tags: string[];
  lenses: string[];
}

export default function LibraryPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase, isAdmin } = useAuth();
  const [texts, setTexts] = useState<Text[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 12;

  // Sort state
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'year' | 'created_at' | 'domain' | 'type'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Advanced filter state
  const [filterValues, setFilterValues] = useState<FilterValues>({
    domain: 'all',
    type: 'all',
    yearMin: null,
    yearMax: null,
    tags: [],
    lenses: [],
  });

  // Filter options
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allLenses, setAllLenses] = useState<string[]>([]);

  const fetchFilterOptions = async () => {
    try {
      
      // Fetch all documents to extract unique values
      const { data, error } = await supabase
        .from('texts')
        .select('domain, type, tags, lenses');

      if (error) throw error;

      if (data) {
        // Extract unique domains
        const domains = Array.from(
          new Set(data.map((t) => t.domain).filter(Boolean))
        ) as string[];
        setAllDomains(domains.sort());

        // Extract unique types
        const types = Array.from(
          new Set(data.map((t) => t.type).filter(Boolean))
        ) as string[];
        setAllTypes(types.sort());

        // Extract unique tags
        const tagsSet = new Set<string>();
        data.forEach((t) => {
          if (t.tags && Array.isArray(t.tags)) {
            t.tags.forEach((tag) => tagsSet.add(tag));
          }
        });
        setAllTags(Array.from(tagsSet).sort());

        // Extract unique lenses (use all 7 lenses by default)
        const lensesSet = new Set<string>();
        data.forEach((t) => {
          if (t.lenses && Array.isArray(t.lenses)) {
            t.lenses.forEach((lens) => lensesSet.add(lens));
          }
        });
        
        // Always show all 7 lenses in a specific order
        const allSevenLenses = [
          'scientific',
          'psychological',
          'philosophical',
          'religious_spiritual',
          'historical_anthropological',
          'symbolic_occult',
          'mathematical'
        ];
        setAllLenses(allSevenLenses);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchTexts = useCallback(async () => {
    console.log('[Library] Starting fetchTexts via API route...');
    console.log('[Library] User from context:', user?.email);
    
    // Don't proceed if no user - API route will handle auth
    if (!user) {
      console.log('[Library] No user in context, waiting...');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query parameters for API route
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (filterValues.domain !== 'all') {
        params.append('domain', filterValues.domain);
      }
      if (filterValues.type !== 'all') {
        params.append('type', filterValues.type);
      }
      if (filterValues.yearMin !== null) {
        params.append('yearMin', filterValues.yearMin.toString());
      }
      if (filterValues.yearMax !== null) {
        params.append('yearMax', filterValues.yearMax.toString());
      }
      if (filterValues.tags.length > 0) {
        params.append('tags', filterValues.tags.join(','));
      }
      if (filterValues.lenses.length > 0) {
        params.append('lenses', filterValues.lenses.join(','));
      }
      if (sortBy) {
        params.append('sortBy', sortBy);
      }
      if (sortOrder) {
        params.append('sortOrder', sortOrder);
      }

      console.log('[Library] Calling API route with params:', params.toString());

      // Use API route instead of direct Supabase query
      const response = await fetch(`/api/texts?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Library] API error:', errorData);
        setError(errorData.error || `Failed to load library (${response.status})`);
        setTexts([]);
        setTotalCount(0);
        return;
      }

      const data = await response.json();
      console.log('[Library] API response:', { 
        count: data.total, 
        dataLength: data.texts?.length,
        page: data.page,
        totalPages: data.totalPages
      });

      setTexts(data.texts || []);
      setTotalCount(data.total || 0);
    } catch (error: any) {
      console.error('[Library] Error fetching texts:', error);
      setError(error.message || 'An unexpected error occurred while loading the library.');
      setTexts([]);
      setTotalCount(0);
    } finally {
      console.log('[Library] fetchTexts complete, setting loading to false');
      setLoading(false);
    }
  }, [currentPage, searchQuery, filterValues, sortBy, sortOrder, user]);

  const handleFilterChange = (newValues: FilterValues) => {
    setFilterValues(newValues);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSortBy: typeof sortBy, newSortOrder: typeof sortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1); // Reset to first page when sort changes
    setShowSortDropdown(false);
  };

  const getSortLabel = () => {
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
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const deleteText = async (textId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?\n\nThis will remove the document and all associated data (bookmarks, annotations, etc.). This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/texts/${textId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setTexts(texts.filter((t) => t.id !== textId));
        setTotalCount(totalCount - 1);
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

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    // Safety timeout - if auth loading takes too long, try fetching anyway
    let timeoutId: NodeJS.Timeout;
    
    if (!authLoading && user) {
      // Auth is ready and user is logged in - fetch texts
      console.log('[Library] Auth ready, user logged in - fetching texts');
      fetchTexts();
    } else if (!authLoading && !user) {
      // Auth is ready but no user - show error
      console.log('[Library] Auth ready but no user - showing error');
      setError('You must be logged in to view the library.');
      setLoading(false);
    } else if (authLoading) {
      // Auth still loading - set a timeout to fetch anyway after 3 seconds
      // This prevents the page from being stuck if auth hangs
      console.log('[Library] Auth still loading, setting timeout fallback');
      timeoutId = setTimeout(() => {
        console.warn('[Library] Auth loading timeout - attempting to fetch texts anyway');
        // Try to fetch if we have supabase client (might work even without user)
        if (supabase) {
          fetchTexts();
        } else {
          console.error('[Library] No supabase client available');
          setError('Unable to connect to database.');
          setLoading(false);
        }
      }, 3000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [authLoading, user, fetchTexts, supabase]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <div className="border-b border-amber-900/20 bg-zinc-900/50">
          <div className="max-w-screen-2xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-amber-100 mb-2">
              The Convergence Library
            </h1>
            <p className="text-amber-100/60">
              Explore esoteric texts, religious scriptures, philosophical works, and wisdom traditions
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-screen-2xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
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

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/40" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 transition-colors"
            />
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mb-6">
          <AdvancedFilters
            options={{
              domains: allDomains,
              types: allTypes,
              allTags: allTags,
              allLenses: allLenses,
            }}
            values={filterValues}
            onChange={handleFilterChange}
          />
        </div>

        {/* Results Count and Sort */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-amber-100/60">
            Showing {texts.length} of {totalCount} texts
          </div>
          
          {/* Sort Button */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 text-sm hover:bg-zinc-800/50 hover:border-amber-600/50 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Sort: {getSortLabel()}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSortDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortDropdown(false)}
                />
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 z-20 mt-2 w-64 bg-zinc-900 border border-amber-900/20 rounded-lg shadow-xl shadow-black/50 overflow-hidden">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-medium text-amber-100/60 uppercase tracking-wide">
                      Sort By
                    </div>
                    
                    {/* Sort Options */}
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
                              // If clicking the same field, toggle order; otherwise set to desc
                              if (sortBy === field) {
                                handleSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                handleSortChange(field, 'desc');
                              }
                            }}
                            className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors flex items-center justify-between ${
                              sortBy === field
                                ? 'bg-amber-600/20 text-amber-400'
                                : 'text-amber-100/80 hover:bg-zinc-800/50'
                            }`}
                          >
                            <span>{labels[field]}</span>
                            {sortBy === field && (
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

        {/* Loading State */}
        {!user ? null : loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900/30 border border-amber-900/20 rounded-xl overflow-hidden animate-pulse"
              >
                {/* Cover placeholder */}
                <div className="aspect-[2/3] bg-zinc-800/50" />
                {/* Content placeholder */}
                <div className="p-5 space-y-3">
                  <div className="h-6 bg-zinc-800/50 rounded w-3/4" />
                  <div className="h-4 bg-zinc-800/50 rounded w-1/2" />
                  <div className="h-8 bg-zinc-800/50 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? null : texts.length === 0 ? (
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
          <>
            {/* Document Grid - Horizontal Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {texts.map((text) => (
              <div
                key={text.id}
                className="group bg-zinc-900/50 border border-amber-900/20 rounded-xl overflow-hidden hover:border-amber-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-900/20 flex flex-col md:flex-row"
              >
                {/* Book Cover */}
                <Link href={`/library/${text.id}`} className="relative md:w-40 md:h-56 w-full h-48 bg-zinc-800/50 overflow-hidden flex-shrink-0">
                  {text.cover_image_url ? (
                    <img
                      src={text.cover_image_url}
                      alt={text.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{
                        objectPosition: (text.metadata as any)?.cover_position || 'center',
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/20 to-zinc-900/50">
                      <BookOpen className="w-12 h-12 text-amber-600/30" />
                    </div>
                  )}
                  {/* Action buttons overlay - visible on hover */}
                  <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200">
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/admin/edit/${text.id}`);
                          }}
                          className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-amber-600/30 hover:border-amber-600/50 rounded-lg transition-colors backdrop-blur-sm"
                          title="Edit document"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteText(text.id, text.title);
                          }}
                          className="p-1.5 bg-zinc-900/90 hover:bg-red-900 border border-red-600/30 hover:border-red-600/50 rounded-lg transition-colors backdrop-blur-sm"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </>
                    )}
                    <BookmarkButton textId={text.id} size="sm" />
                  </div>
                </Link>

                {/* Card Content - Scrollable */}
                <div className="flex-1 p-4 overflow-y-auto max-h-56 space-y-3">
                  {/* Title & Author */}
                  <div>
                    <Link href={`/library/${text.id}`}>
                      <h3 className="text-base font-bold text-amber-100 mb-1 line-clamp-2 group-hover:text-amber-400 transition-colors">
                        {text.title}
                      </h3>
                    </Link>
                    {text.author && (
                      <p className="text-xs text-amber-100/60 flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        {text.author}
                        {text.year && <span className="ml-1">({text.year})</span>}
                      </p>
                    )}
                  </div>

                  {/* Domain */}
                  {text.domain && (
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 bg-amber-600/10 border border-amber-600/20 rounded-md text-xs font-medium text-amber-400">
                        {text.domain}
                      </div>
                    </div>
                  )}

                  {/* Lenses */}
                  {text.lenses && text.lenses.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 text-xs text-amber-100/50">
                        <Eye className="w-3 h-3" />
                        <span className="font-medium">Lenses</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {text.lenses.map((lens) => (
                          <span
                            key={lens}
                            className="px-1.5 py-0.5 bg-zinc-800/50 border border-amber-900/30 rounded text-xs text-amber-100/70"
                          >
                            {lens.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {text.tags && text.tags.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 text-xs text-amber-100/50">
                        <Tag className="w-3 h-3" />
                        <span className="font-medium">Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {text.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-zinc-800/50 border border-amber-900/30 rounded text-xs text-amber-100/70"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collection Reason */}
                  {text.curator_note && (
                    <div className="pt-2 border-t border-amber-900/20">
                      <p className="text-xs text-amber-100/70 leading-relaxed">
                        {text.curator_note}
                      </p>
                    </div>
                  )}

                  {/* View Button */}
                  <Link
                    href={`/library/${text.id}`}
                    className="block w-full py-2 text-center bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-xs font-medium transition-all duration-200"
                  >
                    View Document
                  </Link>
                </div>
              </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
        </div>
      </main>
      
      {/* Floating AI Search */}
      <FloatingAISearch defaultCollapsed={true} />
      
      <Footer />
    </div>
  );
}

