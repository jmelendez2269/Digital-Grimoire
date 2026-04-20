# Graph Workflow

## What each layer is for

There are four different things involved in your graph workflow:

- `Git / GitHub`: tracks code and files in the repo
- `Supabase schema`: tracks table structure through migrations in `supabase/migrations`
- `Supabase data`: stores the actual graph rows such as concepts, correspondences, and edges
- `Docker`: runs the app locally, but does not decide which Supabase project you are using

Those four things work together, but they are not the same.

## What Git tracks

Git tracks things like:

- React components
- API routes
- seed scripts
- migration files
- docs

Git does **not** automatically track the rows inside your database.

If you manually add a graph concept in Supabase, GitHub does not know about it unless you also captured that change in:

- a seed script
- a SQL file
- or an export/import script

## What migrations are for

Migrations are for **structure**.

Use migrations when you change:

- tables
- columns
- indexes
- constraints
- policies

Example:

- adding `convergence_traditions`
- adding a new field to `correspondences`

Migrations are how schema changes move from staging to production in a repeatable way.

## What seed scripts are for

Seed scripts are for **baseline content**.

Use seed scripts when you want important graph data to behave more like code:

- starter concepts
- starter correspondences
- lookup tables
- known relationships

This repo now has:

- [seed-correspondences.ts](C:/Projects/Digital-Grimoire/app/scripts/seed-correspondences.ts:1)
- [seed-convergence.ts](C:/Projects/Digital-Grimoire/app/scripts/seed-convergence.ts:1)
- [seed-graph.ps1](C:/Projects/Digital-Grimoire/app/scripts/seed-graph.ps1:1)
- [export-graph.ts](C:/Projects/Digital-Grimoire/app/scripts/export-graph.ts:1)
- [import-graph.ts](C:/Projects/Digital-Grimoire/app/scripts/import-graph.ts:1)

That means your curated graph baseline is now reproducible.

## What Docker is for

Docker runs the app on your machine in a consistent environment.

Docker does **not**:

- promote data from staging to prod
- sync databases
- know which Supabase project is "correct"

Docker just runs the app using whatever is currently active in `app/.env.local`.

## Your daily workflow

For normal development:

1. Point the app at staging
2. Run the app locally
3. Make code changes
4. Seed graph changes into staging when needed
5. Commit the code and scripts to Git

Typical commands:

```powershell
cd C:\Projects\Digital-Grimoire\app
powershell -ExecutionPolicy Bypass -File .\scripts\switch-env.ps1 -Profile staging
pnpm seed:graph
cd ..
docker compose up --build
```

Or in one step for seeding:

```powershell
cd C:\Projects\Digital-Grimoire\app
pnpm seed:graph:staging
```

## The new promotion workflow

If you curate graph content in the UI or through SQL while connected to staging, that content lives only in staging until you promote it.

Promotion now works like this:

1. export a graph bundle from staging
2. review or keep that JSON bundle as a record of what you are promoting
3. switch to prod later
4. import the same bundle into prod

Example export from staging:

```powershell
cd C:\Projects\Digital-Grimoire\app
powershell -ExecutionPolicy Bypass -File .\scripts\export-graph.ps1 -Profile staging
```

That writes a JSON bundle into `graph-bundles/` at the repo root by default.

Example import into another environment:

```powershell
cd C:\Projects\Digital-Grimoire\app
powershell -ExecutionPolicy Bypass -File .\scripts\import-graph.ps1 -Profile current -BundlePath ..\graph-bundles\your-bundle.json
```

The import process uses slugs and upserts:

- traditions and types are matched by `slug`
- concepts and correspondences are matched by `slug`
- relationships are matched by their natural unique keys

That means you do not need matching UUIDs between staging and prod.

## How graph changes move forward

There are two kinds of graph changes:

### 1. Schema changes

Example:

- adding a table
- adding a field
- adding a relation

Workflow:

1. create or update a migration
2. push/test it in staging
3. commit it to Git
4. later apply the same migration to prod

### 2. Data changes

Example:

- adding new convergence concepts
- adding correspondence entities
- adding graph edges

Workflow:

1. either update the seed script or curate content in staging through the UI
2. verify the graph in `localhost`
3. if it is baseline content, commit the seed-script changes to Git
4. if it is curated staging content, export a graph bundle
5. when ready, import that bundle into prod intentionally

## Important rule

If graph content matters and you may want it again later, do not leave it only as manual database edits with no promotion path.

Instead, capture it in:

- a seed script
- a SQL file
- or a documented export/import flow like the graph bundle workflow

That is what makes the data portable and repeatable.

## How production promotion works

Production promotion is intentional. It is not automatic.

GitHub will know about:

- your new code
- your new migration files
- your updated seed scripts

GitHub will **not** automatically run those things against prod.

To promote graph work to prod, you deliberately do one or both of these:

- apply migrations to prod
- run the graph seed scripts against prod
- or import a reviewed graph bundle into prod

That should happen only when the graph content is ready.

## Suggested mental model

Use this model:

- `localhost` is where you work
- `staging` is your development data backend
- `prod` is your protected release backend
- `Docker` runs the app
- `Git` tracks the repo
- `migrations` move structure
- `seed scripts` move baseline graph content

## Recommended habit

For graph work, prefer:

1. use the UI in staging for curation
2. use seed scripts for canonical baseline data
3. test in localhost
4. export curated staging work when it is ready
5. later import that bundle into prod intentionally

That keeps the graph understandable, portable, and recoverable.
