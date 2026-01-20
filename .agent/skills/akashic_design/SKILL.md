---
name: Akashic Design System
description: The official design language for Digital Grimoire. Implements a "Future Mystic" aesthetic with Void Black backgrounds, glassmorphism, and neon amber/cyan accents.
---

# Akashic Design System

## 1. Core Philosophy

The interface should feel like a "Void-connected" terminal or HUD.

- **Atmosphere**: Deep, infinite dark (Void Black).
- **Metaphor**: Data Nodes, Heads-Up Displays (HUD), Terminals.
- **Lighting**: bioluminescent accents (Amber/Cyan) against the dark.

## 2. Color Palette

### Backgrounds

- **Void Black**: `#050505` (Main Background)
- **Deep Space**: `#08080b` (Secondary/Panels)
- **Scanline Black**: `#0a0a0f`

### Accents

- **Cyber Amber**: `#F59E0B` (Primary Brand, Focus, Active)
- **Holographic Cyan**: `#06b6d4` (Data, Secondary, Information)
- **Emerald Signal**: `#10b981` (Success, Stability)

### Glassmorphism

- **Glass Panel**: `bg-zinc-900/40 backdrop-blur-md border border-white/10`
- **Glass Hover**: `hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]`

## 3. Typography

### Primary UI (`Geist Sans`)

Used for body text, navigation, and general readability.

- Class: `font-sans`

### Data/Tech (`Geist Mono`)

Used for IDs, timestamps, status indicators, and technical labels.

- Class: `font-mono`
- Usage: `text-[10px] uppercase tracking-wider`

## 4. Component Patterns

### Data Nodes (vs Cards)

Instead of flat "cards", use "Data Nodes":

1. **Container**: Glass panel as base.
2. **Header**: Small bar at the top with "Node_ID" and Status (Mono font).
3. **Inset Content**: Images or main content inset with padding to show the "frame".
4. **Scanlines**: Subtle CSS overlays (`bg-[linear-gradient...]`) for texture.

### HUD Headers

Floating, semi-transparent headers that feel like a cockpit overlay.

- Style: `fixed top-4 left-4 right-4 z-50`
- Container: `glass-panel rounded-full`

### Terminal Inputs

Input fields should look like command lines.

- Style: `bg-black/50 border border-white/10 text-amber-500 font-mono`
- Focus: `focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20`

## 5. CSS Utilities (`globals.css`)

Always leverage these custom variables/classes:

- `.glass-panel`
- `.glass-panel-hover`
- `var(--color-void-black)`
- `var(--color-glass-border)`

## 6. Implementation Rules

- **NEVER** use solid white backgrounds for containers.
- **NEVER** use generic grey borders; use `white/5` or `white/10` for subtle separation.
- **ALWAYS** use `backdrop-filter: blur()` for overlays to maintain depth.
- **ALWAYS** pair broad Sans-serif headers with tiny Monospace metadata (dates, IDs, tags).
