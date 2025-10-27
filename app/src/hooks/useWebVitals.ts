/**
 * React hook for monitoring Web Vitals in your components
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const vitals = useWebVitals();
 *   
 *   return (
 *     <div>
 *       {vitals.LCP && <p>LCP: {vitals.LCP.value}ms</p>}
 *     </div>
 *   );
 * }
 * ```
 */

'use client';

import { useEffect, useState } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

type WebVitalsState = {
  CLS?: Metric;
  FCP?: Metric;
  INP?: Metric;
  LCP?: Metric;
  TTFB?: Metric;
};

export function useWebVitals() {
  const [vitals, setVitals] = useState<WebVitalsState>({});

  useEffect(() => {
    const handleMetric = (metric: Metric) => {
      setVitals((prev) => ({
        ...prev,
        [metric.name]: metric,
      }));
    };

    onCLS(handleMetric);
    onFCP(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  }, []);

  return vitals;
}

