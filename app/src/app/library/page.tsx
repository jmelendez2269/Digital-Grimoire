'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Search, Filter, Calendar, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Text {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  type: string | null;
  domain: string | null;
  file_size: number | null;
  status: string;
  created_at: string;
}

export default function LibraryPage() {
  const [texts, setTexts] = useState<Text[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchTexts();
  }, []);

  const fetchTexts = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('texts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTexts(data || []);
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

  const filteredTexts = texts.filter((text) => {
    const matchesSearch =
      text.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      text.author?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || text.type === filterType;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = Array.from(new Set(texts.map((t) => t.type).filter(Boolean)));

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
        {/* Search and Filters */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/40" />
            <input
              type="text"
              placeholder="Search texts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-100/60" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 focus:outline-none focus:border-amber-600/50 transition-colors"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type || ''}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-sm text-amber-100/60">
          Showing {filteredTexts.length} of {texts.length} texts
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
        ) : filteredTexts.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
            <h3 className="text-lg font-medium text-amber-100 mb-2">
              {searchQuery || filterType !== 'all' ? 'No texts found' : 'No texts yet'}
            </h3>
            <p className="text-sm text-amber-100/60 mb-6">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first text to get started'}
            </p>
            {!searchQuery && filterType === 'all' && (
              <Link
                href="/admin/upload"
                className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                Upload Text
              </Link>
            )}
          </div>
        ) : (
          /* Document Grid */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTexts.map((text) => (
              <div
                key={text.id}
                className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6 hover:border-amber-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-amber-900/10"
              >
                {/* Document Icon & Status */}
                <div className="flex items-start justify-between mb-4">
                  <FileText className="w-8 h-8 text-amber-600" />
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                      text.status
                    )}`}
                  >
                    {text.status}
                  </span>
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
        )}
      </div>
    </div>
  );
}

