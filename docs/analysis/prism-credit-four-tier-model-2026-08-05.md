# Prismarium four-tier credit model

**Date:** August 5, 2026  
**Status:** Internal recommendation. Not approved for publication or implementation.  
**Supersedes for tier design:** The active recommendation in the August 4 clean-room analysis and the August 5 membership-options document. Their product inventory remains useful, but their three-tier packaging recommendation is no longer current.

## Decision

Use four plans: **Reader, Student, Scholar, and Adept**.

- Separate **course capacity** from **generative-tool capacity**.
- Keep reading, ordinary search, the Knowledge Graph, note-taking, accessibility tools, and saved results outside the credit system.
- Give every account monthly **Prism Credits** for actions that create a new AI-generated result.
- Let occasional tool-only members stay on Reader and buy a top-up.
- Make Student the focused course plan, Scholar the complete research membership, and Adept the high-volume capacity plan.
- Do not describe any generative plan as unlimited. A "modest cap" is still a cap; **high-volume access** is the honest promise.

## Recommended public prices and capacity

| Plan | Monthly | Annual | Prism Credits each month | Full paid-course capacity | Primary use |
|---|---:|---:|---:|---|---|
| **Reader** | **$0** | **$0** | **10** | None; complete free orientation plus previews | Explore and use tools occasionally |
| **Student** | **$19** | **$190** | **30** | **1 active released course at a time** | Follow one guided path |
| **Scholar** | **$39** | **$390** | **100** | **Any number of released courses** | Research independently; courses optional |
| **Adept** | **$69** | **$690** | **300** | **Any number of released courses** | High-volume research and practice |

Annual prices equal ten monthly payments, a transparent 16.7% discount. Annual members should receive credits monthly, not as one annual lump sum.

Existing $15 / $29 / $49 subscribers may be grandfathered as Founding members. New public sales should not use the higher prices until the wallet, course-slot rules, and metering are reliable.

Scholar should be the visually recommended plan. Adept is not "more enlightened" or a better course; it is a capacity plan for people who use the generative tools heavily.

## Why Reader should not receive any paid course it chooses

Reader can have one complete course: the free PRE orientation path. It can also see the catalog, course previews, and ideally the first week or a representative lesson from released paid courses.

Reader should **not** be allowed to activate any paid course one at a time. If both Reader and Student can eventually complete the same paid catalog sequentially, Student becomes a bundle of extra credits rather than the accessible learning membership. That weakens the clearest paid value boundary.

The clean distinction is:

- **Reader:** the complete free orientation course and paid-course previews.
- **Student:** one complete paid learning path at a time.
- **Scholar and Adept:** all released paths available simultaneously; taking a course is always optional.

## What costs Prism Credits

Use "Prism Credits" rather than "AI tokens." Provider tokens are a technical billing unit and "tokens" can also sound like cryptocurrency. A small prism or spark icon can keep the system playful without making it vague.

| Action | Credits | Notes |
|---|---:|---|
| Open or reopen a saved result | **0** | Never meter reading something already created |
| Library, catalog, and ordinary concept search | **0** | Database/search feature, not generation |
| Knowledge Graph exploration | **0** | Core research infrastructure |
| Journal, annotations, bookmarks, and collections | **0** | Personal knowledge work should not feel taxed |
| Browser read-aloud | **0** | Accessibility feature |
| Seven Lenses, standard synthesis | **2** | Includes the initial multi-lens summary and synthesis |
| Seven Lenses, long synthesis | **3** | One-credit length surcharge |
| Expand one lens into a detailed answer | **1** | Separate full-context generation |
| Deep Search, fresh synthesis | **3** | The present highest-cost live text action |
| Exact cached Deep Search result | **0** | No new provider generation; label it as a free cache result |
| The Working | **1** | Includes semantic intent resolution when necessary |
| Future AI card/image generation | **5 provisional** | Do not advertise until the feature is production-ready and re-costed |

