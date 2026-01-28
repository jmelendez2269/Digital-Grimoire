'use client';

import React, { useState } from 'react';
import Link from 'next/link';
<<<<<<< HEAD
import { Book, ChevronDown, ChevronUp, User, ExternalLink } from 'lucide-react';
=======
import { Book, ChevronDown, ChevronUp, User } from 'lucide-react';
>>>>>>> origin/main

interface Chunk {
    chunk_id: string;
    content: string;
    similarity: number;
    chunk_index: number;
<<<<<<< HEAD
    sentence?: string;
    summary?: string;
=======
>>>>>>> origin/main
}

interface BookResult {
    text_id: string;
    title: string;
    author: string;
    chunks: Chunk[];
}

interface BookResultCardProps {
    book: BookResult;
<<<<<<< HEAD
    searchQuery: string;
}

/**
 * Get related word variations for highlighting
 */
function getRelatedWords(query: string): string[] {
    const queryLower = query.toLowerCase();
    const relatedTerms: { [key: string]: string[] } = {
        'alchemy': ['alchemical', 'alchemist', 'alchemists', 'alchemically'],
        'alchem': ['alchemy', 'alchemical', 'alchemist', 'alchemists', 'alchemically'],
        'hermetic': ['hermeticism', 'hermetical', 'hermetically'],
        'kabbalah': ['kabbalistic', 'cabala', 'qabalah', 'kabbalah'],
        'gnostic': ['gnosticism', 'gnosis'],
        'mystic': ['mystical', 'mysticism', 'mystics'],
        'esoteric': ['esotericism', 'esoterically'],
        'occult': ['occultism', 'occultist', 'occultists'],
        'brahman': ['parabrahman', 'brahmanical', 'brahmana', 'brahmic'],
    };

    // Check for exact matches
    if (relatedTerms[queryLower]) {
        return [queryLower, ...relatedTerms[queryLower]];
    }

    // Check for partial matches (e.g., "alchem" matches "alchemy")
    for (const [key, variants] of Object.entries(relatedTerms)) {
        if (queryLower.includes(key) || key.includes(queryLower)) {
            return [queryLower, key, ...variants];
        }
    }

    return [queryLower];
}

/**
 * Highlight the search query and related terms in a sentence
 */
