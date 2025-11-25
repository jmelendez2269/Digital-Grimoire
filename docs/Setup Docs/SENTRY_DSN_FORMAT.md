# Sentry DSN Format Guide

## What is a Sentry DSN?

The DSN (Data Source Name) is a URL that Sentry provides when you create a project. It tells your application where to send error reports.

## DSN Format

Your Sentry DSN will look like this:

```
https://abc123def456@o1234567.ingest.sentry.io/1234567
```

### Breaking Down the DSN:

1. **`https://`** - Protocol (always HTTPS)
2. **`abc123def456`** - Your Sentry public key (starts after `https://`)
3. **`@`** - Separator
4. **`o1234567`** - Your Sentry organization slug (starts with `o`)
5. **`.ingest.sentry.io`** - Sentry's ingestion endpoint
6. **`/1234567`** - Your Sentry project ID

## How to Get Your DSN

### Step 1: Create a Sentry Account
1. Go to [sentry.io](https://sentry.io/)
2. Sign up for a free account (or log in if you already have one)

### Step 2: Create a Project
1. After logging in, click **"Create Project"** or go to **Projects** → **Create Project**
2. Select **"Next.js"** as your platform
3. Give your project a name (e.g., "Convergence Library" or "Digital Grimoire")
4. Click **"Create Project"**

### Step 3: Copy Your DSN
1. After creating the project, Sentry will show you setup instructions
2. Look for the **DSN** field - it will be displayed prominently
3. **OR** go to **Settings** → **Projects** → Select your project → **Client Keys (DSN)**
4. Copy the entire DSN URL (it starts with `https://`)

## Adding DSN to Your Project

### Local Development

Add to `Digital-Grimoire/app/.env.local`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o1234567.ingest.sentry.io/1234567
```

### Production (Vercel)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. **Key:** `NEXT_PUBLIC_SENTRY_DSN`
5. **Value:** Paste your DSN URL
6. Select environments: **Production**, **Preview**, **Development**
7. Click **Save**

## Example DSN

Here's what a real DSN looks like (this is just an example - use your own!):

```
https://a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6@o1234567.ingest.sentry.io/1234567
```

## Verification

After adding your DSN:

1. **Restart your development server** (if running locally)
2. **Deploy to production** (if using Vercel)
3. **Trigger a test error** (in production only - errors are filtered in development)
4. **Check your Sentry dashboard** - you should see the error within seconds

## Troubleshooting

### "DSN not found" error
- Verify the DSN is copied completely (including `https://`)
- Check for extra spaces or line breaks
- Ensure the variable name is exactly `NEXT_PUBLIC_SENTRY_DSN`

### Errors not appearing in Sentry
- Verify you're testing in **production** (errors are filtered in development)
- Check that `NEXT_PUBLIC_SENTRY_DSN` is set in your environment
- Verify the DSN is correct by checking it in Sentry dashboard
- Check browser console for Sentry initialization errors

### DSN format looks different
- Sentry may update their DSN format over time
- As long as it starts with `https://` and contains `@` and `.ingest.sentry.io`, it should work
- If in doubt, copy the DSN directly from Sentry dashboard

## Security Notes

⚠️ **Important:**
- The DSN is **public** and safe to include in client-side code
- It's designed to be exposed in frontend applications
- However, keep it in environment variables for easier management
- Never commit `.env.local` files to Git

## Next Steps

After configuring your DSN:
1. ✅ Test error tracking in production
2. ✅ Set up alert rules in Sentry dashboard
3. ✅ Configure notification channels (email, Slack, etc.)
4. ✅ (Optional) Upload source maps for better debugging

See `MONITORING_SETUP.md` for complete setup instructions.

