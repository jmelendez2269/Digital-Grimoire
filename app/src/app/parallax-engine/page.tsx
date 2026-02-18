'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sparkles, Send, Loader2, Info, BookOpen } from 'lucide-react';
import Link from 'next/link';

import DocumentationLink from "@/components/DocumentationLink";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LensIntensitySelector from '@/components/parallax/LensIntensitySelector';
import LensPresets from '@/components/parallax/LensPresets';
import ResponseLengthSlider from '@/components/parallax/ResponseLengthSlider';
import RateLimitDisplay from '@/components/parallax/RateLimitDisplay';
import PremiumGate from '@/components/parallax/PremiumGate';
import ConversationHistory from '@/components/parallax/ConversationHistory';
import { getAllLenses } from '@/lib/parallax/lenses';
import { LensWeights, ResponseLength } from '@/lib/parallax/lens-orchestrator';
import { useAuth } from '@/contexts/AuthContext';
import { Save, Check } from 'lucide-react';

// Dynamically import ResponseStream to reduce initial bundle size
const ResponseStream = dynamic(() => import('@/components/parallax/ResponseStream'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-zinc-900/50 border border-amber-900/20 rounded-lg animate-pulse flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

const DEFAULT_WEIGHTS: LensWeights = {
  scientific: 30, // Standard
  psychological: 30, // Standard
  philosophical: 30, // Standard
  religious_spiritual: 30, // Standard
  historical_anthropological: 30, // Standard
  symbolic_occult: 30, // Standard
  mathematical: 30, // Standard
};

function ParallaxEngineContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const queryInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [lensWeights, setLensWeights] = useState<LensWeights>(DEFAULT_WEIGHTS);
  const [responseLength, setResponseLength] = useState<'short' | 'medium' | 'long'>('short');
  const [response, setResponse] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingDefault, setSavingDefault] = useState(false);
  const [defaultSaved, setDefaultSaved] = useState(false);
  const [rateLimit, setRateLimit] = useState<{
    remaining: number;
    limit: number;
    resetDate: Date | string;
    isPremium: boolean;
  } | null>(null);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchRateLimit();
    loadUserDefaults();
  }, []);

  // Load user's saved defaults
  async function loadUserDefaults() {
    if (!user) return;

    try {
      const res = await fetch('/api/user/parallax-preferences');
      if (res.ok) {
        const data = await res.json();
        if (data.preferences?.lensWeights) {
          setLensWeights(data.preferences.lensWeights);
        }
        if (data.preferences?.responseLength) {
          setResponseLength(data.preferences.responseLength);
        }
      }
    } catch (err) {
      console.error('Error loading user defaults:', err);
      // Silently fail - use system defaults
    }
  }

  // Save current configuration as default
  async function saveAsDefault() {
    if (!user) {
      setError('Please sign in to save defaults');
      return;
    }

    setSavingDefault(true);
    setDefaultSaved(false);

    try {
      const res = await fetch('/api/user/parallax-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lensWeights,
          responseLength,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save defaults');
      }

      setDefaultSaved(true);
      setTimeout(() => setDefaultSaved(false), 3000);
    } catch (err) {
      console.error('Error saving defaults:', err);
      setError(err instanceof Error ? err.message : 'Failed to save defaults');
    } finally {
      setSavingDefault(false);
    }
  }

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
      const res = await fetch('/api/parallax/rate-limit');
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
      const res = await fetch('/api/parallax/query', {
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
                setCurrentResponseId(null); // Clear history selection for new response
                // Save conversation to history
                saveConversationToHistory(query, lensWeights, finalResponse);
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

  // Save conversation to history (localStorage and database)
  async function saveConversationToHistory(
    query: string,
    lensWeights: LensWeights,
    response: any
  ) {
    if (!response || !response.synthesis) return;

    const conversationEntry = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      lensWeights,
      synthesis: response.synthesis,
      responsePreview: response.synthesis.substring(0, 150),
      response: response, // Save full response object
      timestamp: new Date(),
      sources: response.sources || [],
    };

    // Save to localStorage immediately
    const localKey = user ? `convergence_history_${user.id}` : 'convergence_history_guest';
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem(localKey);
      const history = existing ? JSON.parse(existing) : [];
      history.unshift(conversationEntry);
      // Keep only last 50 entries
      const limited = history.slice(0, 50);
      localStorage.setItem(localKey, JSON.stringify(limited));
    }

    // Save to database if user is authenticated
    if (user) {
      try {
        // 1. Save to Project Parallax specific history
        await fetch('/api/parallax/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            lensWeights,
            response: JSON.stringify(response),
            synthesis: response.synthesis,
            sources: response.sources || [],
          }),
        });

        // 2. Save to Unified Search history
        await fetch('/api/search/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            source: 'parallax',
            metadata: { lensWeights, responseId: response.id }
          }),
        });

        // Trigger history refresh
        setHistoryRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Error saving conversation to database:', error);
        // Non-blocking - localStorage already saved
        // Still trigger refresh for localStorage update
        setHistoryRefreshTrigger(prev => prev + 1);
      }
    } else {
      // Guest user - still trigger refresh for localStorage update
      setHistoryRefreshTrigger(prev => prev + 1);
    }
  }

  // Handle conversation selection from history
  function handleSelectConversation(conversation: any) {
    setQuery(conversation.query);
    setLensWeights(conversation.lensWeights);

    // Load the full response if available
    if (conversation.response) {
      try {
        // Ensure response has the correct structure
        let responseData = conversation.response;

        // Parse if it's a string
        if (typeof responseData === 'string') {
          try {
            responseData = JSON.parse(responseData);
          } catch (e) {
            console.error('Error parsing response string:', e);
            responseData = null;
          }
        }

        if (responseData) {
          // Ensure it has all required fields matching ResponseStream interface
          const formattedResponse = {
            query: conversation.query,
            synthesis: responseData.synthesis || conversation.synthesis || '',
            responses: Array.isArray(responseData.responses) ? responseData.responses : [],
            sources: Array.isArray(responseData.sources)
              ? responseData.sources
              : (conversation.sources || []),
          };

          console.log('Loading conversation from history:', {
            id: conversation.id,
            query: conversation.query,
            hasSynthesis: !!formattedResponse.synthesis,
            responsesCount: formattedResponse.responses.length,
            sourcesCount: formattedResponse.sources.length,
          });

          setResponse(formattedResponse);
          setCurrentResponseId(conversation.id);
        } else {
          // If parsing failed, try to reconstruct from available data
          const fallbackResponse = {
            query: conversation.query,
            synthesis: conversation.synthesis || '',
            responses: [],
            sources: conversation.sources || [],
          };
          setResponse(fallbackResponse);
          setCurrentResponseId(conversation.id);
        }
      } catch (error) {
        console.error('Error loading conversation response:', error);
        // Fallback: just set query and weights
        setResponse(null);
        setCurrentResponseId(null);
      }
    } else {
      // If no response, clear it
      setResponse(null);
      setCurrentResponseId(null);
    }

    // Scroll to response area after a short delay
    setTimeout(() => {
      const responseElement = document.querySelector('[data-response-area]');
      if (responseElement) {
        responseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  }

  // Memoize lenses array - getAllLenses() returns a new array on every call
  const lenses = useMemo(() => getAllLenses(), []);

  // Memoize totalWeight calculation - recalculated on every render otherwise
  const totalWeight = useMemo(
    () => Object.values(lensWeights).reduce((sum, w) => sum + w, 0),
    [lensWeights]
  );

  return (
    <div className="flex min-h-screen flex-col bg-black selection:bg-amber-500/30">
      <Header />
      <DocumentationLink href="/wiki/user/parallax-engine" className="container mx-auto px-4 py-2" />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl font-bold text-amber-100">
              Parallax Engine
            </h1>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/ai-disclaimer"
                className="flex items-center gap-1 text-sm text-amber-400/70 hover:text-amber-400 transition-colors"
                title="Learn about AI and discernment"
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">About AI & Discernment</span>
              </Link>
            </div>
          </div>
          <p className="text-amber-100/70 text-lg">
            Explore questions through seven unique analytical lenses, synthesizing insights from multiple perspectives with Project Parallax.
          </p>
          <div className="mt-4 p-3 bg-amber-900/10 border border-amber-900/30 rounded-lg">
            <p className="text-sm text-amber-200/80">
              <strong className="text-amber-200">Important:</strong> AI is a tool, not a source of absolute truth.
              Please use discernment and verify important information.{' '}
              <Link href="/ai-disclaimer" className="text-amber-400 hover:text-amber-300 underline">
                Learn more about AI safety and discernment
              </Link>
            </p>
          </div>
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

              {/* Lens Intensity Selectors */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-amber-100/80">
                    Lens Intensity
                  </h2>
                  <button
                    type="button"
                    onClick={saveAsDefault}
                    disabled={savingDefault || isStreaming || !user}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800/50 hover:bg-zinc-800 text-amber-100/70 hover:text-amber-100 border border-zinc-700 hover:border-cyan-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title={user ? 'Save current settings as default' : 'Sign in to save defaults'}
                  >
                    {defaultSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">Saved!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Set as Default</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-4">
                  {lenses.map(lens => (
                    <LensIntensitySelector
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
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    placeholder="Ask a question about any topic... The Parallax Engine will analyze it through multiple perspectives."
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
                  className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
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
              <div data-response-area>
                <ResponseStream
                  response={response}
                  isStreaming={isStreaming}
                  query={query}
                  lensWeights={lensWeights}
                  responseLength={responseLength}
                />
              </div>

              {/* Conversation History - Below Response */}
              <ConversationHistory
                onSelectConversation={handleSelectConversation}
                currentQuery={query}
                currentResponseId={currentResponseId ?? undefined}
                refreshTrigger={historyRefreshTrigger}
              />
            </div>
          </div>
        </PremiumGate>
      </main>

      <Footer />
    </div>
  );
}

export default function ParallaxEnginePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center select-none pointer-events-none">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    }>
      <ParallaxEngineContent />
    </Suspense>
  );
}

