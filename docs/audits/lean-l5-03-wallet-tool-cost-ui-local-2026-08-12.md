# LEAN-L5-03 wallet and tool-cost customer states — local evidence

**Date:** August 12, 2026  
**Scope:** Local implementation and verification only  
**Result:** Pass; `LEAN-L5-03` is complete locally

## Outcome

Prismarium now exposes one exact, customer-safe, no-store tool-cost projection and one shared client wallet state. The profile Credits tab renders available, reserved, and total credits; the current UTC allowance reset and no-rollover rule; pending holds; and bounded grant, reserve, commit, return, expiry, and adjustment history. The Working, Seven Lenses synthesis, and one-lens expansion consume the same server-owned action codes and show required-versus-available balance without importing server modules.

The customer lifecycle distinguishes loading, ready, reserved, committed, returned, insufficient, safely disabled, ambiguous retry, settlement reconciliation, wallet-unavailable, and Reader-capacity-paused states. Retry keeps the original request UUID and customer input so a completed result can reopen without a second charge. Reader-breaker copy gives the UTC reset and explicitly keeps paid-member generation plus non-generative reading, search, Graph, Journal, and saved results available.

## Boundaries preserved

- `GET /api/membership/tool-costs` composes the safe membership catalog, independent commercial-action gate, and metering policy. It cannot enable an action, accept request data, mutate a wallet, or reveal Price IDs, provider configuration, modes, kill switches, or configuration keys.
- Tool availability fails closed unless the launch catalog, independent commercial action, configured metering mode, offer, quote, and kill-switch state all agree.
- Existing server authorization, reservation, settlement, idempotency, persistence, provider, Reader-breaker, and commercial guards were not weakened or bypassed.
- Checkout and Portal wiring, paid sales, course release, billing operations, production credit actions, and production metered routes remain closed. Ordinary reading, search, Graph, Journal, and reopening saved work remain outside credit gating.

## Verification

- **103/103 focused checks passed:** commercial availability, membership catalog, entitlement, Checkout, billing lifecycle/UI, wallet, metering, public discovery/browse, exact wallet/tool-cost parsers, UI rendering, lifecycle mapping, retry preservation, and UTC-capacity contracts.
- Targeted ESLint, `tsc --noEmit`, and `git diff --check` passed.
- The production compiler completed successfully and generated **139/139 pages**. The runner repeatedly reset Google Fonts connections, so the successful verification invocation used Next's built-in local font-response test hook; application font imports and production configuration were unchanged. Existing middleware/Sentry/baseline-browser warnings and unavailable local content counts remained non-fatal.
- A marker-owned localhost-only Reader fixture proved `7 available + 2 reserved = 9 total`, a 10-credit monthly grant, a one-credit Working commit, a two-credit Seven Lenses return, a two-credit pending reservation, and exact recent history. Cleanup reported **zero residue**.
- The authenticated browser story passed at **375×812** and **1440×900**: local-only auth, wallet and tool-cost APIs 200, keyboard focus, no horizontal overflow, preserved Working/Seven Lenses input, safely disabled submit controls, zero metered POSTs, and zero Checkout links. The sandbox-blocked external Vercel analytics host was recorded separately; localhost failures were not allowlisted. Known shell-only 404s remained `/grid.svg` and the pre-existing `/api/user/parallax-preferences` route.
- Visual evidence: [mobile](lean-l5-03-wallet-mobile-2026-08-12.png) and [desktop](lean-l5-03-wallet-desktop-2026-08-12.png).

## Rollback and next gate

Rollback is local code removal of the Credits tab, shared wallet/status components, safe cost endpoint, and customer-state wiring; no database or external rollback is required. No environment file, hosted/customer data, production migration, deployment, Stripe/provider action, paid sale, course release, Checkout UI, billing operation, production credit action, commit, push, or PR occurred.

`LEAN-L5-04` is ready but not started. Its seven consecutive shadow days, minimum success mix, current provider-price validation, tier economics decisions, and Reader subsidy/breaker decision remain independent prerequisites for any canary or paid activation.
