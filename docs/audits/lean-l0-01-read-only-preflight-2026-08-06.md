# LEAN-L0-01 read-only production, schema, migration-tree, and Stripe preflight

**Evidence date:** August 6, 2026  
**Packet:** `LEAN-L0-01`  
**Environment:** Prismarium production, linked Supabase project, and Vercel project `digital-grimoire-96dg`  
**Evidence boundary:** Read-only and privacy-safe. No production database row/schema, Stripe object, Vercel configuration, deployment, or public flag was changed.  
**Recommended packet state:** `verifying` pending Jen's review of the backup/rollback gap and authorization to proceed to `LEAN-L0-02` / `LEAN-L0-04`.

## Executive result

The production preflight is complete enough to establish the current truth, but it does **not** clear the system for a schema or sales change.

- The live database has material migration-ledger drift: the Supabase CLI's canonical tree has 14 valid migrations, the deployed ledger has 26, only 10 versions match, 4 are local-only, and 16 are remote-only.
- Seven exposed `public` tables have RLS disabled while `anon` and `authenticated` retain broad table privileges. The Supabase security advisor reports all seven as errors.
- A signed-in customer can update every column on their own `users` row, including `role`, `subscription_status`, Stripe identifiers, dates, and `tokens_earned`.
- Customer sessions can create/update/delete their own course enrollment rows, authenticated users can write the shared search cache, and `api_usage` accepts inserts under a `public` policy with `WITH CHECK (true)`.
- Production Vercel uses a live Stripe account. The configured Checkout offers still resolve to Student $15, Scholar $29, and Adept $49—not the approved lean $15/$39/$69 catalog.
- The live Stripe account has 6 active products, 9 Prices (6 active), and 0 subscriptions of any status. Production database projections still contain one Stripe customer reference and one subscription reference, so that projection is stale, foreign-account/test-mode, or otherwise unreconciled.
- The only live Stripe webhook points to `convergencelibrary.com`, which returns HTTP 301 to `projectparallax.xyz`. Its event allowlist does not match the deployed handler.
- The deployed webhook uses request/session authority rather than the service role and ignores database mutation errors before returning success. With no customer cookie on a Stripe webhook, the current `users` RLS policy prevents the intended write.
- The deployed generation surface contains multiple authenticated but unmetered entry points; the direct lens, generic chat, Working, cover, tarot-image, document-processing, and metadata routes can bypass the legacy query counter.
- No restorable physical backup timestamp or PITR window is available from Supabase. There is no local `backups/` directory and `pg_dump` is not installed. A database-changing packet must not begin until a fresh logical backup is created, hashed, stored, and restore-tested.

## 1. Deployed application identity

| Item | Evidence |
|---|---|
| Production aliases | `prismarium.xyz`, `www.prismarium.xyz` |
| Vercel target/state | `production` / `READY` |
| Deployment created | 2026-08-04 17:30:01 UTC |
| Deployed Git revision | `68d7f0b1211331f6228d58a9b4d9425adb816ffc` (`main`, “Merge branch 'develop'”) |
| Current local branch | `develop` at `e73061e` |
| High-risk route comparison | No diff between the deployed revision and local `HEAD` for Stripe, Parallax, Working generation, generic AI, tarot image, cover generation, course access, or the legacy limiter paths inventoried below |
| Rollback candidates | At least five recent Vercel deployments were returned, including ready revisions from August 3–4 |

Vercel rollback can restore application code and aliases. It cannot reverse a database migration, Stripe catalog mutation, subscription event, or customer credit mutation.

## 2. Canonical schema and migration-tree inventory

### 2.1 Repository trees

| Tree | Files | CLI-valid timestamped `.sql` | Role |
|---|---:|---:|---|
| `supabase/migrations` | 23 | 14 | Canonical for the linked Supabase CLI workflow |
| `migrations` | 48 | 0 under the CLI's 14-digit filename rule | Legacy/manual tree; not read by the linked CLI |
| `app/src/lib/supabase/migrations` | 12 | 10 | Application-local/manual tree; not read by the linked CLI |

All 83 files in these trees are Git-tracked. Nine files in `supabase/migrations` are `.bak` files and are explicitly skipped by the CLI.

### 2.2 Canonical versus deployed ledger

