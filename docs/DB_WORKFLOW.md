# Database Workflow

## Recommended setup

Use three database environments with different purposes:

- `production`: live site only
- `staging`: your day-to-day working dataset
- `local Supabase`: disposable sandbox for migrations and risky experiments

## Daily workflow

For normal development, use staging:

```powershell
cd app
.\scripts\switch-env.ps1 -Profile staging
pnpm dev
```

For a fresh machine, you can initialize the profiles from the repo root with:

```powershell
.\bootstrap-dev.ps1 -Profile staging
```

This keeps your app pointed at the shared hosted dataset, so seeded graph data and content are visible while you work.

## Local Supabase workflow

Use local Supabase only when you need isolation:

```powershell
cd app
.\scripts\switch-env.ps1 -Profile local-supabase
npx supabase start
pnpm dev
```

Good reasons to use local:

- testing migrations before pushing them
- trying destructive schema changes
- experimenting with RLS or triggers
- reproducing bugs in a clean sandbox

## Environment files

The repo now supports profile-based env management:

- `app/.env.local.staging`
- `app/.env.local.local-supabase`
- `app/.env.local`

`app/.env.local` is the active file used by Next.js. Do not edit it directly unless you are intentionally making one-off changes. Instead, update one of the profile files and switch with:

```powershell
.\scripts\switch-env.ps1 -Profile staging
```

or

```powershell
.\scripts\switch-env.ps1 -Profile local-supabase
```

## Why this is better

This avoids the recurring problem where local Supabase exists but has no seeded data. Staging becomes the shared working source of truth, while local stays reproducible and disposable.

If you also want machine-independent app setup, pair this with `docs/DOCKER_WORKFLOW.md`.

For graph-specific seeding and promotion, also see `docs/GRAPH_WORKFLOW.md`.
