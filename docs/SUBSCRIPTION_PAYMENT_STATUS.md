# Subscription & Payment Setup Status

**Last Updated:** December 2024

## Current Status Overview

### ✅ What's Implemented

1. **Database Schema**
   - `subscription_status` column in `users` table
   - Migrations: 
     - `migrations/022_add_subscription_status.sql` - Initial subscription status
     - `migrations/023_add_stripe_fields.sql` - Stripe customer/subscription IDs
     - `migrations/025_add_subscription_tiers.sql` - Multi-tier support
   - Values: `'free'`, `'student'`, `'scholar'`, `'adept'`, `'premium'`, `'active'`, or `NULL`
   - Default: `'free'`
   - Legacy values `'premium'` and `'active'` are treated as `'scholar'` for backwards compatibility

2. **Subscription Tier System**
   - Three-tier structure: Free, Student ($5), Scholar ($9.99), Adept ($15)
   - Rate limiting system supports all tiers
   - Location: `app/src/lib/convergence/rate-limit.ts`
   - Functions: `getSubscriptionTier()`, `getTierLimit()`, `checkRateLimit()`
   - API route: `app/src/app/api/convergence/rate-limit/route.ts`

3. **UI Components**
   - ✅ Subscription tab on profile page (`app/src/app/profile/page.tsx`)
   - ✅ `SubscriptionTab` component with full tier display
   - ✅ Shows current tier, usage, and upgrade options
   - ✅ Beta messaging for Scholar/Adept tiers
   - `PremiumGate` component shows upgrade prompts
   - `RateLimitDisplay` component shows remaining queries

### ✅ Fully Implemented

1. **Subscription Management Page**
   - ✅ Tabbed interface on profile page
   - ✅ Subscription tab displays all tiers
   - ✅ Shows current subscription status and usage
   - ✅ Upgrade buttons for each tier
   - ✅ Subscription management link (Stripe Customer Portal)

2. **Payment Processing (Stripe)**
   - ✅ Stripe packages installed
   - ✅ Stripe API routes created:
     - `app/src/app/api/stripe/create-checkout-session/route.ts`
     - `app/src/app/api/stripe/create-portal-session/route.ts`
     - `app/src/app/api/stripe/webhook/route.ts`
   - ✅ Webhook handlers for all subscription events
   - ✅ Tier mapping from Stripe price IDs

3. **Environment Variables**
   - ✅ Documented in `ENVIRONMENT_VARIABLES.md`
   - ✅ Required variables:
     - `STRIPE_SECRET_KEY`
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT`
     - `NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR`
     - `NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT`

## Implementation Requirements

### Phase 1: Subscription Page (UI Only)

**Priority:** High  
**Effort:** Medium  
**Status:** ✅ Complete

**Tasks:**
1. Add tabbed interface to profile page
2. Create subscription tab component
3. Display current subscription status
4. Show upgrade options (even if payment not connected)
5. Add subscription management UI (cancel, view history, etc.)

**Files to Modify:**
- `app/src/app/profile/page.tsx` - Add tabs
- Create `app/src/components/SubscriptionTab.tsx` - New component

### Phase 2: Stripe Integration

**Priority:** High  
**Effort:** Large  
**Status:** ✅ Complete

**Tasks:**
1. Install Stripe packages
   ```bash
   cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
   pnpm add stripe @stripe/stripe-js
   ```

2. Set up Stripe account
   - Create Stripe account
   - Get API keys (test and live)
   - Set up products and prices in Stripe Dashboard

3. Add environment variables
   - `STRIPE_SECRET_KEY` (server-side)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-side)
   - `STRIPE_WEBHOOK_SECRET` (for webhooks)

4. Create API routes
   - `app/src/app/api/stripe/create-checkout-session/route.ts` - Create checkout session
   - `app/src/app/api/stripe/create-portal-session/route.ts` - Customer portal
   - `app/src/app/api/stripe/webhook/route.ts` - Handle webhook events

5. Update subscription page
   - Add "Upgrade to Premium" button
   - Connect to Stripe checkout
   - Display current subscription details
   - Add cancel/update subscription options

6. Webhook handlers
   - `checkout.session.completed` - Activate subscription
   - `customer.subscription.updated` - Update subscription
   - `customer.subscription.deleted` - Cancel subscription
   - `invoice.payment_succeeded` - Handle renewals
   - `invoice.payment_failed` - Handle failed payments

### Phase 3: Database Integration

**Status:** ✅ Complete

**Completed Tasks:**
1. ✅ Added Stripe customer ID to users table
   - Migration: `migrations/023_add_stripe_fields.sql`
   - Added `stripe_customer_id` column
   - Added `stripe_subscription_id` column
   - Added `subscription_start_date` column
   - Added `subscription_end_date` column

2. ✅ Updated subscription status logic
   - Webhook handlers sync with Stripe subscription status
   - Handles all subscription events (created, updated, deleted, payment succeeded/failed)

## Current Code References

### Subscription Status Check

```12:14:Digital-Grimoire/app/src/lib/convergence/rate-limit.ts
// Check subscription status
return data?.subscription_status === 'premium' || data?.subscription_status === 'active';
```

### PremiumGate Component

```42:47:Digital-Grimoire/app/src/components/convergence/PremiumGate.tsx
      <Link
        href="/profile?tab=subscription"
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
      >
        Upgrade to Premium
      </Link>
