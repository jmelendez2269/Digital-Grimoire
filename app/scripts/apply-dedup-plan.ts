/**
 * Applies a merge plan produced by plan-dedup-merges.ts.
 *
 * For each cluster in the plan:
 *   1. Update canonical row: union aliases and varieties.
 *   2. Insert any new corresponds_to edges (skip if already exist).
 *   3. For each variant:
 *      - Redirect every edge touching the variant onto the canonical,
 *        resolving the OTHER endpoint through the global variant→canonical
 *        map (so cross-cluster references stay healthy).
 *      - Drop self-loops and duplicate edges.
 *      - Delete the variant row.
 *
 * Defaults to --dry-run. Pass --apply to write.
 *
 * Usage:
 *   pnpm exec tsx scripts/apply-dedup-plan.ts --plan color-merge-plan.json
 *   pnpm exec tsx scripts/apply-dedup-plan.ts --plan color-merge-plan.json --apply
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

type ClusterPlan = {
  category: string;
  canonical: { id: string; slug: string; name: string };
  variants_to_delete: Array<{ id: string; slug: string; name: string }>;
  variant_plans: Array<{
    id: string;
    slug: string;
    name: string;
    parens?: string;
    tokens: string[];
    matched_edges: Array<{ token: string; target_id: string; target_name: string; target_category: string }>;
    unmatched_varieties: string[];
  }>;
  aggregate: {
    aliases_to_add: string[];
    varieties_to_add: string[];
    new_edges: Array<{ target_id: string; target_name: string; target_category: string }>;
  };
};

type PlanFile = { db: 'staging' | 'prod'; category: string; plan: ClusterPlan[] };

(async () => {
  const argv = process.argv.slice(2);
  const planIdx = argv.indexOf('--plan');
  if (planIdx === -1) throw new Error('Required: --plan <path>');
  const planPath = path.resolve(process.cwd(), argv[planIdx + 1]);
  const apply = argv.includes('--apply');

  const planFile = JSON.parse(fs.readFileSync(planPath, 'utf8')) as PlanFile;
  const db = planFile.db;
  const url = db === 'prod' ? process.env.PROD_SUPABASE_URL! : process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = db === 'prod' ? process.env.PROD_SUPABASE_SERVICE_KEY! : process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const s: SupabaseClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  console.log(`Plan: ${planPath}`);
  console.log(`DB: ${db} (${url})`);
  console.log(`Category: ${planFile.category}`);
  console.log(`Clusters: ${planFile.plan.length}`);
  console.log(apply ? '⚠️  APPLY MODE — will write.' : '🛟 Dry-run — no writes.');

  // Build global variant→canonical map across all clusters in this plan.
  const variantToCanonical = new Map<string, string>();
  for (const cluster of planFile.plan) {
    for (const v of cluster.variants_to_delete) {
      variantToCanonical.set(v.id, cluster.canonical.id);
    }
  }
  console.log(`variant→canonical map: ${variantToCanonical.size} entries`);

  // Counters for the final report.
  let canonicalsUpdated = 0;
  let newEdgesInserted = 0;
  let edgesRedirected = 0;
  let edgesDropped = 0;
  let variantsDeleted = 0;

  for (const cluster of planFile.plan) {
    const canonId = cluster.canonical.id;
    const canonName = cluster.canonical.name;

    // --- 1. Update canonical with merged aliases + varieties ---
    if (cluster.aggregate.aliases_to_add.length > 0 || cluster.aggregate.varieties_to_add.length > 0) {
      const { data: existing, error: fErr } = await s
        .from('correspondences')
        .select('aliases, varieties')
        .eq('id', canonId)
        .single();
      if (fErr) throw new Error(`fetch canonical ${canonId}: ${fErr.message}`);

      const newAliases = Array.from(
        new Set([...(existing?.aliases ?? []), ...cluster.aggregate.aliases_to_add]),
      );
      const newVarieties = Array.from(
        new Set([...(existing?.varieties ?? []), ...cluster.aggregate.varieties_to_add]),
      );

      if (apply) {
        const { error: uErr } = await s
          .from('correspondences')
          .update({ aliases: newAliases, varieties: newVarieties })
          .eq('id', canonId);
        if (uErr) throw new Error(`update canonical ${canonId}: ${uErr.message}`);
      }
      canonicalsUpdated += 1;
    }

    // --- 2. Insert new edges (corresponds_to). Resolve target through map. ---
    for (const e of cluster.aggregate.new_edges) {
      const target = variantToCanonical.get(e.target_id) ?? e.target_id;
      if (target === canonId) continue; // skip self-loop

      // Skip if an equivalent edge already exists.
      const { data: existing } = await s
        .from('correspondence_relationships')
        .select('id')
        .eq('source_id', canonId)
        .eq('target_id', target)
        .eq('type', 'corresponds_to')
        .limit(1);
      if (existing && existing.length > 0) continue;

      if (apply) {
        const { error: insErr } = await s
          .from('correspondence_relationships')
          .insert({ source_id: canonId, target_id: target, type: 'corresponds_to', weight: 1 });
        if (insErr) throw new Error(`insert new edge ${canonId}→${target}: ${insErr.message}`);
      }
      newEdgesInserted += 1;
    }

    // --- 3. For each variant: redirect edges, then delete variant ---
    for (const variant of cluster.variants_to_delete) {
      const vId = variant.id;
      // Pre-load every edge already touching the canonical so we can detect dups.
      const { data: canEdges, error: cErr } = await s
        .from('correspondence_relationships')
        .select('id, source_id, target_id, type')
        .or(`source_id.eq.${canonId},target_id.eq.${canonId}`);
      if (cErr) throw new Error(`canonical edges: ${cErr.message}`);
      const canKeys = new Set(
        (canEdges ?? []).map((e: any) => `${e.source_id}|${e.target_id}|${e.type}`),
      );

      // Pull every edge touching the variant.
      const { data: srcEdges } = await s
        .from('correspondence_relationships')
        .select('id, source_id, target_id, type')
        .eq('source_id', vId);
      const { data: tgtEdges } = await s
        .from('correspondence_relationships')
        .select('id, source_id, target_id, type')
        .eq('target_id', vId);
      const allEdges = [...(srcEdges ?? []), ...(tgtEdges ?? [])];

      for (const e of allEdges) {
        // Replace variant id with canonical id on whichever side it appears.
        let newSrc = e.source_id === vId ? canonId : e.source_id;
        let newTgt = e.target_id === vId ? canonId : e.target_id;
        // If the OTHER endpoint is also a variant in this plan, resolve through map.
        if (newSrc !== canonId && variantToCanonical.has(newSrc)) newSrc = variantToCanonical.get(newSrc)!;
        if (newTgt !== canonId && variantToCanonical.has(newTgt)) newTgt = variantToCanonical.get(newTgt)!;

        if (newSrc === newTgt) {
          edgesDropped += 1;
          if (apply) {
            await s.from('correspondence_relationships').delete().eq('id', e.id);
          }
          continue;
        }
        const key = `${newSrc}|${newTgt}|${e.type}`;
        if (canKeys.has(key)) {
          edgesDropped += 1;
          if (apply) {
            await s.from('correspondence_relationships').delete().eq('id', e.id);
          }
          continue;
        }
        canKeys.add(key);
        edgesRedirected += 1;
        if (apply) {
          const { error: uErr } = await s
            .from('correspondence_relationships')
            .update({ source_id: newSrc, target_id: newTgt })
            .eq('id', e.id);
          if (uErr) throw new Error(`redirect edge ${e.id}: ${uErr.message}`);
        }
      }

      // Delete the variant row.
      variantsDeleted += 1;
      if (apply) {
        const { error: dErr } = await s.from('correspondences').delete().eq('id', vId);
        if (dErr) throw new Error(`delete variant ${vId}: ${dErr.message}`);
      }
    }

    console.log(`  ✓ ${canonName} (${cluster.variants_to_delete.length} variants)`);
  }

  console.log('\n=== Summary ===');
  console.log(`  canonicals updated:   ${canonicalsUpdated}`);
  console.log(`  new edges inserted:   ${newEdgesInserted}`);
  console.log(`  edges redirected:     ${edgesRedirected}`);
  console.log(`  edges dropped (dup/self): ${edgesDropped}`);
  console.log(`  variants deleted:     ${variantsDeleted}`);
  console.log(apply ? '\n✓ Applied.' : '\n🛟 Dry-run. Re-run with --apply to write.');
})();
