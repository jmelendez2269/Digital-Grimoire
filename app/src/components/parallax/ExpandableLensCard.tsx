'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { getLensColorClasses, getLensColorStyle } from '@/lib/utils/lens-colors';
import {
  useCreditWallet,
  useToolCreditState,
} from '@/components/membership/CreditWalletProvider';
import ToolCreditStatus from '@/components/membership/ToolCreditStatus';
import {
  toolRunStateForCode,
  type ToolRunState,
} from '@/lib/membership/metering-customer-presentation';

interface ExpandableLensCardProps {
  lensId: string;
  lensName: string;
  parentResponseId: string | null;
  onExpand?: (lensId: string) => void;
}

interface LensResponseData {
  id: string;
  content: string;
  sources?: { text_id: string; text_title?: string; text_author?: string }[];
}

const AMBIGUOUS_RETRY_CODES = new Set([
  'METERING_REQUEST_IN_PROGRESS',
  'METERING_REQUEST_REPLAY_FAILED',
  'METERING_SETTLEMENT_FAILED',
]);

export default function ExpandableLensCard({
  lensId,
  lensName,
  parentResponseId,
  onExpand,
}: ExpandableLensCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lensResponse, setLensResponse] = useState<LensResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lensColor = getLensColorClasses(lensId);
  const lensStyle = getLensColorStyle(lensId);
  const retryRequestIdRef = useRef<string | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const [hasRetry, setHasRetry] = useState(false);
  const [runState, setRunState] = useState<ToolRunState>('idle');
  const [capacityResetAt, setCapacityResetAt] = useState<string | null>(null);
  const toolCreditState = useToolCreditState('seven_lenses.expand');
  const { refresh: refreshWallet } = useCreditWallet();

  useEffect(() => {
    return () => activeControllerRef.current?.abort();
  }, []);

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
    setRunState('reserved');
    setCapacityResetAt(null);
    let structuredFailure = false;
    const requestId = retryRequestIdRef.current ?? crypto.randomUUID();
    retryRequestIdRef.current = requestId;
    const controller = new AbortController();
    activeControllerRef.current = controller;

    try {
      if (!parentResponseId) {
        retryRequestIdRef.current = null;
        throw new Error('Wait for the parent analysis to finish saving.');
      }
      const res = await fetch(`/api/parallax/lens/${lensId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentResponseId, requestId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as {
          error?: string;
          code?: string;
          resetAt?: string;
        };
        structuredFailure = true;
        const nextRunState = toolRunStateForCode(data.code);
        setRunState(nextRunState);
        setCapacityResetAt(typeof data.resetAt === 'string' ? data.resetAt : null);
        const retryable = data.code ? AMBIGUOUS_RETRY_CODES.has(data.code) : false;
        setHasRetry(retryable && nextRunState !== 'reconcile');
        if (!retryable) {
          retryRequestIdRef.current = null;
        }
        await refreshWallet();
        throw new Error(data.error || `Failed to load ${lensName} perspective`);
      }

      const data = await res.json();
      const raw = data.lensResponse;
      if (!raw?.id || !(raw?.content ?? raw?.response ?? '').trim()) {
        retryRequestIdRef.current = null;
        throw new Error(`Failed to load ${lensName} perspective`);
      }
      setLensResponse({
        id: raw.id,
        content: raw?.content ?? raw?.response ?? '',
        sources: raw?.sources ?? [],
      });
      setExpanded(true);
      setRunState('committed');
      setHasRetry(false);
      retryRequestIdRef.current = null;
      onExpand?.(lensId);
      await refreshWallet();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!structuredFailure) {
        setRunState('retry');
        setHasRetry(true);
      }
      setError(err instanceof Error ? err.message : 'Failed to load response');
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
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
          disabled={
            loading ||
            !parentResponseId ||
            (!expanded && !lensResponse && !toolCreditState.canSubmit && !hasRetry) ||
            runState === 'capacity_paused' ||
            runState === 'reconcile'
          }
          className={`flex items-center gap-2 px-4 py-2 ${lensColor.bg} ${lensColor.hoverBg} border ${lensColor.border} rounded-lg text-sm text-amber-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <span>
                {expanded
                  ? 'Collapse'
                  : parentResponseId
                    ? hasRetry
                      ? 'Retry same expansion'
                      : 'Load Response · 1 Prism Credit'
                    : 'Analysis saving...'}
              </span>
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
        <div className="px-6 pb-6">
          <ToolCreditStatus
            actionCode="seven_lenses.expand"
            runState={runState}
            capacityResetAt={capacityResetAt}
          />
          <p className="mt-2 text-sm text-amber-100/60">
            The saved parent analysis remains available if expansion fails.
          </p>
        </div>
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
