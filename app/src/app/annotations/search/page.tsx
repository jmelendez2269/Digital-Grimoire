'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { Search, Filter, BookOpen, Calendar, Tag, Palette, X } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';

interface Annotation {
  id: string;
  quote: string;
  note: string | null;
  position: any;
  category: 'general' | 'important' | 'question' | 'insight' | 'to-research' | 'quote' | 'critique';
  highlight_color: 'yellow' | 'green' | 'blue' | 'pink' | 'red' | 'purple' | 'orange';
  created_at: string;
  texts?: {
    id: string;
    title: string;
    author: string | null;
  };
}

const ANNOTATION_CATEGORIES = [
  { value: 'general', label: '📝 General', color: 'gray' },
  { value: 'important', label: '⭐ Important', color: 'red' },
  { value: 'question', label: '❓ Question', color: 'blue' },
  { value: 'insight', label: '💡 Insight', color: 'yellow' },
  { value: 'to-research', label: '🔍 To Research', color: 'purple' },
  { value: 'quote', label: '💬 Quote', color: 'green' },
  { value: 'critique', label: '🎯 Critique', color: 'orange' },
] as const;

const HIGHLIGHT_COLORS = [
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-500' },
  { value: 'green', label: 'Green', bg: 'bg-green-500' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-500' },
  { value: 'red', label: 'Red', bg: 'bg-red-500' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-500' },
] as const;

export default function AnnotationSearchPage() {
  const router = useRouter();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounced search with PostgreSQL FTS
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, page]);

  async function performSearch() {
    setSearching(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      params.append('page', page.toString());
      params.append('pageSize', '50');

      const response = await fetch(`/api/annotations/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnnotations(data.annotations || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error searching annotations:', error);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    performSearch();
  }, []);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(annotations, {
      keys: [
        { name: 'quote', weight: 2 },
        { name: 'note', weight: 1.5 },
        { name: 'texts.title', weight: 1 },
        { name: 'texts.author', weight: 0.5 },
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
    });
  }, [annotations]);

  // Client-side filtering with Fuse.js (for loaded results only)
  const filteredAnnotations = useMemo(() => {
    let results = annotations;

    // Apply category filters (client-side for instant feedback)
    if (selectedCategories.length > 0) {
      results = results.filter((ann) => selectedCategories.includes(ann.category));
    }

    // Apply color filters (client-side for instant feedback)
    if (selectedColors.length > 0) {
      results = results.filter((ann) => selectedColors.includes(ann.highlight_color));
    }

    return results;
  }, [annotations, selectedCategories, selectedColors]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedColors([]);
    setPage(1);
  };

  const getCategoryInfo = (category: string) =>
    ANNOTATION_CATEGORIES.find((c) => c.value === category);

  const getColorInfo = (color: string) => HIGHLIGHT_COLORS.find((c) => c.value === color);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 pt-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-zinc-800 rounded-lg w-1/3" />
            <div className="h-16 bg-zinc-800 rounded-lg" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-zinc-800 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 pt-24 px-6 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-100 mb-3 flex items-center gap-3">
            <Search className="w-10 h-10 text-amber-600" />
            Search Annotations
          </h1>
          <p className="text-amber-100/60">
            Search across all your highlights and notes using powerful full-text search. {totalCount} total annotations.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by quote, note, book title, or author..."
              className="w-full pl-12 pr-12 py-4 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 text-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-100/40 hover:text-amber-100/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle & Active Filters */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-900/50 text-amber-100 hover:bg-zinc-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(selectedCategories.length > 0 || selectedColors.length > 0) && (
              <span className="ml-1 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                {selectedCategories.length + selectedColors.length}
              </span>
            )}
          </button>

          {(selectedCategories.length > 0 || selectedColors.length > 0 || searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-sm text-amber-400 hover:text-amber-300 underline"
            >
              Clear all
            </button>
          )}

          {/* Active Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCategories.map((cat) => {
              const info = getCategoryInfo(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-600/20 text-amber-300 text-sm rounded-full border border-amber-600/30 hover:bg-amber-600/30 transition-colors"
                >
                  {info?.label}
                  <X className="w-3 h-3" />
                </button>
              );
            })}
            {selectedColors.map((col) => {
              const info = getColorInfo(col);
              return (
                <button
                  key={col}
                  onClick={() => toggleColor(col)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-amber-100 text-sm rounded-full border border-zinc-700 hover:bg-zinc-700 transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full ${info?.bg}`} />
                  {info?.label}
                  <X className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-6 bg-zinc-900/50 border border-amber-900/20 rounded-lg space-y-6">
            {/* Category Filters */}
            <div>
              <h3 className="text-sm font-semibold text-amber-100 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Filter by Category
              </h3>
              <div className="flex flex-wrap gap-2">
                {ANNOTATION_CATEGORIES.map((cat) => {
                  const count = annotations.filter((a) => a.category === cat.value).length;
                  const isSelected = selectedCategories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-amber-600 text-white'
                          : 'bg-zinc-800 text-amber-100/70 hover:bg-zinc-700'
                      }`}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Filters */}
            <div>
              <h3 className="text-sm font-semibold text-amber-100 mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Filter by Highlight Color
              </h3>
              <div className="flex flex-wrap gap-2">
                {HIGHLIGHT_COLORS.map((col) => {
                  const count = annotations.filter((a) => a.highlight_color === col.value).length;
                  const isSelected = selectedColors.includes(col.value);
                  return (
                    <button
                      key={col.value}
                      onClick={() => toggleColor(col.value)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors border-2 ${
                        isSelected
                          ? 'border-amber-400 bg-zinc-800'
                          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded ${col.bg}`} />
                      {col.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Results Count & Pagination */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-amber-100/60">
            {searching ? 'Searching...' : `Showing ${filteredAnnotations.length} of ${totalCount} annotations`}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || searching}
                className="px-3 py-1 bg-zinc-800 text-amber-100 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-amber-100/60">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || searching}
                className="px-3 py-1 bg-zinc-800 text-amber-100 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {filteredAnnotations.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
            <h3 className="text-xl font-semibold text-amber-100 mb-2">No annotations found</h3>
            <p className="text-amber-100/60 mb-6">
              {searchQuery || selectedCategories.length > 0 || selectedColors.length > 0
                ? 'Try adjusting your search or filters'
                : 'Start by highlighting text and adding notes while reading'}
            </p>
            {(searchQuery || selectedCategories.length > 0 || selectedColors.length > 0) && (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnotations.map((annotation) => {
              const categoryInfo = getCategoryInfo(annotation.category);
              const colorInfo = getColorInfo(annotation.highlight_color);
              const categoryColor = categoryInfo?.color || 'gray';

              return (
                <div
                  key={annotation.id}
                  className="p-5 bg-zinc-900/50 border border-amber-900/20 rounded-lg hover:border-amber-900/40 transition-colors cursor-pointer"
                  onClick={() => {
                    if (annotation.texts?.id) {
                      router.push(`/library/${annotation.texts.id}`);
                    }
                  }}
                >
                  {/* Header with Document Info */}
                  {annotation.texts && (
                    <div className="flex items-start justify-between mb-3 pb-3 border-b border-amber-900/10">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-amber-100 font-semibold mb-1">
                          <BookOpen className="w-4 h-4 text-amber-600" />
                          {annotation.texts.title}
                        </div>
                        {annotation.texts.author && (
                          <div className="text-sm text-amber-100/60">
                            by {annotation.texts.author}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Category and Color Badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        categoryColor === 'red'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : categoryColor === 'blue'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : categoryColor === 'yellow'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : categoryColor === 'purple'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : categoryColor === 'green'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : categoryColor === 'orange'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/20'
                      }`}
                    >
                      {categoryInfo?.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-amber-100/70 border border-zinc-700">
                      <div className={`w-2.5 h-2.5 rounded-full ${colorInfo?.bg}`} />
                      {colorInfo?.label}
                    </span>
                  </div>

                  {/* Quote */}
                  <div className="pl-3 border-l-2 border-amber-600/50 mb-3">
                    <p className="text-amber-100/90 italic">"{annotation.quote}"</p>
                  </div>

                  {/* Note */}
                  {annotation.note && (
                    <div className="mb-3 p-3 bg-zinc-800/30 rounded">
                      <p className="text-sm text-amber-100/70">{annotation.note}</p>
                    </div>
                  )}

                  {/* Footer with Date */}
                  <div className="flex items-center gap-4 text-xs text-amber-100/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(annotation.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

