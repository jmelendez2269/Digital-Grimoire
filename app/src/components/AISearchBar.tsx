'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

// Lazy load AIChatModal - only needed when user opens it
const AIChatModal = dynamic(() => import('./AIChatModal'), {
  ssr: false,
  loading: () => null,
});

type Model = 'auto' | 'claude' | 'gpt' | 'gemini' | 'convergence';

interface UsageStats {
  claude: number;
  gpt: number;
  gemini: number;
}

interface AISearchBarProps {
  className?: string;
}

export default function AISearchBar({ className = '' }: AISearchBarProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<Model>('auto');
  const [autoSelectedModel, setAutoSelectedModel] = useState<'claude' | 'gpt' | 'gemini' | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatModel, setChatModel] = useState<'claude' | 'gpt' | 'gemini'>('claude');
  const [chatQuery, setChatQuery] = useState('');
  const hasFetchedUsage = useRef(false);

  // Fetch usage stats when component mounts or when auto is selected
  // Only fetch if auth is ready and user is logged in
  useEffect(() => {
    if (selectedModel === 'auto' && !hasFetchedUsage.current && !authLoading && user) {
      fetchUsageStats();
    } else if (selectedModel === 'auto' && !authLoading && !user && !autoSelectedModel) {
      // If no user, default to Claude
      setAutoSelectedModel('claude');
    }
  }, [selectedModel, authLoading, user]);

  // Auto-select model when usage stats are loaded
  useEffect(() => {
    if (selectedModel === 'auto' && usageStats && !autoSelectedModel) {
      selectLeastUsedModel(usageStats);
    }
  }, [usageStats, selectedModel, autoSelectedModel]);

  async function fetchUsageStats() {
    if (loadingUsage || hasFetchedUsage.current || !user) return;
    
    setLoadingUsage(true);
    try {
      const res = await fetch('/api/ai/usage');
      if (res.ok) {
        const stats = await res.json();
        setUsageStats(stats);
        hasFetchedUsage.current = true;
        
        if (selectedModel === 'auto') {
          selectLeastUsedModel(stats);
        }
      } else if (res.status === 401) {
        // Not authenticated, default to Claude
        setAutoSelectedModel('claude');
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      // Default to Claude on error
      setAutoSelectedModel('claude');
    } finally {
      setLoadingUsage(false);
    }
  }

  function selectLeastUsedModel(stats: UsageStats) {
    const { claude, gpt, gemini } = stats;
    const minCount = Math.min(claude, gpt, gemini);
    
    // If all equal or zero, default to Claude
    if (claude === gpt && gpt === gemini) {
      setAutoSelectedModel('claude');
      return;
    }
    
    // Select the one with least usage
    if (minCount === claude) {
      setAutoSelectedModel('claude');
    } else if (minCount === gpt) {
      setAutoSelectedModel('gpt');
    } else {
      setAutoSelectedModel('gemini');
    }
  }

  function handleModelChange(newModel: Model) {
    setSelectedModel(newModel);
    if (newModel !== 'auto') {
      setAutoSelectedModel(null);
    } else if (!usageStats) {
      fetchUsageStats();
    } else {
      selectLeastUsedModel(usageStats);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!query.trim()) return;

    const effectiveModel = selectedModel === 'auto' 
      ? (autoSelectedModel || 'claude')
      : selectedModel;

    if (effectiveModel === 'convergence') {
      // Navigate to convergence machine with query
      const encodedQuery = encodeURIComponent(query.trim());
      router.push(`/convergence-machine?query=${encodedQuery}`);
    } else if (effectiveModel === 'claude' || effectiveModel === 'gpt' || effectiveModel === 'gemini') {
      // Open chat modal
      setChatModel(effectiveModel);
      setChatQuery(query.trim());
      setShowChatModal(true);
      setQuery(''); // Clear input after opening modal
    }
  }

  function getModelDisplayName(): string {
    if (selectedModel === 'auto') {
      if (loadingUsage) {
        return 'Auto (loading...)';
      }
      if (autoSelectedModel) {
        return `Auto → ${autoSelectedModel.charAt(0).toUpperCase() + autoSelectedModel.slice(1)}`;
      }
      return 'Auto';
    }
    return selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1);
  }

  return (
    <>
      <form 
        onSubmit={handleSubmit}
        className={`flex flex-col sm:flex-row gap-3 ${className}`}
      >
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything..."
            className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/50 transition-colors"
          />
        </div>

        {/* Model Selector */}
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value as Model)}
            className="px-4 py-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/50 transition-colors appearance-none cursor-pointer pr-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23fef3c7' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
            }}
          >
            <option value="auto">🤖 Auto</option>
            <option value="claude">Claude</option>
            <option value="gpt">GPT</option>
            <option value="gemini">Gemini</option>
            <option value="convergence">⚡ Convergence Machine</option>
          </select>
          {selectedModel === 'auto' && loadingUsage && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Go Button */}
        <button
          type="submit"
          disabled={!query.trim() || loadingUsage}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {selectedModel === 'convergence' ? (
            <>
              <Sparkles className="w-5 h-5" />
              Go
            </>
          ) : (
            'Go'
          )}
        </button>
      </form>

      {/* Show selected model info when Auto is selected */}
      {selectedModel === 'auto' && autoSelectedModel && !loadingUsage && (
        <p className="text-xs text-amber-100/60 mt-1">
          Smart selection: {autoSelectedModel.charAt(0).toUpperCase() + autoSelectedModel.slice(1)} 
          {usageStats && ` (${usageStats[autoSelectedModel]} calls this month)`}
        </p>
      )}

      {/* AI Disclaimer Notice */}
      <p className="text-xs text-amber-100/60 mt-2 text-center">
        <span className="text-amber-200/80">AI is a tool, not a source of absolute truth.</span>{' '}
        <Link href="/ai-disclaimer" className="text-amber-400 hover:text-amber-300 underline">
          Learn more
        </Link>
      </p>

      {/* Chat Modal */}
      {showChatModal && (
        <AIChatModal
          model={chatModel}
          initialQuery={chatQuery}
          onClose={() => {
            setShowChatModal(false);
            setChatQuery('');
          }}
        />
      )}
    </>
  );
}

