# Prismarium

Prismarium is a Next.js application for studying texts, traditions, symbols, courses, and ideas through the Library, Graph, Journal, The Working, and Seven Lenses.

The active application lives in [`app/`](app/). Current implementation and launch status is tracked in [`docs/planning/`](docs/planning/); older planning documents elsewhere in the repository are historical and may not describe the current product.

## Current stack

- Next.js 16 and React 19
- TypeScript and Tailwind CSS
- Supabase PostgreSQL, Auth, and Storage
- Stripe for billing
- Cloudflare R2 for document and media storage
- OpenAI, Anthropic, Google, and other providers behind server routes
- pnpm as the canonical package manager

Production is hosted remotely. The former staging Supabase project is intentionally inactive. Local Supabase and Docker are optional tools for isolated database, migration, and restore testing; they are not required for ordinary application development against an approved hosted profile.

## Quick start

### Requirements

- Git
- Node.js 20 or newer (the current workstation uses Node 22)
- pnpm 10 (`corepack enable` can install/manage it)
- A private `app/.env.local` appropriate for the environment you intend to use
- Docker Desktop only when using the containerized app, local Supabase, or a disposable database

### Native Node workflow

```powershell
git clone <repository-url> Digital-Grimoire
Set-Location Digital-Grimoire\app
corepack enable
pnpm install --frozen-lockfile
pnpm dev:safe
```

Open <http://localhost:3000>.

`pnpm-lock.yaml` is the dependency source of truth. Do not copy `node_modules` or `.next` from another computer; recreate them with `pnpm install --frozen-lockfile`.

### Docker app workflow

From the repository root:

```powershell
docker compose up --build
```

This runs the Next.js app with a reproducible Node 20 environment. It still reads `app/.env.local`, so Docker does not replace environment selection or secrets management. See [`docs/DOCKER_WORKFLOW.md`](docs/DOCKER_WORKFLOW.md).

## Environment files and secrets

Environment files are deliberately ignored by Git. Common local files include:

- `app/.env.local` — active Next.js profile
- `app/.env.local.local-supabase` — optional local Supabase profile
- `app/.env.local.staging` — dormant historical staging profile; do not assume it is available
- `app/.env.source-books` and other task-specific private profiles

Never commit these files or paste their values into issues, logs, handoffs, or documentation. Transfer them to another computer only through an encrypted channel or encrypted removable storage.

Before running scripts that can affect remote systems, verify which profile is active. Prefer `pnpm dev:safe` for development. Database migrations, production dumps, deployments, Stripe changes, and environment changes require their own explicit review; starting the app does not authorize them.

## Moving the complete development environment to another computer

A complete move has four independent parts:

1. source and current worktree files;
2. reproducible dependencies and development tools;
3. private environment configuration and CLI authentication;
4. optional local database or Docker data.

Git alone transfers only tracked, committed files. It does not transfer ignored secrets, untracked work, installed dependencies, Docker volumes, or a local Supabase database.

### 1. Inventory the old computer

From the repository root:

```powershell
git branch --show-current
git status --short
git remote -v
node --version
pnpm --version
docker --version
```

Review every modified and untracked path. Commit and push work that belongs in Git, or copy the complete worktree through an encrypted transfer if it is intentionally unfinished. Do not run `git clean`, `git reset --hard`, or assume untracked course files and screenshots are disposable.

### 2. Install the base tools on the new computer

Install:

- Git;
- Node.js 20 or newer;
- pnpm through Corepack;
- Docker Desktop if you need the Docker app workflow, local Supabase, or database restore testing;
- any editor and command-line tools you personally use.

Then confirm:

```powershell
git --version
node --version
corepack enable
pnpm --version
docker --version # optional
```

### 3. Transfer the repository and recreate dependencies

For committed work:

```powershell
git clone <repository-url> Digital-Grimoire
Set-Location Digital-Grimoire\app
pnpm install --frozen-lockfile
```

If you transferred an unfinished worktree instead, copy it to the desired location and run the same pnpm installation command. Do not transfer:

- `app/node_modules/`;
- `app/.next/`;
- Docker build caches;
- temporary backup or restore directories.

Those are machine-specific and reproducible.

### 4. Transfer private configuration separately

Securely copy only the environment profiles you still use. At minimum this normally means `app/.env.local`; local Supabase development may also require `app/.env.local.local-supabase`.

