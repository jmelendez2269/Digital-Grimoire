'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, BookOpen, Tag, Eye, Edit, Trash2 } from 'lucide-react';
import BookmarkButton from '@/components/BookmarkButton';
import type { Text } from '@/hooks/useLibrary';

interface LibraryGridProps {
  texts: Text[];
  isAdmin?: boolean;
  onDelete?: (textId: string, title: string) => void;
}

export default function LibraryGrid({ texts, isAdmin = false, onDelete }: LibraryGridProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);

  // Calculate columns based on window width
  useEffect(() => {
    const updateColumns = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width >= 1024) setColumns(3); // lg: 3 columns
      else if (width >= 768) setColumns(2); // md: 2 columns
      else setColumns(1); // sm: 1 column
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Create rows from texts (each row contains `columns` items)
  const rows = useMemo(() => {
    const result: Text[][] = [];
    for (let i = 0; i < texts.length; i += columns) {
      result.push(texts.slice(i, i + columns));
    }
    return result;
  }, [texts, columns]);

  // Virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // Approximate height of a row (card + gap)
    overscan: 2, // Render 2 extra rows above and below
  });

  if (texts.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {row.map((text) => (
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
                          style={{
                            objectPosition: (text.metadata as any)?.cover_position || 'center',
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/20 to-zinc-900/50">
                          <BookOpen className="w-12 h-12 text-amber-600/30" />
                        </div>
                      )}
                      {/* Action buttons overlay - visible on hover */}
                      <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200">
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/admin/edit/${text.id}`);
                              }}
                              className="p-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-amber-600/30 hover:border-amber-600/50 rounded-lg transition-colors backdrop-blur-sm"
                              title="Edit document"
                            >
                              <Edit className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete?.(text.id, text.title);
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
                            {text.lenses.map((lens) => (
                              <span
                                key={lens}
                                className="px-1.5 py-0.5 bg-zinc-800/50 border border-amber-900/30 rounded text-xs text-amber-100/70"
                              >
                                {lens.replace(/_/g, ' ')}
                              </span>
                            ))}
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
                            {text.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-zinc-800/50 border border-amber-900/30 rounded text-xs text-amber-100/70"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Collection Reason */}
                      {text.curator_note && (
                        <div className="pt-2 border-t border-amber-900/20">
                          <p className="text-xs text-amber-100/70 leading-relaxed">
                            {text.curator_note}
                          </p>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

