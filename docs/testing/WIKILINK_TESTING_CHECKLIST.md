# WikiLink Feature Testing Checklist

**Feature:** Wiki-Link Activation System  
**Sprint:** 6  
**Date:** November 2, 2025  
**Status:** Ready for Testing

---

## Prerequisites

- [ ] Dev server running (`pnpm dev` in `app/` directory)
- [ ] Logged in as authenticated user
- [ ] At least 2 journal pages created for testing
- [ ] Browser console open (F12) for debugging

---

## A. Basic WikiLink Creation & Display

### Test 1: Create WikiLink
**Steps:**
1. Open any journal page
2. Type `[[Test Page]]` in the editor
3. Press space or continue typing

**Expected:**
- [ ] Text converts to amber-colored wiki link
- [ ] Link displays as `[[Test Page]]`
- [ ] Link has hover state (cursor changes)

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 2: WikiLink Styling
**Steps:**
1. Create multiple wiki links with different names
2. Verify visual consistency

**Expected:**
- [ ] All links have amber color (`text-amber-400`)
- [ ] Links are distinguishable from regular text
- [ ] Hover shows pointer cursor

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

## B. Click-to-Activate Behavior

### Test 3: Click Existing WikiLink
**Steps:**
1. Create a wiki link to an existing page (e.g., `[[Page A]]`)
2. Click the wiki link

**Expected:**
- [ ] Action card appears in bottom-right corner
- [ ] Card shows "WikiLink activated"
- [ ] Card displays `[[Page A]]`
- [ ] Three buttons visible: "Open page", "Preview", "Ask AI"
- [ ] "Dismiss" button at bottom

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 4: Click Non-Existent WikiLink
**Steps:**
1. Create a wiki link to a page that doesn't exist (e.g., `[[New Page]]`)
2. Click the wiki link

**Expected:**
- [ ] Action card appears
- [ ] Same three buttons available
- [ ] No errors in console

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

## C. Navigation Flow

### Test 5: Navigate to Existing Page
**Steps:**
1. Click a wiki link to an existing page
2. Click "Open page" button in action card

**Expected:**
- [ ] Button shows "Opening..." during navigation
- [ ] Browser navigates to `/journal/[page-id]`
- [ ] Target page loads correctly
- [ ] Action card dismisses automatically

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 6: Create New Page from WikiLink
**Steps:**
1. Click a wiki link to a non-existent page (e.g., `[[Brand New Page]]`)
2. Click "Open page" button
3. Confirm creation in the prompt

**Expected:**
- [ ] Browser prompt asks: "Page 'Brand New Page' doesn't exist. Create it?"
- [ ] Clicking "OK" creates the page
- [ ] Browser navigates to new page
- [ ] New page has correct title
- [ ] New page has empty content

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 7: Cancel Page Creation
**Steps:**
1. Click a wiki link to a non-existent page
2. Click "Open page" button
3. Click "Cancel" in the prompt

**Expected:**
- [ ] No page is created
- [ ] Action card remains visible
- [ ] No navigation occurs
- [ ] No errors in console

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

## D. Preview Feature

### Test 8: Preview Existing Page
**Steps:**
1. Click a wiki link to an existing page with content
2. Click "Preview" button

**Expected:**
- [ ] Modal overlay appears (full-screen with backdrop)
- [ ] Page icon displayed (emoji)
- [ ] Page title displayed
- [ ] "Last updated" date shown
- [ ] Content excerpt visible
- [ ] "Open page" and "Close" buttons at bottom

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 9: Preview with Backlinks
**Steps:**
1. Create Page A and Page B
2. In Page B, add `[[Page A]]`
3. From Page B, click the wiki link to Page A
4. Click "Preview"

**Expected:**
- [ ] Preview modal shows Page A content
- [ ] "Backlinks (1)" section appears
- [ ] Page B listed as backlink
- [ ] Backlink shows title and excerpt

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 10: Preview Non-Existent Page
**Steps:**
1. Click wiki link to non-existent page
2. Click "Preview" button

**Expected:**
- [ ] Modal appears
- [ ] Error message: "Page '[name]' not found"
- [ ] No crash or console errors

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 11: Preview Caching
**Steps:**
1. Preview a page (first time)
2. Close preview
3. Preview the same page again (second time)

**Expected:**
- [ ] First preview shows "Loading preview..."
- [ ] Second preview loads instantly (from cache)
- [ ] No duplicate API calls in Network tab

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 12: Navigate from Preview
**Steps:**
1. Open preview modal
2. Click "Open page" button inside preview

**Expected:**
- [ ] Preview modal closes
- [ ] Browser navigates to target page
- [ ] Action card dismisses

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

## E. AI Actions Menu

### Test 13: Open AI Menu
**Steps:**
1. Click any wiki link
2. Click "Ask AI" button

**Expected:**
- [ ] Modal overlay appears
- [ ] Title shows "AI Actions for [[Page Name]]"
- [ ] Three action buttons visible:
  - [ ] 📝 Summarize Page
  - [ ] 🔗 Suggest Connections
  - [ ] ✨ Draft Content
- [ ] Each button has description text

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 14: Execute "Summarize Page"
**Steps:**
1. Open AI menu for existing page
2. Click "📝 Summarize Page"

