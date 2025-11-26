# Infrastructure Monitoring Setup Guide

This guide covers setting up infrastructure monitoring for AWS CloudWatch alarms, Supabase usage alerts, budget alerts, and cost threshold notifications.

**Status:** Setup Guide  
**Last Updated:** November 10, 2025  
**Reference:** `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Section 5.3 Infrastructure Monitoring

---

## Table of Contents

1. [AWS CloudWatch Alarms](#aws-cloudwatch-alarms)
2. [Supabase Usage Alerts](#supabase-usage-alerts)
3. [AWS Budget Alerts](#aws-budget-alerts)
4. [Cost Threshold Notifications](#cost-threshold-notifications)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## AWS CloudWatch Alarms

CloudWatch alarms monitor AWS service usage and send notifications when thresholds are exceeded.

### Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured (optional, for programmatic setup)
- Email address for notifications

### Services to Monitor

Based on your infrastructure, monitor these AWS services:

1. **Lambda Functions** (if using AWS Lambda)
   - `textract-trigger` function
   - `textract-completion` function

2. **S3 Storage** (if using AWS S3 instead of R2)
   - Storage size
   - Request counts

3. **Textract** (if using AWS Textract for OCR)
   - Pages processed
   - API call counts

### Setup Method 1: AWS Console (Recommended for Quick Setup)

#### Step 1: Create SNS Topic for Alerts

1. Go to [AWS SNS Console](https://console.aws.amazon.com/sns/)
2. Click **"Create topic"**
3. Configure:
   - **Type:** Standard
   - **Name:** `convergence-alerts`
   - **Display name:** Convergence Alerts
4. Click **"Create topic"**
5. Click **"Create subscription"**
6. Configure:
   - **Protocol:** Email
   - **Endpoint:** Your email address (e.g., `admin@convergencelibrary.com`)
7. Click **"Create subscription"**
8. **Check your email** and confirm the subscription

#### Step 2: Create CloudWatch Alarms

##### Lambda Invocations Alarm

Monitor Lambda function invocations to avoid exceeding free tier:

1. Go to [AWS CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
2. Navigate to **Alarms** → **All alarms**
3. Click **"Create alarm"**
4. Click **"Select metric"**
5. Choose **AWS/Lambda** namespace
6. Select **Invocations** metric
7. Select your Lambda function (e.g., `textract-trigger`)
8. Configure:
   - **Statistic:** Sum
   - **Period:** 30 days (2592000 seconds)
   - **Threshold type:** Static
   - **Threshold:** 900000 (90% of 1M free tier)
   - **Comparison:** Greater than threshold
9. Click **"Next"**
10. Configure notification:
    - **Alarm state trigger:** In alarm
    - **SNS topic:** Select `convergence-alerts` (created in Step 1)
11. Click **"Next"**
12. Name the alarm: `lambda-invocations-warning`
13. Add description: "Lambda invocations approaching free tier limit"
14. Click **"Next"** → **"Create alarm"**

##### Lambda Errors Alarm

Monitor Lambda function errors:

1. Create a new alarm following the same process
2. Select **Errors** metric instead of Invocations
3. Configure:
   - **Statistic:** Sum
   - **Period:** 5 minutes
   - **Threshold:** 10 errors
   - **Comparison:** Greater than threshold
4. Name: `lambda-errors-alert`
5. Description: "Lambda function errors detected"

##### S3 Storage Alarm (If Using S3)

1. Create a new alarm
2. Select **AWS/S3** namespace
3. Select **BucketSizeBytes** metric
4. Configure:
   - **Statistic:** Average
   - **Period:** 1 day (86400 seconds)
   - **Threshold:** 4500000000 (4.5 GB - 90% of 5GB free tier)
   - **Comparison:** Greater than threshold
5. Add dimension:
   - **BucketName:** Your bucket name
   - **StorageType:** StandardStorage
6. Name: `s3-storage-warning`
7. Description: "S3 storage approaching free tier limit"

##### Textract Pages Alarm (If Using Textract)

1. Create a new alarm
2. Select **AWS/Textract** namespace (or custom namespace if using custom metrics)
3. Select **PageCount** or similar metric
4. Configure:
   - **Statistic:** Sum
   - **Period:** 30 days
   - **Threshold:** 900 (90% of 1000 pages free tier)
   - **Comparison:** Greater than threshold
5. Name: `textract-pages-warning`
6. Description: "Textract pages approaching free tier limit"

### Setup Method 2: AWS CLI (For Automated Setup)

If you prefer command-line setup, use these commands:

```bash
# Create SNS topic
aws sns create-topic --name convergence-alerts

