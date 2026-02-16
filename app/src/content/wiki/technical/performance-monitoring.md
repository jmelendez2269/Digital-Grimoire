---
title: Performance Monitoring
type: guide
status: stable
audience: developer
description: Guide for monitoring application performance using Vercel Speed Insights and Web Vitals.
---

# Performance Monitoring Guide

## Overview

Project Parallax now includes comprehensive performance monitoring using **Vercel Speed Insights** and **Web Vitals** tracking. This setup allows you to monitor Core Web Vitals and custom performance metrics across your application.

## What's Included

### 1. **Vercel Speed Insights**

Automatically tracks and reports Core Web Vitals to Vercel's dashboard:

- ✅ Largest Contentful Paint (LCP)
- ✅ Interaction to Next Paint (INP)
- ✅ Cumulative Layout Shift (CLS)
- ✅ First Contentful Paint (FCP)
- ✅ Time to First Byte (TTFB)

### 2. **Vercel Analytics**

Tracks page views and user behavior (privacy-focused, GDPR compliant)

### 3. **Custom Web Vitals Utilities**

Located in `src/lib/web-vitals.ts`:

- Custom performance marking
- Performance measurement utilities
- Console logging in development

### 4. **React Hook for Web Vitals**

Located in `src/hooks/useWebVitals.ts`:

- Access Web Vitals data in any component
- Real-time updates as metrics are collected

### 5. **Performance Monitor Component** (Optional)

Located in `src/components/PerformanceMonitor.tsx`:

- Visual overlay showing real-time Web Vitals
- Only visible in development
- Minimizable and dismissible

## Usage

### Basic Setup (Already Done)

The Speed Insights and Analytics components are already integrated in your root layout:

```tsx
// Digital-Grimoire/app/src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// In return statement:
// <SpeedInsights />
// <Analytics />
```

### Viewing Metrics

#### On Vercel Dashboard

1. Deploy your app to Vercel
2. Navigate to your project dashboard
3. Click on the "Speed Insights" tab
4. View real-time and historical Web Vitals data

#### Local Development Monitor

Add the `PerformanceMonitor` component to see metrics in development:

```tsx
// In any layout or page
import { PerformanceMonitor } from '@/components/PerformanceMonitor';

export default function Layout() {
  return (
    <>
      {/* Your content */}
      {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
    </>
  );
}
```

### Using Web Vitals in Components

Track Web Vitals programmatically in your components:

```tsx
'use client';

import { useWebVitals } from '@/hooks/useWebVitals';

export function MyComponent() {
  const vitals = useWebVitals();
  
  // Access individual metrics
  const lcp = vitals.LCP?.value;
  const inp = vitals.INP?.value;
  const cls = vitals.CLS?.value;
  
  return (
    <div>
      {lcp && <p>LCP: {lcp}ms</p>}
      {inp && <p>INP: {inp}ms</p>}
      {cls && <p>CLS: {cls.toFixed(3)}</p>}
    </div>
  );
}
```

### Custom Performance Tracking

Track custom operations like OCR processing or API calls:

```tsx
import { performanceMark, measurePerformance } from '@/lib/web-vitals';

async function processDocument() {
  // Mark the start
  performanceMark('ocr-processing-start');
  
  // Do your processing
  await processOCR();
  
  // Mark the end
  performanceMark('ocr-processing-end');
  
  // Measure the duration
  const duration = measurePerformance(
    'ocr-processing',
    'ocr-processing-start',
    'ocr-processing-end'
  );
  
  console.log(`OCR took ${duration}ms`);
}
```

## Core Web Vitals Explained

### LCP (Largest Contentful Paint)

**What it measures:** Loading performance - how long it takes for the main content to load

**Good:** ≤ 2.5s  
**Needs Improvement:** 2.5s - 4.0s  
**Poor:** > 4.0s

**How to improve:**

- Optimize images (use Next.js Image component)
- Reduce server response times
- Implement code splitting
- Use CDN for static assets

### INP (Interaction to Next Paint)

**What it measures:** Responsiveness - how quickly the page responds to user interactions

**Good:** ≤ 200ms  
**Needs Improvement:** 200ms - 500ms  
**Poor:** > 500ms

**How to improve:**

- Minimize JavaScript execution
- Break up long tasks
- Use React concurrent features
- Optimize event handlers

### CLS (Cumulative Layout Shift)

