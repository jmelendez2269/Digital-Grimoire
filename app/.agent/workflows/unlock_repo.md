---
description: Fix file locking issues by force-closing Node.js and Git processes
---

# Unlock Repository

This workflow releases file locks on Windows by terminating processes that commonly hold locks on the project files (Node.js servers, Git operations).

1. Force kill all Node.js processes (Releases locks on build files/node_modules)
// turbo
2. Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

3. Force kill all Git processes (Releases locks from stuck merges/checkouts)
// turbo
4. Get-Process git -ErrorAction SilentlyContinue | Stop-Process -Force

5. Force kill specific next.js related processes if distinct
// turbo
6. Get-Process next -ErrorAction SilentlyContinue | Stop-Process -Force
