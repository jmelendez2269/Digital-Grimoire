# Pricing & Packaging Audit — August 2026

Scope: the four subscription tiers, annual pricing, and the (unbuilt) à la carte course
offering. Sources reconciled: the subscriptions wiki, `SubscriptionTab.tsx`, the rate limiter,
course/concept access code, the Parallax API routes, the Stripe routes, migration 025, and the
business plan.

> **Revision note.** An earlier draft of this document recommended gating Seven Lenses to
> Scholar+, treated annual pricing as shipped, and reported margins as settled. All three were
> wrong. Corrected below; see §2.2, §5, and §4 respectively.

---

## 1. Ground truth

| Dimension | Wiki | UI | Enforced in code | Agree? |
|---|---|---|---|---|
| Free — AI queries | 5 / month | "5 AI queries per month" | **1, lifetime, no reset** | ✗ |
| Free — journal limit | 25 pages | 25 pages | **50 entries, unarchived only** | ✗ |
| Student — price | $15 | $15 | Stripe price ID | ✓ |
| Student — AI queries | 5 / month | 5 / month | 5 / period | ✓ |
| Scholar — price | $29 | $29 | Stripe price ID | ✓ |
| Scholar — AI queries | 25 / month | 25 / month | 25 / period | ✓ |
| Scholar — Seven Lenses | Scholar-only | Listed under Scholar | **not gated to Scholar** | ✗ |
| Scholar — concept search | Scholar-only | Listed under Scholar | **not gated to Scholar** | ✗ |
| Adept — price | $49 | $49 | Stripe price ID | ✓ |
| Adept — "early access" | Listed | Listed | **not implemented** | ✗ |
| Annual — all tiers | $120/$240/$420 | not offered | **no annual price IDs exist** | ✗ |
| Tier prices (migration 025) | — | — | **"$5 / $9.99 / $15"** | ✗ |

---

## 2. Drift and enforcement bugs

### 2.1 The free tier promises a monthly allowance and delivers a lifetime one — HIGH

The UI tells free users "5 AI queries per month." The code gives one query, ever:

