/**
 * Applies the 9 true-duplicate merges identified in
 * docs/planning/LEFTOVER_DUPLICATES_REVIEW.md. These are Levenshtein-1 typo
 * pairs and transliteration variants that the automated planner skipped
 * because the audit-detection heuristic also produces false positives.
 *
 * For each pair: fold the variant into the canonical (add as alias,
 * redirect edges with dedup, delete variant row).
 *
 * Defaults to --dry-run. Pass --apply to write.
 *
 * Usage:
 *   pnpm exec tsx scripts/apply-leftover-merges.ts --db prod
 *   pnpm exec tsx scripts/apply-leftover-merges.ts --db prod --apply
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// canonical_slug, variant_slug — variant folds into canonical.
const MERGES: Array<{ canonical: string; variant: string }> = [
  { canonical: 'deity-maat', variant: 'maat' },                    // Maat / Ma'at
  { canonical: 'stone-amber', variant: 'ambar' },                  // Amber / Ambar typo
  { canonical: 'stone-apatite', variant: 'apetite' },              // Apatite / Apetite typo
  { canonical: 'deity-kuan-yin', variant: 'quan-yin' },            // transliteration
  { canonical: 'deity-ganesh', variant: 'ganesha' },               // transliteration
  { canonical: 'deity-sarasvati', variant: 'saraswati' },          // transliteration
  { canonical: 'uriel', variant: 'angel-auriel' },                 // Uriel / Auriel
  { canonical: 'zadkiel', variant: 'zadikiel' },                   // typo
  { canonical: 'fourth-chakra-heart', variant: 'fourth-chakra-theart' }, // typo
];

(async () => {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const dbIdx = argv.indexOf('--db');
  const db = (dbIdx >= 0 ? argv[dbIdx + 1] : 'staging') as 'staging' | 'prod';
  const url = db === 'prod' ? process.env.PROD_SUPABASE_URL! : process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = db === 'prod' ? process.env.PROD_SUPABASE_SERVICE_KEY! : process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const s = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  console.log(`DB: ${db} (${url})`);
  console.log(apply ? '⚠️  APPLY MODE.' : '🛟 Dry-run.');

  let merged = 0;
  let skipped = 0;
  let aliasesAdded = 0;
  let edgesRedirected = 0;
  let edgesDropped = 0;

  for (const pair of MERGES) {
    const { data: rows, error } = await s
      .from('correspondences')
      .select('id, slug, name, aliases')
      .in('slug', [pair.canonical, pair.variant]);
    if (error) throw new Error(`fetch ${pair.canonical}/${pair.variant}: ${error.message}`);
    const canon = rows?.find((r) => r.slug === pair.canonical);
    const variant = rows?.find((r) => r.slug === pair.variant);

    if (!canon) {
      console.log(`  ⚠️  ${pair.canonical} not found, skipping`);
      skipped += 1;
      continue;
    }
    if (!variant) {
      console.log(`  ✓ ${pair.variant} already gone — already merged`);
      skipped += 1;
      continue;
    }

    console.log(`\n  ${pair.canonical} ← ${pair.variant}  ("${canon.name}" absorbs "${variant.name}")`);

    // 1. Add variant name to canonical aliases (skip dup).
    const aliasSet = new Set<string>(canon.aliases ?? []);
    if (!aliasSet.has(variant.name)) {
      aliasSet.add(variant.name);
      console.log(`    + alias: "${variant.name}"`);
      aliasesAdded += 1;
      if (apply) {
        const { error: uErr } = await s
          .from('correspondences')
          .update({ aliases: Array.from(aliasSet) })
          .eq('id', canon.id);
        if (uErr) throw new Error(`alias update: ${uErr.message}`);
      }
    }

    // 2. Redirect edges.
    const { data: canEdges } = await s
      .from('correspondence_relationships')
      .select('id, source_id, target_id, type')
      .or(`source_id.eq.${canon.id},target_id.eq.${canon.id}`);
    const canKeys = new Set(
      (canEdges ?? []).map((e: any) => `${e.source_id}|${e.target_id}|${e.type}`),
    );

    const { data: srcEdges } = await s
      .from('correspondence_relationships')
      .select('id, source_id, target_id, type')
      .eq('source_id', variant.id);
    const { data: tgtEdges } = await s
      .from('correspondence_relationships')
      .select('id, source_id, target_id, type')
      .eq('target_id', variant.id);
    const variantEdges = [...(srcEdges ?? []), ...(tgtEdges ?? [])];

    for (const e of variantEdges) {
      const newSrc = e.source_id === variant.id ? canon.id : e.source_id;
      const newTgt = e.target_id === variant.id ? canon.id : e.target_id;
      if (newSrc === newTgt) {
        edgesDropped += 1;
        if (apply) await s.from('correspondence_relationships').delete().eq('id', e.id);
        continue;
      }
      const key = `${newSrc}|${newTgt}|${e.type}`;
      if (canKeys.has(key)) {
        edgesDropped += 1;
        if (apply) await s.from('correspondence_relationships').delete().eq('id', e.id);
        continue;
      }
      canKeys.add(key);
      edgesRedirected += 1;
      if (apply) {
        const { error: uErr } = await s
          .from('correspondence_relationships')
          .update({ source_id: newSrc, target_id: newTgt })
          .eq('id', e.id);
        if (uErr) throw new Error(`redirect: ${uErr.message}`);
      }
    }
    console.log(`    edges: ${variantEdges.length} touching variant → ${edgesRedirected} redirected, ${edgesDropped} dropped (running totals)`);

    // 3. Delete variant.
    if (apply) {
      const { error: dErr } = await s.from('correspondences').delete().eq('id', variant.id);
      if (dErr) throw new Error(`delete variant: ${dErr.message}`);
    }
    merged += 1;
  }

  console.log('\n=== Summary ===');
  console.log(`  pairs merged:        ${merged}`);
  console.log(`  pairs skipped:       ${skipped}`);
  console.log(`  aliases added:       ${aliasesAdded}`);
  console.log(`  edges redirected:    ${edgesRedirected}`);
  console.log(`  edges dropped:       ${edgesDropped}`);
  console.log(apply ? '\n✓ Applied.' : '\n🛟 Dry-run.');
})();