# Subscribe email to topic
aws sns subscribe \
  --topic-arn arn:aws:sns:REGION:ACCOUNT_ID:convergence-alerts \
  --protocol email \
  --notification-endpoint admin@convergencelibrary.com

# Create Lambda invocations alarm
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-invocations-warning \
  --alarm-description "Lambda invocations approaching free tier limit" \
  --metric-name Invocations \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 2592000 \
  --evaluation-periods 1 \
  --threshold 900000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=textract-trigger \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT_ID:convergence-alerts

# Create Lambda errors alarm
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-errors-alert \
  --alarm-description "Lambda function errors detected" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=textract-trigger \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT_ID:convergence-alerts
```

**Replace:**
- `REGION` with your AWS region (e.g., `us-east-1`)
- `ACCOUNT_ID` with your AWS account ID
- `textract-trigger` with your actual Lambda function name

### Recommended Alarms

| Alarm Name | Metric | Threshold | Purpose |
|------------|--------|-----------|---------|
| `lambda-invocations-warning` | Lambda Invocations | 900K/month | Warn before hitting 1M free tier |
| `lambda-errors-alert` | Lambda Errors | 10 errors/5min | Alert on error spikes |
| `lambda-duration-warning` | Lambda Duration | 80% of timeout | Warn on slow functions |
| `s3-storage-warning` | S3 Bucket Size | 4.5 GB | Warn before hitting 5GB free tier |
| `textract-pages-warning` | Textract Pages | 900 pages/month | Warn before hitting 1K free tier |

---

## Supabase Usage Alerts

Supabase provides built-in usage monitoring and alerts for database, storage, and API usage.

### Prerequisites

- Supabase project (Pro plan recommended for production)
- Admin access to Supabase dashboard

### Setup Steps

#### Step 1: Enable Usage Monitoring

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Settings** → **Usage**
4. Review current usage metrics:
   - Database size
   - API requests
   - Storage usage
   - Bandwidth

#### Step 2: Configure Usage Alerts

Supabase sends automatic email alerts when approaching limits. Configure in **Settings** → **Billing**:

1. **Database Size Alert**
   - **Threshold:** 80% of plan limit
   - **Action:** Email notification sent automatically
   - **Recommended:** Monitor in dashboard weekly

2. **API Request Alert**
   - **Threshold:** 80% of monthly quota
   - **Action:** Email notification sent automatically
   - **Recommended:** Set up custom monitoring (see below)

3. **Storage Alert**
   - **Threshold:** 80% of storage limit
   - **Action:** Email notification sent automatically

#### Step 3: Set Up Custom Usage Monitoring (Optional)

Create a monitoring script to track usage programmatically:

```typescript
// scripts/monitor-supabase-usage.ts
import { createClient } from '@supabase/supabase-js';

