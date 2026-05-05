# Handoff: Move Production App To primarium.xyz

## Session Metadata
- Created: 2026-05-01 23:33:29
- Project: C:\Projects\Digital-Grimoire
- Branch at handoff creation: develop
- Main production commit: 1a6c3e60defdb56526da1ab2b562f983754e1f37
- Session duration: Multi-hour deployment and verification session

## Recent Commits (for context)
- 1a6c3e6 Merge develop for course IP protection (pushed to main; production deployed)
- 69a65c4 Redeploy develop with staging env
- b163eab Allow public course previews
- df41898 Fix onboarding modal timer typing
- 237e39c Fix graph relationship prop typing
- 6c9066b Fix course text matcher typing
- 93882be Protect course curriculum access

## Handoff Chain

- Continues from: None for the domain-move work.
- Supersedes: None.

## Current State Summary

The app is currently deployed on Vercel project `digital-grimoire-96dg` under team `ravemage444s-projects` (`team_78EX8ijG1Y6FBuaUjObaMqrb`, project `prj_M9SVKggp8R9F8It0ngMQe6jIHLwk`). Production is live and verified at commit `1a6c3e6`. Current production aliases include `convergencelibrary.com`, `www.convergencelibrary.com`, `projectparallax.xyz`, and Vercel-generated aliases. The user clarified that the intended destination domain is `primarium.xyz`, so the next work is a production domain migration, not further course IP-protection work.

## Codebase Understanding

## Architecture Overview

This is a Next.js App Router application deployed to Vercel. Git integration deploys `develop` as Preview/staging and `main` as Production. Supabase is the backend database/auth provider. The current app project is not consistently linked locally via `.vercel`; local Vercel links were created temporarily during verification and then removed. Use explicit Vercel team/project IDs or link carefully when needed.

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `app/src/lib/supabase/middleware.ts` | Route protection and public route allowlist | `/courses` and `/api/courses` are public so sanitized previews can render |
| `app/src/lib/courses/access.ts` | Course preview sanitization helpers | Keeps public course responses from exposing full curriculum |
| `app/src/app/api/courses/route.ts` | Public/admin course list API | Public responses are sanitized; admin responses remain full |
| `app/src/app/api/courses/[id]/route.ts` | Single-course API and full access checks | `?access=full` requires enrollment/admin |
| `supabase/migrations/20260501000000_protect_course_curriculum.sql` | DB permission migration | Applied and recorded on staging and production |
| `app/src/lib/supabase/service.ts` | Service-role Supabase client | Vercel env must use service key matching the Supabase URL project |

## Key Patterns Discovered

- Use service-role Supabase clients only in server/API code paths.
- Public course endpoints intentionally expose sanitized preview data, while full curriculum requires `?access=full` and enrollment/admin.
- Vercel Preview and Production env vars can drift. Always compare Supabase URL ref, anon key ref, and service role key ref before deploying database-sensitive changes.
- Vercel Preview deployments are protected. Use `vercel curl` with the correct linked project or the Vercel MCP tools; ordinary fetches often hit Vercel Authentication.

## Work Completed

## Tasks Finished

- [x] Implemented course IP-protection API and DB changes.
- [x] Deployed and verified staging on `develop`.
- [x] Fixed Vercel Preview Supabase env mismatch for `develop`.
- [x] Fixed Vercel Production service-role env mismatch for production.
- [x] Merged `develop` into `main` and deployed production.
- [x] Applied and recorded production migration `20260501000000`.
- [x] Verified production anonymous DB access cannot read `courses.content`.
- [x] Verified production public course preview has no blocked curriculum keys.
- [x] Verified production anonymous full access returns `AUTH_REQUIRED`.

## Files Modified During This Overall Work