function highlightQuery(sentence: string, query: string): React.ReactNode {
    if (!sentence || !query) return sentence;

    const queryLower = query.toLowerCase();
    const sentenceLower = sentence.toLowerCase();

    // Get all words to highlight (query + related terms)
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    const allWordsToHighlight = new Set<string>();

    // Add query words
    queryWords.forEach(word => {
        allWordsToHighlight.add(word.toLowerCase());
        // Add related variations
        getRelatedWords(word).forEach(related => allWordsToHighlight.add(related));
    });

    // Also add the full query
    allWordsToHighlight.add(queryLower);
    getRelatedWords(queryLower).forEach(related => allWordsToHighlight.add(related));

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let keyCounter = 0;

    // Find all matches (exact and related terms)
    const matches: Array<{ word: string; index: number; length: number }> = [];

    for (const wordToMatch of allWordsToHighlight) {
        // Use word boundary regex for better matching
        const regex = new RegExp(`\\b${wordToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'gi');
        let match;

        while ((match = regex.exec(sentence)) !== null) {
            matches.push({
                word: match[0],
                index: match.index,
                length: match[0].length
            });
        }
    }

    // Sort matches by index and remove overlaps
    matches.sort((a, b) => a.index - b.index);
    const nonOverlappingMatches: Array<{ word: string; index: number; length: number }> = [];

    for (const match of matches) {
        if (nonOverlappingMatches.length === 0) {
            nonOverlappingMatches.push(match);
        } else {
            const last = nonOverlappingMatches[nonOverlappingMatches.length - 1];
            // Only add if it doesn't overlap with previous match
            if (match.index >= last.index + last.length) {
                nonOverlappingMatches.push(match);
            } else {
                // Keep the longer match if they overlap
                if (match.length > last.length) {
                    nonOverlappingMatches[nonOverlappingMatches.length - 1] = match;
                }
            }
        }
    }

    // Build highlighted parts
    for (const match of nonOverlappingMatches) {
        if (match.index > lastIndex) {
            parts.push(sentence.substring(lastIndex, match.index));
        }
        parts.push(
            <mark key={keyCounter++} className="bg-amber-500/30 text-amber-200 px-1 rounded font-medium">
                {sentence.substring(match.index, match.index + match.length)}
            </mark>
        );
        lastIndex = match.index + match.length;
    }

    if (lastIndex < sentence.length) {
        parts.push(sentence.substring(lastIndex));
    }

    return parts.length > 1 ? parts : sentence;
}

export default function BookResultCard({ book, searchQuery }: BookResultCardProps) {
    const [expanded, setExpanded] = useState(false);

    // Sort chunks by similarity (relevance) to ensure best matches appear first
    const sortedChunks = [...book.chunks].sort((a, b) => b.similarity - a.similarity);
    const bestScore = sortedChunks.length > 0 ? sortedChunks[0].similarity : 0;

    // Show first chunk preview if not expanded, or all sorted chunks if expanded
    const displayedChunks = expanded ? sortedChunks : sortedChunks.slice(0, 1);

    // Helper to extract a sentence from content
    const extractSentence = (content: string, query: string): string => {
        if (!content) return '';

        // Split into sentences
        const sentences = content.split(/(?<=[.!?])\s+/);
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        // Try to find sentence with query
        for (const sentence of sentences) {
            const sentenceLower = sentence.toLowerCase();
            if (sentenceLower.includes(queryLower) ||
                queryWords.some(word => sentenceLower.includes(word))) {
                const trimmed = sentence.trim();
                return trimmed.length > 250 ? trimmed.substring(0, 250) + '...' : trimmed;
            }
        }

        // Fallback to first sentence
        const firstSentence = sentences[0]?.trim() || '';
        return firstSentence.length > 250 ? firstSentence.substring(0, 250) + '...' : firstSentence;
    };
=======
}

export default function BookResultCard({ book }: BookResultCardProps) {
    const [expanded, setExpanded] = useState(false);
    const bestScore = Math.max(...book.chunks.map(c => c.similarity));

    // Show first chunk preview if not expanded, or all 3 if expanded
    const displayedChunks = expanded ? book.chunks : book.chunks.slice(0, 1);
>>>>>>> origin/main

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
<<<<<<< HEAD
                                ? 'bg-green-900/20 border-green-700/30 text-green-400'
                                : bestScore > 0.75
                                    ? 'bg-amber-900/20 border-amber-700/30 text-amber-400'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
=======
                                    ? 'bg-green-900/20 border-green-700/30 text-green-400'
                                    : bestScore > 0.75
                                        ? 'bg-amber-900/20 border-amber-700/30 text-amber-400'
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
>>>>>>> origin/main
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
<<<<<<< HEAD
                {displayedChunks.map((chunk, idx) => {
                    // Extract sentence from content if not provided by API
                    let sentence = chunk.sentence;
                    if (!sentence && chunk.content) {
                        sentence = extractSentence(chunk.content, searchQuery);
                    }
                    // Ensure sentence is never too long
                    if (sentence && sentence.length > 300) {
                        sentence = sentence.substring(0, 300) + '...';
                    }

                    const summary = chunk.summary || 'Discusses the concept in context.';

                    return (
                        <div key={chunk.chunk_id} className="relative group">
                            <div className="pl-4 border-l-2 border-amber-900/30 group-hover:border-amber-500/50 transition-colors space-y-2">
                                {/* Highlighted Sentence */}
                                <div className="text-amber-100/90 text-sm leading-relaxed italic">
                                    "{sentence ? highlightQuery(sentence, searchQuery) : 'Loading...'}"
                                </div>

                                {/* Summary */}
                                <p className="text-amber-100/60 text-xs leading-relaxed">
                                    {highlightQuery(summary, searchQuery)}
                                </p>

                                {/* Link and Similarity */}
                                <div className="mt-2 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs text-amber-400/70">
                                        Similarity: {(chunk.similarity * 100).toFixed(1)}%
                                    </span>
                                    <Link
                                        href={`/library/${book.text_id}?chunk=${chunk.chunk_id}`}
                                        className="text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 transition-colors"
                                    >
                                        View excerpt
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
=======
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
>>>>>>> origin/main
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
