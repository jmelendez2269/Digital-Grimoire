# Subscription Tier Structure

## Overview

The Digital Grimoire uses a three-tier subscription model designed to provide value at different price points while maintaining profitability. All tiers include full access to the library and correspondence graph - we never gate knowledge.

## Tier Structure

### Free Tier - "The Reader"
- **Price:** $0/month
- **AI Queries:** 5 per month (calendar month reset)
- **Journal Pages:** 25 pages maximum
- **Features:**
  - Full library access
  - Full graph access
  - Basic search
  - Unlimited annotations
  - Unlimited collections

### Student Tier - "The Student"
- **Price:** $5/month
- **AI Queries:** 5 per month (same as free - unlimited journals is the value)
- **Journal Pages:** Unlimited
- **Features:**
  - Everything in Free tier
  - Unlimited journal pages
  - Full library access
  - Full graph access
  - Unlimited annotations
  - Unlimited collections

**Value Proposition:** For users who want to write extensively but don't need heavy AI usage.

**Profitability:**
- Revenue: $5 - $0.45 (Stripe fees) = $4.55 net
- Costs: 5 queries × $0.12 = $0.60
- Profit: $3.95/month (87% margin)

### Scholar Tier - "The Scholar"
- **Price:** $9.99/month
- **AI Queries:** 25-50 per month (beta - limits may adjust based on usage data)
- **Journal Pages:** Unlimited
- **Features:**
  - Everything in Student tier
  - 25-50 AI queries per month (beta)
  - Advanced annotation search
  - Priority support

**Value Proposition:** Most popular tier for AI power users.

**Profitability (at 25 queries):**
- Revenue: $9.99 - $0.59 (Stripe fees) = $9.40 net
- Costs: 25 queries × $0.12 = $3.00
- Profit: $6.40/month (68% margin)

**Profitability (at 50 queries):**
- Revenue: $9.40 net
- Costs: 50 queries × $0.12 = $6.00
- Profit: $3.40/month (36% margin)

### Adept Tier - "The Adept"
- **Price:** $15/month
- **AI Queries:** 50-100 per month (beta - limits may adjust based on usage data)
- **Journal Pages:** Unlimited
- **Features:**
  - Everything in Scholar tier
  - 50-100 AI queries per month (beta)
  - Early access to new features

**Value Proposition:** Maximum AI access for heavy users.

**Profitability (at 50 queries):**
- Revenue: $15 - $0.89 (Stripe fees) = $14.11 net
- Costs: 50 queries × $0.12 = $6.00
- Profit: $8.11/month (58% margin)

**Profitability (at 100 queries):**
- Revenue: $14.11 net
- Costs: 100 queries × $0.12 = $12.00
- Profit: $2.11/month (15% margin)

## Beta Query Limits

**Important:** We're currently in beta and actively monitoring query costs. Query limits for Scholar and Adept tiers may be adjusted based on actual usage data to ensure sustainability. Subscribers will be notified of any changes with at least 30 days notice.

### Current Limits (Conservative Start)
- **Scholar:** 25 queries/month (can increase to 50 if profitable)
- **Adept:** 50 queries/month (can increase to 100 if profitable)

### Adjustment Strategy
1. Monitor actual costs per query
2. Track usage patterns
3. Adjust limits upward if margins allow
4. Always maintain at least 15% profit margin
5. Notify users 30 days in advance of any changes

## Implementation Details

### Database Schema

The `users` table includes:
- `subscription_status`: `'free' | 'student' | 'scholar' | 'adept' | 'premium' | 'active' | NULL`
  - Legacy values `'premium'` and `'active'` are treated as `'scholar'` for backwards compatibility
- `stripe_customer_id`: Stripe customer ID
- `stripe_subscription_id`: Stripe subscription ID
- `subscription_start_date`: Start of current billing period
- `subscription_end_date`: End of current billing period

### Rate Limiting

Rate limits are enforced in `app/src/lib/convergence/rate-limit.ts`:

```typescript
const FREE_TIER_LIMIT = 5;
const STUDENT_TIER_LIMIT = 5; // Same as free
const SCHOLAR_TIER_LIMIT = 25; // Start conservative
const ADEPT_TIER_LIMIT = 50; // Start conservative
```

**Billing Period Logic:**
- **Free/Student:** Calendar month (resets on 1st of each month)
- **Scholar/Adept:** Subscription billing period (resets on subscription renewal)

### Stripe Integration

