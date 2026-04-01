'use client';

import { Sparkles, Clock, CheckCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';

interface TrialExpiredScreenProps {
  queriesUsed?: number;
}

const HIGHLIGHTS = [
  'Explored the 7-lens AI reasoning system',
  'Searched across scientific, philosophical, and symbolic perspectives',
  'Experienced multi-tradition concept mapping',
];

export default function TrialExpiredScreen({ queriesUsed = 0 }: TrialExpiredScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] p-8 text-center max-w-2xl mx-auto">
      {/* Icon */}
      <div className="relative mb-6">
        <Clock className="w-16 h-16 text-amber-400 mx-auto" />
        <Sparkles className="w-8 h-8 text-amber-400/60 absolute -top-2 -right-2" />
      </div>

      {/* Heading */}
      <h2 className="text-3xl font-bold text-amber-100 mb-2">Your 7-Day Trial Has Ended</h2>
      <p className="text-amber-100/60 mb-8 max-w-md">
        You've experienced the full power of the Parallax Engine. Continue your journey with a subscription.
      </p>

      {/* Summary card */}
      <div className="w-full rounded-xl border border-amber-900/30 bg-amber-900/10 p-6 mb-8 text-left">
        <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Trial Summary</h3>

        {queriesUsed > 0 && (
          <p className="text-amber-100/70 text-sm mb-4">
            You submitted <span className="text-amber-100 font-semibold">{queriesUsed}</span> queries during your trial.
          </p>
        )}

        <ul className="space-y-2">
          {HIGHLIGHTS.map((h) => (
            <li key={h} className="flex items-start gap-2 text-sm text-amber-100/70">
              <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <Link
        href="/profile?tab=subscription"
        className="flex items-center gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors mb-4"
      >
        <CreditCard className="w-4 h-4" />
        Choose a Plan
      </Link>

      <p className="text-xs text-amber-100/40">
        Plans start at $5/month · Cancel anytime
      </p>
    </div>
  );
}
