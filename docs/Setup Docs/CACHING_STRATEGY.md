# Caching Strategy Implementation Guide

**Last Updated:** November 10, 2025  
**Status:** Implementation Guide  
**Reference:** `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md` (Section 7: Performance Optimization)

---

## Overview

This guide provides step-by-step instructions for implementing a comprehensive caching strategy for the Convergence Library application deployed on Vercel. Proper caching improves performance, reduces server load, and enhances user experience.

---

## 1. CDN Configuration (Vercel Edge)

### ✅ Automatic Configuration

Vercel automatically provides Edge CDN for all deployments. No manual configuration is required.

**What's Already Configured:**
- ✅ Global Edge Network automatically enabled
- ✅ Static assets served from Edge locations
- ✅ Automatic geographic distribution

**Verification Steps:**

⚠️ **Important:** There is **NO "Edge Network" setting** in Project Settings. Edge Network is automatically enabled for all Vercel deployments - it's built into the platform and cannot be disabled.

To verify Edge Network is working:

1. **Via Analytics (Recommended):**
   - Navigate to Vercel Dashboard → Your Project → **Analytics** tab (NOT Settings)
   - Look for Edge Network metrics showing:
     - CDN hit rates
     - Cache hit rates  
     - Geographic distribution of requests
   - Note: These metrics may only appear after you have traffic/deployments

2. **Via Browser DevTools:**
   - Open your deployed site in a browser
   - Open DevTools → Network tab
   - Check response headers for:
     - `X-Cache` header (shows cache status: HIT, MISS, etc.)
     - `X-Vercel-Cache` header
     - `Cache-Control` header

3. **Via Response Headers (Programmatic):**
   - Make a request to your deployed site
   - Check for Vercel-specific cache headers in the response

**Note:** Edge Network is **always enabled** - there's no toggle or setting to configure. If you don't see Edge Network metrics in Analytics, it may be because:
- The project is new and hasn't received traffic yet
- You're looking in Settings instead of Analytics
- Your plan doesn't include detailed Analytics (check your Vercel plan)

**No Action Required** - Vercel handles Edge Network automatically for all deployments.

---

## 2. Static Assets Caching

### Current State

Next.js automatically handles static asset caching, but we can optimize with explicit cache headers.

### Implementation

Add cache headers to `next.config.ts` for optimal static asset caching:

```typescript
// In next.config.ts headers() function, add:

async headers() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return [
    // ... existing security headers ...
    
    // Static assets with content hash - long-term caching
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    // Images from Next.js Image Optimization
    {
      source: '/_next/image',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    // Public static files (robots.txt, sitemap.xml, etc.)
    {
      source: '/:path*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|woff|woff2|ttf|eot)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=86400, stale-while-revalidate=604800',
        },
      ],
    },
  ];
}
```

### What This Does

- **Hashed Assets** (`/_next/static/*`): 1 year cache (immutable) - safe because filenames include content hash
- **Image Optimization** (`/_next/image`): 1 year cache - Next.js handles versioning
- **Public Assets**: 1 day cache with 1 week stale-while-revalidate

### Verification

After deployment:
1. Check browser DevTools → Network tab
2. Verify static assets have `Cache-Control` headers
3. Confirm cache times match configuration

---

## 3. API Response Caching

### Strategy

Different API routes require different caching strategies:

#### Cacheable Routes (Read-Only, Public Data)
- `/api/texts` - Library texts (cache for 5-15 minutes)
- `/api/concepts` - Concept definitions (cache for 1 hour)
- `/api/graph/entities` - Knowledge graph entities (cache for 15 minutes)
- `/api/graph/edges` - Knowledge graph relationships (cache for 15 minutes)

#### Non-Cacheable Routes
- `/api/convergence/query` - SSE streams (already has `no-cache`)
- `/api/auth/*` - Authentication endpoints
- `/api/user/*` - User-specific data
- `/api/journal/*` - User journal entries
- `/api/annotations/*` - User annotations

### Implementation

#### Example: Cacheable API Route

```typescript
// app/src/app/api/texts/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // ... existing code ...
  
  const response = NextResponse.json(data);
  
  // Add cache headers for public, read-only data
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=600'
  );
  
  return response;
}
```

#### Cache Header Values

- `public` - Can be cached by CDN and browsers
- `s-maxage=300` - CDN cache for 5 minutes
- `stale-while-revalidate=600` - Serve stale content for up to 10 minutes while revalidating

#### Example: User-Specific Route (No Cache)

```typescript
// app/src/app/api/journal/[id]/route.ts
export async function GET(request: NextRequest) {
  // ... existing code ...
  
  const response = NextResponse.json(data);
  
  // No caching for user-specific data
  response.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate'
  );
  
  return response;
}
```

### Priority Implementation Order

1. **High Priority** (Most traffic, read-only):
   - `/api/texts` - Library listing
   - `/api/concepts` - Concept definitions

2. **Medium Priority**:
   - `/api/graph/*` - Knowledge graph data
   - `/api/collections` - Public collections

3. **Low Priority**:
   - Other read-only endpoints

---

## 4. Incremental Static Regeneration (ISR)

### When to Use ISR

ISR is ideal for pages that:
- Change infrequently
- Are expensive to generate
- Benefit from static performance

### Implementation

#### Example: Library Page with ISR

