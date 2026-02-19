'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Book, Sparkles, Brain, History, Clock, ArrowRight, Loader2, X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ParallaxLoader from '@/components/ui/ParallaxLoader';
import AppLoader from '@/components/ui/AppLoader';
import DeepSearchPanel from '@/components/DeepSearch/DeepSearchPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { SearchSource } from '@/lib/search/types';

function SearchPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { history, loading: historyLoading, fetchHistory, addHistory, deleteHistory } = useSearchHistory();

    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Initial load
    useEffect(() => {
        if (user) {
            fetchHistory('concept');
        }

        const q = searchParams.get('q') || searchParams.get('query');
        if (q) setQuery(q);

    }, [user, fetchHistory, searchParams]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        // Concept search is handled by DeepSearchPanel
    };

    const handleHistoryClick = (item: any) => {
        setQuery(item.query);
        // DeepSearchPanel will pick up the query change
    };

    return (
        <div className="flex min-h-screen flex-col bg-black text-zinc-100">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex flex-col gap-8">

                    {/* Hero / Search Section */}
                    <div className="flex flex-col items-center gap-6 text-center py-10">
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-200 via-cyan-400 to-amber-200 bg-clip-text text-transparent">
                                Concept Search
                            </h1>
                            <p className="text-zinc-400 max-w-xl mx-auto text-lg">
                                Deeply explore esoteric, scientific, and philosophical concepts through a multidimensional lens.
                            </p>
                        </div>

                        <div className="w-full">
                            <DeepSearchPanel
                                initialQuery={query}
                                onSearch={async (q) => {
                                    if (user) {
                                        await addHistory(q, 'concept');
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h2 className="text-lg font-medium text-zinc-300 flex items-center gap-2">
                                <History className="w-4 h-4 text-amber-500" />
                                Recent Searches
                            </h2>
                            {/* <button className="text-xs text-zinc-500 hover:text-red-400">Clear History</button> */}
                        </div>

                        {historyLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
                            </div>
                        ) : history.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group relative flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/50 hover:border-amber-500/20 transition-all cursor-pointer"
                                        onClick={() => handleHistoryClick(item)}
                                    >
                                        <div className="mt-1 shrink-0">
                                            <Brain className="w-4 h-4 text-amber-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-300 group-hover:text-white truncate">
                                                {item.query}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] uppercase tracking-wider font-mono text-cyan-500/50">
                                                    Concept
                                                </span>
                                                <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteHistory(item.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-opacity"
                                            aria-label="Delete history item"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-zinc-600 italic">
                                No recent history found. Start exploring...
                            </div>
                        )}
                    </div>

                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<AppLoader fullScreen />}>
            <SearchPageContent />
        </Suspense>
    );
}

