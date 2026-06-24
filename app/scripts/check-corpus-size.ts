/**
 * One-shot diagnostic: how much text is in the `texts` table, and how many
 * rows already have chunks. Tells us the scope of any chunking backfill.
 *
 * Usage:
 *   pnpm exec tsx scripts/check-corpus-size.ts
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  // Pull all texts in pages of 1000. We only need id + content length so the
  // payload stays manageable even at thousands of rows.
  let totalTexts = 0;
  let textsWithContent = 0;
  let totalChars = 0;
  let largestText = 0;
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('texts')
      .select('id, content')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`texts page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      totalTexts += 1;
      const len = row.content ? row.content.length : 0;
      if (len > 0) {
        textsWithContent += 1;
        totalChars += len;
        if (len > largestText) largestText = len;
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // How many texts already have chunks?
  const { count: chunkCount, error: chunkErr } = await supabase
    .from('text_chunks')
    .select('id', { count: 'exact', head: true });
  if (chunkErr) throw new Error(`text_chunks count: ${chunkErr.message}`);

  const approxTokens = Math.round(totalChars / 4);
  const approxChunks = Math.ceil(approxTokens / 1800); // chunkText defaults to ~2000 tokens with overlap
  const embedCostUsd = (approxTokens / 1_000_000) * 0.02; // text-embedding-3-small

  console.log(`\nCorpus size report`);
  console.log(`==================`);
  console.log(`texts total              : ${totalTexts}`);
  console.log(`texts with content       : ${textsWithContent}`);
  console.log(`total chars              : ${totalChars.toLocaleString()}`);
  console.log(`approx tokens            : ${approxTokens.toLocaleString()}`);
  console.log(`largest single text      : ${largestText.toLocaleString()} chars`);
  console.log(`approx chunks to create  : ${approxChunks.toLocaleString()}`);
  console.log(`text_chunks rows now     : ${chunkCount ?? 0}`);
  console.log(`embedding cost estimate  : $${embedCostUsd.toFixed(2)} (text-embedding-3-small)`);
  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
