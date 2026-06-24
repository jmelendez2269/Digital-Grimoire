/**
 * For every entity in `correspondences`, propose missing aliases that would
 * unlock corpus passages currently invisible to the pipeline.
 *
 * We saw this clearly with Inanna ↔ Ishtar in the category-coverage probe:
 * Inanna returns 0 FTS hits, Ishtar returns 4 substantive corpus passages
 * from Frazer + Blavatsky + Hall. Same deity, two names, but only one is
 * listed on the row's aliases. The pipeline searches over name + aliases,
 * so adding "Ishtar" as an alias on the Inanna row would immediately flip
 * her from path=structured to path=corpus.
 *
 * This script:
 *   1. Loads a hand-curated dictionary of well-known cross-tradition
 *      equivalences (Greek/Roman/Egyptian/Mesopotamian/Hindu/Norse/Celtic
 *      deity pairs, hermetic figures, etc.).
 *   2. For each entity, finds which dictionary candidates ARE NOT already
 *      in the row's aliases array.
 *   3. For each missing candidate, runs the same FTS + substance filter
 *      the narrative script uses and reports the impact: how many new
 *      substantive passages would adding this alias unlock?
 *   4. Prints a ranked report, sorted by impact.
 *
 * Read-only by default. Pass --apply to actually update the aliases
 * array on each row (only adds aliases that produce >= MIN_NEW_PASSAGES
 * new substantive passages — the threshold prevents noise additions).
 *
 * Usage:
 *   pnpm exec tsx scripts/audit-aliases.ts                       # dry-run report
 *   pnpm exec tsx scripts/audit-aliases.ts --min-impact 1        # show even single-passage gains
 *   pnpm exec tsx scripts/audit-aliases.ts --category deity      # restrict to one category
 *   pnpm exec tsx scripts/audit-aliases.ts --apply                # write approved aliases to DB
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MIN_CHUNK_LEN_FOR_SUBSTANCE = 600;
const MIN_CONTEXT_AROUND_MENTION = 200;
const PROBE_LIMIT = 12;          // matches the narrative script's per-phrase ceiling
const APPLY_MIN_PASSAGES = 2;    // when --apply, require at least N substantive new passages

type Args = {
  apply: boolean;
  minImpact: number;
  category: string | null;
};

type Entity = {
  id: string;
  slug: string;
  name: string;
  category: string;
  aliases: string[] | null;
};

// Hand-curated cross-tradition equivalences. Keyed by lowercase canonical
// name; the value is the list of alternates the corpus might use. We err
// toward including SCHOLARLY / OLDER spellings (Hellenized forms, Latin
// transliterations) since those dominate public-domain esoteric and
// anthropological literature in the library.
const ALIAS_DICTIONARY: Record<string, string[]> = {
  // ── Greek / Roman pairs (the corpus is dominated by 19th-c. anthropology
  //    and classical scholarship that prefers Roman or Latinate forms) ──
  'zeus':        ['Jupiter', 'Jove'],
  'jupiter':     ['Zeus', 'Jove'],
  'hera':        ['Juno'],
  'juno':        ['Hera'],
  'poseidon':    ['Neptune'],
  'neptune':     ['Poseidon'],
  'hades':       ['Pluto', 'Dis', 'Aidoneus'],
  'pluto':       ['Hades', 'Dis'],
  'athena':      ['Minerva', 'Pallas', 'Pallas Athena'],
  'minerva':     ['Athena', 'Pallas'],
  'aphrodite':   ['Venus', 'Cytherea'],
  'venus':       ['Aphrodite', 'Cytherea'],
  'ares':        ['Mars'],
  'mars':        ['Ares'],
  'hermes':      ['Mercury', 'Hermes Trismegistus', 'Trismegistus'],
  'mercury':     ['Hermes', 'Hermes Trismegistus'],
  'artemis':     ['Diana', 'Cynthia', 'Phoebe'],
  'diana':       ['Artemis', 'Cynthia'],
  'apollo':      ['Phoebus', 'Phoebus Apollo', 'Helios'],
  'hephaestus':  ['Vulcan', 'Hephaistos'],
  'vulcan':      ['Hephaestus', 'Hephaistos'],
  'demeter':     ['Ceres'],
  'ceres':       ['Demeter'],
  'dionysus':    ['Bacchus', 'Dionysos'],
  'bacchus':     ['Dionysus'],
  'persephone':  ['Proserpina', 'Proserpine', 'Kore'],
  'proserpina':  ['Persephone', 'Proserpine'],
  'hestia':      ['Vesta'],
  'vesta':       ['Hestia'],
  'eros':        ['Cupid', 'Amor'],
  'cupid':       ['Eros'],
  'cronus':      ['Saturn', 'Kronos'],
  'saturn':      ['Cronus', 'Kronos'],
  'gaia':        ['Gaea', 'Ge', 'Tellus', 'Terra'],
  'rhea':        ['Cybele', 'Magna Mater'],
  'pan':         ['Faunus'],
  'hecate':      ['Trivia'],
  'helios':      ['Sol'],
  'selene':      ['Luna'],
  'eos':         ['Aurora'],
  'nike':        ['Victoria'],
  'asclepius':   ['Aesculapius'],

  // ── Egyptian (Greek vs. Egyptian transliteration is the big axis) ──
  'isis':        ['Aset', 'Auset', 'Eset'],
  'osiris':      ['Asar', 'Wesir', 'Usir'],
  'horus':       ['Heru', 'Hor', 'Harpocrates', 'Heru-ur'],
  'thoth':       ['Tehuti', 'Djehuty', 'Hermes Trismegistus', 'Trismegistus'],
  'anubis':      ['Anpu', 'Inpu', 'Yinepu'],
  'ra':          ['Re', 'Atum-Ra', 'Amun-Ra'],
  'nephthys':    ['Nebet-Het', 'Nebet-Hut'],
  'bastet':      ['Bast', 'Ubasti'],
  'sekhmet':     ['Sachmis'],
  'hathor':      ['Het-Heru'],
  'set':         ['Seth', 'Sutekh', 'Sutech'],
  'ptah':        ['Pteh'],

  // ── Mesopotamian / Sumerian ──
  'inanna':      ['Ishtar', 'Astarte', 'Ashtoreth'],
  'ishtar':      ['Inanna', 'Astarte', 'Ashtoreth'],
  'astarte':     ['Ishtar', 'Inanna', 'Ashtoreth'],
  'tammuz':      ['Dumuzi', 'Dumuzid', 'Adonis'],
  'dumuzi':      ['Tammuz', 'Adonis'],
  'marduk':      ['Bel', 'Merodach'],
  'enki':        ['Ea'],
  'enlil':       ['Ellil'],
  'tiamat':      ['Thalatth'],
  'sin':         ['Nanna', 'Nannar'],
  'shamash':     ['Utu'],

  // ── Hindu / Buddhist ──
  'shiva':       ['Mahadeva', 'Maheshvara', 'Rudra', 'Hara'],
  'vishnu':      ['Hari', 'Narayana', 'Vasudeva'],
  'krishna':     ['Govinda', 'Vasudeva', 'Hari'],
  'brahma':      ['Brahman', 'Brahmā'],
  'devi':        ['Shakti', 'Mahadevi'],
  'durga':       ['Mahishasuramardini', 'Devi'],
  'kali':        ['Mahakali', 'Kalika'],
  'lakshmi':     ['Sri', 'Maha Lakshmi', 'Shri'],
  'saraswati':   ['Sarasvati', 'Vach'],
  'parvati':     ['Uma', 'Gauri'],
  'ganesha':     ['Ganesh', 'Ganapati', 'Vinayaka'],
  'hanuman':     ['Hanumat', 'Maruti'],
  'buddha':      ['Siddhartha', 'Gautama', 'Sakyamuni', 'Shakyamuni', 'Tathagata'],
  'avalokiteshvara': ['Guan Yin', 'Kwan Yin', 'Kuan Yin', 'Chenrezig', 'Kannon'],
  'tara':        ['Arya Tara'],
  'manjushri':   ['Manjusri'],

  // ── Norse / Germanic ──
  'odin':        ['Woden', 'Wodan', 'Wotan', 'Othinn'],
  'thor':        ['Donar', 'Thunor'],
  'freyja':      ['Freya', 'Frea'],
  'freya':       ['Freyja'],
  'freyr':       ['Frey'],
  'frigg':       ['Frigga'],
  'tyr':         ['Tiw', 'Tiwaz'],
  'loki':        ['Lopt'],

  // ── Celtic ──
  'lugh':        ['Lleu', 'Lugus'],
  'brigid':      ['Brigit', 'Brigantia', 'Bride'],
  'cernunnos':   ['Herne'],
  'morrigan':    ['Morrígan', 'Morrigu'],
  'dagda':       ['An Dagda'],
  'cerridwen':   ['Ceridwen', 'Kerridwen'],
  'rhiannon':    ['Rigantona'],
  'taliesin':    ['Taliessin'],

  // ── Hermetic / esoteric concepts where alternate spellings matter ──
  'hermes trismegistus': ['Thoth', 'Trismegistus', 'Hermes'],
  'sophia':      ['Achamoth', 'Pistis Sophia'],

  // ── Slavic / other ──
  'baba yaga':   ['Baba-Yaga'],

  // ── Stones — modern magical names that lack the common-name in older
  //    mineralogy texts. The older books cite stones by classical or
  //    biblical names. ──
  "tiger's eye": ['Crocidolite', "Falcon's Eye"],
  'lapis lazuli': ['Lapis', 'Sapphirus'],
  'sodalite':    [],
  'labradorite': [],
  'obsidian':    ['Volcanic glass'],
  'amethyst':    [],
  'moonstone':   ['Selenite', 'Adularia'],
  'bloodstone':  ['Heliotrope'],
  'jasper':      [],
  'opal':        [],

  // ── Trees / plants — Latin and old-English names matter for Frazer ──
  'oak':         ['Quercus'],
  'rowan':       ['Mountain ash', 'Sorbus'],
  'yew':         ['Taxus'],
  'ash':         ['Yggdrasil'],
};

function parseArgs(argv: string[]): Args {
  const out: Args = { apply: false, minImpact: 1, category: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--min-impact') {
      out.minImpact = Number(argv[i + 1]);
      i += 1;
    } else if (a === '--category') {
      out.category = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(`Audit aliases for corpus-coverage gains.

Flags:
  --min-impact <n>   Only report aliases that unlock >= N substantive passages (default 1)
  --category <name>  Restrict to one category (e.g. deity)
  --apply            Write approved aliases to DB (only ones with >= ${APPLY_MIN_PASSAGES} new passages)
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

function isSubstantivePassage(content: string, phrase: string): boolean {
  if (!content || content.length < MIN_CHUNK_LEN_FOR_SUBSTANCE) return false;
  const idx = content.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return false;
  const before = content.slice(0, idx).trim();
  const after = content.slice(idx + phrase.length).trim();
  if (before.length < MIN_CONTEXT_AROUND_MENTION && after.length < MIN_CONTEXT_AROUND_MENTION) {
    return false;
  }
  const window = content.slice(Math.max(0, idx - 400), Math.min(content.length, idx + 400));
  const lines = window.split(/\n+/).filter((l) => l.trim().length > 0);
  if (lines.length >= 4) {
    const shortLines = lines.filter((l) => l.trim().split(/\s+/).length <= 4).length;
    if (shortLines / lines.length > 0.6) return false;
  }
  return true;
}

async function probePhrase(supabase: SupabaseClient, phrase: string): Promise<{
  substantive: number;
  topSources: string[];
}> {
  // Mirror the narrative script's lookup logic so impact numbers reflect
  // what would actually happen at draft time.
  const { data: ftsData } = await supabase
    .from('text_chunks')
    .select('text_id, content, texts:text_id(title)')
    .textSearch('content', phrase, { type: 'plain', config: 'english' })
    .limit(PROBE_LIMIT);

  let rows = ftsData ?? [];
  if (rows.length === 0) {
    const { data: ilikeData } = await supabase
      .from('text_chunks')
      .select('text_id, content, texts:text_id(title)')
      .ilike('content', `%${phrase}%`)
      .limit(PROBE_LIMIT);
    rows = ilikeData ?? [];
  }

  const seen = new Set<string>();
  const sources = new Map<string, number>();
  let substantive = 0;
  for (const row of rows as any[]) {
    if (seen.has(row.text_id)) continue;
    seen.add(row.text_id);
    if (isSubstantivePassage(row.content ?? '', phrase)) {
      substantive += 1;
      const title = row.texts?.title ?? '(untitled)';
      sources.set(title, (sources.get(title) ?? 0) + 1);
    }
  }

  return {
    substantive,
    topSources: Array.from(sources.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([title]) => title),
  };
}

function dictionaryKeysFor(entity: Entity): string[] {
  // An entity might match the dictionary by name, slug, or one of its
  // existing aliases. We collect all matches so the proposal covers any
  // synonym pool that touches this row.
  const candidates = new Set<string>();
  const normalize = (s: string) => s.trim().toLowerCase();
  const keys = [normalize(entity.name)];
  if (entity.slug) keys.push(normalize(entity.slug.replace(/^(deity|stone|tree|bird|animal|insect|color|element|herb|plant)-/, '')));
  for (const alias of entity.aliases ?? []) keys.push(normalize(alias));
  for (const k of keys) {
    if (ALIAS_DICTIONARY[k]) candidates.add(k);
  }
  return Array.from(candidates);
}

async function listEntities(supabase: SupabaseClient, args: Args): Promise<Entity[]> {
  const PAGE = 1000;
  const out: Entity[] = [];
  let from = 0;
  let query = supabase
    .from('correspondences')
    .select('id, slug, name, category, aliases');
  if (args.category) query = query.eq('category', args.category);
  while (true) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`correspondences page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as Entity[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

type Proposal = {
  entity: Entity;
  proposedAlias: string;
  newSubstantivePassages: number;
  topSources: string[];
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService();

  console.log(
    `Alias audit — apply=${args.apply}, min-impact=${args.minImpact}, category=${args.category ?? 'all'}`,
  );
  console.log(`Dictionary entries: ${Object.keys(ALIAS_DICTIONARY).length}`);

  const entities = await listEntities(supabase, args);
  console.log(`Entities to scan: ${entities.length}\n`);

  // Memoize per-phrase probe results so we don't re-FTS the same alternate
  // name across multiple matching entities (Ishtar appears under both
  // Inanna and Astarte rows, for example).
  const probeCache = new Map<string, { substantive: number; topSources: string[] }>();
  async function cachedProbe(phrase: string) {
    const k = phrase.trim().toLowerCase();
    if (probeCache.has(k)) return probeCache.get(k)!;
    const result = await probePhrase(supabase, phrase);
    probeCache.set(k, result);
    return result;
  }

  const proposals: Proposal[] = [];
  let scanned = 0;

  for (const entity of entities) {
    const matchedKeys = dictionaryKeysFor(entity);
    if (matchedKeys.length === 0) continue;

    const existingAliases = new Set(
      (entity.aliases ?? []).map((a) => a.trim().toLowerCase()),
    );
    existingAliases.add(entity.name.trim().toLowerCase());

    const proposedSet = new Set<string>();
    for (const key of matchedKeys) {
      for (const alt of ALIAS_DICTIONARY[key]) {
        if (!existingAliases.has(alt.trim().toLowerCase())) proposedSet.add(alt);
      }
    }
    if (proposedSet.size === 0) continue;

    scanned += 1;
    for (const candidate of proposedSet) {
      const result = await cachedProbe(candidate);
      if (result.substantive >= args.minImpact) {
        proposals.push({
          entity,
          proposedAlias: candidate,
          newSubstantivePassages: result.substantive,
          topSources: result.topSources,
        });
      }
    }
  }

  // Rank proposals by impact descending so the biggest wins surface first.
  proposals.sort(
    (a, b) =>
      b.newSubstantivePassages - a.newSubstantivePassages ||
      a.entity.name.localeCompare(b.entity.name),
  );

  console.log(`Scanned ${scanned} entities with at least one dictionary match.\n`);
  console.log(`ALIAS PROPOSALS (${proposals.length})`);
  console.log('='.repeat(120));
  for (const p of proposals) {
    console.log(
      `  ${p.entity.name.padEnd(28)} (${p.entity.category.padEnd(12)}) ` +
        `+ "${p.proposedAlias}"  →  ${p.newSubstantivePassages} new passage(s)`,
    );
    if (p.topSources.length > 0) {
      console.log(`     sources: ${p.topSources.join(' | ')}`);
    }
  }

  if (!args.apply) {
    console.log('\n(Dry run. Pass --apply to write approved aliases to the DB.)');
    return;
  }

  // Apply: group proposals by entity, build a unique aliases-to-add list per
  // row, and update only when at least one candidate cleared APPLY_MIN_PASSAGES.
  const byEntity = new Map<string, { entity: Entity; toAdd: string[] }>();
  for (const p of proposals) {
    if (p.newSubstantivePassages < APPLY_MIN_PASSAGES) continue;
    const bucket = byEntity.get(p.entity.id) ?? { entity: p.entity, toAdd: [] };
    if (!bucket.toAdd.includes(p.proposedAlias)) bucket.toAdd.push(p.proposedAlias);
    byEntity.set(p.entity.id, bucket);
  }

  console.log(`\nApplying ${byEntity.size} entity updates (min ${APPLY_MIN_PASSAGES} passages each)...`);
  let ok = 0;
  let fail = 0;
  for (const { entity, toAdd } of byEntity.values()) {
    const merged = Array.from(
      new Set([...(entity.aliases ?? []), ...toAdd].map((s) => s.trim()).filter(Boolean)),
    );
    const { error } = await supabase
      .from('correspondences')
      .update({ aliases: merged, updated_at: new Date().toISOString() })
      .eq('id', entity.id);
    if (error) {
      fail += 1;
      console.log(`  ❌ ${entity.name}: ${error.message}`);
    } else {
      ok += 1;
      console.log(`  ✅ ${entity.name} += [${toAdd.join(', ')}]`);
    }
  }
  console.log(`\nDone. updated=${ok} fail=${fail}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
