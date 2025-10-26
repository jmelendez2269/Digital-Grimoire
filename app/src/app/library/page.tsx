'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Search, Calendar, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AdvancedFilters from '@/components/AdvancedFilters';
import Pagination from '@/components/Pagination';
import BookmarkButton from '@/components/BookmarkButton';

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

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchTexts();
  }, [currentPage, searchQuery, filterValues]);

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

  const fetchTexts = async () => {
    try {
      setLoading(true);
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

      if (error) throw error;
      
      setTexts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching texts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ready':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

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
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-48 bg-zinc-900/30 border border-amber-900/20 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : texts.length === 0 ? (
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
            {/* Document Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {texts.map((text) => (
              <div
                key={text.id}
                className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6 hover:border-amber-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-amber-900/10"
              >
                {/* Document Icon & Status */}
                <div className="flex items-start justify-between mb-4">
                  <FileText className="w-8 h-8 text-amber-600" />
                  <div className="flex items-center gap-2">
                    <BookmarkButton textId={text.id} size="sm" />
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                        text.status
                      )}`}
                    >
                      {text.status}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-amber-100 mb-2 line-clamp-2">
                  {text.title}
                </h3>

                {/* Metadata */}
                <div className="space-y-2 text-sm text-amber-100/60">
                  {text.author && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{text.author}</span>
                    </div>
                  )}
                  {text.year && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{text.year}</span>
                    </div>
                  )}
                  {text.type && (
                    <div className="text-xs text-amber-600">
                      {text.type.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-amber-900/20 flex items-center justify-between text-xs text-amber-100/40">
                  <span>{formatFileSize(text.file_size)}</span>
                  <span>{formatDate(text.created_at)}</span>
                </div>

                {/* View Button */}
                {text.status === 'ready' && (
                  <Link
                    href={`/library/${text.id}`}
                    className="mt-4 block w-full py-2 text-center bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded-md text-sm font-medium transition-colors"
                  >
                    View Text
                  </Link>
                )}
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

