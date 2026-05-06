---
title: Subscription System
type: architecture
status: stable
audience: developer
description: Technical implementation of Stripe subscriptions and access tiers.
---

## Overview

Prismarium uses a value-based subscription model centered on guided study, not raw AI usage. Reader access keeps the library and correspondence graph open. Paid plans unlock the structured course experience, workbook depth, and advanced research tools that make the platform sustainable.

## Tier Structure

### Free Tier - "The Reader"

- **Price:** $0/month
- **AI Queries:** 5 per month
- **Journal Pages:** 25 pages maximum
- **Features:**
  - Full library access
  - Full graph access
  - Basic search
  - Pre-course and taster courses
  - Unlimited annotations
  - Unlimited collections

### Student Tier - "The Student"

- **Price:** $15/month or $120/year
- **AI Queries:** 5 per month
- **Journal Pages:** Unlimited
- **Features:**
  - Everything in Free tier
  - Full course access
  - Structured 8-week learning paths
  - Course workbook and synthesis artifacts
  - Unlimited journal pages

**Value proposition:** For users who want the full guided course experience without heavy AI usage.

**Estimated unit economics:** $15 - about $0.74 Stripe fees - about $0.60 AI cost at 5 queries = about $13.66/month before fixed platform costs.

### Scholar Tier - "The Scholar"

- **Price:** $29/month or $240/year
- **AI Queries:** 25 per month
- **Journal Pages:** Unlimited
- **Features:**
  - Everything in Student tier
  - 25 AI research queries per month
  - Seven Lenses study workflows
  - Concept search and advanced research tools
  - Priority support

**Value proposition:** For serious comparative study and AI-assisted research.

**Estimated unit economics:** $29 - about $1.14 Stripe fees - about $3.00 AI cost at 25 queries = about $24.86/month before fixed platform costs.

### Adept Tier - "The Adept"

- **Price:** $49/month or $420/year
- **AI Queries:** 50 per month
- **Journal Pages:** Unlimited
- **Features:**
  - Everything in Scholar tier
  - 50 AI research queries per month
  - Highest research limits
  - Early access to new course and AI features

**Value proposition:** Maximum research depth for heavy users and founding supporters.

**Estimated unit economics:** $49 - about $1.72 Stripe fees - about $6.00 AI cost at 50 queries = about $41.28/month before fixed platform costs.

## Research Query Limits

Prismarium subscriptions are priced around guided study and research value. Query limits keep the AI tools sustainable while courses, the library, and the graph remain central.

- **Free:** 5 queries/month
- **Student:** 5 queries/month
- **Scholar:** 25 queries/month
- **Adept:** 50 queries/month

## Implementation Details

### Database Schema

The `users` table includes:

- `subscription_status`: `'free' | 'student' | 'scholar' | 'adept' | 'premium' | 'active' | NULL`
  - Legacy values `'premium'` and `'active'` are treated as `'scholar'` for backwards compatibility.
- `stripe_customer_id`: Stripe customer ID
- `stripe_subscription_id`: Stripe subscription ID
- `subscription_start_date`: Start of current billing period
- `subscription_end_date`: End of current billing period

### Rate Limiting

Rate limits are enforced in `app/src/lib/parallax/rate-limit.ts`:

```typescript
const FREE_TIER_LIMIT = 5;
const STUDENT_TIER_LIMIT = 5;
const SCHOLAR_TIER_LIMIT = 25;
const ADEPT_TIER_LIMIT = 50;
```

### Course Access

Course access is enforced in `app/src/lib/courses/access.ts` and the course API routes.

- `PRE` and `taster-*` courses are free.
- All other full courses require `student`, `scholar`, `adept`, legacy `premium/active`, or admin access.

### Stripe Integration

Required environment variables:

```env
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT=price_...
```

Stripe products should be configured as:

- Product: "The Student" - $15/month recurring
- Product: "The Scholar" - $29/month recurring
- Product: "The Adept" - $49/month recurring

Annual plans, when enabled, should map to:

- Student: $120/year
- Scholar: $240/year
- Adept: $420/year

The webhook (`app/src/app/api/stripe/webhook/route.ts`) maps Stripe price IDs to subscription tiers using the `NEXT_PUBLIC_STRIPE_PRICE_ID_*` environment variables.

## Monitoring

Track these metrics at launch:

- Free to Student conversion rate
- Taster to paid conversion rate
- Student to Scholar upgrade rate
- Churn by tier
- Average queries per paid user
- Course start and completion rates
- Gross margin after Stripe, AI, Supabase, and Vercel costs

## Testing Checklist

- [ ] Free tier: 5 queries, 25 journal pages, library and graph access
- [ ] Free tier: can start pre-course and taster courses
- [ ] Free tier: cannot start full paid courses
- [ ] Student tier: can start full courses, has unlimited journals, 5 queries
- [ ] Scholar tier: can start full courses, has 25 queries
- [ ] Adept tier: can start full courses, has 50 queries
- [ ] Stripe checkout works for each monthly tier
- [ ] Webhook updates `subscription_status`
- [ ] Subscription cancellation sets user back to free
- [ ] Research limit messaging displays for Scholar and Adept

## References

- **Rate Limit Logic:** `app/src/lib/parallax/rate-limit.ts`
- **Course Access Logic:** `app/src/lib/courses/access.ts`
- **Subscription UI:** `app/src/components/SubscriptionTab.tsx`
- **Stripe Checkout:** `app/src/app/api/stripe/create-checkout-session/route.ts`
- **Stripe Webhook:** `app/src/app/api/stripe/webhook/route.ts`
- **Rate Limit API:** `app/src/app/api/parallax/rate-limit/route.ts`
