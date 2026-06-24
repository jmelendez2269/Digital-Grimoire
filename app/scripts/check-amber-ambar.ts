import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

(async () => {
  for (const [label, url, key] of [
    ['staging', process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!],
    ['prod', process.env.PROD_SUPABASE_URL!, process.env.PROD_SUPABASE_SERVICE_KEY!],
  ] as const) {
    const s = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data } = await s
      .from('correspondences')
      .select('slug, name, category, narrative_status, narrative_draft')
      .ilike('name', '%amb%r%')
      .eq('category', 'stone');
    console.log(`\n=== ${label}: stones matching amb*r ===`);
    for (const r of data ?? []) {
      const len = r.narrative_draft?.length ?? 0;
      console.log(`  slug=${r.slug}  name="${r.name}"  status=${r.narrative_status}  draft=${len}c`);
    }
  }
})();
