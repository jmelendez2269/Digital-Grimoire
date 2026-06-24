/**
 * Clean up the `celebration` category before drafting:
 *
 *   1. Merge ALL-CAPS date-prefixed duplicates into the clean lowercase
 *      canonical entity, parsing tradition-aliases (Samhuinn, Hallowmas,
 *      Alban Arthan, etc.) out of the duplicate's name.
 *   2. Delete obvious garbage entries that aren't celebrations at all
 *      (`ring)`, `Spinel`, `Jasper ( ocean )`, `Earth Day Gemstones: Iolite`).
 *   3. Leave aspectual parenthetical variants alone — `Samhain (ancestors)`,
 *      `Saturnalia (of roles)`, etc. — since those look intentional. Flag
 *      them for follow-up review.
 *   4. Flag `Morrigan` — likely a deity miscategorized. Print whether she
 *      exists in `deity` already so the user can decide whether to delete
 *      her from `celebration` or move her.
 *
 * Defaults to --dry-run. Pass --apply to write.
 *
 * Usage:
 *   pnpm exec tsx scripts/cleanup-celebrations.ts
 *   pnpm exec tsx scripts/cleanup-celebrations.ts --apply
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Each entry: canonical name (lowercase), and the duplicate's full DB name.
// Aliases are auto-parsed from the duplicate's name (after the date prefix,
// splitting on "/"), with the canonical itself filtered out.
const MERGE_PAIRS: Array<{ canonicalName: string; duplicateName: string }> = [
  { canonicalName: 'Samhain', duplicateName: 'OCTOBER 31 - SAMHAIN/SAMHUINN/HALLOWMAS' },
  { canonicalName: 'Yule', duplicateName: 'DECEMBER 21 OR 22 YULE/WINTER SOLSTICE/ALBAN ARTHAN' },
  { canonicalName: 'Beltane', duplicateName: 'MAY 1 - BELTANE/BEALTEINE/MAY DAY' },
  { canonicalName: 'Imbolc', duplicateName: 'FEBRUARY 1 OR 2 - IMBOLC/IMBOLG/CANDLEMAS/OIMELC' },
  { canonicalName: 'Ostara', duplicateName: 'MARCH 21 OR 22 - OSTARA/SPRING OR VERNAL EQUINOX/ALBAN EILIR' },
  { canonicalName: 'Lughnasadh', duplicateName: 'AUGUST 1 - LUGHNASADH/LAMMAS' },
  { canonicalName: 'Mabon', duplicateName: 'SEPTEMBER 21 OR 22 - MABON/AUTUMN EQUINOX/ALBAN ELFED' },
  { canonicalName: 'Litha', duplicateName: 'JUNE 21 OR 22 - LITHA/SUMMER SOLSTICE/ALBAN HEFIN' },
  { canonicalName: 'Walpurgis', duplicateName: 'APRIL 30 - WALPURGIS/MAY EVE' },
  { canonicalName: 'Saturnalia', duplicateName: 'DECEMBER 17 TO 23 - SATURNALIA' },
  { canonicalName: 'Rosalia', duplicateName: 'MAY 23 - ROSALIA/ROSE FESTIVAL' },
  { canonicalName: 'Compitalia', duplicateName: 'JANUARY 12 - COMPITALIA/FEAST OF THE LARES' },
  { canonicalName: 'Lupercalia', duplicateName: "FEBRUARY 15 - LUPERCALIA/PAN'S DAY" },
  { canonicalName: 'Lunantishees', duplicateName: 'NOVEMBER 11 - LUNANTISHEES' },
  { canonicalName: 'Night of Hecate', duplicateName: 'NOVEMBER 16 - NIGHT OF HECATE' },
  { canonicalName: 'Hunting of the Wren', duplicateName: 'DECEMBER 26 - HUNTING OF THE WREN' },
  { canonicalName: 'Birth of Isis', duplicateName: 'JULY 17 - BIRTHDAY OF ISIS' },
  { canonicalName: 'Vasant Panchami', duplicateName: '5TH DAY OF MAGHA (JANUARY/FEBRUARY) VASANT PANCHAMI' },
  { canonicalName: "New Year’s Day", duplicateName: "JANUARY 1 - NEW YEAR'S DAY/HOGMANAY" },
  { canonicalName: 'Earth Day', duplicateName: 'APRIL 22 - EARTH DAY' },
  { canonicalName: 'Festival of Luna', duplicateName: 'MARCH 31 - FESTIVAL OF LUNA' },
  { canonicalName: 'Midsummer’s Eve', duplicateName: "JUNE 22 OR 23 - MIDSUMMER'S EVE & MIDSUMMER" },
];

// The Twelfth set is messy — three different entries. We'll fold January 6
// into the cleaner `Twelfth Night (return from)` since `Twelfth` is just a
// fragment with no qualifier and probably another piece of garbage.
const TWELFTH_MERGE = {
  canonicalName: 'Twelfth Night (return from)',
  duplicateName: 'JANUARY 6 - TWELFTH NIGHT/EPIPHANY OF KORE-PERSEPHONE/BERTHA NIGHT',
};

// Hard delete list — these aren't celebrations at all.
const DELETE_NAMES = [
  'ring)',
  'Spinel',
  'Jasper ( ocean )',
  'Earth Day Gemstones: Iolite',
  'Twelfth', // fragment, no qualifier — likely import garbage
];

// Morrigan: she's a goddess, not a celebration. We just check and report.
const MORRIGAN_NAME = 'Morrigan';

type Entity = {
  id: string;
  slug: string;
  name: string;
  aliases: string[] | null;
  category: string;
};

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

/**
 * Parse the secondary names out of a duplicate entry name.
 *   "OCTOBER 31 - SAMHAIN/SAMHUINN/HALLOWMAS" -> ["Samhuinn", "Hallowmas"]
 *   "MAY 1 - BELTANE/BEALTEINE/MAY DAY"      -> ["Bealteine", "May Day"]
 *   "JANUARY 1 - NEW YEAR'S DAY/HOGMANAY"    -> ["Hogmanay"]
 *
 * Strategy: drop everything before the first " - " (the date), then drop
 * any 5TH DAY OF / parenthetical date hint, split the remainder on /,
 * skip empties and the canonical itself, Title-Case the survivors.
 */
