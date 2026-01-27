'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Book, AlertCircle, Lightbulb } from 'lucide-react';
import RelatedTerms from '@/components/DeepSearch/RelatedTerms';
import BookResultCard from '@/components/DeepSearch/BookResultCard';

interface ConceptSuggestion {
    id: string;
    name: string;
    slug: string;
}

interface BookResult {
    text_id: string;
    title: string;
    author: string;
    chunks: Array<{
        chunk_id: string;
        content: string;
        similarity: number;
        chunk_index: number;
        sentence?: string;
        summary?: string;
    }>;
}

interface DeepSearchPanelProps {
    initialQuery?: string;
    onSearch?: (query: string) => void;
}

export default function DeepSearchPanel({ initialQuery = '', onSearch }: DeepSearchPanelProps) {
    const [query, setQuery] = useState(initialQuery);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ relatedTerms: string[], books: BookResult[], suggestions?: string[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

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
        setWarning(null); // Reset warning
        setResults(null);
        setSearched(true);

        if (onSearch) {
            onSearch(query);
        }

        try {
            const res = await fetch('/api/convergence/deep-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Important: include cookies for authentication
                body: JSON.stringify({ query }),
            });

            const resultData = await res.json(); // Always try to parse JSON for error/warning messages

            if (!res.ok) {
                // Try to extract error message from response
                const errorMessage = resultData.error || res.statusText || `Error ${res.status}`;
                throw new Error(errorMessage);
            }

            setResults(resultData);
            if (resultData.warning) {
                setWarning(resultData.warning);
            }
        } catch (err) {
            console.error('Deep search error:', err);
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while searching. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [query]);

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
                            onBlur={handleInputBlur}
                            placeholder="Enter a complex concept like 'Parabrahman' or 'Alchemy'..."
                            className="w-full px-6 py-4 bg-transparent text-amber-100 placeholder-amber-100/30 outline-none text-lg"
                        />
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
                                        // Highlight the search query in the suggestion name
                                        const highlightName = (name: string, searchQuery: string) => {
                                            if (!searchQuery || searchQuery.length < 3) return name;

                                            const queryLower = searchQuery.toLowerCase();
                                            const nameLower = name.toLowerCase();
                                            const queryIndex = nameLower.indexOf(queryLower);

                                            if (queryIndex === -1) return name;

                                            const before = name.substring(0, queryIndex);
                                            const match = name.substring(queryIndex, queryIndex + searchQuery.length);
                                            const after = name.substring(queryIndex + searchQuery.length);

                                            return (
                                                <>
                                                    {before}
                                                    <mark className="bg-amber-500/30 text-amber-200 px-0.5 rounded font-medium">
                                                        {match}
                                                    </mark>
                                                    {after}
                                                </>
                                            );
                                        };

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
                                                {highlightName(suggestion.name, query)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>

            {/* Results Area */}
            {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-200 mb-6">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}
            {warning && (
                <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl flex items-start gap-4 text-amber-200 mb-6 shadow-lg shadow-amber-950/20">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
                    <div className="flex flex-col gap-1">
                        <p className="font-semibold text-amber-100">Indexing Notice</p>
                        <p className="text-sm opacity-90">{warning}</p>
                    </div>
                </div>
            )}
            {results && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Variant Suggestions */}
                    {results.suggestions && results.suggestions.length > 0 && (
                        <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2 text-amber-100/60 text-xs font-semibold uppercase tracking-wider">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                <span>Try these related variants:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {results.suggestions.map((term) => (
                                    <button
                                        key={term}
                                        onClick={() => {
                                            setQuery(term);
                                            // Handle the search for the new term
                                            const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
                                            // Since handleSearch depends on the query state, and setQuery is async,
                                            // we might need to be careful. However, handleSearch is a callback that uses 'query'.
                                            // Let's use a small timeout to ensure state update or just call it directly with the term if we refactor.
                                            // But standard React pattern is to let the effect handle it or use a separate search function.
                                            // Actually, the simplest is to just trigger the search in a useEffect or similar.
                                            // For now, let's just update query and let the user click search, OR:
                                            setTimeout(() => handleSearch(fakeEvent), 0);
                                        }}
                                        className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm rounded-full border border-amber-500/30 transition-colors"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Related Terms */}
                    <div className="mb-8">
                        <RelatedTerms
                            terms={results.relatedTerms}
                            onTermClick={(term) => {
                                setQuery(term);
                                // Optional: auto-trigger search for the clicked term?
                                // For better UX, we could auto-trigger, but let's stick to simple input update for now.
                            }}
                        />
                    </div>

                    {/* Results Count */}
                    <div className="mb-4 flex items-center justify-between border-b border-amber-900/10 pb-2">
                        <h2 className="text-lg font-semibold text-amber-100">
                            Found {results.books.length} Books
                        </h2>
                    </div>

                    {/* Book Cards Grid */}
                    <div className="space-y-4">
                        {results.books.length > 0 ? (
                            results.books.map((book) => (
                                <BookResultCard key={book.text_id} book={book} searchQuery={query} />
                            ))
                        ) : (
                            <div className="text-center py-12 text-amber-100/40">
                                <Book className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No matching books found for this concept.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!searched && !loading && (
                <p className="mt-4 text-sm text-zinc-400 text-center">
                    Deep Search finds every book discussing your concept and highlights the exact passages.
                </p>
            )}
        </div>
    );
}
