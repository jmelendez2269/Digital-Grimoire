'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FileText, Search, Calendar, User, BookOpen, Tag, Eye, Edit, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Pagination from '@/components/Pagination';
import BookmarkButton from '@/components/BookmarkButton';
import { formatFileSize, formatDate, getStatusColor } from '@/lib/utils/formatting';

// Lazy load AdvancedFilters - not needed on initial render
const AdvancedFilters = dynamic(() => import('@/components/AdvancedFilters'), {
  ssr: false,
  loading: () => (
    <div className="h-20 bg-zinc-900/30 border border-amber-900/20 rounded-lg animate-pulse" />
  ),
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
  const [texts, setTexts] = useState<Text[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 12;

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

  const checkAuth = async () => {
    console.log('[Library] Starting auth check...');
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('[Library] Auth check result:', { hasSession: !!session, error: error?.message });
      
      if (error) {
        console.error('[Library] Auth error:', error);
        setError('Authentication error. Please try logging in again.');
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      if (!session) {
        console.log('[Library] No session found');
        setError('You must be logged in to view the library.');
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      console.log('[Library] Session found, setting authenticated to true');
      setIsAuthenticated(true);

      // Check if user is admin
      if (session.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'admin') {
          setIsAdmin(true);
        }
      }
    } catch (err) {
      console.error('[Library] Error checking auth:', err);
      setError('Failed to verify authentication.');
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const supabase = createClient();
      
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
    console.log('[Library] Starting fetchTexts...');
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      // Start building the query
      let query = supabase
        .from('texts')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`);
      }

      // Apply domain filter
      if (filterValues.domain !== 'all') {
        query = query.eq('domain', filterValues.domain);
      }

      // Apply type filter
      if (filterValues.type !== 'all') {
        query = query.eq('type', filterValues.type);
      }

      // Apply year range filter
      if (filterValues.yearMin !== null) {
        query = query.gte('year', filterValues.yearMin);
      }
      if (filterValues.yearMax !== null) {
        query = query.lte('year', filterValues.yearMax);
      }

      // Apply tags filter
      if (filterValues.tags.length > 0) {
        // Use overlaps operator to match any of the selected tags
        query = query.overlaps('tags', filterValues.tags);
      }

      // Apply lenses filter
      if (filterValues.lenses.length > 0) {
        // Use overlaps operator to match any of the selected lenses
        query = query.overlaps('lenses', filterValues.lenses);
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      // Order by created_at
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      console.log('[Library] Query result:', { count, dataLength: data?.length, error: error?.message });

      if (error) {
        console.error('[Library] Supabase error:', error);
        setError(`Failed to load library: ${error.message}`);
        setTexts([]);
        setTotalCount(0);
        return;
      }
      
      console.log('[Library] Setting texts:', data?.length || 0, 'items');
      setTexts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('[Library] Error fetching texts:', error);
      setError('An unexpected error occurred while loading the library.');
      setTexts([]);
      setTotalCount(0);
    } finally {
      console.log('[Library] fetchTexts complete, setting loading to false');
      setLoading(false);
    }
  }, [currentPage, searchQuery, filterValues]);

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
    checkAuth();
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTexts();
    }
  }, [isAuthenticated, fetchTexts]);

  return (
    <div className="min-h-screen bg-zinc-950 text-amber-50">
      {/* Header */}
      <div className="border-b border-amber-900/20 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2">
            The Convergence Library
          </h1>
          <p className="text-amber-100/60">
            Explore esoteric texts, religious scriptures, philosophical works, and wisdom traditions
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
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
                {!isAuthenticated && (
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

        {/* Results Count */}
        <div className="mb-6 text-sm text-amber-100/60">
          Showing {texts.length} of {totalCount} texts
        </div>

        {/* Loading State */}
        {!isAuthenticated ? null : loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
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
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/20 to-zinc-900/50">
                      <BookOpen className="w-12 h-12 text-amber-600/30" />
                    </div>
                  )}
                  {/* Action buttons overlay */}
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    {isAdmin && (
                      <>
                        <Link
                          href={`/admin/edit/${text.id}`}
                          className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-amber-600/30 hover:border-amber-600/50 rounded-lg transition-colors backdrop-blur-sm"
                          title="Edit document"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
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
                        {text.lenses.slice(0, 2).map((lens) => (
                          <span
                            key={lens}
                            className="px-1.5 py-0.5 bg-zinc-800/50 border border-amber-900/30 rounded text-xs text-amber-100/70"
                          >
                            {lens.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {text.lenses.length > 2 && (
                          <span className="px-1.5 py-0.5 text-xs text-amber-100/50">
                            +{text.lenses.length - 2}
                          </span>
                        )}
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
                        {text.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs text-amber-100/60"
                          >
                            {tag}
                          </span>
                        ))}
                        {text.tags.length > 2 && (
                          <span className="px-1.5 py-0.5 text-xs text-amber-100/50">
                            +{text.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Collection Reason */}
                  {text.curator_note && (
                    <div className="pt-2 border-t border-amber-900/20">
                      <p className="text-xs text-amber-100/70 leading-relaxed line-clamp-3">
                        {text.curator_note}
                      </p>
                      <Link
                        href={`/library/${text.id}`}
                        className="inline-block mt-2 text-xs text-amber-400 hover:text-amber-300 underline transition-colors"
                      >
                        Summary →
                      </Link>
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
    </div>
  );
}

