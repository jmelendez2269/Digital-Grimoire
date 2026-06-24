/**
 * Fetch every bucket-D text (content empty, s3_key set) from R2, extract its
 * text via pdf-parse, and write the extracted text into texts.content so the
 * rest of the pipeline (chunking, FTS, narrative drafting) can see it.
 *
 * Uses the same local extraction path /api/process-document already runs:
 *   pdf-parse for the text layer + isTextSubstantial heuristics to reject
 *   scanned PDFs with garbage or thin embedded OCR layers.
 *
 * Born-digital PDFs (Project Gutenberg, Archive.org) succeed. Scanned PDFs
 * fail the substantiality check and get LOGGED — no Azure OCR call, no
 * money spent. The log lets you decide whether to re-source those as
 * cleaner files, OCR them, or skip them.
 *
 * Resume-safe: skips any row where texts.content is already populated.
 *
 * Usage:
 *   pnpm exec tsx scripts/extract-pdf-content.ts --dry-run
 *   pnpm exec tsx scripts/extract-pdf-content.ts --limit 1 --dry-run
 *   pnpm exec tsx scripts/extract-pdf-content.ts --limit 1            # smoke test one row for real
 *   pnpm exec tsx scripts/extract-pdf-content.ts                       # full run on all bucket-D rows
 *   pnpm exec tsx scripts/extract-pdf-content.ts --slug "tao"          # filter by title substring
 *   pnpm exec tsx scripts/extract-pdf-content.ts --report failures.json # dump per-row outcomes for triage
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// We use pdfjs-dist (Mozilla's PDF.js) instead of pdf-parse here because
// pdf-parse has a long-standing bootstrap bug (its index.js checks
// `module.parent` and runs a debug block that never sets module.exports
// when loaded under tsx), AND its newer package.json blocks subpath imports
// so the documented workaround (require('pdf-parse/lib/pdf-parse.js'))
// fails too. pdfjs-dist is already a dep of this project and has no such
// issues. The Next.js production route at /api/process-document keeps
// using pdf-parse unchanged — this divergence is intentional and isolated
// to this script.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

async function extractPdfTextLocally(fileBuffer: Buffer): Promise<{ text: string; pageCount: number }> {
  // pdfjs needs a Uint8Array view, not a Buffer directly. Passing a Buffer
  // works in most cases but the typed-array shape is safer across versions.
  const data = new Uint8Array(fileBuffer);
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    // Suppress noisy worker-related warnings; we're running fully in-process.
    verbosity: 0,
  });
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  const pieces: string[] = [];
  for (let i = 1; i <= pageCount; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) pieces.push(pageText);
  }
  await doc.cleanup();
  await doc.destroy();
  return {
    text: pieces.join('\n\n').trim(),
    pageCount,
  };
}

// Mirrors isTextSubstantial in app/src/lib/utils/server-pdf-extractor.ts.
// Kept inline so this script doesn't depend on production code paths.
function isTextSubstantial(text: string, pageCount: number): boolean {
  if (!text || pageCount === 0) return false;
  const charsPerPage = text.length / pageCount;
  if (charsPerPage < 300) return false;
  const cleanChars = (text.match(/[a-zA-Z0-9 .,;:'"!?\-\n]/g) || []).length;
  if (cleanChars / text.length < 0.7) return false;
  const realWords = (text.match(/[a-zA-Z]{3,}/g) || []).length;
  if (realWords / pageCount < 50) return false;
  return true;
}

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'convergence-library';

type Args = {
  limit: number | null;
  dryRun: boolean;
  slug: string | null;
  report: string | null;
};

type Row = {
  id: string;
  title: string;
  content: string | null;
  s3_key: string | null;
  mime_type: string | null;
  file_size: number | null;
};

type Outcome = {
  id: string;
  title: string;
  s3_key: string;
  status: 'ok' | 'skipped' | 'too_thin' | 'fetch_failed' | 'parse_failed' | 'unsupported';
  chars: number;
  pageCount: number;
  reason?: string;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { limit: null, dryRun: false, slug: null, report: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--limit') {
      out.limit = Number(argv[i + 1]);
      i += 1;
    } else if (a === '--slug' || a === '--title') {
      out.slug = (argv[i + 1] ?? '').toLowerCase();
      i += 1;
    } else if (a === '--report') {
      out.report = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(`Extract PDF text from R2 -> texts.content.

Flags:
  --limit <n>       Process at most N rows (smoke test)
  --dry-run         Fetch and parse, but do not write to texts.content
  --slug <text>     Filter by title substring (case-insensitive)
  --report <path>   Write per-row outcomes as JSON (for triage)
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function createSupabaseService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function createR2Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 env (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) in app/.env.local');
  }
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function fetchObject(s3: S3Client, bucket: string, key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error('R2 returned empty body');
  return streamToBuffer(res.Body as any);
}

async function listBucketDRows(supabase: SupabaseClient, args: Args): Promise<Row[]> {
  const PAGE = 200;
  const rows: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('texts')
      .select('id, title, content, s3_key, mime_type, file_size')
      .not('s3_key', 'is', null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`texts page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return rows.filter((r) => {
    if (!r.s3_key) return false;
    const contentLen = (r.content ?? '').trim().length;
    // Bucket D = content empty AND s3_key present. Allow override via dry-run
    // if needed, but the safety check stays.
    if (contentLen >= 200) return false;
    if (args.slug && !(r.title ?? '').toLowerCase().includes(args.slug)) return false;
    return true;
  });
}

function isProcessablePdf(row: Row): boolean {
  if (row.mime_type && !row.mime_type.toLowerCase().includes('pdf')) return false;
  if (!row.s3_key) return false;
  // Some non-PDF uploads (epub, txt) may sneak in. We accept rows with PDF
  // mime or with a .pdf extension on the key; everything else gets logged
  // as unsupported for now.
  const key = row.s3_key.toLowerCase();
  return key.endsWith('.pdf') || (row.mime_type ?? '').toLowerCase().includes('pdf');
}

async function processOne(
  row: Row,
  supabase: SupabaseClient,
  s3: S3Client,
  args: Args,
): Promise<Outcome> {
  const base: Outcome = {
    id: row.id,
    title: row.title,
    s3_key: row.s3_key!,
    status: 'ok',
    chars: 0,
    pageCount: 0,
  };

  if (!isProcessablePdf(row)) {
    return { ...base, status: 'unsupported', reason: `mime=${row.mime_type ?? '(none)'}, key=${row.s3_key}` };
  }

  let buffer: Buffer;
  try {
    buffer = await fetchObject(s3, R2_BUCKET, row.s3_key!);
  } catch (err) {
    return { ...base, status: 'fetch_failed', reason: err instanceof Error ? err.message : String(err) };
  }

  let parsed: { text: string; pageCount: number };
  try {
    parsed = await extractPdfTextLocally(buffer);
  } catch (err) {
    return { ...base, status: 'parse_failed', reason: err instanceof Error ? err.message : String(err) };
  }

  base.chars = parsed.text.length;
  base.pageCount = parsed.pageCount;

  if (!isTextSubstantial(parsed.text, parsed.pageCount)) {
    return { ...base, status: 'too_thin', reason: `chars=${parsed.text.length}, pages=${parsed.pageCount}` };
  }

  // Strip NUL bytes — Postgres text columns reject   with "unsupported
  // Unicode escape sequence." PDF.js occasionally emits stray NULs from
  // broken glyph mappings, especially in older or poorly-encoded files.
  // Also normalize Unicode replacement chars and excessive control chars
  // since they're noise for FTS.
  const cleaned = parsed.text
    .replace(/ /g, '')
    .replace(/[--]/g, '')
    .trim();

  if (args.dryRun) return { ...base, status: 'ok', chars: cleaned.length };

  const { error } = await supabase
    .from('texts')
    .update({ content: cleaned })
    .eq('id', row.id);
  if (error) return { ...base, status: 'parse_failed', reason: `update failed: ${error.message}` };

  return { ...base, chars: cleaned.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createSupabaseService();
  const s3 = createR2Client();

  console.log(`Extract PDF -> content — dryRun=${args.dryRun}, bucket=${R2_BUCKET}`);

  let rows = await listBucketDRows(supabase, args);
  if (args.limit !== null) rows = rows.slice(0, args.limit);
  console.log(`Candidates: ${rows.length}`);
  if (rows.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const outcomes: Outcome[] = [];
  let ok = 0;
  let tooThin = 0;
  let fetchFailed = 0;
  let parseFailed = 0;
  let unsupported = 0;

  for (const row of rows) {
    process.stdout.write(`— ${row.title} (${row.id.slice(0, 8)}): `);
    const result = await processOne(row, supabase, s3, args);
    outcomes.push(result);

    if (result.status === 'ok') {
      ok += 1;
      console.log(`✅ ${result.chars.toLocaleString()} chars, ${result.pageCount} pages`);
    } else if (result.status === 'too_thin') {
      tooThin += 1;
      console.log(`⚠️ too thin (${result.reason}) — likely scanned, needs OCR`);
    } else if (result.status === 'fetch_failed') {
      fetchFailed += 1;
      console.log(`❌ fetch failed: ${result.reason}`);
    } else if (result.status === 'parse_failed') {
      parseFailed += 1;
      console.log(`❌ parse failed: ${result.reason}`);
    } else if (result.status === 'unsupported') {
      unsupported += 1;
      console.log(`⏭  unsupported: ${result.reason}`);
    }
  }

  console.log(`\n=========================================`);
  console.log(
    `Done. ok=${ok}, too_thin=${tooThin}, fetch_failed=${fetchFailed}, parse_failed=${parseFailed}, unsupported=${unsupported}`,
  );
  console.log(`dryRun=${args.dryRun}`);

  if (args.report) {
    const filePath = path.resolve(process.cwd(), args.report);
    fs.writeFileSync(filePath, JSON.stringify(outcomes, null, 2), 'utf8');
    console.log(`📝 Report written: ${filePath}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
