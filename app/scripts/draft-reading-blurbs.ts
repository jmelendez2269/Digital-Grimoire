/**
 * Draft per-reading "Reader's Digests" for course readings.
 *
 * A digest is a long-form (~600-1300 word) substitute for engaging with the
 * source. A seeker who reads ONLY the digest should be able to do most of
 * the week's coursework — the lens exercise, the synthesis prompt, the
 * micro-artifact. The digest also signals what got compressed and points
 * back to specific sections of the source for seekers who want more.
 *
 * Writes drafts to the `reading_blurbs` table (internal column names kept
 * as blurb_live / blurb_draft — see project memory) with status='draft_pending'.
 *
 * Companion to backfill-reading-ids.ts — that script must run first so each
 * reading has a stable reading_id slug.
 *
 * Usage:
 *   pnpm exec tsx scripts/draft-reading-blurbs.ts --course c06-the-hermetic-tradition --week 3 --dry-run
 *   pnpm exec tsx scripts/draft-reading-blurbs.ts --course c06-the-hermetic-tradition --week 3
 *   pnpm exec tsx scripts/draft-reading-blurbs.ts --reading-id c06-w3-lives-alchemystical-philosophers
 *   pnpm exec tsx scripts/draft-reading-blurbs.ts --course c06-the-hermetic-tradition         # all weeks
 *   pnpm exec tsx scripts/draft-reading-blurbs.ts --limit 5 --dry-run                          # smoke test
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseAiJsonObject } from '../src/lib/ai/json';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const CLAUDE_MODEL = process.env.READING_BLURB_MODEL || 'claude-sonnet-4-6';
const MIN_DIGEST_LEN = 3500;  // ~600 words
const MAX_DIGEST_LEN = 7500;  // ~1300 words

type Args = {
  course: string | null;
  week: number | null;
  readingId: string | null;
  limit: number | null;
  dryRun: boolean;
  overwriteDrafts: boolean;
};

type ReadingTier = { reference?: string; description?: string };
type Reading = {
  reading_id?: string;
  sort_order?: number;
  title?: string;
  author?: string;
  section?: string;
  selection_rationale?: string;
  tiers?: { keystone?: ReadingTier; passage?: ReadingTier; full?: ReadingTier };
};

type Week = {
  week_number?: number;
  title?: string;
  core_question?: string;
  key_tension?: string | { side_a?: string; side_b?: string; description?: string };
  lens_focus?: string[];
  readings?: Reading[];
};

type CourseContent = {
  course_id_tag?: string;
  premise?: string;
  core_question?: string;
  weeks?: Week[];
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  content: CourseContent | null;
};

type DigestOutput = { digest: string };

type DraftTask = {
  reading_id: string;
  course_slug: string;
  course_title: string;
  week_number: number;
  reading: Reading;
  weekContext: Week;
  courseContext: { title: string; premise: string; core_question: string };
};

const BANNED_PHRASES = [
  // Back-cover sludge.
  'essential reading',
  'must-read',
  'valuable resource',
  'valuable addition',
  'seminal',
  'cornerstone',
  'this text explores',
  'this book explores',
  'this reading explores',
  'this work explores',
  'foundational text',
  'foundational work',
  // Self-references — never name the platform. "Convergence" was previously
  // banned for the same reason but it is a generic English word that legitimate
  // prose uses ("traditions converge…"), so the brand-specific bans are scoped
  // narrowly to avoid false positives.
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
];

const SYSTEM_RULES = `You are writing a READER'S DIGEST for a course reading in a sacred-texts learning library.

WHAT A READER'S DIGEST IS
A student is taking a course. Each week has 2-4 assigned readings, a lens exercise that practices moving between perspectives, a synthesis prompt, and a micro-artifact the student produces. Some students will read the assigned source; some will not.

The Reader's Digest is for the second group. It is a substantive substitute for engaging with the reading — long enough and concrete enough that a student who reads only the digest can still do most of the week's coursework (the lens exercise, the synthesis prompt, the micro-artifact). It also points back to specific parts of the source for students who want more.

The digest is not a pitch. It is not a back-cover blurb. It is a teaching companion that hands the student enough substance from the reading to think with it.

WHAT THE DIGEST MUST DELIVER
The student should walk away knowing:
1. The argument or move the reading makes — stated plainly, with enough structure to paraphrase, not just a one-line claim.
2. The author's vocabulary — the specific terms, distinctions, and categories the student will need to recognize the author's framework. Define them as you use them.
3. The texture — at least two concrete moves the author makes (a case, an example, a comparison, a step in the argument). The kind of specifics a student can later refer to when answering the synthesis prompt.
4. The honest caveats — what is dated, contested, or limited in this reading. Don't oversell.
5. How this touches the week — one or two sentences (not the closer) that connect the reading to the week's core question and key tension.
6. A closing pointer back to the source — name 2-3 specific parts of the assigned source (chapters, sections, the keystone passage, the cataloged figures) that would reward reading directly. Be honest about what the digest can't carry: "the actual texture of X is in chapter Y", "the case-by-case detail of Z lives in the source, not here".

SHAPE — flowing prose, 4-6 paragraphs
Roughly in this order, but do not use headings or bullet lists:
- Open with the argument or the move, stated plainly.
- Build out the author's framework: vocabulary, distinctions, key concepts.
- Walk through the texture — two or three concrete moves.
- Caveat paragraph or sentence: dated, limited, contested.
- Connection to the week's question and tension.
- Close: "If you want more from the source itself, ..." naming specific parts.

LENGTH
600-1300 words. Aim for ~850. Long enough to do real teaching; tight enough that nothing in it is filler.

VOICE
- Plain declarative sentences. Active verbs. "Waite collects" not "Waite is collecting" or "Waite seeks to collect".
- Address the student as "you" when natural. Don't perform; teach.
- No back-cover language. No "essential reading", no "must-read", no "valuable resource".
- No literary flourishes. Specifically avoid:
  * "does something [adverb][adjective]" openers
  * Stealth-adverb pairs: "quietly devastating", "subtly inverting", "carefully dismantling", "deeply consequential". If a verb needs an adverb to feel important, pick a stronger verb.
  * Em-dashes as rhetorical pauses. Use commas, periods, or colons.
- Honest about compression. The digest is a substitute, not the source. Name what the seeker is choosing to skip.
- Do not name the platform. No mentions of "Prismarium", "Project Parallax", "Digital Grimoire", "Convergence".

ACCURACY
- Do NOT invent quotes, page numbers, or chapter titles you are not certain of.
- Do NOT invert attributions or misassign arguments to authors.
- When the assigned tier is just a structural cue ("biographical chapters", "introduction and chapter 1"), describe the kind of material in that range and the kind of moves the author tends to make — don't fabricate specific cases or quotes.
- If a famous attribution or quote is unclear to you, omit it. A general but accurate description beats a confident error.

OUTPUT JSON
{ "digest": "<600-1300 words, flowing prose, paragraphs separated by single blank lines, no headings, no bullet points>" }

JSON ESCAPING — REQUIRED
The "digest" value is a single JSON string. Inside that string, paragraph
breaks MUST be the literal two-character sequence \\n\\n (backslash-n
backslash-n), not raw newlines. Internal quotes MUST be escaped as \\".
Never emit a raw newline, tab, or unescaped quote inside the string — those
produce "Bad control character" parse errors. Do not wrap the JSON in
markdown fences.

BANNED PHRASES (do not use):
${BANNED_PHRASES.map((p) => `  - "${p}"`).join('\n')}

Return exactly one JSON object. No markdown fences. No commentary.`;

function parseArgs(argv: string[]): Args {
  const out: Args = {
    course: null,
    week: null,
    readingId: null,
    limit: null,
    dryRun: false,
    overwriteDrafts: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--overwrite-drafts') out.overwriteDrafts = true;
    else if (a === '--course') {
      out.course = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--week') {
      out.week = Number(argv[i + 1]);
      i += 1;
    } else if (a === '--reading-id') {
      out.readingId = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--limit') {
      out.limit = Number(argv[i + 1]);
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(`Draft per-reading blurbs.

Flags:
  --course <slug>       Limit to one course
  --week <n>            Limit to one week (requires --course)
  --reading-id <slug>   Draft a single reading by its slug
  --limit <n>           Stop after N readings (smoke test)
  --dry-run             Print to console, do not write
  --overwrite-drafts    Re-draft even if blurb_draft already exists
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (out.week !== null && !out.course && !out.readingId) {
    throw new Error('--week requires --course');
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

function formatTension(t: Week['key_tension']): string {
  if (!t) return '';
  if (typeof t === 'string') return t;
  const a = t.side_a ?? '';
  const b = t.side_b ?? '';
  const desc = t.description ? ` — ${t.description}` : '';
  return a && b ? `${a} vs ${b}${desc}` : desc || '';
}

function buildTasks(courses: CourseRow[], args: Args): DraftTask[] {
  const tasks: DraftTask[] = [];
  for (const course of courses) {
    const content = course.content;
    if (!content || !Array.isArray(content.weeks)) continue;

    const courseContext = {
      title: course.title,
      premise: typeof content.premise === 'string' ? content.premise : '',
      core_question: typeof content.core_question === 'string' ? content.core_question : '',
    };

    for (const week of content.weeks) {
      if (args.week !== null && week.week_number !== args.week) continue;
      if (!Array.isArray(week.readings)) continue;

      for (const reading of week.readings) {
        if (!reading.reading_id || !reading.title) continue;
        if (args.readingId && reading.reading_id !== args.readingId) continue;

        tasks.push({
          reading_id: reading.reading_id,
          course_slug: course.slug,
          course_title: course.title,
          week_number: week.week_number ?? -1,
          reading,
          weekContext: week,
          courseContext,
        });
      }
    }
  }
  return tasks;
}

function buildUserPrompt(task: DraftTask): string {
  const r = task.reading;
  const w = task.weekContext;
  const tiers = r.tiers ?? {};
  return `COURSE
- title: ${task.courseContext.title}
- premise: ${task.courseContext.premise || '(none)'}
- course core question: ${task.courseContext.core_question || '(none)'}

WEEK ${task.week_number}: ${w.title ?? '(untitled)'}
- week core question: ${w.core_question ?? '(none)'}
- key tension: ${formatTension(w.key_tension) || '(none)'}
- lenses this week: ${(w.lens_focus ?? []).join(', ') || '(none)'}

THIS READING (draft a digest for this one)
- title: ${r.title}
- author: ${r.author ?? 'Unknown'}
- section / range: ${r.section ?? '(unspecified)'}
- why we picked it (selection rationale): ${r.selection_rationale ?? '(none)'}

TIERS ASSIGNED THIS WEEK (the digest should reflect the keystone/passage selection, not the whole book)
- keystone (essential fragment): ${tiers.keystone?.reference ?? '—'}  ::  ${tiers.keystone?.description ?? '—'}
- passage  (working reading):    ${tiers.passage?.reference ?? '—'}  ::  ${tiers.passage?.description ?? '—'}
- full     (deep reference):     ${tiers.full?.reference ?? '—'}  ::  ${tiers.full?.description ?? '—'}

Return the JSON object now.`;
}

function validate(output: DigestOutput): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (typeof output.digest !== 'string' || output.digest.trim().length === 0) {
    reasons.push('digest missing or empty');
  } else {
    const len = output.digest.length;
    if (len < MIN_DIGEST_LEN) reasons.push(`digest too short (${len} < ${MIN_DIGEST_LEN})`);
    if (len > MAX_DIGEST_LEN) reasons.push(`digest too long (${len} > ${MAX_DIGEST_LEN})`);
    const lower = output.digest.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase)) reasons.push(`banned phrase: "${phrase}"`);
    }
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

async function draftOne(
  task: DraftTask,
  systemBlocks: Anthropic.TextBlockParam[],
  client: Anthropic,
  model: string,
): Promise<{ output: DigestOutput; cacheRead: number; cacheCreated: number }> {
  const response = await client.messages.create({
    model,
    max_tokens: 3000,
    temperature: 0.3,
    system: systemBlocks,
    messages: [{ role: 'user', content: buildUserPrompt(task) }],
  });

  const firstBlock = response.content[0];
  if (!firstBlock || firstBlock.type !== 'text') {
    throw new Error('Empty or non-text response from Claude');
  }
  const parsed = parseAiJsonObject<DigestOutput>(firstBlock.text);
  return {
    output: parsed,
    cacheRead: response.usage?.cache_read_input_tokens ?? 0,
    cacheCreated: response.usage?.cache_creation_input_tokens ?? 0,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService();
  const aiClient = new Anthropic();

  console.log(`Draft reading digests — model: ${CLAUDE_MODEL}, dryRun: ${args.dryRun}`);

  let query = supabase
    .from('courses')
    .select('id, slug, title, content')
    .order('sort_order', { ascending: true });
  if (args.course) query = query.eq('slug', args.course);

  const { data: courses, error } = await query;
  if (error) throw new Error(`fetch courses: ${error.message}`);
  if (!courses || courses.length === 0) {
    console.log('No courses found.');
    return;
  }

  let tasks = buildTasks(courses as CourseRow[], args);
  if (args.readingId) {
    tasks = tasks.filter((t) => t.reading_id === args.readingId);
  }
  if (args.limit !== null && Number.isFinite(args.limit)) {
    tasks = tasks.slice(0, args.limit);
  }

  console.log(`Tasks queued: ${tasks.length}`);
  if (tasks.length === 0) {
    console.log('Nothing to do. (Did you run backfill-reading-ids.ts first?)');
    return;
  }

  // Cache the system rules across calls — same prompt, ~$ savings on subsequent requests.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: 'text', text: SYSTEM_RULES, cache_control: { type: 'ephemeral' } },
  ];

  // Pre-check existing drafts so we don't clobber unless --overwrite-drafts.
  // Chunk the .in() query — PostgREST encodes IN-lists into the URL and a
  // single 500+ id call silently returns nothing once it blows the URL limit,
  // which would re-draft everything. 100/batch keeps the URL well under 8KB.
  if (!args.overwriteDrafts) {
    const ids = tasks.map((t) => t.reading_id);
    const CHUNK = 100;
    const hasDraft = new Set<string>();
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { data: existing, error: precheckError } = await supabase
        .from('reading_blurbs')
        .select('reading_id, blurb_draft, status')
        .in('reading_id', slice);
      if (precheckError) {
        console.warn(`  ⚠️ skip pre-check error on chunk ${i}: ${precheckError.message}`);
        continue;
      }
      for (const r of existing ?? []) {
        if (r.blurb_draft && r.status === 'draft_pending') hasDraft.add(r.reading_id);
      }
    }
    const skipped = tasks.filter((t) => hasDraft.has(t.reading_id));
    if (skipped.length > 0) {
      console.log(`Skipping ${skipped.length} reading(s) with existing draft_pending. Pass --overwrite-drafts to redo.`);
      tasks = tasks.filter((t) => !hasDraft.has(t.reading_id));
    }
  }

  let okCount = 0;
  let failCount = 0;
  let cacheReadTotal = 0;
  let cacheCreatedTotal = 0;
  const failures: { reading_id: string; reasons: string[] }[] = [];

  for (const task of tasks) {
    console.log(`\n— ${task.reading_id}`);
    console.log(`  ${task.reading.title} (${task.course_title} · w${task.week_number})`);

    // One retry on transient errors: JSON parse, network blips, or a validation flake.
    // The model is non-deterministic; a second sample at the same temperature usually clears it.
    let output: DigestOutput | null = null;
    let cacheRead = 0;
    let cacheCreated = 0;
    let attemptError: { reasons: string[]; raw?: string } | null = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await draftOne(task, systemBlocks, aiClient, CLAUDE_MODEL);
        cacheRead = result.cacheRead;
        cacheCreated = result.cacheCreated;
        const validation = validate(result.output);
        if (validation.ok) {
          output = result.output;
          attemptError = null;
          break;
        }
        attemptError = { reasons: validation.reasons, raw: result.output.digest };
        if (attempt < 2) console.warn(`  ↻ retry after validation failure: ${validation.reasons.join('; ')}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        attemptError = { reasons: [msg] };
        if (attempt < 2) console.warn(`  ↻ retry after error: ${msg}`);
      }
    }

    try {
      if (!output) {
        failCount += 1;
        failures.push({ reading_id: task.reading_id, reasons: attemptError?.reasons ?? ['unknown failure'] });
        console.warn(`  ❌ failed after retry:\n    - ${(attemptError?.reasons ?? []).join('\n    - ')}`);
        if (attemptError?.raw) console.log(`  raw digest:\n${attemptError.raw}`);
        continue;
      }

      cacheReadTotal += cacheRead;
      cacheCreatedTotal += cacheCreated;

      okCount += 1;
      console.log(`  ✅ ${output.digest.length} chars`);
      console.log(`     ${output.digest}`);
      if (cacheRead > 0) console.log(`  ⚡ cache hit: ${cacheRead} tokens`);
      else if (cacheCreated > 0) console.log(`  🧱 cache primed: ${cacheCreated} tokens`);

      if (args.dryRun) continue;

      const { error: upsertError } = await supabase
        .from('reading_blurbs')
        .upsert(
          {
            reading_id: task.reading_id,
            course_slug: task.course_slug,
            week_number: task.week_number,
            text_title: task.reading.title ?? '',
            blurb_draft: output.digest,
            status: 'draft_pending',
          },
          { onConflict: 'reading_id' },
        );
      if (upsertError) {
        failCount += 1;
        okCount -= 1;
        failures.push({ reading_id: task.reading_id, reasons: [`DB upsert failed: ${upsertError.message}`] });
        console.warn(`  ❌ DB upsert failed: ${upsertError.message}`);
      } else {
        console.log(`  💾 draft written (status=draft_pending)`);
      }
    } catch (err) {
      failCount += 1;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ reading_id: task.reading_id, reasons: [msg] });
      console.warn(`  ❌ ${msg}`);
    }
  }

  console.log(`\n=========================================`);
  console.log(`Done. ok=${okCount} fail=${failCount} dryRun=${args.dryRun}`);
  console.log(`Cache: ${cacheReadTotal} tokens read | ${cacheCreatedTotal} tokens primed`);
  if (failures.length > 0) {
    console.log(`\nFailures:`);
    for (const f of failures) {
      console.log(`  - ${f.reading_id}`);
      for (const r of f.reasons) console.log(`      • ${r}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
