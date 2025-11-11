# File Naming Conventions

**Last Updated:** November 10, 2025  
**Status:** Active

---

## 📁 Sprint Summaries Folder

**Location:** `Digital-Grimoire/sprint_summaries/`

### Naming Convention

All sprint summary files must follow these naming patterns:

#### Daily Session Summaries
```
TODAY_SESSION_SUMMARY_YYYY-MM-DD.md
```

**Examples:**
- `TODAY_SESSION_SUMMARY_2025-11-10.md`
- `TODAY_SESSION_SUMMARY_2025-11-03.md`
- `TODAY_SESSION_SUMMARY_2025-10-30.md`

**When to use:**
- Full day work sessions
- Multiple features worked on in one day
- General development sessions

#### Feature-Specific Sessions
```
FEATURE_NAME_SESSION_YYYY-MM-DD.md
```

**Examples:**
- `SENDGRID_SETUP_SESSION_2025-11-10.md` (if it's a single feature focus)
- `SPRINT_3_AWS_MIGRATION_SESSION.md`
- `TTS_FEATURE_SESSION_OCT_27_2025.md`

**When to use:**
- Single feature or focused work
- Specific infrastructure setup
- Dedicated feature development

**Note:** If a feature session becomes a full day summary, rename it to `TODAY_SESSION_SUMMARY_YYYY-MM-DD.md`

#### Sprint Completion Summaries
```
SPRINT_X_COMPLETE.md
```

**Examples:**
- `SPRINT_1_COMPLETE.md`
- `SPRINT_2_COMPLETE.md`
- `SPRINT_5_COMPLETE.md`

**When to use:**
- End of sprint milestone
- Major phase completion
- Comprehensive sprint review

#### Sprint Progress Summaries
```
SPRINT_X_PROGRESS.md
```

**Examples:**
- `SPRINT_1_PROGRESS.md`
- `SPRINT_2_PROGRESS.md`

**When to use:**
- Mid-sprint updates
- Progress checkpoints
- Status updates

#### Other Session Types
```
DESCRIPTIVE_NAME_MON_DD_YYYY.md
```

**Examples:**
- `SESSION_SUMMARY_OCT_27_2025.md`
- `END_OF_DAY_SUMMARY_OCT_27_2025.md`
- `PLANNING_DOCS_UPDATE_OCT_27_2025.md`

**When to use:**
- Special purpose summaries
- Planning sessions
- End of day wrap-ups

---

## 📋 Date Format Rules

### Primary Format (Preferred)
- **Format:** `YYYY-MM-DD`
- **Example:** `2025-11-10`
- **Use for:** All new files

### Alternative Format (Legacy)
- **Format:** `MON_DD_YYYY`
- **Example:** `OCT_27_2025`
- **Use for:** Only if maintaining consistency with existing files

**Rule:** New files should always use `YYYY-MM-DD` format.

---

## ✅ File Location Rules

### Sprint Summaries
- **Must be in:** `Digital-Grimoire/sprint_summaries/`
- **Never in:** Root directory or nested folders
- **Never in:** `Digital-Grimoire/Digital-Grimoire/sprint_summaries/` (wrong location)

### Documentation Files
- **Planning docs:** `Digital-Grimoire/docs/planning/`
- **Setup docs:** `Digital-Grimoire/docs/Setup Docs/`
- **Rules:** `Digital-Grimoire/docs/rules/`
- **Guides:** `Digital-Grimoire/docs/guides/`

### Migration Files
- **Must be in:** `Digital-Grimoire/migrations/`
- **Format:** `XXX_description.sql` (e.g., `023_add_feedback_system.sql`)

---

## 🔍 File Naming Checklist

Before creating a new file, verify:

- [ ] File name follows the correct pattern for its type
- [ ] Date format is `YYYY-MM-DD` (or matches existing pattern if legacy)
- [ ] File is in the correct directory
- [ ] No duplicate files exist for the same date/session
- [ ] File name is descriptive and clear
- [ ] All caps for constants (e.g., `TODAY_SESSION_SUMMARY`)
- [ ] Underscores separate words (not spaces or hyphens in filenames)

---

## 🚫 Common Mistakes to Avoid

### ❌ Wrong Naming
- `today-session-summary-2025-11-10.md` (uses hyphens)
- `Today Session Summary 2025-11-10.md` (uses spaces)
- `session_summary_11-10-2025.md` (wrong date format)
- `SENDGRID_SETUP_SESSION.md` (missing date)

### ❌ Wrong Location
- `Digital-Grimoire/TODAY_SESSION_SUMMARY_2025-11-10.md` (root directory)
- `Digital-Grimoire/Digital-Grimoire/sprint_summaries/file.md` (nested wrong)

### ✅ Correct Naming
- `TODAY_SESSION_SUMMARY_2025-11-10.md` (correct pattern, date, location)
- `SPRINT_1_COMPLETE.md` (correct pattern)
- `FEATURE_NAME_SESSION_2025-11-10.md` (correct pattern)

---

## 📝 Merging Session Summaries

If multiple summaries exist for the same day:

1. **Merge into:** `TODAY_SESSION_SUMMARY_YYYY-MM-DD.md`
2. **Update:** Session type, duration, and goals to reflect all work
3. **Combine:** All accomplishments from both sessions
4. **Delete:** Duplicate files after merging
5. **Commit:** With message indicating merge

**Example:**
- `SENDGRID_SETUP_SESSION_2025-11-10.md` + `TODAY_SESSION_SUMMARY_2025-11-10.md`
- → Merge into `TODAY_SESSION_SUMMARY_2025-11-10.md`
- → Delete `SENDGRID_SETUP_SESSION_2025-11-10.md`

---

## 🔄 Renaming Files

When renaming files to match conventions:

1. Use git `mv` command to preserve history:
   ```bash
   git mv OLD_NAME.md NEW_NAME.md
   ```

2. Or use PowerShell Move-Item:
   ```powershell
   Move-Item -Path "OLD_NAME.md" -Destination "NEW_NAME.md" -Force
   ```

3. Commit the rename:
   ```bash
   git add -A
   git commit -m "docs: rename file to match naming convention"
   ```

---

## 📚 Related Documentation

- [Workspace Structure Rules](./WORKSPACE_STRUCTURE_RULES.md)
- [End of Day Summary Rules](./End_of_Day_Summary_Rules.md)

---

**Enforcement:** All AI assistants and developers must follow these conventions when creating or renaming files in the sprint_summaries folder.

