# Feature Testing Matrix - Quick Reference

**Version:** 1.0  
**Date:** October 31, 2025  
**Status:** Ready for Testing

---

## Overview

Quick reference matrix for all Sprint 5 features and related implementations requiring testing.

---

## Testing Matrix

| Feature | Status | Migration Required | API Routes | UI Components | Priority | Est. Test Time | Documentation |
|---------|--------|-------------------|------------|---------------|----------|----------------|---------------|
| **TTS System** | ⚠️ Needs Testing | 012 | ✅ Complete | ✅ Complete | P1 | 30 min | [TTS Testing](./SPRINT_5_TESTING_CHECKLIST.md#a-text-to-speech-feature-testing) |
| **Journal Export** | ⚠️ Needs Testing | - | ✅ Complete | ✅ Complete | P1 | 20 min | [Export Testing](./SPRINT_5_TESTING_CHECKLIST.md#b-journalgrimoire-export-testing) |
| **WikiLinks** | ⚠️ Needs Testing | - | ✅ Complete | ✅ Complete | P1 | 15 min | [WikiLinks Testing](./SPRINT_5_TESTING_CHECKLIST.md#c-wikilinks-system-testing) |
| **Backlinks** | ⚠️ Needs Testing | - | ✅ Complete | ✅ Complete | P1 | 10 min | [Backlinks Testing](./SPRINT_5_TESTING_CHECKLIST.md#d-backlinks-panel-testing) |
| **Clip to Grimoire** | ⚠️ Needs Testing | - | ✅ Complete | ✅ Complete | P1 | 10 min | [Clip Testing](./SPRINT_5_TESTING_CHECKLIST.md#e-clip-to-grimoire-testing) |
| **Slash Menu** | ⚠️ Needs Testing | - | - | ✅ Complete | P1 | 10 min | [Slash Menu Testing](./SPRINT_5_TESTING_CHECKLIST.md#f-slash-menu-testing) |
| **Drag Handle** | ⚠️ Needs Testing | - | - | ✅ Complete | P1 | 10 min | [Drag Handle Testing](./SPRINT_5_TESTING_CHECKLIST.md#g-drag-handle-testing) |
| **Cover System** | ⚠️ Needs Testing | 017 | ✅ Complete | ✅ Complete | P2 | 15 min | [Cover Testing](./SPRINT_5_TESTING_CHECKLIST.md#h-book-cover-system-testing) |
| **Phase 3 APIs** | ⚠️ Needs Testing | 018, 019 | ✅ Partial | 🔄 Partial | P2 | 20 min | [Phase 3 Testing](./SPRINT_5_TESTING_CHECKLIST.md#i-phase-3-infrastructure-testing) |

**Total estimated testing time:** ~2.5 hours (140 minutes)

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete and verified |
| ⚠️ | Complete but needs testing |
| 🔄 | Partially implemented |
| ⬜ | Not started |
| ❌ | Known issues |

---

## Priority Definitions

- **P1 (Critical):** Core functionality, must be tested before production deployment
- **P2 (High):** Important features, should be tested soon
- **P3 (Medium):** Nice-to-have, can be tested later

---

## Testing Progress Tracker

### Sprint 5 Core Features (P1)

- [ ] Text-to-Speech (30 min) - **24 tests**
- [ ] Journal Export (20 min) - **19 tests**
- [ ] WikiLinks (15 min) - **13 tests**
- [ ] Backlinks (10 min) - **9 tests**
- [ ] Clip to Grimoire (10 min) - **10 tests**
- [ ] Slash Menu (10 min) - **10 tests**
- [ ] Drag Handle (10 min) - **12 tests**

**P1 Subtotal:** 115 minutes | 97 tests

### Additional Features (P2)

- [ ] Cover System (15 min) - **8 tests**
- [ ] Phase 3 Infrastructure (20 min) - **11 tests**

**P2 Subtotal:** 35 minutes | 19 tests

### Grand Total

**Time:** 150 minutes (~2.5 hours)  
**Tests:** 116 individual test cases

---

## Migration Dependencies

### Required Migrations

| Migration | File | Purpose | Required For |
|-----------|------|---------|--------------|
| 012 | `012_add_reading_positions.sql` | Reading positions & TTS prefs | TTS System |
| 015 | `015_add_journal_pages.sql` | Journal pages table | All journal features |
| 016 | `016_add_annotation_fts.sql` | Full-text search | Annotation search |
| 017 | `017_add_cover_source.sql` | Cover source tracking | Cover System |
| 018 | `018_add_correspondences.sql` | Correspondences graph | Phase 3A |
| 019 | `019_add_convergence_concepts.sql` | Convergence concepts | Phase 3B |

### Verification

See [Migration Verification Guide](./MIGRATION_VERIFICATION.md) for SQL queries to verify migrations.

---

## Component Dependencies

### TTS System
- **Components:** `AudioPlayer.tsx`, `TTSSettings.tsx`, `TextHighlight.tsx`
- **Services:** `tts-service.ts`, `web-speech-tts.ts`, `azure-speech-tts.ts`
- **Hooks:** `useTTS.ts`
- **APIs:** `/api/texts/[id]/reading-position`, `/api/user/tts-preferences`

### Journal Features
- **Components:** `JournalEditor.tsx`, `BacklinksPanel.tsx`, `ClipToGrimoire.tsx`
- **Extensions:** `WikiLinkExtension.ts`, `SlashMenu.tsx`, `DragHandle.tsx`
- **APIs:** `/api/journal/export/markdown`, `/api/journal/export/html`, `/api/journal/export/pdf`, `/api/journal/backlinks`, `/api/journal/clip`

### Cover System
- **Components:** Library cards, Document detail page
- **Services:** `cover-scraper.ts`, `nano-banana-cover.ts`
- **APIs:** `/api/covers/scrape`, `/api/covers/generate`, `/api/admin/covers/status`

### Phase 3
- **Components:** `GraphView.tsx`, `EntityDetails.tsx`
- **APIs:** `/api/graph/entities`, `/api/graph/edges`, `/api/concepts`, `/api/concepts/relationships`
- **Tables:** `correspondences`, `correspondence_relationships`, `convergence_concepts`, `convergence_relationships`

---

## Testing Order Recommendation

### Day 1: Core Journal Features (90 min)
1. WikiLinks (15 min)
2. Backlinks (10 min)
3. Clip to Grimoire (10 min)
4. Slash Menu (10 min)
5. Drag Handle (10 min)
6. Journal Export (20 min)
7. Buffer time (15 min)

### Day 2: TTS & Additional (80 min)
1. TTS System (30 min)
2. Cover System (15 min)
3. Phase 3 Infrastructure (20 min)
4. Buffer time (15 min)

---

## Known Issues / Notes

_Document any discovered issues here as you test:_

### Issue 1:
- **Feature:** 
- **Severity:** Critical / High / Medium / Low
- **Description:** 
- **Steps to Reproduce:** 
- **Workaround:** 

### Issue 2:
- **Feature:** 
- **Severity:** 
- **Description:** 
- **Steps to Reproduce:** 
- **Workaround:** 

---

## Sign-off Checklist

Once all P1 features are tested and pass:

- [ ] All P1 features tested
- [ ] Critical issues documented in GitHub Issues
- [ ] No blocking bugs for production
- [ ] Documentation updated with known issues
- [ ] Feature flags considered for risky features
- [ ] Rollback plan documented (if needed)

**Approved by:** _______________  
**Date:** _______________

---

## Resources

- [Comprehensive Testing Checklist](./SPRINT_5_TESTING_CHECKLIST.md)
- [Migration Verification](./MIGRATION_VERIFICATION.md)
- [Master Development Plan](../planning/MASTER_DEVELOPMENT_PLAN.md)
- [Feature Backlog](../planning/FEATURE_BACKLOG.md)

