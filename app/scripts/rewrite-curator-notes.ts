import * as path from 'path';
import * as dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '../src/lib/supabase/service';
import { parseAiJsonObject } from '../src/lib/ai/json';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const CLAUDE_MODEL = process.env.CURATOR_REWRITE_MODEL || 'claude-sonnet-4-6';

type ParsedArgs = {
  ids: string[] | null;
  limit: number | null;
  dryRun: boolean;
  missingOnly: boolean;
  rewriteExistingDrafts: boolean;
};

type TextRow = {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  lenses: string[] | null;
  short_summary: string | null;
  long_summary: string | null;
  curator_note: string | null;
  curator_note_draft: string | null;
  curator_note_status: string | null;
  domain: string | null;
  type: string | null;
};

type CatalogEntry = Pick<TextRow, 'id' | 'title' | 'author' | 'year' | 'lenses' | 'short_summary'>;

type RelatedTextEntry = {
  id: string;
  title: string;
  resonance: string;
};

type RewriteOutput = {
  curatorNote: string;
  longSummary: string;
  relatedTexts: RelatedTextEntry[];
};

const BANNED_PHRASES = [
  'cornerstone',
  'seminal',
  'essential reading',
  'its inclusion in',
  'this document',
  'valuable addition',
  'valuable resource',
  'digital grimoire',
  'convergence library',
  'convergence machine',
  'convergence graph',
  'project parallax',
  // 'foundational' is intentionally allowed as a word — banned only in the cliché
  // patterns below so legitimate analytic uses ("foundational account of X") can pass.
  'foundational text',
  'foundational work',
  'foundational document',
  'foundational book',
  // Claude-specific literary tics — caught as a safety net even though they're in the prompt's anti-pattern list.
  'does something quietly',
  'does something subtly',
  'does something deeply',
  'exactly what was at stake',
  'exactly what is at stake',
  // The "stealth-adverb [verb-ing or adjective]" family. User has flagged this pattern twice — it is the
  // single clearest AI tell. Hard-fail on these specific phrases; the prompt teaches the general pattern.
  'quietly devastating',
  'quietly revising',
  'quietly subverting',
  'quietly dismantling',
  'quietly inverting',
  'quietly undoing',
  'subtly profound',
  'subtly inverting',
  'subtly revising',
  'subtly transforming',
  'deeply consequential',
  'deeply unsettling',
  'carefully dismantling',
  'patiently undoing',
];

const MIN_NOTE_LEN = 400;
const MAX_NOTE_LEN = 750;
const MIN_LONG_SUMMARY_LEN = 400;

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    ids: null,
    limit: null,
    dryRun: false,
    missingOnly: false,
    rewriteExistingDrafts: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--missing-only') out.missingOnly = true;
    else if (arg === '--rewrite-existing-drafts') out.rewriteExistingDrafts = true;
    else if (arg === '--ids') out.ids = (argv[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--limit') out.limit = Number(argv[i + 1]);
  }
  return out;
}

function printHelp() {
  console.log(`Rewrite curator's notes with the Prismarium voice + in-library cross-references.

Usage:
  pnpm exec tsx scripts/rewrite-curator-notes.ts --dry-run --limit 3
  pnpm exec tsx scripts/rewrite-curator-notes.ts --ids <id1>,<id2> --dry-run
  pnpm exec tsx scripts/rewrite-curator-notes.ts --limit 10              # writes drafts to DB
  pnpm exec tsx scripts/rewrite-curator-notes.ts --missing-only

Flags:
  --dry-run                      Print output to console, do NOT write to DB
  --limit N                      Process at most N texts
  --ids id1,id2                  Process specific text IDs
  --missing-only                 Only process texts with NULL/empty curator_note
  --rewrite-existing-drafts      Overwrite curator_note_draft if it already exists
  --help                         Show this message
`);
}

