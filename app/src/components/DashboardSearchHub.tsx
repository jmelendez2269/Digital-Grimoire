'use client';

import { useState } from 'react';
import { Sparkles, BookOpen } from 'lucide-react';
import AISearchBar from './AISearchBar';
import LibrarySearchBar from './LibrarySearchBar';

export default function DashboardSearchHub() {
  const [activeTab, setActiveTab] = useState<'ai' | 'library'>('ai');

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'ai'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          AI Search
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'library'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          Library Search
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
        ) : (
          <div>
            <LibrarySearchBar />
          </div>
        )}
      </div>
    </div>
  );
}

