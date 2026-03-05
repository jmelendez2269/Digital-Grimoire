'use client';

import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface PremiumGateProps {
  children: React.ReactNode;
  isPremium: boolean;
  rateLimitRemaining: number;
  limit?: number;
}

export default function PremiumGate({
  children,
  isPremium,
  rateLimitRemaining,
  limit = 5,
}: PremiumGateProps) {
  // If premium or has remaining queries, show content
  if (isPremium || rateLimitRemaining > 0) {
    return <>{children}</>;
  }

  // Show upgrade prompt
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="mb-6">
        <Lock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <Sparkles className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
      </div>

      <h2 className="text-3xl font-bold text-amber-100 mb-4">
        Parallax Engine
      </h2>

      <p className="text-lg text-amber-100/70 mb-2 max-w-md">
        You've used all {limit} free queries this month.
      </p>

      <p className="text-sm text-amber-100/60 mb-8 max-w-md">
        Upgrade to premium for unlimited access to the 7-lens AI reasoning system.
      </p>

      <Link
        href="/profile?tab=subscription"
        className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
      >
        Upgrade to Premium
      </Link>

      <p className="text-xs text-amber-100/40 mt-6">
        Queries reset on the first of each month
      </p>
    </div>
  );
}

