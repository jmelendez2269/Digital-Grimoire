'use client';

import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BookmarkButtonProps {
  textId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export default function BookmarkButton({
  textId,
  size = 'md',
  showLabel = false,
  onBookmarkChange,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      checkBookmarkStatus();
    }
  }, [user, textId]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const checkBookmarkStatus = async () => {
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
  };

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

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  if (!user) {
    return null; // Or show a disabled state
  }

  return (
    <button
      onClick={toggleBookmark}
      disabled={loading}
      className={`
        ${buttonSizeClasses[size]}
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
        className={`${sizeClasses[size]} ${isBookmarked ? 'fill-current' : ''}`}
      />
      {showLabel && (
        <span className="text-sm font-medium">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
    </button>
  );
}