function parseAliasesFromDuplicateName(dupName: string, canonical: string): string[] {
  // Drop "5TH DAY OF MAGHA (JANUARY/FEBRUARY) VASANT PANCHAMI" prefix.
  let body = dupName.replace(/^\d+(?:ST|ND|RD|TH)\s+DAY\s+OF\s+\S+\s*(?:\([^)]+\))?\s*/i, '');
  // Drop the "DATE - " prefix if present.
  body = body.replace(/^[A-Z0-9 ]+?\s*-\s*/i, '');
  // For names like "DECEMBER 21 OR 22 YULE/..." that lack the dash:
  body = body.replace(/^[A-Z]+\s+\d+(?:\s+OR\s+\d+)?\s+/i, '');
  // Split on / and on & (Midsummer's Eve & Midsummer).
  const parts = body
    .split(/[/&]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const titleCase = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bOr\b/g, 'or')
      .replace(/'/g, '’');

  return parts
    .map(titleCase)
    .filter((p) => p.toLowerCase() !== canonical.toLowerCase())
    // Drop anything that's just generic season-equinox-solstice without
    // qualifying word — those are usually noise. Keep "Winter Solstice",
    // "Summer Solstice", etc., but drop bare "Equinox" or "Solstice".
    .filter((p) => p.length >= 4);
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const supabase = createService();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  console.log(`Target: ${url}`);
  if (url.includes('ukguqtghfglirszsqqdj')) {
    throw new Error('Refusing to run: NEXT_PUBLIC_SUPABASE_URL is production. Use staging.');
  }
  console.log(apply ? '⚠️  APPLY mode — will write.' : '🛟 Dry-run — no writes.');
  console.log('');

  // Load every celebration entity once.
  const { data: rows, error } = await supabase
    .from('correspondences')
    .select('id, slug, name, aliases, category')
    .eq('category', 'celebration');
  if (error) throw new Error(`fetch: ${error.message}`);
  const byName = new Map<string, Entity>();
  for (const r of (rows ?? []) as Entity[]) byName.set(r.name, r);
  console.log(`Loaded ${byName.size} celebration entities.`);

  // === Step 1: merge ALL-CAPS duplicates into canonicals ===
  console.log('\n=== Step 1: merge ALL-CAPS duplicates into canonicals ===');
  const allMerges = [...MERGE_PAIRS, TWELFTH_MERGE];
  for (const pair of allMerges) {
    const canonical = byName.get(pair.canonicalName);
    const dup = byName.get(pair.duplicateName);
    if (!canonical) {
      console.log(`  ⚠️  canonical '${pair.canonicalName}' not found, skipping`);
      continue;
    }
    if (!dup) {
      console.log(`  ✓ duplicate '${pair.duplicateName}' already gone`);
      continue;
    }
    const parsedAliases = parseAliasesFromDuplicateName(pair.duplicateName, pair.canonicalName);
    const existing = new Set(canonical.aliases ?? []);
    const newAliases = parsedAliases.filter((a) => !existing.has(a));
    const merged = [...(canonical.aliases ?? []), ...newAliases];

    console.log(`  • ${pair.canonicalName} ← ${pair.duplicateName}`);
    console.log(`      aliases to add: ${newAliases.join(', ') || '(none)'}`);

    if (apply && newAliases.length > 0) {
      const { error: uErr } = await supabase
        .from('correspondences')
        .update({ aliases: merged })
        .eq('id', canonical.id);
      if (uErr) throw new Error(`alias update ${canonical.name}: ${uErr.message}`);
    }

    // Redirect edges from duplicate → canonical, deduping.
    const { data: dupEdges } = await supabase
      .from('correspondence_relationships')
      .select('id, source_id, target_id, type')
      .or(`source_id.eq.${dup.id},target_id.eq.${dup.id}`);
    const { data: canEdges } = await supabase
      .from('correspondence_relationships')
      .select('id, source_id, target_id, type')
      .or(`source_id.eq.${canonical.id},target_id.eq.${canonical.id}`);
    const canKeys = new Set(
      (canEdges ?? []).map((e: any) => `${e.source_id}|${e.target_id}|${e.type}`),
    );

    let redirected = 0;
    let dropped = 0;
    for (const e of (dupEdges ?? []) as any[]) {
      const newSrc = e.source_id === dup.id ? canonical.id : e.source_id;
      const newTgt = e.target_id === dup.id ? canonical.id : e.target_id;
      if (newSrc === newTgt) {
        dropped += 1;
        if (apply) {
          await supabase.from('correspondence_relationships').delete().eq('id', e.id);
        }
        continue;
      }
      const key = `${newSrc}|${newTgt}|${e.type}`;
      if (canKeys.has(key)) {
        dropped += 1;
        if (apply) {
          await supabase.from('correspondence_relationships').delete().eq('id', e.id);
        }
        continue;
      }
      canKeys.add(key);
      redirected += 1;
      if (apply) {
        await supabase
          .from('correspondence_relationships')
          .update({ source_id: newSrc, target_id: newTgt })
          .eq('id', e.id);
      }
    }
    console.log(`      edges: redirected=${redirected}, dropped=${dropped}`);

    // Delete the duplicate.
    if (apply) {
      await supabase.from('correspondences').delete().eq('id', dup.id);
    }
    console.log(`      ${apply ? 'deleted' : 'would delete'} duplicate row`);
  }

  // === Step 2: delete garbage entries ===
  console.log('\n=== Step 2: delete garbage entries ===');
  for (const name of DELETE_NAMES) {
    const ent = byName.get(name);
    if (!ent) {
      console.log(`  ✓ '${name}' not found, skipping`);
      continue;
    }
    // Drop any edges first.
    const { data: edges } = await supabase
      .from('correspondence_relationships')
      .select('id')
      .or(`source_id.eq.${ent.id},target_id.eq.${ent.id}`);
    console.log(`  • DELETE '${name}' (${edges?.length ?? 0} edge(s) will also be deleted)`);
    if (apply) {
      if (edges && edges.length > 0) {
        for (const e of edges) {
          await supabase.from('correspondence_relationships').delete().eq('id', e.id);
        }
      }
      await supabase.from('correspondences').delete().eq('id', ent.id);
    }
  }

  // === Step 3: Morrigan check ===
  console.log('\n=== Step 3: Morrigan (likely miscategorized) ===');
  const { data: morriganMatches } = await supabase
    .from('correspondences')
    .select('id, slug, name, category')
    .ilike('name', 'Morrigan%');
  for (const m of morriganMatches ?? []) {
    console.log(`  found: name='${m.name}' category='${m.category}' slug=${m.slug}`);
  }
  console.log("  → If a deity-category Morrigan already exists, the celebration one should be deleted. If not, recategorize. Manual call.");

  console.log('');
  console.log(apply ? '✓ Done.' : '🛟 Dry-run complete. Re-run with --apply to write.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
