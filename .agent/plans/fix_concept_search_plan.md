# Implementation Plan - Fix Concept Search Integration

This plan addresses the Hydration Mismatch preventing the "Concept Search" tab from appearing and functioning correctly on the homepage.

## User Review Required

> [!IMPORTANT]
> **Hydration Mismatch**: The "Concept Search" tab is vanishing because the server doesn't know about it (or the state differs). I will force the component to mount only on the client or align the server logic.
> **Route Cleanup**: I will redirect `/deep-search` to the homepage with the "Concept Search" tab active, to avoid confusion.

## Proposed Changes

### 1. Fix `DashboardSearchHub` Hydration

- **File**: `app/src/components/DashboardSearchHub.tsx`
- **Issue**: The `activeTab` or the list of tabs likely differs between server and client, or the authentication state causing the tab to show/hide isn't synchronized.
- **Fix**:
  - Ensure the "Concept Search" tab is always part of the DOM structure but maybe conditionally effectively enabled, OR
  - Use a `useEffect` to handle the initial tab state if it depends on browser-only data (like a previous selection or auth state that loads late).
  - *Correction*: The issue might simply be that `DashboardSearchHub` is a client component but its parent is rendering it with different props or context on the server. I will verify if `useAuth` is causing a mismatch (e.g., specific tabs only for admins).

### 2. Verify `DeepSearchPanel` Integration

- **File**: `app/src/components/DeepSearch/DeepSearchPanel.tsx`
- **Action**: Ensure it doesn't have its own hydration issues (e.g., reading `window` or `localStorage` during render).

### 3. Route Cleanup

- **File**: `app/src/app/deep-search/page.tsx`
- **Action**: Replace with a redirect to `/?tab=concept` or similar, or just keep it as a wrapper that renders the same `DeepSearchPanel`.

## Verification Plan

### Automated Tests

- **Browser Subagent**:
    1. Navigate to `http://localhost:3000/`.
    2. Confirm "Concept Search" tab exists and persists (wait 5s).
    3. Click the tab.
    4. Perform a search ("Parabrahman").
    5. Verify results appear.

### Manual Verification

- User can see the tab and use it without it disappearing.
