'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function ConvergenceMachineInfo() {
  return (
    <div className="rounded-lg border border-purple-800/50 bg-gradient-to-br from-purple-900/20 to-zinc-900/50 p-6 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
        </div>
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xl font-bold text-purple-100">
              Convergence Machine
            </h3>
            <Link
              href="/convergence-machine"
              className="inline-flex items-center gap-1 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              Explore
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mb-3 text-sm text-zinc-300">
            Multi-lens AI analysis through 7 perspectives: Scientific, Psychological, Philosophical, Religious/Spiritual, Historical/Anthropological, Symbolic/Occult, and Mathematical.
          </p>
          <div className="rounded-lg border border-purple-800/30 bg-purple-900/10 p-3">
            <p className="text-xs text-zinc-400">
              <span className="font-medium text-purple-300">How it differs from AI Search:</span>{' '}
              Unlike the quick AI chat above, Convergence Machine provides deep, multi-perspective analysis with adjustable lens weights and hybrid retrieval from your library. Perfect for complex questions requiring multiple viewpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

