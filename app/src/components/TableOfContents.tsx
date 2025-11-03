'use client';

import { BookOpen } from 'lucide-react';

export interface TOCItem {
  id: string;
  title: string;
  level: number; // 1 for top-level, 2 for nested, etc.
  pageNumber?: number; // For PDFs
}

interface TableOfContentsProps {
  items: TOCItem[];
  activeItemId?: string;
  onItemClick: (item: TOCItem) => void;
}

export default function TableOfContents({
  items,
  activeItemId,
  onItemClick,
}: TableOfContentsProps) {
  // Don't render if no items
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-amber-600" />
        Table of Contents
      </h3>
      <div className="max-h-64 overflow-y-auto pr-2">
        <nav className="space-y-1">
          {items.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              onClick={() => onItemClick(item)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                item.id === activeItemId
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                  : 'text-amber-100/80 hover:bg-zinc-900/70 hover:text-amber-100 border border-transparent'
              }`}
              style={{
                paddingLeft: `${12 + (item.level - 1) * 16}px`,
              }}
            >
              <span className="text-sm leading-relaxed">
                {item.title}
                {item.pageNumber && (
                  <span className="ml-2 text-xs text-amber-100/50">
                    (p. {item.pageNumber})
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

