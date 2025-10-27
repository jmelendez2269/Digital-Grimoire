# End of Day Summary Rules

**Version:** 1.0  
**Created:** October 27, 2025  
**Purpose:** Ensure accurate daily summaries that reflect reality, not aspirations

---

## Core Rule: Review Before Writing

### ⚠️ MANDATORY PROCESS

**Before creating an end-of-day summary, the AI assistant MUST:**

1. **Read ALL session summaries from that day** (in sprint_summaries/)
2. **Check git commit history** to see what was actually pushed
3. **Verify what features are actually in the codebase** (not just attempted)
4. **Ask the user** if anything was reverted or removed
5. **Only then** write the end-of-day summary

### Why This Rule Exists

**Problem:** AI can write summaries of attempted work without verifying completion status.

**Risk:** Documentation claims features are complete when they were actually reverted.

**Impact:** 
- Misleading project status
- Confusion for future team members
- Inaccurate feature counts
- False progress metrics

**Solution:** Always verify reality before documenting it.

---

## End of Day Summary Checklist

Before writing the final daily summary, verify:

### ✅ Code Status
- [ ] What commits were actually pushed today?
- [ ] What files are in the repository (not reverted)?
- [ ] Are there any new files that shouldn't be there?
- [ ] Were any features attempted but rolled back?

### ✅ Session Summaries
- [ ] Read all session summary files from today
- [ ] Note which features were completed
- [ ] Note which features were attempted but failed
- [ ] Note which features were reverted
- [ ] Ask user: "Was anything else removed or reverted?"

### ✅ Feature Status
- [ ] Check feature backlog - what's marked complete?
- [ ] Check planning docs - what's checked off?
- [ ] Compare with git commits - do they match?
- [ ] If discrepancies exist, ask user for clarification

