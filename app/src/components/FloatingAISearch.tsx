'use client';

import { useState } from 'react';
import { Sparkles, X, ChevronUp, ChevronDown } from 'lucide-react';
import AISearchBar from './AISearchBar';

interface FloatingAISearchProps {
  defaultCollapsed?: boolean;
}

export default function FloatingAISearch({ defaultCollapsed = true }: FloatingAISearchProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  // If collapsed, show floating button
  // Position it higher to avoid conflicts with other floating elements (like WikiLinkActions)
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
        aria-label="Open AI Search"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">AI Search</span>
      </button>
    );
  }

  // If expanded, show full search bar in floating panel
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 border-t border-amber-900/20 backdrop-blur-lg shadow-2xl">
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsExpanded(false)}
        className="absolute -top-10 right-4 p-2 bg-zinc-900/95 border border-amber-900/20 rounded-t-lg hover:bg-zinc-800 transition-colors flex items-center gap-2 text-amber-100/80 hover:text-amber-100"
        aria-label="Collapse AI Search"
      >
        <ChevronDown className="w-4 h-4" />
        <span className="text-xs">Collapse</span>
      </button>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-100">AI Search</h3>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-amber-100/60" />
          </button>
        </div>
        
        {/* AI Search Bar */}
        <AISearchBar />
      </div>
    </div>
  );
}

