/**
 * For every row in `texts`, classify WHERE its readable content actually
 * lives. The rest of the app (chunking, FTS, narrative drafting, vector
 * search) reads ONLY from texts.content — so if content lives anywhere
 * else (metadata.chapters, summary fields, s3_key files we haven't
 * extracted), those texts are effectively invisible to the pipeline.
 *
 * Different import paths in this repo write content to different places:
 *   /api/import-sacred-text  -> metadata.chapters (content=null on purpose)
 *   /api/reimport-content    -> same
 *   /api/process-document    -> ? (still to characterize)
 *   /api/process-media       -> ? (still to characterize)
 *   seed-library-csv / direct seeders -> texts.content
 *
 * This script buckets every row so we can see exactly what we have and
 * what would need to be backfilled into texts.content to be queryable.
 *
 * Usage:
 *   pnpm exec tsx scripts/audit-content-storage.ts
 *   pnpm exec tsx scripts/audit-content-storage.ts --json out.json    # dump full classification
 *   pnpm exec tsx scripts/audit-content-storage.ts --bucket B          # show only rows in bucket B
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type Bucket =
  | 'A_content'              // content column populated -> pipeline sees it
  | 'B_chapters_only'        // content empty, metadata.chapters has text -> flatten to fix
  | 'C_sourceurl_only'       // content empty, no chapters, has sourceUrl -> re-fetch
  | 'D_s3_only'              // content empty, no chapters, has s3_key but no sourceUrl -> extract from file
  | 'E_summary_only'         // content empty but a summary field has prose -> use as last resort
  | 'F_empty';               // nothing readable anywhere -> orphan

type Row = {
  id: string;
  title: string;
  author: string | null;
  type: string | null;
  content: string | null;
  metadata: any;
  s3_key: string | null;
  short_summary: string | null;
  long_summary: string | null;
};

type Classified = {
  id: string;
  title: string;
  author: string | null;
  type: string | null;
  bucket: Bucket;
  content_chars: number;
  chapter_count: number;
  chapter_chars: number;
  source_url: string | null;
  has_s3: boolean;
  summary_chars: number;
};

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function classify(row: Row): Classified {
  const content = row.content ?? '';
  const contentChars = content.trim().length;
  const meta = row.metadata || {};
  const chapters = Array.isArray(meta.chapters) ? meta.chapters : [];
  const chapterChars = chapters.reduce(
    (s: number, c: any) => s + (typeof c?.content === 'string' ? c.content.length : 0),
    0,
  );
  const sourceUrl: string | null = typeof meta.sourceUrl === 'string' ? meta.sourceUrl : null;
  const hasS3 = !!row.s3_key;
  const summaryChars =
    (row.short_summary?.length ?? 0) + (row.long_summary?.length ?? 0);

  let bucket: Bucket;
  if (contentChars >= 200) bucket = 'A_content';
  else if (chapterChars >= 200) bucket = 'B_chapters_only';
  else if (sourceUrl) bucket = 'C_sourceurl_only';
  else if (hasS3) bucket = 'D_s3_only';
  else if (summaryChars >= 200) bucket = 'E_summary_only';
  else bucket = 'F_empty';

  return {
    id: row.id,
    title: row.title ?? '(untitled)',
    author: row.author ?? null,
    type: row.type ?? null,
    bucket,
    content_chars: contentChars,
    chapter_count: chapters.length,
    chapter_chars: chapterChars,
    source_url: sourceUrl,
    has_s3: hasS3,
    summary_chars: summaryChars,
  };
}

const BUCKET_LABEL: Record<Bucket, string> = {
  A_content: 'A · content column populated (pipeline sees it)',
  B_chapters_only: 'B · content empty, metadata.chapters has text (flatten to fix)',
  C_sourceurl_only: 'C · content empty, sourceUrl only (re-fetch)',
  D_s3_only: 'D · content empty, s3_key only (extract from file)',
  E_summary_only: 'E · content empty, only a summary present (last-resort fallback)',
  F_empty: 'F · nothing readable anywhere (orphan)',
};

const BUCKET_ORDER: Bucket[] = [
  'A_content',
  'B_chapters_only',
  'C_sourceurl_only',
  'D_s3_only',
  'E_summary_only',
  'F_empty',
];

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s + ' '.repeat(n - s.length);
}

async function main() {
  const argv = process.argv.slice(2);
  const jsonIdx = argv.indexOf('--json');
  const jsonOut = jsonIdx >= 0 ? argv[jsonIdx + 1] : null;
  const bucketIdx = argv.indexOf('--bucket');
  const bucketFilter = bucketIdx >= 0 ? (argv[bucketIdx + 1] as string) : null;

  const supabase = createService();

  // Page through texts. The content column is now ~84M chars across 265
  // rows (~317KB avg), so pulling 100 rows in one request returns ~30MB
  // and trips PostgREST's statement timeout. Smaller pages keep each
  // response well under the limit. 20 rows × ~317KB = ~6MB, comfortable.
  const PAGE = 20;
  const rows: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('texts')
      .select('id, title, author, type, content, metadata, s3_key, short_summary, long_summary')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`texts page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const classified = rows.map(classify);
  const byBucket = new Map<Bucket, Classified[]>();
  for (const c of classified) {
    const arr = byBucket.get(c.bucket) ?? [];
    arr.push(c);
    byBucket.set(c.bucket, arr);
  }

  // Summary first.
  console.log(`\nContent-storage audit — ${rows.length} text(s) total\n`);
  console.log('Bucket distribution:');
  for (const b of BUCKET_ORDER) {
    const arr = byBucket.get(b) ?? [];
    const charsTotal = arr.reduce(
      (s, c) =>
        s +
        (b === 'A_content'
          ? c.content_chars
          : b === 'B_chapters_only'
            ? c.chapter_chars
            : 0),
      0,
    );
    console.log(
      `  ${BUCKET_LABEL[b]}`,
    );
    console.log(
      `    count=${arr.length}` +
        (charsTotal > 0 ? `, chars=${charsTotal.toLocaleString()}` : ''),
    );
  }
  console.log('');

  // Per-bucket detail. Skip A by default (just a noisy reprint of working
  // rows). Show others fully so the user can see what would need backfill.
  for (const b of BUCKET_ORDER) {
    if (bucketFilter && !b.startsWith(bucketFilter)) continue;
    if (!bucketFilter && b === 'A_content') continue;
    const arr = byBucket.get(b) ?? [];
    if (arr.length === 0) continue;
    console.log(`\n${BUCKET_LABEL[b]}  —  ${arr.length} row(s)`);
    console.log('-'.repeat(120));
    arr.sort((a, b2) => b2.chapter_chars - a.chapter_chars || b2.content_chars - a.content_chars);
    console.log(
      pad('TITLE', 56) +
        pad('AUTHOR', 24) +
        pad('CONTENT', 10) +
        pad('CHAP×', 8) +
        pad('CHAP CHARS', 14) +
        '  EXTRA',
    );
    for (const c of arr) {
      const extras: string[] = [];
      if (c.source_url) extras.push(`sourceUrl=${c.source_url.slice(0, 60)}`);
      if (c.has_s3) extras.push('s3_key');
      if (c.summary_chars > 0) extras.push(`summary=${c.summary_chars}c`);
      console.log(
        pad(c.title, 56) +
          pad(c.author ?? '—', 24) +
          pad(c.content_chars.toLocaleString(), 10) +
          pad(String(c.chapter_count), 8) +
          pad(c.chapter_chars.toLocaleString(), 14) +
          '  ' +
          extras.join('; '),
      );
    }
  }

  if (jsonOut) {
    fs.writeFileSync(path.resolve(process.cwd(), jsonOut), JSON.stringify(classified, null, 2), 'utf8');
    console.log(`\n📝 Full classification written: ${path.resolve(process.cwd(), jsonOut)}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