async function monitorSupabaseUsage() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get project usage (requires API access or dashboard scraping)
  // Note: Supabase doesn't expose usage via API directly
  // Use Supabase dashboard or set up webhook alerts

  // Alternative: Monitor via database queries
  const { data: dbSize } = await supabase.rpc('get_database_size');
  const { data: apiUsage } = await supabase
    .from('api_usage')
    .select('*')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Calculate totals
  const totalApiCalls = apiUsage?.length || 0;
  const estimatedCost = apiUsage?.reduce((sum, row) => 
    sum + (parseFloat(row.estimated_cost) || 0), 0) || 0;

  // Check thresholds
  if (totalApiCalls > 1000000) { // 1M API calls
    console.warn('⚠️ Approaching API call limit');
  }

  if (estimatedCost > 100) { // $100/month
    console.warn('⚠️ Monthly cost exceeded $100');
  }
}
```

#### Step 4: Configure Email Notifications

1. Go to **Settings** → **Notifications**
2. Add email addresses for:
   - Usage alerts
   - Billing alerts
   - Project alerts
3. Verify email addresses

### Recommended Monitoring Thresholds

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|--------|
| Database Size | 80% of plan limit | 90% of plan limit | Upgrade plan or optimize |
| API Requests | 80% of monthly quota | 95% of monthly quota | Review API usage patterns |
| Storage | 80% of storage limit | 90% of storage limit | Clean up old files |
| Bandwidth | 80% of monthly limit | 95% of monthly limit | Optimize asset delivery |

---

## AWS Budget Alerts

AWS Budgets help you track and control AWS spending.

### Prerequisites

- AWS account with billing access
- Email address for notifications

### Setup Steps

#### Step 1: Enable Cost and Billing Alerts

1. Go to [AWS Billing Console](https://console.aws.amazon.com/billing/)
2. Navigate to **Budgets** → **Budgets**
3. Click **"Create budget"**

#### Step 2: Create Monthly Budget

1. **Budget Type:** Cost budget
2. **Budget Name:** `convergence-monthly-budget`
3. **Period:** Monthly
4. **Budget Amount:**
   - **Fixed:** Enter your monthly budget (e.g., `$50`)
   - Or **Planned:** Based on forecasted usage
5. Click **"Next"**

#### Step 3: Configure Budget Alerts

Set up multiple alert thresholds:

**Alert 1: 50% Threshold (Early Warning)**
- **Alert name:** `50-percent-budget-used`
- **Threshold:** 50% of budgeted amount
- **Email recipients:** Your email address
- **Alert type:** Actual

**Alert 2: 80% Threshold (Warning)**
- **Alert name:** `80-percent-budget-used`
- **Threshold:** 80% of budgeted amount
- **Email recipients:** Your email address
- **Alert type:** Actual

**Alert 3: 100% Threshold (Critical)**
- **Alert name:** `100-percent-budget-used`
- **Threshold:** 100% of budgeted amount
- **Email recipients:** Your email address
- **Alert type:** Actual

**Alert 4: Forecasted 100% (Predictive)**
- **Alert name:** `forecasted-over-budget`
- **Threshold:** 100% of budgeted amount
- **Email recipients:** Your email address
- **Alert type:** Forecasted

6. Click **"Next"** → **"Create budget"**

#### Step 4: Create Service-Specific Budgets (Optional)

Create separate budgets for specific services:

**Lambda Budget:**
- **Budget name:** `lambda-monthly-budget`
- **Budget amount:** $10/month
- **Filters:** Service = AWS Lambda

**S3 Budget:**
- **Budget name:** `s3-monthly-budget`
- **Budget amount:** $5/month
- **Filters:** Service = Amazon S3

**Textract Budget:**
- **Budget name:** `textract-monthly-budget`
- **Budget amount:** $20/month
- **Filters:** Service = Amazon Textract

### Recommended Budget Amounts

Based on your bootstrap budget ($0-50/month):

| Service | Recommended Budget | Alert Thresholds |
|---------|-------------------|------------------|
| **Total AWS** | $50/month | 50%, 80%, 100% |
| **Lambda** | $10/month | 80%, 100% |
| **S3** | $5/month | 80%, 100% |
| **Textract** | $20/month | 80%, 100% |
| **Other Services** | $15/month | 80%, 100% |

### Setup via AWS CLI (Optional)

```bash
# Create monthly cost budget
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget-config.json \
  --notifications-with-subscribers file://notifications.json
