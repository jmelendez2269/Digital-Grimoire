'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

import { Sparkles, BookOpen, Lightbulb } from 'lucide-react';
import StelloquyOrb from '@/components/ui/StelloquyOrb';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useAuth } from '@/contexts/AuthContext';

const AISearchBar = dynamic(() => import('./AISearchBar'), {
    loading: () => <div className="h-12 w-full bg-zinc-800/50 animate-pulse rounded-lg" />
});
const LibrarySearchBar = dynamic(() => import('./LibrarySearchBar'), {
    loading: () => <div className="h-12 w-full bg-zinc-800/50 animate-pulse rounded-lg" />
});
const DeepSearchPanel = dynamic(() => import('./DeepSearch/DeepSearchPanel'), {
    loading: () => <div className="h-64 w-full bg-zinc-800/50 animate-pulse rounded-lg" />
});

export default function DashboardSearchHubContent() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { addHistory } = useSearchHistory();
    const [activeTab, setActiveTab] = useState<'ai' | 'library' | 'concept'>('concept');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const tabParam = searchParams.get('tab');
        if (tabParam === 'concept' || tabParam === 'library' || tabParam === 'ai') {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    // Prevent hydration mismatch by only rendering after mount
    if (!mounted) {
        return (
            <div className="w-full max-w-4xl mx-auto">
                <div className="flex gap-2 mb-6 border-b border-zinc-800 overflow-x-auto h-[53px]">
                    <div className="w-40 h-full bg-zinc-800/30 animate-pulse" />
                    <div className="w-40 h-full bg-zinc-800/30 animate-pulse" />
                    <div className="w-40 h-full bg-zinc-800/30 animate-pulse" />
                </div>
                <div className="h-[450px] bg-zinc-900/10 animate-pulse rounded-xl" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto">
            {/* Persistent Stelloquy intro */}
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-zinc-400">
                <StelloquyOrb state="listening" size="sm" />
                <span>
                    Stelloquy is ready. Ask anything — a concept, a tradition, a question
                    you can&apos;t quite name yet.
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-zinc-800 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('concept')}
                    className={`flex items-center gap-2 px-5 py-2.5 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'concept'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                        }`}
                >
                    <Lightbulb className="w-4 h-4" />
                    Concept Search
                </button>
                <button
                    onClick={() => setActiveTab('library')}
                    className={`flex items-center gap-2 px-5 py-2.5 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'library'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                        }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Library Search
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex items-center gap-2 px-5 py-2.5 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ai'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Parallax Search
                </button>
            </div>

            {/* Tab Content */}
            <div className="transition-all duration-200">
                {activeTab === 'ai' ? (
                    <div>
                        <AISearchBar />
                        <p className="mt-3 text-sm text-zinc-400 text-center">
                            Ask questions, get insights, or explore ideas with AI assistance
                        </p>
                    </div>
                ) : activeTab === 'library' ? (
                    <div>
                        <LibrarySearchBar />
                    </div>
                ) : (
                    <div>
                        <DeepSearchPanel
                            onSearch={async (q) => {
                                if (user) {
                                    await addHistory(q, 'concept');
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
