import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

(async () => {
  const cats = process.argv.slice(2);
  if (cats.length === 0) {
    console.log('Usage: list-missing-narratives.ts <category> [<category> ...]');
    return;
  }
  for (const cat of cats) {
    const { data } = await supabase
      .from('correspondences')
      .select('slug, name, narrative_status')
      .eq('category', cat)
      .eq('narrative_status', 'missing');
    console.log(`\n=== ${cat} (still missing): ${data?.length ?? 0} ===`);
    for (const r of data ?? []) console.log(`  ${r.slug}  ::  ${r.name}`);
  }
})();
