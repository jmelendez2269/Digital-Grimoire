# External Passages — drafting-only grounding

This folder holds **per-category snippets from copyrighted modern sources** that the narrative-drafting script uses as context but never stores in the library, database, or git.

## Why this exists

The library is public-domain only. That covers the vast majority of correspondence categories (deities, classical stones, biblical/Hindu/Buddhist/Sufi/Christian texts, anthropology, psychology, philosophy) but leaves real gaps in modern syncretic material:

- **Wiccan / Sabbat practice** — Wheel of the Year is post-1950s synthesis
- **Modern crystal magic** — Cunningham-era and later vocabulary
- **Yoruba diaspora / orisha** — public-domain options are thin and there are sensitivities
- **Hyper-specific modern categories** — Merkaba, Star Tetrahedron, contemporary archetype work

For these, we feed the LLM grounding from copyrighted sources as drafting context. The narrative output is original synthesis, not quotation. Source snippets stay on your machine.

## File format

One file per category, named exactly `<category>.md` matching the value in `correspondences.category`. Examples:

- `celebration.md` — Wiccan Sabbats and seasonal observances
- `orisha.md` — Yoruba and diaspora deities
- `sacred_geometry.md` — Modern New-Age geometric forms
- `mantra.md`, `mudra.md`, `yoga_pose.md` — Yogic practice categories

Inside each file, snippets are separated by `## Title — Source` headers. Optional `genre:` line on the first body line lets you set the framing hint.

```markdown
# celebration

## Yule (Winter Solstice) — From [Your Source Title, Author]
genre: contemporary Wiccan synthesis
Yule, celebrated on or near the winter solstice, marks the rebirth of the Sun and the return of light from the longest night. In contemporary Wiccan practice, the Goddess gives birth to the God of the waxing year...

## Imbolc / Candlemas — From [Your Source Title, Author]
genre: contemporary Wiccan synthesis
Imbolc, falling at the start of February, marks the quickening of the year. Sacred to the goddess Brigid, who in modern practice is honored as patroness of poetry, smithcraft, and healing flame...
```

### Header parsing rules

- `## Title — Source` (em-dash, en-dash, or plain hyphen with spaces) splits into `title` + `source`. Both shown to the LLM in the prompt header.
- `## Title` alone is fine — `source` is left blank.
- `genre: <text>` on the first non-blank line of the body sets the genre hint the LLM uses to frame the snippet. Examples that work well: *"contemporary Wiccan synthesis," "modern crystal-magic tradition," "Yoruba diaspora practice," "Jung-adjacent contemporary archetype work," "New-Age sacred-geometry teaching."*
- Everything else under the header until the next `##` is body content. `# Category` headers at the top of the file are skipped.

### Matching to entities

For each entity in the file's category, the script scores snippets by how many of the entity's name + aliases appear in the snippet's title or body. Up to 4 best-matching snippets per entity get injected into the prompt. If no snippet matches an entity's phrases, that entity gets no external grounding (still drafts via the library + structural picture).

So **include the entity's canonical name or one of its aliases in each snippet's title or body** to bind the snippet to the right entity.

## What the LLM does with these

The system prompt tells the model:
- Treat external snippets as supplementary grounding, like library passages.
- Frame them according to the `genre` (or the source line) — never as ancient lineage when they're modern syncretic work.
- Synthesize original prose. **Do not quote verbatim.** The narrative output is what ships; the source stays local.

## What does NOT belong here

- **PD sources** — those go through `/api/import-sacred-text` into the library normally. (Kunz, Vivekananda, Jastrow, etc.)
- **Anything you'd want public users to be able to read directly** — only synthesized narratives ship, not snippets.
- **Anything redistribution-prohibited even for context** — check the source's license. Most reference books permit research/transformative use; check before adding.

## How to know it's working

When `draft-entity-narratives.ts` runs on an entity that has matched snippets, the per-entity log line shows `external: N` alongside `passages:` / `claims:` / `edges:`. If it shows `external: 0` for an entity you expected to match, the snippet's text probably doesn't contain the entity name or its aliases — adjust the snippet header or body.

## Cleanup

The `.gitignore` in this folder excludes every `.md` file except this README. Snippets you drop in are local-only by default. To rotate or remove sources, just delete the file.
