/**
 * Read-only comparison: how many correspondences exist in staging vs prod,
 * broken down by narrative_status, and how many have real narrative_draft
 * content. Use this to find out whether narrative work has been happening in
 * prod (via the live admin UI) that staging doesn't reflect.
 *
 * READ-ONLY. Never writes anywhere. Uses PROD_* env vars for production.
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

type Counts = {
  total: number;
  byStatus: Map<string, number>;
  approvedWithContent: number;
  approvedEmpty: number;
  draftWithContent: number;
  draftEmpty: number;
  missing: number;
};

async function tally(s: SupabaseClient, label: string): Promise<Counts> {
  const result: Counts = {
    total: 0,
    byStatus: new Map(),
    approvedWithContent: 0,
    approvedEmpty: 0,
    draftWithContent: 0,
    draftEmpty: 0,
    missing: 0,
  };
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await s
      .from('correspondences')
      .select('narrative_status, narrative_draft')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) {
      result.total += 1;
      const status = r.narrative_status ?? '(null)';
      result.byStatus.set(status, (result.byStatus.get(status) ?? 0) + 1);
      const len = r.narrative_draft?.length ?? 0;
      if (status === 'approved') {
        if (len >= 50) result.approvedWithContent += 1;
        else result.approvedEmpty += 1;
      } else if (status === 'draft') {
        if (len >= 50) result.draftWithContent += 1;
        else result.draftEmpty += 1;
      } else if (status === 'missing') {
        result.missing += 1;
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return result;
}

function print(label: string, c: Counts) {
  console.log(`\n=== ${label} ===`);
  console.log(`  total entities: ${c.total}`);
  console.log(`  by status:`);
  for (const [s, n] of [...c.byStatus.entries()].sort()) {
    console.log(`    ${s}: ${n}`);
  }
  console.log(`  approved w/ content:  ${c.approvedWithContent}`);
  console.log(`  approved EMPTY:       ${c.approvedEmpty}`);
  console.log(`  draft w/ content:     ${c.draftWithContent}`);
  console.log(`  draft EMPTY:          ${c.draftEmpty}`);
  console.log(`  missing:              ${c.missing}`);
}

(async () => {
  const stagingUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const stagingKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const prodUrl = process.env.PROD_SUPABASE_URL!;
  const prodKey = process.env.PROD_SUPABASE_SERVICE_KEY!;
  if (!prodUrl || !prodKey) {
    throw new Error('Missing PROD_SUPABASE_URL or PROD_SUPABASE_SERVICE_KEY in .env.local');
  }

  console.log(`Staging: ${stagingUrl}`);
  console.log(`Prod:    ${prodUrl}`);

  const staging = createClient(stagingUrl, stagingKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const prod = createClient(prodUrl, prodKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const [stagingCounts, prodCounts] = await Promise.all([
    tally(staging, 'staging'),
    tally(prod, 'prod'),
  ]);
  print('STAGING', stagingCounts);
  print('PROD', prodCounts);

  // Sample some prod approved-with-content entries to confirm they're real.
  console.log('\n=== Sample 5 prod entities with status=approved AND real content ===');
  const { data: sample } = await prod
    .from('correspondences')
    .select('slug, name, category, narrative_status, narrative_draft')
    .eq('narrative_status', 'approved')
    .not('narrative_draft', 'is', null)
    .limit(5);
  for (const r of sample ?? []) {
    const len = r.narrative_draft?.length ?? 0;
    if (len < 50) continue;
    console.log(`  • ${r.category}/${r.slug} (${len} chars)`);
    console.log(`    ${r.narrative_draft.slice(0, 220)}...`);
  }
})();
