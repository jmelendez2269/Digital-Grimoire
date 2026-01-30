'use client';

import { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Lightbulb } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import AISearchBar from './AISearchBar';
import LibrarySearchBar from './LibrarySearchBar';
import DeepSearchPanel from './DeepSearch/DeepSearchPanel';

export default function DashboardSearchHubContent() {
    const searchParams = useSearchParams();
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
                <div className="flex gap-2 mb-6 border-b border-zinc-800 overflow-x-auto h-[50px]">
                    {/* Skeleton or empty placeholder to prevent layout shift */}
                </div>
                <div className="h-[200px]" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-zinc-800 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('concept')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'concept'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                        }`}
                >
                    <Lightbulb className="w-5 h-5" />
                    Concept Search
                </button>
                <button
                    onClick={() => setActiveTab('library')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'library'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                        }`}
                >
                    <BookOpen className="w-5 h-5" />
                    Library Search
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ai'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                        }`}
                >
                    <Sparkles className="w-5 h-5" />
                    AI Search
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
                        <DeepSearchPanel />
                    </div>
                )}
            </div>
        </div>
    );
}
