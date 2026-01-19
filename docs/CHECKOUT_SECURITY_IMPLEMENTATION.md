# Checkout Security Implementation

## ✅ What Was Implemented

### 1. Rate Limiting ✅ COMPLETE

**Per IP Rate Limiting:**
- **Limit:** 3 checkouts per hour per IP address
- **Purpose:** Prevents abuse from single IP addresses
- **Implementation:** Applied before authentication check

**Per User Rate Limiting:**
- **Limit:** 2 checkouts per hour per user
- **Purpose:** Prevents individual users from creating excessive checkout sessions
- **Implementation:** Applied after authentication check

**Location:** `app/src/app/api/stripe/create-checkout-session/route.ts`

### 2. Stripe Radar Integration ✅ COMPLETE

**Metadata Added:**
- `user_id`: User's Supabase ID
- `user_email`: User's email address
- `checkout_source`: Set to 'web'
- `ip_address`: Client IP address
- `created_at`: Timestamp of checkout creation

**How It Works:**
- Stripe Radar is enabled by default for all Stripe accounts
- The metadata helps Radar make better fraud detection decisions
- Radar automatically analyzes payment patterns and flags suspicious activity

**Location:** `app/src/app/api/stripe/create-checkout-session/route.ts` (line ~203)

### 3. Optional reCAPTCHA Verification ✅ COMPLETE

**Implementation:**
- Server-side verification is implemented and ready
- Client-side code is prepared but commented out
- Works without reCAPTCHA if keys are not configured (fails gracefully)

**Location:**
- Server: `app/src/app/api/stripe/create-checkout-session/route.ts`
- Client: `app/src/components/SubscriptionTab.tsx`

---

## 🔧 What You Need to Do

### 1. Stripe Radar Configuration (REQUIRED)

Stripe Radar is already enabled by default, but you should configure rules:

1. **Go to Stripe Dashboard:**
   - Navigate to: **Settings** → **Radar** → **Rules**

2. **Recommended Rules:**
   - **Block high-risk payments:** Block payments with risk level "highest"
   - **Review medium-risk payments:** Review payments with risk level "elevated"
   - **Enable 3D Secure:** Require 3D Secure for high-risk payments

3. **Configure Risk Thresholds:**
   - **Highest Risk:** Block automatically
   - **Elevated Risk:** Review manually
   - **Normal Risk:** Allow automatically

4. **Test in Test Mode:**
   - Use Stripe test cards to verify Radar is working
   - Test card: `4000 0000 0000 0002` (declined by Radar)

**Reference:** [Stripe Radar Documentation](https://stripe.com/docs/radar)

---

### 2. reCAPTCHA Setup (OPTIONAL but Recommended)

#### Step 1: Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **"+"** to create a new site
3. Choose **reCAPTCHA v3** (recommended - invisible, no user interaction)
4. Add your domains:
   - `localhost` (for development)
   - Your production domain
5. Copy the **Site Key** and **Secret Key**

#### Step 2: Install reCAPTCHA Package

```bash
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
pnpm add react-google-recaptcha-v3
```

#### Step 3: Add Environment Variables

Add to `.env.local`:

```env
# reCAPTCHA (Optional - for additional security)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

#### Step 4: Set Up reCAPTCHA Provider

Create or update `app/src/app/layout.tsx` to include the reCAPTCHA provider:

```typescript
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

// In your root layout component:
<GoogleReCaptchaProvider
  reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
>
  {/* Your app content */}
</GoogleReCaptchaProvider>
```

#### Step 5: Enable Client-Side reCAPTCHA

Uncomment and update the reCAPTCHA code in `app/src/components/SubscriptionTab.tsx`:

```typescript
// Replace the commented section with:
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// In the component:
const { executeRecaptcha } = useGoogleReCaptcha();

// In handleUpgrade function:
if (executeRecaptcha) {
  try {
    recaptchaToken = await executeRecaptcha('checkout');
  } catch (recaptchaError) {
    console.warn('reCAPTCHA error:', recaptchaError);
  }
}
```

**Note:** The checkout will work without reCAPTCHA, but enabling it adds an extra layer of security.

---

### 3. Verify Rate Limiting Works

Test the rate limiting:

1. **Test Per-IP Limit:**
   - Try creating 4 checkout sessions from the same IP within an hour
   - The 4th request should return a 429 (Too Many Requests) error

2. **Test Per-User Limit:**
   - Log in as a user
   - Try creating 3 checkout sessions within an hour
   - The 3rd request should return a 429 error

3. **Check Rate Limit Headers:**
   - Response headers should include:
     - `X-RateLimit-Limit`: Maximum requests allowed
     - `X-RateLimit-Remaining`: Remaining requests
     - `X-RateLimit-Reset`: Unix timestamp when limit resets
     - `Retry-After`: Seconds to wait before retrying

---

## 📊 Security Improvements Summary

| Feature | Status | Impact |
|---------|--------|--------|
| **Per-IP Rate Limiting** | ✅ Active | Prevents DDoS and abuse from single IPs |
| **Per-User Rate Limiting** | ✅ Active | Prevents individual user abuse |
| **Stripe Radar** | ✅ Active | Automatic fraud detection |
| **reCAPTCHA** | ⚠️ Optional | Additional bot protection (needs setup) |

---

## 🧪 Testing Checklist

- [ ] Test rate limiting per IP (should block after 3 requests/hour)
- [ ] Test rate limiting per user (should block after 2 requests/hour)
- [ ] Verify Stripe Radar is analyzing payments in Stripe Dashboard
- [ ] (Optional) Test reCAPTCHA verification if configured
- [ ] Verify checkout still works normally for legitimate users
- [ ] Check that rate limit errors return proper 429 status codes

---

## 📝 Notes

- **Rate limiting uses the existing `rate_limits` table** - no additional database setup needed
- **Stripe Radar is free** for all Stripe accounts and enabled by default
- **reCAPTCHA is optional** - checkout works without it, but it adds security
- **Rate limits are per-hour** - they reset automatically after the time window expires
- **All security features fail gracefully** - they won't break checkout if there are issues

---

## 🔗 References

- [Stripe Radar Documentation](https://stripe.com/docs/radar)
- [Google reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [Rate Limiting Implementation](../Setup%20Docs/RATE_LIMITING_SETUP.md)

