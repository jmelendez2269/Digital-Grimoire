# Subscription Tier Structure

Prismarium pricing is value-based: free access keeps the knowledge archive open, while paid plans unlock guided courses, workbook depth, and advanced research tools.

## Tiers

| Tier | Price | Core Value |
| --- | ---: | --- |
| Reader | $0/month | Library, graph, annotations, basic search, pre-course, taster courses |
| Student | $15/month or $120/year | Full courses, structured 8-week paths, unlimited journal/workbook |
| Scholar | $29/month or $240/year | Student plus AI-assisted comparative research and concept search |
| Adept | $49/month or $420/year | Scholar plus highest research limits, early access, priority support |

## Reader

- 5 AI queries/month
- 25 journal pages
- Full library access
- Full correspondence graph access
- Pre-course and taster courses
- Unlimited annotations and collections

## Student

- Full course access
- Structured 8-week learning paths
- Course workbook and synthesis artifacts
- Unlimited journal pages
- 5 AI queries/month

Student is the main course-access plan. It should be the default recommendation for learners who want the classes but do not need heavy AI usage.

## Scholar

- Everything in Student
- 25 AI research queries/month
- Seven Lenses study workflows
- Concept search and advanced research tools
- Priority support

Scholar is for serious comparative study and AI-assisted research.

## Adept

- Everything in Scholar
- 50 AI research queries/month
- Highest research limits
- Early access to new course and AI features
- Priority support

Adept is for heavy users, founding supporters, and people who want maximum research depth.

## Stripe Product Setup

Monthly Stripe products:

- The Student: $15/month recurring
- The Scholar: $29/month recurring
- The Adept: $49/month recurring

Annual pricing, when enabled:

- The Student: $120/year
- The Scholar: $240/year
- The Adept: $420/year

Keep the existing tier identifiers in code:

- `student`
- `scholar`
- `adept`

Update the Stripe Price IDs in environment variables after creating or editing Stripe prices:

```env
NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT=price_...
```

## Course Access Rule

- `PRE` and `taster-*` courses are free.
- Full courses require Student or above.
- Legacy `premium` and `active` statuses are treated as Scholar.
- Admins have Adept-level access for testing.

## Launch Metrics

- Free to Student conversion
- Taster to paid conversion
- Student to Scholar upgrade rate
- Course start rate
- Course completion rate
- Churn by tier
- Average AI queries per paid user
- Gross margin after Stripe, AI, Supabase, and Vercel costs
