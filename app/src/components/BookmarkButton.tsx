'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Extract size constants outside component to avoid recreation on every render
const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
} as const;

const BUTTON_SIZE_CLASSES = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
} as const;

interface BookmarkButtonProps {
  textId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

function BookmarkButton({
  textId,
  size = 'md',
  showLabel = false,
  onBookmarkChange,
}: BookmarkButtonProps) {
  const { user } = useAuth(); // Use AuthContext instead of creating separate client
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkBookmarkStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/bookmarks?text_id=${textId}`);
      if (response.ok) {
        const data = await response.json();
        const bookmarked = data.bookmarks && data.bookmarks.length > 0;
        setIsBookmarked(bookmarked);
      }
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  }, [user, textId]);

  // Combined useEffect - check bookmark status when user or textId changes
  useEffect(() => {
    if (user) {
      checkBookmarkStatus();
    }
  }, [user, textId, checkBookmarkStatus]);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Redirect to login or show a message
      window.location.href = '/login?redirect=/library/' + textId;
      return;
    }

    setLoading(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        const response = await fetch(`/api/bookmarks?text_id=${textId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setIsBookmarked(false);
          onBookmarkChange?.(false);
        }
      } else {
        // Add bookmark
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text_id: textId }),
        });

        if (response.ok) {
          setIsBookmarked(true);
          onBookmarkChange?.(true);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Or show a disabled state
  }

  return (
    <button
      onClick={toggleBookmark}
      disabled={loading}
      className={`
        ${BUTTON_SIZE_CLASSES[size]}
        rounded-lg
        transition-all duration-200
        ${isBookmarked
          ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
          : 'bg-zinc-800/50 text-amber-100/40 hover:bg-zinc-800 hover:text-amber-400'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2
      `}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <Bookmark
        className={`${SIZE_CLASSES[size]} ${isBookmarked ? 'fill-current' : ''}`}
      />
      {showLabel && (
        <span className="text-sm font-medium">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
    </button>
  );
}

export default memo(BookmarkButton);
