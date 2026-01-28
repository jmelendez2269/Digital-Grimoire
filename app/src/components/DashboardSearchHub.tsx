'use client';

import { Suspense } from 'react';
import DashboardSearchHubContent from './DashboardSearchHubContent';

export default function DashboardSearchHub() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex gap-2 mb-6 border-b border-zinc-800 overflow-x-auto h-[50px]">
          {/* Loading skeleton */}
        </div>
        <div className="h-[200px] bg-zinc-900/30 rounded-xl animate-pulse" />
      </div>
    }>
      <DashboardSearchHubContent />
    </Suspense>
  );
}

