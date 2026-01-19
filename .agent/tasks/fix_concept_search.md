# Task: Fix Concept Search Integration and Hydration Error

## Status

- [ ] Fix Hydration Mismatch in `DashboardSearchHub` <!-- id: 0 -->
- [ ] Verify "Concept Search" Tab Stability <!-- id: 1 -->
- [ ] Test "Concept Search" Functionality (End-to-End) <!-- id: 2 -->
- [ ] Cleanup `/deep-search` Route (Redirect or remove) <!-- id: 3 -->

## Context

The "Concept Search" tab was added to the `DashboardSearchHub` on the homepage. However, a Next.js hydration mismatch is causing the tab to disappear or the page to error out, often reverting to the default "AI Search" view. This led to confusion about which feature was being debugged. The goal is to stabilize the "Concept Search" tab and ensure it functions correctly for authenticated users.

## Progress

- Analyzed browser logs and confirmed `Hydration failed` error.
- Identified that the "Concept Search" tab renders on the client but differs from the server-rendered HTML.
- Confirmed that the "Deep Search" functionality itself (API) exists but isn't accessible due to the UI bug.
