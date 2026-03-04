---
description: Update technical and end-user documentation whenever a new feature is added or modified
---

# Wiki Update Skill

Whenever you add, modify, or remove a feature in this project, you **MUST** update the documentation. This is a non-negotiable part of every feature implementation.

---

## Documentation Structure

Documentation is now integrated into the application wiki and lives in `app/src/content/wiki/`.

```markdown
app/src/content/wiki/
├── user/               ← End-user guides (Plain language)
│   └── [feature].md    ← e.g. workbench.md, tarot.md
├── technical/          ← Core technical & admin reference
│   └── [feature].md    ← e.g. workbench.md, home.md
└── index.md            ← The main Wiki Hub (Index of all docs)
```

---

## Routing & URL Structure

When linking between wiki pages, follow these path patterns:

| Doc Type | File Location | Public URL |
|---|---|---|
| **User Guide** | `user/*.md` | `/wiki/*` |
| **Technical Doc** | `technical/*.md` | `/admin/wiki/*` |

> [!IMPORTANT]
> **Internal Links:** Do **NOT** include the `/user/` or `/technical/` directory name in the link path within the markdown files. The application's route handler appends these automatically based on the base route used.
>
> - **Correct:** `[Link Text](/wiki/home)`
> - **Correct:** `[Technical Ref](/admin/wiki/workbench)`
> - **Incorrect:** `[Link Text](/wiki/user/home)`

---

## When to Update Docs

Update documentation for **every** task that involves:

- Adding a new page, route, or navigation item
- New or modified database tables, columns, or RLS policies
- New API endpoints or changes to existing ones
- New or significantly changed UI components
- Rebranding, renaming, or reorganizing features
- Changes to environment variables or configuration
- New third-party integrations

---

## Step 1: Technical Documentation (Admin)

Create or update a file in `app/src/content/wiki/technical/` named `[feature_name].md`. This should contain architecture, file paths, and database details.

### Technical Doc Template

```markdown
# Technical Reference: [Feature Name]

## Overview
[1–3 sentence summary of implementation]

## Route Map
[Table of old → new routes if applicable]

## File Structure
[Directory tree of key files]

## Components & Database
[Details on UI components and SQL changes]

## Related
- [User Guide: [Feature Name]](/wiki/[slug])
```

---

## Step 2: End-User Guide (Wiki)

Create or update a file in `app/src/content/wiki/user/` named `[feature_name].md`. Write this in **plain language** for non-technical users.

### User Guide Template

```markdown
# User Guide: [Feature Name]

## Overview
[Paragraph explaining the feature in plain English]

## How To Use
[Step-by-step instructions]

## Tips for Success
[Suggestions for getting the most out of the tool]

---
*Last Updated: [Month Year]*
```

---

## Step 3: Update the Wiki Hub

Update `app/src/content/wiki/index.md` to include your new documentation under the appropriate category.

---

## Step 4: Update internal references

If a feature was renamed or moved, grep for its old name across existing docs and update tags:

```powershell
grep -r "old feature name" app/src/content/wiki/ --include="*.md"
```

---

## Checklist Before Marking a Task Complete

- [ ] User guide updated in `app/src/content/wiki/user/`
- [ ] Technical guide updated in `app/src/content/wiki/technical/`
- [ ] Links verified (no `/user/` or `/technical/` prefixes in URLs)
- [ ] `index.md` updated with new links
- [ ] `Last Updated` date is current

---

## Examples

| Feature | Technical Doc | User Guide |
|---|---|---|
| Workbench restructure | `technical/workbench.md` | `user/workbench.md` |
| Study Journal | `technical/journal.md` | *(pre-dates this skill)* |
| Concept Search | `technical/search.md` | *(pre-dates this skill)* |

---

> **Note:** If a feature is purely a bug fix with no user-facing change, a brief addition to an existing troubleshooting doc is sufficient — a full new doc is not required.
