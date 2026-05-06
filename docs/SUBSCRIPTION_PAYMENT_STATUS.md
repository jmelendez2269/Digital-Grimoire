# Subscription & Payment Setup Status

**Last Updated:** May 2026

## Current Status

The subscription system is implemented with Stripe checkout, subscription syncing, webhook tier mapping, and profile-page subscription management.

## Implemented

- `subscription_status` on `users`
- Stripe customer and subscription IDs on `users`
- Tier values: `free`, `student`, `scholar`, `adept`, legacy `premium`, legacy `active`
- Stripe checkout route: `app/src/app/api/stripe/create-checkout-session/route.ts`
- Stripe customer portal route: `app/src/app/api/stripe/create-portal-session/route.ts`
- Stripe webhook route: `app/src/app/api/stripe/webhook/route.ts`
- Subscription UI: `app/src/components/SubscriptionTab.tsx`
- Course access gating: `app/src/lib/courses/access.ts`

## Current Pricing

| Tier | Price | Access |
| --- | ---: | --- |
| Reader | $0/month | Library, graph, annotations, basic search, pre-course, taster courses |
| Student | $15/month or $120/year | Full courses, workbook depth, unlimited journal pages |
| Scholar | $29/month or $240/year | Student plus AI-assisted comparative research |
| Adept | $49/month or $420/year | Scholar plus highest research limits and early access |

## Tier Details

### Reader

- 5 AI queries/month
- 25 journal pages
- Full library and graph access
- Pre-course and taster course access
- Unlimited annotations and collections

### Student

- Full course access
- Structured 8-week learning paths
- Course workbook and synthesis artifacts
- Unlimited journal pages
- 5 AI queries/month

### Scholar

- Everything in Student
- 25 AI research queries/month
- Seven Lenses study workflows
- Concept search and advanced research tools
- Priority support

### Adept

- Everything in Scholar
- 50 AI research queries/month
- Highest research limits
- Early access to new course and AI features
- Priority support

## Stripe Setup

Create or update monthly Stripe products:

- "The Student" - $15/month recurring
- "The Scholar" - $29/month recurring
- "The Adept" - $49/month recurring

Annual products, when enabled:

- "The Student" - $120/year recurring
- "The Scholar" - $240/year recurring
- "The Adept" - $420/year recurring

Set the matching monthly price IDs:

```env
NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT=price_...
```

## Access Rules

- `PRE` and `taster-*` courses are free.
- Full courses require Student or above.
- Legacy `premium` and `active` statuses are treated as Scholar.
- Admins have Adept-level access for testing.

## Launch Checks

- [ ] Student checkout creates a $15/month subscription
- [ ] Scholar checkout creates a $29/month subscription
- [ ] Adept checkout creates a $49/month subscription
- [ ] Stripe webhook updates `subscription_status`
- [ ] Cancelled subscriptions return to `free`
- [ ] Free users can start pre-course and taster courses
- [ ] Free users cannot start full courses
- [ ] Student, Scholar, and Adept users can start full courses
- [ ] Subscription UI copy matches the live Stripe prices
