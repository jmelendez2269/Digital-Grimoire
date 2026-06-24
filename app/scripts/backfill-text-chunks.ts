/**
 * Chunk every row in `texts` that has content but no rows in `text_chunks`
 * yet, optionally embedding each chunk with OpenAI text-embedding-3-small.
 *
 * Resume-safe: a text that already has any chunks is skipped. To re-chunk a
 * text, delete its rows from text_chunks first.
 *
 * Cost (text-embedding-3-small): ~$0.02 per 1M tokens. The whole corpus is
 * usually a few dimes — check-corpus-size.ts gives the exact estimate.
 *
 * Usage:
 *   pnpm exec tsx scripts/backfill-text-chunks.ts --dry-run
 *   pnpm exec tsx scripts/backfill-text-chunks.ts --limit 1            # smoke test one text
 *   pnpm exec tsx scripts/backfill-text-chunks.ts                       # full backfill (chunks + embeddings)
 *   pnpm exec tsx scripts/backfill-text-chunks.ts --no-embeddings       # chunks only, free
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { chunkText } from '../src/lib/parallax/chunking';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
// OpenAI's tier-1 free limit on this model is 3000 RPM. We pause briefly
// every BATCH chunks to stay comfortably under that.
const BATCH = 100;
const BATCH_PAUSE_MS = 1000;

type Args = {
  limit: number | null;
  dryRun: boolean;
  noEmbeddings: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { limit: null, dryRun: false, noEmbeddings: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--no-embeddings') out.noEmbeddings = true;
    else if (a === '--limit') {
      out.limit = Number(argv[i + 1]);
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(`Backfill text_chunks (and optionally embeddings) from texts.content.

Flags:
  --limit <n>        Stop after N texts (smoke test)
  --dry-run          Print what would be chunked, do not write
  --no-embeddings    Skip OpenAI calls; insert chunks with embedding=null
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

async function listTextsNeedingChunks(
  supabase: SupabaseClient,
): Promise<Array<{ id: string; title: string; content: string }>> {
  // Page through texts that have content
  const PAGE = 200;
  const out: Array<{ id: string; title: string; content: string }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('texts')
      .select('id, title, content')
      .not('content', 'is', null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`texts page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.content && row.content.trim().length > 0) {
        out.push({ id: row.id, title: row.title, content: row.content });
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Filter out anything that already has chunks. Page through text_chunks
  // explicitly — Supabase's default .select() page is 1000 rows, and if we
  // don't page, the "already indexed" set is silently truncated. Past that
  // truncation point we'd treat already-chunked texts as needing chunking
  // and crash on the chunk_index unique constraint.
  const have = new Set<string>();
  let chunkOffset = 0;
  const CHUNK_PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('text_chunks')
      .select('text_id')
      .range(chunkOffset, chunkOffset + CHUNK_PAGE - 1);
    if (error) throw new Error(`text_chunks scan page ${chunkOffset}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) have.add(r.text_id);
    if (data.length < CHUNK_PAGE) break;
    chunkOffset += CHUNK_PAGE;
  }
  return out.filter((t) => !have.has(t.id));
}

async function embedOne(openai: OpenAI, content: string): Promise<{ embedding: number[]; tokens: number }> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: content,
    dimensions: EMBEDDING_DIMS,
  });
  return {
    embedding: res.data[0].embedding,
    tokens: res.usage?.prompt_tokens ?? 0,
  };
}

async function processText(
  supabase: SupabaseClient,
  openai: OpenAI | null,
  text: { id: string; title: string; content: string },
  args: Args,
): Promise<{ chunks: number; tokens: number }> {
  const chunks = chunkText(text.content);
  if (chunks.length === 0) return { chunks: 0, tokens: 0 };

  let tokens = 0;
  const rows: Array<{
    text_id: string;
    chunk_index: number;
    content: string;
    embedding: number[] | null;
    token_count: number;
  }> = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    let embedding: number[] | null = null;
    if (openai && !args.noEmbeddings) {
      const res = await embedOne(openai, chunk.content);
      embedding = res.embedding;
      tokens += res.tokens;
      if ((i + 1) % BATCH === 0 && i + 1 < chunks.length) {
        await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
      }
    }
    rows.push({
      text_id: text.id,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      embedding,
      token_count: chunk.tokenCount,
    });
  }

  if (args.dryRun) return { chunks: rows.length, tokens };

  // Insert in DB-friendly batches so a single huge text doesn't overflow the
  // PostgREST request size limit.
  const INSERT_BATCH = 50;
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const slice = rows.slice(i, i + INSERT_BATCH);
    const { error } = await supabase.from('text_chunks').insert(slice);
    if (error) throw new Error(`insert chunks for ${text.id}: ${error.message}`);
  }

  return { chunks: rows.length, tokens };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService();
  const openai = args.noEmbeddings ? null : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (openai && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set. Pass --no-embeddings to skip embeddings.');
  }

  console.log(
    `Backfill text_chunks — dryRun=${args.dryRun}, embeddings=${!args.noEmbeddings}, model=${EMBEDDING_MODEL}`,
  );

  let texts = await listTextsNeedingChunks(supabase);
  if (args.limit !== null) texts = texts.slice(0, args.limit);

  console.log(`Texts to process: ${texts.length}`);
  if (texts.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let totalChunks = 0;
  let totalTokens = 0;
  let ok = 0;
  let fail = 0;

  for (const text of texts) {
    const tag = `${text.title} (${text.id.slice(0, 8)})`;
    process.stdout.write(`— ${tag}: `);
    try {
      const res = await processText(supabase, openai, text, args);
      totalChunks += res.chunks;
      totalTokens += res.tokens;
      ok += 1;
      const costSoFar = (totalTokens / 1_000_000) * 0.02;
      console.log(
        `${res.chunks} chunks, ${res.tokens.toLocaleString()} tokens (running total: ${totalChunks} chunks, $${costSoFar.toFixed(3)})`,
      );
    } catch (err) {
      fail += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
    }
  }

  const totalCost = (totalTokens / 1_000_000) * 0.02;
  console.log(`\n=========================================`);
  console.log(`Done. ok=${ok} fail=${fail} dryRun=${args.dryRun}`);
  console.log(`Total chunks: ${totalChunks}`);
  if (!args.noEmbeddings) {
    console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`Estimated cost: $${totalCost.toFixed(4)}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
