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
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/40" />
        <input
          type="text"
          placeholder="Search by title or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/50 transition-colors"
        />
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