Do not place environment files in the repository archive unless that archive is encrypted and handled as a secret. On the new computer, check file names and variable presence without printing values.

Re-authenticate tools rather than copying their credential stores:

- sign in to GitHub/Git again;
- run `npx supabase login` only when linked Supabase management is needed;
- run `vercel login`/`vercel link` only when deployment management is needed;
- sign in to Docker Desktop if an image source requires it.

The checked-in `supabase/config.toml` and Vercel project files describe project configuration, but credentials remain private and machine-local.

### 5. Decide whether local database state must move

If the app uses hosted Supabase, no database copy is needed merely to develop on another computer. Install dependencies, transfer the approved environment profile, and the new computer connects to the same hosted project.

If you have valuable **local Supabase data**, export it logically on the old computer and restore it into a fresh local Supabase instance on the new computer. Do not copy Docker's internal virtual disk or volume directories between machines. A logical roles/schema/data export is more portable and proves that the database can be reconstructed.

Repository migrations under `supabase/migrations/` reproduce intended schema history, but they do not automatically include local rows, Auth users, Storage metadata, or uncommitted database changes.

### 6. Understand what remains remote

These normally do not move with the computer:

- hosted Supabase production data;
- Cloudflare R2 objects;
- Stripe products, customers, and subscriptions;
- Vercel deployments and environment variables;
- provider accounts and API-side configuration.

The new computer accesses them after you restore the appropriate credentials and permissions. Do not duplicate or download remote data unless the task specifically requires it.

### 7. Verify the new computer

From `app/`:

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm build
pnpm dev:safe
```

Then verify the browser loads at <http://localhost:3000> and that the active environment is the one you intended. Run focused test commands relevant to your current work; the available scripts are listed in `app/package.json`.

### Recommended transfer checklist

- [ ] All intended source changes are committed/pushed or included in an encrypted worktree copy.
- [ ] Untracked course files, handoffs, and screenshots have been reviewed individually.
- [ ] No `node_modules`, `.next`, caches, or temporary database artifacts are copied.
- [ ] Required `.env` profiles are transferred separately and securely.
- [ ] Git, provider, Supabase, Vercel, and Docker authentication is re-established only as needed.
- [ ] Local database state is logically exported/restored only if it contains work not present remotely or in migrations.
- [ ] `pnpm install --frozen-lockfile`, lint, build, and a development startup pass on the new computer.
- [ ] The old computer is not wiped until the new environment and all untracked work are verified.

## Repository map

```text
Digital-Grimoire/
├── app/                    Next.js application, tests, and application scripts
├── supabase/               Supabase configuration and canonical migration tree
├── docs/                   Current and historical planning, audits, and workflows
├── scripts/                Repository-level operational scripts
├── docker-compose.yml      Optional containerized development app
├── bootstrap-dev.ps1       Historical profile bootstrap; review profile availability first
└── README.md               This guide
```

Important current references:

- [`docs/DB_WORKFLOW.md`](docs/DB_WORKFLOW.md) — database environment concepts; note that staging is currently inactive
- [`docs/DOCKER_WORKFLOW.md`](docs/DOCKER_WORKFLOW.md) — optional Docker development
- [`docs/planning/prismarium-membership-implementation-tracker.md`](docs/planning/prismarium-membership-implementation-tracker.md) — current lean membership execution state
- [`docs/planning/prismarium-course-production-tracker.md`](docs/planning/prismarium-course-production-tracker.md) — course and video production state

## Development conventions

- Preserve unrelated dirty-worktree changes; this repository is often used by multiple concurrent work sessions.
- Use forward-only canonical migrations under `supabase/migrations/`. Do not replay or silently reconcile historical migration drift.
- Keep customer and authoritative billing/usage writes behind server-owned paths.
- Admin navigation routes and actions belong in the profile-avatar dropdown maintained by `app/src/components/Header.tsx`, not in the main navigation.
- Never commit database dumps, credentials, generated customer data, or sensitive operational evidence.

## License

- Code: Proprietary — © Jeanine Melendez, All Rights Reserved
- Prismarium courses and generated content: All Rights Reserved
- Planning documentation: CC BY-SA 4.0 unless otherwise stated
- Third-party and source texts: governed by their individual licenses
