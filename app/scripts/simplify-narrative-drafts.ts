/**
 * Simplify existing narrative drafts to a "curious adult" reading level —
 * magazine-article clarity, no academic jargon, same facts and hedging.
 *
 * Reads entities where narrative_status='draft' and narrative_source IN
 * ('structured','corpus'). After rewriting, stamps narrative_source =
 * 'simplified-v1' so reruns skip already-done entries.
 *
 * Usage:
 *   pnpm exec tsx scripts/simplify-narrative-drafts.ts --list
 *   pnpm exec tsx scripts/simplify-narrative-drafts.ts --category stone --dry-run
 *   pnpm exec tsx scripts/simplify-narrative-drafts.ts --category stone
 *   pnpm exec tsx scripts/simplify-narrative-drafts.ts --all
 *   pnpm exec tsx scripts/simplify-narrative-drafts.ts --all --limit 50
 *   pnpm exec tsx scripts/simplify-narrative-drafts.ts --all --provider anthropic
 *   pnpm exec tsx scripts/simplify-narrative-drafts.ts --all --db staging
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const CLAUDE_MODEL = process.env.ENTITY_NARRATIVE_MODEL || 'claude-sonnet-4-6';
const OPENROUTER_MODEL =
  process.env.ENTITY_NARRATIVE_OR_MODEL ||
  process.env.OPENROUTER_MODEL ||
  'qwen/qwen3-next-80b-a3b-instruct:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const SIMPLIFIED_SOURCE = 'simplified-v1';
const MIN_LEN = 50;
const PAGE = 1000;

type Provider = 'anthropic' | 'openrouter';
type LLMConfig =
  | { provider: 'anthropic'; client: Anthropic; model: string }
  | { provider: 'openrouter'; client: OpenAI; model: string };

type Args = {
  list: boolean;
  all: boolean;
  category: string | null;
  dryRun: boolean;
  db: 'prod' | 'staging';
  provider: Provider;
  limit: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const out: Args = {
    list: false,
    all: false,
    category: null,
    dryRun: false,
    db: 'prod',
    provider: 'openrouter',
    limit: Infinity,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') out.list = true;
    else if (a === '--all') out.all = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--category' && argv[i + 1]) out.category = argv[++i];
    else if (a === '--db' && argv[i + 1]) out.db = argv[++i] as 'prod' | 'staging';
    else if (a === '--provider' && argv[i + 1]) out.provider = argv[++i] as Provider;
    else if (a === '--limit' && argv[i + 1]) out.limit = parseInt(argv[++i], 10);
  }
  return out;
}

function makeClient(db: 'prod' | 'staging'): SupabaseClient {
  if (db === 'prod') {
    const url = process.env.PROD_SUPABASE_URL;
    const key = process.env.PROD_SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('Missing PROD_SUPABASE_URL or PROD_SUPABASE_SERVICE_KEY');
    return createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function makeLLM(provider: Provider): LLMConfig {
  if (provider === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('Missing ANTHROPIC_API_KEY');
    return { provider: 'anthropic', client: new Anthropic({ apiKey: key }), model: CLAUDE_MODEL };
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('Missing OPENROUTER_API_KEY');
  return {
    provider: 'openrouter',
    client: new OpenAI({ apiKey: key, baseURL: OPENROUTER_BASE_URL }),
    model: OPENROUTER_MODEL,
  };
}

const SYSTEM_PROMPT = `You are a copy editor for a spiritual encyclopedia. Rewrite the entry so it is clear and engaging for a curious adult with no academic background — the register of a good magazine article or Wikipedia lead paragraph.

Rules:
- Short sentences: no more than 2–3 clauses each; split long ones into two
- Active voice and concrete subjects wherever possible
- Keep every factual claim and source caveat from the original (mention of Llewellyn, Darwin, "modern occult tradition", etc.)
- Keep the "Practitioners reach for it when…" structure if present — just make it more direct
- Drop literary-criticism phrasing: avoid "emerges as", "suggests a tension between", "gathering around", "implies a fossilized memory", "positions it as", "leaving X unchallenged"
- Established terms (chakra names, rune names, deity names, tradition names) are fine without definition
- Match the original length — 2 to 5 sentences
- Do NOT add any information not in the original
- Output only the rewritten text. No commentary, no quotes, no labels.`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function simplifyOnce(cfg: LLMConfig, original: string): Promise<string> {
  const user = `Rewrite this entry:\n\n${original}`;
  if (cfg.provider === 'anthropic') {
    const res = await cfg.client.messages.create({
      model: cfg.model,
      max_tokens: 600,
      temperature: 0.2,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
    });
    const block = res.content[0];
    if (!block || block.type !== 'text') throw new Error('Empty Anthropic response');
    return block.text.trim();
  }
  const res = await cfg.client.chat.completions.create({
    model: cfg.model,
    max_tokens: 600,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: user },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error('Empty OpenRouter response');
  return text.trim();
}

async function simplifyWithRetry(cfg: LLMConfig, original: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await simplifyOnce(cfg, original);
      if (result.length < MIN_LEN) throw new Error(`Too short: ${result.length} chars`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        const wait = attempt * 15000;
        console.log(`\n  rate limit — waiting ${wait / 1000}s...`);
        await sleep(wait);
      } else if (attempt < 3) {
        await sleep(2000);
      } else {
        console.error(`\n  failed after 3 attempts: ${msg}`);
        return null;
      }
    }
  }
  return null;
}

type Row = { id: string; name: string; category: string; narrative_draft: string };

async function fetchPending(client: SupabaseClient, category: string | null): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;
  while (true) {
    let q = client
      .from('correspondences')
      .select('id, name, category, narrative_draft')
      .eq('narrative_status', 'draft')
      .in('narrative_source', ['structured', 'corpus'])
      .range(from, from + PAGE - 1);
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw new Error(`fetch: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) {
      if ((r.narrative_draft?.length ?? 0) >= MIN_LEN) rows.push(r as Row);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

(async () => {
  const args = parseArgs();

  if (!args.list && !args.all && !args.category) {
    console.log(`Usage:
  --list                   count pending entities per category
  --category <name>        simplify one category
  --all                    simplify all categories
  --dry-run                show rewritten sample without saving
  --limit N                cap total entities processed
  --provider openrouter|anthropic   default: openrouter
  --db prod|staging        default: prod`);
    process.exit(0);
  }

  const db = makeClient(args.db);
  const llm = args.list || args.dryRun ? null : makeLLM(args.provider);

  console.log(`DB: ${args.db}  |  provider: ${args.provider}  |  dry-run: ${args.dryRun}`);
  console.log();

  // --list
  if (args.list) {
    const rows = await fetchPending(db, null);
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let total = 0;
    console.log('Category                         pending-simplification');
    console.log('─'.repeat(55));
    for (const [cat, n] of sorted) {
      console.log(`  ${cat.padEnd(32)} ${n}`);
      total += n;
    }
    console.log('─'.repeat(55));
    console.log(`  ${'TOTAL'.padEnd(32)} ${total}`);
    return;
  }

  const pending = await fetchPending(db, args.category);
  const toProcess = pending.slice(0, args.limit === Infinity ? pending.length : args.limit);

  console.log(`${toProcess.length} entities to simplify`);
  if (toProcess.length === 0) return;

  // --dry-run: show 3 rewrites then exit
  if (args.dryRun) {
    const sample = toProcess.slice(0, 3);
    const dryLLM = makeLLM(args.provider);
    for (const row of sample) {
      console.log(`\n--- ${row.category}/${row.name} ---`);
      console.log('ORIGINAL:');
      console.log(row.narrative_draft);
      console.log('\nSIMPLIFIED:');
      const result = await simplifyWithRetry(dryLLM, row.narrative_draft);
      console.log(result ?? '(failed)');
    }
    console.log(`\nDRY RUN — ${toProcess.length} total pending. Remove --dry-run to apply.`);
    return;
  }

  // Apply
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    process.stdout.write(`\r[${i + 1}/${toProcess.length}] ${row.category}/${row.name.slice(0, 30).padEnd(30)}`);

    const simplified = await simplifyWithRetry(llm!, row.narrative_draft);
    if (!simplified) {
      fail++;
      continue;
    }

    const { error } = await db
      .from('correspondences')
      .update({
        narrative_draft: simplified,
        narrative_source: SIMPLIFIED_SOURCE,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (error) {
      console.error(`\n  DB error for ${row.id}: ${error.message}`);
      fail++;
    } else {
      ok++;
    }

    // Small delay between calls to stay under free-tier rate limits
    await sleep(300);
  }

  console.log(`\n\nDone. ${ok} simplified, ${fail} failed.`);
  if (fail > 0) console.log(`Re-run to retry failed entries (they keep source='structured'/'corpus').`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
