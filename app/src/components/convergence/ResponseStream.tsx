'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Link2, ChevronDown, ChevronUp, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getAllLenses } from '@/lib/convergence/lenses';
import { LensWeights } from '@/lib/convergence/lens-orchestrator';

interface Source {
  text_id: string;
  text_title?: string;
  text_author?: string;
  chunk_id?: string;
  chunk_index?: number;
  relevance?: number;
  content_preview?: string;
}

interface LensResponse {
  lens: string;
  lensName: string;
  content: string;
  sources: Source[];
}

interface ResponseStreamProps {
  response: {
    query: string;
    responses: LensResponse[];
    synthesis: string;
    sources: Source[];
  } | null;
  isStreaming: boolean;
  query?: string;
  lensWeights?: LensWeights;
  responseLength?: 'short' | 'medium' | 'long';
  onLensExpand?: (lensId: string) => void;
}

function SourceCard({ source, lensName }: { source: Source; lensName?: string }) {
  const [expanded, setExpanded] = useState(false);
  
  // Build link with chunk parameter if available
  const buildLibraryLink = () => {
    const baseUrl = `/library/${source.text_id}`;
    const params = new URLSearchParams();
    if (source.chunk_id) {
      params.set('chunk', source.chunk_id);
    } else if (source.chunk_index !== undefined) {
      params.set('chunkIndex', source.chunk_index.toString());
    }
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  const relevancePercent = source.relevance 
    ? Math.round(source.relevance * 100) 
    : null;

  return (
    <div className="bg-zinc-800/50 border border-amber-900/20 rounded-lg p-3 hover:border-amber-900/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link
            href={buildLibraryLink()}
            className="group flex items-start gap-2 text-sm"
          >
            <BookOpen className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0 group-hover:text-purple-300 transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-purple-400 group-hover:text-purple-300 transition-colors truncate">
                {source.text_title || 'Unknown Source'}
              </div>
              {source.text_author && (
                <div className="text-xs text-amber-100/60 mt-0.5">
                  by {source.text_author}
                </div>
              )}
              {source.chunk_index !== undefined && (
                <div className="text-xs text-amber-100/50 mt-1">
                  Section {source.chunk_index + 1}
                </div>
              )}
            </div>
          </Link>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {relevancePercent !== null && (
            <div className="text-xs text-amber-400/70 bg-amber-900/20 px-2 py-1 rounded">
              {relevancePercent}% match
            </div>
          )}
          {source.content_preview && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-zinc-700 rounded text-amber-100/60 hover:text-amber-100 transition-colors"
              title={expanded ? 'Hide preview' : 'Show preview'}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && source.content_preview && (
        <div className="mt-3 pt-3 border-t border-amber-900/20">
          <div className="text-xs text-amber-100/60 mb-1">Preview:</div>
          <div className="text-xs text-amber-100/80 leading-relaxed bg-zinc-900/30 p-2 rounded border border-amber-900/10">
            {source.content_preview}
            {source.content_preview.length >= 200 && '...'}
          </div>
          <Link
            href={buildLibraryLink()}
            className="inline-flex items-center gap-1 mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Link2 className="w-3 h-3" />
            Read full section
          </Link>
        </div>
      )}

      {lensName && (
        <div className="mt-2 pt-2 border-t border-amber-900/10">
          <div className="text-xs text-amber-100/50">
            Used by: <span className="text-purple-400/70">{lensName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpandableLensCard({ 
  lensId, 
  lensName, 
  query, 
  lensWeights, 
  responseLength,
  onExpand 
}: { 
  lensId: string; 
  lensName: string;
  query: string;
  lensWeights?: LensWeights;
  responseLength?: 'short' | 'medium' | 'long';
  onExpand?: (lensId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lensResponse, setLensResponse] = useState<LensResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExpand = async () => {
    if (expanded) {
      // Collapse
      setExpanded(false);
      return;
    }
    
    if (loading || lensResponse) return;
    
    setExpanded(true);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/convergence/lens/${lensId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          lensWeights, 
          responseLength: responseLength || 'short' 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || `Server error: ${res.status}`);
      }

      const data = await res.json();
      
      if (!data.lensResponse) {
        throw new Error('Invalid response format from server');
      }
      
      setLensResponse(data.lensResponse);
      if (onExpand) onExpand(lensId);
    } catch (err) {
      console.error('Error loading lens response:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load response';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/30 border border-purple-600/20 rounded-xl overflow-hidden">
      <button
        onClick={handleExpand}
        disabled={loading}
        className="w-full flex items-center justify-between text-left p-6 hover:bg-zinc-900/50 transition-colors"
      >
        <h3 className="text-xl font-bold text-purple-400">
          {lensName} Perspective
        </h3>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
          <ChevronDown 
            className={`w-5 h-5 text-purple-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-0 border-t border-purple-600/20">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="ml-3 text-amber-100/70">Loading detailed analysis...</span>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {lensResponse && !loading && (
            <>
              <div className="prose prose-invert max-w-none mt-4">
                <div className="text-amber-100/90 whitespace-pre-wrap leading-relaxed">
                  {lensResponse.content}
                </div>
              </div>
              
              {lensResponse.sources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-amber-900/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <p className="text-sm font-medium text-amber-100/80">
                      Sources ({lensResponse.sources.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {lensResponse.sources.map((source, sIdx) => (
                      <SourceCard 
                        key={sIdx} 
                        source={source} 
                        lensName={lensResponse.lensName}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !error && !lensResponse && (
            <div className="py-4">
              <p className="text-amber-100/60 text-sm">Loading...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResponseStream({ 
  response, 
  isStreaming,
  query = '',
  lensWeights,
  responseLength = 'short',
  onLensExpand
}: ResponseStreamProps) {
  const [copied, setCopied] = useState(false);
  const [expandedLenses, setExpandedLenses] = useState<Set<string>>(new Set());

  if (!response && !isStreaming) {
    return null;
  }

  const handleCopy = async () => {
    if (!response) return;

    const fullText = [
      `Query: ${response.query}`,
      '',
      `## Synthesis\n\n${response.synthesis}`,
      '',
      ...response.responses.map(r => `## ${r.lensName}\n\n${r.content}`),
      '',
      '## Sources',
      ...response.sources.map((s, idx) => `${idx + 1}. ${s.text_title || 'Unknown'}${s.text_author ? ` by ${s.text_author}` : ''}`),
    ].join('\n\n');

    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lenses = getAllLenses();
  // Get active lenses from lensWeights (since responses array may be empty for lazy loading)
  // Fallback: if no lensWeights, try to get from response metadata or show all lenses
  const activeLensIds = new Set(
    lensWeights && Object.keys(lensWeights).length > 0
      ? Object.entries(lensWeights)
          .filter(([_, weight]) => (weight as number) > 0)
          .map(([lens]) => lens)
      : response?.responses?.map(r => r.lens) || []
  );

  return (
    <div className="space-y-6">
      {/* Actions */}
      {response && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-amber-900/20 rounded-lg text-sm text-amber-100 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      )}

      {/* Synthesis FIRST - Main Answer */}
      {response?.synthesis && (
        <div className="bg-gradient-to-br from-purple-900/20 to-amber-900/10 border-2 border-purple-600/30 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-amber-100 mb-4 flex items-center gap-2">
            <span className="text-purple-400">⚡</span>
            Synthesis
          </h3>
          <div className="prose prose-invert max-w-none">
            <div className="text-amber-100/90 whitespace-pre-wrap leading-relaxed">
              {response.synthesis}
            </div>
          </div>

          {/* Combined Sources for Synthesis */}
          {response.sources && response.sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-purple-600/20">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-medium text-amber-100/80">
                  All Sources ({response.sources.length})
                </p>
              </div>
              <div className="space-y-2">
                {response.sources.map((source, sIdx) => (
                  <SourceCard 
                    key={sIdx} 
                    source={source}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lens Responses - Expandable */}
      {response && activeLensIds.size > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-amber-100/80">
            Individual Perspectives ({activeLensIds.size})
          </h3>
          {response.responses.length > 0 ? (
            // Show full responses if already loaded
            response.responses.map((lensResponse, idx) => (
        <div
          key={idx}
          className="bg-zinc-900/30 border border-purple-600/20 rounded-xl p-6"
        >
          <h3 className="text-xl font-bold text-purple-400 mb-4">
            {lensResponse.lensName} Perspective
          </h3>
          <div className="prose prose-invert max-w-none">
            <div className="text-amber-100/90 whitespace-pre-wrap leading-relaxed">
              {lensResponse.content}
            </div>
          </div>
          
          {lensResponse.sources.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-amber-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <p className="text-sm font-medium text-amber-100/80">
                        Sources ({lensResponse.sources.length})
                      </p>
                    </div>
                    <div className="space-y-2">
                      {lensResponse.sources.map((source, sIdx) => (
                        <SourceCard 
                    key={sIdx}
                          source={source} 
                          lensName={lensResponse.lensName}
                        />
                ))}
              </div>
            </div>
          )}
        </div>
            ))
          ) : (
            // Show expandable placeholders if not loaded yet
            lenses
              .filter(lens => activeLensIds.has(lens.id))
              .map(lens => (
                <ExpandableLensCard
                  key={lens.id}
                  lensId={lens.id}
                  lensName={lens.name}
                  query={query || response?.query || ''}
                  lensWeights={lensWeights}
                  responseLength={responseLength}
                  onExpand={(lensId) => {
                    setExpandedLenses(prev => new Set(prev).add(lensId));
                    if (onLensExpand) onLensExpand(lensId);
                  }}
                />
              ))
          )}
        </div>
      )}

      {/* Streaming indicator */}
      {isStreaming && !response && (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-amber-100/70">Analyzing from multiple perspectives...</p>
          </div>
        </div>
      )}
    </div>
  );
}
