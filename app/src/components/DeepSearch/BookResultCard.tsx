'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Book, ChevronDown, ChevronUp, User } from 'lucide-react';

interface Chunk {
    chunk_id: string;
    content: string;
    similarity: number;
    chunk_index: number;
}

interface BookResult {
    text_id: string;
    title: string;
    author: string;
    chunks: Chunk[];
}

interface BookResultCardProps {
    book: BookResult;
}

export default function BookResultCard({ book }: BookResultCardProps) {
    const [expanded, setExpanded] = useState(false);
    const bestScore = Math.max(...book.chunks.map(c => c.similarity));

    // Show first chunk preview if not expanded, or all 3 if expanded
    const displayedChunks = expanded ? book.chunks : book.chunks.slice(0, 1);

    return (
        <div className="bg-zinc-900/40 border border-amber-900/20 rounded-xl overflow-hidden hover:border-amber-600/30 transition-all duration-300">
            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-serif font-semibold text-amber-100 mb-2">
                            <Link href={`/library/${book.text_id}`} className="hover:text-amber-400 hover:underline decoration-amber-400/30 underline-offset-4">
                                {book.title}
                            </Link>
                        </h3>
                        <div className="flex items-center gap-2 text-amber-100/60 text-sm mb-3">
                            <User className="w-4 h-4" />
                            <span>{book.author}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full border ${bestScore > 0.8
                                    ? 'bg-green-900/20 border-green-700/30 text-green-400'
                                    : bestScore > 0.75
                                        ? 'bg-amber-900/20 border-amber-700/30 text-amber-400'
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                }`}>
                                {Math.round(bestScore * 100)}% Match
                            </span>
                            <span className="text-xs text-zinc-500">
                                {book.chunks.length} relevant excerpt{book.chunks.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        {/* Thumbnail placeholder or book icon */}
                        <div className="w-12 h-16 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center">
                            <Book className="w-6 h-6 text-zinc-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Excerpts Section */}
            <div className="bg-zinc-950/30 border-t border-amber-900/10 p-4 space-y-4">
                {displayedChunks.map((chunk, idx) => (
                    <div key={chunk.chunk_id} className="relative group">
                        <div className="pl-4 border-l-2 border-amber-900/30 group-hover:border-amber-500/50 transition-colors">
                            <p className="text-amber-100/80 text-sm leading-relaxed line-clamp-4 group-hover:line-clamp-none transition-all duration-300">
                                "...{chunk.content}..."
                            </p>
                            <div className="mt-2 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs text-amber-400/70">
                                    Similarity: {(chunk.similarity * 100).toFixed(1)}%
                                </span>
                                <Link
                                    href={`/library/${book.text_id}?chunk=${chunk.chunk_id}`}
                                    className="text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                                >
                                    Read in context →
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Expand/Collapse Trigger */}
            {book.chunks.length > 1 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full py-2 bg-zinc-900/50 hover:bg-zinc-800 border-t border-amber-900/10 text-xs text-amber-100/50 hover:text-amber-100 transition-colors flex items-center justify-center gap-1"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3 h-3" />
                            Show Less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3" />
                            Show All {book.chunks.length} Excerpts
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
