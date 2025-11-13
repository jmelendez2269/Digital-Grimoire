'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import MediaCard, { MediaItem } from './MediaCard';

interface MediaGridProps {
  media: MediaItem[];
  isAdmin?: boolean;
  onDelete?: (mediaId: string, title: string) => void;
}

export default function MediaGrid({ media, isAdmin = false, onDelete }: MediaGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);

  // Calculate columns based on window width
  useEffect(() => {
    const updateColumns = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width >= 1536) setColumns(4); // 2xl: 4 columns
      else if (width >= 1024) setColumns(3); // lg: 3 columns
      else if (width >= 768) setColumns(2); // md: 2 columns
      else setColumns(1); // sm: 1 column
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Create rows from media (each row contains `columns` items)
  const rows = useMemo(() => {
    const result: MediaItem[][] = [];
    for (let i = 0; i < media.length; i += columns) {
      result.push(media.slice(i, i + columns));
    }
    return result;
  }, [media, columns]);

  // Virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Approximate height of a row (card + gap)
    overscan: 2, // Render 2 extra rows above and below
  });

  if (media.length === 0) {
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
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 mb-8">
                {row.map((item) => (
                  <MediaCard
                    key={item.id}
                    media={item}
                    isAdmin={isAdmin}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

