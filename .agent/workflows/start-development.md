---
description: Ensure the development environment is safe and ready
---

This workflow checks that the local development environment is correctly set up and safe to work in. It verifies that Docker is running, the local Supabase instance is up, and that you are on a development branch.

1. **Check Docker & Supabase Status**
    Run the safety check script to verify the environment.

    // turbo

    ```bash
    cd app
    npm run dev:safe
    ```

    If this fails:
    - Start Docker Desktop.
    - Run `npx supabase start`.
    - Switch to a `dev` branch (`git checkout dev`).

2. **Start Development Server**
    If the check passes, the dev server will start automatically.
