/**
 * Spot-check a text row that has content=null to confirm the structured
 * importer stashed its text in metadata.chapters. If yes, a backfill can
 * flatten those chapters into the content column for the whole batch.
 *
 * Usage:
 *   pnpm exec tsx scripts/spot-check-empty-text.ts                     # picks a few well-known titles
 *   pnpm exec tsx scripts/spot-check-empty-text.ts --title "kybalion"  # search by substring (case-insensitive)
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
  const supabase = createService();
  const argv = process.argv.slice(2);
  const titleIdx = argv.indexOf('--title');
  const titleQuery = titleIdx >= 0 ? argv[titleIdx + 1] : null;

  const candidates = titleQuery
    ? [titleQuery]
    : ['kybalion', 'tao te ching', 'pictorial key to the tarot', 'tibetan book of the dead', 'tertium organum'];

  for (const q of candidates) {
    const { data, error } = await supabase
      .from('texts')
      .select('id, title, author, content, metadata')
      .ilike('title', `%${q}%`)
      .limit(3);
    if (error) {
      console.log(`❌ query "${q}": ${error.message}`);
      continue;
    }
    if (!data || data.length === 0) {
      console.log(`(no match for "${q}")`);
      continue;
    }
    for (const row of data) {
      const meta = (row.metadata as any) || {};
      const chapters = Array.isArray(meta.chapters) ? meta.chapters : null;
      const contentLen = row.content ? row.content.length : 0;
      console.log('');
      console.log(`— ${row.title}`);
      console.log(`   id              : ${row.id}`);
      console.log(`   content length  : ${contentLen}`);
      console.log(`   isStructuredText: ${meta.isStructuredText ?? false}`);
      console.log(`   chapters        : ${chapters ? chapters.length : 'none'}`);
      if (chapters && chapters.length > 0) {
        const totalChapterChars = chapters.reduce(
          (s: number, c: any) => s + (typeof c?.content === 'string' ? c.content.length : 0),
          0,
        );
        console.log(`   total chapter chars: ${totalChapterChars.toLocaleString()}`);
        const first = chapters[0];
        console.log(`   first chapter title: ${first?.title ?? '(none)'}`);
        const preview = typeof first?.content === 'string' ? first.content.slice(0, 240) : '(none)';
        console.log(`   first chapter preview:\n     ${preview.replace(/\n+/g, ' ')}${preview.length === 240 ? '…' : ''}`);
      } else if (meta.sourceUrl) {
        console.log(`   sourceUrl       : ${meta.sourceUrl}  (re-import candidate)`);
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
