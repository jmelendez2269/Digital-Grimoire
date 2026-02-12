---
title: Library Seed Guide
type: guide
status: stable
audience: admin
description: Guide for populating the initial 100 texts in the library.
---

# Library Seed Guide

## Overview

Guide for populating the Digital Grimoire library with the initial 100 public domain texts, covering the 7 lenses of the Convergence Machine.

---

## 1. Seed Strategy

### The "Balanced" Approach

We prioritize a balanced distribution across all lenses rather than filling one domain at a time. This ensures all features (filtering, cross-referencing) are testable from Day 1.

| Priority | Count | Focus | Goal |
| :--- | :--- | :--- | :--- |
| **P1** | 20 | Foundations | MVP with all 7 lenses represented. |
| **P2** | 30 | Depth | Major texts in each domain. |
| **P3** | 30 | Coverage | Strengthening weaker lenses (Math/Science). |
| **P4** | 20 | Polish | Final balance and variety. |

### Lens Targets

- **Philosophical:** 67%
- **Religious/Spiritual:** 52%
- **Symbolic/Occult:** 45%
- **Historical/Anthropological:** 44%
- **Psychological:** 38%
- **Scientific:** 22%
- **Mathematical:** 12%
*(Percentages >100% due to multi-lens texts)*

---

## 2. Implementation Workflow

### Step 1: Download

Source texts from:

- **Project Gutenberg** (PDF/EPUB)
- **Sacred-Texts.com** (HTML -> PDF)
- **Internet Archive** (PDF)

### Step 2: Upload (`/admin/upload`)

1. Upload PDF.
2. Wait for Azure OCR (1-3 mins).
3. Wait for AI Metadata (30s).
4. Verify Lenses/Tags.

### Step 3: Track

Update the status in `LIBRARY_SEED_100_TEXTS_BALANCED.csv`:

- `queued` -> `downloaded` -> `uploaded` -> `complete`

---

## 3. Data Sources

The seed list is maintained in `docs/LIBRARY_SEED_100_TEXTS_BALANCED.csv`.

**CSV Columns:**
`Title`, `Author`, `Year`, `Type`, `Domain`, `Lenses`, `Source_URL`, `Priority`, `Status`, `Why_Chosen`

---

## 4. Cost Estimates

- **Azure OCR:** Free tier (5,000 pages/mo).
- **OpenAI Metadata:** ~$1.00 total for 100 texts.
- **R2 Storage:** Free tier (10GB).
