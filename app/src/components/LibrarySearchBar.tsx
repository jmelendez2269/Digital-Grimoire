'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface LibrarySearchBarProps {
  onSearch?: (query: string) => void;
  className?: string;
}

export default function LibrarySearchBar({ onSearch, className = '' }: LibrarySearchBarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      if (onSearch) {
        onSearch(query);
      } else {
        // Navigate to library with search query
        router.push(`/library?search=${encodeURIComponent(query)}`);
      }
    } else {
      // If empty, just go to library
      router.push('/library');
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative group ${className}`}>
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-amber-600/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Search Container */}
      <div className="relative flex items-center bg-zinc-900/80 border border-amber-900/30 rounded-xl overflow-visible focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50 shadow-2xl transition-all">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/40" />
          <input
            type="text"
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-transparent text-amber-100 placeholder-amber-100/30 outline-none text-lg"
          />
        </div>
        <button
          type="submit"
          disabled={!searchQuery.trim()}
          className="px-6 py-4 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border-l border-amber-900/30 disabled:opacity-50 transition-colors"
        >
          <Search className="w-6 h-6" />
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        <a href="/library" className="text-amber-400 hover:text-amber-300 underline">
          Go to Library
        </a>
        {' '}for advanced filters and full search options
      </p>
    </form>
  );
}