| Comparison | Count | Versions |
|---|---:|---|
| Present locally and remotely | 10 | `20260219210102`, `20260302213000`, `20260303135616`, `20260330000000`, `20260330000001`, `20260330000002`, `20260331000001`, `20260501000000`, `20260729000000`, `20260729000100` |
| Local canonical only | 4 | `20260515000000`, `20260518000000`, `20260519000000`, `20260730000200` |
| Deployed ledger only | 16 | `20260518135652`, `20260526174931`, `20260616184618`, `20260617004955`, `20260617173258`, `20260624164325`, `20260624165351`, `20260625135413`, `20260625193659`, `20260710151421`, `20260710151429`, `20260710151442`, `20260710151507`, `20260710151516`, `20260730182842` |

The deployed database, not any one repository file, is the present schema authority. Future work must reconcile forward into `supabase/migrations`; it must not replay the four local-only files or rename/reapply the 16 remote-only migrations without a reviewed equivalence map.

A schema-only `supabase db dump` was attempted as a read-only artifact, but the CLI requires Docker Desktop and Docker was unavailable. The empty temporary file was removed. Deployed truth was therefore collected through the migration ledger, Postgres catalogs, policies, grants, columns, and Supabase security advisor instead of a committed dump.

## 3. Effective production schema, RLS, grants, and functions

### 3.1 Aggregate state

| Metric | Result |
|---|---:|
| Exposed `public` tables | 68 |
| Tables with RLS enabled | 61 |
| Tables with RLS disabled | 7 |
| `public` RLS policies | 151 |
| `SECURITY DEFINER` functions in `public` | 17 |
| Anonymous-executable `SECURITY DEFINER` functions | 7 |

### 3.2 RLS-disabled tables with effective API-role writes

The following tables have RLS disabled. Both `anon` and `authenticated` have `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` table privileges:

1. `convergence_concepts`
2. `convergence_relationships`
3. `convergence_traditions`
4. `correspondence_entity_types`
5. `correspondence_relationship_types`
6. `knowledge_claims`
7. `knowledge_sources`

This is effective direct PostgREST authority, not merely a theoretical grant hidden by RLS. These seven errors must be included in `LEAN-L0-02` adversarial probes and closed by forward migration in `LEAN-L0-03`.

### 3.3 High-risk policies and grants

| Surface | Deployed authority | Risk |
|---|---|---|
| `users` | `UPDATE` for a row where `auth.uid() = id`; full table update privileges; no protected-column boundary | A customer can change `role`, `tokens_earned`, `subscription_status`, Stripe customer/subscription IDs, subscription dates, profile identity fields, and trial state on their own row |
| `course_enrollments` | Own-row `INSERT`, `UPDATE`, and `DELETE` | A customer can self-create/delete enrollment and write course, week, completion, and progress state rather than going through server authority |
| `api_usage` | `INSERT` policy is assigned to `public` with `WITH CHECK (true)` | Anonymous or authenticated callers can forge usage/cost evidence |
| `search_cache` | Authenticated `INSERT` with `WITH CHECK (true)`; public read | Any signed-in customer can poison or flood a shared cache |
| `ai_relevance_cache` | Public read; service-role insert/update | Write authority is appropriately service-scoped, but cached query material is world-readable |
| `provider_daily_usage` | Admin-only RLS management | Safer than `api_usage`, but customer table privileges remain broad and policy correctness is the only boundary |
| `journal_pages` | Own-row CRUD | Expected customer work authority, but the 50-active-page membership rule is not represented here yet |

### 3.4 Functions and advisor findings

Supabase's production security advisor returned:

- 7 `ERROR` findings for RLS disabled in the exposed `public` schema.
- 7 anonymous-executable and 7 authenticated-executable `SECURITY DEFINER` warnings covering affiliate/library summary RPCs and the two auth trigger functions.
- Mutable `search_path` warnings across application and trigger functions.
- 5 RLS-enabled tables with no policy, including the course-poll internals and `reading_blurbs` (fail-closed for API roles, but dependent server paths must be tested).
- Leaked-password protection disabled.

The trigger-returning `handle_new_user()` and `handle_user_update()` functions are exposed as executable even though they are intended for database triggers. The other five anonymous `SECURITY DEFINER` functions disclose affiliate or indexing aggregates/identifiers. `LEAN-L0-02` should probe the callable RPC surface; `LEAN-L0-03` should revoke default execution and grant only deliberately public RPCs.

## 4. Production aggregates and billing projection

No names, emails, UUIDs, Stripe IDs, prompts, or customer payloads were collected in the report.

| Metric | Production result |
|---|---:|
| Users | 3 |
| Admins | 2 |
| Standard-role users | 1 |
| Reader/free projections | 1 |
| Student projections | 0 |
| Scholar projections | 1 (an admin in the earlier audit context) |
| Adept projections | 0 |
| Rows with Stripe customer reference | 1 |
| Rows with Stripe subscription reference | 1 |
| Course enrollments | 1 |
| Courses total / database-published | 30 / 29 |
| `convergence_queries` in prior 30 days | 3 |
| `api_usage` rows in prior 30 days | 0 |

