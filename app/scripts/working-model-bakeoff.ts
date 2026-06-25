/**
 * working-model-bakeoff.ts  (Phase 3 — model test harness)
 *
 * Assembles a graph-grounded palette for an intention, builds ONE model-agnostic
 * synthesis prompt, and runs it through several OpenRouter models in parallel so
 * you can compare ritual "voice" side-by-side and pick a production model.
 *
 * This is exploratory tooling — prints to the terminal, stores nothing.
 *
 * Usage (from app/):
 *   npx tsx scripts/working-model-bakeoff.ts "attract prosperity"
 *   npx tsx scripts/working-model-bakeoff.ts "protection for my home" --models moonshotai/kimi-k2.6,qwen/qwen3-max,deepseek/deepseek-v3.2
 *
 * Design of record: docs/planning/THE_WORKING_PLAN.md
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { assemblePalette } from '../src/lib/working/assemble';
import { buildSynthesisPrompt } from '../src/lib/working/synthesize';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const DEFAULT_MODELS = [
  'moonshotai/kimi-k2.6',
  'qwen/qwen3-max',
  'deepseek/deepseek-v3.2',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const positional: string[] = [];
  let models = DEFAULT_MODELS;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--models' && args[i + 1]) {
      models = args[i + 1].split(',').map((m) => m.trim()).filter(Boolean);
      i += 1;
    } else {
      positional.push(args[i]);
    }
  }
  const intention = positional.join(' ').trim();
  return { intention, models };
}

// The canonical synthesis prompt lives in src/lib/working/synthesize.ts
// (buildSynthesisPrompt) so the bake-off and production never drift.

async function callModel(client: OpenAI, model: string, system: string, user: string) {
  const start = Date.now();
  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.8,
      max_tokens: 1400,
    });
    const text = res.choices?.[0]?.message?.content || '(empty response)';
    return { model, ok: true, ms: Date.now() - start, text };
  } catch (e: any) {
    return { model, ok: false, ms: Date.now() - start, text: e?.message || String(e) };
  }
}

/**
 * Direct Anthropic path (no OpenRouter markup). Model strings prefixed
 * "anthropic:" route here, e.g. "anthropic:claude-haiku-4-5".
 */
async function callClaude(client: Anthropic, model: string, system: string, user: string) {
  const start = Date.now();
  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1400,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('') || '(empty response)';
    return { model: `anthropic:${model}`, ok: true, ms: Date.now() - start, text };
  } catch (e: any) {
    return { model: `anthropic:${model}`, ok: false, ms: Date.now() - start, text: e?.message || String(e) };
  }
}

async function main() {
  const { intention, models } = parseArgs();
  if (!intention) {
    console.error('Usage: npx tsx scripts/working-model-bakeoff.ts "<intention>" [--models a,b,c]');
    process.exit(1);
  }
  const needsOpenRouter = models.some((m) => !m.startsWith('anthropic:'));
  const needsAnthropic = models.some((m) => m.startsWith('anthropic:'));
  if (needsOpenRouter && !process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing in .env.local');
  if (needsAnthropic && !process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing in .env.local');
  if (!process.env.PROD_SUPABASE_URL || !process.env.PROD_SUPABASE_SERVICE_KEY) {
    throw new Error('PROD_SUPABASE_URL / PROD_SUPABASE_SERVICE_KEY missing in .env.local');
  }

  const supabase = createClient(process.env.PROD_SUPABASE_URL, process.env.PROD_SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nAssembling palette for: "${intention}"`);
  const palette = await assemblePalette(supabase, intention);
  if (!palette) {
    console.error(`No intention matched "${intention}".`);
    process.exit(1);
  }
  console.log(`Resolved → ${palette.intention.label} (via ${palette.intention.matchedFrom}); union=[${palette.stats.intentionSlugsUnioned.join(', ')}]`);
  console.log(`Palette: ${palette.stats.totalReturned} components across ${palette.groups.length} groups + ${palette.patrons.length} patrons\n`);

  const { system, user } = buildSynthesisPrompt(palette);

  const client = needsOpenRouter
    ? new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-OpenRouter-Title': process.env.OPENROUTER_APP_TITLE || 'Prismarium',
        },
      })
    : null;
  const anthropic = needsAnthropic ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

  console.log(`Running ${models.length} models in parallel: ${models.join(', ')}\n`);
  const results = await Promise.all(
    models.map((m) =>
      m.startsWith('anthropic:')
        ? callClaude(anthropic!, m.slice('anthropic:'.length), system, user)
        : callModel(client!, m, system, user),
    ),
  );

  for (const r of results) {
    console.log('\n' + '='.repeat(78));
    console.log(`MODEL: ${r.model}   [${r.ok ? 'ok' : 'ERROR'}, ${r.ms}ms]`);
    console.log('='.repeat(78));
    console.log(r.text);
  }
  console.log('\n' + '='.repeat(78));
  console.log('Compare the voices above and tell me which model to use.');
}

main().catch((e) => { console.error(e); process.exit(1); });
