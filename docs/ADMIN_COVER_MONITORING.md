# Admin Dashboard - Cover System Monitoring

## Overview

Added comprehensive monitoring for the book cover system in the admin dashboard, including Nano Banana API status, credit tracking, and generation job monitoring.

**Implementation Date:** October 28, 2025

---

## Features Added

### 1. Nano Banana API Status Widget

**Displays:**
- ✅ API configuration status (Active/Not Configured)
- 💳 Available credits in real-time
- 📊 Estimated covers remaining (credits ÷ 2)
- ⚠️ Setup instructions when not configured

**Visual Indicators:**
- Green badge for active API
- Amber badge for unconfigured API
- Real-time credit balance
- Cover capacity calculation

### 2. Generation Statistics Card

**Metrics Shown:**
- Success rate percentage
- Total generation jobs
- Credits consumed
- Failed attempts

**Use Cases:**
- Monitor system reliability
- Track AI generation success
- Identify failure patterns

### 3. Cost Tracking Card

**Displays:**
- Total estimated cost (credits × $0.10)
- Number of covers generated
- Failed attempt count
- Real-time cost monitoring

**Formula:**
```
Cost = Total Credits Used × $0.10 per credit
```

### 4. Cover Source Distribution

**Shows breakdown of:**
- 🔍 Scraped covers (free from APIs)
- 🤖 AI-generated covers (Nano Banana)
- 📤 Manual uploads
- Count for each source type

**Benefits:**
- Understand cost breakdown
- Optimize scraping vs AI ratio
- Track manual intervention needs

### 5. Recent Cover Generation Jobs

**Job Information:**
- Job status (completed, failed, processing, pending)
- Source (nano-banana, open-library, etc.)
- Credits used per job
- Timestamp
- Error messages (if failed)
- Result URL (if successful)

**Features:**
- Color-coded status badges
- Last 10 jobs displayed
- Scrollable job history
- Full error visibility

---

## API Endpoint

### GET `/api/admin/covers/status`

**Authentication:** Admin only (checked via Supabase RLS)

**Response Structure:**
```json
{
  "success": true,
  "nanoBanana": {
    "configured": true,
    "available": true,
    "credits": 100,
    "error": null
  },
  "stats": {
    "totalJobs": 45,
    "completed": 42,
    "failed": 3,
    "pending": 0,
    "successRate": 93.3,
    "totalCreditsUsed": 84,
    "estimatedCost": 8.40
  },
  "coverSources": [
    { "cover_source": "scraped", "count": 125 },
    { "cover_source": "ai-generated", "count": 42 },
    { "cover_source": "manual", "count": 8 }
  ],
  "recentJobs": [...]
}
```

**Data Sources:**
1. Nano Banana API status check
2. `cover_generation_jobs` table
3. `texts.cover_source` aggregation

---

## Technical Implementation

### Files Modified

#### 1. `app/src/app/api/admin/covers/status/route.ts` (NEW)
- Admin authentication check
- Nano Banana status API call
- Cover generation jobs query
- Cover source distribution aggregation
- Statistics calculation
- Credit usage tracking

#### 2. `app/src/app/admin/page.tsx`
- Added `CoverSystemStatus` interface
- Added `coverStatus` state
- Integrated cover status fetch with existing metrics
- Added "🎨 Book Cover System" widget section
- Real-time data display

---

## Database Queries

### Cover Generation Jobs
```typescript
const { data: recentJobs } = await supabase
  .from('cover_generation_jobs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20);
```

### Cover Sources Distribution
```typescript
const { data: textsWithCovers } = await supabase
  .from('texts')
  .select('cover_source')
  .not('cover_source', 'is', null);
```

---

## UI Components

### Status Badge Color Coding

```typescript
// Nano Banana Status
✓ Active      → Green (API configured and working)
○ Not Config  → Amber (API key not set)

// Job Status
completed     → Green
failed        → Red
processing    → Blue
pending       → Amber
```

### Responsive Layout

```
Desktop (3 columns):
┌─────────────┬─────────────┬─────────────┐
│ API Status  │   Stats     │    Cost     │
└─────────────┴─────────────┴─────────────┘

Mobile (stacked):
┌─────────────┐
│ API Status  │
├─────────────┤
│   Stats     │
├─────────────┤
│    Cost     │
└─────────────┘
```

---

## Monitoring Scenarios

### Scenario 1: API Not Configured
**Display:**
- Amber warning badge
- "○ Not Configured" status
- Setup instructions
- No credit information

**Admin Action:** Add `NANO_BANANA_API_KEY` to environment

### Scenario 2: Running Low on Credits
**Display:**
- Green active badge
- Low credit count (e.g., 10 credits)
- Estimated covers remaining (5 covers)

**Admin Action:** Purchase more credits at nano-banana.ai

