'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { LensWeights } from '@/lib/parallax/lens-orchestrator';
import { getLensColorClasses, getLensColorStyle } from '@/lib/utils/lens-colors';

interface ExpandableLensCardProps {
  lensId: string;
  lensName: string;
  query: string;
  lensWeights?: LensWeights;
  responseLength?: 'short' | 'medium' | 'long';
  onExpand: (lensId: string) => void;
}

interface LensResponseData {
  content: string;
  sources?: { text_id: string; text_title?: string; text_author?: string }[];
}

export default function ExpandableLensCard({
  lensId,
  lensName,
  query,
  lensWeights,
  responseLength = 'medium',
}: ExpandableLensCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lensResponse, setLensResponse] = useState<LensResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lensColor = getLensColorClasses(lensId);
  const lensStyle = getLensColorStyle(lensId);

  const handleLoad = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    // If already fetched, just expand
    if (lensResponse) {
      setExpanded(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/parallax/lens/${lensId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lensWeights, responseLength }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load ${lensName} perspective`);
      }

      const data = await res.json();
      const raw = data.lensResponse;
      setLensResponse({
        content: raw?.content ?? raw?.response ?? '',
        sources: raw?.sources ?? [],
      });
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`bg-zinc-900/30 border ${lensColor.border} rounded-xl overflow-hidden shadow-[0_0_24px_var(--lens-glow)]`}
      style={{ '--lens-glow': lensStyle.glow } as CSSProperties}
    >
      {/* Header row */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <Sparkles className={`w-5 h-5 ${lensColor.text}`} />
          <h3 className={`text-xl font-bold ${lensColor.text}`}>
            {lensName} Perspective
          </h3>
        </div>
        <button
          onClick={handleLoad}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 ${lensColor.bg} ${lensColor.hoverBg} border ${lensColor.border} rounded-lg text-sm text-amber-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <span>{expanded ? 'Collapse' : 'Load Response'}</span>
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </>
          )}
        </button>
      </div>

      {/* Content area */}
      {!expanded && !loading && !lensResponse && (
        <p className="px-6 pb-6 text-sm text-amber-100/60">
          Click to load the {lensName.toLowerCase()} perspective on this query.
        </p>
      )}

      {error && (
        <div className="px-6 pb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {expanded && lensResponse && (
        <div className={`border-t ${lensColor.border} px-6 py-4`}>
          <div className="prose prose-invert max-w-none">
            <div className="text-amber-100/90 whitespace-pre-wrap leading-relaxed">
              {lensResponse.content}
            </div>
          </div>

          {lensResponse.sources && lensResponse.sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-amber-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className={`w-4 h-4 ${lensColor.text}`} />
                <p className="text-sm font-medium text-amber-100/80">
                  Sources ({lensResponse.sources.length})
                </p>
              </div>
              <div className="space-y-2">
                {lensResponse.sources.map((source, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-amber-100/60 bg-zinc-800/40 rounded-lg px-3 py-2"
                  >
                    {source.text_title || 'Unknown Source'}
                    {source.text_author && (
                      <span className="text-amber-100/40"> · {source.text_author}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
