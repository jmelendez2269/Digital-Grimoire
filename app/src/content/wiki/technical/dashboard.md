# Technical Documentation: Home Directory (`app/src/app/(home)`)

## Overview

The `app/src/app/(home)` directory represents the primary authenticated landing view of the application (often referred to as the Dashboard). It utilizes Next.js Route Groups `(home)` to organize the file structure without affecting the URL path.

**Path:** `src/app/(home)`  
**URL Route:** `/` (Root)

## Directory Structure

```bash
src/app/(home)/
├── layout.tsx       # Root layout wrapper for the home view
└── page.tsx         # Main page component
```

## Component Architecture

### 1. `layout.tsx`

* **Purpose**: Provides the root layout structure and metadata for the home route.
* **Key Features**:
  * **Metadata**: Defines SEO titles ("Home | Project Parallax"), descriptions, and Open Graph content for social sharing.
  * **Wrapper**: Renders children directly without wrapping them in extensive UI shell elements (which are likely handled by the root `app/layout.tsx` or the page itself).

### 2. `page.tsx`

* **Purpose**: The main entry point for the dashboard view.
* **Composition**:
  * **Header**: Main navigation (`@/components/Header`).
  * **DashboardView**: The core feature component (`@/components/DashboardView`).
  * **Footer**: Site footer (`@/components/Footer`).
  * **Styling**: Applies the global gradient background (`bg-gradient-to-br from-zinc-900 via-zinc-950 to-black`).

### 3. `DashboardView` (`@/components/DashboardView.tsx`)

* **Purpose**: This is the primary functional component rendered by `page.tsx`. It acts as a "Bento Grid" style launcher for the application's tools.

#### dependencies

* `useAuth` (`@/contexts/AuthContext`): Used to retrieve the user's display name and custom journal name.
* `Suspense`: Wraps the Search Hub to handle loading states.

#### Core Sections

1. **Welcome Header**: Personalized greeting using `user.user_metadata.username`.
2. **Search Hub** (`<DashboardSearchHub />`):
    * Centralized search entry point.
    * Wrapped in `Suspense` with a skeleton loader.
3. **Tools Grid** (Primary Navigation):
    * **Library** (`/library`): Browse text collection.
    * **Journal** (`/journal`): Personal notes. Title defaults to "The Journal" or user's custom `journal_name`.
    * **Graph** (`/graph`): Parallax Graph visualization.
    * **Courses** (`/courses`): Learning paths. Includes analytics tracking on click (`/api/track/courses-click`).
    * **Seven Lenses** (`<ParallaxEngineInfo />`): Link to the 7-lens AI reasoning surface at `/seven-lenses` (the underlying component name still uses the legacy `ParallaxEngine` prefix per the rename matrix). Desktop nav labels this entry **Parallax Search**.
4. **Extras / Practitioner Tools**:
    * **Ritual Machine** (`/ritual-machine`): Tool for generating ritual protocols.
    * **Workbench** (`/practitioner/rituals`): Ritual management dashboard.
    * **Tarot** (`/practitioner/tarot`): Digital tarot reading interface.

## Key Implementation Details

* **Styling**: Uses Tailwind CSS with a consistent "Zinc" and "Cyan" color theme (Dark Mode optimized).
* **Interactivity**:
  * Hover effects (gradients, borders) on all tool cards.
  * Analytic events fired on specific interactions (e.g., Courses click).
* **Authentication**: The view adapts to the user's state (Loading vs. Guest vs. User).

## Modification Guide

* **To Add a New Tool**: Add a new `Link` block in the grid within `DashboardView.tsx`. Follow the existing `group relative` class pattern for consistent hover effects.
* **To Change Layout**: Modify `page.tsx` to adjust the placement of Header/Footer.
* **To Update SEO**: Edit the `metadata` object in `layout.tsx`.
