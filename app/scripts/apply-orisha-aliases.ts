/**
 * Apply tradition-correct aliases to the 9 orisha-category entities so the
 * Karade snippet extractor can bind passages back to them, AND merge the
 * Orunla entity into Orunmila (same deity, Lukumi vs Yoruba name).
 *
 * Why this exists:
 *   Karade and most modern insider sources use Yoruba spellings (Shango,
 *   Yemoja, Oshun, Obatalá). Our DB has Cuban Lukumi spellings (Chango,
 *   Yemaya, etc.) with no aliases set, so snippet matching by name overlap
 *   would miss everything. Without aliases, external-passages grounding for
 *   orisha narratives is a no-op.
 *
 * What it does:
 *   1. Adds aliases to 8 orisha entities (idempotent — set-union with existing).
 *   2. Redirects every correspondence_relationships row pointing at Orunla
 *      to point at Orunmila instead, dropping duplicates.
 *   3. Deletes the Orunla row from correspondences.
 *
 * Defaults to --dry-run. Pass --apply to actually write.
 *
 * Usage:
 *   pnpm exec tsx scripts/apply-orisha-aliases.ts             # dry-run
 *   pnpm exec tsx scripts/apply-orisha-aliases.ts --apply     # execute
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// slug → aliases to merge in. Slugs are stable; names sometimes have
// parenthetical noise we shouldn't depend on.
const ALIAS_PLAN: Record<string, string[]> = {
  chango: ['Shango', 'Sango', 'Xangô', 'Changó'],
  'mami-wata': ['Mami Wota', 'Mama Wata', 'La Sirène'],
  'obatala-owner-of-all-heads': ['Obatalá', 'Oxalá', 'Orisanla', 'Orishanla', 'Obanla'],
  ogun: ['Ogum', 'Ogou', 'Oggún'],
  olodumare: ['Olorun', 'Olódùmarè', 'Olofi'],
  // Orunmila absorbs "Orunla" as an alias — same deity, Lukumi vs Yoruba name.
  orunmila: ['Orunla', 'Ọ̀rúnmìlà', 'Ifá'],
  oshun: ['Osun', 'Ochún', 'Oxum'],
  'yemaya-the-ruler-of-the-seas': ['Yemoja', 'Yemọja', 'Yemanjá', 'Iemanjá'],
};

const ORUNLA_SLUG = 'orunla';
const ORUNMILA_SLUG = 'orunmila';

type Entity = {
  id: string;
  slug: string;
  name: string;
  aliases: string[] | null;
};

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function mergeAliases(existing: string[] | null, toAdd: string[]): { merged: string[]; added: string[] } {
  const set = new Set(existing ?? []);
  const added: string[] = [];
  for (const a of toAdd) {
    if (!set.has(a)) {
      set.add(a);
      added.push(a);
    }
  }
  return { merged: Array.from(set), added };
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const supabase = createService();

  // Confirm we are pointing at staging, NOT prod. We never run this
  // directly against production — narratives go through the existing
  // staging-first → sync workflow.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  console.log(`Target: ${url}`);
  if (url.includes('ukguqtghfglirszsqqdj')) {
    throw new Error('Refusing to run: NEXT_PUBLIC_SUPABASE_URL is production. Use staging.');
  }
  console.log(apply ? '⚠️  APPLY mode — will write.' : '🛟 Dry-run — no writes.');
  console.log('');

  // Load all 9 orisha entities by slug for lookup.
  const slugs = [...Object.keys(ALIAS_PLAN), ORUNLA_SLUG];
  const { data: rows, error } = await supabase
    .from('correspondences')
    .select('id, slug, name, aliases')
    .in('slug', slugs);
  if (error) throw new Error(`fetch orishas: ${error.message}`);
  const bySlug = new Map<string, Entity>();
  for (const r of (rows ?? []) as Entity[]) bySlug.set(r.slug, r);

  // === Step 1: alias updates ===
  console.log('=== Step 1: alias updates ===');
  for (const [slug, toAdd] of Object.entries(ALIAS_PLAN)) {
    const ent = bySlug.get(slug);
    if (!ent) {
      console.log(`  ⚠️  ${slug}: not found, skipping`);
      continue;
    }
    const { merged, added } = mergeAliases(ent.aliases, toAdd);
    if (added.length === 0) {
      console.log(`  ✓ ${ent.name}: already has all proposed aliases`);
      continue;
    }
    console.log(`  • ${ent.name}: +${added.length} aliases — ${added.join(', ')}`);
    if (apply) {
      const { error: updErr } = await supabase
        .from('correspondences')
        .update({ aliases: merged })
        .eq('id', ent.id);
      if (updErr) throw new Error(`update ${slug}: ${updErr.message}`);
    }
  }
  console.log('');

  // === Step 2: edge redirect Orunla → Orunmila ===
  console.log('=== Step 2: Orunla → Orunmila edge redirect ===');
  const orunla = bySlug.get(ORUNLA_SLUG);
  const orunmila = bySlug.get(ORUNMILA_SLUG);
  if (!orunla) {
    console.log(`  ✓ Orunla already gone — nothing to merge.`);
  } else if (!orunmila) {
    throw new Error('Orunla present but Orunmila missing — cannot merge');
  } else {
    // Find every edge touching Orunla (as source or target). Schema:
    // type (text), weight (numeric) — NOT relationship_type/strength.
    const { data: srcEdges, error: srcErr } = await supabase
      .from('correspondence_relationships')
      .select('id, source_id, target_id, type')
      .eq('source_id', orunla.id);
    if (srcErr) throw new Error(`fetch source edges: ${srcErr.message}`);
    const { data: tgtEdges, error: tgtErr } = await supabase
      .from('correspondence_relationships')
      .select('id, source_id, target_id, type')
      .eq('target_id', orunla.id);
    if (tgtErr) throw new Error(`fetch target edges: ${tgtErr.message}`);

    const allOrunla = [...(srcEdges ?? []), ...(tgtEdges ?? [])];
    console.log(`  Orunla currently touches ${allOrunla.length} edge(s).`);

    // Pull every edge that already touches Orunmila so we can detect dups
    // that would collide after the redirect.
    const { data: existingOrunmilaEdges, error: oErr } = await supabase
      .from('correspondence_relationships')
      .select('id, source_id, target_id, type')
      .or(`source_id.eq.${orunmila.id},target_id.eq.${orunmila.id}`);
    if (oErr) throw new Error(`fetch orunmila edges: ${oErr.message}`);

    const orunmilaKeys = new Set(
      (existingOrunmilaEdges ?? []).map((e: any) => `${e.source_id}|${e.target_id}|${e.type}`),
    );

    let updated = 0;
    let droppedAsDup = 0;
    for (const e of allOrunla as any[]) {
      const newSrc = e.source_id === orunla.id ? orunmila.id : e.source_id;
      const newTgt = e.target_id === orunla.id ? orunmila.id : e.target_id;
      // Skip self-loop (Orunla ↔ Orunmila would now be Orunmila ↔ Orunmila).
      if (newSrc === newTgt) {
        droppedAsDup += 1;
        if (apply) {
          const { error: delErr } = await supabase
            .from('correspondence_relationships')
            .delete()
            .eq('id', e.id);
          if (delErr) throw new Error(`delete self-loop ${e.id}: ${delErr.message}`);
        }
        continue;
      }
      const key = `${newSrc}|${newTgt}|${e.type}`;
      if (orunmilaKeys.has(key)) {
        droppedAsDup += 1;
        if (apply) {
          const { error: delErr } = await supabase
            .from('correspondence_relationships')
            .delete()
            .eq('id', e.id);
          if (delErr) throw new Error(`delete dup edge ${e.id}: ${delErr.message}`);
        }
        continue;
      }
      orunmilaKeys.add(key);
      updated += 1;
      if (apply) {
        const { error: updErr } = await supabase
          .from('correspondence_relationships')
          .update({ source_id: newSrc, target_id: newTgt })
          .eq('id', e.id);
        if (updErr) throw new Error(`redirect edge ${e.id}: ${updErr.message}`);
      }
    }
    console.log(`  redirected: ${updated}, dropped as dup/self-loop: ${droppedAsDup}`);
  }
  console.log('');

  // === Step 3: delete Orunla ===
  console.log('=== Step 3: delete Orunla ===');
  if (!orunla) {
    console.log('  ✓ Already gone.');
  } else {
    console.log(`  • DELETE correspondences WHERE id=${orunla.id} (slug=${orunla.slug})`);
    if (apply) {
      const { error: delErr } = await supabase
        .from('correspondences')
        .delete()
        .eq('id', orunla.id);
      if (delErr) throw new Error(`delete orunla: ${delErr.message}`);
    }
  }
  console.log('');

  console.log(apply ? '✓ Done.' : '🛟 Dry-run complete. Re-run with --apply to write.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
