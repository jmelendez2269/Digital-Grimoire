# Technical Reference: Workbench & Extras

## Overview

Documents the routing structure, file layout, and component architecture for the Workbench and Extras sections. This covers the restructure completed in March 2026 that separated creation tools (Workbench) from consumption portals (Extras).

---

## Route Structure

```
/workbench                        → Redirects to /workbench/rituals
/workbench/rituals                → My Rituals list
/workbench/rituals/create         → Create ritual form (RitualEditor component)
/workbench/rituals/[id]/active    → Step-by-step ritual player (ActiveRitualPlayer)
/workbench/machine                → Ritual Machine — curated protocol browser
/workbench/tarot                  → Deck Forge — AI tarot card generation

/extras/tarot                     → The Oracle — consumption only (Daily Draw, history)
/extras/tarot/draw                → TarotDeck component
/extras/tarot/forge               → Redirects to /workbench/tarot (legacy)

/ritual-machine                   → Ritual Library — browse pre-built protocols
```

---

## File Structure

```
app/src/app/
├── workbench/
│   ├── layout.tsx        ← Client layout: Header + 3-tab sub-nav
│   ├── page.tsx          ← Redirect to /workbench/rituals
│   ├── rituals/
│   │   ├── page.tsx      ← My Rituals list (server component, Supabase fetch)
│   │   ├── create/page.tsx
│   │   └── [id]/active/page.tsx
│   ├── machine/
│   │   └── page.tsx      ← Ritual Machine (client, static protocol data)
│   └── tarot/
│       └── page.tsx      ← Deck Forge (TarotWorkbench component)
│
├── extras/tarot/
│   ├── page.tsx          ← Oracle (consumption only — no Forge card)
│   ├── draw/page.tsx     ← TarotDeck component
│   └── forge/page.tsx    ← redirect('/workbench/tarot')
│
└── practitioner/
    └── page.tsx          ← redirect('/workbench')
```

---

## Workbench Layout

**File:** `workbench/layout.tsx` (Client Component)

Renders `<Header />` + a sticky sub-nav with 3 tabs using `usePathname()` for active detection:

| Tab | Route | Icon |
|---|---|---|
| My Rituals | `/workbench/rituals` | `ScrollText` |
| Ritual Machine | `/workbench/machine` | `Sparkles` |
| Deck Forge | `/workbench/tarot` | `Wand2` |

**Adding a new tab:** Create the route page, then add an entry to the `tabs` array in `layout.tsx`. No other nav changes needed.

---

## Key Components

| Component | Location | Used by |
|---|---|---|
| `RitualEditor` | `components/practitioner/` | `/workbench/rituals/create` |
| `ActiveRitualPlayer` | `components/practitioner/` | `/workbench/rituals/[id]/active` |
| `TarotWorkbench` | `components/practitioner/` | `/workbench/tarot` |
| `TarotDeck` | `components/practitioner/` | `/extras/tarot/draw` |
| `RitualCard` | `components/ritual/` | `/workbench/machine`, `/ritual-machine` |

---

## Modified Components

| Component | Change |
|---|---|
| `Header.tsx` | EXTRAS dropdown: Ritual Library, The Oracle, Workbench |
| `RitualEditor.tsx` | Post-save redirect → `/workbench/rituals` |
| `ActiveRitualPlayer.tsx` | Exit/complete redirect → `/workbench/rituals` |
| `DashboardView.tsx` | Extras cards: Ritual Library (📜), Workbench (🛠️ amber), The Oracle (purple) |

---

## Database

No schema changes were required for this restructure. Existing `rituals` and `ritual_steps` tables serve both the Workbench and the Ritual Machine without modification.

---

## Redirects In Place

| Old URL | New URL |
|---|---|
| `/practitioner` | `/workbench` |
| `/practitioner/rituals` | User must update bookmarks (no redirect at sub-path) |
| `/extras/tarot/forge` | `/workbench/tarot` |

---

## Future Work

- [ ] Add `Ritual Library` as its own dedicated route (`/ritual-library`) instead of `/ritual-machine`
- [ ] Deck Forge: custom deck gallery to view all AI-generated cards
- [ ] Ritual Machine: favorites, progress tracking, modification of protocols
- [ ] Sigil Maker tab in Workbench (`/workbench/sigils`)

---

## Related

- [User Guide: Workbench](/wiki/workbench)
- [User Guide: The Oracle](/wiki/tarot)
- [User Guide: Ritual Library](/wiki/ritual-machine)

---

*Last Updated: March 2026*
