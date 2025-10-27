# Admin Usage Tracking & Analytics Dashboard

## Overview

The Admin Usage Tracking system provides comprehensive monitoring of API usage, costs, and user activity to help make informed decisions about pricing and budget management.

## Features

### 📊 What's Tracked

1. **API Usage**
   - Azure Document Intelligence (OCR) - pages processed
   - OpenAI GPT-4 (Metadata Extraction) - tokens used
   - Cloudflare R2 (Storage) - files uploaded
   - R2 Bandwidth - data transferred

2. **User Activity**
   - Document uploads
   - Document views
   - Searches performed
   - Annotations created
   - Bookmarks created

3. **Costs**
   - Real-time cost calculation based on usage
   - Daily, weekly, and monthly cost tracking
   - Cost alerts and thresholds
   - Per-service cost breakdown

4. **Storage Metrics**
   - Total files and size
   - Breakdown by file type (PDF, images, etc.)
   - Storage growth over time

## Database Schema

### Core Tables

#### `api_usage`
Tracks every API call made by the system.
- Service type (Azure OCR, OpenAI, R2, etc.)
- Units used (pages, tokens, bytes)
- Estimated cost
- User and document references
- Success/failure status
- Timestamp

#### `daily_usage_summary`
Aggregated daily metrics for faster queries.
- Automatically updated via trigger
- Total requests, successes, failures
- Total cost per service per day
- Unique users count

#### `user_activity_summary`
Daily user activity aggregations.
- Documents uploaded/viewed
- Searches and annotations
- Per-user daily tracking

#### `storage_usage`
Periodic snapshots of storage metrics.
- Total files and size
- Breakdown by file type
- Bandwidth usage

#### `cost_alerts`
Configurable cost thresholds.
- Daily, weekly, monthly thresholds
- Alert status tracking

## Setup Instructions

### 1. Run Database Migrations

Run these SQL files in your Supabase SQL Editor:

```bash
# Run in order:
1. migrations/010_add_usage_tracking.sql
2. migrations/011_add_top_users_function.sql
```

### 2. Verify Permissions

Make sure your Supabase service role key has permissions to:
- Insert into `api_usage` table
- Read from all usage tables (for admin users)

### 3. Update Environment Variables (Optional)

The system uses default pricing. To customize, edit `PRICING` constants in:
```
app/src/lib/usage-tracker.ts
```

Current default pricing:
- Azure OCR: $0.01 per page
- OpenAI GPT-4o: $0.0025 per 1K input tokens, $0.01 per 1K output tokens
- Cloudflare R2: $0.015 per GB/month storage

## Usage

### Accessing the Dashboard

1. Log in as an admin user
2. Navigate to `/admin`
3. You'll see the comprehensive analytics dashboard

### Dashboard Features

#### Overview Cards
- Total users
- Total documents
- Recent uploads (last 7 days)
- Monthly cost

#### Cost Breakdown
- Daily, weekly, monthly costs
- Visual comparison to thresholds
- Cost alerts

#### Service Stats
- Per-service API usage
- Total cost per service
- Average cost per request
- Request counts

#### Storage Usage
- Total files and storage size
- Breakdown by file type

#### Top Users
- Most active users by activity
- Upload and view counts

#### Recent Errors
- Failed API calls
- Error messages and timestamps
- Service breakdown

#### Pricing Insights
- Automated recommendations
- Cost per upload calculations
- Projected monthly costs
- Service cost percentages

### Time Range Selection

Toggle between:
- Last 7 days
- Last 30 days (default)
- Last 90 days

## API Endpoints

### GET `/api/admin/usage`

Fetch usage metrics.

**Query Parameters:**
- `range` (optional): Number of days to fetch (default: 30)

**Response:**
```json
{
  "success": true,
  "overview": {
    "totalUsers": 150,
    "totalDocuments": 450,
    "recentUploads": 23,
    "currentCosts": {
      "daily": 5.23,
      "weekly": 32.15,
      "monthly": 127.89
    }
  },
  "serviceStats": [...],
  "dailySummary": [...],
  "topUsers": [...],
  "costAlerts": [...],
  "recentErrors": [...]
}
```

### POST `/api/admin/usage`

Update cost alert thresholds.

**Request Body:**
```json
{
  "alertType": "daily" | "weekly" | "monthly",
  "thresholdAmount": 100.00
}
```

## Automatic Tracking

The system automatically tracks usage when:

