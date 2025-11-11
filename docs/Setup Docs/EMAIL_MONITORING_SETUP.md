# 📊 Email Monitoring Setup Guide - SendGrid

**Last Updated:** November 10, 2025  
**Status:** Setup Guide  
**Provider:** SendGrid

---

## Overview

This guide covers setting up comprehensive email monitoring for Convergence Library using SendGrid webhooks, alerts, and dashboard metrics. Proper monitoring ensures email deliverability, identifies issues early, and maintains sender reputation.

---

## Table of Contents

1. [SendGrid Dashboard Monitoring](#sendgrid-dashboard-monitoring)
2. [Webhook Configuration](#webhook-configuration)
3. [Alert Thresholds](#alert-thresholds)
4. [Bounce Rate Monitoring](#bounce-rate-monitoring)
5. [Delivery Rate Tracking](#delivery-rate-tracking)
6. [Spam Complaint Monitoring](#spam-complaint-monitoring)
7. [Automated Alerts](#automated-alerts)
8. [Regular Review Process](#regular-review-process)

---

## SendGrid Dashboard Monitoring

### Key Metrics to Monitor

Access these in **SendGrid Dashboard** → **Activity**:

#### 1. Email Activity Overview

**Location:** Dashboard → Activity → Overview

**Metrics:**
- **Delivered:** Number of emails successfully delivered
- **Opens:** Number of emails opened (if tracking enabled)
- **Clicks:** Number of links clicked (if tracking enabled)
- **Bounces:** Number of emails that bounced
- **Spam Reports:** Number of spam complaints
- **Unsubscribes:** Number of unsubscribes (if applicable)

**Target Metrics:**
- Delivery Rate: >95%
- Bounce Rate: <5%
- Spam Complaint Rate: <0.1%
- Open Rate: >20% (for transactional emails, this is less relevant)

#### 2. Bounce Management

**Location:** Dashboard → Suppressions → Bounces

**Actions:**
- Review bounce reasons
- Remove invalid bounces (false positives)
- Monitor bounce categories:
  - **Hard Bounces:** Permanent failures (invalid email, domain doesn't exist)
  - **Soft Bounces:** Temporary failures (mailbox full, server down)

**Best Practices:**
- Remove hard bounces from your list immediately
- Monitor soft bounces - if they persist, treat as hard bounces
- Review bounce reasons to identify patterns

#### 3. Spam Reports

**Location:** Dashboard → Suppressions → Spam Reports

**Actions:**
- Review spam complaint reasons
- Remove false positives
- Investigate high complaint rates
- Consider removing complainers from list (if applicable)

**Critical Threshold:**
- **>0.1% spam rate** = Immediate action required
- **>0.5% spam rate** = Account suspension risk

---

## Webhook Configuration

### What Are Webhooks?

Webhooks allow SendGrid to send real-time event notifications to your application when email events occur (delivered, bounced, opened, clicked, etc.).

### Step 1: Create Webhook Endpoint

Create an API route in your Next.js application:

```typescript
// app/api/sendgrid/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const events = await request.json();
    
    // Verify webhook signature (optional but recommended)
    // const signature = request.headers.get('x-twilio-email-event-webhook-signature');
    // const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp');
    // Verify signature here
    
    const supabase = createClient();
    
    // Process each event
    for (const event of events) {
      const { email, event: eventType, timestamp, reason, status } = event;
      
      // Log event to database
      await supabase.from('email_events').insert({
        email,
        event_type: eventType, // 'delivered', 'bounce', 'spamreport', etc.
        timestamp: new Date(timestamp * 1000).toISOString(),
        reason,
        status,
        raw_data: event,
      });
      
      // Handle critical events
      if (eventType === 'bounce' || eventType === 'spamreport') {
        // Send alert or update user status
        await handleCriticalEvent(event);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCriticalEvent(event: any) {
  // Implement alerting logic here
  // e.g., send notification to admin, update user status, etc.
}
```

### Step 2: Configure Webhook in SendGrid

1. Log in to SendGrid Dashboard
2. Navigate to **Settings** → **Mail Settings** → **Event Webhook**
3. Click **Create New Webhook**
4. Configure:
   - **HTTP POST URL:** `https://convergencelibrary.com/api/sendgrid/webhook`
   - **Events to Send:**
     - ✅ **Delivered**
     - ✅ **Bounce**
     - ✅ **Dropped**
     - ✅ **Spam Report**
     - ✅ **Unsubscribe** (if applicable)
     - ✅ **Open** (optional, for analytics)
     - ✅ **Click** (optional, for analytics)
   - **Authentication:** Enable signed webhook (recommended)
5. Click **Save**

### Step 3: Create Database Table for Events

Create a migration to store email events:

```sql
-- migrations/XXX_create_email_events.sql
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'delivered', 'bounce', 'spamreport', etc.
  timestamp TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_events_email ON email_events(email);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_timestamp ON email_events(timestamp);

-- Add RLS policies if needed
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage email events"
  ON email_events FOR ALL
  USING (auth.role() = 'service_role');
```

### Step 4: Test Webhook

1. Send a test email through your application
2. Check SendGrid Dashboard → **Activity** → **Webhook Events** for delivery status
3. Verify events are being logged in your database
4. Check application logs for any errors

---

## Alert Thresholds

### Critical Alerts (Immediate Action Required)

Configure alerts in SendGrid Dashboard → **Settings** → **Alerts**:

#### 1. High Bounce Rate Alert

**Threshold:** >5% bounce rate in 24 hours

**Configuration:**
- **Alert Name:** High Bounce Rate
- **Metric:** Bounce Rate
- **Threshold:** 5%
- **Time Period:** 24 hours
- **Notification:** Email to admin@convergencelibrary.com

**Action Plan:**
1. Review bounce reasons in SendGrid dashboard
2. Check for invalid email addresses in database
3. Review email validation on signup
4. Remove hard bounces from user list
5. Investigate soft bounce patterns

#### 2. Spam Complaint Alert

**Threshold:** >0.1% spam complaint rate in 24 hours

**Configuration:**
- **Alert Name:** Spam Complaint Alert
- **Metric:** Spam Complaint Rate
- **Threshold:** 0.1%
- **Time Period:** 24 hours
- **Notification:** Email to admin@convergencelibrary.com

**Action Plan:**
1. Review spam complaint reasons
2. Check email content and subject lines
3. Verify sender reputation
4. Review unsubscribe process (if applicable)
5. Consider email content improvements

#### 3. Delivery Failure Alert

**Threshold:** >10% delivery failure rate in 24 hours

**Configuration:**
- **Alert Name:** Delivery Failure Alert
- **Metric:** Delivery Failure Rate
- **Threshold:** 10%
- **Time Period:** 24 hours
- **Notification:** Email to admin@convergencelibrary.com

**Action Plan:**
1. Check SendGrid account status
2. Verify SMTP configuration in Supabase
3. Review DNS records (SPF, DKIM, DMARC)
4. Check domain reputation
5. Contact SendGrid support if needed

### Warning Alerts (Monitor Closely)

#### 4. Elevated Bounce Rate

**Threshold:** >3% bounce rate in 24 hours

**Action:** Review bounce reasons, but not critical yet.

#### 5. Low Delivery Rate

**Threshold:** <90% delivery rate in 24 hours

**Action:** Monitor closely, investigate if trend continues.

---

## Bounce Rate Monitoring

### Daily Monitoring

**Check Daily:**
1. SendGrid Dashboard → **Activity** → **Overview**
2. Review bounce count and rate
3. Check bounce reasons
4. Remove hard bounces from database

### Weekly Review

**Review Weekly:**
1. Calculate weekly bounce rate
2. Identify bounce patterns:
   - Specific email providers?
   - Specific user segments?
   - Specific email types?
3. Update email validation if needed
4. Clean up invalid email addresses

### Bounce Rate Calculation

```
Bounce Rate = (Total Bounces / Total Sent) × 100
```

**Target:** <5% bounce rate

**Example:**
- 1000 emails sent
- 30 bounces
- Bounce Rate = (30 / 1000) × 100 = 3% ✅ (Good)

---

## Delivery Rate Tracking

### Delivery Rate Calculation

```
Delivery Rate = (Delivered / Total Sent) × 100
```

**Target:** >95% delivery rate

### Monitoring Dashboard

Create a simple monitoring dashboard or use SendGrid's built-in analytics:

**Key Metrics:**
- **Total Sent:** Number of emails sent
- **Delivered:** Number successfully delivered
- **Delivery Rate:** Percentage delivered
- **Bounced:** Number bounced
- **Dropped:** Number dropped (filtered by SendGrid)

### Tracking by Email Type

Monitor delivery rates by email type:
- Password reset emails
- Email verification emails
- Welcome emails
- Other transactional emails

**Action:** If one type has lower delivery rate, investigate that specific template or flow.

---

## Spam Complaint Monitoring

### Spam Complaint Rate

```
Spam Complaint Rate = (Spam Reports / Total Delivered) × 100
```

**Target:** <0.1% spam complaint rate

**Critical:** >0.5% = Account suspension risk

### Monitoring Process

1. **Daily Check:** Review spam reports in SendGrid dashboard
2. **Investigation:** Review email content and subject lines
3. **Removal:** Remove complainers from list (if applicable)
4. **Prevention:** Review email practices to reduce complaints

### Common Causes of Spam Complaints

- Unclear sender identity
- Misleading subject lines
- Too frequent emails (if applicable)
- Poor email content
- No clear unsubscribe option (if applicable)

---

## Automated Alerts

### SendGrid Built-in Alerts

Configure in **Settings** → **Alerts**:

1. **High Bounce Rate** (>5%)
2. **Spam Complaints** (>0.1%)
3. **Delivery Failures** (>10%)
4. **Account Issues** (suspension, limits, etc.)

### Custom Alerting (Optional)

Create a monitoring service that:
1. Queries email_events table daily
2. Calculates metrics
3. Sends alerts if thresholds exceeded
4. Creates dashboard reports

**Example Implementation:**

```typescript
// scripts/monitor-email-metrics.ts
import { createClient } from '@supabase/supabase-js';

async function checkEmailMetrics() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Get last 24 hours of events
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data: events } = await supabase
    .from('email_events')
    .select('*')
    .gte('timestamp', yesterday.toISOString());
  
  // Calculate metrics
  const total = events.length;
  const delivered = events.filter(e => e.event_type === 'delivered').length;
  const bounced = events.filter(e => e.event_type === 'bounce').length;
  const spamReports = events.filter(e => e.event_type === 'spamreport').length;
  
  const deliveryRate = (delivered / total) * 100;
  const bounceRate = (bounced / total) * 100;
  const spamRate = (spamReports / delivered) * 100;
  
  // Check thresholds
  if (bounceRate > 5) {
    // Send alert
    await sendAlert('High bounce rate detected', { bounceRate, total, bounced });
  }
  
  if (spamRate > 0.1) {
    // Send alert
    await sendAlert('Spam complaints detected', { spamRate, spamReports });
  }
  
  if (deliveryRate < 90) {
    // Send alert
    await sendAlert('Low delivery rate', { deliveryRate, delivered, total });
  }
}
```

---

## Automated Agent Workflows (Future Implementation)

### Email Monitoring Agent

**Status:** Planned for Phase 6 (n8n Agent Workflows)  
**Reference:** See `docs/planning/MASTER_DEVELOPMENT_PLAN.md` - Email Monitoring Agent (Agent #16)

The Email Monitoring Agent will automate bounce rate review and troubleshooting, reducing manual monitoring overhead.

#### Agent Responsibilities

**1. Automated Bounce Rate Review**
- Daily analysis of `email_events` table for bounce patterns
- Categorize bounces (hard vs soft, by reason code)
- Identify bounce clusters (specific providers, email types, user segments)
- Generate bounce rate reports with trend analysis

**2. Automated Troubleshooting Workflows**

**High Bounce Rate (>5%) Workflow:**
1. Query `email_events` for bounce reasons
2. Check for invalid email patterns in database
3. Review email validation logic
4. Remove hard bounces from user list automatically
5. Generate remediation report for admin review

**Spam Complaint Rate (>0.1%) Workflow:**
1. Analyze complaint patterns
2. Review email content and subject lines
3. Check sender reputation metrics
4. Flag emails for content review
5. Generate recommendations report

**Delivery Failure Rate (>10%) Workflow:**
1. Verify SMTP configuration status
2. Check DNS records (SPF, DKIM, DMARC) via API
3. Monitor domain reputation scores
4. Alert Engineering Agent if infrastructure issues detected
5. Generate infrastructure health report

**3. Proactive Email List Hygiene**
- Daily cleanup of hard bounces from user database
- Weekly review of soft bounces (convert to hard after 3 attempts)
- Monthly email validation audit
- Quarterly comprehensive list cleanup

**4. Automated Reporting**
- Daily metrics summary (delivery rate, bounce rate, spam rate)
- Weekly trend analysis with recommendations
- Monthly comprehensive email health report
- Alert notifications when thresholds exceeded

#### Workflow Triggers

**Scheduled:**
- Daily at 9 AM UTC: Bounce review and cleanup
- Weekly on Mondays: Trend analysis and recommendations
- Monthly on 1st: Comprehensive email health report

**Event-Driven:**
- SendGrid webhook events (bounce, spamreport, dropped)
- Threshold-based alerts (>5% bounce, >0.1% spam, >10% delivery failure)

**Integration Points:**
- SendGrid API: Fetch bounce details, suppression lists, domain reputation
- Supabase Database: Query `email_events`, update user records, log actions
- Engineering Agent: Escalate infrastructure issues
- Admin Dashboard: Post reports and alerts

#### Human-in-the-Loop Checkpoints

The agent will require human approval for:
- Removing >100 users from database in single operation
- Changing email validation rules
- Escalating to Engineering Agent
- When bounce rate >10% (critical threshold)

#### Implementation Plan

**Phase 1: Basic Monitoring (Current)**
- ✅ Manual monitoring setup
- ✅ Alert configuration
- ✅ Webhook setup
- ✅ Database schema for email_events

**Phase 2: Automated Analysis (Future)**
- [ ] n8n workflow for daily bounce analysis
- [ ] Automated bounce categorization
- [ ] Pattern detection algorithms
- [ ] Basic reporting automation

**Phase 3: Automated Remediation (Future)**
- [ ] Automated hard bounce removal
- [ ] Email validation improvements
- [ ] DNS health checks
- [ ] Infrastructure alerting

**Phase 4: Full Agent Implementation (Future)**
- [ ] Complete n8n workflow
- [ ] Integration with all systems
- [ ] Advanced pattern recognition
- [ ] Predictive analytics

#### Success Metrics

- Bounce rate maintained <5%
- 95%+ delivery rate
- <0.1% spam complaint rate
- Automated resolution of 80%+ bounce issues
- Zero manual intervention for routine bounce cleanup
- 50% reduction in time spent on email monitoring

---

## Regular Review Process

### Daily (5 minutes)

- [ ] Check SendGrid dashboard for critical alerts
- [ ] Review bounce count and rate
- [ ] Check for spam complaints
- [ ] Verify webhook is processing events

### Weekly (15 minutes)

- [ ] Calculate weekly metrics:
  - Delivery rate
  - Bounce rate
  - Spam complaint rate
- [ ] Review bounce reasons and patterns
- [ ] Clean up invalid email addresses
- [ ] Review email content and subject lines

### Monthly (30 minutes)

- [ ] Comprehensive metrics review
- [ ] Compare month-over-month trends
- [ ] Review and update alert thresholds if needed
- [ ] Review email templates for improvements
- [ ] Check domain reputation
- [ ] Review DNS records (SPF, DKIM, DMARC)

### Quarterly (1 hour)

- [ ] Full email infrastructure audit
- [ ] Review SendGrid account limits and usage
- [ ] Update documentation
- [ ] Review and optimize email templates
- [ ] Check for SendGrid feature updates

---

## Troubleshooting

### High Bounce Rate

**Symptoms:**
- Bounce rate >5%
- Many hard bounces

**Solutions:**
1. Review email validation on signup
2. Remove invalid emails from database
3. Check for typos in email addresses
4. Review bounce reasons in SendGrid
5. Improve email validation logic

### Spam Complaints

**Symptoms:**
- Spam complaint rate >0.1%
- Users marking emails as spam

**Solutions:**
1. Review email content and subject lines
2. Ensure clear sender identity
3. Verify unsubscribe process (if applicable)
4. Review email frequency
5. Check domain reputation

### Low Delivery Rate

**Symptoms:**
- Delivery rate <90%
- Many dropped emails

**Solutions:**
1. Check SendGrid account status
2. Verify SMTP configuration
3. Review DNS records (SPF, DKIM, DMARC)
4. Check domain reputation
5. Contact SendGrid support

### Webhook Not Receiving Events

**Symptoms:**
- No events in database
- Webhook shows errors in SendGrid

**Solutions:**
1. Verify webhook URL is accessible
2. Check webhook authentication
3. Review application logs
4. Test webhook endpoint manually
5. Verify SendGrid webhook configuration

---

## Best Practices

### Email List Hygiene

- ✅ Remove hard bounces immediately
- ✅ Remove spam complainers
- ✅ Validate emails on signup
- ✅ Regular list cleanup (quarterly)

### Monitoring

- ✅ Set up all critical alerts
- ✅ Review metrics daily
- ✅ Investigate anomalies quickly
- ✅ Document issues and resolutions

### Deliverability

- ✅ Maintain good sender reputation
- ✅ Follow email best practices
- ✅ Monitor domain reputation
- ✅ Keep DNS records updated

---

## Reference Documentation

- **SendGrid Webhooks:** https://docs.sendgrid.com/for-developers/tracking-events/event
- **SendGrid Alerts:** https://docs.sendgrid.com/ui/account-and-settings/alerts
- **SendGrid Dashboard:** https://app.sendgrid.com/
- **Email Setup:** `docs/Setup Docs/SENDGRID_SETUP.md`
- **Email Templates:** `docs/Setup Docs/EMAIL_TEMPLATES_COMPLETE.md`

---

## Quick Reference Checklist

### Initial Setup
- [ ] Configure SendGrid webhooks
- [ ] Create email_events database table
- [ ] Set up webhook endpoint in application
- [ ] Test webhook with test email
- [ ] Configure critical alerts (>5% bounce, >0.1% spam)

### Daily Monitoring
- [ ] Check SendGrid dashboard
- [ ] Review bounce rate
- [ ] Check for spam complaints
- [ ] Verify webhook processing

### Weekly Review
- [ ] Calculate weekly metrics
- [ ] Review bounce patterns
- [ ] Clean up invalid emails
- [ ] Review email content

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete

