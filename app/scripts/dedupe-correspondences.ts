/**
 * Detect and merge duplicate rows in `correspondences`. The alias-apply pass
 * surfaced these clearly: Horus, Osiris, Inanna, Krishna, Vishnu, Shiva,
 * Durga, Buddha, Parvati, Thoth all exist as two rows each; Jupiter +
 * JUPITER, Mars + MARS, Saturn + SATURN, etc. are case-duplicate pairs;
 * Real History of the Rosicrucians surfaced earlier the same way.
 *
 * Strategy:
 *   1. Group rows by (category, normalized-name). Normalized = trim,
 *      lowercase, collapse internal whitespace. Different categories with
 *      the same name (Mercury as deity vs. metal vs. planetary_body) are
 *      kept separate by design — they are NOT duplicates.
 *   2. In each duplicate group, pick a CANONICAL row by score: prefers
 *      approved narrative > description present > more edges > more claims
 *      > more aliases > older created_at.
 *   3. Merge the other rows into canonical:
 *      - aliases / lenses → union
 *      - description / narrative_draft / narrative_status / narrative_source:
 *          prefer canonical's existing values; otherwise lift from the
 *          duplicate.
 *      - Repoint correspondence_relationships.source_id and target_id
 *        from duplicate.id to canonical.id. Handle unique-edge conflicts
 *        (canonical already has the same edge type to the same other end)
 *        by DELETING the duplicate's conflicting edge instead of repointing.
 *      - Repoint knowledge_claims.entity_id from duplicate.id to canonical.id
 *        where entity_type='correspondence'. Same conflict policy.
 *      - Delete the duplicate row.
 *
 * Read-only by default. Pass --apply to perform the merges.
 *
 * Usage:
 *   pnpm exec tsx scripts/dedupe-correspondences.ts                            # full dry-run report
 *   pnpm exec tsx scripts/dedupe-correspondences.ts --name horus               # one group only
 *   pnpm exec tsx scripts/dedupe-correspondences.ts --category deity           # one category
 *   pnpm exec tsx scripts/dedupe-correspondences.ts --apply                    # write changes
 *   pnpm exec tsx scripts/dedupe-correspondences.ts --name horus --apply       # safest first run
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type Args = {
  apply: boolean;
  name: string | null;
  category: string | null;
};

type EntityRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  aliases: string[] | null;
  description: string | null;
  lenses: string[] | null;
  narrative_draft: string | null;
  narrative_status: string;
  narrative_source: string | null;
  created_at: string;
};

type EdgeRow = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight: number | null;
  confidence: string | null;
};

type ClaimRow = {
  id: string;
  entity_id: string;
  entity_type: string;
  field_key: string;
  field_value: string | null;
  source_id: string | null;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { apply: false, name: null, category: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--name') {
      out.name = (argv[i + 1] ?? '').toLowerCase();
      i += 1;
    } else if (a === '--category') {
      out.category = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(`Dedupe duplicate rows in correspondences.

Flags:
  --name <text>     Filter to one group by case-insensitive name match
  --category <cat>  Restrict to one category
  --apply           Perform the merges (destructive)
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function dedupKey(name: string, category: string): string {
  return `${category}::${name.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}

function uniqueLowercaseJoined(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    const k = trimmed.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(trimmed);
  }
  return out;
}

const STATUS_PRIORITY: Record<string, number> = {
  approved: 3,
  draft: 2,
  missing: 1,
};

async function listEntities(supabase: SupabaseClient, args: Args): Promise<EntityRow[]> {
  const PAGE = 1000;
  const rows: EntityRow[] = [];
  let from = 0;
  let query = supabase
    .from('correspondences')
    .select(
      'id, slug, name, category, aliases, description, lenses, narrative_draft, narrative_status, narrative_source, created_at',
    );
  if (args.category) query = query.eq('category', args.category);
  while (true) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`correspondences page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as EntityRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function countsByEntity(
  supabase: SupabaseClient,
  ids: string[],
): Promise<{ edges: Map<string, number>; claims: Map<string, number> }> {
  const edges = new Map<string, number>();
  const claims = new Map<string, number>();
  const ID_BATCH = 60;

  // Edges: count source_id and target_id occurrences across both ends.
  for (let i = 0; i < ids.length; i += ID_BATCH) {
    const slice = ids.slice(i, i + ID_BATCH);
    const { data, error } = await supabase
      .from('correspondence_relationships')
      .select('source_id, target_id')
      .or(`source_id.in.(${slice.join(',')}),target_id.in.(${slice.join(',')})`);
    if (error) throw new Error(`edges count batch ${i}: ${error.message}`);
    for (const r of data ?? []) {
      if (slice.includes(r.source_id)) edges.set(r.source_id, (edges.get(r.source_id) ?? 0) + 1);
      if (slice.includes(r.target_id)) edges.set(r.target_id, (edges.get(r.target_id) ?? 0) + 1);
    }
  }

  // Claims: count knowledge_claims rows per entity_id.
  for (let i = 0; i < ids.length; i += ID_BATCH) {
    const slice = ids.slice(i, i + ID_BATCH);
    const { data, error } = await supabase
      .from('knowledge_claims')
      .select('entity_id')
      .eq('entity_type', 'correspondence')
      .in('entity_id', slice);
    if (error) throw new Error(`claims count batch ${i}: ${error.message}`);
    for (const r of data ?? []) {
      claims.set(r.entity_id, (claims.get(r.entity_id) ?? 0) + 1);
    }
  }

  return { edges, claims };
}

function scoreEntity(
  e: EntityRow,
  ctx: { edges: Map<string, number>; claims: Map<string, number> },
): number {
  let score = 0;
  if (e.narrative_status === 'approved') score += 1_000_000;
  if (e.description && e.description.trim().length > 0) score += 100_000;
  if (e.narrative_status === 'draft') score += 10_000;
  if (e.narrative_draft && e.narrative_draft.trim().length > 0) score += 5_000;
  score += (ctx.edges.get(e.id) ?? 0) * 100;
  score += (ctx.claims.get(e.id) ?? 0) * 50;
  score += (e.aliases?.length ?? 0) * 10;
  score += (e.lenses?.length ?? 0) * 5;
  // Older rows are preferred as canonical on ties (more stable identifiers).
  score += new Date(e.created_at).getTime() === 0 ? 0 : -new Date(e.created_at).getTime() / 1e12;
  return score;
}

function mergeFields(canonical: EntityRow, dup: EntityRow): Partial<EntityRow> {
  const aliases = uniqueLowercaseJoined([
    ...(canonical.aliases ?? []),
    ...(dup.aliases ?? []),
    dup.name, // the duplicate's name itself is now an alias of canonical
  ]).filter((a) => a.toLowerCase() !== canonical.name.toLowerCase());

  const lenses = uniqueLowercaseJoined([...(canonical.lenses ?? []), ...(dup.lenses ?? [])]);

  const description =
    (canonical.description && canonical.description.trim().length > 0
      ? canonical.description
      : dup.description) ?? null;

  const narrative_draft =
    (canonical.narrative_draft && canonical.narrative_draft.trim().length > 0
      ? canonical.narrative_draft
      : dup.narrative_draft) ?? null;

  const canonicalPriority = STATUS_PRIORITY[canonical.narrative_status] ?? 0;
  const dupPriority = STATUS_PRIORITY[dup.narrative_status] ?? 0;
  const narrative_status =
    dupPriority > canonicalPriority ? dup.narrative_status : canonical.narrative_status;
  const narrative_source =
    dupPriority > canonicalPriority
      ? dup.narrative_source ?? canonical.narrative_source
      : canonical.narrative_source ?? dup.narrative_source;

  return { aliases, lenses, description, narrative_draft, narrative_status, narrative_source };
}

async function repointEdges(
  supabase: SupabaseClient,
  dupId: string,
  canonicalId: string,
): Promise<{ repointed: number; deletedConflicts: number }> {
  // Fetch all edges touching the duplicate end.
  const { data: dupEdges, error: dupErr } = await supabase
    .from('correspondence_relationships')
    .select('id, source_id, target_id, type')
    .or(`source_id.eq.${dupId},target_id.eq.${dupId}`);
  if (dupErr) throw new Error(`fetch dup edges: ${dupErr.message}`);

  // Fetch canonical's edges so we can detect (source,target,type) conflicts
  // before issuing UPDATEs that would violate the unique index.
  const { data: canonEdges, error: canonErr } = await supabase
    .from('correspondence_relationships')
    .select('id, source_id, target_id, type')
    .or(`source_id.eq.${canonicalId},target_id.eq.${canonicalId}`);
  if (canonErr) throw new Error(`fetch canon edges: ${canonErr.message}`);

  const canonKeys = new Set(
    (canonEdges ?? []).map((e) => `${e.source_id}::${e.target_id}::${e.type}`),
  );

  let repointed = 0;
  let deletedConflicts = 0;
  for (const e of dupEdges ?? []) {
    const newSource = e.source_id === dupId ? canonicalId : e.source_id;
    const newTarget = e.target_id === dupId ? canonicalId : e.target_id;
    // Self-loop: edge connects dup to itself, which after repointing would
    // be canonical-to-canonical. Drop it.
    if (newSource === newTarget) {
      const { error } = await supabase
        .from('correspondence_relationships')
        .delete()
        .eq('id', e.id);
      if (error) throw new Error(`delete self-loop edge ${e.id}: ${error.message}`);
      deletedConflicts += 1;
      continue;
    }
    const k = `${newSource}::${newTarget}::${e.type}`;
    if (canonKeys.has(k)) {
      // Canonical already has this edge. Drop the duplicate.
      const { error } = await supabase
        .from('correspondence_relationships')
        .delete()
        .eq('id', e.id);
      if (error) throw new Error(`delete conflict edge ${e.id}: ${error.message}`);
      deletedConflicts += 1;
      continue;
    }
    canonKeys.add(k);
    const { error } = await supabase
      .from('correspondence_relationships')
      .update({ source_id: newSource, target_id: newTarget })
      .eq('id', e.id);
    if (error) throw new Error(`repoint edge ${e.id}: ${error.message}`);
    repointed += 1;
  }
  return { repointed, deletedConflicts };
}

async function repointClaims(
  supabase: SupabaseClient,
  dupId: string,
  canonicalId: string,
): Promise<{ repointed: number; deletedConflicts: number }> {
  const { data: dupClaims, error: dupErr } = await supabase
    .from('knowledge_claims')
    .select('id, field_key, field_value, source_id')
    .eq('entity_type', 'correspondence')
    .eq('entity_id', dupId);
  if (dupErr) throw new Error(`fetch dup claims: ${dupErr.message}`);

  const { data: canonClaims, error: canonErr } = await supabase
    .from('knowledge_claims')
    .select('id, field_key, field_value, source_id')
    .eq('entity_type', 'correspondence')
    .eq('entity_id', canonicalId);
  if (canonErr) throw new Error(`fetch canon claims: ${canonErr.message}`);

  // Claims uniqueness varies by schema; we treat (field_key, field_value, source_id)
  // as the de-facto identity for "the same claim" so we don't bring in
  // exact duplicates. If your schema enforces stricter uniqueness, the
  // update step will surface the constraint error and you can adjust the
  // key tuple below.
  const canonKeys = new Set(
    (canonClaims ?? []).map((c) => `${c.field_key}|${c.field_value ?? ''}|${c.source_id ?? ''}`),
  );

  let repointed = 0;
  let deletedConflicts = 0;
  for (const c of dupClaims ?? []) {
    const k = `${c.field_key}|${c.field_value ?? ''}|${c.source_id ?? ''}`;
    if (canonKeys.has(k)) {
      const { error } = await supabase.from('knowledge_claims').delete().eq('id', c.id);
      if (error) throw new Error(`delete conflict claim ${c.id}: ${error.message}`);
      deletedConflicts += 1;
      continue;
    }
    canonKeys.add(k);
    const { error } = await supabase
      .from('knowledge_claims')
      .update({ entity_id: canonicalId })
      .eq('id', c.id);
    if (error) throw new Error(`repoint claim ${c.id}: ${error.message}`);
    repointed += 1;
  }
  return { repointed, deletedConflicts };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService();

  console.log(`Dedupe correspondences — apply=${args.apply}, name=${args.name ?? 'all'}, category=${args.category ?? 'all'}`);

  const entities = await listEntities(supabase, args);

  // Group by (category, normalized-name).
  const groups = new Map<string, EntityRow[]>();
  for (const e of entities) {
    const k = dedupKey(e.name, e.category);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }

  let duplicateGroups = Array.from(groups.values()).filter((g) => g.length > 1);
  if (args.name) {
    const q = args.name;
    duplicateGroups = duplicateGroups.filter((g) =>
      g.some((e) => e.name.toLowerCase().includes(q)),
    );
  }

  console.log(`Duplicate groups found: ${duplicateGroups.length}`);
  if (duplicateGroups.length === 0) {
    console.log('Nothing to dedupe.');
    return;
  }

  // Score every entity that appears in a duplicate group so we can pick canonical.
  const allDupIds = duplicateGroups.flatMap((g) => g.map((e) => e.id));
  const counts = await countsByEntity(supabase, allDupIds);

  let mergedRows = 0;
  let mergedEdges = 0;
  let droppedConflictEdges = 0;
  let mergedClaims = 0;
  let droppedConflictClaims = 0;
  let deletedRows = 0;

  for (const group of duplicateGroups) {
    const scored = group
      .map((e) => ({ entity: e, score: scoreEntity(e, counts) }))
      .sort((a, b) => b.score - a.score);
    const canonical = scored[0].entity;
    const duplicates = scored.slice(1).map((s) => s.entity);

    const sample = canonical;
    console.log(
      `\n[${sample.category}] "${sample.name}" — ${group.length} rows (canonical=${canonical.id.slice(0, 8)} ${canonical.name})`,
    );
    for (const e of group) {
      const isCanonical = e.id === canonical.id;
      const edgeCount = counts.edges.get(e.id) ?? 0;
      const claimCount = counts.claims.get(e.id) ?? 0;
      const flag = isCanonical ? 'KEEP' : 'MERGE';
      console.log(
        `   ${flag.padEnd(5)} ${e.id.slice(0, 8)}  edges=${edgeCount.toString().padStart(3)}  claims=${claimCount.toString().padStart(3)}  status=${e.narrative_status}  aliases=${(e.aliases?.length ?? 0).toString().padStart(2)}  name="${e.name}"`,
      );
    }

    if (!args.apply) continue;

    for (const dup of duplicates) {
      const merged = mergeFields(canonical, dup);

      // 1. Repoint edges first so the duplicate row has no incoming refs.
      const edgeRes = await repointEdges(supabase, dup.id, canonical.id);
      mergedEdges += edgeRes.repointed;
      droppedConflictEdges += edgeRes.deletedConflicts;

      // 2. Repoint knowledge_claims.
      const claimRes = await repointClaims(supabase, dup.id, canonical.id);
      mergedClaims += claimRes.repointed;
      droppedConflictClaims += claimRes.deletedConflicts;

      // 3. Update canonical with merged fields.
      const { error: updErr } = await supabase
        .from('correspondences')
        .update({ ...merged, updated_at: new Date().toISOString() })
        .eq('id', canonical.id);
      if (updErr) throw new Error(`update canonical ${canonical.id}: ${updErr.message}`);

      // 4. Delete the duplicate.
      const { error: delErr } = await supabase
        .from('correspondences')
        .delete()
        .eq('id', dup.id);
      if (delErr) throw new Error(`delete duplicate ${dup.id}: ${delErr.message}`);

      deletedRows += 1;
      mergedRows += 1;
      console.log(
        `   ✅ merged ${dup.id.slice(0, 8)} → ${canonical.id.slice(0, 8)} (edges repointed=${edgeRes.repointed}, dropped=${edgeRes.deletedConflicts}; claims repointed=${claimRes.repointed}, dropped=${claimRes.deletedConflicts})`,
      );

      // Reflect merged state in our local canonical so subsequent duplicates
      // in the same group merge against the up-to-date aliases / etc.
      Object.assign(canonical, merged);
    }
  }

  console.log(`\n=========================================`);
  console.log(`Done. groups=${duplicateGroups.length}, mergedRows=${mergedRows}, deletedRows=${deletedRows}`);
  if (args.apply) {
    console.log(`Edges: repointed=${mergedEdges}, conflicts dropped=${droppedConflictEdges}`);
    console.log(`Claims: repointed=${mergedClaims}, conflicts dropped=${droppedConflictClaims}`);
  } else {
    console.log('(Dry run. Pass --apply to perform the merges.)');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
