# Workbench & Extras Restructure — Technical Documentation

**Status:** ✅ Complete  
**Date:** March 3, 2026

---

## Overview

This document describes the architectural restructure of the application's navigation and routing to clearly separate **content creation** (Workbench) from **content consumption** (Extras). This enables a cleaner user experience and a scalable foundation for future creation tools.

---

## Design Rationale

Prior to this change, creation and consumption features were mixed under the `Extras` nav item. This caused confusion: the Tarot page contained both a card-draw experience AND a Deck Forge creator, and "Practitioner" was used for ritual management but not discoverable from the main nav.

**New philosophy:**

- **Workbench** = your maker's bench. You build things here.
- **Extras** = consumption portals. You pull cards or browse pre-built rites here.

---

## Route Map

| Old Route | New Route | Notes |
|---|---|---|
| `/practitioner/rituals` | `/workbench/rituals` | My Rituals tab |
| `/practitioner/rituals/create` | `/workbench/rituals/create` | Create ritual |
| `/practitioner/rituals/[id]/active` | `/workbench/rituals/[id]/active` | Active ritual player |
| `/extras/tarot/forge` | `/workbench/tarot` | Deck Forge tab (redirect in place) |
| `/ritual-machine` | `/ritual-machine` (now "Ritual Library") | Label changed, URL unchanged |
| `/practitioner` | Redirects → `/workbench` | Index redirect |

---

## New File Structure

```
app/src/app/
├── workbench/
│   ├── layout.tsx              ← NEW: Workbench shell with 3-tab sub-nav
│   ├── page.tsx                ← NEW: Redirects to /workbench/rituals
│   ├── rituals/
│   │   ├── page.tsx            ← NEW: My Rituals list
│   │   ├── create/
│   │   │   └── page.tsx        ← NEW: Create ritual form
│   │   └── [id]/
│   │       └── active/
│   │           └── page.tsx    ← NEW: ActiveRitualPlayer
│   ├── tarot/
│   │   └── page.tsx            ← NEW: Deck Forge (TarotWorkbench component)
│   └── machine/
│       └── page.tsx            ← NEW: Ritual Machine (curated protocol browser)
│
├── extras/
│   └── tarot/
│       ├── page.tsx            ← MODIFIED: Oracle only (Daily Draw, no Forge card)
│       └── forge/
│           └── page.tsx        ← MODIFIED: Redirect to /workbench/tarot
│
└── practitioner/
    └── page.tsx                ← MODIFIED: Redirect to /workbench
```

---

## Workbench Layout

**File:** `app/src/app/workbench/layout.tsx`  
**Type:** Client Component (`"use client"`)

The Workbench layout renders:

1. `<Header />` — global sticky nav
2. A sticky sub-nav below the header (`top-16`, `z-30`) with 3 tabs:
   - **My Rituals** (`/workbench/rituals`) — `ScrollText` icon
   - **Ritual Machine** (`/workbench/machine`) — `Sparkles` icon
   - **Deck Forge** (`/workbench/tarot`) — `Wand2` icon

Active tab is detected via `usePathname().startsWith(tab.href)`.

### Adding Future Tools

To add a new tool (e.g., Sigil Maker):

1. Create `app/src/app/workbench/sigils/page.tsx`
2. Uncomment (or add) a tab entry in `workbench/layout.tsx`:

```tsx
{ name: 'Sigil Maker', href: '/workbench/sigils', icon: Hexagon },
```

No other nav changes are needed.

---

## Components Modified

| Component | Change |
|---|---|
| `components/Header.tsx` | EXTRAS dropdown: renamed labels to "Ritual Library", "The Oracle", "Workbench"; Workbench link updated to `/workbench` |
| `components/practitioner/RitualEditor.tsx` | Post-save redirect: `/practitioner/rituals` → `/workbench/rituals` |
| `components/practitioner/ActiveRitualPlayer.tsx` | Exit + completion redirect: → `/workbench/rituals` |
| `components/DashboardView.tsx` | 3 Extras cards updated: Ritual Library (📜), Workbench (🛠️ amber), The Oracle (purple) |

---

## Navigation Structure (After)

```
Header EXTRAS dropdown:
  ├── Ritual Library  → /ritual-machine
  ├── The Oracle      → /extras/tarot
  └── Workbench       → /workbench

Home Page (DashboardView) EXTRAS section:
  ├── Ritual Library  → /ritual-machine
  ├── Workbench       → /workbench
  └── The Oracle      → /extras/tarot

Workbench Sub-Nav:
  ├── My Rituals      → /workbench/rituals
  ├── Ritual Machine  → /workbench/machine
  └── Deck Forge      → /workbench/tarot
```

---

## Redirects

| Old URL | Redirects To |
|---|---|
| `/practitioner` | `/workbench` |
| `/extras/tarot/forge` | `/workbench/tarot` |

No database schema changes were required for this restructure.

---

## Dependencies

- `next/navigation` (`usePathname`, `redirect`)
- `lucide-react` (`ScrollText`, `Wand2`, `Sparkles`)
- `@/components/Header` — global header (must be rendered inside `workbench/layout.tsx`)
- `@/components/practitioner/RitualEditor` — ritual creation form
- `@/components/practitioner/ActiveRitualPlayer` — step-by-step ritual experience
- `@/components/practitioner/TarotWorkbench` — AI tarot generation
- `@/components/ritual/RitualCard` — ritual protocol card UI

---

## Future Enhancements

- [ ] **Sigil Maker** — add `/workbench/sigils` tab when ready
- [ ] **Ritual Library → `/ritual-library` URL rename** — cosmetic, URL currently still `/ritual-machine`
- [ ] **Custom Deck management** — gallery of user-forged tarot cards under Deck Forge
- [ ] **Ritual journaling** — post-ritual notes linked from ActiveRitualPlayer completion screen

---

**Last Updated:** March 3, 2026  
**Maintained By:** Digital Grimoire Development Team
