/**
 * One-shot lister: dump every entity in a given category (name + aliases)
 * so we can decide whether they have enough alias coverage before running
 * snippet extraction.
 *
 * Usage:
 *   pnpm exec tsx scripts/list-category-entities.ts --category celebration
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const catIdx = argv.indexOf('--category');
  if (catIdx === -1) throw new Error('Usage: --category <name>');
  const category = argv[catIdx + 1];

  const supabase = createService();
  const { data, error } = await supabase
    .from('correspondences')
    .select('id, slug, name, aliases, narrative_status')
    .eq('category', category)
    .order('name', { ascending: true });
  if (error) throw new Error(`fetch ${category}: ${error.message}`);

  console.log(`\n=== ${category} (${data?.length ?? 0} entities) ===\n`);
  for (const e of data ?? []) {
    const aliasList = (e.aliases ?? []).join(', ') || '(none)';
    console.log(`  • ${e.name}`);
    console.log(`      slug: ${e.slug}`);
    console.log(`      aliases: ${aliasList}`);
    console.log(`      status: ${e.narrative_status}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
