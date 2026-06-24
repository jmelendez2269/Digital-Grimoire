/**
 * Flatten `metadata.chapters` HTML into plain-text `texts.content` for
 * structured-import rows that the rest of the pipeline can't currently see.
 *
 * Why this exists:
 *   /api/import-sacred-text deliberately writes content=null and stashes
 *   the actual text into metadata.chapters[].content as raw HTML. Nothing
 *   downstream (chunking, FTS, narrative drafting, vector search) reads
 *   metadata.chapters, so those texts are invisible. This pass extracts
 *   the HTML, strips it to plain text, and writes the result into the
 *   content column where the rest of the system already looks.
 *
 * Resume-safe by default: skips any text that already has non-empty
 * content. Pass --force to re-flatten over an existing content value.
 *
 * Usage:
 *   pnpm exec tsx scripts/flatten-chapters-to-content.ts --dry-run
 *   pnpm exec tsx scripts/flatten-chapters-to-content.ts --limit 1 --dry-run     # smoke-test one row
 *   pnpm exec tsx scripts/flatten-chapters-to-content.ts                          # full run
 *   pnpm exec tsx scripts/flatten-chapters-to-content.ts --slug rosicrucians     # target by title substring
 *   pnpm exec tsx scripts/flatten-chapters-to-content.ts --force                  # overwrite existing content
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as cheerio from 'cheerio';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Below this we treat a chapter as a navigation/index page rather than real
// prose. Still emitted to content, but flagged in the per-row summary so
// you can spot "this row has only index-page text" cases.
const MIN_SUBSTANTIVE_CHAPTER_CHARS = 600;

type Args = {
  limit: number | null;
  dryRun: boolean;
  force: boolean;
  slug: string | null;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { limit: null, dryRun: false, force: false, slug: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--force') out.force = true;
    else if (a === '--limit') {
      out.limit = Number(argv[i + 1]);
      i += 1;
    } else if (a === '--slug' || a === '--title') {
      out.slug = (argv[i + 1] ?? '').toLowerCase();
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(`Flatten metadata.chapters HTML into texts.content.

Flags:
  --limit <n>       Process at most N rows (smoke test)
  --dry-run         Print what would change, do not write
  --force           Re-flatten even if texts.content is already populated
  --slug <text>     Filter by title substring (case-insensitive)
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
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

/**
 * Strip an HTML chapter to plain text. Drops navigation chrome, preserves
 * paragraph and heading boundaries as newlines so FTS doesn't see two
 * adjacent words from different paragraphs as one phrase.
 */
