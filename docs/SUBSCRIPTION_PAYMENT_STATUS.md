# Subscription & Payment Setup Status

**Last Updated:** $(date)

## Current Status Overview

### ✅ What's Implemented

1. **Database Schema**
   - `subscription_status` column in `users` table
   - Migration: `migrations/022_add_subscription_status.sql`
   - Values: `'free'`, `'premium'`, `'active'`, or `NULL`
   - Default: `'free'`

2. **Subscription Checking Logic**
   - Rate limiting system checks subscription status
   - Location: `app/src/lib/convergence/rate-limit.ts`
   - Function: `checkPremiumStatus(userId)`
   - API route: `app/src/app/api/convergence/rate-limit/route.ts`

3. **UI Components**
   - `PremiumGate` component shows upgrade prompts
   - `RateLimitDisplay` component shows remaining queries
   - Both link to `/profile?tab=subscription` (but tab doesn't exist yet)

### ❌ What's Missing

1. **Subscription Management Page**
   - Profile page exists at `app/src/app/profile/page.tsx`
   - **No subscription tab implemented**
   - Components reference `/profile?tab=subscription` but it doesn't exist
   - Need to add tabbed interface to profile page

2. **Payment Processing (Stripe)**
   - **No Stripe integration**
   - No Stripe API routes
   - No Stripe environment variables
   - No checkout flow
   - No webhook handlers for subscription events

3. **Environment Variables**
   - Stripe keys not documented in `ENVIRONMENT_VARIABLES.md`
   - No Stripe configuration in `.env.local` template

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
**Status:** Planned (Sprint 14 per backlog)

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

**Tasks:**
1. Add Stripe customer ID to users table
   - Migration: Add `stripe_customer_id` column
   - Migration: Add `stripe_subscription_id` column
   - Migration: Add `subscription_start_date` column
   - Migration: Add `subscription_end_date` column

2. Update subscription status logic
   - Sync with Stripe subscription status
   - Handle webhook events to update database

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

From `docs/planning/MASTER_DEVELOPMENT_PLAN.md`:

**Premium Tier (The Scholar) - $15/month or $150/year:**
- Unlimited grimoire pages
- Unlimited AI queries (Multi-Lens System)
- Advanced semantic search
- Interactive correspondence graph
- Ritual inventory system
- Export to PDF + Notion
- Priority support
- Early access to new features

## Next Steps

1. **Immediate:** Add subscription tab to profile page (UI only, no payment yet)
2. **Short-term:** Set up Stripe account and get API keys
3. **Medium-term:** Implement Stripe checkout flow
4. **Long-term:** Add webhook handlers and subscription management

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

- `migrations/022_add_subscription_status.sql` - Database schema
- `app/src/lib/convergence/rate-limit.ts` - Subscription checking
- `app/src/components/convergence/PremiumGate.tsx` - Upgrade prompts
- `app/src/components/convergence/RateLimitDisplay.tsx` - Query limits display
- `app/src/app/profile/page.tsx` - Profile page (needs subscription tab)
- `docs/Setup Docs/ENVIRONMENT_VARIABLES.md` - Environment variables (needs Stripe section)

