'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Book, AlertCircle, Lightbulb, ShoppingCart } from 'lucide-react';
import RelatedTerms from '@/components/DeepSearch/RelatedTerms';
import BookResultCard from '@/components/DeepSearch/BookResultCard';
import { generateAffiliateLink, generateTrackedLink } from '@/lib/utils/affiliate';

interface ConceptSuggestion {
    id: string;
    name: string;
    slug: string;
}
interface AiSearchResult {
    summary: string;
    libraryResults: Array<{
        book_id: string;
        title: string;
        author: string;
        relevanceSentence: string;
        relevanceLabel?: string;
        excerpts: Array<{
            text: string;
            page_number: number;
        }>;
    }>;
    externalRecommendations: Array<{
        title: string;
        author: string;
        reason: string;
    }>;
}

interface DeepSearchPanelProps {
    initialQuery?: string;
    onSearch?: (query: string) => void;
}

export default function DeepSearchPanel({ initialQuery = '', onSearch }: DeepSearchPanelProps) {
    const [query, setQuery] = useState(initialQuery);
    const [loading, setLoading] = useState(false);
    const [aiResults, setAiResults] = useState<AiSearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    // Collapsible states
    const [isLibraryOpen, setIsLibraryOpen] = useState(true);
    const [isExternalOpen, setIsExternalOpen] = useState(true);

    // Autocomplete suggestions state
    const [suggestions, setSuggestions] = useState<ConceptSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Fetch suggestions from API
    const fetchSuggestions = useCallback(async (searchQuery: string) => {
        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        setLoadingSuggestions(true);

        try {
            const res = await fetch(`/api/concepts?q=${encodeURIComponent(searchQuery)}&limit=8`, {
                credentials: 'include',
                signal: abortControllerRef.current.signal,
            });

            if (!res.ok) {
                throw new Error('Failed to fetch suggestions');
            }

            const data = await res.json();
            const concepts = (data.items || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
            }));

            setSuggestions(concepts);
            setShowSuggestions(concepts.length > 0);
            setSelectedIndex(-1);
        } catch (err: any) {
            // Ignore abort errors
            if (err.name !== 'AbortError') {
                console.error('Error fetching suggestions:', err);
                setSuggestions([]);
                setShowSuggestions(false);
            }
        } finally {
            setLoadingSuggestions(false);
        }
    }, []);

    // Debounced suggestion fetching
    useEffect(() => {
        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (query.length >= 3) {
            // Debounce API call
            debounceTimerRef.current = setTimeout(() => {
                fetchSuggestions(query);
            }, 300);
        } else {
            // Hide suggestions if query is too short
            setSuggestions([]);
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }

        // Cleanup
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [query, fetchSuggestions]);

    // Handle search
    const handleSearch = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        // Hide suggestions when searching
        setShowSuggestions(false);
        setSelectedIndex(-1);

        setLoading(true);
        setError(null);
        setAiResults(null);
        setSearched(true);

        if (onSearch) {
            onSearch(query);
        }
        try {
            const res = await fetch('/api/parallax/ai-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ query }),
            });

            const resultData = await res.json();

            if (!res.ok) {
                const errorMessage = resultData.error || res.statusText || `Error ${res.status}`;
                throw new Error(errorMessage);
            }

            setAiResults(resultData);
        } catch (err) {
            console.error('Deep search error:', err);
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while searching. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [query, onSearch]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) {
            // If Enter is pressed without suggestions, trigger search
            if (e.key === 'Enter') {
                handleSearch(e);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    const selected = suggestions[selectedIndex];
                    setQuery(selected.name);
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                    inputRef.current?.blur();
                } else {
                    handleSearch(e);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
            case 'Tab':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    }, [showSuggestions, suggestions, selectedIndex, handleSearch]);

    // Handle suggestion selection
    const handleSuggestionClick = useCallback((suggestion: ConceptSuggestion) => {
        setQuery(suggestion.name);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    }, []);

    // Handle input focus
    const handleInputFocus = useCallback(() => {
        if (query.length >= 3 && suggestions.length > 0) {
            setShowSuggestions(true);
        }
    }, [query.length, suggestions.length]);

    // Handle input blur (with delay to allow clicks)
    const handleInputBlur = useCallback(() => {
        // Small delay to allow click events on suggestions
        setTimeout(() => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(document.activeElement)) {
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        }, 200);
    }, []);

    return (
        <div className="w-full">
            {/* Search Input */}
            <div className="mb-8">
                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-amber-600/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center bg-zinc-900/80 border border-amber-900/30 rounded-xl overflow-visible focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50 shadow-2xl transition-all">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur} placeholder="Enter a complex concept like 'Parabrahman' or 'Alchemy'..."
                            className="w-full px-6 py-4 bg-transparent text-amber-100 placeholder-amber-100/30 outline-none text-lg"
                        />
                        {/* Model selector removed for auto-balancing */}
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="px-6 py-4 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border-l border-amber-900/30 disabled:opacity-50 transition-colors"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <Search className="w-6 h-6" />
                            )}
                        </button>
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && (
                        <div
                            ref={suggestionsRef}
                            className="absolute top-full left-0 right-0 mt-1 bg-zinc-900/95 border border-amber-900/30 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto"
                        >
                            {loadingSuggestions ? (
                                <div className="px-4 py-3 text-amber-100/60 text-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Loading suggestions...</span>
                                </div>
                            ) : suggestions.length === 0 ? (
                                <div className="px-4 py-3 text-amber-100/40 text-sm">
                                    No suggestions found
                                </div>
                            ) : (
                                <div className="py-1">
                                    {suggestions.map((suggestion, index) => {
                                        // Highlight logic (inline for simplicity or extracted)
                                        return (
                                            <button
                                                key={suggestion.id}
                                                type="button"
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${index === selectedIndex
                                                    ? 'bg-amber-900/30 text-amber-200'
                                                    : 'text-amber-100/80 hover:bg-amber-900/20 hover:text-amber-100'
                                                    }`}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                            >
                                                {suggestion.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {aiResults && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* 1. CONCEPT SUMMARY */}
                    <div className="bg-zinc-900/40 border border-amber-900/20 rounded-xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Lightbulb className="w-24 h-24 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-serif text-amber-100 mb-4 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-400" />
                            Concept Summary
                        </h2>
                        <div className="prose prose-invert prose-amber max-w-none text-amber-100/90 leading-relaxed">
                            <p>{aiResults.summary}</p>
                        </div>
                    </div>

                    {/* 2. LIBRARY RESULTS (Collapsible) */}
                    <div className="border border-amber-900/20 rounded-xl overflow-hidden bg-zinc-900/20">
                        <button
                            onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                            className="w-full flex items-center justify-between p-4 bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors"
                        >
                            <h2 className="text-xl font-serif text-amber-100 flex items-center gap-2">
                                <Book className="w-5 h-5 text-amber-400" />
                                From the Project Parallax Library
                                <span className="ml-2 text-sm text-amber-100/50 font-sans px-2 py-0.5 bg-amber-900/30 rounded-full">
                                    {aiResults.libraryResults.length} Books
                                </span>
                            </h2>
                            <span className="text-amber-100/50 text-sm">
                                {isLibraryOpen ? 'Collapse' : 'Expand'}
                            </span>
                        </button>

                        {isLibraryOpen && (
                            <div className="p-4 space-y-8">
                                {/* TOP 3 RESULTS */}
                                <div className="space-y-6">
                                    {aiResults.libraryResults.slice(0, 3).map((book, idx) => (
                                        <div key={book.book_id} className="bg-black/20 border border-amber-900/20 rounded-lg p-5 hover:border-amber-500/40 transition-all relative overflow-hidden group">
                                            {/* Rank Indicator */}
                                            <div className="absolute top-0 left-0 bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-1 rounded-br-lg border-b border-r border-amber-500/20">
                                                #{idx + 1} Top Match
                                            </div>

                                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4 mt-2">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="text-xl font-medium text-amber-100">{book.title}</h3>
                                                        {book.relevanceLabel && (
                                                            <span className={`text-xs px-2 py-0.5 rounded border ${book.relevanceLabel.includes('High') || book.relevanceLabel.includes('Foundational')
                                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                                }`}>
                                                                {book.relevanceLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-amber-100/60">by {book.author}</p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <a
                                                        href={`/library/reader/${book.book_id}`}
                                                        className="px-3 py-1.5 bg-amber-600/20 text-amber-200 text-xs rounded-md hover:bg-amber-600/30 border border-amber-600/20 transition-colors"
                                                    >
                                                        Read Book
                                                    </a>
                                                    <a
                                                        href={generateTrackedLink(book.title, book.author, 'DeepSearch_Library')}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-md hover:bg-zinc-700 border border-zinc-700 transition-colors"
                                                    >
                                                        Buy Copy
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="mb-4 p-3 bg-amber-900/10 rounded-md border-l-2 border-amber-500/50">
                                                <p className="text-sm text-amber-100/90 italic">
                                                    <span className="font-semibold text-amber-400 not-italic mr-2">Analysis:</span>
                                                    {book.relevanceSentence}
                                                </p>
                                            </div>

                                            <div className="space-y-3 pl-2 border-l border-white/5">
                                                {book.excerpts.slice(0, 3).map((excerpt, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={`/library/reader/${book.book_id}?page=${excerpt.page_number}`}
                                                        className="block group/excerpt cursor-pointer"
                                                    >
                                                        <div className="text-sm text-amber-100/60 group-hover/excerpt:text-amber-100 transition-colors line-clamp-2 pl-3 relative">
                                                            <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-zinc-700 group-hover/excerpt:bg-amber-500 transition-colors" />
                                                            "{excerpt.text}"
                                                            <span className="ml-2 text-xs text-amber-500/50 group-hover/excerpt:text-amber-500 transition-colors">
                                                                (p. {excerpt.page_number})
                                                            </span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* OTHER RESULTS */}
                                {aiResults.libraryResults.length > 3 && (
                                    <div className="pt-6 border-t border-white/5">
                                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4 px-1">Other Relevant Texts</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {aiResults.libraryResults.slice(3).map((book) => (
                                                <div key={book.book_id} className="bg-zinc-900/40 border border-white/5 rounded-lg p-3 hover:bg-zinc-900/60 hover:border-amber-500/20 transition-all group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-medium text-zinc-300 truncate group-hover:text-white transition-colors">{book.title}</h4>
                                                                {book.relevanceLabel && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-500 border border-white/5 whitespace-nowrap">
                                                                        {book.relevanceLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-zinc-500 truncate">{book.author}</p>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <a
                                                                href={generateTrackedLink(book.title, book.author, 'DeepSearch_Library_Small')}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 px-2 py-1 bg-amber-600/10 text-amber-300 text-[10px] rounded hover:bg-amber-600/20 border border-amber-600/20 transition-all"
                                                            >
                                                                <ShoppingCart className="w-2.5 h-2.5" />
                                                                Buy
                                                            </a>
                                                            <a
                                                                href={`/library/reader/${book.book_id}`}
                                                                className="px-2 py-1 bg-white/5 text-zinc-300 text-[10px] rounded hover:bg-white/10 transition-all"
                                                            >
                                                                Open
                                                            </a>
                                                        </div>
                                                    </div>

                                                    {/* Preview Snippet */}
                                                    {book.excerpts.length > 0 && (
                                                        <p className="text-xs text-zinc-600 line-clamp-2 italic group-hover:text-zinc-500 transition-colors">
                                                            "{book.excerpts[0].text}"
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. EXTERNAL RECOMMENDATIONS (Collapsible) */}
                    <div className="border border-amber-900/20 rounded-xl overflow-hidden bg-zinc-900/20">
                        <button
                            onClick={() => setIsExternalOpen(!isExternalOpen)}
                            className="w-full flex items-center justify-between p-4 bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors"
                        >
                            <h2 className="text-xl font-serif text-amber-100 flex items-center gap-2">
                                <Search className="w-5 h-5 text-amber-400" />
                                Further Reading (External)
                            </h2>
                            <span className="text-amber-100/50 text-sm">
                                {isExternalOpen ? 'Collapse' : 'Expand'}
                            </span>
                        </button>

                        {isExternalOpen && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {aiResults.externalRecommendations.map((rec, idx) => (
                                    <div key={idx} className="bg-black/20 border border-amber-900/10 rounded-lg p-5 flex flex-col justify-between hover:border-amber-500/30 transition-colors">
                                        <div>
                                            <h3 className="font-medium text-amber-100 mb-1">{rec.title}</h3>
                                            <p className="text-sm text-amber-100/60 mb-3">{rec.author}</p>
                                            <p className="text-xs text-amber-100/50 mb-4 line-clamp-3">{rec.reason}</p>
                                        </div>
                                        <a
                                            href={generateTrackedLink(rec.title, rec.author, 'DeepSearch_External')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full text-center py-2 bg-zinc-800 text-zinc-300 text-xs rounded hover:bg-zinc-700 border border-zinc-700 transition-colors mt-auto"
                                        >
                                            Buy on Amazon
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!searched && !loading && (
                <p className="mt-4 text-sm text-zinc-400 text-center">
                    Deep Search uses AI to summarize concepts and find relevant texts in our library and beyond.
                </p>
            )}
        </div>
    );
}
