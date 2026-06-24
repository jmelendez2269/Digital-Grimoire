/**
 * Draft narrative summaries for correspondence-graph entities that don't have
 * one yet.
 *
 * For each missing entity:
 *   1. Search the `text_chunks` corpus (FTS) for passages mentioning the
 *      entity name and aliases.
 *   2. If we find enough distinct passages -> CORPUS path: prompt Claude with
 *      the passages plus the structured associations, ask for a grounded
 *      2-4 sentence narrative.
 *   3. Otherwise -> STRUCTURED path: prompt Claude with the lenses and top
 *      graph connections only.
 *
 * Drafts are written to correspondences.narrative_draft with
 * narrative_status='draft' and narrative_source set to the path that drafted
 * it. They do NOT become visible in the dossier until a human promotes the
 * draft into `description` and flips narrative_status to 'approved'.
 *
 * Companion to migration 039_add_correspondence_narrative_fields.sql.
 *
 * Usage:
 *   pnpm exec tsx scripts/draft-entity-narratives.ts --limit 3 --dry-run
 *   pnpm exec tsx scripts/draft-entity-narratives.ts --limit 3
 *   pnpm exec tsx scripts/draft-entity-narratives.ts --entity-slug emperor
 *   pnpm exec tsx scripts/draft-entity-narratives.ts --limit 3 --review-file narrative-drafts-pilot.md
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseAiJsonObject } from '../src/lib/ai/json';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const CLAUDE_MODEL = process.env.ENTITY_NARRATIVE_MODEL || 'claude-sonnet-4-6';
// Default OpenRouter free model for narrative drafting. As of this writing
// the free tier does NOT include DeepSeek — the closest match in quality
// for our prose+JSON task is Qwen3-Next 80B Instruct, which supports
// response_format and structured_outputs (best JSON compliance available
// at $0). ENTITY_NARRATIVE_OR_MODEL overrides for narrative-only
// experiments without disturbing the project-wide OPENROUTER_MODEL.
// Browse https://openrouter.ai/models?max_price=0 for current options.
const OPENROUTER_MODEL =
  process.env.ENTITY_NARRATIVE_OR_MODEL ||
  process.env.OPENROUTER_MODEL ||
  'qwen/qwen3-next-80b-a3b-instruct:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_APP_TITLE = process.env.OPENROUTER_APP_TITLE || 'Prismarium';

type Provider = 'anthropic' | 'openrouter';

type LLMConfig =
  | { provider: 'anthropic'; client: Anthropic; model: string }
  | { provider: 'openrouter'; client: OpenAI; model: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.toLowerCase().includes('rate limit');
}

async function callLLMOnce(cfg: LLMConfig, system: string, user: string): Promise<string> {
  if (cfg.provider === 'anthropic') {
    const response = await cfg.client.messages.create({
      model: cfg.model,
      max_tokens: 1200,
      temperature: 0.3,
      // Cache the system prompt across calls — slashes input cost on the
      // bulk run by ~80% after the first prime.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
    });
    const block = response.content[0];
    if (!block || block.type !== 'text') throw new Error('Empty Anthropic response');
    return block.text;
  }

  // OpenRouter / OpenAI-compatible. response_format=json_object nudges
  // most modern free models to skip the markdown fence noise and emit a
  // parseable JSON object directly. Some providers ignore the hint; the
  // parseAiJsonObject helper is tolerant of fences either way.
  const response = await cfg.client.chat.completions.create({
    model: cfg.model,
    max_tokens: 1200,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('Empty OpenRouter response');
  return text;
}

async function callLLM(cfg: LLMConfig, system: string, user: string): Promise<string> {
  // Retry with exponential backoff on 429s. OpenRouter's free tier caps
  // requests per minute aggressively (often 15-20 RPM on free models); a
  // single burst trips it. We give up to 5 attempts with growing waits
  // before surfacing the error to the entity loop, which already counts
  // it as a failure for that row.
  const maxAttempts = 5;
  let attempt = 0;
  let lastError: unknown;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await callLLMOnce(cfg, system, user);
    } catch (err) {
      lastError = err;
      if (!isRateLimitError(err) || attempt >= maxAttempts) throw err;
      // Backoff: 8s, 16s, 32s, 64s. Free-tier 429 windows are usually
      // 60 seconds so this overlaps comfortably with the reset.
      const waitMs = 4000 * Math.pow(2, attempt);
      console.log(`    ⏳ 429 from provider — backing off ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${maxAttempts - 1})`);
      await sleep(waitMs);
    }
  }
  throw lastError;
}

// External-passages folder: per-category .md files containing snippets from
// copyrighted modern sources we use as drafting context but do NOT store in
// the library. Snippets are read at draft time, injected into the prompt
// as supplementary grounding labeled with their genre, and the LLM
// synthesizes original prose from them. The folder is .gitignore'd so the
// raw snippets never enter version control or production. See the README
// inside the folder for format conventions.
const EXTERNAL_PASSAGES_DIR = path.join(__dirname, 'external-passages');
// Cap external passages per entity so the prompt stays manageable.
const EXTERNAL_PASSAGES_PER_ENTITY = 4;

// A corpus draft is only used when we find at least this many SUBSTANTIVE
// passages mentioning the entity. A "substantive" passage means the chunk
// is long enough and has real context around the mention — passing
// references in chapter indexes or one-line lists do not count. Otherwise
// we fall back to a structured draft so we don't pretend we have source
// support when we really just have name-matches.
const MIN_CORPUS_PASSAGES = 3;
const CORPUS_PASSAGE_LIMIT = 6;
const MIN_CHUNK_LEN_FOR_SUBSTANCE = 600;     // chars; below this is fragment/list
const MIN_CONTEXT_AROUND_MENTION = 200;      // chars on at least one side of the entity mention
const MIN_NARRATIVE_LEN = 500;   // ~85 words; force enough body that the frame isn't skipped
const MAX_NARRATIVE_LEN = 1800;  // ~300 words; room for a developed frame plus use plus tension

type Args = {
  limit: number | null;
  entitySlug: string | null;
  category: string | null;
  dryRun: boolean;
  overwriteDrafts: boolean;
  reviewFile: string | null;
  provider: Provider;
  model: string | null;
  rpm: number | null;
  db: 'staging' | 'prod';
};

type EntityRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  aliases: string[] | null;
  description: string | null;
  lenses: string[] | null;
  narrative_status: string;
  type?: { slug?: string; label?: string } | null;
};

type ClaimRow = {
  field_key: string;
  field_value: string | null;
  source: {
    id: string;
    title: string;
    author: string | null;
  } | null;
};

type RelationshipRow = {
  source_id: string;
  target_id: string;
  type: string;
  weight: number | null;
  relationship_type: { slug?: string; label?: string } | null;
  source_entity: { id: string; name: string; category: string | null } | null;
  target_entity: { id: string; name: string; category: string | null } | null;
};

type Passage = {
  text_id: string;
  text_title: string;
  text_author: string | null;
  excerpt: string;
};

type ExternalPassage = {
  title: string;
  // Free-form source attribution from the snippet header ("Cunningham's
  // Encyclopedia of Crystal, Gem & Metal Magic," "Starhawk, Spiral Dance,"
  // etc.). Used to tell the LLM the source genre — never written to the
  // narrative output verbatim.
  source: string | null;
  // Optional genre hint to keep voice honest ("contemporary Wiccan
  // synthesis," "modern crystal-magic tradition," "Yoruba diaspora
  // practice"). Defaults to whatever the snippet's source line says.
  genre: string | null;
  content: string;
};

type NarrativeOutput = { narrative: string };

const BANNED_PHRASES = [
  // Self-references — never name the platform.
  'prismarium',
  'project parallax',
  'digital grimoire',
  'convergence engine',
  // Stealth-adverb family. User-flagged AI tic.
  'quietly devastating',
  'quietly revising',
  'quietly subverting',
  'quietly dismantling',
  'subtly profound',
  'subtly inverting',
  'subtly transforming',
  'deeply consequential',
  'deeply unsettling',
  'carefully dismantling',
  'patiently undoing',
  // Qwen-flavored opener tics observed in the bake-off. The model defaults
  // to "X appears in [the tradition / sacred texts / esoteric traditions]
  // not as a mere [Y] but as..." for almost every entity. Banning the
  // "not as a mere / literal / passive / merely" frame breaks that whole
  // pattern.
  'not as a mere',
  'not as a literal',
  'not as a passive',
  'not as merely',
  'not as mere ',
  'not merely a',
  // The library is multi-disciplinary (psychology, anthropology, natural
  // science, philosophy, comparative religion, sacred texts). Defaulting
  // to a "sacred" framing flattens Freud, Darwin, Frazer, James, Jung,
  // Tylor etc. into a single devotional voice they don't actually share.
  // Ban the standard openers that do this.
  'in sacred vision',
  'in sacred imagery',
  'in sacred landscapes',
  'in sacred texts',
  'in sacred and symbolic',
  'in sacred contexts',
  'in sacred and ritual',
  'across sacred traditions',
  'in the sacred imagination',
  // The "X appears in [a generic tradition]" tic — Qwen keeps using these
  // as opener templates. The prompt forbids them but the model leaks them
  // through; the validator needs teeth so a retry kicks in.
  'appears in the tradition',
  'appears across traditions',
  'appears across the traditions',
  'appears in this tradition',
  'appears in esoteric traditions',
  'appears in the corpus',
  'appears in symbolic',
  'in the tradition tracked here',
  'the tradition tracked here',
];

const SYSTEM_RULES_CORPUS = `You are writing a short NARRATIVE SUMMARY for an entity in a correspondence-graph dossier (esoteric / sacred-texts library).

WHAT THE NARRATIVE IS NOT
The dossier already renders the entity's structured associations as visible chips below your narrative: aliases, lenses, graph connections (Ambition, Authority, Power, etc.), structured claims. A reader can see them at a glance. Your narrative MUST NOT restate those associations as a list. "X corresponds to A, B, C, and D" is exactly what the chips already do; writing that is wasted space.

WHAT THE NARRATIVE IS
A 4-6 sentence paragraph that does what a list of chips cannot. You MUST develop the framing before you pivot to use. A two-sentence frame-then-use rush is too thin — the user wants more body in the setup before "practitioners reach for it."

Structure the paragraph like this:
1. FRAME (2-3 sentences) — open with the entity's place in the tradition, an image or claim drawn from the corpus passages, a tension the tradition holds about it, or a synthesis of what the correspondences collectively point toward. Develop this. Give the reader something specific to hold onto before you tell them what to do with it. If you have corpus passages, lean on them here: name an image, a doctrine, a setting.
2. USE (1-2 sentences) — what work the practitioner reaches for it for. This is the pivot, not the whole paragraph.
3. TENSION OR REFINEMENT (1-2 sentences, optional) — what the tradition warns about, what the entity is paired with as counterweight, or what the corpus reveals about the limits of the structural picture.

You also have an optional move: POSITIONING in the system (card number, deity pairing, sphere on the Tree, etc.) when the passages support it.

The frame is the heaviest section. Do not under-develop it. Do not jump from the entity name to "practitioners reach for it" in two sentences.

GROUNDING — REQUIRED
You will be given PASSAGES from books in the library that mention this entity. The synthesis, use, caution, and positioning moves must reflect what those passages actually say. Do NOT invent claims the passages do not support. If the passages disagree, name the variance honestly rather than picking one.

DISTRIBUTE ATTENTION ACROSS PASSAGES
When multiple passages are provided, distribute attention across them. Do not lead the frame with a single source's imagery and then make only token reference to the others. If you have two or more passages, weave at least two sources into the framing. The reader should not come away thinking the entity is defined primarily by one text; the picture is built across the library.

THE LIBRARY IS MULTI-DISCIPLINARY — DO NOT FLATTEN IT INTO "SACRED"
The corpus draws from many different disciplines, each with its own voice and stance. When you weave a passage into the narrative, frame it according to what the source actually is, not as one undifferentiated "sacred tradition." For example:
- **Freud, James, Jung** are doing PSYCHOLOGY. A blue stone in a Freud dream is a clinical symbol of psychic tension, not a sacred object. Call it "Freud's dreamwork" or "in psychoanalytic reading," not "in sacred vision."
- **Frazer, Tylor, Boas** are doing ANTHROPOLOGY. They observe ritual practice from outside; they don't endorse it as sacred. "Frazer's comparative study," "in anthropological record," "Tylor catalogues."
- **Darwin** is doing NATURAL HISTORY. His orange grove is a biologist's observation, not a sacred landscape. "Darwin's naturalist record," "in tropical observation."
- **Plato, Schopenhauer, Nietzsche, Kant** are doing PHILOSOPHY. Their references are arguments, not devotional images.
- **Bhagavad-Gita, Upanishads, Lotus Sutra, Christian / Jewish / Islamic primary scripture** are doing SACRED TEXT. THIS is where "sacred" framing is appropriate.
- **Blavatsky, Hall, Waite, Mathers** are doing ESOTERIC SYNTHESIS — explicitly building a comparative spiritual system. Frame as "Theosophical comparative table" or "hermetic synthesis."

The narrative should reflect this disciplinary diversity. A reader should sense that the entity has been touched by psychology AND anthropology AND philosophy AND sacred text — not that all of these voices are saying the same devotional thing in the same register.

NEVER open the narrative by calling the corpus "sacred" by default. The library is broader than that.

EXTERNAL GROUNDING (when present)
You may sometimes receive an EXTERNAL GROUNDING block alongside library passages. Those snippets come from contemporary copyrighted sources (modern Wiccan practice, current crystal-magic vocabulary, Yoruba diaspora teaching, etc.) used as drafting context but not part of the public library. When you weave them:
- Frame them by their stated genre — "in the contemporary Wiccan synthesis," "in modern crystal-magic tradition," "in Yoruba diaspora practice," "in Jung-adjacent contemporary archetype work." Never frame modern syncretic material as ancient or canonical lineage.
- Do not quote them verbatim. Synthesize.
- Hold them at the SAME level of authority as library passages for narrative purposes, but signal in your prose that they are contemporary / modern — distinct from the older anthropological, psychological, philosophical, or sacred-text voices in the library.

The structured associations are given to you as CONTEXT for synthesis, not as material to restate.

LENGTH
4-6 sentences. Aim for 110-180 words. A developed paragraph, not an essay.

VOICE
- Plain declarative sentences. Active verbs.
- No back-cover language ("essential", "must-read", "valuable").
- No literary flourishes. Specifically avoid:
  * Stealth-adverb pairs: "quietly devastating", "subtly inverting", "carefully dismantling", "deeply consequential". If a verb needs an adverb to feel important, pick a stronger verb.
  * Em-dashes as rhetorical pauses. Use commas, periods, or colons.
- Do NOT name the platform (Prismarium, Project Parallax, Digital Grimoire, Convergence).
- Do NOT cite passages inline ("as Source X says"). Provenance lives on the structured claims, not in the narrative voice.
- Do NOT enumerate correspondences ("X corresponds to A, B, C..."). The chips do that.
- Do NOT open the narrative with template structural framings. Specifically forbidden openers:
  * "<Entity> clusters around...", "<Entity> consolidates around...", "<Entity> gathers around..."
  * "The connections cluster around..."
  * "<Entity> appears in [the tradition / sacred texts / esoteric traditions / the corpus] as / not as..."
  * "<Entity> appears across traditions..."
  * "<Entity> stands at the intersection of..."
  * Any "<Entity> appears in/across..." opener. These read as a single house style and make every narrative sound the same.
  Find a different entry each time: lead with the practitioner's use, with a specific image or claim from the corpus, with a tradition's stance, with a tension or counterweight, with a named source's framing — anything but the templates above.

ACCURACY
- If the passages do not actually discuss this entity in depth, write a shorter narrative rather than padding it.
- Do not invent etymology, history, or attributions that are not in the passages.

OUTPUT JSON
{ "narrative": "<4-6 sentences, plain prose, no headings, no bullets, no chip-restatement, frame developed before use>" }

JSON ESCAPING — REQUIRED
The "narrative" value is a single JSON string. Internal quotes MUST be escaped as \\". Do not emit raw newlines, tabs, or unescaped quotes. Do not wrap the JSON in markdown fences.

BANNED PHRASES (do not use):
${BANNED_PHRASES.map((p) => `  - "${p}"`).join('\n')}

Return exactly one JSON object. No markdown fences. No commentary.`;

const SYSTEM_RULES_STRUCTURED = `You are writing a short NARRATIVE SUMMARY for an entity in a correspondence-graph dossier (esoteric / sacred-texts library).

WHAT THE NARRATIVE IS NOT
The dossier renders the entity's structured associations as chips below your narrative: aliases, lenses, graph connections, claims. The reader sees them at a glance. Your narrative MUST NOT restate those associations as a list. "X corresponds to A, B, C, and D" duplicates the chips and wastes the space.

WHAT THE NARRATIVE IS
A 4-6 sentence paragraph that does what a list of chips cannot. You MUST develop the framing before you pivot to use. A two-sentence frame-then-use rush is too thin.

Structure the paragraph like this:
1. FRAME (2-3 sentences) — open with a synthesis of what the correspondences collectively point toward, or with a tension the tradition holds about the entity. Develop this with specific evidence from the structural picture: what kinds of correspondences cluster here, what category of work the entity sits at the center of, what counterweights or tensions are visible in the connection types. Give the reader something to hold onto before you tell them what to do with it.
2. USE (1-2 sentences) — what work the practitioner reaches for the entity for, in the tradition this graph tracks.
3. TENSION OR LINEAGE NOTE (1-2 sentences, optional) — a counterweight the tradition pairs it with, or a soft note about which tradition is doing the talking when the provenance signal is one-sided.

The frame is the heaviest section. Do not under-develop it. Do not jump from the entity name to "practitioners reach for it" in two sentences.

NO CORPUS — WORK FROM STRUCTURE ONLY
We did not find passages in the library that discuss this entity directly, so you are working from name, aliases, lenses, and graph connections only.

This means your synthesis and use moves must be cautious and structural: you can name a pattern visible in the connections themselves ("the connections cluster around X"), but you must NOT invent specific historical claims, attributions, dates, or text-sourced quotes you cannot derive from the structure. If you cannot make TWO of the moves honestly from structure alone, make ONE well and stop. Padding is worse than brevity.

When the structural picture is too thin to support any of the three moves, write a single honest sentence about what the connections collectively suggest and stop there. Do not invent.

PROVENANCE SIGNAL (use as a hint, NOT as a citation)
You will be given a list of sources that contributed claims about this entity, with a claim count per source.

USING THE SIGNAL
- If ONE source dominates (≥60% of the claims), name the lineage specifically: "the contemporary correspondence-dictionary tradition," "Cunningham-style modern correspondence work," "the Theosophical synthesis," "the Frazerian comparative-mythology framing," whichever fits. This gives the reader something real to anchor "the tradition" to.
- If sources are spread across multiple traditions or thin overall, describe the STRUCTURAL PICTURE DIRECTLY (what the connections themselves point toward) instead of invoking an imagined unified tradition. The graph's shape is the evidence; let it speak.

"THE TRADITION" IS NOT FILLER — DO NOT USE IT TO POINT AT NOTHING
Phrases like "the tradition tracked here," "this tradition," "the tradition treats X as..." only earn their place when you can actually point at a specific lineage. When you cannot, they read as hollow placeholders and dilute the narrative.
- BAD (with no sourced claims): "The Horse appears in the tradition as a carrier of forces..."
- GOOD (no sourced claims, structural picture): "The horse's connections cluster around movement and threshold-crossing — abundance and travel on one side, the astral plane and emotional volatility on the other. The shape of the graph treats it as a vehicle, not a station."
- GOOD (one source dominates): "In the contemporary Western correspondence-dictionary lineage that shapes this picture, the horse stands for momentum..."

You MUST NOT:
- Quote, paraphrase, or cite any of these sources directly. You have not been given their text.
- Pretend the listed claims came verbatim from these sources in specific phrasings.
- Name a source in the narrative voice ("according to Cunningham..."). Provenance lives on the chips, not in the prose.

EXTERNAL GROUNDING (when present)
You may sometimes receive an EXTERNAL GROUNDING block. Those snippets come from contemporary copyrighted sources (modern Wiccan practice, current crystal-magic vocabulary, Yoruba diaspora teaching, etc.) used as drafting context but NOT part of the public library. When you have external snippets:
- Treat them as your primary grounding (you have their actual text, unlike the library provenance which is name-only here).
- Frame them by their stated genre — "in the contemporary Wiccan synthesis," "in modern crystal-magic tradition," "in Yoruba diaspora practice," "in Jung-adjacent contemporary archetype work." Never frame modern syncretic material as ancient or canonical lineage.
- Do not quote verbatim. Synthesize original prose.
- "The tradition" can still be used IF the external snippets are clearly from a single named modern tradition — name that tradition.

LENGTH
4-6 sentences. Aim for 110-180 words. Shorter is acceptable only when the structural picture genuinely cannot support a developed frame; do not pad with vague generalities, but also do not skip the frame to make the use sentence the bulk of the paragraph.

VOICE
- Plain declarative sentences. Active verbs.
- No back-cover language. No literary flourishes.
- No stealth-adverb pairs.
- Em-dashes are not rhetorical pauses; use commas, periods, or colons.
- Do NOT name the platform (Prismarium, Project Parallax, Digital Grimoire, Convergence).
- Do NOT enumerate correspondences ("X corresponds to A, B, C..."). The chips do that.
- Do NOT open the narrative with template structural framings. Specifically forbidden openers:
  * "<Entity> clusters around...", "<Entity> consolidates around...", "<Entity> gathers around..."
  * "The connections cluster around..."
  * "<Entity> appears in [the tradition / sacred texts / esoteric traditions / the corpus] as / not as..."
  * "<Entity> appears across traditions..."
  * "<Entity> stands at the intersection of..."
  * Any "<Entity> appears in/across..." opener. These read as a single house style and make every narrative sound the same.
  Find a different entry each time: lead with the practitioner's use, with a specific image or claim from the corpus, with a tradition's stance, with a tension or counterweight, with a named source's framing — anything but the templates above.

OUTPUT JSON
{ "narrative": "<4-6 sentences, plain prose, no headings, no bullets, no chip-restatement, frame developed before use>" }

JSON ESCAPING — REQUIRED
The "narrative" value is a single JSON string. Internal quotes MUST be escaped as \\". Do not emit raw newlines, tabs, or unescaped quotes. Do not wrap the JSON in markdown fences.

BANNED PHRASES (do not use):
${BANNED_PHRASES.map((p) => `  - "${p}"`).join('\n')}

Return exactly one JSON object. No markdown fences. No commentary.`;

function parseArgs(argv: string[]): Args {
  const out: Args = {
    limit: null,
    entitySlug: null,
    category: null,
    dryRun: false,
    overwriteDrafts: false,
    reviewFile: null,
    provider: 'anthropic',
    model: null,
    rpm: null,
    db: 'staging',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--overwrite-drafts') out.overwriteDrafts = true;
    else if (a === '--limit') {
      out.limit = Number(argv[i + 1]);
      i += 1;
    } else if (a === '--entity-slug') {
      out.entitySlug = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--category') {
      out.category = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--review-file') {
      out.reviewFile = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--provider') {
      const v = (argv[i + 1] ?? '').toLowerCase();
      if (v !== 'anthropic' && v !== 'openrouter') {
        throw new Error(`--provider must be 'anthropic' or 'openrouter', got: ${v}`);
      }
      out.provider = v;
      i += 1;
    } else if (a === '--model') {
      out.model = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--rpm') {
      out.rpm = Number(argv[i + 1]);
      i += 1;
    } else if (a === '--db') {
      const v = (argv[i + 1] ?? '').toLowerCase();
      if (v !== 'staging' && v !== 'prod') {
        throw new Error(`--db must be 'staging' or 'prod', got: ${v}`);
      }
      out.db = v;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(`Draft narrative summaries for correspondence entities.

Flags:
  --limit <n>             Stop after N entities (use 3 for the pilot)
  --entity-slug <slug>    Draft a single entity
  --category <name>       Only consider one category (e.g. tarot)
  --dry-run               Print to console, do not write
  --overwrite-drafts      Re-draft even if a draft already exists
  --review-file <path>    Also write a markdown file with all drafts for review
  --provider <name>       'anthropic' (default, paid) or 'openrouter' (free models)
  --model <id>            Override model id (default: ${CLAUDE_MODEL} for anthropic,
                          ${OPENROUTER_MODEL} for openrouter)
  --rpm <n>               Self-pace requests at most N per minute.
                          OpenRouter free tier defaults to 15 if not set;
                          Anthropic defaults to unlimited.
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function createService(db: 'staging' | 'prod' = 'staging'): SupabaseClient {
  const url = db === 'prod' ? process.env.PROD_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = db === 'prod' ? process.env.PROD_SUPABASE_SERVICE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`Missing Supabase env for ${db} in app/.env.local`);
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function pickEntities(supabase: SupabaseClient, args: Args): Promise<EntityRow[]> {
  let query = supabase
    .from('correspondences')
    .select('id, slug, name, category, aliases, description, lenses, narrative_status')
    .eq('narrative_status', 'missing');

  if (args.entitySlug) query = query.eq('slug', args.entitySlug);
  if (args.category) query = query.eq('category', args.category);

  // For the pilot we want high-signal entities first. Connection count gives
  // us that without a custom RPC: pull a generous candidate set, count edges
  // per entity in JS, and take the top N.
  const candidateCap = args.limit ? Math.max(args.limit * 20, 60) : 200;
  const { data, error } = await query.limit(candidateCap);
  if (error) throw new Error(`pickEntities: ${error.message}`);
  const candidates = (data ?? []) as EntityRow[];
  if (candidates.length === 0) return [];

  // Batch the edge query so we don't blow PostgREST's URL length limit.
  // 200 candidate UUIDs × 36 chars × 2 columns easily passes ~14KB, well
  // over PostgREST's typical ~8KB cap, and Node surfaces that as a fetch
  // failure rather than a clean error. 60 ids per batch keeps each URL
  // safely under the line.
  const ids = candidates.map((c) => c.id);
  const ID_BATCH = 60;
  const degree = new Map<string, number>();
  for (let i = 0; i < ids.length; i += ID_BATCH) {
    const slice = ids.slice(i, i + ID_BATCH);
    const { data: edges, error: edgeError } = await supabase
      .from('correspondence_relationships')
      .select('source_id, target_id')
      .or(`source_id.in.(${slice.join(',')}),target_id.in.(${slice.join(',')})`);
    if (edgeError) throw new Error(`pickEntities edges batch ${i}: ${edgeError.message}`);
    for (const e of edges ?? []) {
      degree.set(e.source_id, (degree.get(e.source_id) ?? 0) + 1);
      degree.set(e.target_id, (degree.get(e.target_id) ?? 0) + 1);
    }
  }

  const sorted = candidates
    .map((c) => ({ entity: c, edges: degree.get(c.id) ?? 0 }))
    .sort((a, b) => b.edges - a.edges || a.entity.name.localeCompare(b.entity.name))
    .map((x) => x.entity);

  return args.limit ? sorted.slice(0, args.limit) : sorted;
}

async function fetchEntityContext(
  supabase: SupabaseClient,
  entity: EntityRow,
): Promise<{ claims: ClaimRow[]; relationships: RelationshipRow[] }> {
  const [claimsRes, relsRes] = await Promise.all([
    supabase
      .from('knowledge_claims')
      .select('field_key, field_value, source:knowledge_sources(id, title, author)')
      .eq('entity_type', 'correspondence')
      .eq('entity_id', entity.id),
    supabase
      .from('correspondence_relationships')
      .select(
        'source_id, target_id, type, weight, relationship_type:correspondence_relationship_types(slug, label), source_entity:correspondences!correspondence_relationships_source_id_fkey(id, name, category), target_entity:correspondences!correspondence_relationships_target_id_fkey(id, name, category)',
      )
      .or(`source_id.eq.${entity.id},target_id.eq.${entity.id}`)
      .order('weight', { ascending: false })
      .limit(30),
  ]);

  if (claimsRes.error) throw new Error(`claims: ${claimsRes.error.message}`);
  if (relsRes.error) throw new Error(`relationships: ${relsRes.error.message}`);

  return {
    claims: (claimsRes.data ?? []) as unknown as ClaimRow[],
    relationships: (relsRes.data ?? []) as unknown as RelationshipRow[],
  };
}

function buildSearchPhrases(entity: EntityRow): string[] {
  const phrases = new Set<string>();
  const add = (value?: string | null) => {
    if (!value) return;
    const trimmed = value.trim();
    if (trimmed.length >= 3) phrases.add(trimmed);
  };
  add(entity.name);
  for (const alias of entity.aliases ?? []) add(alias);
  return Array.from(phrases);
}

function isSubstantivePassage(content: string, phrase: string): boolean {
  // A chunk counts as a real "passage" about the entity only when:
  //   1. The chunk is long enough that it's narrative prose, not a list or
  //      a heading-laden index page.
  //   2. The entity mention has real text on at least one side of it. A
  //      mention sitting alone in a comma-separated correspondence list
  //      ("Black, Saturn, North, ...") gives the model nothing to draw on.
  if (!content || content.length < MIN_CHUNK_LEN_FOR_SUBSTANCE) return false;
  const idx = content.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return false;
  const before = content.slice(0, idx).trim();
  const after = content.slice(idx + phrase.length).trim();
  if (before.length < MIN_CONTEXT_AROUND_MENTION && after.length < MIN_CONTEXT_AROUND_MENTION) {
    return false;
  }
  // Heuristic: if the chunk is dominated by short comma-separated tokens
  // (correspondence-list pages), the mention is structural rather than
  // substantive. We approximate with a per-line word count check on the
  // ten lines surrounding the mention.
  const window = content.slice(Math.max(0, idx - 400), Math.min(content.length, idx + 400));
  const lines = window.split(/\n+/).filter((l) => l.trim().length > 0);
  if (lines.length >= 4) {
    const shortLines = lines.filter((l) => l.trim().split(/\s+/).length <= 4).length;
    if (shortLines / lines.length > 0.6) return false;
  }
  return true;
}

function excerptAround(content: string, phrase: string, radius = 280): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(phrase.toLowerCase());
  if (idx === -1) return content.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + phrase.length + radius);
  const prefix = start > 0 ? '… ' : '';
  const suffix = end < content.length ? ' …' : '';
  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
}

// ─── External passages ────────────────────────────────────────────────────
// Per-category drafting-only context from copyrighted modern sources. We
// read these from disk at draft time, never store them in the DB, never
// include them in git. The narrative output is original prose synthesis;
// these snippets only steer the LLM's framing for category gaps that the
// public-domain library doesn't cover (Wiccan Sabbats, modern crystal
// magic, contemporary archetype work, Yoruba practice, etc.).

// Cache parsed files so repeated entities in the same category don't
// re-read disk.
const externalPassagesCache = new Map<string, ExternalPassage[]>();

function parseExternalPassagesFile(raw: string): ExternalPassage[] {
  // Format:
  //   ## <Title> — <Source attribution>
  //   genre: <optional one-line genre hint>
  //   <free-form body until the next ## or end of file>
  //
  // The "— <Source>" tail on the header is optional. The "genre:" line is
  // optional. Body is everything else under the header.
  const snippets: ExternalPassage[] = [];
  const lines = raw.split('\n');
  let current: ExternalPassage | null = null;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('## ')) {
      if (current && current.content.trim().length > 0) snippets.push(current);
      const header = line.slice(3).trim();
      // Support both em-dash and hyphen separators on the header.
      const dashMatch = header.match(/^(.*?)\s+[—–-]\s+(.+)$/);
      if (dashMatch) {
        current = { title: dashMatch[1].trim(), source: dashMatch[2].trim(), genre: null, content: '' };
      } else {
        current = { title: header, source: null, genre: null, content: '' };
      }
    } else if (current) {
      // Don't fold higher-level headers (e.g., `# Category` at the top)
      // into body content; just skip them.
      if (line.startsWith('# ')) continue;
      const genreMatch = line.match(/^genre:\s*(.+)$/i);
      if (genreMatch && current.content.trim().length === 0) {
        current.genre = genreMatch[1].trim();
        continue;
      }
      current.content += line + '\n';
    }
  }
  if (current && current.content.trim().length > 0) snippets.push(current);
  return snippets.map((s) => ({ ...s, content: s.content.trim() }));
}

function loadExternalPassagesForCategory(category: string): ExternalPassage[] {
  if (externalPassagesCache.has(category)) {
    return externalPassagesCache.get(category)!;
  }
  const filePath = path.join(EXTERNAL_PASSAGES_DIR, `${category}.md`);
  let snippets: ExternalPassage[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      snippets = parseExternalPassagesFile(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`    ⚠️ failed to read external-passages/${category}.md: ${msg}`);
    }
  }
  externalPassagesCache.set(category, snippets);
  return snippets;
}

function externalPassagesForEntity(entity: EntityRow): ExternalPassage[] {
  const all = loadExternalPassagesForCategory(entity.category);
  if (all.length === 0) return [];
  const phrases = [entity.name, ...(entity.aliases ?? [])]
    .map((p) => (p ?? '').trim().toLowerCase())
    .filter((p) => p.length >= 3);
  // Score each snippet by how many of the entity's phrases appear in its
  // title or body. Snippets that match nothing are skipped — we don't want
  // unrelated Sabbat material grounding a Wiccan deity entity if the
  // snippet doesn't actually discuss them.
  const scored = all
    .map((s) => {
      const haystack = (s.title + '\n' + s.content).toLowerCase();
      const hits = phrases.reduce((n, p) => n + (haystack.includes(p) ? 1 : 0), 0);
      return { snippet: s, hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, EXTERNAL_PASSAGES_PER_ENTITY)
    .map((x) => x.snippet);
  return scored;
}

async function findPassages(
  supabase: SupabaseClient,
  entity: EntityRow,
  verbose = true,
): Promise<Passage[]> {
  const phrases = buildSearchPhrases(entity);
  if (phrases.length === 0) {
    if (verbose) console.log(`    🔎 no search phrases (entity has no name/aliases?)`);
    return [];
  }

  const byTextId = new Map<string, Passage>();
  for (const phrase of phrases) {
    // Strategy 1: Postgres FTS via Supabase.textSearch — handles stemming and
    // is the cheapest path when text_chunks has a tsvector index. Multi-word
    // phrases are ANDed together which can miss matches; we fall back to
    // ILIKE below when FTS comes up empty.
    let hits = 0;
    let usedFallback = false;
    const ftsRes = await supabase
      .from('text_chunks')
      .select('text_id, content, texts:text_id(title, author)')
      .textSearch('content', phrase, { type: 'plain', config: 'english' })
      .limit(CORPUS_PASSAGE_LIMIT * 2);

    let rows = ftsRes.data ?? [];
    if (ftsRes.error) {
      if (verbose) console.warn(`    ⚠️ FTS for "${phrase}" failed: ${ftsRes.error.message}`);
    } else {
      hits = rows.length;
    }

    // Strategy 2 (fallback): substring search. Slower at scale but tells us
    // honestly whether the corpus contains the literal phrase. If FTS
    // returned nothing, this is the diagnostic check.
    if (rows.length === 0) {
      const ilikeRes = await supabase
        .from('text_chunks')
        .select('text_id, content, texts:text_id(title, author)')
        .ilike('content', `%${phrase}%`)
        .limit(CORPUS_PASSAGE_LIMIT * 2);
      if (ilikeRes.error) {
        if (verbose) console.warn(`    ⚠️ ILIKE for "${phrase}" failed: ${ilikeRes.error.message}`);
      } else if (ilikeRes.data && ilikeRes.data.length > 0) {
        rows = ilikeRes.data;
        usedFallback = true;
      }
    }

    // Filter out passing-reference matches: chunks that are too short, or
    // where the entity name appears in a list / heading rather than in
    // substantive prose. This is the difference between "Frazer discusses
    // black at length" and "black appears in a correspondence index."
    const substantiveRows = (rows as any[]).filter((r) =>
      isSubstantivePassage(r.content ?? '', phrase),
    );

    if (verbose) {
      const tag = usedFallback ? ' (ILIKE fallback)' : '';
      console.log(
        `    🔎 "${phrase}": fts=${hits}, kept=${substantiveRows.length}/${rows.length}${tag}`,
      );
    }

    for (const row of substantiveRows) {
      if (byTextId.has(row.text_id)) continue;
      byTextId.set(row.text_id, {
        text_id: row.text_id,
        text_title: row.texts?.title ?? '(untitled)',
        text_author: row.texts?.author ?? null,
        excerpt: excerptAround(row.content ?? '', phrase),
      });
      if (byTextId.size >= CORPUS_PASSAGE_LIMIT) break;
    }
    if (byTextId.size >= CORPUS_PASSAGE_LIMIT) break;
  }

  // One-time sanity check: if we got zero across all phrases, confirm the
  // table actually has rows. Useful for catching empty-corpus environments.
  if (byTextId.size === 0 && verbose) {
    const { count, error } = await supabase
      .from('text_chunks')
      .select('id', { count: 'exact', head: true });
    if (error) {
      console.log(`    🔎 text_chunks count check failed: ${error.message}`);
    } else {
      console.log(`    🔎 0 matches; text_chunks total rows = ${count ?? 'unknown'}`);
    }
  }

  return Array.from(byTextId.values());
}

function summarizeRelationships(entity: EntityRow, rels: RelationshipRow[]): string {
  const groups = new Map<string, string[]>();
  for (const r of rels) {
    const label = r.relationship_type?.label || r.type;
    const other =
      r.source_id === entity.id ? r.target_entity?.name : r.source_entity?.name;
    if (!other) continue;
    const bucket = groups.get(label) ?? [];
    if (!bucket.includes(other)) bucket.push(other);
    groups.set(label, bucket);
  }
  if (groups.size === 0) return '(no graph connections)';
  return Array.from(groups.entries())
    .map(([label, names]) => `  - ${label}: ${names.slice(0, 8).join(', ')}${names.length > 8 ? `, +${names.length - 8} more` : ''}`)
    .join('\n');
}

function summarizeSources(claims: ClaimRow[]): string {
  // Group claims by source so the model sees which books discuss this entity
  // and how heavily. This is a stand-in for actual passages when text_chunks
  // is empty: it does NOT give the model the source's voice, but it tells it
  // which tradition or author is doing most of the talking about this entity.
  const bySource = new Map<string, { title: string; author: string | null; claimCount: number }>();
  for (const c of claims) {
    if (!c.source?.id) continue;
    const existing = bySource.get(c.source.id) ?? {
      title: c.source.title,
      author: c.source.author,
      claimCount: 0,
    };
    existing.claimCount += 1;
    bySource.set(c.source.id, existing);
  }
  if (bySource.size === 0) return '(no sourced claims)';
  return Array.from(bySource.values())
    .sort((a, b) => b.claimCount - a.claimCount)
    .slice(0, 6)
    .map((s) => `  - ${s.title}${s.author ? ` (${s.author})` : ''} — ${s.claimCount} claim(s)`)
    .join('\n');
}

function summarizeClaims(claims: ClaimRow[]): string {
  if (claims.length === 0) return '(no claims)';
  const byKey = new Map<string, string[]>();
  for (const c of claims) {
    if (!c.field_value) continue;
    const bucket = byKey.get(c.field_key) ?? [];
    bucket.push(c.field_value);
    byKey.set(c.field_key, bucket);
  }
  return Array.from(byKey.entries())
    .slice(0, 12)
    .map(([k, vs]) => `  - ${k}: ${vs.slice(0, 6).join('; ')}`)
    .join('\n');
}

function renderExternalBlock(snippets: ExternalPassage[]): string {
  if (snippets.length === 0) return '';
  const body = snippets
    .map((s, i) => {
      const header = [s.title, s.source].filter(Boolean).join(' — ');
      const genreLine = s.genre ? `\n(genre: ${s.genre})` : '';
      return `[E${i + 1}] ${header}${genreLine}\n${s.content}`;
    })
    .join('\n\n');
  return `

EXTERNAL GROUNDING (drafting-only context — NOT part of the library, NOT to be quoted verbatim)
These snippets are from contemporary copyrighted sources we use as drafting context but DO NOT redistribute. Treat them the same way you treat library passages — read them, synthesize, weave the picture they sketch into your prose. But frame them according to the genre/source noted in each header (e.g. "in the contemporary Wiccan synthesis," "in modern crystal-magic tradition," "in Yoruba diaspora practice"), NEVER as ancient or canonical lineage. The narrative output is original synthesis, not quotation.

${body}`;
}

function buildCorpusPrompt(
  entity: EntityRow,
  passages: Passage[],
  claims: ClaimRow[],
  rels: RelationshipRow[],
  external: ExternalPassage[],
): string {
  const passageBlock = passages
    .map(
      (p, i) =>
        `[${i + 1}] ${p.text_title}${p.text_author ? ` — ${p.text_author}` : ''}\n${p.excerpt}`,
    )
    .join('\n\n');

  return `ENTITY
- name: ${entity.name}
- category: ${entity.category}
- aliases: ${(entity.aliases ?? []).join(', ') || '(none)'}
- lenses: ${(entity.lenses ?? []).join(', ') || '(none)'}

STRUCTURED CLAIMS (from the library, may be sparse)
${summarizeClaims(claims)}

TOP GRAPH CONNECTIONS
${summarizeRelationships(entity, rels)}

PASSAGES FROM THE LIBRARY (the authority — your narrative must reflect these)
${passageBlock}${renderExternalBlock(external)}

Return the JSON object now.`;
}

function buildStructuredPrompt(
  entity: EntityRow,
  claims: ClaimRow[],
  rels: RelationshipRow[],
  external: ExternalPassage[],
): string {
  return `ENTITY
- name: ${entity.name}
- category: ${entity.category}
- aliases: ${(entity.aliases ?? []).join(', ') || '(none)'}
- lenses: ${(entity.lenses ?? []).join(', ') || '(none)'}

STRUCTURED CLAIMS
${summarizeClaims(claims)}

SOURCES THAT MAKE THESE CLAIMS (provenance only — you do NOT have the source text)
${summarizeSources(claims)}

GRAPH CONNECTIONS
${summarizeRelationships(entity, rels)}${renderExternalBlock(external)}

We did NOT find passages in the library that discuss this entity directly. ${external.length > 0 ? 'Use the EXTERNAL GROUNDING block above plus the structure above.' : 'Work from the structure above.'} Return the JSON object now.`;
}

function validate(output: NarrativeOutput): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  const n = output.narrative;
  if (typeof n !== 'string' || n.trim().length === 0) {
    reasons.push('narrative missing or empty');
  } else {
    const len = n.length;
    if (len < MIN_NARRATIVE_LEN) reasons.push(`narrative too short (${len} < ${MIN_NARRATIVE_LEN})`);
    if (len > MAX_NARRATIVE_LEN) reasons.push(`narrative too long (${len} > ${MAX_NARRATIVE_LEN})`);
    const lower = n.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase)) reasons.push(`banned phrase: "${phrase}"`);
    }
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

async function draftOne(
  entity: EntityRow,
  passages: Passage[],
  claims: ClaimRow[],
  rels: RelationshipRow[],
  external: ExternalPassage[],
  cfg: LLMConfig,
): Promise<{ output: NarrativeOutput; source: 'corpus' | 'structured' }> {
  // External passages do NOT change path selection — the library remains
  // the authoritative spine. They're injected into whichever prompt we
  // pick. This keeps the corpus/structured label honest about what the
  // public-domain library says vs. what supplementary modern grounding
  // adds.
  const useCorpus = passages.length >= MIN_CORPUS_PASSAGES;
  const system = useCorpus ? SYSTEM_RULES_CORPUS : SYSTEM_RULES_STRUCTURED;
  const user = useCorpus
    ? buildCorpusPrompt(entity, passages, claims, rels, external)
    : buildStructuredPrompt(entity, claims, rels, external);

  const text = await callLLM(cfg, system, user);
  const parsed = parseAiJsonObject<NarrativeOutput>(text);
  return { output: parsed, source: useCorpus ? 'corpus' : 'structured' };
}

type ReviewRecord = {
  entity: EntityRow;
  passageCount: number;
  source: 'corpus' | 'structured';
  narrative: string;
  passages: Passage[];
};

function renderReviewMarkdown(records: ReviewRecord[]): string {
  const lines: string[] = [];
  lines.push('# Narrative Drafts — Pilot');
  lines.push('');
  lines.push('Review each draft below. To approve, copy the narrative into `description`');
  lines.push('and set `narrative_status = \'approved\'` on the corresponding row.');
  lines.push('');
  for (const r of records) {
    lines.push(`## ${r.entity.name} _(${r.entity.category})_`);
    lines.push('');
    lines.push(`- slug: \`${r.entity.slug}\``);
    lines.push(`- drafting path: **${r.source}** (passages found: ${r.passageCount})`);
    if (r.entity.aliases && r.entity.aliases.length > 0) {
      lines.push(`- aliases: ${r.entity.aliases.join(', ')}`);
    }
    if (r.entity.lenses && r.entity.lenses.length > 0) {
      lines.push(`- lenses: ${r.entity.lenses.join(', ')}`);
    }
    lines.push('');
    lines.push('### Draft narrative');
    lines.push('');
    lines.push('> ' + r.narrative.replace(/\n+/g, ' '));
    lines.push('');
    if (r.passages.length > 0) {
      lines.push('### Passages used');
      lines.push('');
      for (const p of r.passages) {
        lines.push(`- **${p.text_title}**${p.text_author ? ` — ${p.text_author}` : ''}`);
        lines.push(`  > ${p.excerpt.replace(/\n+/g, ' ')}`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService(args.db);
  console.log(`DB: ${args.db}`);

  // Build the right LLM client based on --provider.
  let cfg: LLMConfig;
  if (args.provider === 'openrouter') {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not set in app/.env.local');
    }
    cfg = {
      provider: 'openrouter',
      client: new OpenAI({
        baseURL: OPENROUTER_BASE_URL,
        apiKey,
        // OpenRouter uses these headers for dashboard attribution + routing
        // policies. Optional but recommended.
        defaultHeaders: {
          'X-Title': OPENROUTER_APP_TITLE,
        },
      }),
      model: args.model ?? OPENROUTER_MODEL,
    };
  } else {
    cfg = {
      provider: 'anthropic',
      client: new Anthropic(),
      model: args.model ?? CLAUDE_MODEL,
    };
  }

  // Self-pace the request stream so we stay under the provider's RPM cap.
  // Anthropic has no practical cap for our volume so we default to no
  // pacing. OpenRouter free tier caps individual models around 15-20 RPM,
  // so we default to 15 (one request every 4 seconds) unless overridden.
  const effectiveRpm = args.rpm ?? (cfg.provider === 'openrouter' ? 15 : null);
  const interRequestMs = effectiveRpm ? Math.ceil(60_000 / effectiveRpm) : 0;

  console.log(
    `Draft entity narratives — provider: ${cfg.provider}, model: ${cfg.model}, dryRun: ${args.dryRun}` +
      (effectiveRpm ? `, rpm: ${effectiveRpm}` : ''),
  );

  const entities = await pickEntities(supabase, args);
  console.log(`Candidates: ${entities.length}`);
  if (entities.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const records: ReviewRecord[] = [];
  let ok = 0;
  let fail = 0;
  let lastRequestEndedAt = 0;

  for (const entity of entities) {
    console.log(`\n— ${entity.name} (${entity.category}, slug=${entity.slug})`);

    if (!args.overwriteDrafts && entity.narrative_status !== 'missing') {
      console.log(`  ⏭  skipped (status=${entity.narrative_status})`);
      continue;
    }

    // Honor the inter-request delay so we don't burst past the provider's
    // RPM cap. The wait is measured from the END of the previous request
    // so slow models naturally consume part of the budget.
    if (interRequestMs > 0 && lastRequestEndedAt > 0) {
      const elapsed = Date.now() - lastRequestEndedAt;
      const waitMs = interRequestMs - elapsed;
      if (waitMs > 0) await sleep(waitMs);
    }

    try {
      const { claims, relationships } = await fetchEntityContext(supabase, entity);
      const passages = await findPassages(supabase, entity);
      const external = externalPassagesForEntity(entity);
      console.log(
        `  passages: ${passages.length}, claims: ${claims.length}, edges: ${relationships.length}` +
          (external.length > 0 ? `, external: ${external.length}` : ''),
      );

      const { output, source } = await draftOne(
        entity,
        passages,
        claims,
        relationships,
        external,
        cfg,
      );
      lastRequestEndedAt = Date.now();

      const validation = validate(output);
      if (!validation.ok) {
        fail += 1;
        console.warn(`  ❌ validation: ${validation.reasons.join('; ')}`);
        console.log(`  raw:\n${output.narrative}`);
        continue;
      }

      ok += 1;
      console.log(`  ✅ path=${source} (${output.narrative.length} chars)`);
      console.log(`     ${output.narrative}`);

      records.push({
        entity,
        passageCount: passages.length,
        source,
        narrative: output.narrative,
        passages,
      });

      if (args.dryRun) continue;

      const { error: upsertError } = await supabase
        .from('correspondences')
        .update({
          narrative_draft: output.narrative,
          narrative_status: 'draft',
          narrative_source: source,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entity.id);
      if (upsertError) {
        fail += 1;
        ok -= 1;
        console.warn(`  ❌ DB update failed: ${upsertError.message}`);
      } else {
        console.log(`  💾 draft written (status=draft, source=${source})`);
      }
    } catch (err) {
      fail += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ❌ ${msg}`);
      // Reset the pacing clock so we don't double-wait after a hard failure
      // that already consumed time in retry backoffs.
      lastRequestEndedAt = Date.now();
    }
  }

  if (args.reviewFile && records.length > 0) {
    const filePath = path.resolve(process.cwd(), args.reviewFile);
    fs.writeFileSync(filePath, renderReviewMarkdown(records), 'utf8');
    console.log(`\n📝 Review file written: ${filePath}`);
  }

  console.log(`\n=========================================`);
  console.log(`Done. ok=${ok} fail=${fail} dryRun=${args.dryRun}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
