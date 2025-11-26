# Monitoring Setup Guide

This guide covers setting up error tracking (Sentry) and uptime monitoring for the Digital Grimoire application.

## Table of Contents

1. [Sentry Error Tracking](#sentry-error-tracking)
2. [Uptime Monitoring](#uptime-monitoring)
3. [Health Check Endpoint](#health-check-endpoint)
4. [Verification](#verification)

---

## Sentry Error Tracking

Sentry provides comprehensive error tracking, performance monitoring, and session replay for your application.

### Prerequisites

- Sentry account (free tier available at [sentry.io](https://sentry.io/))
- Next.js application deployed or running locally

### Setup Steps

#### 1. Create Sentry Project

1. Go to [Sentry.io](https://sentry.io/) and sign up or log in
2. Click **"Create Project"**
3. Select **"Next.js"** as your platform
4. Give your project a name (e.g., "Convergence Library")
5. Copy the **DSN** (Data Source Name) - you'll need this in the next step

#### 2. Configure Environment Variables

Add your Sentry DSN to your environment variables:

**Local Development** (`Digital-Grimoire/app/.env.local`):
```env
NEXT_PUBLIC_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
```

**Sentry DSN Format:**
The DSN (Data Source Name) is a URL that looks like:
```
https://abc123def456@o1234567.ingest.sentry.io/1234567
```

Where:
- `abc123def456` = Your Sentry public key (starts with `https://`)
- `o1234567` = Your Sentry organization slug
- `1234567` = Your Sentry project ID

**How to find your DSN:**
1. After creating a Sentry project, go to **Settings** → **Projects** → Select your project
2. Navigate to **Client Keys (DSN)**
3. Copy the DSN URL (it will look like the format above)
4. Paste it into your `.env.local` file

**Production (Vercel)**:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add `NEXT_PUBLIC_SENTRY_DSN` with your Sentry DSN value
4. Select **Production**, **Preview**, and **Development** environments
5. Click **Save**

#### 3. Verify Installation

The Sentry SDK is already installed and configured in the codebase:

- ✅ `@sentry/nextjs` package installed
- ✅ `sentry.client.config.ts` - Client-side configuration
- ✅ `sentry.server.config.ts` - Server-side configuration
- ✅ `sentry.edge.config.ts` - Edge runtime configuration
- ✅ `instrumentation.ts` - Next.js instrumentation hook
- ✅ `next.config.ts` - Instrumentation enabled

#### 4. Test Error Tracking

To verify Sentry is working:

1. **In Development**: Errors are filtered out (won't be sent to Sentry)
2. **In Production**: 
   - Trigger a test error (e.g., visit a non-existent page)
   - Check your Sentry dashboard for the error
   - You should see the error appear within seconds

#### 5. Configure Alerts (Optional)

1. Go to your Sentry project dashboard
2. Navigate to **Alerts** → **Create Alert Rule**
3. Set up alerts for:
   - New issues
   - High error rates
   - Performance degradation
4. Configure notification channels (email, Slack, etc.)

### Sentry Features Enabled

- ✅ **Error Tracking**: Automatic capture of unhandled errors
- ✅ **Performance Monitoring**: Track slow API routes and database queries
- ✅ **Session Replay**: Record user sessions for debugging (10% sample rate)
- ✅ **Source Maps**: Upload source maps for better error stack traces (requires build configuration)

### Configuration Details

**Current Settings:**
- **Traces Sample Rate**: 100% (1.0) - Adjust in production based on traffic
- **Session Replay**: 10% sample rate for normal sessions, 100% for error sessions
- **Development Mode**: Errors are filtered out (not sent to Sentry)
- **Production Mode**: All errors are tracked

**To Adjust Sample Rates:**

Edit the configuration files:
- `sentry.client.config.ts` - Client-side settings
- `sentry.server.config.ts` - Server-side settings

Example (reduce to 10% in production):
```typescript
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
```

---

## Uptime Monitoring

Uptime monitoring services check your application's availability and notify you when it goes down.

### Recommended Services

#### Option 1: UptimeRobot (Free Tier)

**Features:**
- 50 monitors on free tier
- 5-minute check intervals
- Email and SMS notifications
- Status pages
- Public status page option

**Setup Steps:**

1. **Sign Up**: Go to [UptimeRobot.com](https://uptimerobot.com/) and create a free account

2. **Add Monitor**:
   - Click **"Add New Monitor"**
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Convergence Library
   - **URL**: `https://your-domain.com/api/health`
   - **Monitoring Interval**: 5 minutes (free tier)
   - **Alert Contacts**: Add your email

3. **Configure Alerts**:
   - Set up email notifications
   - Optionally add SMS (requires upgrade)
   - Configure alert thresholds

4. **Save Monitor**: Click **"Create Monitor"**

#### Option 2: Pingdom (Free Trial)

**Features:**
- 30-day free trial
- 1-minute check intervals
- Advanced alerting
- Performance monitoring

**Setup Steps:**

1. **Sign Up**: Go to [Pingdom.com](https://www.pingdom.com/) and start free trial

2. **Add Check**:
   - Navigate to **"Add New Check"**
   - **Check Type**: HTTP
   - **URL**: `https://your-domain.com/api/health`
   - **Check Interval**: 1 minute
   - **Alert Settings**: Configure notifications

3. **Save Check**

#### Option 3: Vercel Analytics (Built-in)

If you're using Vercel, you already have basic uptime monitoring:

1. Go to your Vercel project dashboard
2. Navigate to **Analytics** tab
3. View deployment status and uptime metrics
4. Set up notifications in **Settings** → **Notifications**

### Health Check Endpoint

The application includes a health check endpoint at `/api/health` that returns:

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "convergence-library"
}
```

**Endpoint Details:**
- **URL**: `https://your-domain.com/api/health`
- **Method**: GET
- **Response**: 200 OK with JSON payload
- **Purpose**: Simple endpoint for uptime monitoring services to ping

**Testing Locally:**
```bash
curl http://localhost:3000/api/health
```

**Testing Production:**
```bash
curl https://your-domain.com/api/health
```

---

## Verification

### Verify Sentry Setup

1. **Check Environment Variable**:
   ```bash
   # In your terminal
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```

2. **Check Sentry Dashboard**:
   - Log into [Sentry.io](https://sentry.io/)
   - Navigate to your project
   - Check for any test errors or events

3. **Test Error Reporting** (Production only):
   - Visit a page that triggers an error
   - Check Sentry dashboard for the error within seconds

### Verify Uptime Monitoring

1. **Test Health Endpoint**:
   ```bash
   curl https://your-domain.com/api/health
   ```
   Should return: `{"status":"ok","timestamp":"...","service":"convergence-library"}`

2. **Check Monitoring Service**:
   - Log into your uptime monitoring service (UptimeRobot, Pingdom, etc.)
   - Verify the monitor is showing "UP" status
   - Check that recent checks are successful

3. **Test Alerting**:
   - Temporarily stop your application (or use maintenance mode)
   - Wait for the monitoring interval
   - Verify you receive an alert notification

---

## Troubleshooting

### Sentry Not Capturing Errors

**Issue**: Errors aren't appearing in Sentry dashboard

**Solutions**:
1. Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Check that you're testing in production (errors are filtered in development)
3. Verify Sentry project is active and not paused
4. Check browser console for Sentry initialization errors
5. Ensure `instrumentationHook: true` is set in `next.config.ts`

### Health Check Endpoint Not Responding

**Issue**: `/api/health` returns 404 or error

**Solutions**:
1. Verify the file exists at `src/app/api/health/route.ts`
2. Restart your Next.js development server
3. Check that the route is accessible (not behind authentication)
4. Verify the deployment includes the health endpoint

### Uptime Monitor Shows Down

**Issue**: Monitoring service reports application is down

**Solutions**:
1. Verify the application is actually running
2. Check the health endpoint manually: `curl https://your-domain.com/api/health`
3. Verify the URL in the monitor is correct
4. Check for firewall or security rules blocking the monitoring service
5. Verify SSL certificate is valid (for HTTPS)

---

## Best Practices

### Sentry

1. **Sample Rates**: Adjust trace sample rates based on traffic to avoid quota limits
2. **Error Filtering**: Use `beforeSend` to filter out noisy errors
3. **Source Maps**: Upload source maps for better error debugging
4. **Alerts**: Set up alerts for critical errors only
5. **Privacy**: Ensure sensitive data is not included in error reports

### Uptime Monitoring

1. **Multiple Monitors**: Set up monitors from different geographic locations
2. **Check Intervals**: Balance between responsiveness and API quota limits
3. **Alert Fatigue**: Configure alerts to avoid notification spam
4. **Status Page**: Consider creating a public status page for users
5. **Backup Monitoring**: Use multiple services for redundancy

---

## Next Steps

1. ✅ Set up Sentry project and add DSN to environment variables
2. ✅ Configure uptime monitoring service (UptimeRobot recommended)
3. ✅ Test error tracking in production
4. ✅ Verify health check endpoint is accessible
5. ✅ Set up alert notifications
6. 📋 (Optional) Upload source maps to Sentry for better debugging
7. 📋 (Optional) Create public status page
8. 📋 (Optional) Set up additional monitoring for database and API performance

---

## References

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [UptimeRobot Documentation](https://uptimerobot.com/)
- [Pingdom Documentation](https://www.pingdom.com/)
- [Vercel Analytics](https://vercel.com/docs/analytics)

