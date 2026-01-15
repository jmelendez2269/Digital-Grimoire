'use client';

import { useState } from 'react';
import { Search, Loader2, Book, AlertCircle } from 'lucide-react';
import RelatedTerms from '@/components/DeepSearch/RelatedTerms';
import BookResultCard from '@/components/DeepSearch/BookResultCard';

interface BookResult {
    text_id: string;
    title: string;
    author: string;
    chunks: Array<{
        chunk_id: string;
        content: string;
        similarity: number;
        chunk_index: number;
    }>;
}

export default function DeepSearchPanel() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ relatedTerms: string[], books: BookResult[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    async function handleSearch(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setSearched(true);

        try {
            const res = await fetch('/api/convergence/deep-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Important: include cookies for authentication
                body: JSON.stringify({ query }),
            });

            if (!res.ok) {
                // Try to extract error message from response
                let errorMessage = 'Search failed';
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    // If response isn't JSON, use status text
                    errorMessage = res.statusText || `Error ${res.status}`;
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();
            setResults(data);
        } catch (err) {
            console.error('Deep search error:', err);
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while searching. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full">
            {/* Search Input */}
            <div className="mb-8">
                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-amber-600/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center bg-zinc-900/80 border border-amber-900/30 rounded-xl overflow-hidden focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50 shadow-2xl transition-all">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
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
                </form>
            </div>

            {/* Results Area */}
            {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-200 mb-6">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {results && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                                <BookResultCard key={book.text_id} book={book} />
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
