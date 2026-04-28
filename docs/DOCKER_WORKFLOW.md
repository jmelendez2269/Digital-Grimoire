# Docker Workflow

## Purpose

Docker makes the app portable so your development setup is less tied to one machine. The container runs the Next.js app, while your active database target still comes from `app/.env.local`.

## What Docker handles

- Node version consistency
- package installation inside the container
- app startup on any machine with Docker Desktop

## What Docker does not replace

- your Supabase project selection
- your environment profiles
- your source code checkout

## Recommended pattern

Use the existing env profile switcher first, then start Docker.

For a fresh machine or first-time setup, use the repo bootstrap script:

```powershell
.\bootstrap-dev.ps1 -Profile staging
```

If you want it to start the container immediately after setup:

```powershell
.\bootstrap-dev.ps1 -Profile staging -Launch
```

### Daily development against staging

```powershell
cd app
.\scripts\switch-env.ps1 -Profile staging
cd ..
docker compose up --build
```

### Local sandbox development

```powershell
cd app
.\scripts\switch-env.ps1 -Profile local-supabase
cd ..
npx supabase start
docker compose up --build
```

The app will be available at `http://localhost:3000`.

## Files

- `app/Dockerfile` builds the Next.js app
- `docker-compose.yml` runs the dev container
- `app/.dockerignore` keeps secrets and local artifacts out of image builds

## Notes

- `docker-compose.yml` reads `app/.env.local`, so the active profile still controls the container.
- File watching uses polling because bind-mounted development on Windows is more reliable that way.
- `node_modules` and `.next` live in Docker volumes, which avoids host/container permission and OS mismatch issues.

## Typical commands

```powershell
docker compose up --build
docker compose down
docker compose logs -f app
```

## What you need to provide

- Docker Desktop installed on the machine you want to develop on
- a real `app/.env.local.staging` file
- optionally a real `app/.env.local.local-supabase` file

The bootstrap script will preserve a current local `.env.local` as `app/.env.local.local-supabase` when possible, but it cannot invent your staging credentials.

For graph-specific seeding and promotion on top of this Docker setup, see `docs/GRAPH_WORKFLOW.md`.

## Next step for full portability

If you want, the next improvement is adding a production-oriented Docker setup and a small bootstrap script so a fresh machine can go from clone to running app in one or two commands.