### Scenario 3: High Failure Rate
**Display:**
- Red warning in stats
- High failed attempt count
- Recent error messages in job list

**Admin Action:** Check error messages, verify API key, contact support

### Scenario 4: Optimal Performance
**Display:**
- Green active badge
- High success rate (>90%)
- Good credit balance
- Mix of scraped and AI-generated covers

**Admin Action:** Monitor regularly, maintain balance

---

## Cost Analysis Tools

### Real-Time Cost Tracking
```
Total Credits Used: 84
Cost per Credit: $0.10
Total Cost: $8.40
```

### Per-Cover Cost
```
Completed Jobs: 42
Total Cost: $8.40
Average Cost per Cover: $0.20
```

### Monthly Projections
Admins can calculate:
```
Average covers/week × 4 weeks × $0.20 = Monthly AI cost
```

---

## Performance Considerations

### Caching Strategy
- Dashboard data refreshed on page load
- Time range selector triggers refresh
- No auto-refresh (prevents unnecessary API calls)

### Query Optimization
- Recent jobs limited to 20
- Cover sources aggregated client-side
- Statistics calculated in API route

### Loading States
- Shared loading state with existing metrics
- Skeleton loaders for all widgets
- Graceful error handling

---

## Security

### Admin-Only Access
```typescript
const { data: profile } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### API Key Protection
- Nano Banana API key never exposed to client
- All checks done server-side
- No sensitive data in browser

### RLS Policies
- `cover_generation_jobs` table has admin-only RLS
- Queries automatically filtered by Supabase

---

## Future Enhancements

### Phase 1 (Current) ✅
- [x] API status monitoring
- [x] Credit balance display
- [x] Job history tracking
- [x] Cost calculation
- [x] Source distribution

### Phase 2 (Planned)
- [ ] Auto-refresh dashboard data
- [ ] Credit usage graphs/charts
- [ ] Email alerts for low credits
- [ ] Bulk cover generation interface
- [ ] Cover quality ratings

### Phase 3 (Future)
- [ ] Cost forecasting
- [ ] A/B testing different AI prompts
- [ ] Cover approval workflow
- [ ] Analytics dashboard with trends
- [ ] Export reports to CSV/PDF

---

## Troubleshooting

### No Cover Data Showing
**Symptom:** Empty widget or "No cover generation jobs yet"
**Solution:**
1. Verify database migration `017_add_cover_source.sql` ran successfully
2. Generate a test cover to populate data
3. Check browser console for API errors

### API Status Shows Error
**Symptom:** Nano Banana shows error message
**Solution:**
1. Verify `NANO_BANANA_API_KEY` is set in `.env.local`
2. Restart Next.js dev server
3. Check API key is valid at nano-banana.ai
4. Verify account has available credits

### Jobs Stuck in "Pending"
**Symptom:** Jobs never complete
**Solution:**
1. Check if cover generation API endpoints are working
2. Verify Nano Banana API is responding
3. Look for errors in server logs
4. May need to implement job cleanup script

---

## Admin Workflow

### Daily Monitoring
1. Check Nano Banana status (green = good)
2. Review success rate (should be >85%)
3. Monitor credit balance
4. Scan recent jobs for errors

### Weekly Review
1. Analyze cover source distribution
2. Calculate total AI costs
3. Review failed jobs and patterns
4. Purchase credits if running low (<50)

### Monthly Analysis
1. Total AI generation cost
2. Scraped vs AI ratio optimization
3. Success rate trends
4. Cost per document analysis

---

## Integration with Existing Dashboard

The cover system monitoring integrates seamlessly with:
- **API Usage Tracking** - Shows Nano Banana alongside Azure/OpenAI costs
- **Storage Usage** - Complements file storage metrics
- **Top Users** - Could be extended to show users requesting covers
- **Cost Alerts** - Future: Add cover generation to cost thresholds

---

## Documentation References

- **Cover System Implementation:** `docs/BOOK_COVER_SYSTEM_IMPLEMENTATION.md`
- **Environment Variables:** `docs/Setup Docs/ENVIRONMENT_VARIABLES.md`
- **Database Migration:** `migrations/017_add_cover_source.sql`
- **Nano Banana API:** https://nanobanana.im/api

---

## Summary

The admin dashboard now provides complete visibility into the book cover generation system:

✅ **Real-time API monitoring**  
✅ **Credit and cost tracking**  
✅ **Job history and error visibility**  
✅ **Source distribution analytics**  
✅ **Success rate monitoring**  
✅ **Admin-only secure access**  

Admins can proactively manage the cover system, optimize costs, and ensure high-quality cover generation for all documents.

---

**Next Steps:**
1. Access admin dashboard at `/admin`
2. Scroll to "🎨 Book Cover System" section
3. Monitor Nano Banana status
4. Generate test covers to populate data
5. Set up credit purchase reminders if needed