```

### Profile Page (No Subscription Tab)

The profile page at `app/src/app/profile/page.tsx` currently only shows:
- Personal information form
- Avatar upload
- Journal name preference
- Privacy settings link

**No subscription tab exists.**

## Feature Backlog Reference

From `docs/planning/FEATURE_BACKLOG.md`:

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Stripe integration | P0 | L | 14 | ⬜ Planned | Payment processing |
| Premium subscription | P0 | M | 14 | ⬜ Planned | $15/month |
| Subscription management | P0 | M | 14 | ⬜ Planned | Cancel, upgrade |

## Pricing Model

**Current Three-Tier Structure:**

### Free Tier - "The Reader" ($0/month)
- 5 AI queries per month
- 25 journal pages
- Full library and graph access
- Unlimited annotations and collections

### Student Tier - "The Student" ($5/month)
- 5 AI queries per month (unlimited journals is the value)
- Unlimited journal pages
- Full library and graph access
- Unlimited annotations and collections

### Scholar Tier - "The Scholar" ($9.99/month)
- 25-50 AI queries per month (beta - limits may adjust)
- Unlimited journal pages
- Advanced annotation search
- Priority support
- All Student features

### Adept Tier - "The Adept" ($15/month)
- 50-100 AI queries per month (beta - limits may adjust)
- Early access to new features
- All Scholar features

**Note:** Query limits for Scholar and Adept tiers are in beta and may be adjusted based on actual usage data. See `docs/SUBSCRIPTION_TIER_STRUCTURE.md` for full details.

## Next Steps

1. **Stripe Setup Required:**
   - Create products in Stripe Dashboard:
     - "The Student" - $5/month recurring
     - "The Scholar" - $9.99/month recurring
     - "The Adept" - $15/month recurring
   - Get price IDs and add to `.env.local`
   - Configure webhook endpoint
   - Test with Stripe test mode
   - **Stripe Support:** (919) 322-9418 (for setup assistance)

2. **Monitoring:**
   - Track query costs per tier
   - Monitor usage patterns
   - Adjust query limits if profitable
   - Notify users of any changes (30 days notice)

3. **Future Enhancements:**
   - Annual plans (save 10-15%)
   - Student discounts
   - PDF/Notion export (when implemented)
   - API access for Adept tier

## Testing Subscription Status (Current)

To test premium access without payment:

```sql
-- Set user to premium (manual testing)
UPDATE users 
SET subscription_status = 'premium' 
WHERE email = 'your-email@example.com';
```

Or use the test migration:
- `migrations/022_SET_TEST_USER_PREMIUM.sql`

## Related Files

- `migrations/022_add_subscription_status.sql` - Initial subscription status
- `migrations/023_add_stripe_fields.sql` - Stripe customer/subscription IDs
- `migrations/025_add_subscription_tiers.sql` - Multi-tier support
- `app/src/lib/convergence/rate-limit.ts` - Tier checking and rate limiting
- `app/src/components/SubscriptionTab.tsx` - Subscription management UI
- `app/src/app/profile/page.tsx` - Profile page with subscription tab
- `app/src/app/api/stripe/create-checkout-session/route.ts` - Stripe checkout
- `app/src/app/api/stripe/create-portal-session/route.ts` - Customer portal
- `app/src/app/api/stripe/webhook/route.ts` - Webhook handlers
- `app/src/app/api/convergence/rate-limit/route.ts` - Rate limit API
- `docs/SUBSCRIPTION_TIER_STRUCTURE.md` - Comprehensive tier documentation
- `docs/Setup Docs/ENVIRONMENT_VARIABLES.md` - Environment variables