### ✅ Metrics Accuracy
- [ ] Lines of code (subtract reverted code)
- [ ] Features completed (only count what's in repo)
- [ ] Files created (only count what remains)
- [ ] Development time (don't count failed attempts in totals)

---

## Template for Daily Summary Creation

### Step 1: Gather Context (10 minutes)

```
Questions to ask user before writing:
1. "What were you working on today?"
2. "Did you complete those features, or were any reverted?"
3. "Are there any session summaries I should review first?"
4. "Were any other features removed that I should know about?"
5. "What actually got committed and pushed to the repository?"
```

### Step 2: Review Session Summaries

```bash
# Check for today's summaries
ls sprint_summaries/*OCT_27_2025.md

# Read each one:
- TTS_FEATURE_SESSION_OCT_27_2025.md
- PLANNING_DOCS_UPDATE_OCT_27_2025.md
- SESSION_SUMMARY_OCT_27_2025.md
- etc.
```

### Step 3: Verify Git History

```bash
# Check today's commits
git log --oneline --since="today"

# Check what files changed
git diff HEAD~3..HEAD --name-only

# Look for reverts
git log --all --grep="revert"
```

### Step 4: Ask User to Confirm

```
"Based on my review:
- Feature X was attempted but reverted ❌
- Feature Y was completed ✅
- Documentation was updated ✅

Is this accurate? Was anything else removed?"
```

### Step 5: Write Accurate Summary

Only after steps 1-4 are complete, write the end-of-day summary with:
- ✅ Accurate feature completion status
- ⚠️ Clear notes on reverted features
- 📊 Correct code statistics
- 🎯 Realistic next steps

---

## What to Include in End of Day Summaries

### DO Include ✅

1. **Completed features** that are in the repository
2. **Documentation updates** that were pushed
3. **Planning changes** that were committed
4. **Lessons learned** from failed attempts
5. **Realistic project status** (not aspirational)

### DO Include with Warning ⚠️

1. **Attempted features that were reverted** (marked clearly)
2. **Experiments that didn't work out** (with explanation)
3. **Scope changes** (features moved to backlog)
4. **Debugging sessions** (even if issue not resolved)

### DON'T Include ❌

1. **Features that were attempted but reverted** (as "complete")
2. **Code that was written then deleted** (in total code count)
3. **Files that were created then removed** (in file count)
4. **Features that "will be complete soon"** (if not in repo)
5. **Aspirational status** ("95% complete" when actually 85%)

---

## Example: Correct vs Incorrect

### ❌ INCORRECT End of Day Summary

```markdown
## Today's Achievements
- ✅ Implemented TTS feature (2,600 lines)
- ✅ Implemented reading progress tracking
- ✅ Updated documentation
- ✅ 18 new files created

## Project Status
- Phase 1: 100% complete
- Total features: 80 complete
```

### ✅ CORRECT End of Day Summary

```markdown
## Today's Achievements
- ⚠️ Attempted TTS feature (reverted due to errors)
- ⚠️ Attempted reading progress (removed)
- ✅ Updated documentation (3 planning docs)
- ✅ Created accurate end-of-day summary

## Project Status
- Phase 1: 95% complete (stable, no broken features)
- Total features: 78 complete (TTS deferred to Year 2)
- Lines of code: Reverted changes don't count
- Files created: 0 (all TTS files reverted)
```

**Key Difference:** The correct version is honest about what actually happened.

---

## Red Flags to Watch For

If you see these in a draft summary, STOP and verify:

⚠️ **"Implemented X feature"** → Is it actually in the repo?  
⚠️ **"X files created"** → Do those files still exist?  
⚠️ **"Y lines of code added"** → Were any reverted?  
⚠️ **"100% complete"** → Really? Check the commits.  
⚠️ **"All features working"** → Did user confirm this?

---

## When Things Go Wrong

### If You Write an Inaccurate Summary

1. **Acknowledge the mistake** immediately
2. **Create a corrected version** with accurate info
3. **Commit the correction** with clear commit message
4. **Learn from it** - what step did you skip?

### If User Corrects You

1. **Thank them** for the correction
2. **Update the summary** immediately
3. **Ask clarifying questions** about what else might be wrong
4. **Review your process** - what did you miss?

---

## Best Practices

### Communication with User

1. **Ask before assuming** - "Was this completed or reverted?"
2. **Confirm before committing** - "Does this summary look accurate?"
3. **Be transparent about uncertainty** - "I'm not sure if X was completed"
4. **Accept corrections gracefully** - "Thank you, I'll fix that"

### Documentation Quality

1. **Accuracy over impressiveness** - Better to say "attempted but failed" than "completed"
2. **Clear status indicators** - Use ✅ for complete, ⚠️ for attempted, ❌ for failed
3. **Lessons from failures** - Document what didn't work and why
4. **Realistic timelines** - Don't inflate progress for appearance

### Project Management

1. **Feature tracking** - Only count what's in the repo
2. **Code statistics** - Subtract reverted code
3. **Velocity calculations** - Don't count failed attempts
4. **Status reporting** - Be honest with stakeholders

---

## Consequences of Inaccurate Summaries

### Short-term
- ❌ Confusion about what's actually done
- ❌ Misleading project status
- ❌ Wasted time fixing documentation

### Medium-term
- ❌ New team members get wrong information
- ❌ Stakeholders make decisions on false data
- ❌ Planning based on incorrect baseline

### Long-term
- ❌ Loss of trust in documentation
- ❌ "Documentation rot" - no one believes docs
- ❌ Need to audit entire codebase to verify reality

---

## Summary of the Rule

**BEFORE writing end-of-day summary:**

1. ✅ Read ALL session summaries from today
2. ✅ Check git commits and what was actually pushed
3. ✅ Verify features exist in the codebase
4. ✅ Ask user: "Was anything reverted or removed?"
5. ✅ Only document what's actually in the repository
6. ✅ Mark attempted-but-reverted features clearly with ⚠️
7. ✅ Be honest about failures and lessons learned

**The rule exists to ensure documentation reflects reality, not aspirations.**

---

## Enforcement

This rule should be:
- ✅ Referenced in cursor rules
- ✅ Part of AI assistant prompt
- ✅ Checked during documentation reviews
- ✅ Enforced by user corrections

**Any end-of-day summary written without following this process should be immediately corrected.**

---

**Rule Created:** October 27, 2025  
**Reason:** TTS feature was documented as complete when it was actually reverted  
**Lesson:** Always verify before documenting  
**Status:** Active and Mandatory


