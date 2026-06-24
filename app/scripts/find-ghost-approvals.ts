/**
 * Find entities where narrative_status is 'approved' but narrative_draft is
 * empty or null. These are corrupted states: marked as live for prod, but
 * with no actual text to show. Reset them to 'missing' so the drafter picks
 * them up.
 *
 * Usage:
 *   pnpm exec tsx scripts/find-ghost-approvals.ts           # dry-run
 *   pnpm exec tsx scripts/find-ghost-approvals.ts --apply   # reset to 'missing'
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

(async () => {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const dbIdx = argv.indexOf('--db');
  const db = (dbIdx >= 0 ? argv[dbIdx + 1] : 'staging') as 'staging' | 'prod';
  const url = db === 'prod' ? process.env.PROD_SUPABASE_URL! : process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = db === 'prod' ? process.env.PROD_SUPABASE_SERVICE_KEY! : process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  console.log(`Target: ${url}`);
  console.log(apply ? '⚠️  APPLY mode — will write.' : '🛟 Dry-run.');

  // Page through all correspondences with status='approved' so the default
  // 1000-row cap doesn't truncate.
  const PAGE = 1000;
  const ghosts: Array<{ id: string; slug: string; name: string; category: string }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('correspondences')
      .select('id, slug, name, category, narrative_draft, narrative_status')
      .eq('narrative_status', 'approved')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const len = r.narrative_draft?.length ?? 0;
      if (len < 50) ghosts.push(r);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`\nGhost approvals (status=approved, draft empty/short): ${ghosts.length}`);
  const byCat = new Map<string, number>();
  for (const g of ghosts) {
    byCat.set(g.category, (byCat.get(g.category) ?? 0) + 1);
  }
  console.log('  by category:');
  for (const [c, n] of byCat) console.log(`    ${c}: ${n}`);
  if (ghosts.length <= 30) {
    console.log('  entities:');
    for (const g of ghosts) console.log(`    ${g.category}/${g.slug} :: ${g.name}`);
  }

  if (apply && ghosts.length > 0) {
    let updated = 0;
    for (const g of ghosts) {
      const { error } = await supabase
        .from('correspondences')
        .update({ narrative_status: 'missing' })
        .eq('id', g.id);
      if (error) throw new Error(`reset ${g.slug}: ${error.message}`);
      updated += 1;
    }
    console.log(`\n✓ Reset ${updated} to 'missing'.`);
  }
})();