The configured live Stripe account contains **zero subscriptions of any status**, while the database retains one subscription reference. Because the external account has no subscription objects at all, the database reference cannot represent an active subscription in the configured live account. Direct identifier-by-identifier reconciliation was intentionally not performed after the execution boundary rejected sending the stored identifier to Stripe without separate approval.

## 5. Published courses versus effective public/member access

Production does not define `NEXT_PUBLIC_PRISMARIUM_CURRENT_COURSE_SLUG`, `NEXT_PUBLIC_PRISMARIUM_NEXT_COURSE_SLUG`, or `NEXT_PUBLIC_PRISMARIUM_PREVIOUSLY_OPENED_COURSE_SLUGS` in Vercel.

Effective behavior:

- All 29 database-published rows appear in the public catalog/API as sanitized previews.
- Direct Supabase roles can select only course metadata columns; `courses.content` and `course_texts` are not selectable by `anon` or `authenticated`.
- PRE is inferred open/free by its `pre-` slug. Full content requires authentication plus enrollment.
- The taster is inferred free for tier purposes but is `coming-later`, so full content/enrollment is closed.
- Every main course is `coming-later` because no current/previous release configuration exists. Paid status alone does not open any of them.
- Database `is_published` therefore exposes preview metadata for 29 courses but does not currently create a paid full-course release.

| Published slug | Public sanitized preview | Full member access now |
|---|---|---|
| `pre-how-to-hold-two-things-at-once` | Yes | Yes, after sign-in and enrollment |
| `taster-the-heros-journey-why-this-pattern-wont-leave-us-alone` | Yes | No; free-tier classification but release closed |
| `fd01-mythic-imagination-from-classical-pattern-to-personal-meaning` | Yes | No; release closed |
| `fd02-nature-evolution-and-the-living-cosmos` | Yes | No; release closed |
| `fd03-the-body-breath-and-practice` | Yes | No; release closed |
| `fd04-strategy-power-and-discernment` | Yes | No; release closed |
| `ep01-jewish-esoteric-practice-text-law-and-folk-religion` | Yes | No; release closed |
| `ep02-ritual-magic-and-the-architecture-of-practice` | Yes | No; release closed |
| `ep03-rosicrucians-theosophy-and-modern-esoteric-invention` | Yes | No; release closed |
| `fnv01-form-number-and-vision` | Yes | No; release closed |
| `c01-how-humans-know-what-they-know` | Yes | No; release closed |
| `c02-symbol-myth-and-psychotechnology` | Yes | No; release closed |
| `c03-correspondence-analogy-and-hidden-order` | Yes | No; release closed |
| `c04-what-science-can-and-cant-say` | Yes | No; release closed |
| `c05-the-map-is-not-the-territory` | Yes | No; release closed |
| `c06-the-hermetic-tradition` | Yes | No; release closed |
| `c07-the-qabalah-and-the-tree-of-life` | Yes | No; release closed |
| `c08-the-mystics-across-traditions` | Yes | No; release closed |
| `c09-the-wisdom-of-the-east` | Yes | No; release closed |
| `c10-islamic-thought` | Yes | No; release closed |
| `c11-the-women-mystics` | Yes | No; release closed |
| `c12-the-western-philosophical-inheritance` | Yes | No; release closed |
| `c13-sacred-geometry-and-the-mathematical-cosmos` | Yes | No; release closed |
| `c14-ethics-without-absolutes` | Yes | No; release closed |
| `c15-synthesis-as-a-practice` | Yes | No; release closed |
| `c16-reading-the-colonizers-record` | Yes | No; release closed |
| `c17-reality-cracks-and-liminal-states` | Yes | No; release closed |
| `c19-karma-and-the-long-arc` | Yes | No; release closed |
| `c20-the-fabric-of-the-universe` | Yes | No; release closed |

The route-owned preview allowlist protects curriculum fields, but the release authority is still inferred from slug/type rules and environment presentation settings. L1 must replace the free-course inference with the single PRE allowlist; L2 must extend that same authority for paid releases.

## 6. Exact live Stripe environment and catalog

**Checked:** 2026-08-06 20:41:59 UTC through narrowly decrypted Vercel production Stripe variables held in process memory. No secret or object ID was printed or saved.

