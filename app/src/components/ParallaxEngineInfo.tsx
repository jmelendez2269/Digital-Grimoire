'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function ParallaxEngineInfo() {
  return (
    <Link
      href="/seven-lenses"
      className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-purple-500/50 hover:bg-zinc-900 overflow-visible"
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/30 to-purple-600/30 rounded-lg blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
          <Sparkles className="w-6 h-6 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold text-purple-100 group-hover:text-purple-400">
          Seven Lenses
        </h3>
      </div>
      <p className="text-sm text-zinc-400">
        Multi-lens AI analysis through 7 perspectives: Scientific, Psychological, Philosophical, Religious/Spiritual, Historical/Anthropological, Symbolic/Occult, and Mathematical. Deep, multi-perspective analysis with adjustable lens weights.
      </p>
    </Link>
  );
}