**Expected:**
- [ ] Button disappears, shows "Processing AI request..."
- [ ] After ~1 second, result appears
- [ ] Result shows summary text
- [ ] "Close" and "Try Another" buttons appear

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 15: Execute "Suggest Connections"
**Steps:**
1. Open AI menu
2. Click "🔗 Suggest Connections"

**Expected:**
- [ ] Loading state appears
- [ ] Result shows suggested connections
- [ ] Placeholder text: "(AI-powered suggestions coming soon)"

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 16: Execute "Draft Content"
**Steps:**
1. Open AI menu
2. Click "✨ Draft Content"

**Expected:**
- [ ] Loading state appears
- [ ] Result shows draft markdown content
- [ ] Draft includes: Introduction, Key Points, Next Steps

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 17: Try Multiple AI Actions
**Steps:**
1. Execute one AI action
2. Click "Try Another" button
3. Execute a different action

**Expected:**
- [ ] Result clears
- [ ] Action menu reappears
- [ ] Second action executes successfully
- [ ] No state conflicts

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

## F. Telemetry & History

### Test 18: Activation History Tracking
**Steps:**
1. Click 3 different wiki links
2. Open browser DevTools → Application → Local Storage
3. Check for `wikilink-history` key

**Expected:**
- [ ] `wikilink-history` exists in localStorage
- [ ] Contains array of 3 entries
- [ ] Each entry has `detail` (title/slug) and `timestamp`
- [ ] Most recent activation is first

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 19: History Persistence
**Steps:**
1. Click a wiki link
2. Refresh the page (F5)
3. Check localStorage again

**Expected:**
- [ ] History persists after refresh
- [ ] Same entries present

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 20: History Limit (50 entries)
**Steps:**
1. Activate 60+ wiki links (can script this if needed)
2. Check localStorage

**Expected:**
- [ ] Only last 50 entries stored
- [ ] Oldest entries dropped
- [ ] No memory issues

**Actual Result:**
- [ ] Pass / ❌ Fail (or skip if too tedious)
- Notes: ___________

---

## G. Edge Cases & Error Handling

### Test 21: Empty WikiLink
**Steps:**
1. Create `[[]]` (empty brackets)
2. Try to click it

**Expected:**
- [ ] Link renders (even if empty)
- [ ] Clicking shows action card
- [ ] No crashes or errors

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 22: Special Characters in WikiLink
**Steps:**
1. Create `[[Page with "quotes" & symbols!]]`
2. Click and try to navigate

**Expected:**
- [ ] Link renders correctly
- [ ] Navigation works
- [ ] Page created with correct title

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 23: Very Long WikiLink Title
**Steps:**
1. Create `[[This is a very long page title that exceeds normal length expectations and might cause layout issues]]`
2. Click and preview

**Expected:**
- [ ] Action card displays without overflow
- [ ] Preview modal handles long title
- [ ] No layout breaks

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 24: Rapid Clicking
**Steps:**
1. Click same wiki link 5 times rapidly

**Expected:**
- [ ] Action card appears once
- [ ] No duplicate modals
- [ ] No console errors
- [ ] State remains consistent

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 25: Network Failure Handling
**Steps:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to navigate or preview a wiki link

**Expected:**
- [ ] Error message displayed
- [ ] Alert: "Failed to navigate to page" or "Failed to load preview"
- [ ] No crash
- [ ] Can retry after going back online

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

## H. Keyboard & Accessibility

### Test 26: Keyboard Shortcut (Ctrl/Cmd+Enter)
**Steps:**
1. Place cursor inside a wiki link
2. Press Ctrl+Enter (Windows) or Cmd+Enter (Mac)

**Expected:**
- [ ] Action card appears
- [ ] Console log: `[WikiLinkExtension] wikilink-activate`
- [ ] Same behavior as clicking

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 27: Dismiss with Escape Key
**Steps:**
1. Open action card
2. Press Escape key

**Expected:**
- [ ] Action card dismisses (if implemented)
- [ ] OR: No effect (acceptable for MVP)

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

## I. Integration Tests

### Test 28: WikiLink in Different Block Types
**Steps:**
1. Create wiki links in:
   - [ ] Paragraph
   - [ ] Heading
   - [ ] List item
   - [ ] Blockquote

**Expected:**
- [ ] All render correctly
- [ ] All are clickable
- [ ] Styling consistent

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 29: Multiple WikiLinks in One Paragraph
**Steps:**
1. Create: "See [[Page A]] and [[Page B]] for more info"
2. Click each link

**Expected:**
- [ ] Both links work independently
- [ ] Correct page shown in action card
- [ ] No interference between links

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

### Test 30: WikiLink After Page Save
**Steps:**
1. Create wiki link
2. Save page (auto-save or manual)
3. Refresh page
4. Click wiki link

**Expected:**
- [ ] Wiki link persists after save
- [ ] Still clickable after refresh
- [ ] Data attributes intact

**Actual Result:**
- [ ] Pass / ❌ Fail
- Notes: ___________

---

## Summary

**Total Tests:** 30  
**Passed:** ___  
**Failed:** ___  
**Skipped:** ___  

**Critical Issues Found:**
- 

**Minor Issues Found:**
- 

**Recommendations:**
- 

**Tested By:** ___________  
**Date:** ___________  
**Browser:** ___________  
**OS:** ___________

---

## Notes

Add any additional observations, bugs, or suggestions here:


