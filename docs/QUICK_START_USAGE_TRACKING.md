# Quick Start: Admin Usage Tracking

## 🚀 Setup (5 minutes)

### Step 1: Run Database Migrations

Go to your Supabase SQL Editor and run these two files in order:

1. **`migrations/010_add_usage_tracking.sql`**
   - Creates all usage tracking tables
   - Sets up automatic triggers
   - Configures RLS policies
   - Adds default cost alert thresholds

2. **`migrations/011_add_top_users_function.sql`**
   - Creates function to get top users by activity

### Step 2: Make Your User an Admin

In Supabase SQL Editor, run:

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Step 3: Access the Dashboard

Navigate to: `http://localhost:3000/admin`

That's it! ✅

## 📊 What You'll See

### Overview Cards
- **Total Users**: How many users are registered
- **Total Documents**: Number of documents in the library
- **Recent Uploads**: Uploads in the last 7 days
- **Monthly Cost**: Current month's API costs

### Cost Breakdown
- Daily, weekly, and monthly spending
- Comparison to your alert thresholds
- Per-service cost analysis

### Service Stats
Each API service shows:
- Total cost
- Number of requests
- Units used (pages, tokens, bytes)
- Average cost per request

### Top Active Users
See which users are most engaged with the platform

### Recent Errors
Monitor failed API calls to catch issues early

### Pricing Insights
Automated recommendations for pricing strategy based on your actual usage

## 💰 Default Pricing (You can customize these)

```typescript
Azure OCR:        $0.01 per page
OpenAI GPT-4o:    $0.0025 per 1K input tokens
                  $0.01 per 1K output tokens
R2 Storage:       $0.015 per GB/month
R2 Bandwidth:     Free (up to limits)
```

## 🔔 Cost Alerts

Default thresholds:
- **Daily**: $50
- **Weekly**: $300
- **Monthly**: $1,000

To update thresholds, use the admin API:

```bash
curl -X POST http://localhost:3000/api/admin/usage \
  -H "Content-Type: application/json" \
  -d '{
    "alertType": "monthly",
    "thresholdAmount": 1500
  }'
```

## 📈 What Gets Tracked Automatically

✅ **Every document upload**
- OCR pages processed
- AI tokens used for metadata extraction
- Storage costs
- User activity

✅ **All API calls**
- Success and failure rates
- Response times
- Error messages

✅ **User activity**
- Uploads, views, searches
- Bookmarks and annotations
- Per-user daily tracking

## 🎯 Making Pricing Decisions

### Key Metrics Dashboard Shows

1. **Cost per Upload**
   ```
   Monthly Cost ÷ Total Uploads = Your Cost per Document
   ```

2. **Most Expensive Service**
   - Usually Azure OCR for document processing
   - Or OpenAI for AI features

3. **Active Users**
   - How many users are actually using the app
   - Upload frequency per user

### Pricing Strategy Examples

**Low Usage (< $100/month)**
```
Free Tier:  5 documents/month
Basic:      $9.99/month - 50 documents
Pro:        $29.99/month - unlimited
```

**Medium Usage ($100-$500/month)**
```
Starter:    $19.99/month - 100 documents
Business:   $49.99/month - 500 documents
Enterprise: Custom pricing
```

**High Usage (> $500/month)**
```
Base Fee:   $99/month
Per Doc:    $0.50/document
Volume:     Bulk discounts at 1000+ docs
```

## 🔍 Monitoring Best Practices

1. **Check Daily** (quick glance)
   - Current day's costs
   - Any error spikes
   - Active users today

2. **Review Weekly**
   - Week-over-week cost trends
   - Top users engagement
   - Service performance

3. **Analyze Monthly**
   - Total monthly costs vs. revenue
   - Pricing strategy adjustments
   - Growth projections

## 🛠️ Customizing Pricing

Edit `app/src/lib/usage-tracker.ts`:

```typescript
export const PRICING = {
  AZURE_OCR_PER_PAGE: 0.01,  // Change to your rate
  OPENAI_INPUT_PER_1K: 0.0025,
  OPENAI_OUTPUT_PER_1K: 0.01,
  R2_STORAGE_PER_GB_MONTH: 0.015,
  // ... update as needed
};
```

Restart your app for changes to take effect.

## 🎨 Time Range Selection

Toggle between views:
- **Last 7 days**: Recent activity and trends
- **Last 30 days**: Default monthly view
- **Last 90 days**: Quarterly analysis

## 🚨 Troubleshooting

### Dashboard is blank
- Make sure you ran both migration files
- Verify your user has `role = 'admin'`
- Check browser console for errors

### Costs are $0.00
- Usage tracking starts from now (historical data won't show)
- Upload a test document to generate data
- Wait a few minutes and refresh

### Can't access /admin
- Verify you're logged in
- Check that your user has admin role
- Clear cookies and re-login

## 📚 Full Documentation

For complete details, see: `docs/ADMIN_USAGE_TRACKING.md`

## 🎉 Next Steps

1. ✅ Upload a test document to generate usage data
2. ✅ Check the dashboard after 24 hours to see patterns
3. ✅ Set cost alert thresholds for your budget
4. ✅ Review weekly to optimize costs
5. ✅ Use insights to determine pricing strategy

---

**Need Help?** Check the logs in:
- Browser console (F12)
- Supabase dashboard
- Application server logs

**Built on:** October 26, 2025