1. **Documents are uploaded**
   - OCR processing is logged
   - Metadata extraction is logged
   - Storage upload is logged
   - User activity is recorded

2. **API calls are made**
   - All Azure OCR calls
   - All OpenAI metadata extractions
   - Success and failures are tracked

3. **Users interact**
   - Bookmarks, annotations, searches
   - Document views (when implemented)

## Cost Estimation

### How Costs are Calculated

1. **Azure OCR**: `pages × $0.01`
2. **OpenAI**: `(inputTokens/1000 × $0.0025) + (outputTokens/1000 × $0.01)`
3. **R2 Storage**: `GB × $0.015/month` (prorated)
4. **R2 Bandwidth**: Free (up to limits)

### Updating Pricing

To update pricing for new rates:

1. Edit `Digital-Grimoire/app/src/lib/usage-tracker.ts`
2. Update the `PRICING` constants
3. Restart your application

```typescript
export const PRICING = {
  AZURE_OCR_PER_PAGE: 0.01,
  OPENAI_INPUT_PER_1K: 0.0025,
  OPENAI_OUTPUT_PER_1K: 0.01,
  // ... etc
};
```

## Making Pricing Decisions

### Key Metrics to Consider

1. **Cost per Upload**
   ```
   Monthly Cost ÷ Total Uploads = Cost per Upload
   ```

2. **Cost per User**
   ```
   Monthly Cost ÷ Active Users = Cost per User
   ```

3. **Service Breakdown**
   - Which API costs the most?
   - Can you optimize usage?

### Pricing Strategy Recommendations

#### Low Usage (< $100/month)
- Freemium model
- Free tier: 5-10 documents/month
- Paid tier: $9.99/month for unlimited

#### Medium Usage ($100-$500/month)
- Tiered pricing:
  - Basic: $9.99/month (50 documents)
  - Pro: $29.99/month (200 documents)
  - Enterprise: $99/month (unlimited)

#### High Usage (> $500/month)
- Usage-based pricing
- Base fee + per-document charges
- Volume discounts
- Enterprise contracts

### Cost Optimization Tips

1. **Batch Processing**: Process multiple pages at once to reduce API calls
2. **Caching**: Cache metadata extraction results
3. **Document Limits**: Set per-user upload limits
4. **Storage Optimization**: Compress PDFs before storing
5. **Rate Limiting**: Prevent abuse with rate limits

## Alerts & Monitoring

### Setting Up Cost Alerts

1. Go to Admin Dashboard
2. View current thresholds
3. Use API to update thresholds

### Alert Types

- **Daily Alert**: Notify if daily cost exceeds threshold
- **Weekly Alert**: Notify if weekly cost exceeds threshold  
- **Monthly Alert**: Notify if monthly cost exceeds threshold

### Future Enhancements

- Email notifications when thresholds are exceeded
- Slack/Discord webhooks for alerts
- Automated budget cutoffs
- Per-user cost tracking and limits

## Troubleshooting

### Usage Not Being Tracked

1. Verify migrations have been run
2. Check Supabase RLS policies are correct
3. Ensure service role key has permissions
4. Check application logs for errors

### Incorrect Cost Calculations

1. Verify pricing constants in `usage-tracker.ts`
2. Check if vendor pricing has changed
3. Review API usage logs for anomalies

### Dashboard Not Loading

1. Verify user has admin role
2. Check browser console for errors
3. Verify API endpoint is accessible
4. Check Supabase connection

## Security Considerations

- Only admin users can access usage data
- RLS policies enforce admin-only access
- Usage tracking failures don't break app functionality
- PII is not stored in usage logs (except user IDs)

## Performance Considerations

- Daily summaries are pre-aggregated for fast queries
- Indexes on commonly queried fields
- Time-based partitioning for large datasets (future)
- Automatic cleanup of old logs (future)

## Future Roadmap

- [ ] Charts and graphs for visual analytics
- [ ] Export usage data to CSV/PDF
- [ ] Real-time cost updates via websockets
- [ ] Per-user cost caps and limits
- [ ] Automated billing integration
- [ ] Predictive cost modeling
- [ ] Storage usage optimization suggestions
- [ ] API rate limiting dashboard
- [ ] Webhook notifications for alerts

## Support

For questions or issues:
1. Check application logs
2. Review Supabase dashboard
3. Verify database migrations
4. Check API endpoint responses

---

**Last Updated:** October 26, 2025  
**Version:** 1.0.0