| Item | Result |
|---|---|
| Secret/publishable mode | Live / live, matching |
| Account country/default currency | US / USD |
| Charges / payouts enabled | Yes / yes |
| Products | 6 total, all active |
| Prices | 9 total, 6 active |
| Subscriptions | 0 total; 0 active or trialing |
| Webhook endpoints | 1 total, 1 marked enabled |

### 6.1 Complete product/Price inventory

Product creation timestamps distinguish duplicate products without exposing Stripe IDs.

| Product | Product created UTC | Product active | Price(s) |
|---|---|---|---|
| The Student | 2025-11-25 16:28:29 | Yes | $5/month active |
| The Scholar | 2025-11-25 16:28:53 | Yes | $9.99/month active |
| The Adept | 2025-11-25 16:29:14 | Yes | $15/month active |
| The Adept | 2025-11-30 14:53:05 | Yes | $15/month inactive; $49/month active |
| The Scholar | 2025-11-30 14:54:33 | Yes | $9.99/month inactive; $29/month active |
| The Student | 2025-11-30 14:55:31 | Yes | $5/month inactive; $15/month active |

### 6.2 Production-configured offers

| Offer env | Resolves in live account | Price/product state | Mismatch to lean contract |
|---|---|---|---|
| Student | Yes | The Student, active, USD $15/month | Matches founding price, but no server offer catalog/cohort rule |
| Scholar | Yes | The Scholar, active, USD $29/month | Approved lean price is $39 |
| Adept | Yes | The Adept, active, USD $49/month | Approved cost-gated price is $69 |

Do not edit or archive any Stripe object in L0. `LEAN-L0-04` must close Checkout first. `LEAN-L2-03` later decides exact mappings and preserves any verified prelaunch Price according to the plan.

## 7. Stripe route and webhook safety inventory

| Route/boundary | Deployed behavior | Finding |
|---|---|---|
| `POST /api/stripe/create-checkout-session` | Requires sign-in, then accepts browser `priceId` and `mode`; tier mapping is only a fallback | Any authenticated user can request an arbitrary Price/mode. No active-offer allowlist, request idempotency key, or existing-subscription duplicate guard exists |
| Checkout customer handling | Retrieves or creates customers and writes `stripe_customer_id` with the customer session | Customer-owned `users` write policy is being used for authoritative billing fields |
| `POST /api/stripe/sync-subscription` | Customer-triggered reconciliation; searches stored IDs, email, and recent sessions; unknown Price defaults to Scholar | A customer request can project billing state; unknown catalog state grants Scholar instead of quarantining |
| `POST /api/stripe/webhook` | Verifies the raw signature, then creates the normal request/session Supabase client; ignores update results | Signature verification is correct, but database authority and error handling are not. A failed mutation can still return `{received:true}` |
| Unknown/missing Price | Maps to Scholar in webhook and sync routes | Fail-open entitlement escalation |
| Webhook idempotency | No event inbox or unique event ledger | Duplicate, delayed, and out-of-order events are not replay-safe |

### 7.1 Live webhook configuration mismatch

Configured endpoint:

`https://convergencelibrary.com/api/stripe/webhook`

Observed HTTP behavior: `301 Moved Permanently` to `https://projectparallax.xyz/api/stripe/webhook`.

