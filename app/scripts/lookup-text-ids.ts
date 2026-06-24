/**
 * One-shot lookup: find text IDs for a given list of author/title patterns.
 * Used when we know a book was imported but don't have its UUID handy.
 *
 * Usage:
 *   pnpm exec tsx scripts/lookup-text-ids.ts
 *   pnpm exec tsx scripts/lookup-text-ids.ts --author Vivekananda
 *   pnpm exec tsx scripts/lookup-text-ids.ts --title "raja yoga"
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

const DEFAULT_TARGETS: Array<{ label: string; author?: string; title?: string }> = [
  { label: 'Vivekananda — Raja Yoga', author: 'Vivekananda' },
  { label: 'Kunz — Curious Lore of Precious Stones', author: 'Kunz' },
  { label: 'Jastrow — Religion of Babylonia and Assyria', author: 'Jastrow' },
];

async function main() {
  const argv = process.argv.slice(2);
  const authorIdx = argv.indexOf('--author');
  const titleIdx = argv.indexOf('--title');
  const customAuthor = authorIdx >= 0 ? argv[authorIdx + 1] : null;
  const customTitle = titleIdx >= 0 ? argv[titleIdx + 1] : null;

  const supabase = createService();
  const targets =
    customAuthor || customTitle
      ? [{ label: `custom (${customAuthor ?? ''}/${customTitle ?? ''})`, author: customAuthor ?? undefined, title: customTitle ?? undefined }]
      : DEFAULT_TARGETS;

  for (const t of targets) {
    let q = supabase.from('texts').select('id, title, author, type').limit(10);
    if (t.author) q = q.ilike('author', `%${t.author}%`);
    if (t.title) q = q.ilike('title', `%${t.title}%`);
    const { data, error } = await q;
    console.log(`\n=== ${t.label} ===`);
    if (error) {
      console.log(`  ERROR: ${error.message}`);
      continue;
    }
    if (!data || data.length === 0) {
      console.log('  (no matches)');
      continue;
    }
    for (const row of data) {
      console.log(`  ${row.id}`);
      console.log(`    title:  ${row.title}`);
      console.log(`    author: ${row.author ?? '(no author)'}`);
      console.log(`    type:   ${row.type ?? '(no type)'}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
