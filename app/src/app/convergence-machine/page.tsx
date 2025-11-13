'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LensSlider from '@/components/convergence/LensSlider';
import LensPresets from '@/components/convergence/LensPresets';
import ResponseLengthSlider from '@/components/convergence/ResponseLengthSlider';
import RateLimitDisplay from '@/components/convergence/RateLimitDisplay';
import PremiumGate from '@/components/convergence/PremiumGate';
import { getAllLenses } from '@/lib/convergence/lenses';
import { LensWeights } from '@/lib/convergence/lens-orchestrator';
import { useAuth } from '@/contexts/AuthContext';

// Dynamically import ResponseStream to reduce initial bundle size
const ResponseStream = dynamic(() => import('@/components/convergence/ResponseStream'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-zinc-900/50 border border-amber-900/20 rounded-lg animate-pulse flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

const DEFAULT_WEIGHTS: LensWeights = {
  scientific: 14,
  psychological: 14,
  philosophical: 14,
  religious_spiritual: 14,
  historical_anthropological: 14,
  symbolic_occult: 14,
  mathematical: 16,
};

function ConvergenceMachineContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const queryInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [lensWeights, setLensWeights] = useState<LensWeights>(DEFAULT_WEIGHTS);
  const [responseLength, setResponseLength] = useState<'short' | 'medium' | 'long'>('short');
  const [response, setResponse] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<{
    remaining: number;
    limit: number;
    resetDate: Date | string;
    isPremium: boolean;
  } | null>(null);

  useEffect(() => {
    fetchRateLimit();
  }, []);

  // Read query from URL params on mount
  useEffect(() => {
    const urlQuery = searchParams.get('query');
    if (urlQuery) {
      const decodedQuery = decodeURIComponent(urlQuery);
      setQuery(decodedQuery);
      // Auto-focus the textarea after a short delay to ensure it's rendered
      setTimeout(() => {
        const textarea = document.getElementById('query') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          // Move cursor to end of text
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      }, 100);
    }
  }, [searchParams]);

  async function fetchRateLimit() {
    try {
      const res = await fetch('/api/convergence/rate-limit');
      if (res.ok) {
        const data = await res.json();
        setRateLimit(data);
      }
    } catch (err) {
      console.error('Error fetching rate limit:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    // Check if at least one lens is active
    const totalWeight = Object.values(lensWeights).reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      setError('Please enable at least one lens');
      return;
    }

    setError(null);
    setResponse(null);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/convergence/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lensWeights, responseLength }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(`Rate limit exceeded. ${data.remaining} queries remaining.`);
        setIsStreaming(false);
        await fetchRateLimit();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get response');
      }

      // Handle SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse: any = null;

      if (!reader) {
        throw new Error('No response stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'done' && data.response) {
                finalResponse = data.response;
                setResponse(finalResponse);
                setIsStreaming(false);
              } else if (data.type === 'synthesis') {
                // Update synthesis immediately
                setResponse((prev: any) => ({
                  ...(prev || { query, responses: [], sources: [], synthesis: '' }),
                  query: query, // Ensure query is set
                  synthesis: data.content || '',
                  sources: data.sources || prev?.sources || [],
                }));
              } else if (data.type === 'lens_placeholder') {
                // Lens placeholder - will be loaded on demand
                // No action needed, ResponseStream will handle it
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (err) {
              console.error('Error parsing SSE data:', err);
            }
          }
        }
      }

      // Refresh rate limit after query
      await fetchRateLimit();
    } catch (err) {
      console.error('Error submitting query:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setIsStreaming(false);
    }
  }

  function handlePresetSelect(weights: LensWeights) {
    setLensWeights(weights);
  }

  function handleLensChange(lensId: keyof LensWeights, value: number) {
    setLensWeights(prev => ({
      ...prev,
      [lensId]: value,
    }));
  }

  // Memoize lenses array - getAllLenses() returns a new array on every call
  const lenses = useMemo(() => getAllLenses(), []);
  
  // Memoize totalWeight calculation - recalculated on every render otherwise
  const totalWeight = useMemo(
    () => Object.values(lensWeights).reduce((sum, w) => sum + w, 0),
    [lensWeights]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h1 className="text-4xl font-bold text-amber-100">
              Convergence Machine
            </h1>
          </div>
          <p className="text-amber-100/70 text-lg">
            Explore questions through seven unique analytical lenses, synthesizing insights from multiple perspectives.
          </p>
        </div>

        {/* Rate Limit Display */}
        {rateLimit && (
          <div className="mb-6">
            <RateLimitDisplay
              remaining={rateLimit.remaining}
              limit={rateLimit.limit}
              resetDate={rateLimit.resetDate}
              isPremium={rateLimit.isPremium}
            />
          </div>
        )}

        <PremiumGate
          isPremium={rateLimit?.isPremium || false}
          rateLimitRemaining={rateLimit?.remaining || 0}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Lens Sliders */}
            <div className="lg:col-span-1 space-y-6">
              {/* Response Length Slider */}
              <div>
                <ResponseLengthSlider
                  value={responseLength}
                  onChange={setResponseLength}
                  disabled={isStreaming}
                />
              </div>

              {/* Lens Sliders */}
              <div>
                <h2 className="text-sm font-semibold text-amber-100/80 mb-3">
                  Lens Weights
                  {totalWeight !== 100 && (
                    <span className="ml-2 text-xs text-amber-400">
                      ({totalWeight}%)
                    </span>
                  )}
                </h2>
                <div className="space-y-4">
                  {lenses.map(lens => (
                    <LensSlider
                      key={lens.id}
                      lensId={lens.id}
                      lensName={lens.name}
                      value={lensWeights[lens.id as keyof LensWeights]}
                      onChange={(value) =>
                        handleLensChange(lens.id as keyof LensWeights, value)
                      }
                      disabled={isStreaming}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Query & Response */}
            <div className="lg:col-span-2 space-y-6">
              {/* Lens Presets */}
              <div>
                <h2 className="text-sm font-semibold text-amber-100/80 mb-3">
                  Quick Presets
                </h2>
                <LensPresets
                  onSelect={handlePresetSelect}
                  disabled={isStreaming}
                />
              </div>

              {/* Query Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="query"
                    className="block text-sm font-medium text-amber-100/80 mb-2"
                  >
                    Your Question
                  </label>
                  <textarea
                    id="query"
                    ref={queryInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isStreaming}
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-purple-600/50 focus:ring-1 focus:ring-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    placeholder="Ask a question about any topic... The Convergence Machine will analyze it through multiple perspectives."
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStreaming || !query.trim()}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isStreaming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Analyze
                    </>
                  )}
                </button>
              </form>

              {/* Response */}
              <ResponseStream 
                response={response} 
                isStreaming={isStreaming}
                query={query}
                lensWeights={lensWeights}
                responseLength={responseLength}
              />
            </div>
          </div>
        </PremiumGate>
      </main>

      <Footer />
    </div>
  );
}

export default function ConvergenceMachinePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    }>
      <ConvergenceMachineContent />
    </Suspense>
  );
}

