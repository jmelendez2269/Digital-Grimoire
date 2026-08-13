'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sparkles, Send, Info } from 'lucide-react';
import Link from 'next/link';

import DocumentationLink from "@/components/DocumentationLink";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppLoader from '@/components/ui/AppLoader';
import ParallaxLoader from '@/components/ui/ParallaxLoader';
import StelloquyOrb from '@/components/ui/StelloquyOrb';
import LensIntensitySelector from '@/components/parallax/LensIntensitySelector';
import LensPresets from '@/components/parallax/LensPresets';
import ResponseLengthSlider from '@/components/parallax/ResponseLengthSlider';
import ConversationHistory from '@/components/parallax/ConversationHistory';
import {
  CreditWalletProvider,
  useCreditWallet,
  useToolCreditState,
} from '@/components/membership/CreditWalletProvider';
import ToolCreditStatus from '@/components/membership/ToolCreditStatus';
import {
  toolRunStateForCode,
  type ToolRunState,
} from '@/lib/membership/metering-customer-presentation';
import { getAllLenses } from '@/lib/parallax/lenses';
import type { LensWeights, MultiLensResponse } from '@/lib/parallax/types';
import { useAuth } from '@/contexts/AuthContext';
import { Save, Check } from 'lucide-react';

// Dynamically import ResponseStream to reduce initial bundle size
const ResponseStream = dynamic(() => import('@/components/parallax/ResponseStream'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-zinc-900/50 border border-amber-900/20 rounded-lg flex items-center justify-center">
      <ParallaxLoader size="md" />
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

interface ClientSevenLensesResponse extends MultiLensResponse {
  id?: string;
  createdAt?: string;
  responseLength?: 'short' | 'medium' | 'long';
  resultUrl?: string;
}

interface HistoryConversation {
  id: string;
  query: string;
  lensWeights: LensWeights;
  synthesis: string;
  response?: unknown;
  sources?: MultiLensResponse['sources'];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isClientResponse(value: unknown): value is ClientSevenLensesResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.query === 'string' &&
    typeof value.synthesis === 'string' &&
    Array.isArray(value.responses) &&
    Array.isArray(value.sources)
  );
}

function ParallaxEngineContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const queryInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [lensWeights, setLensWeights] = useState<LensWeights>(DEFAULT_WEIGHTS);
  const [responseLength, setResponseLength] = useState<'short' | 'medium' | 'long'>('short');
  const [response, setResponse] = useState<ClientSevenLensesResponse | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingDefault, setSavingDefault] = useState(false);
  const [defaultSaved, setDefaultSaved] = useState(false);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const retryRequestIdRef = useRef<string | null>(null);
  const activeRequestControllerRef = useRef<AbortController | null>(null);
  const [hasRetry, setHasRetry] = useState(false);
  const [runState, setRunState] = useState<ToolRunState>('idle');
  const [capacityResetAt, setCapacityResetAt] = useState<string | null>(null);
  const toolActionCode = responseLength === 'long'
    ? 'seven_lenses.long'
    : 'seven_lenses.standard';
  const toolCreditState = useToolCreditState(toolActionCode);
  const { refresh: refreshWallet } = useCreditWallet();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadUserDefaults() {
      try {
        const res = await fetch('/api/user/parallax-preferences');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.preferences?.lensWeights) {
          setLensWeights(data.preferences.lensWeights);
        }
        if (data.preferences?.responseLength) {
          setResponseLength(data.preferences.responseLength);
        }
      } catch (err) {
        console.error('Error loading user defaults:', err);
      }
    }

    void loadUserDefaults();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    return () => activeRequestControllerRef.current?.abort();
  }, []);

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
    setRunState('reserved');
    setCapacityResetAt(null);
    let structuredFailure = false;
    const requestId = retryRequestIdRef.current ?? crypto.randomUUID();
    retryRequestIdRef.current = requestId;
    const requestController = new AbortController();
    activeRequestControllerRef.current = requestController;

    try {
      const res = await fetch('/api/parallax/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lensWeights, responseLength, requestId }),
        signal: requestController.signal,
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(`Rate limit exceeded. ${data.remaining} queries remaining.`);
        setIsStreaming(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json() as {
          error?: string;
          code?: string;
          resetAt?: string;
        };
        structuredFailure = true;
        const nextRunState = toolRunStateForCode(data.code);
        setRunState(nextRunState);
        setCapacityResetAt(typeof data.resetAt === 'string' ? data.resetAt : null);
        const retryable = nextRunState === 'retry';
        setHasRetry(retryable);
        if (!retryable && nextRunState !== 'reconcile') {
          retryRequestIdRef.current = null;
        }
        await refreshWallet();
        throw new Error(data.error || 'Failed to get response');
      }

      // Handle SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse: ClientSevenLensesResponse | null = null;
      let streamError: { message: string; code?: string; resetAt?: string } | null = null;

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
            let data: Record<string, unknown>;
            try {
              const parsed: unknown = JSON.parse(line.slice(6));
              if (!isRecord(parsed)) continue;
              data = parsed;

              if (data.type === 'done' && isClientResponse(data.response)) {
                finalResponse = data.response;
                setResponse(finalResponse);
                setIsStreaming(false);
                setCurrentResponseId(finalResponse.id ?? null);
                retryRequestIdRef.current = null;
                void saveConversationToHistory(query, lensWeights, finalResponse);
              } else if (data.type === 'synthesis') {
                // The server emits content only after durable persistence and settlement.
                setResponse((prev) => ({
                  ...(prev || { query, responses: [], sources: [], synthesis: '' }),
                  query: query, // Ensure query is set
                  synthesis: typeof data.content === 'string' ? data.content : '',
                  sources: Array.isArray(data.sources) ? data.sources : (prev?.sources || []),
                }));
              } else if (data.type === 'lens_placeholder') {
                // Lens placeholder - will be loaded on demand
                // No action needed, ResponseStream will handle it
              } else if (data.type === 'error') {
                streamError = {
                  message: typeof data.message === 'string' ? data.message : 'Failed to get response',
                  code: typeof data.code === 'string' ? data.code : undefined,
                  resetAt: typeof data.resetAt === 'string' ? data.resetAt : undefined,
                };
              }
            } catch (err) {
              console.error('Error parsing SSE data:', err);
            }
          }
        }

        if (streamError) break;
      }

      if (streamError) {
        structuredFailure = true;
        if (streamError.code === 'METERING_SETTLEMENT_FAILED') {
          setHistoryRefreshTrigger((previous) => previous + 1);
        }
        const nextRunState = toolRunStateForCode(streamError.code);
        setRunState(nextRunState);
        setCapacityResetAt(streamError.resetAt ?? null);
        const retryable = nextRunState === 'retry';
        setHasRetry(retryable);
        if (!retryable && nextRunState !== 'reconcile') {
          retryRequestIdRef.current = null;
        }
        await refreshWallet();
        throw new Error(streamError.message);
      }
      if (!finalResponse) {
        setRunState('retry');
        setHasRetry(true);
        throw new Error('The stream ended before the saved analysis arrived. Retry to reopen it safely.');
      }
      setRunState('committed');
      setHasRetry(false);
      await refreshWallet();

    } catch (err) {
      if (!structuredFailure && runState !== 'retry') {
        setRunState('retry');
        setHasRetry(true);
      }
      console.error('Error submitting query:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setIsStreaming(false);
    } finally {
      if (activeRequestControllerRef.current === requestController) {
        activeRequestControllerRef.current = null;
      }
    }
  }

  function handlePresetSelect(weights: LensWeights) {
    retryRequestIdRef.current = null;
    setHasRetry(false);
    setRunState('idle');
    setLensWeights(weights);
  }

  function handleLensChange(lensId: keyof LensWeights, value: number) {
    retryRequestIdRef.current = null;
    setHasRetry(false);
    setRunState('idle');
    setLensWeights(prev => ({
      ...prev,
      [lensId]: value,
    }));
  }

  // Save conversation to history (localStorage and database)
  async function saveConversationToHistory(
    query: string,
    lensWeights: LensWeights,
    response: ClientSevenLensesResponse
  ) {
    if (!response || !response.synthesis) return;

    const conversationEntry = {
      id: response.id,
      query,
      lensWeights,
      synthesis: response.synthesis,
      responsePreview: response.synthesis.substring(0, 150),
      response: response, // Save full response object
      timestamp: response.createdAt || new Date(),
      sources: response.sources || [],
    };

    // Save to localStorage immediately
    const localKey = user ? `parallax_history_${user.id}` : 'parallax_history_guest';
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem(localKey);
      let history: unknown[] = [];
      try {
        history = existing ? JSON.parse(existing) : [];
        if (!Array.isArray(history)) history = [];
      } catch {
        history = [];
      }
      history.unshift(conversationEntry);
      // Keep only last 50 entries
      const limited = history.slice(0, 50);
      localStorage.setItem(localKey, JSON.stringify(limited));
    }

    // Add the already-durable result to unified search if authenticated.
    if (user) {
      try {
        // The metered endpoint already owns durable Parallax persistence.
        // This separate write only makes the saved result discoverable in unified search.
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
  function handleSelectConversation(conversation: HistoryConversation) {
    setQuery(conversation.query);
    setLensWeights(conversation.lensWeights);

    // Load the full response if available
    if (conversation.response) {
      try {
        // Ensure response has the correct structure
        let responseData: unknown = conversation.response;

        // Parse if it's a string
        if (typeof responseData === 'string') {
          try {
            responseData = JSON.parse(responseData);
          } catch (e) {
            console.error('Error parsing response string:', e);
            responseData = null;
          }
        }

        if (isRecord(responseData)) {
          // Ensure it has all required fields matching ResponseStream interface
          const formattedResponse = {
            query: conversation.query,
            synthesis: typeof responseData.synthesis === 'string'
              ? responseData.synthesis
              : conversation.synthesis,
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

  return (
    <div className="flex min-h-screen flex-col bg-black selection:bg-amber-500/30">
      <Header />
      <DocumentationLink href="/wiki/parallax-engine" className="container mx-auto px-4 py-2" />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl font-bold text-amber-100">
              Seven Lenses
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
            Explore questions through seven unique analytical lenses, synthesizing insights from multiple perspectives with Prismarium.
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Lens Sliders */}
            <div className="lg:col-span-1 space-y-6">
              {/* Response Length Slider */}
              <div>
                <ResponseLengthSlider
                  value={responseLength}
                  onChange={(value) => {
                    retryRequestIdRef.current = null;
                    setHasRetry(false);
                    setRunState('idle');
                    setResponseLength(value);
                  }}
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
                    onChange={(e) => {
                      retryRequestIdRef.current = null;
                      setHasRetry(false);
                      setRunState('idle');
                      setQuery(e.target.value);
                    }}
                    disabled={isStreaming}
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    placeholder="Ask a question about any topic... The Seven Lenses will analyze it through multiple perspectives."
                  />
                </div>

                {error && (
                  <div role="alert" className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <ToolCreditStatus
                  actionCode={toolActionCode}
                  runState={runState}
                  capacityResetAt={capacityResetAt}
                />

                <button
                  type="submit"
                  disabled={
                    isStreaming ||
                    !query.trim() ||
                    runState === 'capacity_paused' ||
                    runState === 'reconcile' ||
                    (!toolCreditState.canSubmit && !hasRetry)
                  }
                  className="min-h-11 w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isStreaming ? (
                    <>
                      <StelloquyOrb state="thinking" size="xs" className="mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {hasRetry
                        ? 'Retry the same analysis'
                        : `Analyze · ${responseLength === 'long' ? '3' : '2'} Prism Credits`}
                    </>
                  )}
                </button>
              </form>

              {/* Response */}
              <div data-response-area>
                <ResponseStream
                  response={response}
                  isStreaming={isStreaming}
                  lensWeights={lensWeights}
                  parentResponseId={currentResponseId}
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
      </main>

      <Footer />
    </div>
  );
}

function PublicSevenLensesPreview() {
  const lenses = getAllLenses();

  return (
    <div className="flex min-h-screen flex-col bg-black selection:bg-amber-500/30">
      <Header />
      <DocumentationLink href="/wiki/parallax-engine" className="container mx-auto px-4 py-2" />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 md:p-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-cyan-400" />
            <h1 className="text-4xl font-bold text-amber-100">Seven Lenses</h1>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/ai-disclaimer"
                className="flex items-center gap-1 text-sm text-amber-400/70 transition-colors hover:text-amber-400"
                title="Learn about AI and discernment"
              >
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">About AI &amp; Discernment</span>
              </Link>
            </div>
          </div>
          <p className="text-lg text-amber-100/70">
            Explore questions through seven unique analytical lenses, synthesizing insights from multiple perspectives with Prismarium.
          </p>
          <div className="mt-4 rounded-lg border border-amber-900/30 bg-amber-900/10 p-3">
            <p className="text-sm text-amber-200/80">
              <strong className="text-amber-200">Important:</strong> AI is a tool, not a source of absolute truth.
              Please use discernment and verify important information.{' '}
              <Link href="/ai-disclaimer" className="text-amber-400 underline hover:text-amber-300">
                Learn more about AI safety and discernment
              </Link>
            </p>
          </div>
        </div>

        <div
          role="note"
          className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] px-4 py-3"
        >
          <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-cyan-200 uppercase">
            Public preview
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            Explore how Seven Lenses works below. Join Prismarium to tune the lenses and analyze your own question.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <ResponseLengthSlider value="short" onChange={() => undefined} disabled />

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-amber-100/80">Lens Intensity</h2>
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-amber-100/70 opacity-50"
                  title="Join Prismarium to save defaults"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Set as Default</span>
                </button>
              </div>
              <div className="space-y-4">
                {lenses.map((lens) => (
                  <LensIntensitySelector
                    key={lens.id}
                    lensId={lens.id}
                    lensName={lens.name}
                    value={DEFAULT_WEIGHTS[lens.id as keyof LensWeights]}
                    onChange={() => undefined}
                    disabled
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-amber-100/80">Quick Presets</h2>
              <LensPresets onSelect={() => undefined} disabled />
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="public-query-preview" className="mb-2 block text-sm font-medium text-amber-100/80">
                  Your Question
                </label>
                <textarea
                  id="public-query-preview"
                  disabled
                  rows={4}
                  className="w-full resize-none rounded-lg border border-amber-900/20 bg-zinc-900/50 px-4 py-3 text-amber-100 opacity-60 placeholder:text-amber-100/40 disabled:cursor-not-allowed"
                  placeholder="Ask a question about any topic... The Seven Lenses will analyze it through multiple perspectives."
                />
              </div>
              <button
                type="button"
                disabled
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 px-6 py-3 font-semibold text-zinc-500 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
                Join to analyze
              </button>
            </div>

            <section className="rounded-2xl border border-cyan-300/20 bg-[linear-gradient(120deg,rgba(8,47,73,0.35),rgba(24,24,27,0.72))] p-6 sm:p-7">
              <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-cyan-200 uppercase">
                Continue with your question
              </p>
              <h2 className="mt-3 font-serif text-2xl text-zinc-50">
                See your question from seven perspectives.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Join Prismarium to tune each lens, run the analysis, and keep your discoveries connected to the Library.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
                >
                  Join Prismarium
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-zinc-200 focus-visible:outline-none"
                >
                  View membership
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ParallaxEnginePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoader fullScreen />;
  }

  if (!user) {
    return <PublicSevenLensesPreview />;
  }

  return (
    <CreditWalletProvider>
      <Suspense fallback={<AppLoader fullScreen />}>
        <ParallaxEngineContent />
      </Suspense>
    </CreditWalletProvider>
  );
}

