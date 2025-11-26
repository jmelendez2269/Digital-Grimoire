'use client';

import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { LensWeights } from '@/lib/convergence/lens-orchestrator';

interface ExpandableLensCardProps {
  lensId: string;
  lensName: string;
  query: string;
  lensWeights?: LensWeights;
  responseLength?: 'short' | 'medium' | 'long';
  onExpand: (lensId: string) => void;
}

export default function ExpandableLensCard({
  lensId,
  lensName,
  query,
  onExpand,
}: ExpandableLensCardProps) {
  return (
    <div className="bg-zinc-900/30 border border-purple-600/20 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-xl font-bold text-purple-400">
            {lensName} Perspective
          </h3>
        </div>
        <button
          onClick={() => onExpand(lensId)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 rounded-lg text-sm text-amber-100 transition-colors"
        >
          <span>Load Response</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-4 text-sm text-amber-100/60">
        Click to load the {lensName.toLowerCase()} perspective on this query.
      </p>
    </div>
  );
}

