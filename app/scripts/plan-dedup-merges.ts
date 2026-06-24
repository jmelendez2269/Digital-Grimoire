/**
 * Generates a JSON merge plan for duplicate clusters in a category, using
 * the B-pragmatic strategy:
 *
 *   - Pick the canonical entity for each cluster (heuristic in pickCanonical).
 *   - For each variant, parse its parenthetical content into tokens.
 *   - For each token: if it matches a real entity (color, issue_intention_power),
 *     plan a `corresponds_to` edge; otherwise stash it on the canonical's
 *     `varieties` array.
 *   - Plan to fold the variant's full name and parens-stripped form into the
 *     canonical's `aliases`.
 *   - Plan to redirect every edge touching the variant onto the canonical
 *     (with dedup at apply time).
 *   - Plan to delete the variant row.
 *
 * Does NOT write to the DB. Outputs a JSON plan file for review.
 *
 * Usage:
 *   pnpm exec tsx scripts/plan-dedup-merges.ts --category metal --db prod
 *   pnpm exec tsx scripts/plan-dedup-merges.ts --category stone --db prod --out stone-plan.json
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

type Entity = {
  id: string;
  slug: string;
  name: string;
  category: string;
  aliases: string[] | null;
  varieties: string[] | null;
};

type Edge = { id: string; source_id: string; target_id: string; type: string };

const LINKER_CATEGORIES = ['color', 'issue_intention_power']; // categories where token matches become edges
const STOPWORDS = new Set([
  'general', 'inner', 'outer', 'use', 'for', 'with', 'to', 'and', 'or',
  'against', 'across', 'attract', 'self', 'work', 'magic',
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizedEntityName(name: string): string {
  return normalize(
    name
      .replace(/^\d+(?:st|nd|rd|th)\s+day\s+of\s+\S+\s*(?:\([^)]+\))?\s*/i, '')
      .replace(/^[a-z]+\s+\d+(?:\s+(?:or|to)\s+\d+)?\s*-?\s*/i, '')
      .replace(/\s*\([^)]*\)\s*/g, ' '),
  );
}

function stripParens(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
}

function extractParens(name: string): string | null {
  const m = name.match(/\(([^)]+)\)/);
  return m ? m[1].trim() : null;
}

function tokenizeParens(parens: string): string[] {
  return parens
    .split(/[,/&]|\band\b/i)
    .map((t) => t.replace(/\s+/g, ' ').trim().toLowerCase())
    .filter((t) => t.length > 0);
}

