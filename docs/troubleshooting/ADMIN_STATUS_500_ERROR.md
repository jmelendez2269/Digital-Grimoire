# Troubleshooting: Admin Status 500 Error

## Problem

The `/api/auth/admin-status` endpoint returns a 500 Internal Server Error, causing admin status checks to fail.

## Common Causes

### 1. Missing Environment Variables

**Most Common Issue**: The `SUPABASE_SERVICE_ROLE_KEY` environment variable is not set.

**Solution:**
1. Check your `.env.local` file in the `app/` directory
2. Ensure you have all required Supabase environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. **Important**: The `SUPABASE_SERVICE_ROLE_KEY` is different from the anon key
   - Find it in Supabase Dashboard → Settings → API → `service_role` key (secret)
   - **Never expose this key publicly** - it bypasses all security policies

4. Restart your development server after adding environment variables:
   ```bash
   # Stop the server (Ctrl+C) and restart
   pnpm dev
   ```

### 2. Service Role Key from Wrong Project

**Symptom**: Error mentions "Invalid API key" or project mismatch

**Solution:**
1. Verify the `NEXT_PUBLIC_SUPABASE_URL` matches the project where you got the service role key
2. The URL format is: `https://<project-ref>.supabase.co`
3. The service role key must be from the same project

### 3. Database Connection Issues

**Symptom**: Error fetching profile or database timeout

**Solution:**
1. Check Supabase dashboard to ensure your project is active
2. Verify the `users` table exists and has a `role` column
3. Check network connectivity to Supabase

## Debugging Steps

### Step 1: Check Server Logs

Look at your terminal/console where the Next.js dev server is running. The error should include:
- Which environment variables are missing
- The specific error message
- Stack trace (in development mode)

### Step 2: Verify Environment Variables

Create a test API route to check if variables are loaded:

```typescript
// app/src/app/api/test-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
  });
}
```

Visit `http://localhost:3000/api/test-env` to verify variables are loaded.

### Step 3: Test Service Client Directly

If environment variables are set, test the service client:

```typescript
// Test in a server component or API route
import { createServiceClient } from '@/lib/supabase/service';

try {
  const client = createServiceClient();
  console.log('Service client created successfully');
} catch (error) {
  console.error('Service client creation failed:', error);
}
```

## Quick Fix Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- [ ] Environment variables are in `app/.env.local` (not root directory)
- [ ] Development server was restarted after adding variables
- [ ] Service role key is from the correct Supabase project
- [ ] `users` table exists in Supabase database
- [ ] User profile exists in the `users` table

## Expected Behavior

When working correctly:
- API returns `{ isAdmin: true/false, role: "admin" | "user" | null }`
- Status code is 200 (not 500)
- No errors in browser console
- Admin features appear/disappear based on `isAdmin` value

## Still Not Working?

1. Check the server console for detailed error logs
2. Verify Supabase project is active and accessible
3. Ensure you're using the correct service role key (not anon key)
4. Check that the `users` table has the correct schema with a `role` column

## Related Documentation

- [Admin Access Checking Rules](../rules/ADMIN_ACCESS_CHECKING_RULES.md)
- [Supabase Setup](../Setup%20Docs/SUPABASE_SETUP.md)
- [Environment Variables](../Setup%20Docs/ENVIRONMENT_VARIABLES.md)

