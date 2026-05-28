'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import StelloquyOrb from '@/components/ui/StelloquyOrb';

interface AISearchBarProps {
  className?: string;
}

export default function AISearchBar({ className = '' }: AISearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = query.trim();
          if (!trimmed) return;
          router.push(`/seven-lenses?query=${encodeURIComponent(trimmed)}`);
        }}
        className={`relative group ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-amber-600/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative flex flex-col sm:flex-row gap-3 items-center bg-zinc-900/80 border border-amber-900/30 rounded-xl overflow-visible focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50 shadow-2xl transition-all p-1">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="w-full pl-10 pr-4 py-4 bg-transparent text-amber-100 placeholder-amber-100/30 outline-none text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim()}
            className="px-6 py-4 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border-l border-amber-900/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            <StelloquyOrb state="listening" size="xs" />
          </button>
        </div>
      </form>

      <p className="text-xs text-amber-100/60 mt-2 text-center">
        <span className="text-amber-200/80">AI is a tool, not a source of absolute truth.</span>{' '}
        <Link href="/ai-disclaimer" className="text-amber-400 hover:text-amber-300 underline">
          Learn more
        </Link>
      </p>
    </>
  );
}