function buildCatalog(rows: CatalogEntry[]): string {
  // Full catalog including every text — kept static so it caches across all calls.
  // Self-reference avoidance is handled in the per-call user prompt instead of by filtering here.
  const lines = rows.map((r) => {
    const lenses = (r.lenses ?? []).join(',') || '—';
    const short = (r.short_summary ?? '').replace(/\s+/g, ' ').slice(0, 130);
    const author = r.author ?? 'Unknown';
    const year = r.year ?? '—';
    return `- ${r.id} | ${r.title} — ${author} (${year}) [${lenses}] :: ${short}`;
  });
  return lines.join('\n');
}

const SYSTEM_RULES = `You are the curator of Prismarium — a curated library of sacred texts, philosophy, esoterica, and science. You write the way a well-read friend talks about a book they actually read: plain, direct, specific. You are not performing erudition.

You are rewriting old AI-generated boilerplate. The replacement must do real curatorial work: it must be specific to this text, recommend an entry point, and connect to other texts in the collection.

VOICE — PLAIN AND DIRECT
- State the argument or claim of the book. Don't set up that there is an argument. Don't telegraph that you are about to be insightful.
- Use plain declarative sentences. "Hume argues X." NOT "Hume does something quietly devastating: he argues X."
- No literary flourishes. Specifically avoid these Claude/AI tics:
  * "does something [adverb][adjective]" openers ("does something quietly devastating", "does something subtly profound")
  * "the move that [verb]s [X] in [N] pages" punchy wrap-ups
  * "exactly what was at stake" / "exactly what's going on" vague payoffs
  * "rest on habit, not reason"-style sentence structures that feel engineered for rhythm
  * em-dashes used as rhetorical pauses for effect — use commas, periods, or colons instead
  * THE STEALTH-ADVERB FAMILY: any "[quietly/subtly/carefully/patiently/deeply] [verb-ing or adjective]" construction where the adverb is doing rhetorical work the verb should carry alone. Examples: "quietly devastating", "quietly revising", "quietly subverting", "subtly inverting", "carefully dismantling", "deeply consequential". This is the single clearest AI tell. If you write "X is quietly Y-ing Z", delete "quietly". If the verb needs the adverb to feel important, pick a stronger verb instead.
  * Adverbs in general should be EARNED and CONCRETE. "Dense 17th-century prose" is fine — concrete. "Profoundly shifting" / "elegantly arguing" / "powerfully critiquing" are not. Strip them.
- End with a concrete recommendation, not a vague payoff. "Pair with X to see how Y" not "see exactly what was at stake".

VOICE EXAMPLES — match this register and texture

GOOD example 1 (Hume's Enquiry):
"Hume argues that all knowledge derives from sensory experience and that we have no rational basis for believing in causation, the self, or miracles. You will find his case most vividly made in Section X ('Of Miracles'), where he claims that no testimony can establish a miracle because it is always more probable that the witness is mistaken or lying. Caveat: Hume's psychology is pre-evolutionary and treats human nature as fixed; his argument against miracles may feel more like a logical exercise than a historical inquiry. Pair this with Kant's Prolegomena to Any Future Metaphysics (which attempts to rescue metaphysics from Hume's critique) to see the philosophical earthquake Hume caused."

GOOD example 2 (Apocrypha & Christian Pseudepigrapha):
"This collection is a curated shell for early Christian and Jewish texts that didn't make the canonical cut — deuterocanonical books, pseudepigrapha, apocryphal gospels, and apostolic literature. Start with the 'Gospel of Thomas' (logion 1-114) or the 'Didache' to see how early communities lived and argued. Skip the clustered KJV indices unless you're doing verse-level comparison. For a deeper dive into how these texts reimagine divine order, pair with Pistis Sophia and its Gnostic cosmology."

Note what these have in common: plain claim-stating opener, concrete entry point ("Section X", "logion 1-114", "Start with…"), honest caveat or guidance ("Skip…", "Caveat:…"), specific pair recommendation with a sentence on why. No flourishes.

ACCURACY
- Do NOT invent quotes or facts. If you don't know a specific passage, chapter, or quote with certainty, recommend the text more generally rather than fabricate.
- Do NOT invert famous attributions. Double-check who said what before quoting (e.g., it was Kant who said Hume awakened him from his dogmatic slumber, not the other way around).
- If unsure, prefer general framing over confident error.

OUTPUT JSON SCHEMA
{
  "curatorNote": "<${MIN_NOTE_LEN}-${MAX_NOTE_LEN} characters>",
  "longSummary": "<2-3 paragraphs, substantive and specific to this work>",
  "relatedTexts": [
    { "id": "<exact uuid from catalog>", "title": "<exact title>", "resonance": "<one specific sentence on how they speak to each other>" }
  ]
}

CURATOR NOTE RULES
1. First sentence: a specific observation about what THIS text actually does or argues. NOT a genre label, NOT a list of adjectives.
2. Middle: one specific way in. Either (a) name a chapter/section/passage worth starting with, or (b) an honest caveat — what is dated, contested, or to skip.
3. End: link to at least ONE other text from the catalog. Name it explicitly and say what resonates. The text(s) you link in prose must appear in the relatedTexts array.
4. Length: ${MIN_NOTE_LEN}-${MAX_NOTE_LEN} characters.

RELATED TEXTS RULES
- 1 to 3 entries.
- Each id MUST be copied exactly from the CATALOG. Do not invent UUIDs.
- Each title MUST be copied exactly from the CATALOG.
- Do not self-reference. Never list the target as related to itself.
- "resonance" is one sentence about a specific shared idea, method, or tension — not a generic "both explore wisdom".

LONG SUMMARY RULES
- 2-3 paragraphs.
- Cover the text's central claim, its structure (parts, books, chapters at a high level), and the historical/intellectual context.
- Concrete and specific. Use the text's own terminology where helpful.
- Do not repeat the curator note verbatim.

VOICE
- Write to the reader as "you". Hand them the book.
- Earned, specific, slightly opinionated. You are a curator, not a back-cover blurb.
- Do not name the platform. No mentions of "Prismarium", "Project Parallax", "Digital Grimoire", "Convergence", or any product/feature name.

BANNED WORDS AND PHRASES (do not use in curatorNote or longSummary):
${BANNED_PHRASES.map((p) => `  - "${p}"`).join('\n')}

Return one JSON object. No markdown fences, no commentary, no leading whitespace before the opening brace.`;