```ts
const FREE_TIER_LIMIT = 1; // Lifetime trial — 1 query ever, no monthly reset
```
[rate-limit.ts:11](../../app/src/lib/parallax/rate-limit.ts#L11)

`getPeriodStart` returns `new Date(0)`, `getPeriodEnd` returns `2099-01-01`, so the counter never
resets ([rate-limit.ts:166-215](../../app/src/lib/parallax/rate-limit.ts#L166-L215)). The wiki
compounds it by quoting `FREE_TIER_LIMIT = 5` as if reading the source.

A 1-query lifetime cap is a *trial*, not a free tier. Either is defensible; advertising one and
shipping the other is not.

### 2.2 Scholar has no enforced differentiator — HIGH

Scholar's two advertised exclusives are both available to Student:

- **Seven Lenses** — `PremiumGate` admits anyone where `isPremium || rateLimitRemaining > 0`
  ([PremiumGate.tsx:20](../../app/src/components/parallax/PremiumGate.tsx#L20)), and `isPremium`
  means any paid tier.
- **Concept search** — gated at exactly `tier === 'free'`
  ([api/concepts/route.ts:57](../../app/src/app/api/concepts/route.ts#L57)).

Enforced Student → Scholar delta: **20 extra queries for +$14/mo.** Student dominates Scholar for
any informed buyer.

**Do not fix this by gating Seven Lenses to Scholar.** Two reasons:

1. Seven Lenses is the *only* surface that spends a metered query — `recordQuery` is called from
   one file ([streaming.ts:29,89](../../app/src/lib/parallax/streaming.ts#L29)). Gate it to
   Scholar and Student's advertised 5 queries become unspendable.
2. It is wired into paid course content. `lens_engine` is a course exercise type, and the learner
   UI renders a **"Run in Seven Lenses"** button with the prompt pre-filled
   ([learn/page.tsx:875-879](../../app/src/app/courses/[slug]/learn/page.tsx#L875-L879)). Gating it
   puts a paywall inside an 8-week course Student already paid for, once per exercise.

The same trap applies to concept search — it is also a course exercise target (`deep_search`).

**Instead:** keep both in Student and give Scholar a differentiator gated on *depth*, not access.
The per-lens expansion endpoint (`/api/parallax/lens/[lensId]`) is already separate, so gating it
is a small change, and it places the upsell exactly where the user asks for more.

### 2.3 Metering is broken on two of three AI surfaces — HIGH

| Surface | Checks limit | Records usage |
|---|---|---|
| Seven Lenses ([streaming.ts](../../app/src/lib/parallax/streaming.ts#L29)) | ✓ | ✓ |
| Deep Search ([ai-search:162](../../app/src/app/api/parallax/ai-search/route.ts#L162)) | ✓ | **✗** |
| Lens expansion ([lens/[lensId]:30](../../app/src/app/api/parallax/lens/[lensId]/route.ts#L30)) | **✗** | **✗** |

Deep Search reads the counter and never increments it. Combined with §2.1 — a free user who never
runs a Seven Lenses query keeps `remaining: 1` permanently — that is **unlimited Deep Search,
forever, at your cost.** Lens expansion has authentication and nothing else.

One counted "query" is also up to 8 model calls (7 lenses + synthesis).

### 2.4 Stripe webhook fails open upward — MEDIUM

`getTierFromPriceId` returns `'scholar'` for any unrecognized price ID
([webhook/route.ts:27-28](../../app/src/app/api/stripe/webhook/route.ts#L27-L28), duplicated in
`sync-subscription`). A misconfigured or missing env var provisions $29 entitlements for a $15
checkout. This becomes materially worse the day annual ships, since annual price IDs are not
mapped at all.

### 2.5 Checkout accepts an unvalidated price ID — MEDIUM

[create-checkout-session/route.ts:59](../../app/src/app/api/stripe/create-checkout-session/route.ts#L59)
accepts a raw `priceId` from the request body and validates only its *format* (`startsWith('price_')`),
not that it is one of your three prices. The preferred `tier` path resolves from env vars safely, but
the raw path remains accepted.

### 2.6 Journal cap mismatch and archive bypass — LOW

Docs and UI say 25 pages; code enforces `JOURNAL_CAP = 50` and counts only rows where
`is_archived = false` ([journal/route.ts:101-117](../../app/src/app/api/journal/route.ts#L101-L117)),
so archiving resets the cap.

### 2.7 Stale price comment in migration 025 — LOW

Still reads "$5 … $9.99 … $15" ([025:14](../../migrations/025_add_subscription_tiers.sql#L14)).

---

## 3. Tier structure

| Boundary | Trigger | Verdict |
|---|---|---|
| Free → Student | "I want to start a real course" | **Strong.** Concrete and early. |
| Student → Scholar | "I ran out of queries at 5" | **Broken.** §2.2 — nothing else is enforced. |
| Scholar → Adept | "I ran out of queries at 25" | **Thin.** Same metric again, +$20. |

Free → Student is the healthy boundary and it carries the model. Both paid boundaries gate on the
same single metric, so Scholar and Adept aren't different products — they're the same product at
three volumes.

**Value metric problem.** The wiki says pricing is "centered on guided study, not raw AI usage,"
but queries are the only thing that moves across the paid tiers. The ladder is built entirely on
the axis you publicly say doesn't matter. Courses — concurrent enrollments, or courses per year —
would align the ladder with the stated thesis. Large change; treat as direction.

**Funnel gap.** There is no public pricing page. Tiers are visible only behind login at
`/profile?tab=subscription`, which is a poor arrangement for a model whose Free → Student
conversion carries everything.

---

## 4. Unit economics — assumption-dependent, not settled

At the wiki's own $0.12/query assumption, worst case (full allowance, Stripe 2.9% + $0.30):

| Tier | Revenue | Fees | AI at full use | Margin | Margin % |
|---|---|---|---|---|---|
| Student | $15.00 | $0.73 | $0.60 | $13.67 | 91.1% |
| Scholar | $29.00 | $1.14 | $3.00 | $24.86 | 85.7% |
| Adept | $49.00 | $1.72 | $6.00 | $41.28 | 84.2% |

**Treat these as illustrative, not measured.** Three things undermine them:

1. **The model isn't pinned.** Lens calls use `PARALLAX_LENS_MODEL || getDefaultOpenRouterModel()`
   ([lens-orchestrator.ts:316](../../app/src/lib/parallax/lens-orchestrator.ts#L316)), which falls
   back to `deepseek/deepseek-v4-flash:free`
   ([openrouter-client.ts:4](../../app/src/lib/ai/openrouter-client.ts#L4)). Actual per-query cost
   depends on deployment env vars not visible in the repo — it could be ~$0 or many times $0.12.
2. **The meter undercounts** (§2.3). Two of three AI surfaces record nothing.
3. **Fan-out isn't in the model.** One "query" is up to 8 model calls.

Break-even per query at current prices: Student $2.85, Scholar $1.11, **Adept $0.95**. Note the
inversion — the most expensive tier has the *lowest* cost tolerance, so Adept breaks first on any
model upgrade.

**Unbounded:** "unlimited journal pages" on all paid tiers has no boundable worst case. Storage is
cheap enough that this is likely fine, but nothing caps it.

---

## 5. Annual pricing — documented, not shipped

$120/$240/$420 appear in the wiki, the checkout route comments, and the business plan. **They do
not exist as Stripe prices.** There are no annual price ID env vars, no `interval` handling in the
checkout route or webhook, and the wiki itself says "Annual plans, *when enabled*, should map to:"
([subscriptions.md:135](../../app/src/content/wiki/technical/subscriptions.md#L135)).

As a *plan*, the numbers are wrong twice over:

| Tier | Monthly | Documented annual | Implied discount |
|---|---|---|---|
| Student | $15 | $120 | 33.3% |
| Scholar | $29 | $240 | 31.0% |
| Adept | $49 | $420 | 28.6% |

Inconsistent (4.8-point spread, shrinking as the customer spends more), and roughly double the
"two-month discount" the business plan specifies
([Business_Plan.md:279](../source/Business_Plan.md#L279)) — that's 16.7%.

Because nothing has shipped, correcting this is free right now: **$150 / $290 / $490**. No
migration, no grandfathering, no existing annual subscribers. It gets expensive after launch.

---

## 6. À la carte course sales (not built)

No implementation. Nearest thing is a backlog entry: "Lifetime access | P2 | One-time payment |
Planned" ([FEATURE_BACKLOG.md:763](../planning/FEATURE_BACKLOG.md#L763)).

**The subscribe-and-cancel floor is the wrong anchor.** An 8-week course spans two billing cycles,
so a monthly subscriber can complete one course for $30 and cancel — but that user was never going
to pay a lifetime price anyway. The customer who actually matters is the year-round light
subscriber, and the binding question is what happens at their *second* course.

The rule: a buyer routes into a subscription at course #2 when `2 × P > annual price`. So the floor
is **half the annual price**, not two months of monthly.

| Annual price | Per-course at 2/yr | À la carte floor |
|---|---|---|
| $120 (as documented) | $60 | > $60 |
| $150 (recommended, §5) | $75 | > $75 |

- **$79 per course, lifetime access**, assuming annual lands at $150. That puts the subscription
  ahead from the second course onward while capturing buyers who want one course and refuse
  recurring billing.
- Below ~$60 it cannibalizes outright.
- Offer purchase credit toward a subscription within 30–60 days to recover one-course buyers.
- Margin is not the constraint here — even $39 clears 90%+. Cannibalization sets this price.

**The SKU has to bundle more than content.** A purchaser stays `subscription_status = 'free'`, which
means 1 lifetime Parallax query against a course format with a Parallax exercise most weeks, and a
50-entry journal cap. Selling course access alone ships a course the buyer cannot complete. Any
à la carte SKU needs a query allowance and a journal-cap lift attached.

**Inventory limits this.** Course availability is env-gated through `getCourseReleaseStatus`
([presentation.ts:130](../../app/src/lib/courses/presentation.ts#L130)), and only a small subset of
the authored catalog is currently `open-now`. Confirm sellable inventory before building the SKU —
à la carte needs a catalog to browse.

**Blockers before this can ship:**

- [webhook/route.ts:79](../../app/src/app/api/stripe/webhook/route.ts#L79) gates on
  `session.mode === 'subscription'`; the checkout route already accepts `mode: 'payment'`, so a
  one-time payment would charge the card and grant nothing.
- `hasPaidCourseAccess(profile)` ([courses/access.ts:163](../../app/src/lib/courses/access.ts#L163))
  answers a user-level question; à la carte needs per-user-per-course entitlement.
- `getFreeLibraryTextIds` ([library/access.ts:20](../../app/src/lib/library/access.ts#L20)) takes no
  user parameter, so purchasers would not be able to read their own course's texts.
- "Lifetime" needs a written definition covering readings and digests.

---

## 7. Recommendations

| # | Change | Why | Effort |
|---|---|---|---|
| 1 | Record usage in `ai-search`; add tier + rate checks to the lens expansion route | Unlimited free AI at real cost (§2.3) | Small |
| 2 | Make free-tier messaging match enforcement — or restore the monthly reset | UI promises what the product doesn't do (§2.1) | Trivial |
| 3 | Give Scholar a real differentiator via lens *depth*; leave Seven Lenses and concept search in Student | Scholar is currently dominated (§2.2) | Small |
| 4 | Set annual to $150/$290/$490 before launching annual | Free to fix now, expensive later (§5) | Trivial |
| 5 | Make webhook fail closed on unknown price IDs | $15 checkout can provision $29 (§2.4) | Trivial |
| 6 | Allowlist `priceId` in checkout | Client can name any price in the account (§2.5) | Trivial |
| 7 | Pin `PARALLAX_LENS_MODEL` and instrument real per-query cost | Every margin number depends on it (§4) | Small |
| 8 | Fix journal cap docs + count archived rows | Cap is trivially bypassed (§2.6) | Trivial |
| 9 | Add a public pricing page | Tiers invisible before signup (§3) | Medium |
| 10 | Fix migration 025 comment | Stops a wrong number propagating (§2.7) | Trivial |
| 11 | Reconsider the value metric — courses, not queries | Aligns ladder with stated thesis (§3) | Large |

**#1 before anything else.** Everything else is pricing; that one is money leaving the building.

**#2 is a positioning call, not a bug fix.** A 1-query lifetime trial is legitimate — it just isn't
a free tier. If you keep it, say "1 free query to try it" and drop "per month" everywhere.

**#7 gates the honesty of §4.** Until per-query cost is measured rather than assumed, treat every
margin figure in this document as provisional.
