/**
 * Performance Monitor Component
 * 
 * Optional development component that displays real-time Web Vitals metrics
 * Add this to your layout or any page during development to monitor performance
 * 
 * @example
 * ```tsx
 * // In your layout or page (only in development)
 * {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
 * ```
 */

'use client';

import { useWebVitals } from '@/hooks/useWebVitals';
import { useEffect, useState } from 'react';

export function PerformanceMonitor() {
  const vitals = useWebVitals();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Hide in production
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      setIsVisible(false);
    }
  }, []);

  if (!isVisible) return null;

  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case 'good':
        return 'text-green-400';
      case 'needs-improvement':
        return 'text-yellow-400';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatValue = (value?: number, name?: string) => {
    if (value === undefined) return '-';
    
    // CLS is unitless, others are in milliseconds
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 font-mono text-xs">
      <div className="bg-black/90 border border-purple-500/50 rounded-lg shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-purple-300 font-semibold">Web Vitals</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? '□' : '_'}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Metrics */}
        {!isMinimized && (
          <div className="p-3 space-y-2">
            {/* LCP - Largest Contentful Paint */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">LCP:</span>
              <span className={getRatingColor(vitals.LCP?.rating)}>
                {formatValue(vitals.LCP?.value, 'LCP')}
              </span>
            </div>

            {/* INP - Interaction to Next Paint */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">INP:</span>
              <span className={getRatingColor(vitals.INP?.rating)}>
                {formatValue(vitals.INP?.value, 'INP')}
              </span>
            </div>

            {/* CLS - Cumulative Layout Shift */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">CLS:</span>
              <span className={getRatingColor(vitals.CLS?.rating)}>
                {formatValue(vitals.CLS?.value, 'CLS')}
              </span>
            </div>

            {/* FCP - First Contentful Paint */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">FCP:</span>
              <span className={getRatingColor(vitals.FCP?.rating)}>
                {formatValue(vitals.FCP?.value, 'FCP')}
              </span>
            </div>

            {/* TTFB - Time to First Byte */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">TTFB:</span>
              <span className={getRatingColor(vitals.TTFB?.rating)}>
                {formatValue(vitals.TTFB?.value, 'TTFB')}
              </span>
            </div>

            {/* Legend */}
            <div className="pt-2 mt-2 border-t border-purple-500/30 text-[10px] text-gray-500">
              <div className="flex gap-3">
                <span className="text-green-400">● Good</span>
                <span className="text-yellow-400">● Fair</span>
                <span className="text-red-400">● Poor</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