| File | Changes | Rationale |
|------|---------|-----------|
| `app/src/lib/courses/access.ts` | Added public preview sanitization helpers | Prevent public API from leaking full course curriculum |
| `app/src/app/api/courses/route.ts` | Added service reads, admin detection, non-admin sanitization | Public list endpoint returns safe previews only |
| `app/src/app/api/courses/[id]/route.ts` | Added full-access enrollment/admin guard and preview fallback | Blocks anonymous/non-enrolled curriculum access |
| `app/src/app/api/courses/my-courses/route.ts` | Avoids broad course embed; returns sanitized course with progress | Reduces accidental content exposure |
| `app/src/app/courses/[slug]/learn/page.tsx` | Fetches `access=full`; handles auth/enrollment states | Keeps learning view protected |
| `app/src/app/journal/new/page.tsx` | Fetches course with `access=full` | Prevents journal flow from using preview curriculum |
| `app/src/app/courses/[slug]/page.tsx` | Uses sanitized public syllabus display | Public course detail remains marketable but safe |
| `app/src/app/license/page.tsx` | Added Prismarium course IP terms | Legal/IP support |
| `app/src/app/terms/page.tsx` | Added course prohibited uses and IP terms | Legal/IP support |
| `supabase/migrations/20260501000000_protect_course_curriculum.sql` | Restricts anon/authenticated column grants | Blocks direct reads of protected course JSON |
| `app/src/lib/supabase/middleware.ts` | Made `/courses` and `/api/courses` public routes | Allows sanitized previews through middleware |
| Several TypeScript files | Small build fixes committed on `develop` | Required clean Vercel builds |

Note: The current local worktree still has many unrelated dirty files from prior/user work. Do not revert them. The production work was pushed via a temporary clean worktree at `C:\tmp\Digital-Grimoire-main-prod`.

## Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Stage first, then production | Apply to both immediately vs staging first | Database permission changes are high-risk; staging verified first |
| Deploy app code before DB migration | DB first vs app first | App needed service-role/sanitized API paths ready before DB column grants changed |
| Repair Vercel env mismatches | Leave as-is vs fix before deploy | Service-role key project mismatch caused/still could cause API 500s |
| Keep production DB as `ukguqtghfglirszsqqdj` | Switch to staging DB vs use current prod URL | Production public URL/anon key already pointed there; production migration applied there |
| Do not change domains yet | Add `primarium.xyz` immediately vs create handoff | User asked for a handoff document specifically for the domain move |

## Pending Work

## Immediate Next Steps

1. Confirm exact intended domain spelling with user: `primarium.xyz` as typed, or `prismarium.xyz` if that was intended.
2. Check whether the domain is already owned/available and where DNS is managed.
3. Add the confirmed domain to Vercel project `digital-grimoire-96dg`.
4. Configure DNS records at the registrar/DNS host to point to Vercel.
5. Wait for Vercel domain verification and SSL certificate issuance.
6. Decide whether old domains should remain aliases or redirect to the new canonical domain.
7. Update app/environment canonical URL variables and any metadata references.
8. Smoke test `https://primarium.xyz` after DNS propagates.

## Blockers/Open Questions

- [ ] Is the intended domain exactly `primarium.xyz`, or should it be `prismarium.xyz`?
- [ ] Who owns/manages DNS for the target domain?
- [ ] Should `convergencelibrary.com`, `www.convergencelibrary.com`, and `projectparallax.xyz` remain live aliases or redirect?
- [ ] Which environment variables define canonical URLs? Need audit before changing.
- [ ] Are Stripe/Supabase/Auth redirect URLs configured for the old domains and needing updates?

## Deferred Items

- Production domain redirect policy.
- SEO canonical URL updates and sitemap verification.
- External service callback/redirect domain updates.
- Search Console / analytics domain migration tasks.

## Context for Resuming Agent

## Important Context

Production is currently healthy and course IP protection is complete. Do not re-run or change the course protection migration unless there is a clear reason. The confirmed production Supabase project is `ukguqtghfglirszsqqdj`; staging is `hsmwojlgdepstgzcryyc`. Vercel Production is already using the corrected service-role key for production, but sensitive env pulls will not reveal that value back.

Current Vercel production deployment:
- Deployment ID: `dpl_CxoN51yjEZujo2Y5unDmhFyTH8Hc`
- Commit: `1a6c3e60defdb56526da1ab2b562f983754e1f37`
- State: READY
- Aliases at time of handoff: `projectparallax.xyz`, `digital-grimoire-96dg-ravemage444s-projects.vercel.app`, `digital-grimoire-96dg-git-main-ravemage444s-projects.vercel.app`, `convergencelibrary.com`, `www.convergencelibrary.com`

Validated production checks:
- Anonymous Supabase REST can read public preview columns.
- Anonymous Supabase REST is blocked from `courses.content` with 401.
- Production `/api/courses?published=true` returns sanitized preview data.
- Production `/api/courses/<slug>?access=full` returns `AUTH_REQUIRED` for anonymous users.

## Assumptions Made