```typescript
// app/src/app/library/page.tsx
export const revalidate = 3600; // Revalidate every hour

export default async function LibraryPage() {
  // ... page content ...
}
```

#### Example: Dynamic Route with ISR

```typescript
// app/src/app/texts/[id]/page.tsx
export const revalidate = 1800; // Revalidate every 30 minutes

export async function generateStaticParams() {
  // Pre-generate popular texts at build time
  const popularTexts = await getPopularTexts();
  return popularTexts.map((text) => ({ id: text.id }));
}

export default async function TextPage({ params }: { params: { id: string } }) {
  // ... page content ...
}
```

### Revalidation Times

- **Frequently Updated**: 5-15 minutes (`revalidate: 300` or `900`)
- **Moderately Updated**: 30-60 minutes (`revalidate: 1800` or `3600`)
- **Rarely Updated**: 1-24 hours (`revalidate: 3600` or `86400`)

---

## 5. Database Query Optimization

### Current State

- ✅ React Query configured with 5-minute stale time
- ✅ 30-minute garbage collection time
- ⚠️ No database-level query result caching

### React Query Configuration

Current configuration in `app/src/lib/react-query.tsx`:

```typescript
staleTime: 5 * 60 * 1000, // 5 minutes
gcTime: 30 * 60 * 1000, // 30 minutes
```

**This is appropriate for most use cases.** Consider adjusting for:
- **Frequently changing data**: Reduce stale time to 1-2 minutes
- **Rarely changing data**: Increase stale time to 15-30 minutes

### Database Indexes

Ensure indexes exist for frequently queried columns:

```sql
-- Example indexes (verify these exist in Supabase)
CREATE INDEX IF NOT EXISTS idx_texts_status ON texts(status);
CREATE INDEX IF NOT EXISTS idx_texts_type ON texts(type);
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(name);
```

**Verification:**
1. Check Supabase Dashboard → Database → Indexes
2. Review query performance in Supabase Analytics
3. Add indexes for slow queries

### Query Result Caching (Optional)

For expensive queries, consider implementing application-level caching:

```typescript
// Example: Cache expensive concept queries
const CACHE_TTL = 3600; // 1 hour
const queryCache = new Map<string, { data: any; expires: number }>();

export async function getCachedConcepts() {
  const cacheKey = 'concepts:all';
  const cached = queryCache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  const data = await fetchConcepts();
  queryCache.set(cacheKey, {
    data,
    expires: Date.now() + CACHE_TTL * 1000,
  });
  
  return data;
}
```

**Note:** For production, consider using Redis or Supabase's built-in caching if available.

---

## 6. Cache Invalidation Strategy

### When to Invalidate

- **User Actions**: Invalidate user-specific caches when data changes
- **Admin Updates**: Invalidate public caches when content is updated
- **Scheduled**: Use ISR revalidation for time-based invalidation

### Implementation Pattern

```typescript
// Example: Invalidate cache after update
export async function updateText(id: string, data: TextUpdate) {
  // Update database
  await supabase.from('texts').update(data).eq('id', id);
  
  // Invalidate React Query cache
  queryClient.invalidateQueries({ queryKey: ['texts', id] });
  queryClient.invalidateQueries({ queryKey: ['texts'] });
  
  // Revalidate ISR page
  await revalidatePath(`/texts/${id}`);
  await revalidatePath('/library');
}
```

---

## 7. Monitoring & Verification

### Vercel Analytics

1. Navigate to Vercel Dashboard → Your Project → **Analytics** tab (NOT Settings)
2. Look for **Edge Network** or **CDN** metrics (may be under different sections depending on your plan):
   - CDN hit rate (should be >80% for static assets)
   - Cache hit rate
   - Geographic distribution
   - Note: If you don't see these metrics, check your Vercel plan - some metrics require Pro/Enterprise plans

### Browser DevTools

1. Open DevTools → Network tab
2. Check response headers:
   - `Cache-Control` header present
   - `X-Cache` header (Vercel CDN status)
   - `X-Vercel-Cache` header

### Performance Testing

1. Run Lighthouse audit
2. Check **Caching** section in report
3. Verify cache headers are set correctly
4. Test cache behavior with different scenarios

---

## 8. Implementation Checklist

- [ ] Add static asset cache headers to `next.config.ts`
- [ ] Add cache headers to cacheable API routes
- [ ] Configure ISR for appropriate pages
- [ ] Verify database indexes exist
- [ ] Test cache behavior in development
- [ ] Deploy and verify in production
- [ ] Monitor cache hit rates in Vercel Analytics
- [ ] Adjust cache times based on real-world usage

---

## 9. Common Issues & Solutions

### Issue: Stale Data Showing

**Solution:** Reduce cache times or implement proper cache invalidation

### Issue: Cache Not Working

**Solution:** 
- Verify headers are set correctly
- Check Vercel deployment logs
- Ensure route is not using `dynamic = 'force-dynamic'`

### Issue: Too Much Cache

**Solution:** 
- Reduce cache times for frequently updated data
- Use `stale-while-revalidate` for better UX

---

## 10. References

- **Next.js Caching:** https://nextjs.org/docs/app/building-your-application/caching
- **Vercel Edge Network:** https://vercel.com/docs/edge-network
- **React Query Caching:** https://tanstack.com/query/latest/docs/react/guides/caching
- **Production Checklist:** `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`

---

**Version:** 1.0  
**Last Updated:** November 10, 2025