function htmlToPlainText(html: string): string {
  if (!html) return '';
  // Quick pass: if it doesn't look like HTML at all, just normalize
  // whitespace and return it.
  if (!html.includes('<') || !html.includes('>')) {
    return html.replace(/\s+/g, ' ').trim();
  }

  const $ = cheerio.load(html);

  // Strip non-content elements outright.
  $('script, style, nav, header, footer, noscript').remove();
  // The sacred-texts pages are riddled with "next/previous" link bars and
  // "Sacred Texts" navigation. Most live in <hr>-bracketed link groups.
  $('hr').remove();

  // Insert newlines after block-level boundaries so paragraph splits survive
  // the .text() collapse.
  $('p, div, br, li, h1, h2, h3, h4, h5, h6, blockquote, pre, tr').each((_, el) => {
    $(el).append('\n');
  });

  let text = $.root().text();
  // Decode common entities that cheerio's .text() leaves as-is in some
  // versions and normalize whitespace.
  text = text
    .replace(/ /g, ' ')        // nbsp
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

type FlattenRow = {
  id: string;
  title: string;
  content: string | null;
  metadata: any;
};

async function listCandidates(supabase: SupabaseClient, args: Args): Promise<FlattenRow[]> {
  // Pull all rows that have a metadata field. We then filter in JS for ones
  // whose metadata.chapters has substantive text — doing that filter in SQL
  // would require a custom RPC and the table is small enough that the JS
  // path is fine.
  const PAGE = 100;
  const out: FlattenRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('texts')
      .select('id, title, content, metadata')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`texts page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as FlattenRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return out.filter((row) => {
    if (args.slug && !(row.title ?? '').toLowerCase().includes(args.slug)) return false;
    const meta = row.metadata || {};
    const chapters = Array.isArray(meta.chapters) ? meta.chapters : [];
    const chapterChars = chapters.reduce(
      (s: number, c: any) => s + (typeof c?.content === 'string' ? c.content.length : 0),
      0,
    );
    if (chapterChars < 200) return false;
    const hasContent = (row.content ?? '').trim().length >= 200;
    if (hasContent && !args.force) return false;
    return true;
  });
}

type FlattenResult = {
  chapterCount: number;
  substantiveChapters: number;
  htmlChars: number;
  plainChars: number;
  text: string;
  firstChapterPreview: string;
};

function flattenChapters(meta: any): FlattenResult {
  const chapters = Array.isArray(meta?.chapters) ? meta.chapters : [];
  const blocks: string[] = [];
  let htmlChars = 0;
  let substantive = 0;
  let firstPreview = '';

  for (const ch of chapters) {
    const html = typeof ch?.content === 'string' ? ch.content : '';
    if (!html) continue;
    htmlChars += html.length;
    const plain = htmlToPlainText(html);
    if (!plain) continue;
    if (plain.length >= MIN_SUBSTANTIVE_CHAPTER_CHARS) substantive += 1;
    const title = typeof ch?.title === 'string' ? ch.title.trim() : '';
    const block = title ? `${title}\n\n${plain}` : plain;
    blocks.push(block);
    if (!firstPreview) firstPreview = plain.slice(0, 180);
  }

  const text = blocks.join('\n\n---\n\n');
  return {
    chapterCount: chapters.length,
    substantiveChapters: substantive,
    htmlChars,
    plainChars: text.length,
    text,
    firstChapterPreview: firstPreview,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService();

  console.log(`Flatten chapters -> content — dryRun=${args.dryRun}, force=${args.force}`);

  let candidates = await listCandidates(supabase, args);
  if (args.limit !== null) candidates = candidates.slice(0, args.limit);

  console.log(`Candidates: ${candidates.length}`);
  if (candidates.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let ok = 0;
  let fail = 0;
  let skipped = 0;
  let totalChars = 0;

  for (const row of candidates) {
    process.stdout.write(`— ${row.title} (${row.id.slice(0, 8)}): `);
    try {
      const res = flattenChapters(row.metadata);
      if (res.plainChars < 200) {
        skipped += 1;
        console.log(`⏭  skipped — only ${res.plainChars} chars after stripping`);
        continue;
      }

      totalChars += res.plainChars;
      const flag = res.substantiveChapters === 0 ? ' (index-page only)' : '';
      console.log(
        `${res.chapterCount} chapters → ${res.plainChars.toLocaleString()} chars` +
          ` (substantive=${res.substantiveChapters})${flag}`,
      );
      if (args.dryRun) {
        console.log(`   preview: ${res.firstChapterPreview.replace(/\n+/g, ' ')}${res.firstChapterPreview.length === 180 ? '…' : ''}`);
        ok += 1;
        continue;
      }

      const { error } = await supabase
        .from('texts')
        .update({ content: res.text })
        .eq('id', row.id);
      if (error) {
        fail += 1;
        console.log(`   ❌ update failed: ${error.message}`);
      } else {
        ok += 1;
      }
    } catch (err) {
      fail += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
    }
  }

  console.log(`\n=========================================`);
  console.log(`Done. ok=${ok} fail=${fail} skipped=${skipped} dryRun=${args.dryRun}`);
  console.log(`Total chars flattened: ${totalChars.toLocaleString()}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
