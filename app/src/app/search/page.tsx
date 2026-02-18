'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Book, Sparkles, Brain, History, Clock, ArrowRight, Loader2, X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArcaneLoader from '@/components/ui/ArcaneLoader';
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
    const [activeTab, setActiveTab] = useState<SearchSource>('concept');
    const [isSearching, setIsSearching] = useState(false);

    // Initial load
    useEffect(() => {
        if (user) {
            fetchHistory();
        }

        const q = searchParams.get('q') || searchParams.get('query');
        const type = searchParams.get('type');

        if (q) setQuery(q);
        if (type === 'library' || type === 'books') setActiveTab('library');
        if (type === 'convergence' || type === 'parallax') setActiveTab('parallax');

    }, [user, fetchHistory, searchParams]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);

        // Add to history
        if (user) {
            await addHistory(query, activeTab);
        }

        // Route based on tab
        if (activeTab === 'library') {
            router.push(`/library?search=${encodeURIComponent(query)}`);
        } else if (activeTab === 'parallax') {
            router.push(`/parallax-engine?query=${encodeURIComponent(query)}`);
        } else {
            // Concept search handled inline
            return;

            // Wait, if I redirect, the user leaves this page.
            // The user wants "keep the history of your searches".
            // If I just redirect, they see the history on this page when they come back.
            // router.push(`/?query=${encodeURIComponent(query)}&tab=concept`);
        }

        setIsSearching(false);
    };

    const handleHistoryClick = (item: any) => {
        setQuery(item.query);
        setActiveTab(item.source as SearchSource);
        // Optional: auto-search
        // handleSearch(); 
    };

    return (
        <div className="flex min-h-screen flex-col bg-black text-zinc-100">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex flex-col gap-8">

                    {/* Hero / Search Section */}
                    <div className="flex flex-col items-center gap-6 text-center py-10">
                        <div className="space-y-2">
                            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-100 to-amber-400 bg-clip-text text-transparent">
                                Knowledge Matrix
                            </h1>
                            <p className="text-zinc-400">
                                Access the collective wisdom through multiple lenses
                            </p>
                        </div>

                        {/* Search Tabs */}
                        <div className="flex p-1 bg-zinc-900/50 rounded-lg border border-white/5 backdrop-blur-sm">
                            {(['concept', 'library', 'parallax'] as SearchSource[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                                        ${activeTab === tab
                                            ? 'bg-amber-500/10 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
                                    `}
                                >
                                    {tab === 'parallax' && <Sparkles className="w-4 h-4" />}
                                    {tab === 'library' && <Book className="w-4 h-4" />}
                                    {tab === 'concept' && <Brain className="w-4 h-4" />}

                                    <span className="capitalize">
                                        {tab === 'parallax' ? 'AI Search' :
                                            tab === 'library' ? 'Library Search' :
                                                'Concept Search'}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search Input Area - Conditional Render */}
                        {activeTab === 'concept' ? (
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
                        ) : (
                            <form onSubmit={handleSearch} className="w-full max-w-2xl relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-amber-500/20 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                <div className="relative flex items-center bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-colors group-focus-within:border-amber-500/50">
                                    <div className="pl-4 text-zinc-500">
                                        <Search className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={
                                            activeTab === 'parallax' ? "Ask the Parallax Engine..." :
                                                "Search across the library..."
                                        }
                                        className="flex-1 w-full bg-transparent border-0 px-4 py-4 text-lg text-white placeholder-zinc-600 focus:ring-0 focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!query.trim() || isSearching}
                                        className="pr-4 pl-2 text-amber-500 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
                                    >
                                        {isSearching ? <ArcaneLoader size="sm" /> : <ArrowRight className="w-6 h-6" />}
                                    </button>
                                </div>
                            </form>
                        )}
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
                                            {item.source === 'parallax' && <Sparkles className="w-4 h-4 text-cyan-400" />}
                                            {item.source === 'library' && <Book className="w-4 h-4 text-emerald-400" />}
                                            {item.source === 'concept' && <Brain className="w-4 h-4 text-amber-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-300 group-hover:text-white truncate">
                                                {item.query}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded">
                                                    {item.source}
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