#### Environment Variables Required

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT=price_...
```

#### Stripe Setup Steps

1. **Create Products in Stripe Dashboard:**
   - Product: "The Student" - $5/month recurring
   - Product: "The Scholar" - $9.99/month recurring
   - Product: "The Adept" - $15/month recurring

2. **Get Price IDs:**
   - ⚠️ **IMPORTANT**: You need the **Price ID** (starts with `price_`), NOT the Product ID (starts with `prod_`)
   - In Stripe Dashboard, go to **Products** → Click on your product
   - Scroll to the **Pricing** section
   - Copy the **Price ID** (it will look like `price_1ABC123...`)
   - ❌ **DO NOT** use the Product ID (which looks like `prod_ABC123...`)
   - Add the Price IDs to `.env.local` as shown above
   - Ensure test price IDs are used with test keys (`sk_test_`), and live price IDs with live keys (`sk_live_`)

3. **Configure Webhook:**
   - Endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. **Test with Stripe Test Mode:**
   - Use test price IDs
   - Use test cards: `4242 4242 4242 4242`
   - Verify webhook events are received

### Webhook Tier Mapping

The webhook (`app/src/app/api/stripe/webhook/route.ts`) automatically maps Stripe price IDs to subscription tiers:

```typescript
function getTierFromPriceId(priceId: string): 'student' | 'scholar' | 'adept' | 'premium' {
  const studentPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT;
  const scholarPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR;
  const adeptPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT;

  if (studentPriceId && priceId === studentPriceId) return 'student';
  if (scholarPriceId && priceId === scholarPriceId) return 'scholar';
  if (adeptPriceId && priceId === adeptPriceId) return 'adept';
  
  // Legacy: default to scholar for backwards compatibility
  return 'scholar';
}
```

## UI Components

### SubscriptionTab Component

Location: `app/src/components/SubscriptionTab.tsx`

**Features:**
- Displays current subscription tier
- Shows query usage and reset date
- Lists all available tiers for upgrade
- Handles Stripe checkout redirects
- Shows beta messaging for Scholar/Adept tiers
- Provides subscription management link

**Key Functions:**
- `fetchSubscriptionStatus()`: Fetches current tier and usage
- `handleUpgrade(tier)`: Creates Stripe checkout session
- `handleManageSubscription()`: Opens Stripe customer portal

## Migration Guide

### Running the Migration

```sql
-- Run migration 025
\i migrations/025_add_subscription_tiers.sql
```

This migration:
- Updates the `subscription_status` check constraint to include new tiers
- Maintains backwards compatibility with `'premium'` and `'active'` values

### Migrating Existing Users

Existing users with `subscription_status = 'premium'` or `'active'` will be treated as `'scholar'` tier automatically by the code. To explicitly migrate:

```sql
-- Migrate premium users to scholar tier
UPDATE users 
SET subscription_status = 'scholar' 
WHERE subscription_status IN ('premium', 'active');
```

## Cost Tracking

All AI queries are tracked in the `api_usage` table with:
- `service`: `'convergence_query'`
- `input_tokens`: Input tokens used
- `output_tokens`: Output tokens used
- `estimated_cost`: Calculated cost based on OpenAI pricing

**Cost Calculation:**
- GPT-4o Input: $0.0025 per 1K tokens
- GPT-4o Output: $0.01 per 1K tokens
- Average query cost: ~$0.12 per query (varies by query length)

## Monitoring & Analytics

### Key Metrics to Track

1. **Subscription Metrics:**
   - Conversion rate (Free → Student → Scholar → Adept)
   - Churn rate by tier
   - Average revenue per user (ARPU)
   - Lifetime value (LTV)

2. **Cost Metrics:**
   - Average cost per query
   - Queries per user per month by tier
   - Total AI costs vs subscription revenue

3. **Usage Metrics:**
   - Query usage distribution
   - Users hitting limits
   - Peak usage times

### Querying Usage Data

```sql
-- Average queries per user by tier
SELECT 
  u.subscription_status as tier,
  COUNT(DISTINCT cq.user_id) as users,
  COUNT(cq.id) as total_queries,
  AVG(query_count) as avg_queries_per_user
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(*) as query_count
  FROM convergence_queries
  WHERE created_at >= date_trunc('month', CURRENT_DATE)
  GROUP BY user_id
) cq ON u.id = cq.user_id
GROUP BY u.subscription_status;
```

## Future Considerations

### Potential Adjustments

1. **Query Limits:**
   - Increase Scholar to 50 if 25 proves profitable
   - Increase Adept to 100 if 50 proves profitable
   - Monitor and adjust based on actual costs

2. **New Features:**
   - PDF/Notion export (when implemented)
   - Advanced search features
   - API access (for Adept tier)
   - Custom AI training (for Adept tier)

3. **Pricing:**
   - Annual plans (save 10-15%)
   - Student discounts
   - Promotional pricing

### Scaling Strategy

As usage grows:
1. Monitor costs closely
2. Adjust limits conservatively
3. Consider volume discounts from OpenAI
4. Implement caching to reduce API calls
5. Add query optimization features

## Support & Troubleshooting

### Stripe Support

**Stripe Support Phone:** (919) 322-9418

For issues with:
- Payment processing
- Subscription management
- Webhook configuration
- Account setup
- Billing questions

### Common Issues

1. **User not seeing correct tier:**
   - Check `subscription_status` in database
   - Verify Stripe webhook is receiving events
   - Check rate limit API response
   - Contact Stripe support: (919) 322-9418

2. **Query limits not resetting:**
   - Verify `subscription_start_date` and `subscription_end_date` are set
   - Check billing period calculation logic
   - Ensure webhook is updating dates on renewal

3. **Stripe checkout not working:**
   - Verify price IDs in environment variables
   - Check Stripe dashboard for product setup
   - Verify webhook endpoint is accessible
   - Contact Stripe support: (919) 322-9418

### Testing Checklist

- [ ] Free tier: 5 queries, resets on calendar month
- [ ] Student tier: 5 queries, unlimited journals, resets on billing period
- [ ] Scholar tier: 25 queries, resets on billing period
- [ ] Adept tier: 50 queries, resets on billing period
- [ ] Stripe checkout for each tier
- [ ] Webhook updates subscription status
- [ ] Subscription cancellation sets to free
- [ ] Beta messaging displays for Scholar/Adept

## References

- **Rate Limit Logic:** `app/src/lib/convergence/rate-limit.ts`
- **Subscription UI:** `app/src/components/SubscriptionTab.tsx`
- **Stripe Checkout:** `app/src/app/api/stripe/create-checkout-session/route.ts`
- **Stripe Webhook:** `app/src/app/api/stripe/webhook/route.ts`
- **Rate Limit API:** `app/src/app/api/convergence/rate-limit/route.ts`
- **Database Migration:** `migrations/025_add_subscription_tiers.sql`

