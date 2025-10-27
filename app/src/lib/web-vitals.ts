/**
 * Web Vitals tracking utilities
 * 
 * This module provides custom hooks and utilities for tracking Core Web Vitals
 * and custom performance metrics throughout the application.
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export type WebVitalsMetric = Metric;

/**
 * Reports a Web Vitals metric to the console (dev) or your analytics endpoint (production)
 */
export function reportWebVitals(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  }

  // In production, you can send to your own analytics endpoint
  // Example: fetch('/api/analytics', { method: 'POST', body: JSON.stringify(metric) })
  
  // The Vercel Speed Insights component automatically handles reporting to Vercel
}

/**
 * Initialize all Core Web Vitals listeners
 */
export function initWebVitals() {
  try {
    onCLS(reportWebVitals);  // Cumulative Layout Shift
    onFCP(reportWebVitals);  // First Contentful Paint
    onINP(reportWebVitals);  // Interaction to Next Paint (replaces FID)
    onLCP(reportWebVitals);  // Largest Contentful Paint
    onTTFB(reportWebVitals); // Time to First Byte
  } catch (error) {
    console.error('Failed to initialize Web Vitals:', error);
  }
}

/**
 * Custom performance mark utility
 * Use this to track custom performance metrics in your app
 * 
 * @example
 * ```ts
 * performanceMark('ocr-processing-start');
 * // ... do OCR processing
 * performanceMark('ocr-processing-end');
 * const duration = measurePerformance('ocr-processing', 'ocr-processing-start', 'ocr-processing-end');
 * ```
 */
export function performanceMark(markName: string) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(markName);
  }
}

/**
 * Measure performance between two marks
 * Returns the duration in milliseconds
 */
export function measurePerformance(
  measureName: string,
  startMark: string,
  endMark: string
): number | null {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      const measure = performance.measure(measureName, startMark, endMark);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${measureName}: ${measure.duration.toFixed(2)}ms`);
      }
      
      return measure.duration;
    } catch (error) {
      console.error('Failed to measure performance:', error);
      return null;
    }
  }
  return null;
}

/**
 * Clear performance marks and measures
 */
export function clearPerformanceMarks(markName?: string) {
  if (typeof window !== 'undefined' && window.performance) {
    if (markName) {
      performance.clearMarks(markName);
      performance.clearMeasures(markName);
    } else {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

/**
 * Get all performance entries of a specific type
 */
export function getPerformanceEntries(entryType: string = 'measure') {
  if (typeof window !== 'undefined' && window.performance) {
    return performance.getEntriesByType(entryType);
  }
  return [];
}

