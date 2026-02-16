---
title: Library Features Guide
type: guide
status: stable
audience: user
description: Complete guide to using the Library, including reading tools and personalization.
---

# Library Features Guide

## Overview

This document describes the complete suite of library features, including core browsing/viewing capabilities and personalization tools like bookmarks, annotations, and collections.

## Part 1: Core Library Features (Search & View)

### 1. PDF Document Viewer

**Location:** `/library/[id]`

**Features:**

- Full PDF rendering
- Page navigation (prev/next/jump to page)
- Zoom controls (zoom in/out/fit/custom percentage)
- Download functionality
- Print support
- Search within PDF
- Thumbnail sidebar
- Bookmarks panel
- Full-screen mode
- Dark theme integration
- Responsive toolbar with controls

### 2. Advanced Filtering System

**Location:** `/library` page

**Filter Options:**

- **Domain Filter** - Filter by document domain (astrology, psychology, etc.)
- **Document Type** - Filter by type (book_esoteric, article_scholarly, etc.)
- **Year Range** - Set minimum and maximum year range
- **Tags** - Multi-select tag filtering with checkbox interface

### 3. Pagination System

**Location:** `/library` page

**Features:**

- Configurable items per page (default: 12)
- Smart page number display with ellipsis
- First/Previous/Next/Last navigation buttons
- Current page highlighting
- Results count display
- Smooth scroll to top on page change

## Part 2: Personalization Features (My Library)

### 1. Bookmark/Favorite Documents

**Location:** Available on all document cards and detail pages

**Features:**

- One-click bookmarking from library grid or detail pages
- Visual indicator (filled bookmark icon)
- Automatic authentication check
- Persistent across sessions

### 2. Reading Progress Tracking

**Location:** Document detail page sidebar

**Features:**

- Automatic progress tracking while reading
- Visual progress bar (0-100%)
- Time spent reading (seconds, minutes, hours)
- Mark as completed button (at 80%+)
- Completion status with timestamp

### 3. Annotations and Highlights

**Location:** Document detail page → "Notes" tab

**Features:**

- Add highlighted text with personal notes
- Edit/Delete annotations
- Visual distinction between quote and note
- Position tracking (page, paragraph, offsets)

### 4. Custom Document Collections

**Location:** Document detail page sidebar and "My Library"

**Features:**

- Create custom collections with names, icons, and colors
- Add/remove documents
- Public/private visibility
- "My Library" dashboard for management

## User Experience

### "My Library" Dashboard

**Location:** `/library/my-library`

- Unified view of Bookmarks, Collections, and Reading Progress.
- Tabbed interface for easy switching.
- Empty states with call-to-actions.

### Search & Filter Flow

1. User searches/filters → Results update automatically.
2. Pagination resets to page 1.
3. URL parameters track state for shareability.
