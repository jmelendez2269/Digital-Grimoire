'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Sparkles, Loader2, ChevronDown, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Lazy load AIChatModal - load it only when needed to avoid webpack resolution issues
// We'll create it inside the component when showChatModal becomes true

type Model = 'auto' | 'claude' | 'gpt' | 'gemini' | 'parallax' | 'consensus';

interface UsageStats {
  claude: number;
  gpt: number;
  gemini: number;
}

interface ModelConfig {
  id: Model;
  label: string;
  description: string;
  icon?: string;
}

const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: 'auto',
    label: '🤖 Auto',
    description: 'Automatically selects the least used model to balance load and costs. Good for general queries.'
  },
  {
    id: 'claude',
    label: 'Claude',
    description: 'Nuanced reasoning & coding. Best for complex logic, creative writing, and detailed analysis.'
  },
  {
    id: 'gpt',
    label: 'GPT',
    description: 'General purpose powerhouse. Great for creative writing, broad knowledge, and quick answers.'
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Multimodal & fast. Excellent for processing large context and connecting diverse concepts.'
  },
  {
    id: 'consensus',
    label: '🤝 Consensus',
    description: 'Aggregates insights from multiple leading models (Claude, GPT, Gemini) for verified accuracy and balanced perspectives.'
  },
  {
    id: 'parallax',
    label: '⚡ Parallax',
    description: 'The "Parallax Engine". Analyzes deep mystical patterns and connections across the library. Best for esoteric research.'
  }
];


interface AISearchBarProps {
  className?: string;
}

export default function AISearchBar({ className = '' }: AISearchBarProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<Model>('parallax');
  const [autoSelectedModel, setAutoSelectedModel] = useState<'claude' | 'gpt' | 'gemini' | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatModel, setChatModel] = useState<'claude' | 'gpt' | 'gemini'>('claude');
  const [chatQuery, setChatQuery] = useState('');
  const hasFetchedUsage = useRef(false);

  // Custom dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dynamically load AIChatModal only when needed
  const [AIChatModalComponent, setAIChatModalComponent] = useState<React.ComponentType<{ model: 'claude' | 'gpt' | 'gemini' | 'consensus'; initialQuery?: string; onClose: () => void }> | null>(null);

  useEffect(() => {
    if (showChatModal && !AIChatModalComponent) {
      // Load the component only when modal is shown
      import('@/components/AIChatModal').then((mod) => {
        setAIChatModalComponent(() => mod.default);
      }).catch((error) => {
        console.error('Failed to load AIChatModal:', error);
      });
    }
  }, [showChatModal, AIChatModalComponent]);

  // Click outside handler for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    setIsDropdownOpen(false); // Close dropdown on selection
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

    if (effectiveModel === 'parallax') {
      // Navigate to parallax engine with query
      const encodedQuery = encodeURIComponent(query.trim());
      router.push(`/parallax-engine?query=${encodedQuery}`);
    } else if (effectiveModel === 'claude' || effectiveModel === 'gpt' || effectiveModel === 'gemini' || effectiveModel === 'consensus') {
      // Open chat modal
      setChatModel(effectiveModel as any);
      setChatQuery(query.trim());
      setShowChatModal(true);
      setQuery(''); // Clear input after opening modal
    }
  }

  const selectedModelConfig = MODEL_CONFIGS.find(m => m.id === selectedModel);


  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={`relative group ${className}`}
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-amber-600/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Search Container */}
        <div className="relative flex flex-col sm:flex-row gap-3 items-center bg-zinc-900/80 border border-amber-900/30 rounded-xl overflow-visible focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50 shadow-2xl transition-all p-1">
          {/* Search Input */}
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-100/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="w-full pl-10 pr-4 py-4 bg-transparent text-amber-100 placeholder-amber-100/30 outline-none text-lg"
            />
          </div>

          {/* Custom Model Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full sm:w-48 px-4 py-4 bg-amber-600/10 hover:bg-amber-600/20 border-l border-amber-900/30 text-amber-100 focus:outline-none transition-colors flex items-center justify-between text-base"
            >
              <span className="truncate">{selectedModelConfig?.label}</span>
              <ChevronDown className={`w-4 h-4 text-amber-100/60 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 bg-zinc-900/95 backdrop-blur-md border border-amber-900/30 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="py-1">
                  {MODEL_CONFIGS.map((model) => (
                    <div
                      key={model.id}
                      className="group/item relative"
                    >
                      <button
                        type="button"
                        onClick={() => handleModelChange(model.id)}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between
                                                    ${selectedModel === model.id ? 'bg-amber-900/40 text-amber-100' : 'text-amber-100/80 hover:bg-amber-900/20 hover:text-amber-50'}
                                                `}
                      >
                        <span className="font-medium">{model.label}</span>
                        {selectedModel === model.id && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      </button>

                      {/* Tooltip on right (desktop) or bottom (mobile - tough, assume hover works primarily with mouse/long press) */}
                      {/* For simplicity, we'll render descriptions inside the dropdown on hover or just below the item to make it clear.
                                                Let's try a floating tooltip to the left of the dropdown for better layout if space permits,
                                                OR just expand the item height to show description on hover. Expanding is janky.
                                                Let's do a side tooltip.
                                            */}
                      <div className="hidden sm:block absolute right-full top-0 mr-2 w-64 p-3 bg-black/90 border border-amber-500/20 rounded-lg shadow-2xl opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-200 pointer-events-none z-50 backdrop-blur-sm">
                        <div className="text-amber-400 font-semibold mb-1 text-sm">{model.label}</div>
                        <div className="text-zinc-300 text-xs leading-relaxed">{model.description}</div>
                        {/* Arrow */}
                        <div className="absolute top-4 -right-1.5 w-3 h-3 bg-black/90 border-r border-t border-amber-500/20 transform rotate-45"></div>
                      </div>

                      {/* Mobile: Simple inline description for selected or just relying on checking them out */}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedModel === 'auto' && loadingUsage && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              </div>
            )}
          </div>


          {/* Go Button */}
          <button
            type="submit"
            disabled={!query.trim() || loadingUsage}
            className="px-6 py-4 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border-l border-amber-900/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {loadingUsage ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : selectedModel === 'parallax' ? (
              <>
                <Sparkles className="w-6 h-6" />
              </>
            ) : (
              <Search className="w-6 h-6" />
            )}
          </button>
        </div>
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
      {showChatModal && AIChatModalComponent && (
        <AIChatModalComponent
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
