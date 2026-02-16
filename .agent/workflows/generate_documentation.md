---
description: Generate comprehensive User and Technical documentation for a specific feature or component.
---

1. **Context Gathering**:
    * **Goal**: Understand the feature's purpose, architecture, and usage.
    * **Action**: Use `run_command` to list files in the target directory (`ls -R [path]`) and read key files (`page.tsx`, `index.ts`, `layout.tsx`, types).
    * **Analysis**: Identify:
        * **User Value**: What does this do for the end user?
        * **Technical Implementation**: Dependencies, state management, API calls.
        * **Data Models**: Types and database schemas used.

2. **Generate Technical Documentation**:
    * **Target File**: `app/src/content/wiki/technical/[feature-name].md`
    * **Template**:

        ```markdown
        ---
        title: [Feature Name] Architecture
        type: architecture
        status: stable
        audience: developer
        description: Technical deep dive into [Feature Name].
        ---

        # [Feature Name] Technical Documentation

        ## Overview
        [Brief technical summary of the component/feature.]

        ## Visual Architecture
        [Mermaid diagram showing component hierarchy or data flow]
        ```mermaid
        graph TD
            A[Component] --> B[Sub-Component]
            A --> C[API Route]
        ```

        ## Data Flow & API

        ### Props & State

        | Prop | Type | Description |
        |---|---|---|
        | `example` | `string` | ... |

        ### Data Sources

        * Fetches data from `[Source]` using `[Hook/Method]`.
        * Updates `[Table]` via `[Action]`.

        ## Performance & Security

        * **Rendering**: [Client/Server] Side.
        * **Security**: [RLS Policies / Auth Checks].
        * **Performance**: [Memoization / specialized patterns].

        ## Accessibility (Dev)

        * [ ] Semantic HTML used.
        * [ ] Keyboard navigable.
        * [ ] ARIA labels present where needed.

        ```

3. **Generate User Documentation**:
    * **Target File**: `app/src/content/wiki/user/[feature-name].md`
    * **Template**:

        ```markdown
        ---
        title: [Feature Name] Guide
        type: guide
        status: stable
        audience: user
        description: How to use [Feature Name] effectively.
        ---

        # [Feature Name]

        ## Introduction
        [High-level value proposition. Why should I use this?]

        ## User Scenarios
        *   **When to use**: [Scenario 1]
        *   **When to use**: [Scenario 2]

        ## Step-by-Step Instructions
        1.  Go to `[Path]`.
        2.  Click `[Button]`.
        3.  Result: `[Outcome]`.

        > [!TIP]
        > [Helpful power user tip]

        ## Related Links
        *   [Link to other guide]
        ```

4. **Update Index**:
    * **Action**: Add links to the new files in `app/src/content/wiki/index.md`.
    * **Format**:
        * User: `* [**Title**](/wiki/user/[slug])` under User Guides.
        * Technical: `* [**Title**](/wiki/technical/[slug])` under Technical Documentation.

5. **Validation**:
    * **Action**: Verify files are created and the index is updated.
    * **Action**: Brief the user on the new documentation.