function buildSystemCatalogBlock(catalog: string): string {
  return `CATALOG (every text in this collection — pick relatedTexts entries from this list, by exact id)
${catalog}`;
}

function buildUserPrompt(target: TextRow): string {
  const lenses = (target.lenses ?? []).join(', ') || '—';
  return `TARGET TEXT (rewrite the note for this one — do NOT include it in relatedTexts)
- id: ${target.id}
- title: ${target.title}
- author: ${target.author ?? 'Unknown'}
- year: ${target.year ?? 'Unknown'}
- type: ${target.type ?? '—'}
- domain: ${target.domain ?? '—'}
- lenses: ${lenses}
- existing short summary: ${target.short_summary ?? '(none)'}
- existing long summary: ${target.long_summary ?? '(none)'}
- existing curator note (boilerplate you are replacing): ${target.curator_note ?? '(none)'}

Return the JSON object now.`;
}

type ValidationResult = { ok: true } | { ok: false; reasons: string[] };

function validateOutput(
  output: RewriteOutput,
  target: TextRow,
  catalogIds: Set<string>,
): ValidationResult {
  const reasons: string[] = [];

  if (typeof output.curatorNote !== 'string' || output.curatorNote.trim().length === 0) {
    reasons.push('curatorNote missing or empty');
  } else {
    const len = output.curatorNote.length;
    if (len < MIN_NOTE_LEN) reasons.push(`curatorNote too short (${len} < ${MIN_NOTE_LEN})`);
    if (len > MAX_NOTE_LEN) reasons.push(`curatorNote too long (${len} > ${MAX_NOTE_LEN})`);
  }

  if (typeof output.longSummary !== 'string' || output.longSummary.trim().length === 0) {
    reasons.push('longSummary missing or empty');
  } else if (output.longSummary.length < MIN_LONG_SUMMARY_LEN) {
    reasons.push(`longSummary too short (${output.longSummary.length} < ${MIN_LONG_SUMMARY_LEN})`);
  }

  const checkText = `${output.curatorNote ?? ''}\n${output.longSummary ?? ''}`.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (checkText.includes(phrase)) {
      reasons.push(`contains banned phrase: "${phrase}"`);
    }
  }

  if (!Array.isArray(output.relatedTexts) || output.relatedTexts.length === 0) {
    reasons.push('relatedTexts missing or empty (require >=1)');
  } else if (output.relatedTexts.length > 3) {
    reasons.push(`relatedTexts has ${output.relatedTexts.length} entries (max 3)`);
  } else {
    output.relatedTexts.forEach((entry, idx) => {
      if (!entry || typeof entry !== 'object') {
        reasons.push(`relatedTexts[${idx}] is not an object`);
        return;
      }
      if (typeof entry.id !== 'string' || !catalogIds.has(entry.id)) {
        reasons.push(`relatedTexts[${idx}].id "${entry.id}" not found in catalog`);
      }
      if (entry.id === target.id) {
        reasons.push(`relatedTexts[${idx}] is a self-reference`);
      }
      if (typeof entry.title !== 'string' || entry.title.trim().length === 0) {
        reasons.push(`relatedTexts[${idx}].title missing`);
      }
      if (typeof entry.resonance !== 'string' || entry.resonance.trim().length < 20) {
        reasons.push(`relatedTexts[${idx}].resonance missing or too short`);
      }
    });
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

type CacheUsage = { creation: number; read: number };

async function rewriteOne(
  target: TextRow,
  systemBlocks: Anthropic.TextBlockParam[],
  client: Anthropic,
  model: string,
): Promise<{ output: RewriteOutput; cache: CacheUsage }> {
  const userPrompt = buildUserPrompt(target);

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    temperature: 0.3,
    system: systemBlocks,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const firstBlock = response.content[0];
  if (!firstBlock || firstBlock.type !== 'text') {
    throw new Error('Empty or non-text response from Claude');
  }
  // parseAiJsonObject strips fences and tolerates stray prose around the JSON object.
  const parsed = parseAiJsonObject<RewriteOutput>(firstBlock.text);

  const cache: CacheUsage = {
    creation: response.usage?.cache_creation_input_tokens ?? 0,
    read: response.usage?.cache_read_input_tokens ?? 0,
  };
  return { output: parsed, cache };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  const supabase = createServiceClient();
  const aiClient = new Anthropic();
  const model = CLAUDE_MODEL;

  console.log(`🎯 Rewrite curator notes — model: ${model}, dryRun: ${args.dryRun}`);

  const { data: allTexts, error: fetchAllError } = await supabase
    .from('texts')
    .select('id,title,author,year,lenses,short_summary,long_summary,curator_note,curator_note_draft,curator_note_status,domain,type')
    .order('title', { ascending: true });

  if (fetchAllError || !allTexts) {
    throw new Error(`Failed to fetch texts: ${fetchAllError?.message}`);
  }

  const catalogEntries: CatalogEntry[] = allTexts.map((t) => ({
    id: t.id,
    title: t.title,
    author: t.author,
    year: t.year,
    lenses: t.lenses,
    short_summary: t.short_summary,
  }));
  const catalogIds = new Set(catalogEntries.map((e) => e.id));

  let candidates: TextRow[] = allTexts as TextRow[];

  if (args.ids && args.ids.length > 0) {
    const wanted = new Set(args.ids);
    candidates = candidates.filter((t) => wanted.has(t.id));
  } else {
    if (args.missingOnly) {
      candidates = candidates.filter((t) => !t.curator_note || t.curator_note.trim() === '');
    }
    if (!args.rewriteExistingDrafts) {
      candidates = candidates.filter((t) => !t.curator_note_draft);
    }
  }

  if (args.limit !== null && Number.isFinite(args.limit)) {
    candidates = candidates.slice(0, args.limit);
  }

  // Build cached system blocks once — same content goes to every call so Anthropic
  // caches it after the first request, cutting input cost ~90% on subsequent calls.
  const catalogText = buildCatalog(catalogEntries);
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: 'text', text: SYSTEM_RULES },
    {
      type: 'text',
      text: buildSystemCatalogBlock(catalogText),
      cache_control: { type: 'ephemeral' },
    },
  ];

  console.log(`📚 Catalog: ${catalogEntries.length} texts | candidates to process: ${candidates.length}`);
  if (candidates.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let okCount = 0;
  let failCount = 0;
  let totalCacheCreation = 0;
  let totalCacheRead = 0;
  const failures: { id: string; title: string; reasons: string[] }[] = [];

  for (const target of candidates) {
    console.log(`\n— ${target.title} (${target.id})`);
    try {
      const { output, cache } = await rewriteOne(target, systemBlocks, aiClient, model);
      totalCacheCreation += cache.creation;
      totalCacheRead += cache.read;

      const validation = validateOutput(output, target, catalogIds);

      if (!validation.ok) {
        failCount += 1;
        failures.push({ id: target.id, title: target.title, reasons: validation.reasons });
        console.warn(`  ❌ validation failed:\n    - ${validation.reasons.join('\n    - ')}`);
        console.log(`  raw output:\n${JSON.stringify(output, null, 2)}`);
        continue;
      }

      okCount += 1;
      console.log(`  ✅ curatorNote (${output.curatorNote.length} chars)`);
      console.log(`     ${output.curatorNote}`);
      console.log(`  ✅ longSummary (${output.longSummary.length} chars)`);
      console.log(`  ✅ relatedTexts: ${output.relatedTexts.map((r) => r.title).join(' | ')}`);
      if (cache.read > 0) {
        console.log(`  ⚡ cache hit: ${cache.read} tokens read from cache`);
      } else if (cache.creation > 0) {
        console.log(`  🧱 cache primed: ${cache.creation} tokens cached for next call`);
      }

      if (args.dryRun) {
        continue;
      }

      const { error: updateError } = await supabase
        .from('texts')
        .update({
          curator_note_draft: output.curatorNote,
          long_summary_draft: output.longSummary,
          related_texts: output.relatedTexts,
          curator_note_status: 'draft_pending',
        })
        .eq('id', target.id);

      if (updateError) {
        failCount += 1;
        okCount -= 1;
        failures.push({ id: target.id, title: target.title, reasons: [`DB write failed: ${updateError.message}`] });
        console.warn(`  ❌ DB write failed: ${updateError.message}`);
      } else {
        console.log(`  💾 draft written`);
      }
    } catch (error) {
      failCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ id: target.id, title: target.title, reasons: [message] });
      console.warn(`  ❌ ${message}`);
    }
  }

  console.log(`\n=========================================`);
  console.log(`Done. ok=${okCount} fail=${failCount} dryRun=${args.dryRun}`);
  console.log(`Cache: ${totalCacheRead} tokens read | ${totalCacheCreation} tokens cached`);
  if (failures.length > 0) {
    console.log(`\nFailures:`);
    for (const f of failures) {
      console.log(`  - ${f.title} (${f.id})`);
      for (const r of f.reasons) console.log(`      • ${r}`);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