function pickCanonical(cluster: Entity[], degree: Map<string, number>): Entity {
  // Heuristic ranking — lower score wins.
  // 1) Reject parens-in-name (these are variants, not canonicals)
  // 2) Reject ALL-CAPS names
  // 3) Prefer slug starting with `{category}-` (existing convention)
  // 4) Prefer shorter slug (cleaner naming)
  // 5) Prefer shorter name
  // 6) Tiebreak: more edges in graph = more central = better canonical
  const score = (e: Entity) => {
    let s = 0;
    if (/\(/.test(e.name)) s += 1000;
    if (e.name === e.name.toUpperCase() && e.name.length > 1) s += 500;
    if (!e.slug.startsWith(`${e.category}-`)) s += 100;
    s += e.slug.length * 0.5;
    s += e.name.length * 0.1;
    // More edges = lower score (subtract). Cap to avoid swamping other signals.
    s -= Math.min(degree.get(e.id) ?? 0, 50) * 0.01;
    return s;
  };
  return [...cluster].sort((a, b) => score(a) - score(b))[0];
}

function findClusters(entities: Entity[]): Entity[][] {
  // Group by normalized name within category.
  const byKey = new Map<string, Entity[]>();
  for (const e of entities) {
    const n = normalizedEntityName(e.name);
    if (!n) continue;
    const key = `${e.category}|${n}`;
    const list = byKey.get(key) ?? [];
    list.push(e);
    byKey.set(key, list);
  }
  return [...byKey.values()].filter((list) => list.length >= 2);
}

async function buildLinkerIndex(s: SupabaseClient): Promise<Map<string, Entity>> {
  // Load entities from linker categories so we can match parenthetical tokens to them.
  const index = new Map<string, Entity>();
  for (const cat of LINKER_CATEGORIES) {
    const { data, error } = await s
      .from('correspondences')
      .select('id, slug, name, category, aliases, varieties')
      .eq('category', cat);
    if (error) throw new Error(`linker fetch ${cat}: ${error.message}`);
    for (const e of (data ?? []) as Entity[]) {
      const n = normalizedEntityName(e.name);
      if (!n) continue;
      index.set(n, e);
      for (const a of e.aliases ?? []) {
        const an = normalize(a);
        if (an && !index.has(an)) index.set(an, e);
      }
    }
  }
  return index;
}

async function loadCategory(s: SupabaseClient, category: string): Promise<Entity[]> {
  const PAGE = 1000;
  const out: Entity[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await s
      .from('correspondences')
      .select('id, slug, name, category, aliases, varieties')
      .eq('category', category)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...(data as Entity[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

(async () => {
  const argv = process.argv.slice(2);
  const catIdx = argv.indexOf('--category');
  if (catIdx === -1) throw new Error('Required: --category <name>');
  const category = argv[catIdx + 1];
  const dbIdx = argv.indexOf('--db');
  const db = (dbIdx >= 0 ? argv[dbIdx + 1] : 'prod') as 'staging' | 'prod';
  const outIdx = argv.indexOf('--out');
  const outFile = outIdx >= 0 ? argv[outIdx + 1] : `${category}-merge-plan.json`;

  const url = db === 'prod' ? process.env.PROD_SUPABASE_URL! : process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = db === 'prod' ? process.env.PROD_SUPABASE_SERVICE_KEY! : process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  console.log(`DB: ${db} (${url})`);
  console.log(`Category: ${category}`);

  const entities = await loadCategory(supabase, category);
  console.log(`Loaded ${entities.length} entities in '${category}'.`);

  const clusters = findClusters(entities);
  console.log(`Found ${clusters.length} duplicate clusters (>= 2 entities).`);
  if (clusters.length === 0) {
    console.log('Nothing to plan.');
    return;
  }

  const linker = await buildLinkerIndex(supabase);
  console.log(`Linker index loaded: ${linker.size} entries from ${LINKER_CATEGORIES.join(', ')}.`);

  // Load edge counts so the canonical picker can prefer well-connected entities.
  const degree = new Map<string, number>();
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('correspondence_relationships')
        .select('source_id, target_id')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`degree load: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const e of data) {
        degree.set(e.source_id, (degree.get(e.source_id) ?? 0) + 1);
        degree.set(e.target_id, (degree.get(e.target_id) ?? 0) + 1);
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  console.log(`Degree map loaded for ${degree.size} entities.`);

  // First pass: pick a canonical for every cluster so we can build a
  // variant→canonical redirect map. This is necessary so that new edges
  // created in cluster A whose target is a variant being deleted in cluster
  // B get rerouted to cluster B's canonical instead.
  const canonicalByCluster = clusters.map((c) => pickCanonical(c, degree));
  const variantToCanonical = new Map<string, string>();
  for (let i = 0; i < clusters.length; i++) {
    const can = canonicalByCluster[i];
    for (const e of clusters[i]) {
      if (e.id !== can.id) variantToCanonical.set(e.id, can.id);
    }
  }

  const plan = clusters.map((cluster, idx) => {
    const canonical = canonicalByCluster[idx];
    const variants = cluster.filter((e) => e.id !== canonical.id);

    const variantPlans = variants.map((v) => {
      const parens = extractParens(v.name);
      const tokens = parens ? tokenizeParens(parens) : [];
      const matchedEdges: Array<{ token: string; target_id: string; target_name: string; target_category: string }> = [];
      const unmatchedVarieties: string[] = [];

      for (const token of tokens) {
        if (token.length < 2 || STOPWORDS.has(token)) continue;
        const tNorm = normalize(token);
        const rawMatch = linker.get(tNorm);
        if (!rawMatch) {
          unmatchedVarieties.push(token);
          continue;
        }
        // If the matched entity is itself a variant being deleted, redirect
        // the edge target to its canonical so we don't create a dangling FK.
        const finalTargetId = variantToCanonical.get(rawMatch.id) ?? rawMatch.id;
        if (finalTargetId === canonical.id) {
          // Don't create a self-edge.
          unmatchedVarieties.push(token);
          continue;
        }
        // Look up the canonical's data if the match was a variant.
        const finalTarget = finalTargetId === rawMatch.id
          ? rawMatch
          : (() => {
              // Find the canonical entity by id.
              for (const c of canonicalByCluster) {
                if (c.id === finalTargetId) return c;
              }
              return rawMatch;
            })();
        matchedEdges.push({
          token,
          target_id: finalTarget.id,
          target_name: finalTarget.name,
          target_category: finalTarget.category,
        });
      }

      return {
        id: v.id,
        slug: v.slug,
        name: v.name,
        parens: parens ?? undefined,
        tokens,
        matched_edges: matchedEdges,
        unmatched_varieties: unmatchedVarieties,
      };
    });

    // Aggregate aliases + varieties for the canonical.
    const aliasSet = new Set<string>(canonical.aliases ?? []);
    const varietiesSet = new Set<string>(canonical.varieties ?? []);
    const newEdgeMap = new Map<string, { target_id: string; target_name: string; target_category: string }>();

    for (const v of variants) {
      // Original variant name and its parens-stripped form become aliases (skip the canonical name itself).
      const stripped = stripParens(v.name);
      if (v.name !== canonical.name) aliasSet.add(v.name);
      if (stripped && stripped !== canonical.name) aliasSet.add(stripped);
    }
    for (const vp of variantPlans) {
      for (const t of vp.unmatched_varieties) varietiesSet.add(t);
      for (const e of vp.matched_edges) {
        newEdgeMap.set(e.target_id, {
          target_id: e.target_id,
          target_name: e.target_name,
          target_category: e.target_category,
        });
      }
    }

    return {
      category,
      canonical: { id: canonical.id, slug: canonical.slug, name: canonical.name },
      variants_to_delete: variants.map((v) => ({ id: v.id, slug: v.slug, name: v.name })),
      variant_plans: variantPlans,
      aggregate: {
        aliases_to_add: [...aliasSet].filter((a) => !(canonical.aliases ?? []).includes(a)),
        varieties_to_add: [...varietiesSet].filter((v) => !(canonical.varieties ?? []).includes(v)),
        new_edges: [...newEdgeMap.values()],
      },
    };
  });

  // Quick summary to stdout.
  const totalVariants = plan.reduce((n, p) => n + p.variants_to_delete.length, 0);
  const totalNewEdges = plan.reduce((n, p) => n + p.aggregate.new_edges.length, 0);
  const totalVarieties = plan.reduce((n, p) => n + p.aggregate.varieties_to_add.length, 0);
  const totalAliases = plan.reduce((n, p) => n + p.aggregate.aliases_to_add.length, 0);
  console.log(`\nPlan summary:`);
  console.log(`  clusters:        ${plan.length}`);
  console.log(`  variants:        ${totalVariants} (would be deleted)`);
  console.log(`  new edges:       ${totalNewEdges} (matched parens tokens → real entities)`);
  console.log(`  varieties added: ${totalVarieties} (unmatched tokens → varieties array)`);
  console.log(`  aliases added:   ${totalAliases}`);
  console.log(`  post-cleanup entity count for category: ${entities.length - totalVariants}`);

  const outPath = path.resolve(process.cwd(), outFile);
  fs.writeFileSync(outPath, JSON.stringify({ db, category, plan }, null, 2), 'utf8');
  console.log(`\nWrote: ${outPath}`);

  // Print first 2 clusters as a preview.
  console.log('\nFirst 2 clusters preview:');
  for (const p of plan.slice(0, 2)) {
    console.log(`\n--- canonical: ${p.canonical.name} (${p.canonical.slug}) ---`);
    console.log(`  variants_to_delete: ${p.variants_to_delete.map((v) => v.name).join(' | ')}`);
    console.log(`  aliases_to_add: ${p.aggregate.aliases_to_add.join(' | ') || '(none)'}`);
    console.log(`  varieties_to_add: ${p.aggregate.varieties_to_add.join(' | ') || '(none)'}`);
    if (p.aggregate.new_edges.length > 0) {
      console.log(`  new_edges: ${p.aggregate.new_edges.map((e) => `${e.target_category}/${e.target_name}`).join(' | ')}`);
    }
  }
})();
