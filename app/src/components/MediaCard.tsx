'use client';

import Link from 'next/link';
import SafeImage from './SafeImage';
import { Music, Video, Image as ImageIcon, Clock, User, Calendar, ShoppingCart } from 'lucide-react';
import { generateAffiliateLink, generateTrackedLink } from '@/lib/utils/affiliate';
import BookmarkButton from './BookmarkButton';

export interface MediaItem {
  id: string;
  title: string;
  author?: string;
  year?: number;
  media_type: 'audio' | 'video' | 'photo';
  duration?: number;
  thumbnail_url?: string;
  cover_image_url?: string;
  domain?: string;
  tags?: string[];
  created_at: string;
}

interface MediaCardProps {
  media: MediaItem;
  onDelete?: (id: string, title: string) => void;
  isAdmin?: boolean;
}

export default function MediaCard({ media, onDelete, isAdmin }: MediaCardProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getMediaIcon = () => {
    switch (media.media_type) {
      case 'audio':
        return <Music className="w-8 h-8 text-amber-400" />;
      case 'video':
        return <Video className="w-8 h-8 text-amber-400" />;
      case 'photo':
        return <ImageIcon className="w-8 h-8 text-amber-400" />;
    }
  };

  const thumbnailUrl = media.thumbnail_url || media.cover_image_url;

  return (
    <div className="group bg-zinc-900/50 border border-amber-900/20 rounded-xl overflow-hidden hover:border-amber-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-900/20 flex flex-col">
      {/* Thumbnail */}
      <Link href={`/library/media/${media.id}`} className="relative w-full h-48 bg-zinc-800/50 overflow-hidden flex-shrink-0">
        {thumbnailUrl ? (
          <SafeImage
            src={thumbnailUrl}
            alt={media.title}
            fill
            sizes="(max-width: 768px) 100vw, 192px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/20 to-zinc-900/50">
            {getMediaIcon()}
          </div>
        )}

        {/* Action buttons overlay */}
        <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200">
          <BookmarkButton textId={media.id} size="sm" />
        </div>

        {/* Duration badge for audio/video */}
        {(media.media_type === 'audio' || media.media_type === 'video') && media.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(media.duration)}
          </div>
        )}

        {/* Media type badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white capitalize">
          {media.media_type}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 p-4 space-y-3">
        {/* Title & Author */}
        <div>
          <Link href={`/library/media/${media.id}`}>
            <h3 className="text-base font-bold text-amber-100 mb-1 line-clamp-2 group-hover:text-amber-400 transition-colors">
              {media.title}
            </h3>
          </Link>
          {media.author && (
            <p className="text-xs text-amber-100/60 flex items-center gap-1.5">
              <User className="w-3 h-3" />
              {media.author}
              {media.year && <span className="ml-1">({media.year})</span>}
            </p>
          )}
        </div>

        {/* Domain */}
        {media.domain && (
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-amber-600/10 border border-amber-600/20 rounded-md text-xs font-medium text-amber-400">
              {media.domain}
            </div>
          </div>
        )}

        {/* Tags */}
        {media.tags && media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {media.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-zinc-800/50 border border-amber-900/30 rounded text-xs text-amber-100/70"
              >
                {tag}
              </span>
            ))}
            {media.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs text-amber-100/50">
                +{media.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/library/media/${media.id}`}
            className="flex-1 py-2 text-center bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-xs font-medium transition-all duration-200"
          >
            View {media.media_type === 'audio' ? 'Audio' : media.media_type === 'video' ? 'Video' : 'Photo'}
          </Link>
          <a
            href={generateTrackedLink(media.title, media.author, 'Media_Card')}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-900/30 rounded-lg transition-all duration-200"
            title="Buy on Amazon"
          >
            <ShoppingCart className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