**What it measures:** Visual stability - how much the page layout shifts unexpectedly

**Good:** ≤ 0.1  
**Needs Improvement:** 0.1 - 0.25  
**Poor:** > 0.25

**How to improve:**

- Set width/height on images and videos
- Reserve space for dynamic content
- Avoid inserting content above existing content
- Use font-display: swap (already implemented)

### FCP (First Contentful Paint)

**What it measures:** How long until the first content appears on screen

**Good:** ≤ 1.8s  
**Needs Improvement:** 1.8s - 3.0s  
**Poor:** > 3.0s

### TTFB (Time to First Byte)

**What it measures:** Server response time

**Good:** ≤ 800ms  
**Needs Improvement:** 800ms - 1800ms  
**Poor:** > 1800ms

## Monitoring Specific Features

### PDF Viewer Performance

```tsx
import { performanceMark, measurePerformance } from '@/lib/web-vitals';

function PDFViewer({ url }: { url: string }) {
  useEffect(() => {
    performanceMark('pdf-load-start');
    
    // Load PDF
    loadPDF(url).then(() => {
      performanceMark('pdf-load-end');
      measurePerformance('pdf-load', 'pdf-load-start', 'pdf-load-end');
    });
  }, [url]);
}
```

### OCR Processing Time

```tsx
async function triggerOCR(fileId: string) {
  performanceMark('ocr-trigger-start');
  
  const response = await fetch('/api/ocr/trigger', {
    method: 'POST',
    body: JSON.stringify({ fileId }),
  });
  
  performanceMark('ocr-trigger-end');
  
  const duration = measurePerformance(
    'ocr-trigger',
    'ocr-trigger-start',
    'ocr-trigger-end'
  );
  
  console.log(`OCR trigger took ${duration}ms`);
}
```

### Search Performance

```tsx
async function searchLibrary(query: string) {
  performanceMark('search-start');
  
  const results = await supabase
    .from('texts')
    .select('*')
    .textSearch('fts', query);
  
  performanceMark('search-end');
  
  measurePerformance('library-search', 'search-start', 'search-end');
}
```

## Best Practices

### 1. Monitor Critical User Journeys

Track performance for key user flows:

- Upload and OCR processing
- PDF viewing
- Search functionality
- Lens generation
- Library browsing

### 2. Set Performance Budgets

Define acceptable thresholds:

- LCP: < 2.5s
- INP: < 200ms
- CLS: < 0.1
- Custom operations (e.g., OCR): < 5s

### 3. Regular Monitoring

- Check Speed Insights dashboard weekly
- Set up alerts for performance regressions
- Monitor before and after major changes

### 4. Test on Real Devices

- Use Vercel's device distribution data
- Test on slower devices and networks
- Consider users on 3G/4G connections

## Environment Variables

No additional environment variables are required! Speed Insights and Analytics work out of the box.

### Optional: Custom Analytics Endpoint

If you want to send metrics to your own analytics service:

```env
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://your-analytics.com/api/vitals
```

Then update `src/lib/web-vitals.ts`:

```typescript
export function reportWebVitals(metric: Metric) {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    });
  }
}
```

## Troubleshooting

### Metrics Not Showing in Vercel Dashboard

1. Ensure you've deployed to Vercel
2. Wait a few minutes for data to populate
3. Check that Speed Insights is enabled in project settings
4. Verify the components are in your layout

### High CLS Scores

- Check for images without width/height
- Look for dynamically inserted content
- Verify font loading strategy

### High LCP Scores

- Optimize your largest image/content element
- Check server response times
- Review code splitting and lazy loading

### High INP Scores

- Profile JavaScript execution
- Look for heavy event handlers
- Check for long-running tasks blocking the main thread

## Deployment Checklist

✅ Speed Insights component added to layout  
✅ Analytics component added to layout  
✅ Web Vitals utilities created  
✅ Performance monitor component available  
✅ Documentation complete  

Next steps:

1. Deploy to Vercel
2. Monitor Speed Insights dashboard
3. Set performance budgets
4. Implement optimizations as needed

## Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Core Web Vitals Best Practices](https://web.dev/vitals/)

## Support

For issues or questions:

1. Check Vercel's Speed Insights documentation
2. Review Web Vitals best practices
3. Check browser DevTools Performance tab
4. Use the Performance Monitor component in development
