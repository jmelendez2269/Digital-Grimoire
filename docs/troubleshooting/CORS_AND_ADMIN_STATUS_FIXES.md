# CORS and Admin Status Error Fixes

## Issues Fixed

### 1. CORS Error for PDF Files from Cloudflare R2

**Problem:**
```
Access to fetch at 'https://convergence-library...r2.cloudflarestorage.com/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root Cause:**
- Cloudflare R2 CORS configuration not properly set up
- CORS must be configured in Cloudflare R2 dashboard (not just local config files)

**Solution Applied:**
1. ✅ Updated `config/r2-cors.json` with correct CORS configuration for port 3000
2. ✅ Updated CORS documentation in `docs/Setup Docs/CLOUDFLARE_R2_SETUP.md`
3. ✅ Added production domains (convergencelibrary.com) to CORS config

**Action Required:**
You must update the CORS configuration in your Cloudflare R2 dashboard:

1. Go to Cloudflare Dashboard → R2 → Your Bucket → Settings → CORS Policy
2. Update the CORS policy with the configuration from `config/r2-cors.json`:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://convergencelibrary.com",
      "https://www.convergencelibrary.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

3. Click **Save**
4. Wait a few minutes for changes to propagate
5. Clear browser cache and test again

**Files Changed:**
- `config/r2-cors.json` - Updated CORS configuration for port 3000
- `docs/Setup Docs/CLOUDFLARE_R2_SETUP.md` - Updated CORS instructions

---

### 2. Admin Status API 500 Error

**Problem:**
```
/api/auth/admin-status:1 Failed to load resource: 
the server responded with a status of 500 (Internal Server Error)
```

**Root Cause:**
Most likely missing `SUPABASE_SERVICE_ROLE_KEY` environment variable.

**Solution Applied:**
1. ✅ Improved error handling in `app/src/app/api/auth/admin-status/route.ts`
2. ✅ Added environment variable diagnostics to error logs
3. ✅ Created troubleshooting guide: `docs/troubleshooting/ADMIN_STATUS_500_ERROR.md`

**Action Required:**

1. **Check your `.env.local` file** in the `app/` directory
2. **Ensure you have** `SUPABASE_SERVICE_ROLE_KEY` set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # ← This is critical!
```

3. **Get the service role key** from:
   - Supabase Dashboard → Settings → API → `service_role` key (secret)
   - ⚠️ **Never expose this key publicly** - it bypasses all security

4. **Restart your development server** after adding the variable:
   ```bash
   # Stop server (Ctrl+C) and restart
   pnpm dev
   ```

5. **Check server console** for detailed error messages if issue persists

**Files Changed:**
- `app/src/app/api/auth/admin-status/route.ts` - Improved error handling
- `docs/troubleshooting/ADMIN_STATUS_500_ERROR.md` - New troubleshooting guide

---

## Testing the Fixes

### Test CORS Fix:
1. Navigate to a document page with a PDF
2. Open browser DevTools → Network tab
3. Check that PDF loads without CORS errors
4. Verify the request includes `Access-Control-Allow-Origin` header

### Test Admin Status Fix:
1. Check browser console - should not see 500 errors
2. Admin features should appear if you're an admin user
3. Check server console for any error messages
4. Visit `/api/auth/admin-status` directly to see response

---

## Quick Reference

### CORS Configuration Location
- **Local Config**: `config/r2-cors.json` (reference only)
- **Actual Config**: Cloudflare R2 Dashboard → Bucket → Settings → CORS Policy

### Environment Variables Location
- **File**: `app/.env.local` (not in root directory)
- **Required**: `SUPABASE_SERVICE_ROLE_KEY` (most common missing variable)

### Documentation
- CORS Setup: `docs/Setup Docs/CLOUDFLARE_R2_SETUP.md`
- Admin Status Troubleshooting: `docs/troubleshooting/ADMIN_STATUS_500_ERROR.md`

---

## Still Having Issues?

1. **CORS still failing?**
   - Verify CORS is configured in Cloudflare dashboard (not just local file)
   - Check that origin matches exactly (http vs https, port number)
   - Clear browser cache
   - Wait a few minutes for Cloudflare changes to propagate

2. **Admin status still 500?**
   - Check server console for detailed error logs
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is in `app/.env.local`
   - Ensure service role key is from the correct Supabase project
   - Restart dev server after adding environment variables

