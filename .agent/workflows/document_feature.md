---
description: Analyze code and generate User and Technical documentation for the Wiki.
---

# Documentation Generation Workflow

Follow these steps to generate high-quality documentation for the project's Wiki.

## 1. Context Gathering

1. **Identify Target**: Confirm the folder or component the user wants to document.
2. **Explore Code**:
    * Use `list_dir` to see the file structure.
    * Use `view_file` to read the main entry points (e.g., `page.tsx`, `route.ts`, `index.ts`, or specific `.tsx` components).
    * **Crucial**: check imports to understand dependencies and context.

## 2. Generate Technical Guide

1. Construct the content for the **Technical Guide**.
2. **File Path**: `app/src/content/wiki/technical/[feature-name].md` (use kebab-case).
3. **Required Content Structure**:

    ```markdown
    ---
    title: [Feature Name] Technical Guide
    type: technical
    status: stable # or draft
    created_at: [Current Date]
    tags: [component, api, etc]
    ---

    # [Feature Name] (Technical)

    ## Overview
    [Brief technical summary]

    ## Architecture
    ```mermaid
    graph TD
    %% [Generate a mermaid graph showing component hierarchy and data flow]
    ```

    ## File Structure

    [File tree]

    ## Component API

    | Prop | Type | Description |
    |------|------|-------------|
    | [Name] | [Type] | [Description] |

    ## Data Flow

    * **Inputs**: [Where data comes from]
    * **Outputs**: [Actions/Mutations]

    ## Critical Implementation Details

    * **Performance**: [Memoization, Server Components, etc.]
    * **Accessibility**: [ARIA roles, Keyboard checks]
    * **Security**: [Auth checks, Input validation]

    ## Dependencies

    [List internal and external libs]

    ```

4. Use `write_to_file` to save this content.

## 3. Generate User Guide

1. Construct the content for the **User Guide**.
2. **File Path**: `app/src/content/wiki/user/[feature-name].md` (use kebab-case).
3. **Required Content Structure**:

    ```markdown
    ---
    title: [Feature Name] User Guide
    type: user
    audience: [Admin/general]
    difficulty: [Beginner/Intermediate/Advanced]
    ---

    # [Feature Name] (User Guide)

    ## What is it?
    [Non-technical explanation]

    ## User Scenarios
    *   "As a user, I want to [action] so that [benefit]."

    ## How to Use
    1.  **Navigate to**: [Path]
    2.  **Action**: [Step]
    3.  **Result**: [What happens]

    ## visual Reference
    [Placeholder: Screenshot of X]

    ## FAQ
    [Common questions]

    ## Related Links
    *   [Link to other wiki pages]
    ```

4. Use `write_to_file` to save this content.

## 4. Update Master Index

1. Read `app/src/content/wiki/index.md` (or create it if it doesn't exist).
2. Append links to the new documents in their respective sections.
