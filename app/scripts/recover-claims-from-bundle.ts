/**
 * recover-claims-from-bundle.ts
 *
 * Re-attaches orphaned knowledge_claims to live correspondences using the
 * in-repo graph bundle, keyed by entity_slug (NOT uuid). The 2026-05-10 import
 * loaded claims; later dedup scripts merged/removed entity rows (new uuids),
 * stranding their claims. The bundle still carries entity_slug per claim, and
 * slugs match live correspondences — so we can re-home every claim.
 *
 * IMPORTANT: this is a CLAIMS-ONLY recovery. It deliberately does NOT upsert
 * the bundle's entities (the full importer would resurrect the ~1,454 entities
 * that dedup intentionally removed). It only attaches claims to entities that
 * currently exist on live.
 *
 * Default = DRY RUN (no writes). Pass --execute to apply.
 *   Re-attach is idempotent (delete-then-insert per entity+source), mirroring
 *   importGraphBundle (app/scripts/graph-bundle.ts:635-700).
 *   With --execute --clean-orphans, also deletes claims whose entity_id no
 *   longer exists in correspondences (redundant once re-attached by slug).
 *
 * Usage:
 *   npx tsx scripts/recover-claims-from-bundle.ts
 *   npx tsx scripts/recover-claims-from-bundle.ts --input graph-bundles/staging-to-live-graph-2026-05-10.json
 *   npx tsx scripts/recover-claims-from-bundle.ts --execute
 *   npx tsx scripts/recover-claims-from-bundle.ts --execute --clean-orphans
 *
 * Design of record: docs/planning/THE_WORKING_PLAN.md
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '../src/lib/supabase/service';
import type { GraphBundle } from './graph-bundle';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const DEFAULT_BUNDLE = '../../graph-bundles/staging-to-live-graph-2026-05-10.json';

function parseArgs() {
  const args = process.argv.slice(2);
  let input = DEFAULT_BUNDLE;
  let execute = false;
  let cleanOrphans = false;
  let prod = false;
  let viaMergePlans = false;
  for (let i = 0; i < args.length; i += 1) {
    if ((args[i] === '--input' || args[i] === '-i') && args[i + 1]) {
      input = args[i + 1];
      i += 1;
    } else if (args[i] === '--execute') {
      execute = true;
    } else if (args[i] === '--clean-orphans') {
      cleanOrphans = true;
    } else if (args[i] === '--prod') {
      prod = true;
    } else if (args[i] === '--via-merge-plans') {
      viaMergePlans = true;
    }
  }
  return { input, execute, cleanOrphans, prod, viaMergePlans };
}

/**
 * Loads all *-merge-plan.json files and builds variant.id -> canonical{id,slug,name}.
 * These plans are the precise record of which deduped variant entity was merged
 * into which surviving canonical. apply-dedup-plan.ts redirected relationships but
 * NOT knowledge_claims, so variant claims were orphaned when variants were deleted.
 */
function loadMergeMap(): Map<string, { id: string; slug: string; name: string }> {
  const dir = path.resolve(__dirname, '..'); // app/
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('-merge-plan.json'));
  const map = new Map<string, { id: string; slug: string; name: string }>();
  for (const f of files) {
    const plan = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const entry of plan.plan || []) {
      const canon = entry.canonical;
      for (const v of entry.variants_to_delete || []) {
        map.set(v.id, { id: canon.id, slug: canon.slug, name: canon.name });
      }
    }
  }
  return map;
}

/**
 * .env.local defaults to STAGING (NEXT_PUBLIC_SUPABASE_URL). Production creds
 * live under PROD_SUPABASE_URL / PROD_SUPABASE_SERVICE_KEY. --prod maps them in
 * so the service client targets production. Always confirm the printed ref.
 */
function applyProdEnv() {
  const url = process.env.PROD_SUPABASE_URL;
  const key = process.env.PROD_SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('--prod requires PROD_SUPABASE_URL and PROD_SUPABASE_SERVICE_KEY in .env.local');
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = key;
}

