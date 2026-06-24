# Leftover Duplicate Clusters — Manual Review

After the bulk dedup pass on prod, **26 candidate duplicate clusters** remained. These are all 2-entity pairs detected as Levenshtein-distance-1 typos or slug-stem collisions. They were intentionally NOT auto-merged because Levenshtein-1 detection produces too many false positives (distinct deities that are 1 character apart, etc.).

**Action**: Decide per row. Apply merges manually via the admin UI or a one-shot script.

## True duplicates — recommended to merge

For each, fold the second into the first (the slug starting with `<category>-` is the conventional canonical):

| Category | Canonical | Variant to fold | Reason |
|---|---|---|---|
| deity | Maat (`deity-maat`) | Ma'at (`maat`) | Apostrophe variant of same Egyptian goddess |
| stone | Amber (`stone-amber`) | Ambar (`ambar`) | Typo |
| stone | Apatite (`stone-apatite`) | Apetite (`apetite`) | Typo |
| deity | Kuan Yin (`deity-kuan-yin`) | Quan Yin (`quan-yin`) | Wade-Giles vs pinyin transliteration |
| deity | Ganesh (`deity-ganesh`) | Ganesha (`ganesha`) | Sanskrit transliteration variant |
| deity | Sarasvati (`deity-sarasvati`) | Saraswati (`saraswati`) | Sanskrit transliteration variant |
| angel | Uriel (`uriel`) | Auriel (`angel-auriel`) | Same archangel — though `angel-` prefix lives on the wrong one; consider switching canonical |
| angel | Zadkiel (`zadkiel`) | Zadikiel (`zadikiel`) | Typo |
| chakra | `fourth-chakra-heart` (FOURTH CHAKRA/HEART) | `fourth-chakra-theart` | "THEART" → "HEART" typo |

## False positives — do NOT merge

These are 1 character apart but represent genuinely different entities:

| Category | Pair | Why different |
|---|---|---|
| deity | Freyr / Freya | Different Norse deities (brother and sister) |
| deity | Gaia / Maia | Different Greek figures |
| deity | Inanna / Nanna | Different Mesopotamian deities |
| deity | Iris / Isis | Iris is Greek messenger; Isis is Egyptian |
| deity | Maia / Maya | Different traditions and concepts |
| stone | Rhodolite / Rhodonite | Different minerals (garnet variety vs manganese silicate) |
| tree | Alder / Elder | Different tree species |
| animal | Bear / Boar | Different animals |
| animal | Donkey / Monkey | Different animals |
| animal | Moose / Mouse | Different animals |
| moon_phase | Waning / Waxing | Opposite phases |
| moon_phase | WANING MOON / WAXING MOON | Opposite phases (these may themselves be merge candidates for the lowercase canonicals; separate issue) |
| ogham | Luis / Ruis | Different Ogham letters |
| hebrew_letter | Epsilon / Upsilon | Different Greek letters (note: these were imported into the `hebrew_letter` category which itself looks like a miscategorization — they're Greek, not Hebrew) |
| issue_intention_power | Danger / Anger (To Soothe, Control, Diffuse) | Different intentions |
| issue_intention_power | Charity / Clarity | Different intentions |

## Other oddities flagged

- **`color/Greed`** — exists in the color category but "Greed" is not a color. Almost certainly a data import error. Recommend: delete, or move to `issue_intention_power` if there's an intention entity it should connect to.
- **Greek letters in `hebrew_letter`** — Epsilon and Upsilon are Greek, not Hebrew. The whole `hebrew_letter` category may have some miscategorized entries; worth a separate audit.

## How to apply the true-duplicate merges

For each row in the first table, the merge is structurally identical to what the dedup tooling already does:

1. Update canonical: append variant's name to `aliases` array
2. Redirect every edge touching the variant to the canonical (with dedup)
3. Delete the variant row

The simplest path is a small one-shot script that hardcodes the 9 canonical-variant ID pairs and reuses the edge-redirect logic from `apply-dedup-plan.ts`. Faster than going through the admin UI 9 times.