Automatic retries never cost another credit. A member-requested regeneration is a new action and costs the displayed amount.

### Why Deep Search is three credits, not two

The current Deep Search sends as many as fifteen nearly 2,000-token library chunks to Claude Sonnet 5 and permits 4,096 output tokens. At Sonnet 5's standard post-launch pricing of $3 per million input tokens and $15 per million output tokens, an approximately 31,000-input / 4,096-output maximum-shaped request costs about **$0.154** before embeddings and infrastructure.

Three credits therefore imply a conservative internal reserve of roughly **$0.05 per credit**. Seven Lenses can remain two credits because its initial response truncates retrieval context. In the checked local configuration it uses Qwen through OpenRouter at dramatically lower rates; the production route still needs to be pinned and verified. Its flagship value deserves more than a one-credit Working even when its provider cost is small.

Provider prices are inputs to internal safeguards, not the customer value story. Prism Credits purchase useful actions, not pass-through API tokens.

Cost references: [Anthropic's Sonnet 5 pricing announcement](https://www.anthropic.com/news/claude-sonnet-5), [Anthropic's Haiku 4.5 pricing announcement](https://www.anthropic.com/news/claude-haiku-4-5), and [OpenRouter's Qwen3 Next 80B A3B Instruct pricing](https://openrouter.ai/qwen/qwen3-next-80b-a3b-instruct/pricing). Repository call structure is visible in the [Deep Search route](../../app/src/app/api/parallax/ai-search/route.ts), [Seven Lenses orchestrator](../../app/src/lib/parallax/lens-orchestrator.ts), and [Working synthesis](../../app/src/lib/working/synthesize.ts).

## What each allowance feels like

| Plan | Seven Lenses at 2 each | Deep Searches at 3 each | Workings at 1 each |
|---|---:|---:|---:|
| Reader — 10 | 5 | 3, with 1 credit left | 10 |
| Student — 30 | 15 | 10 | 30 |
| Scholar — 100 | 50 | 33, with 1 credit left | 100 |
| Adept — 300 | 150 | 100 | 300 |

These are deliberately single-action equivalents. A normal month will be a mix.

Reader can try each currently live generative tool once — Seven Lenses (2), Deep Search (3), and The Working (1) — and still have four credits left. This is a real taste rather than a single high-stakes trial.

## Why 30 Student credits cover coursework

The three currently open courses contain at most about one suggested Prismarium tool practice per week. Those practices are optional or offer choices among ordinary Search, Seven Lenses, and the Graph. Search and Graph cost zero.

Even if a Student used a two-credit Seven Lenses synthesis for four weekly practices, coursework would use about **8 credits in a month**, leaving 22 for exploration. If a future course instead called for four three-credit Deep Searches, it would use 12, leaving 18.

This means the credit model can replace most of the difficult "course-aware access" system. Curriculum rules should still protect learners:

1. No course may require more than one generative action per week without granting bonus course credits.
2. Every generative practice should have a zero-credit manual, Library, ordinary Search, or Graph alternative.
3. If a specific AI result becomes mandatory for completion, the course must grant the needed credits rather than force an upgrade.

## Full feature and entitlement table

| Feature | Reader | Student | Scholar | Adept |
|---|---|---|---|---|
| Public videos and resources | Included when published | Included | Included | Included |
| Full Library reading | Included | Included | Included | Included |
| Ordinary Library/concept search | Unlimited | Unlimited | Unlimited | Unlimited |
| Knowledge Graph | Unlimited | Unlimited | Unlimited | Unlimited |
| Highlights, annotations, bookmarks, collections | Included | Included | Included | Included |
| Browser read-aloud | Included | Included | Included | Included |
| Active Journal pages | 50 | Unlimited | Unlimited | Unlimited |
| Complete free orientation path | Included | Included | Included | Included |
| Paid-course previews | Included | Included | Included | Included |
| Active released paid courses | None | 1 at a time | Unlimited | Unlimited |
| Workbooks, artifacts, digests, and capstones | Free-course work | Active course | All released courses | All released courses |
| Review completed paid courses | — | Included while entitled | Included | Included |
| Monthly Prism Credits | 10 | 30 | 100 | 300 |
| Seven Lenses | Uses credits | Uses credits | Uses credits | Uses credits |
| Deep Search synthesis | Uses credits | Uses credits | Uses credits | Uses credits |
| The Working, after repair | Uses credits | Uses credits | Uses credits | Uses credits |
| Saved result history | Included | Included | Included | Included |
| Community areas | Included | Included | Included | Included |
| Credit top-ups | Available | Available | Available | Available |
| Early previews/studio notes | Occasional public material | Possible member bonus | Possible member bonus | First access may be a bonus |
| Future honest completion certificate | — | Included, no credit charge | Included, no credit charge | Included, no credit charge |

Early previews, studio notes, and creator material are bonuses. They are not needed to justify the subscription and should not carry a promised cadence.

## Course-slot rules

"One course open" should mean **one active guided paid course**, not one browser tab and not one lifetime choice.

- Free orientation/taster paths do not consume a paid-course slot.
- A Student may activate one released paid course.
- Activating another pauses the current course after a clear confirmation.
- Pausing preserves progress, Journal work, annotations, artifacts, and contributions.
- A completed course no longer consumes the active slot and remains available for review while the member is entitled.
- Scholar and Adept have no personal concurrency limit on released courses.
- Credits never purchase course slots.
- On downgrade, the member chooses the course that remains active; nothing is deleted.
- Unreleased courses cannot reserve a slot.

The application cannot safely enforce this yet. Enrollment does not currently support active/paused status, and course-level completion is not reliably persisted. Course concurrency is therefore a launch requirement, not present-tense marketing copy.

## Top-ups

Offer small bursts without making a lower tier plus recurring packs a better deal than upgrading.

| Pack | Price | Price per credit | Conservative AI reserve at $0.05/credit |
|---|---:|---:|---:|
| 10 credits | **$6** | $0.60 | $0.50 |
| 30 credits | **$16** | $0.53 | $1.50 |
| 75 credits | **$36** | $0.48 | $3.75 |

The upgrade math remains healthy:

- Reader + 75 costs $36 for 85 total monthly credits; Scholar costs $39 for 100 plus the complete course catalog and unlimited Journal.
- Student + 30 costs $35 for 60; Scholar costs $39 for 100 plus unlimited course concurrency.
- Student + 75 costs $55 for 105; Scholar is $16 less for almost the same capacity and a much broader entitlement.
- Scholar + 75 costs $75 for 175; Adept costs $69 for 300.

A small top-up is intentionally sensible for an unusual month. Repeated or large usage makes the next plan the better value. After two consecutive top-up months, show a friendly prorated upgrade comparison.

Top-ups should be available to Reader. That creates the requested path for someone who only wants occasional tools and neither wants courses nor another subscription. A frequent tool-only user receives better unit economics with Scholar.

## Credit lifecycle

### Included monthly credits

- Reader credits reset monthly and do not roll over.
- Paid credits roll over for one additional billing period, capped at twice the monthly grant: Student 60, Scholar 200, Adept 600.
- Consume the credits nearest expiration first.
- Annual plans receive monthly grants.
- Upgrades grant the difference between tier allowances for the current period; they do not create a duplicate full grant.
- Downgrades take effect at renewal.

### Purchased credits

- Keep them in a separate ledger from included credits.
- Purchased credits do not expire while the account exists, subject to final legal/accounting review.
- Use expiring included credits before purchased credits.
- Purchased credits remain usable for Reader-accessible tools after subscription cancellation.
- Refunds and payment disputes require ledgered reversals; never silently mutate a balance.

### Charging and failures

1. Show the exact credit cost before the member starts.
2. Reserve the credits atomically with an idempotency key.
3. Commit only when a usable result has been delivered or saved.
4. Release the reservation on provider errors, timeouts, empty results, moderation failures, or an unusable response.
5. Infrastructure retries are part of the original action and never cost more.
6. Never allow a negative wallet balance.

## Cost stress test

Use **$0.05 per consumed credit** as the initial internal reserve. It is intentionally conservative and reflects Deep Search at approximately three credits for a possible $0.15 provider call.

| Plan | Revenue | Monthly credits | Cost at 25% use | Cost at 100% use | AI-only margin at 100% use |
|---|---:|---:|---:|---:|---:|
| Reader | $0 | 10 | $0.13 | $0.50 | Not applicable |
| Student | $19 | 30 | $0.38 | $1.50 | 92.1% |
| Scholar | $39 | 100 | $1.25 | $5.00 | 87.2% |
| Adept | $69 | 300 | $3.75 | $15.00 | 78.3% |

These are AI-variable margins only. Payment processing, hosting, storage, moderation, support, taxes, and the creator's labor remain outside the table.

At the free tier, ten credits and the three-credit Deep Search weight hold maximum normal generative exposure close to **$0.50 per fully consuming Reader per month**. Add verified email, bot protection, velocity limits, and an account-level monthly grant before making the allowance renewable.

## Why Adept can return now

Adept did not previously have enough distinct value when it was essentially Scholar plus an arbitrary larger query counter. A unified credit wallet changes that: Adept becomes an honest high-capacity plan with three times Scholar's monthly generative use.

It still should not be framed as a status rank, secret doctrine, or certificate tier. Its job is simple:

> Everything in Scholar, with enough monthly capacity for sustained, high-volume use.

That is a legitimate usage-based distinction. It does not require constant YouTube output, live instruction, or invented exclusives. If real Adept demand does not appear, the plan can remain visually quiet while Scholar stays recommended.

## YouTube and creator-content policy

The value model remains self-sustaining without a constant video schedule. Membership pays for an enduring Library, course archive, Knowledge Graph, Journal, saved research, and usable tools.

Safe promise:

> Prismarium will continue to offer substantial free public videos and resources.

Do not promise that every future video or every kind of creator content will always be free. Occasional studio notes, previews, research logs, or member conversations can live inside the membership without becoming a weekly production obligation.

## Launch gates

Do not publish the table until these are true:

1. Build an append-only credit ledger with atomic reserve/commit/release behavior.
2. Meter every callable generative endpoint, including Seven Lenses details, Deep Search, The Working, and any future image generator.
3. Disable or meter unused generic AI endpoints.
4. Fix Deep Search's current non-recording behavior and The Working's response contract.
5. Add enrollment states, course-slot enforcement, explicit completion, and downgrade handling.
6. Prevent users from directly editing subscription status, wallet balances, or enrollment state.
7. Make Stripe checkout server-whitelisted and webhook fulfillment service-role, idempotent, and refund-aware.
8. Show price, balance, reset date, and failure refund behavior in the interface.
9. Pin production model routes and log actual per-feature input, output, provider, and cost.
10. Review utilization, failed runs, Reader cost, and plan exhaustion after 60–90 days; change allowances only with grandfathering or clear notice.

## Calibration triggers

- Target ordinary paid AI cost below 10–15% of subscription revenue.
- If fewer than 20% of paid credits are used, test whether the wallet creates anxiety or allowances are needlessly high.
- If more than 15% of members exhaust credits for two consecutive months, inspect action weights and product fit before pushing upgrades.
- If average Reader AI cost rises above $0.50 per monthly active Reader, reduce abuse and optimize Deep Search before cutting the accessible foundation.
- If Adept members regularly use more than 70% of 300 credits, the tier has proven demand; consider a separately priced custom-capacity option rather than saying "unlimited."

## Recommendation in one line

**Reader 10 / Student 30 / Scholar 100 / Adept 300, with 0-credit core research, 1-credit simple generation, 2-credit Seven Lenses, 3-credit Deep Search, and honest top-ups.**
