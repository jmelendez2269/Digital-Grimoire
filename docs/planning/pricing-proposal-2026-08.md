# Prismarium Pricing — Clean-Slate Proposal (August 2026, revised)

Ignores the existing tier documents. Starts from a full inventory of what Prismarium actually
does today, live, in code — not what the old tier docs described.

> **Revision note.** The first draft of this proposal collapsed to two tiers because it only
> priced courses and Parallax queries. That was too narrow — it missed real, live, valuable
> features (The Working, premium voices) that deserve their own place in the ladder. This
> version inventories everything and prices accordingly, and separates the two purchase paths
> — subscribe vs. buy a single course — that the first draft conflated.

---

## Full feature inventory

| Feature | Status | Marginal cost | Currently gated? |
|---|---|---|---|
| Library, search, annotations, collections | Live | ~$0 | No — always free |
| Knowledge graph | Live | ~$0 | No — always free |
| Courses (workbook, digests, synthesis artifacts) | Live, small catalog | ~$0 | Yes — the one real wall |
| Seven Lenses (7-lens AI reasoning) | Live | Real, metered on this path | Nominally, not enforced (§below) |
| Deep search | Live | Real, **unmetered** | Checked, never recorded |
| Concept search | Live | Real | Free-vs-paid only |
| Lens expansion (`/api/parallax/lens/[id]`) | Live | Real, **unmetered** | Not checked at all |
| **The Working** — generative ritual synthesis, correspondence-graph-grounded, casting log, astronomical conditions, sharing | **Live**, more built than the wiki says | Real (~0.7¢/ritual on Haiku per the design doc) | **Not gated at all** |
| Journal | Live | ~$0 | Free-tier cap only |
| Text-to-speech, standard voices | Live | Small, per-character | No |
| Text-to-speech, premium Azure voices | Live | Higher, per-character | **Cosmetic only — no enforcement** |
| Workbench "rituals" catalog | **Mock data**, not real | — | N/A — don't price this |
| Practitioner tools (tarot etc.) | `/practitioner` redirects into workbench — no distinct feature exists yet | — | N/A |

The honest reading: you have **two AI capabilities**, not one — Seven Lenses (study companion,
reasons over the library) and The Working (practice companion, generates rituals from the
graph) — and a **quality axis** (TTS voice tier) that's currently free to everyone. None of
that showed up in the first draft.

---

## The structure: three tiers, each with something you can point at

### The Reader — Free

- Library, graph, search, annotations, collections — unlimited
- Taster courses
- Journal: 25 entries
- **3 AI actions/month**, pooled across Seven Lenses and The Working, resetting monthly
- Standard TTS voices only

*Job: the best free esoteric library online, and a real taste of both AI tools — not a
one-and-done trial.*

### The Student — $15/month or $150/year

- Every course, workbook, and synthesis artifact
- Unlimited journal
- **60 AI actions/month**, pooled across Seven Lenses, deep search, concept search, and The
  Working
- Standard TTS voices
- The Working: full casting log, conditions, private by default

*Job: the guided-study membership. Everything you need to actually work through a course and
use both AI tools regularly.*

### The Adept — $32/month or $320/year

Everything in Student, plus the things that cost more or represent deeper practice:

- **200 AI actions/month**, same pool
- **Premium Azure voices** for TTS — this is the one place a real cost differentiator already
  exists in the code, it's just not wired up (§ Prerequisites)
- Lens expansion / deep-dive mode — the per-lens follow-up questions, kept out of Student
  because it's the multi-call, more expensive path
- The Working: publish to community sharing, once that ships
- Priority support, early access to new courses

*Job: for the people who are in this daily — heavy AI users, practitioners who want the nicer
voice, the ones who'd resent hitting the Student pool's ceiling.*

### The Patron — $60/month or $600/year *(optional, launch later)*

Everything in Adept, priced on identity rather than features: name in credits, a vote on which
course gets built next, first look at anything experimental. Skip this until the base three
tiers are proven — nothing depends on it existing at launch.

---

## The two purchase paths — subscription vs. single course

You asked for this explicitly, and the first draft blurred it. Here's the actual split.

### Path A — Subscriber ("unlock everything")

Pays monthly or annually, gets the tier's full bundle as above: every course, the AI pool for
that tier, TTS at that tier's voice quality. This is the default path and should be the one
the homepage sells hardest.

### Path B — Course buyer (one-time, no subscription)

