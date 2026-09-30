# Staging Verification Report - Research + Concept Map

**Date**: Wednesday, Sep 30, 2026, 6:15 PM UTC  
**Branch**: `cursor/research-concept-map-rebuild-111c`  
**Limitation**: Docker not available on Cloud Agent VM

## Status Summary

❌ **Cannot Complete**: Local Supabase staging requires Docker, which is not available on the current VM.

✅ **What Was Verified**:
- All migration files present and syntactically valid (1-4)
- SQL test scripts (`inquiry-knowledge.sql`, `member-research.sql`) are ready
- Test suite passes (79/79 tests)
- Staging guide documented with exact setup commands

❌ **What Cannot Be Verified Without Docker**:
- Local Supabase instance startup
- Migration application to local database
- RLS policy verification
- Test user creation
- All 11 staging checklist items from scope doc §7

## Migration Files Status

### Present and Ready ✅

| # | File | Purpose | Status |
|---|---|---|---|
| 1 | `20260915120000_inquiry_knowledge.sql` | Core tables (inquiries, entities, findings) | ✅ Ready |
| 2 | `20260915123000_inquiry_search_suggestions.sql` | Search function | ✅ Ready |
| 3 | `20260916120000_research_discovery.sql` | Discovery runs table | ✅ Ready |
| 4 | `20260921120000_member_research.sql` | Per-researcher namespaces | ✅ Ready |

### Pre-requisite (Should Already Exist)
- `20260813000000_paid_only_membership_credits.sql` ✅ Present

## SQL Test Scripts Status

### inquiry-knowledge.sql ✅
Tests:
- RLS enabled on all 3 tables (inquiries, entities, findings)
- anon/authenticated have no grants (private tables)
- transition_research_finding is service-role only
- Cross-owner review blocked
- AI leads require evidence before review
- Review → publish → draft workflow
- Stale revision protection (revision counter)
- Finding ordering (move_research_finding)

### member-research.sql ✅
Tests:
- Per-researcher namespace isolation
- Entity identity is (created_by, kind, name) not global
- Cross-owner entity references blocked
- Members cannot review or publish (admin-only)
- Owner can reorder own findings
- Other owner cannot reorder

## Test Suite Status

All 79 tests passing:
- membership-catalog: 15/15 ✅
- membership-metering: 32/32 ✅
- membership-wallet: 5/5 ✅
- membership-wallet-ui: 1/1 ✅
- discovery-metered: 11/11 ✅
- membership-entitlement-resolver: 8/8 ✅
- public-launch-home: 6/6 ✅
- membership-action-list-consistency: 1/1 ✅

## Staging Checklist (Cannot Complete)

| Category | Check | Status | Notes |
|---|---|---|---|
| **Anonymous** | Map loads with empty state | ❌ Blocked | Needs Docker |
| | /api/knowledge/map no private fields | ❌ Blocked | Needs Docker |
| | /research shows join CTA | ❌ Blocked | Needs Docker |
| | "Sign in to save" button | ❌ Blocked | Needs Docker |
| **Reader** | Research returns 402 | ❌ Blocked | Needs Docker |
| | Save from map works | ❌ Blocked | Needs Docker |
| | Appears in Journal → Research | ❌ Blocked | Needs Docker |
| | 50-page cap unaffected | ❌ Blocked | Needs Docker |
| **Paid** | Wallet 30 → 27 on run | ❌ Blocked | Needs Docker + key |
| | Duplicate not charged | ❌ Blocked | Needs Docker |
| | Failed run releases | ❌ Blocked | Needs Docker |
| | Unverified email gets 403 | ❌ Blocked | Needs Docker |
| **Admin** | No charge on run | ❌ Blocked | Needs Docker |
| | Publish appears on map | ❌ Blocked | Needs Docker |
| | Unpublish removes from map | ❌ Blocked | Needs Docker |
| | 21st run gets 429 | ❌ Blocked | Needs Docker |
| **Regression** | Seven Lenses available | ❌ Blocked | Needs Docker |
| | Concept Search works | ❌ Blocked | Needs Docker |
| | The Working available | ❌ Blocked | Needs Docker |
| | Wallet UI correct | ❌ Blocked | Needs Docker |

## What's Ready for Manual Staging

### 1. Complete Setup Guide
Created `STAGING_SETUP_GUIDE.md` with:
- Step-by-step Supabase startup
- Migration application commands
- Schema verification SQL queries
- Test user creation (scripted and manual)
- App configuration (.env.local template)
- Complete staging checklist
- Screenshot requirements

### 2. All Migrations Ready
- 4 migrations present and syntactically valid
- Pre-requisite migration confirmed present
- SQL test scripts ready to verify schema

### 3. Test Environment Configuration
Environment variables documented for:
- Local Supabase connection
- Commercial action gates (research_generation)
- Metering configuration (research.investigate, enforce mode)
- Fixture password handling

### 4. Mock Provider Path Available
The `discovery-metered.test.ts` file shows how to mock the Research provider for testing without an OpenRouter key:
- Mock success responses
- Mock failure cases
- Verify credit reservation/commit/release flow

## Recommendations

### For Immediate Staging (Requires Docker Access)

1. **On a machine with Docker**:
   ```bash
   # Follow STAGING_SETUP_GUIDE.md
   cd /workspace/supabase
   supabase start
   ```

2. **Run SQL tests**:
   ```bash
   psql $DB_URL -f app/tests/inquiry-knowledge.sql
   psql $DB_URL -f app/tests/member-research.sql
   ```

3. **Create test users and run checklist**

### For OpenRouter-Dependent Checks

Without an OpenRouter key, these checks can use mocked providers:
- Research generation (use test mock from discovery-metered.test.ts)
- Credit reservation/commit flow (works with mock)
- Failure handling (inject mock failure)

These genuinely require a live key:
- Actual Research answer quality
- Actual model costs vs estimates
- Real web retrieval via OpenRouter

### Alternative: Playwright/E2E Tests

Could create automated E2E tests that:
- Start local Supabase
- Seed test data
- Run through checklist programmatically
- Capture screenshots
- Verify API responses

## Files Created

1. `/workspace/STAGING_SETUP_GUIDE.md` - Complete setup instructions
2. `/workspace/STAGING_REPORT.md` - This report
3. All tests passing and pushed to branch

## Next Steps Required

1. **Access to Docker environment** to start local Supabase
2. **Run setup guide** to create local instance and users
3. **Execute staging checklist** manually or via automated tests
4. **Capture screenshots** of:
   - Concept map empty state
   - Concept map with published connection
   - Reader save flow
   - Paid wallet before/after
5. **Optional**: OpenRouter key for live model checks (can use mocks for most verification)
