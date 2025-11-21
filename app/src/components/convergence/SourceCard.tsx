'use client';

import Link from 'next/link';
import { BookOpen, Link2 } from 'lucide-react';

interface Source {
  text_id: string;
  text_title?: string;
  text_author?: string;
  chunk_id?: string;
  chunk_index?: number;
  relevance?: number;
  content_preview?: string;
}

interface SourceCardProps {
  source: Source;
  lensName?: string;
}

export default function SourceCard({ source, lensName }: SourceCardProps) {
  const title = source.text_title || 'Unknown Document';
  const author = source.text_author;
  const relevance = source.relevance;
  const contentPreview = source.content_preview;

  return (
    <div className="bg-zinc-800/50 border border-amber-900/20 rounded-lg p-4 hover:bg-zinc-800/70 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <Link
              href={`/library/${source.text_id}`}
              className="text-sm font-medium text-amber-100 hover:text-amber-400 transition-colors truncate"
            >
              {title}
            </Link>
          </div>
          
          {author && (
            <p className="text-xs text-amber-100/60 ml-6 mb-1">
              by {author}
            </p>
          )}

          {contentPreview && (
            <p className="text-xs text-amber-100/50 ml-6 mt-2 line-clamp-2">
              {contentPreview}
            </p>
          )}

          {relevance !== undefined && (
            <div className="mt-2 ml-6">
              <span className="text-xs text-amber-100/40">
                Relevance: {(relevance * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        <Link
          href={`/library/${source.text_id}`}
          className="flex-shrink-0 text-amber-100/60 hover:text-amber-400 transition-colors"
          title="View document"
        >
          <Link2 className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

