---
name: dev_safety
description: Ensure safe local development workflow with Supabase Docker
---

# Dev Environment Safety Skill

A guide and routine for safe local development to prevent accidental production data modification.

## 1. Daily Startup Routine (Start Here)

Every time you start coding, follow these steps to ensure you are working safely:

1. **Start Docker Desktop**: Open the application and wait running status.
2. **Start Local Database**:

    ```bash
    npx supabase start
    ```

    *If it's already running, this command is harmless and will just confirm status.*
3. **Start App in Safe Mode**:

    ```bash
    npm run dev:safe
    ```

    *This script checks that you are connected to localhost before starting.*

## 2. Concept: Local vs Remote Sync

Understanding where your data lives is crucial for safety.

- **Local Database**: Running inside Docker on your machine.
  - Host: `127.0.0.1` / `localhost`
  - **Safe to break.** You can reset this at any time.

- **Remote Database**: Hosted on Supabase Cloud.
  - Host: `ukguq...supabase.co`
  - **Production Data.** Live users are here. Do not connect manually unless necessary.

### The Sync Flow

**Right Now**: Local and Remote schemas are identical because we just synced them.
**Tomorrow**: As you work, they will diverge.

1. **Remote -> Local** (Pulling Changes):
    - Command: `npx supabase db pull`
    - Action: Downloads the current production schema to your local migration files.
    - Use when: You or a teammate made changes on the dashboard or another machine.

2. **Local -> Remote** (Deploying Changes):
    - Command: `npx supabase db diff` (to create migration) -> Commit -> Deploy
    - Action: Applies your local schema changes to the production database via deployment.
    - Use when: You are ready to ship a feature.
