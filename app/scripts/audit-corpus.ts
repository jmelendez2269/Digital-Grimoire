/**
 * Audit the `texts` table: list every text by content size with chunk count
 * and a flag for missing content. Lets us see exactly what is and isn't in
 * the library so we can spot missing imports.
 *
 * Usage:
 *   pnpm exec tsx scripts/audit-corpus.ts
 *   pnpm exec tsx scripts/audit-corpus.ts --missing-only      # only texts with no content
 *   pnpm exec tsx scripts/audit-corpus.ts --no-chunks         # only texts with content but no chunks
 *   pnpm exec tsx scripts/audit-corpus.ts --search "tarot"    # filter title (case-insensitive)
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type Args = {
  missingOnly: boolean;
  noChunks: boolean;
  search: string | null;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { missingOnly: false, noChunks: false, search: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--missing-only') out.missingOnly = true;
    else if (a === '--no-chunks') out.noChunks = true;
    else if (a === '--search') {
      out.search = (argv[i + 1] ?? '').toLowerCase();
      i += 1;
    }
  }
  return out;
}

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s + ' '.repeat(n - s.length);
}

function rightPad(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService();

  // Pull all texts, lightweight (id, title, author, content length proxy).
  // We do select content here only to compute length; pulling the body is
  // fine at 265 rows. If the table grows past tens of thousands, switch to
  // a length() RPC.
  const PAGE = 200;
  const texts: Array<{
    id: string;
    title: string;
    author: string | null;
    type: string | null;
    content_len: number;
    has_content: boolean;
  }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('texts')
      .select('id, title, author, type, content')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`texts page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const content = row.content as string | null;
      const len = content ? content.length : 0;
      texts.push({
        id: row.id,
        title: row.title ?? '(untitled)',
        author: row.author ?? null,
        type: row.type ?? null,
        content_len: len,
        has_content: len > 0,
      });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Get chunk counts per text_id. Supabase's default .select() page is 1000
  // rows, so we MUST page through or the count comes back capped at 1000 —
  // which silently understates the result and makes us think most texts
  // weren't chunked when they actually were.
  const chunkCount = new Map<string, number>();
  let chunkOffset = 0;
  const CHUNK_PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('text_chunks')
      .select('text_id')
      .range(chunkOffset, chunkOffset + CHUNK_PAGE - 1);
    if (error) throw new Error(`text_chunks page ${chunkOffset}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) {
      chunkCount.set(r.text_id, (chunkCount.get(r.text_id) ?? 0) + 1);
    }
    if (data.length < CHUNK_PAGE) break;
    chunkOffset += CHUNK_PAGE;
  }

  // Apply filters.
  let rows = texts.map((t) => ({
    ...t,
    chunks: chunkCount.get(t.id) ?? 0,
  }));
  if (args.missingOnly) rows = rows.filter((r) => !r.has_content);
  if (args.noChunks) rows = rows.filter((r) => r.has_content && r.chunks === 0);
  if (args.search) {
    const q = args.search;
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.author ?? '').toLowerCase().includes(q),
    );
  }
  rows.sort((a, b) => b.content_len - a.content_len);

  // Print table.
  console.log(`\nCorpus audit — ${rows.length} text(s) shown of ${texts.length} total`);
  console.log('='.repeat(120));
  console.log(
    pad('TITLE', 60) +
      pad('AUTHOR', 24) +
      rightPad('CHARS', 12) +
      rightPad('CHUNKS', 8) +
      '  TYPE',
  );
  console.log('-'.repeat(120));
  for (const r of rows) {
    const flag = !r.has_content ? ' (no content)' : r.chunks === 0 ? ' (not chunked)' : '';
    console.log(
      pad(r.title, 60) +
        pad(r.author ?? '—', 24) +
        rightPad(r.content_len.toLocaleString(), 12) +
        rightPad(String(r.chunks), 8) +
        '  ' +
        (r.type ?? '—') +
        flag,
    );
  }

  // Summary stats.
  const withContent = texts.filter((t) => t.has_content);
  const withoutContent = texts.filter((t) => !t.has_content);
  const chunkedTexts = texts.filter((t) => (chunkCount.get(t.id) ?? 0) > 0);
  const totalChars = withContent.reduce((s, t) => s + t.content_len, 0);
  const totalChunks = Array.from(chunkCount.values()).reduce((s, n) => s + n, 0);
  const largest = withContent[0]
    ? withContent.reduce((max, t) => (t.content_len > max.content_len ? t : max))
    : null;

  console.log('\nSummary');
  console.log('-------');
  console.log(`Total texts            : ${texts.length}`);
  console.log(`With content           : ${withContent.length}`);
  console.log(`Without content        : ${withoutContent.length}`);
  console.log(`Chunked                : ${chunkedTexts.length}`);
  console.log(`Total chars            : ${totalChars.toLocaleString()}`);
  console.log(`Total chunks           : ${totalChunks.toLocaleString()}`);
  if (largest) {
    console.log(`Largest text           : ${largest.title} — ${largest.content_len.toLocaleString()} chars`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
