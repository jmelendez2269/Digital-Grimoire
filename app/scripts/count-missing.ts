import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

(async () => {
  // Total missing
  const { count: totalMissing } = await supabase
    .from('correspondences')
    .select('id', { count: 'exact', head: true })
    .eq('narrative_status', 'missing');
  console.log(`Total status=missing: ${totalMissing}`);

  // Total draft
  const { count: totalDraft } = await supabase
    .from('correspondences')
    .select('id', { count: 'exact', head: true })
    .eq('narrative_status', 'draft');
  console.log(`Total status=draft: ${totalDraft}`);

  // Total approved
  const { count: totalApproved } = await supabase
    .from('correspondences')
    .select('id', { count: 'exact', head: true })
    .eq('narrative_status', 'approved');
  console.log(`Total status=approved: ${totalApproved}`);

  // Per category missing
  console.log('\nPer-category missing (top 15):');
  const PAGE = 1000;
  const byCategory = new Map<string, number>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('correspondences')
      .select('category, narrative_status')
      .eq('narrative_status', 'missing')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const sorted = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  for (const [c, n] of sorted) console.log(`  ${n}\t${c}`);
})();
