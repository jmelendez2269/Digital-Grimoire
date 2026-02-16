'use client';

import { AlertCircle, Zap } from 'lucide-react';
import Link from 'next/link';

interface RateLimitDisplayProps {
  remaining: number;
  limit: number;
  resetDate: Date | string;
  isPremium: boolean;
}

export default function RateLimitDisplay({
  remaining,
  limit,
  resetDate,
  isPremium,
}: RateLimitDisplayProps) {
  if (isPremium) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-amber-100/80">Premium: Unlimited queries</span>
      </div>
    );
  }

  const percentage = (remaining / limit) * 100;
  const isLow = remaining <= 2;

  return (
    <div className={`p-3 rounded-lg border ${isLow
        ? 'bg-red-900/20 border-red-600/30'
        : 'bg-zinc-900/50 border-amber-900/20'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isLow ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400" />
          )}
          <span className={`text-sm font-medium ${isLow ? 'text-red-400' : 'text-amber-100/80'
            }`}>
            Free Tier: {remaining} / {limit} queries remaining
          </span>
        </div>
        <Link
          href="/profile?tab=subscription"
          className="text-xs text-amber-400 hover:text-amber-300 underline"
        >
          Upgrade
        </Link>
      </div>

      <div className="w-full bg-zinc-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${isLow ? 'bg-red-600' : 'bg-cyan-600'
            }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-amber-100/60 mt-2">
        Resets on {new Date(resetDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })}
      </p>
    </div>
  );
}

