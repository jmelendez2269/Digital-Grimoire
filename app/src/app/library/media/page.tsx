'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Music, Video, Image, Search, ArrowUpDown, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Pagination from '@/components/Pagination';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaGrid from '@/components/MediaGrid';
import MediaFilters, { MediaFilterValues } from '@/components/MediaFilters';
import { createClient } from '@/lib/supabase/client';
import type { MediaItem } from '@/components/MediaCard';

function MediaLibraryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 48;

  // Sort state
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'year' | 'created_at' | 'duration'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Filter state
  const [filterValues, setFilterValues] = useState<MediaFilterValues>({
    mediaType: 'all',
    domain: 'all',
    tags: [],
  });

  // Data state
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Read search query from URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchQuery(decodeURIComponent(urlSearch));
    }
  }, [searchParams]);

  // Fetch media data
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchMedia = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        
        // Build query
        let query = supabase
          .from('texts')
          .select('*', { count: 'exact' })
          .in('media_type', ['audio', 'video', 'photo'])
          .eq('status', 'ready');

        // Apply filters
        if (filterValues.mediaType !== 'all') {
          query = query.eq('media_type', filterValues.mediaType);
        }

        if (filterValues.domain !== 'all') {
          query = query.eq('domain', filterValues.domain);
        }

        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
        }

        // Apply sorting
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // Apply pagination
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);

        const { data, error: queryError, count } = await query;

        if (queryError) throw queryError;

        // Transform data to MediaItem format
        const mediaItems: MediaItem[] = (data || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          author: item.author,
          year: item.year,
          media_type: item.media_type,
          duration: item.duration,
          thumbnail_url: item.thumbnail_url,
          cover_image_url: item.cover_image_url,
          domain: item.domain,
          tags: Array.isArray(item.tags) ? item.tags : [],
          created_at: item.created_at,
        }));

        setMedia(mediaItems);
        setTotalCount(count || 0);

        // Fetch filter options
        const { data: filterData } = await supabase
          .from('texts')
          .select('domain, tags')
          .in('media_type', ['audio', 'video', 'photo'])
          .eq('status', 'ready');

        if (filterData) {
          const domains = new Set<string>();
          const tags = new Set<string>();
          
          filterData.forEach((item: any) => {
            if (item.domain) domains.add(item.domain);
            if (Array.isArray(item.tags)) {
              item.tags.forEach((tag: string) => tags.add(tag));
            }
          });

          setAvailableDomains(Array.from(domains).sort());
          setAvailableTags(Array.from(tags).sort());
        }
      } catch (err) {
        console.error('Error fetching media:', err);
        setError(err instanceof Error ? err.message : 'Failed to load media');
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [user, authLoading, currentPage, filterValues, searchQuery, sortBy, sortOrder]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (mediaId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('texts').delete().eq('id', mediaId);

      if (error) throw error;

      // Refresh media list
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      console.error('Error deleting media:', err);
      alert('Failed to delete media');
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <div className="border-b border-amber-900/20 bg-zinc-900/50">
          <div className="max-w-screen-2xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-amber-100 mb-2">
              Media Library
            </h1>
            <p className="text-amber-100/60">
              Browse audio, video, and photo collections
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-screen-2xl mx-auto px-4 py-8">
          {/* Error Alert */}
          {error && !authLoading && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-400 mb-1">Error Loading Media</h3>
                  <p className="text-sm text-red-300/80">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-100/40" />
              <input
                type="text"
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 transition-colors"
              />
            </div>
          </div>

          {/* Filters and Sort */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <MediaFilters
                filterValues={filterValues}
                onFilterChange={(values) => {
                  setFilterValues(values);
                  setCurrentPage(1);
                }}
                availableDomains={availableDomains}
                availableTags={availableTags}
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="px-4 py-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 flex items-center gap-2 hover:border-amber-600/50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="text-sm">
                  Sort: {sortBy === 'title' ? 'Title' : sortBy === 'author' ? 'Author' : sortBy === 'year' ? 'Year' : sortBy === 'duration' ? 'Duration' : 'Date Added'} ({sortOrder === 'asc' ? 'Asc' : 'Desc'})
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-amber-900/20 rounded-lg shadow-xl z-10">
                  {(['title', 'author', 'year', 'created_at', 'duration'] as const).map((field) => (
                    <button
                      key={field}
                      onClick={() => {
                        if (sortBy === field) {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy(field);
                          setSortOrder('desc');
                        }
                        setShowSortDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-amber-100 hover:bg-zinc-800 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      {field === 'title' ? 'Title' : field === 'author' ? 'Author' : field === 'year' ? 'Year' : field === 'duration' ? 'Duration' : 'Date Added'}
                      {sortBy === field && (
                        <span className="ml-2 text-amber-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Media Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : error ? null : media.length === 0 ? (
            <div className="text-center py-16">
              <Music className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
              <h3 className="text-lg font-medium text-amber-100 mb-2">
                {searchQuery || filterValues.mediaType !== 'all' || filterValues.domain !== 'all'
                  ? 'No media found'
                  : 'No media yet'}
              </h3>
              <p className="text-sm text-amber-100/60 mb-6">
                {searchQuery || filterValues.mediaType !== 'all' || filterValues.domain !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first media file to get started'}
              </p>
              {!searchQuery && filterValues.mediaType === 'all' && filterValues.domain === 'all' && isAdmin && (
                <Link
                  href="/admin/upload"
                  className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                >
                  Upload Media
                </Link>
              )}
            </div>
          ) : (
            <>
              <MediaGrid
                media={media}
                isAdmin={isAdmin}
                onDelete={handleDelete}
              />

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
      <Footer />
    </div>
  );
}

export default function MediaLibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
          <Header />
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          </div>
          <Footer />
        </div>
      }
    >
      <MediaLibraryPageContent />
    </Suspense>
  );
}