```

**budget-config.json:**
```json
{
  "BudgetName": "convergence-monthly-budget",
  "BudgetLimit": {
    "Amount": "50",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

**notifications.json:**
```json
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 50,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "admin@convergencelibrary.com"
      }
    ]
  }
]
```

---

## Cost Threshold Notifications

The application includes a built-in cost tracking system with configurable thresholds.

### Prerequisites

- Database migrations run (includes `cost_alerts` table)
- Admin access to the application

### Setup Steps

#### Step 1: Verify Database Schema

Ensure the `cost_alerts` table exists:

```sql
-- Check if table exists
SELECT * FROM cost_alerts;

-- If table doesn't exist, run migration:
-- migrations/010_add_usage_tracking.sql
```

#### Step 2: Configure Cost Thresholds via Admin Dashboard

1. Log into the application as an admin
2. Navigate to **Admin Dashboard** → **Usage Tracking**
3. Go to **Cost Alerts** section
4. Configure thresholds:

**Daily Threshold:**
- **Alert Type:** Daily
- **Threshold Amount:** $50 (or your daily budget)
- Click **"Save"**

**Weekly Threshold:**
- **Alert Type:** Weekly
- **Threshold Amount:** $300 (or your weekly budget)
- Click **"Save"**

**Monthly Threshold:**
- **Alert Type:** Monthly
- **Threshold Amount:** $1000 (or your monthly budget)
- Click **"Save"**

#### Step 3: Configure via API (Alternative)

If you prefer programmatic setup:

```typescript
// scripts/setup-cost-alerts.ts
import { createClient } from '@supabase/supabase-js';

async function setupCostAlerts() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Set daily threshold
  await supabase.from('cost_alerts').upsert({
    alert_type: 'daily',
    threshold_amount: 50.00,
    current_amount: 0,
    threshold_exceeded: false
  });

  // Set weekly threshold
  await supabase.from('cost_alerts').upsert({
    alert_type: 'weekly',
    threshold_amount: 300.00,
    current_amount: 0,
    threshold_exceeded: false
  });

  // Set monthly threshold
  await supabase.from('cost_alerts').upsert({
    alert_type: 'monthly',
    threshold_amount: 1000.00,
    current_amount: 0,
    threshold_exceeded: false
  });
}
```

#### Step 4: Set Up Automated Monitoring

Create a scheduled job to check cost thresholds:

```typescript
// scripts/check-cost-thresholds.ts
import { createClient } from '@supabase/supabase-js';
import { checkCostThresholds } from '@/lib/usage-tracker';

async function monitorCostThresholds() {
  const thresholds = await checkCostThresholds();

  // Check daily threshold
  if (thresholds.daily.exceeded) {
    await sendAlert('Daily cost threshold exceeded', {
      current: thresholds.daily.current,
      threshold: thresholds.daily.threshold
    });
  }

  // Check weekly threshold
  if (thresholds.weekly.exceeded) {
    await sendAlert('Weekly cost threshold exceeded', {
      current: thresholds.weekly.current,
      threshold: thresholds.weekly.threshold
    });
  }

  // Check monthly threshold
  if (thresholds.monthly.exceeded) {
    await sendAlert('Monthly cost threshold exceeded', {
      current: thresholds.monthly.current,
      threshold: thresholds.monthly.threshold
    });
  }
}

// Run this via cron job or scheduled task
// Example: Run daily at 9 AM UTC
```

#### Step 5: Configure Email Notifications (Future Enhancement)

Currently, cost threshold checks are available via the admin dashboard. To add email notifications:

1. Create an API endpoint: `/api/admin/cost-alerts/check`
2. Set up a cron job (Vercel Cron, GitHub Actions, etc.) to call this endpoint
3. Implement email sending when thresholds are exceeded

**Example Implementation:**

```typescript
// app/api/admin/cost-alerts/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkCostThresholds } from '@/lib/usage-tracker';
import { sendEmail } from '@/lib/email'; // Your email service

export async function GET(request: NextRequest) {
  try {
    const thresholds = await checkCostThresholds();
    const alerts = [];

    if (thresholds.daily.exceeded) {
      alerts.push({
        type: 'daily',
        current: thresholds.daily.current,
        threshold: thresholds.daily.threshold
      });
    }

    if (thresholds.weekly.exceeded) {
      alerts.push({
        type: 'weekly',
        current: thresholds.weekly.current,
        threshold: thresholds.weekly.threshold
      });
    }

    if (thresholds.monthly.exceeded) {
      alerts.push({
        type: 'monthly',
        current: thresholds.monthly.current,
        threshold: thresholds.monthly.threshold
      });
    }

    // Send email if any thresholds exceeded
    if (alerts.length > 0) {
      await sendEmail({
        to: 'admin@convergencelibrary.com',
        subject: 'Cost Threshold Alert',
        body: `Cost thresholds exceeded:\n${JSON.stringify(alerts, null, 2)}`
      });
    }

    return NextResponse.json({ alerts, thresholds });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check thresholds' }, { status: 500 });
  }
}
```

### Recommended Thresholds

Based on your bootstrap budget:

| Period | Recommended Threshold | Purpose |
|--------|----------------------|---------|
| **Daily** | $50 | Early warning for daily spikes |
| **Weekly** | $300 | Monitor weekly spending patterns |
| **Monthly** | $1000 | Overall monthly budget limit |

---

## Verification

### Verify AWS CloudWatch Alarms

1. **Check Alarm Status:**
   - Go to [CloudWatch Alarms](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:)
   - Verify all alarms are in "OK" state (green)
   - Check alarm history for any past triggers

2. **Test Alarm:**
   - Temporarily lower a threshold to trigger an alarm
   - Verify email notification is received
   - Reset threshold to original value

3. **Verify SNS Subscription:**
   - Go to [SNS Subscriptions](https://console.aws.amazon.com/sns/)
   - Verify email subscription is "Confirmed"
   - Test by publishing a message to the topic

### Verify Supabase Usage Alerts

1. **Check Usage Dashboard:**
   - Go to Supabase Dashboard → **Settings** → **Usage**
   - Verify metrics are being tracked
   - Check for any warning indicators

2. **Test Email Notifications:**
   - Supabase sends automatic emails when approaching limits
   - Verify email address is correct in **Settings** → **Notifications**

### Verify AWS Budget Alerts

1. **Check Budget Status:**
   - Go to [AWS Budgets](https://console.aws.amazon.com/billing/home#/budgets)
   - Verify budgets are created and active
   - Check current spending vs. budgeted amount

2. **Test Budget Alert:**
   - Temporarily lower budget threshold to trigger alert
   - Verify email notification is received
   - Reset threshold to original value

3. **Verify Email Subscriptions:**
   - Check email inbox for budget alert confirmations
   - Verify all alert emails are being received

### Verify Cost Threshold Notifications

1. **Check Admin Dashboard:**
   - Log into application as admin
   - Navigate to **Admin Dashboard** → **Usage Tracking**
   - Verify cost thresholds are configured
   - Check current costs vs. thresholds

2. **Test Threshold Check:**
   ```typescript
   // In browser console or API test
   const response = await fetch('/api/admin/usage');
   const data = await response.json();
   console.log('Cost thresholds:', data.costThresholds);
   ```

3. **Verify Database:**
   ```sql
   -- Check cost_alerts table
   SELECT * FROM cost_alerts;
   
   -- Should show daily, weekly, monthly thresholds
   ```

---

## Troubleshooting

### CloudWatch Alarms Not Triggering

**Issue:** Alarms are not sending notifications

**Solutions:**
1. Verify SNS topic subscription is confirmed (check email)
2. Check alarm is in "OK" state (not "Insufficient data")
3. Verify alarm threshold is appropriate for your usage
4. Check CloudWatch logs for alarm evaluation errors
5. Verify IAM permissions for CloudWatch and SNS

### Supabase Usage Alerts Not Working

**Issue:** Not receiving Supabase usage alerts

**Solutions:**
1. Verify email address in **Settings** → **Notifications**
2. Check spam folder for alert emails
3. Ensure you're on a plan that includes usage alerts (Pro plan)
4. Check Supabase status page for service issues
5. Review usage dashboard manually if alerts aren't working

### AWS Budget Alerts Not Sending

**Issue:** Budget alerts not being received

**Solutions:**
1. Verify email address in budget configuration
2. Check spam folder
3. Verify budget is active (not paused)
4. Check budget evaluation period (may take 24-48 hours)
5. Verify AWS account has billing alerts enabled

### Cost Threshold Notifications Not Working

**Issue:** Cost thresholds not being checked or alerted

**Solutions:**
1. Verify `cost_alerts` table exists in database
2. Check that thresholds are configured in admin dashboard
3. Verify `api_usage` table has data (costs are being tracked)
4. Check application logs for errors in cost calculation
5. Verify admin user has permissions to view usage data

### False Positives

**Issue:** Receiving too many alerts

**Solutions:**
1. Adjust alarm thresholds to be less sensitive
2. Increase evaluation periods (e.g., require 2 consecutive periods)
3. Use forecasted alerts instead of actual alerts for budgets
4. Set up alert filtering or aggregation

---

## Best Practices

### Monitoring Strategy

1. **Layered Monitoring:**
   - CloudWatch for AWS infrastructure
   - Supabase dashboard for database/storage
   - Application-level cost tracking for API usage
   - Budget alerts for overall spending

2. **Alert Fatigue Prevention:**
   - Set appropriate thresholds (not too sensitive)
   - Use multiple evaluation periods
   - Aggregate alerts where possible
   - Set up alert escalation paths

3. **Regular Review:**
   - Review alert history weekly
   - Adjust thresholds based on actual usage
   - Remove unused alarms
   - Update budget amounts as usage patterns change

### Cost Optimization

1. **Monitor Free Tier Usage:**
   - Set alarms at 80-90% of free tier limits
   - Plan for upgrade before hitting limits
   - Optimize usage to stay within free tier when possible

2. **Track Cost Trends:**
   - Review cost reports weekly
   - Identify cost drivers
   - Optimize high-cost services
   - Consider alternatives for expensive services

3. **Budget Planning:**
   - Set conservative budgets initially
   - Increase budgets as revenue grows
   - Create service-specific budgets for better visibility
   - Use forecasted budgets for planning

---

## Next Steps

After completing this setup:

1. ✅ Verify all alarms are active and working
2. ✅ Test alert notifications
3. ✅ Document alert response procedures
4. ✅ Set up regular cost review schedule
5. ✅ Configure alert escalation (if needed)
6. ✅ Update production deployment checklist

---

## References

- [AWS CloudWatch Alarms Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)
- [AWS Budgets Documentation](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [Supabase Usage & Billing](https://supabase.com/docs/guides/platform/usage-based-billing)
- [Cost Tracking System](../ADMIN_USAGE_TRACKING.md)
- [Production Deployment Checklist](../PRODUCTION_DEPLOYMENT_CHECKLIST.md)

---

**Version:** 1.0  
**Last Updated:** November 10, 2025  
**Maintained By:** Development Team