For someone who wants exactly one course and refuses recurring billing. This is **not** a
scaled-down subscription — it's a scoped bundle that has to include enough of everything else
to actually complete the course:

- The single course: workbook, digests, synthesis artifacts — **lifetime access**
- **30 AI actions**, one-time, non-renewing, usable on Seven Lenses or The Working — enough to
  clear the course's built-in AI exercises (`lens_engine`/`deep_search` prompts appear most
  weeks) without being a backdoor to unlimited use
- Journal: unlimited *for entries tagged to that course* (simplest: just lift the cap outright,
  the cost is ~$0)
- Standard TTS voices

**Price: $79.** Below half of the $150 annual price, a subscription always wins by the second
course — so this floor is what keeps the two paths from cannibalizing each other. Above the
$60/2-billing-cycle floor a monthly subscriber could hit by subscribing-and-cancelling, so the
one-time buyer isn't quietly getting a better deal than a subscriber would for the same content.

**What a course buyer does *not* get:** any other course, the ongoing monthly AI pool, premium
voices, or community sharing on The Working. If they want more than one course, the subscription
is the obviously better deal — which is the point.

**Upgrade path:** if a course buyer subscribes within 60 days, credit the $79 toward their first
payment. Recovers the ones who liked it enough to want more.

---

## Why this shape, plainly

**Two AI tools, one pool.** Seven Lenses and The Working are different experiences but the same
kind of resource (a metered model call), so they should draw from the same allowance rather than
each getting their own separately-tracked cap. Simpler to explain, simpler to enforce, and it
stops you from having to decide in advance which tool someone cares about more.

**The premium-voice tier is free money you're leaving on the table.** The code already
distinguishes premium voices from standard ones — `isPremium: true` is sitting right there. It
currently does nothing. Wiring it to Adept is close to zero net-new engineering for a genuine
differentiator, unlike inventing something from scratch.

**Three tiers, not four,** because The Working and Seven Lenses genuinely split into "everyday
use" (Student) and "heavy/deeper use" (Adept) — that's one real boundary, not two. A fourth tier
would need a second real boundary and nothing in the current feature set supplies one yet.

**The Working stays ungated in this draft's numbers only insofar as it's now correctly counted**
— it was previously priced at zero implicitly by being ignored. It now pulls its weight in every
tier's AI pool and is the main reason Adept exists.

---

## What has to be true before this can ship

1. **The AI pool must be enforced everywhere it's promised.** Right now: Seven Lenses records
   correctly, deep search checks but never records, lens expansion doesn't check at all, and
   The Working's cast endpoint has no tier or rate check whatsoever. All four need to draw from
   the same counter before "60 actions/month" means anything.
2. **Premium voices need an actual gate.** One conditional checking tier before returning the
   Azure voice list instead of the Web Speech fallback.
3. **Course-buyer entitlements need a real model.** Today, paid access is a single
   `subscription_status` column on the user. A course-buyer needs a *per-course* grant that
   survives without a subscription — that's new schema, not a pricing decision.
4. **A public pricing page.** Three tiers plus one path split is still simple enough to fit on
   one page a stranger can read before signing in.
5. **Webhook must fail closed** on an unrecognized Stripe price — today it defaults to
   provisioning Scholar-equivalent access.
6. **Pin `PARALLAX_LENS_MODEL`/`WORKING_SYNTHESIS_MODEL`** in production and confirm actual
   per-action cost. Every number above assumes something in the ballpark of the design doc's
   own estimate (~0.7¢ for a Working synthesis); if the deployed model differs, the pool sizes
   need re-checking, not the tier structure itself.

None of this is a reason to wait on deciding the shape — it's the build list once you've picked
one.

---

## Side-by-side

| | Old plan (Aug audit) | First draft (this doc, v1) | This proposal |
|---|---|---|---|
| Tiers | Free/$15/$29/$49 | Free/$15 (+$40 patron) | Free/$15/$32 (+$60 patron) |
| What separates paid tiers | Query count only | Nothing — one paid tier | AI pool size, voice quality, Working depth |
| The Working | Not priced at all | Not priced at all | Priced — the reason Adept exists |
| Premium voices | Not priced, not gated | Not priced, not gated | Priced, gated to Adept |
| Course-only buyer | Undefined | Undefined | Defined: $79, scoped bundle, own AI allowance |
| Free AI | 1 query, lifetime | 3/month | 3/month, pooled across both tools |
