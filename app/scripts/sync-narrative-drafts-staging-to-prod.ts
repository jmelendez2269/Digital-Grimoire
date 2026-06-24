/**
 * Copy every drafted narrative from staging to prod via slug-matched upsert.
 *
 * Only writes prod rows where:
 *   - The staging row has narrative_status='draft' and narrative_draft length >= 50
 *   - The prod row exists (matched by slug)
 *   - The prod row's narrative_status is 'missing' OR --overwrite is set
 *
 * Sets prod narrative_status='draft' so the work isn't auto-promoted to
 * live without explicit approval. Source attribution is preserved by
 * leaving narrative_source as whatever the drafter wrote.
 *
 * Defaults to --dry-run. Pass --apply to write.
 *
 * Usage:
 *   pnpm exec tsx scripts/sync-narrative-drafts-staging-to-prod.ts
 *   pnpm exec tsx scripts/sync-narrative-drafts-staging-to-prod.ts --apply
 *   pnpm exec tsx scripts/sync-narrative-drafts-staging-to-prod.ts --apply --overwrite
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MIN_DRAFT_LEN = 50;

type StagingRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  narrative_status: string;
  narrative_draft: string | null;
  narrative_source: string | null;
};

type ProdRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  narrative_status: string;
  narrative_draft: string | null;
};

async function loadAll<T>(s: SupabaseClient, table: string, select: string, filter?: (q: any) => any): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  let from = 0;
  while (true) {
    let q = s.from(table).select(select).range(from, from + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table} page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

(async () => {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const overwrite = argv.includes('--overwrite');

  const staging = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );
  const prod = createClient(
    process.env.PROD_SUPABASE_URL!,
    process.env.PROD_SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  console.log(`Staging: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`Prod:    ${process.env.PROD_SUPABASE_URL}`);
  console.log(apply ? '⚠️  APPLY MODE — will write.' : '🛟 Dry-run — no writes.');
  console.log(overwrite ? '  --overwrite: also replace prod drafts that already have content' : '  Only writes to prod rows currently at status=missing');

  console.log('\nLoading staging draft rows...');
  const stagingDrafts = await loadAll<StagingRow>(
    staging,
    'correspondences',
    'id, slug, name, category, narrative_status, narrative_draft, narrative_source',
    (q) => q.eq('narrative_status', 'draft'),
  );
  const eligible = stagingDrafts.filter((r) => (r.narrative_draft?.length ?? 0) >= MIN_DRAFT_LEN);
  console.log(`  staging drafts: ${stagingDrafts.length}, eligible (>=${MIN_DRAFT_LEN} chars): ${eligible.length}`);

  console.log('Loading prod rows...');
  const prodRows = await loadAll<ProdRow>(
    prod,
    'correspondences',
    'id, slug, name, category, narrative_status, narrative_draft',
  );
  const prodBySlug = new Map(prodRows.map((r) => [r.slug, r]));
  console.log(`  prod rows: ${prodRows.length}`);

  let willWrite = 0;
  let skippedNoMatch = 0;
  let skippedAlreadyHasDraft = 0;
  const noMatchSamples: string[] = [];

  for (const draft of eligible) {
    const target = prodBySlug.get(draft.slug);
    if (!target) {
      skippedNoMatch += 1;
      if (noMatchSamples.length < 10) noMatchSamples.push(draft.slug);
      continue;
    }
    if (target.narrative_status !== 'missing' && !overwrite) {
      // prod row already has some narrative state — skip unless --overwrite.
      const len = target.narrative_draft?.length ?? 0;
      if (len >= MIN_DRAFT_LEN) {
        skippedAlreadyHasDraft += 1;
        continue;
      }
    }
    willWrite += 1;
    if (apply) {
      const { error } = await prod
        .from('correspondences')
        .update({
          narrative_draft: draft.narrative_draft,
          narrative_status: 'draft',
          narrative_source: draft.narrative_source,
        })
        .eq('id', target.id);
      if (error) throw new Error(`update prod ${target.slug}: ${error.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  eligible staging drafts:     ${eligible.length}`);
  console.log(`  written to prod:             ${willWrite}`);
  console.log(`  skipped (slug not in prod):  ${skippedNoMatch}`);
  console.log(`  skipped (prod already has):  ${skippedAlreadyHasDraft}`);
  if (noMatchSamples.length > 0) {
    console.log('\n  slugs missing from prod (first 10):');
    for (const s of noMatchSamples) console.log(`    • ${s}`);
  }
  console.log(apply ? '\n✓ Synced.' : '\n🛟 Dry-run. Re-run with --apply to write.');
})();
