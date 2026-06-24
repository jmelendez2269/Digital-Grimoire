import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

(async () => {
  const slugs = process.argv.slice(2);
  const { data, error } = await supabase
    .from('correspondences')
    .select('slug, name, category, narrative_status, narrative_draft')
    .in('slug', slugs);
  if (error) console.error(error);
  for (const r of data ?? []) {
    console.log(`${r.slug}`);
    console.log(`  name: ${r.name}`);
    console.log(`  category: ${r.category}`);
    console.log(`  status: ${r.narrative_status}`);
    console.log(`  draft_length: ${r.narrative_draft?.length ?? 0}`);
  }
})();
