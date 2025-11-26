# Rate Limiting Setup Guide

## Overview

Rate limiting protects your API from abuse, DDoS attacks, and excessive resource usage. This guide covers all rate limiting configurations for Convergence.

---

## 1. Authentication Rate Limiting (Supabase)

**Status:** ✅ Configured via Supabase Dashboard

Supabase provides built-in rate limiting for authentication endpoints. Configure these in the Supabase Dashboard.

### Configuration Steps

1. Go to **Supabase Dashboard** → **Authentication** → **Rate Limits**
2. Configure the following limits:

```
Password Reset Requests: 3 per hour per email
Email Sign-up: 3 per hour per IP
Failed Login Attempts: 5 per hour per IP
Magic Link Requests: 5 per hour per email
```

### Recommended Settings

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| Password Reset | 3 | 1 hour | Prevents abuse of reset flow |
| Email Sign-up | 3 | 1 hour | Prevents spam account creation |
| Failed Login | 5 | 15 minutes | Prevents brute force attacks |
| Magic Link | 5 | 1 hour | Prevents email spam |

### Verification

Test rate limiting by:
1. Attempting multiple failed logins from the same IP
2. Requesting multiple password resets for the same email
3. Verifying that requests are blocked after the limit is reached

**Reference:** See `docs/Setup Docs/SUPABASE_PASSWORD_RESET_SETUP.md` for detailed setup instructions.

---

## 2. API Rate Limiting (General Endpoints)

**Status:** ✅ Implemented via `lib/rate-limit.ts`

A general-purpose rate limiting system tracks API requests in the database.

### Database Setup

Run the migration to create the rate limits table:

```sql
-- Run in Supabase SQL Editor
-- File: migrations/025_add_rate_limits_table.sql
```

This creates:
- `rate_limits` table for tracking requests
- Indexes for fast lookups
- Automatic cleanup function for old records

### Usage in API Routes

```typescript
import { rateLimitMiddleware, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    request,
    RateLimitPresets.MODERATE, // 60 requests per minute
    user.id // Optional: use user ID, defaults to IP if not provided
  );
  
  if (rateLimitResponse) {
    return rateLimitResponse; // Returns 429 if rate limited
  }
  
  // Continue with your API logic...
}
```

### Available Presets

| Preset | Limit | Window | Use Case |
|--------|-------|--------|----------|
| `STRICT` | 10 | 60s | Sensitive operations |
| `MODERATE` | 60 | 60s | General API endpoints |
| `GENEROUS` | 100 | 60s | High-traffic endpoints |
| `PER_HOUR` | 1000 | 3600s | Background jobs |
| `FILE_UPLOAD` | 10 | 3600s | File upload endpoints |
| `AUTH_ATTEMPTS` | 5 | 900s | Authentication endpoints |

### Custom Configuration

```typescript
const customLimit = await rateLimitMiddleware(
  request,
  { limit: 20, window: 300 }, // 20 requests per 5 minutes
  user.id
);
```

### Response Headers

When rate limited, the response includes standard rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1634567890
Retry-After: 45
```

---

## 3. File Upload Rate Limiting

**Status:** ✅ Implemented on `/api/upload/presigned`

File uploads are rate limited to prevent abuse and excessive storage usage.

### Current Configuration

- **Limit:** 10 uploads per hour per user
- **Endpoint:** `/api/upload/presigned`
- **Implementation:** Uses `RateLimitPresets.FILE_UPLOAD`

### Adjusting Limits

Edit `app/src/app/api/upload/presigned/route.ts`:

```typescript
// Change from:
RateLimitPresets.FILE_UPLOAD // 10 per hour

// To custom:
{ limit: 20, window: 3600 } // 20 per hour
```

---

## 4. Convergence Machine Rate Limiting

**Status:** ✅ Implemented (separate system)

The Convergence Machine has its own rate limiting system:
- **Free tier:** 5 queries per month
- **Premium tier:** Unlimited
- **Implementation:** `lib/convergence/rate-limit.ts`
- **Table:** `convergence_queries`

See `docs/CONVERGENCE_MACHINE_MVP_COMPLETE.md` for details.

---

## 5. Monitoring & Maintenance

### Database Cleanup

Old rate limit records are automatically cleaned up after 7 days. To manually clean:

```sql
SELECT cleanup_old_rate_limits();
```

### Monitoring Rate Limits

Query recent rate limit violations:

```sql
SELECT 
  identifier,
  window_seconds,
  COUNT(*) as request_count,
  MAX(created_at) as last_request
FROM rate_limits
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY identifier, window_seconds
HAVING COUNT(*) > 50
ORDER BY request_count DESC;
```

### Alerting

Set up alerts for:
- High rate limit violation rates
- Unusual patterns (potential attacks)
- Database table size growth

---

## 6. Production Checklist

Before going to production, verify:

- [ ] Supabase auth rate limits configured
- [ ] Database migration `025_add_rate_limits_table.sql` run
- [ ] File upload rate limiting tested
- [ ] API endpoints using rate limiting where appropriate
- [ ] Rate limit error messages are user-friendly
- [ ] Monitoring/alerting configured for rate limit violations

---

## 7. Testing Rate Limits

### Test File Upload Limits

```bash
# Make 11 requests (should fail on 11th)
for i in {1..11}; do
  curl -X POST https://your-domain.com/api/upload/presigned \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"fileName":"test.pdf","fileType":"application/pdf"}'
done
```

### Test API Rate Limits

```bash
# Make 61 requests (should fail on 61st with MODERATE preset)
for i in {1..61}; do
  curl -X POST https://your-domain.com/api/your-endpoint \
    -H "Authorization: Bearer $TOKEN"
done
```

### Expected Behavior

- Requests 1-10 (or limit): Return 200 OK
- Request 11 (or limit+1): Return 429 Too Many Requests
- Response includes `Retry-After` header
- Rate limit resets after window expires

---

## 8. Troubleshooting

### Rate Limits Not Working

1. **Check database migration:** Ensure `rate_limits` table exists
2. **Check identifier:** Verify user ID or IP is being captured correctly
3. **Check database connection:** Ensure Supabase client is working
4. **Check logs:** Look for rate limit errors in console

### Too Restrictive

- Adjust preset limits in `RateLimitPresets`
- Use custom configuration with higher limits
- Consider different limits for authenticated vs anonymous users

### Too Permissive

- Lower preset limits
- Add rate limiting to more endpoints
- Implement stricter limits for sensitive operations

---

## Reference Files

- **Rate Limiting Utility:** `app/src/lib/rate-limit.ts`
- **File Upload Endpoint:** `app/src/app/api/upload/presigned/route.ts`
- **Database Migration:** `migrations/025_add_rate_limits_table.sql`
- **Supabase Auth Setup:** `docs/Setup Docs/SUPABASE_PASSWORD_RESET_SETUP.md`
- **Convergence Rate Limiting:** `app/src/lib/convergence/rate-limit.ts`

---

**Last Updated:** November 10, 2025  
**Status:** ✅ Complete - Ready for Production

