# Performance Monitoring - Quick Reference

## ✅ What's Already Set Up

Performance monitoring is **ready to use** out of the box! The following have been integrated:

1. ✅ **Vercel Speed Insights** - tracks Core Web Vitals automatically
2. ✅ **Vercel Analytics** - tracks page views and user behavior
3. ✅ **Custom Web Vitals utilities** - for advanced tracking
4. ✅ **React hooks** - access metrics in components
5. ✅ **Performance Monitor component** - visual development tool

## 🚀 Quick Start

### View Metrics in Production

1. **Deploy to Vercel** (if not already done)
2. **Visit your Vercel dashboard**
3. **Click "Speed Insights"** tab
4. See real-time Web Vitals data!

### View Metrics in Development

Add this to any layout or page:

```tsx
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

You'll see a floating panel in the bottom-left corner with live metrics!

## 📊 Core Metrics Tracked

| Metric | What It Measures | Good Score |
|--------|------------------|------------|
| **LCP** | Loading speed of main content | ≤ 2.5s |
| **INP** | Responsiveness to user interactions | ≤ 200ms |
| **CLS** | Visual stability (layout shifts) | ≤ 0.1 |
| **FCP** | First content appears | ≤ 1.8s |
| **TTFB** | Server response time | ≤ 800ms |

## 🔧 Custom Tracking Examples

### Track Upload Performance

```tsx
import { performanceMark, measurePerformance } from '@/lib/web-vitals';

async function handleUpload(file: File) {
  performanceMark('upload-start');
  
  await uploadFile(file);
  
  performanceMark('upload-end');
  measurePerformance('file-upload', 'upload-start', 'upload-end');
}
```

### Track OCR Processing

```tsx
performanceMark('ocr-start');
await triggerOCR(fileId);
performanceMark('ocr-end');
measurePerformance('ocr-processing', 'ocr-start', 'ocr-end');
```

### Use Web Vitals in Components

```tsx
'use client';
import { useWebVitals } from '@/hooks/useWebVitals';

export function PerformanceIndicator() {
  const vitals = useWebVitals();
  
  return (
    <div>
      {vitals.LCP && <span>Load: {vitals.LCP.value}ms</span>}
    </div>
  );
}
```

## 🎯 What to Monitor

### Critical User Flows
- ✅ PDF upload and processing
- ✅ OCR text extraction  
- ✅ PDF viewer loading
- ✅ Library search
- ✅ Lens generation
- ✅ Page navigation

### Performance Goals
- Keep LCP under 2.5 seconds
- Keep INP under 200ms
- Keep CLS under 0.1
- OCR processing under 5 seconds

## 🐛 Troubleshooting

### "Metrics not showing in dashboard"
- Ensure you've deployed to Vercel
- Wait 5-10 minutes for data to appear
- Generate some traffic to your site

### "Performance Monitor not appearing"
- Check you're in development mode
- Verify the component is in your layout
- Check browser console for errors

### "High CLS scores"
- Add width/height to all images
- Use Next.js Image component
- Reserve space for dynamic content

### "High LCP scores"
- Optimize your largest image
- Enable image optimization
- Check server response times

## 📝 Files Created

- `src/app/layout.tsx` - Updated with monitoring components
- `src/lib/web-vitals.ts` - Custom tracking utilities
- `src/hooks/useWebVitals.ts` - React hook for metrics
- `src/components/PerformanceMonitor.tsx` - Visual dev tool
- `docs/PERFORMANCE_MONITORING.md` - Full documentation

## 🔗 Resources

- [Full Documentation](./PERFORMANCE_MONITORING.md)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)

## 💡 Pro Tips

1. **Monitor after major changes** - Always check metrics after new features
2. **Test on real devices** - Use Vercel's device distribution data
3. **Set performance budgets** - Define acceptable thresholds
4. **Track custom operations** - Use performance marks for key features
5. **Regular reviews** - Check dashboard weekly

---

**Need help?** Check the [full documentation](./PERFORMANCE_MONITORING.md) or Vercel's support docs.

