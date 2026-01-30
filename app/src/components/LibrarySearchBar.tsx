'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface LibrarySearchBarProps {
  onSearch?: (query: string) => void;
  className?: string;
}

export default function LibrarySearchBar({ onSearch, className = '' }: LibrarySearchBarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string; author: string | null }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce search suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const res = await fetch(`/api/library/suggestions?query=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data.suggestions || []);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      setShowSuggestions(false);
    } else {
      // If empty, just go to library
      router.push('/library');
    }
  }

  function handleSuggestionClick(title: string) {
    setSearchQuery(title);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(title);
    } else {
      router.push(`/library?search=${encodeURIComponent(title)}`);
    }
  }

  return (
    <div className={`relative group ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
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
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              // Delay blur to allow clicking suggestions
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-12 pr-6 py-4 bg-transparent text-amber-100 placeholder-amber-100/30 outline-none text-lg"
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            aria-label="Search Library"
            className="px-6 py-4 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border-l border-amber-900/30 disabled:opacity-50 transition-colors rounded-r-xl"
          >
            <Search className="w-6 h-6" />
          </button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 border border-amber-900/30 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
          <div className="py-2 max-h-64 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion.title)}
                className="w-full px-6 py-3 text-left hover:bg-amber-600/20 hover:text-amber-100 transition-all border-b border-amber-900/10 last:border-0 group/item"
              >
                <div className="flex items-center justify-between">
                  <span className="text-amber-100/90 font-medium truncate group-hover/item:text-amber-50 transition-colors">
                    {suggestion.title}
                  </span>
                  {suggestion.author && (
                    <span className="text-xs text-amber-100/40 ml-4 italic whitespace-nowrap">
                      by {suggestion.author}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-zinc-500 px-1">
        <a href="/library" className="text-amber-400 hover:text-amber-300 underline">
          Go to Library
        </a>
        {' '}for advanced filters and full search options
      </p>
    </div>
  );
}