- Production should continue using Vercel project `digital-grimoire-96dg` unless the user explicitly wants a new Vercel project.
- The app remains on Supabase production project `ukguqtghfglirszsqqdj`.
- The target domain is not yet attached to the Vercel project as of this handoff.
- Domain migration should preserve app/data behavior and only change public hostname/canonical references.

## Potential Gotchas

- `primarium.xyz` may be a typo for `prismarium.xyz`; confirm before making DNS changes.
- The local repo is dirty with unrelated changes. Do not run broad `git add .`, reset, or checkout commands in the main workspace.
- Vercel CLI may auto-link the `app` folder to the wrong project if run from `app`. Always verify project ID/name after linking.
- Vercel Preview/Production env vars have previously had Supabase service-key mismatches. Re-verify refs after any env changes.
- Vercel deployment protection can make plain API smoke tests appear as 401 HTML auth walls. Use `vercel curl` or Vercel MCP tools.
- Supabase migration history on production was recorded after applying SQL through `supabase db query --linked` because DB password was not locally available.

## Environment State

## Tools/Services Used

- Git/GitHub remote: `https://github.com/jmelendez2269/Digital-Grimoire.git`
- Vercel team: `ravemage444s-projects` / `team_78EX8ijG1Y6FBuaUjObaMqrb`
- Vercel project: `digital-grimoire-96dg` / `prj_M9SVKggp8R9F8It0ngMQe6jIHLwk`
- Supabase staging project ref: `hsmwojlgdepstgzcryyc`
- Supabase production project ref: `ukguqtghfglirszsqqdj`
- Temp production worktree used: `C:\tmp\Digital-Grimoire-main-prod`

## Active Processes

- No dev server or long-running process intentionally left running.
- Temporary local Vercel env files and `.vercel` link under `app` were removed.

## Environment Variables

Relevant names only:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_PASSWORD`
- `NEXT_PUBLIC_APP_URL` or similar canonical URL variables, if present
- Auth callback/redirect URL settings in Supabase/Vercel/third-party dashboards
- Stripe webhook/return URL settings, if Stripe is used in this production domain flow

## Related Resources

- Vercel project settings: `ravemage444s-projects/digital-grimoire-96dg`
- Production deployment inspector: `https://vercel.com/ravemage444s-projects/digital-grimoire-96dg/CxoN51yjEZujo2Y5unDmhFyTH8Hc`
- Course IP migration: `supabase/migrations/20260501000000_protect_course_curriculum.sql`
- Course access helper: `app/src/lib/courses/access.ts`
- Middleware public route allowlist: `app/src/lib/supabase/middleware.ts`

## Resume Notes - 2026-05-02

- Handoff staleness check was `FRESH`; current local branch is still `develop`.
- Vercel project domains still do not include `primarium.xyz` or `prismarium.xyz`.
- Vercel domain availability check: `primarium.xyz` is available for purchase; `prismarium.xyz` is already registered.
- DNS check for `prismarium.xyz`: apex currently resolves to `2.57.91.91`; `www.prismarium.xyz` CNAMEs to `prismarium.xyz`. This is not the usual Vercel apex target shown in Vercel docs.
- Local prep completed: app canonical URLs now derive from `NEXT_PUBLIC_APP_URL`/central URL helpers for metadata, sitemap, robots, and Stripe return URLs. Build verification passed with `npm.cmd run build` from `app`.
- Still blocked before Vercel/DNS mutation: confirm whether the target is `prismarium.xyz` or `primarium.xyz`, and confirm DNS ownership/host.
- User confirmed the exact target is `prismarium.xyz`.
- Added `prismarium.xyz` and `www.prismarium.xyz` to Vercel project `digital-grimoire-96dg`.
- Updated existing Vercel env var `NEXT_PUBLIC_APP_URL` to `https://prismarium.xyz`; it targets production, preview, and development.
- Current DNS blocker: the domain still uses Hostinger parking nameservers (`apollo.dns-parking.com`, `athena.dns-parking.com`) and still resolves to `2.57.91.91`.
- Vercel required DNS records from `vercel domains inspect`:
  - `A prismarium.xyz 76.76.21.21`
  - `A www.prismarium.xyz 76.76.21.21`
  - Alternative: change nameservers to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.

---

**Security Reminder**: This handoff intentionally contains project refs and IDs, but no API keys, service-role keys, passwords, or tokens.