function projectRef() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([^.]+)/)?.[1] || 'unknown';
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function ensureKnowledgeSource(
  supabase: SupabaseClient,
  source: NonNullable<NonNullable<GraphBundle['correspondences']['claims']>[number]['source']>,
): Promise<string> {
  let query = supabase.from('knowledge_sources').select('id');
  query = source.title ? query.eq('title', source.title) : query.is('title', null);
  query = source.author ? query.eq('author', source.author) : query.is('author', null);
  query = source.year ? query.eq('year', source.year) : query.is('year', null);
  query = source.citation ? query.eq('citation', source.citation) : query.is('citation', null);
  query = source.url ? query.eq('url', source.url) : query.is('url', null);
  query = source.notes ? query.eq('notes', source.notes) : query.is('notes', null);

  const { data: existing, error } = await query.limit(1);
  if (error) throw error;
  if (existing?.[0]?.id) return existing[0].id as string;

  const { data: inserted, error: insErr } = await supabase
    .from('knowledge_sources')
    .insert({
      title: source.title,
      author: source.author || null,
      year: source.year || null,
      citation: source.citation || null,
      url: source.url || null,
      notes: source.notes || null,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return inserted.id as string;
}

async function analyzeMergePlans(execute: boolean) {
  const map = loadMergeMap();
  console.log(`\nMerge-plan variant→canonical mappings: ${map.size}`);

  const supabase = createServiceClient();

  const liveEntities = await fetchAllPages<{ id: string }>((from, to) =>
    supabase.from('correspondences').select('id').range(from, to),
  );
  const liveIds = new Set(liveEntities.map((r) => r.id));

  // All current claims (for orphan detection, conflict keys, and bare-canonical detection)
  const allClaims = await fetchAllPages<{ id: string; entity_id: string; field_key: string; source_id: string | null }>(
    (from, to) =>
      supabase.from('knowledge_claims').select('id, entity_id, field_key, source_id').eq('entity_type', 'correspondence').range(from, to),
  );

  const liveClaimKey = new Set<string>(); // canonical-side existing (entity|field|source)
  const entitiesWithClaims = new Set<string>();
  for (const c of allClaims) {
    entitiesWithClaims.add(c.entity_id);
    if (liveIds.has(c.entity_id)) liveClaimKey.add(`${c.entity_id}|${c.field_key}|${c.source_id || ''}`);
  }

  const orphans = allClaims.filter((c) => !liveIds.has(c.entity_id));
  const orphanEntities = new Set(orphans.map((c) => c.entity_id));

  let remappableIntentions = 0;
  const targetCanonicals = new Set<string>();
  const unrecoverableEntities = new Set<string>();
  const seenKeys = new Set(liveClaimKey);
  const remapByCanonical = new Map<string, string[]>(); // canonicalId -> orphan claim ids to UPDATE
  const redundantIds: string[] = []; // orphan claim ids to DELETE (canonical already has it)

  for (const c of orphans) {
    const canon = map.get(c.entity_id);
    if (!canon || !liveIds.has(canon.id)) {
      unrecoverableEntities.add(c.entity_id);
      continue;
    }
    const key = `${canon.id}|${c.field_key}|${c.source_id || ''}`;
    targetCanonicals.add(canon.id);
    if (seenKeys.has(key)) {
      redundantIds.push(c.id);
    } else {
      seenKeys.add(key);
      const list = remapByCanonical.get(canon.id) || [];
      list.push(c.id);
      remapByCanonical.set(canon.id, list);
      if (c.field_key === 'issues_intentions_powers' || c.field_key === 'issue_intention_power') remappableIntentions += 1;
    }
  }

  const remappable = Array.from(remapByCanonical.values()).reduce((n, l) => n + l.length, 0);
  const redundant = redundantIds.length;
  const bareCanonicalsGaining = Array.from(targetCanonicals).filter((id) => !entitiesWithClaims.has(id)).length;

  console.log('\n--- ORPHAN STATE ---');
  console.log(`  Orphan claims:              ${orphans.length}`);
  console.log(`  Orphan entities:            ${orphanEntities.size}`);
  console.log('\n--- MERGE-PLAN RECOVERY PREVIEW ---');
  console.log(`  Claims remappable to a live canonical:   ${remappable}`);
  console.log(`    ...of which intention claims:          ${remappableIntentions}`);
  console.log(`  Claims redundant (canonical already has): ${redundant}  → delete`);
  console.log(`  Distinct canonical entities gaining claims: ${targetCanonicals.size}`);
  console.log(`    ...currently bare (no claims today):   ${bareCanonicalsGaining}`);
  console.log(`  Orphan entities with NO usable mapping:  ${unrecoverableEntities.size}`);

  if (!execute) {
    console.log('\nANALYSIS ONLY. No changes made. Re-run with --execute to apply.');
    return;
  }

  // ---- EXECUTE ----
  // 1) Snapshot full orphan rows to a timestamped JSON backup (reversibility).
  console.log('\n--- EXECUTING merge-plan recovery ---');
  const orphanIds = orphans.map((o) => o.id);
  const backupRows: any[] = [];
  for (const idChunk of chunk(orphanIds, 100)) {
    const { data, error } = await supabase
      .from('knowledge_claims')
      .select('*')
      .in('id', idChunk);
    if (error) throw error;
    backupRows.push(...(data || []));
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.resolve(__dirname, `../../graph-bundles/orphan-claims-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ created: stamp, project: projectRef(), count: backupRows.length, rows: backupRows }, null, 2));
  console.log(`  Backup written: ${backupPath} (${backupRows.length} rows)`);

  // 2) Remap: update entity_id = canonical, grouped per canonical target.
  let updated = 0;
  for (const [canonId, ids] of remapByCanonical.entries()) {
    for (const idChunk of chunk(ids, 100)) {
      const { error } = await supabase.from('knowledge_claims').update({ entity_id: canonId }).in('id', idChunk);
      if (error) throw error;
      updated += idChunk.length;
    }
  }
  console.log(`  Claims remapped to canonicals: ${updated}`);

  // 3) Delete redundant duplicates (canonical already had field+source).
  let deleted = 0;
  for (const idChunk of chunk(redundantIds, 100)) {
    const { error } = await supabase.from('knowledge_claims').delete().in('id', idChunk);
    if (error) throw error;
    deleted += idChunk.length;
  }
  console.log(`  Redundant claims deleted: ${deleted}`);

  const remainingOrphanClaims = orphans.length - updated - deleted;
  console.log(`  Remaining orphan claims (unmapped, left for review): ${remainingOrphanClaims}`);
  console.log('\nEXECUTE complete.');
  console.log('NEXT: re-run migration 041 backfill so entity_intentions ingests the recovered intention claims.');
}

async function main() {
  const { input, execute, cleanOrphans, prod, viaMergePlans } = parseArgs();
  if (prod) applyProdEnv();
  const inputPath = path.resolve(__dirname, input);

  console.log('='.repeat(70));
  console.log(`recover-claims  [${execute ? 'EXECUTE' : 'DRY RUN'}]  ${viaMergePlans ? 'via MERGE PLANS' : 'via BUNDLE'}`);
  console.log(`target project: ${projectRef()}  ${prod ? '(PRODUCTION)' : '(staging — default)'}`);
  if (!viaMergePlans) console.log(`bundle: ${inputPath}`);
  console.log('='.repeat(70));

  if (viaMergePlans) {
    await analyzeMergePlans(execute);
    return;
  }

  const bundle = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as GraphBundle;
  const claims = bundle.correspondences.claims || [];
  console.log(`\nBundle claims: ${claims.length}`);

  const supabase = createServiceClient();

  // Live entities: slug -> id
  const liveEntities = await fetchAllPages<{ id: string; slug: string }>((from, to) =>
    supabase.from('correspondences').select('id, slug').order('slug').range(from, to),
  );
  const idBySlug = new Map(liveEntities.map((r) => [r.slug, r.id] as const));
  const liveIds = new Set(liveEntities.map((r) => r.id));
  console.log(`Live correspondences: ${liveEntities.length}`);

  // Current claims: entity_id (to compute bare entities + orphans)
  const currentClaims = await fetchAllPages<{ entity_id: string }>((from, to) =>
    supabase.from('knowledge_claims').select('entity_id').eq('entity_type', 'correspondence').range(from, to),
  );
  const claimCountByEntity = new Map<string, number>();
  let currentOrphans = 0;
  for (const c of currentClaims) {
    claimCountByEntity.set(c.entity_id, (claimCountByEntity.get(c.entity_id) ?? 0) + 1);
    if (!liveIds.has(c.entity_id)) currentOrphans += 1;
  }
  const bareLiveEntities = liveEntities.filter((e) => !claimCountByEntity.has(e.id));

  // Resolve bundle claims against live slugs
  let recoverable = 0;
  let skippedNoSlug = 0;
  const receivingEntityIds = new Set<string>();
  const unmatchedSlugs = new Set<string>();
  for (const claim of claims) {
    const id = idBySlug.get(claim.entity_slug);
    if (id) {
      recoverable += 1;
      receivingEntityIds.add(id);
    } else {
      skippedNoSlug += 1;
      unmatchedSlugs.add(claim.entity_slug);
    }
  }
  const receivingThatAreBare = Array.from(receivingEntityIds).filter(
    (id) => !claimCountByEntity.has(id),
  ).length;

  console.log('\n--- CURRENT STATE ---');
  console.log(`  Total live claims:               ${currentClaims.length}`);
  console.log(`  Orphaned claims (dead entity):   ${currentOrphans}`);
  console.log(`  Live entities WITHOUT any claims: ${bareLiveEntities.length} / ${liveEntities.length}`);

  console.log('\n--- RECOVERY PREVIEW ---');
  console.log(`  Bundle claims that re-attach:    ${recoverable}`);
  console.log(`  Bundle claims skipped (slug not on live / deduped): ${skippedNoSlug}`);
  console.log(`  Distinct live entities receiving claims: ${receivingEntityIds.size}`);
  console.log(`    ...of which currently bare:    ${receivingThatAreBare}`);
  console.log(`  Distinct unmatched slugs:        ${unmatchedSlugs.size}`);
  if (unmatchedSlugs.size > 0) {
    console.log(`    sample: ${Array.from(unmatchedSlugs).slice(0, 8).join(', ')}`);
  }
  console.log(`  Orphans that would be removable after re-attach: ${currentOrphans}`);

  if (!execute) {
    console.log('\nDRY RUN complete. No changes made. Re-run with --execute to apply.');
    console.log('(add --clean-orphans to also delete redundant orphaned claims)');
    return;
  }

  // ---- EXECUTE: claims-only re-attach (idempotent delete-then-insert) ----
  console.log('\n--- EXECUTING re-attach ---');
  const sourceIdByFingerprint = new Map<string, string>();
  const resolved: Array<{
    entity_type: string;
    entity_id: string;
    source_id: string | null;
    field_key: string;
    field_value: string | null;
    field_value_json: unknown | null;
    confidence: string | null;
    notes: string | null;
  }> = [];

  for (const claim of claims) {
    const entity_id = idBySlug.get(claim.entity_slug);
    if (!entity_id) continue;
    let source_id: string | null = null;
    if (claim.source?.title) {
      const fp = stableStringify(claim.source);
      source_id = sourceIdByFingerprint.get(fp) || (await ensureKnowledgeSource(supabase, claim.source));
      sourceIdByFingerprint.set(fp, source_id);
    }
    resolved.push({
      entity_type: 'correspondence',
      entity_id,
      source_id,
      field_key: claim.field_key,
      field_value: claim.field_value || null,
      field_value_json: claim.field_value_json ?? null,
      confidence: claim.confidence || null,
      notes: claim.notes || null,
    });
  }

  // Group by source so delete-then-insert is scoped correctly
  const bySource = new Map<string, typeof resolved>();
  for (const c of resolved) {
    const k = c.source_id || '__NULL_SOURCE__';
    const g = bySource.get(k) || [];
    g.push(c);
    bySource.set(k, g);
  }

  let inserted = 0;
  for (const [sourceKey, group] of bySource.entries()) {
    const entityIds = Array.from(new Set(group.map((c) => c.entity_id)));
    for (const idChunk of chunk(entityIds, 250)) {
      let del = supabase.from('knowledge_claims').delete().eq('entity_type', 'correspondence').in('entity_id', idChunk);
      del = sourceKey === '__NULL_SOURCE__' ? del.is('source_id', null) : del.eq('source_id', sourceKey);
      const { error } = await del;
      if (error) throw error;
    }
    for (const insChunk of chunk(group, 500)) {
      const { error } = await supabase.from('knowledge_claims').insert(insChunk);
      if (error) throw error;
      inserted += insChunk.length;
    }
  }
  console.log(`  Re-attached claims inserted: ${inserted}`);

  if (cleanOrphans) {
    console.log('\n--- CLEANING ORPHANS ---');
    const refreshed = await fetchAllPages<{ id: string; entity_id: string }>((from, to) =>
      supabase.from('knowledge_claims').select('id, entity_id').eq('entity_type', 'correspondence').range(from, to),
    );
    const orphanIds = refreshed.filter((r) => !liveIds.has(r.entity_id)).map((r) => r.id);
    console.log(`  Orphan claims to delete: ${orphanIds.length}`);
    let deleted = 0;
    for (const idChunk of chunk(orphanIds, 500)) {
      const { error } = await supabase.from('knowledge_claims').delete().in('id', idChunk);
      if (error) throw error;
      deleted += idChunk.length;
    }
    console.log(`  Orphan claims deleted: ${deleted}`);
  }

  console.log('\nEXECUTE complete.');
  console.log('NEXT: re-run migration 041 backfill so entity_intentions picks up newly-attached intention claims.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