Configured live events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice_payment.paid`
- `invoiceitem.deleted`

Deployed handler cases:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Only Checkout completion and subscription deletion overlap. Treat webhook delivery/projection as unhealthy until a correctly addressed, service-owned, idempotent handler passes signed replay evidence.

## 8. Unmetered and bypass route inventory

The middleware requires authentication for the routes below unless a route performs a stronger admin check. Authentication is not metering.

| Surface | Current control | Risk/state for lean launch |
|---|---|---|
| `/api/working/generate` | Auth only | Calls semantic resolution and ritual synthesis with no quota, credits, reservation, or cost breaker |
| `/api/parallax/query` | Auth plus legacy count | Non-atomic; limiter fails open on database error; recording failures do not block generation |
| `/api/parallax/ai-search` | Auth plus same legacy count | Deep Search can synthesize and write shared cache; it does not create the counted `convergence_queries` row itself, so direct calls can bypass consumption |
| `/api/parallax/lens/[lensId]` | Auth only | Direct expanded-lens generation bypasses the query limiter entirely |
| `/api/ai/gpt`, `/api/ai/claude`, `/api/ai/gemini` | Auth only | Generic chat/provider bypasses with usage logging but no enforcement |
| `/api/practitioner/tarot/generate` | Auth only | DALL-E image generation has no credit/cost limit and can return generated output even when persistence fails |
| `/api/covers/generate` | Middleware auth only | Replicate/Nano Banana generation has no route-level ownership, admin, credit, or rate limit before provider spend |
| `/api/chapters/generate-names` | Auth only | Unmetered OpenRouter generation |
| `/api/metadata/extract` | Auth only | Unmetered OpenRouter generation and document mutation attempt |
| `/api/process-document`, `/api/process-media` | Middleware auth only | Customer-invokable processing can invoke OCR/transcription/metadata/cover/embedding providers without lean accounting |
| Admin metadata routes | Auth/session plus role check | Not a customer bypass, but still unmetered internal provider spend |

Additional diagnostic exposure:

- `/api/test-env` is production-accessible to any authenticated user through middleware and returns project references plus a prefix of the service-role key.
- `/api/auth/admin-status` uses the service role after authentication and returns verbose role/user/debug data; production logs include user email and key-prefix diagnostics on some paths.
- `/api/debug/env-check` correctly returns 403 when `NODE_ENV=production`.

`LEAN-L0-04` should close public sales and customer generative bypasses without trying to implement the final L4 credit adapter early.

## 9. Backup location and rollback prerequisites

### 9.1 Verified backup state

| Backup surface | Evidence |
|---|---|
| Supabase physical backups | Region East US (Ohio); WALG reported `true`; PITR `false`; earliest and latest timestamps both `0` |
| Local repository backup path | Documented as `backups/`, but the directory does not exist |
| Native dump tool | `pg_dump` is not installed |
| Supabase CLI schema dump | Could not run because Docker Desktop is unavailable; no artifact retained |
| R2/NAS backup | A legacy script describes intended destinations, but no current object/path/restore evidence was verified |
| Vercel code rollback | Multiple ready production deployments exist, but they do not cover database/Stripe state |

There is currently **no verified restorable database backup location**.

### 9.2 Required before `LEAN-L0-03` or any production schema mutation

1. Create a fresh logical backup using a working native `pg_dump` connection or `supabase db dump` with Docker available.
2. Store it outside the repository in a named restricted backup location; record timestamp, size, SHA-256, retention, and owner.
3. Capture deployed roles, grants, policies, functions, triggers, and schema—not only table data.
4. Restore the backup into a disposable/staging database and run row-count plus authorization smoke checks.
5. Write the L0 permission repair as a forward-only canonical migration with separately reviewed reversal SQL; do not replay drifted local files.
6. Record the exact pre-change Vercel deployment and keep the relevant sales/generation kill switches independent of database rollback.
7. Re-run the migration ledger, advisor, policy/grant queries, and adversarial suite after the change.

## 10. Risk disposition and next packets

| Risk | Evidence disposition |
|---|---|
| `LR-01` customer-writable authority | Confirmed critical; proceed to adversarial baseline only after Jen reviews this report |
| `LR-02` migration-tree drift | Confirmed critical; reconciliation map and forward-only rule required |
| `LR-03` Checkout/webhook authority | Confirmed high; stale sales should be disabled in `LEAN-L0-04` |
| `LR-04` unmetered provider paths | Confirmed high; close/gate bypasses in `LEAN-L0-04` |
| `LR-08` database-published course release | Preview breadth confirmed at 29; full release currently only PRE, but L1/L2 explicit allowlists remain required |
| Backup/rollback readiness | Not ready; fresh restorable database backup is a hard prerequisite to `LEAN-L0-03` |

Recommended dependency move after Jen's review:

- Set `LEAN-L0-02` to `ready` for the non-mutating adversarial authorization baseline.
- Set `LEAN-L0-04` to `ready` for code/flag work that disables stale sales and customer generation bypasses, subject to its own implementation review.
- Keep `LEAN-L0-03` blocked from production execution until the backup prerequisites above are satisfied.

## 11. Evidence methods and mutation check

Evidence came from:

- Git status/log/diff and deployed-revision comparison.
- `supabase migration list --linked` and read-only `supabase db query --linked` catalog queries.
- `supabase db advisors --linked --type security`.
- `supabase backups list`.
- Vercel project/deployment/env metadata reads.
- Narrow, in-memory retrieval of only production Stripe variables followed by Stripe `GET` requests for account, products, Prices, subscriptions, and webhook endpoints.
- Local source inspection of the deployed-equivalent route files.
- A public `HEAD` request to the configured webhook URL.

External mutations performed: **none**.  
Local changes for this packet: this report and the implementation tracker only.  
Temporary secret file: **never created** (the broad env pull was rejected before execution).  
Temporary failed schema-dump file: **removed**; it contained no schema or production data.
