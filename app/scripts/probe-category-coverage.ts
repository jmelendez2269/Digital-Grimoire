/**
 * For every category in `correspondences`, pick the highest-degree entity
 * whose narrative_status='missing' and report whether the narrative script
 * would route it through the corpus path or the structured path — without
 * making any LLM calls.
 *
 * Runs the same FTS + substance filter as draft-entity-narratives.ts so the
 * numbers reflect what would actually happen at draft time. Read-only.
 *
 * Usage:
 *   pnpm exec tsx scripts/probe-category-coverage.ts
 *   pnpm exec tsx scripts/probe-category-coverage.ts --sample 3        # probe top-3 per category, not just top-1
 *   pnpm exec tsx scripts/probe-category-coverage.ts --include-approved # also include narrative_status='approved' entities
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Mirror the narrative script's filter constants so the probe reports
// exactly what draft-time would see. If those numbers change there, change
// them here too.
const CORPUS_PASSAGE_LIMIT = 6;
const MIN_CORPUS_PASSAGES = 3;
const MIN_CHUNK_LEN_FOR_SUBSTANCE = 600;
const MIN_CONTEXT_AROUND_MENTION = 200;

type Args = {
  sample: number;
  includeApproved: boolean;
};

type Entity = {
  id: string;
  slug: string;
  name: string;
  category: string;
  aliases: string[] | null;
  narrative_status: string;
};

type CategoryReport = {
  category: string;
  totalEntities: number;
  missingCount: number;
  probed: Array<{
    name: string;
    edges: number;
    ftsHits: number;
    substantive: number;
    path: 'corpus' | 'structured';
    topSources: string[];
  }>;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { sample: 1, includeApproved: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--sample') {
      out.sample = Number(argv[i + 1]);
      i += 1;
    } else if (a === '--include-approved') {
      out.includeApproved = true;
    } else if (a === '--help' || a === '-h') {
      console.log(`Probe corpus coverage per category.

Flags:
  --sample <n>          Probe the top-N entities per category (default 1)
  --include-approved    Include entities with narrative_status='approved'
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

function buildSearchPhrases(entity: Entity): string[] {
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

async function probeEntity(
  supabase: SupabaseClient,
  entity: Entity,
): Promise<{ ftsHits: number; substantive: number; path: 'corpus' | 'structured'; sources: Map<string, number> }> {
  const phrases = buildSearchPhrases(entity);
  const byTextId = new Map<string, { title: string; substantive: boolean }>();
  let totalFtsHits = 0;

  for (const phrase of phrases) {
    const { data } = await supabase
      .from('text_chunks')
      .select('text_id, content, texts:text_id(title)')
      .textSearch('content', phrase, { type: 'plain', config: 'english' })
      .limit(CORPUS_PASSAGE_LIMIT * 2);

    let rows = data ?? [];
    if (rows.length === 0) {
      const { data: ilikeRes } = await supabase
        .from('text_chunks')
        .select('text_id, content, texts:text_id(title)')
        .ilike('content', `%${phrase}%`)
        .limit(CORPUS_PASSAGE_LIMIT * 2);
      rows = ilikeRes ?? [];
    }
    totalFtsHits += rows.length;

    for (const row of rows as any[]) {
      if (byTextId.has(row.text_id)) continue;
      const substantive = isSubstantivePassage(row.content ?? '', phrase);
      byTextId.set(row.text_id, {
        title: row.texts?.title ?? '(untitled)',
        substantive,
      });
      if (byTextId.size >= CORPUS_PASSAGE_LIMIT) break;
    }
    if (byTextId.size >= CORPUS_PASSAGE_LIMIT) break;
  }

  const sources = new Map<string, number>();
  let substantiveCount = 0;
  for (const v of byTextId.values()) {
    if (v.substantive) {
      substantiveCount += 1;
      sources.set(v.title, (sources.get(v.title) ?? 0) + 1);
    }
  }

  return {
    ftsHits: totalFtsHits,
    substantive: substantiveCount,
    path: substantiveCount >= MIN_CORPUS_PASSAGES ? 'corpus' : 'structured',
    sources,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService();

  // Pull every correspondence; we'll group by category in JS so we can also
  // rank entities by edge count within each category.
  let query = supabase
    .from('correspondences')
    .select('id, slug, name, category, aliases, narrative_status');
  if (!args.includeApproved) query = query.neq('narrative_status', 'approved');

  // Page in case the corpus has more than the default 1000.
  const PAGE = 1000;
  const entities: Entity[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`correspondences page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    entities.push(...(data as Entity[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Edge counts: page through relationships and tally.
  const degree = new Map<string, number>();
  let edgeFrom = 0;
  while (true) {
    const { data, error } = await supabase
      .from('correspondence_relationships')
      .select('source_id, target_id')
      .range(edgeFrom, edgeFrom + PAGE - 1);
    if (error) throw new Error(`relationships page ${edgeFrom}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const e of data) {
      degree.set(e.source_id, (degree.get(e.source_id) ?? 0) + 1);
      degree.set(e.target_id, (degree.get(e.target_id) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
    edgeFrom += PAGE;
  }

  // Group by category, sort by degree desc.
  const byCategory = new Map<string, Entity[]>();
  for (const e of entities) {
    const cat = e.category || '(uncategorized)';
    const list = byCategory.get(cat) ?? [];
    list.push(e);
    byCategory.set(cat, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));
  }

  const reports: CategoryReport[] = [];
  const categories = Array.from(byCategory.keys()).sort();
  console.log(`Probing ${categories.length} categories, sample=${args.sample}/category...\n`);

  for (const category of categories) {
    const list = byCategory.get(category)!;
    const missing = list.filter((e) => e.narrative_status === 'missing');
    const probed: CategoryReport['probed'] = [];

    const candidates = (args.includeApproved ? list : missing).slice(0, args.sample);
    for (const entity of candidates) {
      const res = await probeEntity(supabase, entity);
      probed.push({
        name: entity.name,
        edges: degree.get(entity.id) ?? 0,
        ftsHits: res.ftsHits,
        substantive: res.substantive,
        path: res.path,
        topSources: Array.from(res.sources.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([title]) => title),
      });
    }

    reports.push({
      category,
      totalEntities: list.length,
      missingCount: missing.length,
      probed,
    });
  }

  // Print table.
  console.log('CATEGORY COVERAGE REPORT');
  console.log('='.repeat(120));
  for (const r of reports) {
    console.log(`\n${r.category}  —  ${r.totalEntities} entities (${r.missingCount} missing)`);
    if (r.probed.length === 0) {
      console.log('  (no missing entities to probe)');
      continue;
    }
    for (const p of r.probed) {
      const pathLabel = p.path === 'corpus' ? '✅ corpus' : '⚠️  structured';
      console.log(
        `  ${p.name.padEnd(28)} edges=${String(p.edges).padStart(3)}  fts=${String(p.ftsHits).padStart(3)}  substantive=${p.substantive}  → ${pathLabel}`,
      );
      if (p.topSources.length > 0) {
        console.log(`     sources: ${p.topSources.join(' | ')}`);
      }
    }
  }

  // Roll-up at the end: which categories are corpus-rich vs corpus-thin?
  const corpusCategories: string[] = [];
  const structuredCategories: string[] = [];
  const mixedCategories: string[] = [];
  for (const r of reports) {
    if (r.probed.length === 0) continue;
    const corpusCount = r.probed.filter((p) => p.path === 'corpus').length;
    const structuredCount = r.probed.length - corpusCount;
    if (corpusCount === r.probed.length) corpusCategories.push(r.category);
    else if (structuredCount === r.probed.length) structuredCategories.push(r.category);
    else mixedCategories.push(r.category);
  }

  console.log('\n');
  console.log('='.repeat(120));
  console.log(`CORPUS-COVERED (${corpusCategories.length}): ${corpusCategories.join(', ')}`);
  console.log('');
  console.log(`MIXED (${mixedCategories.length}): ${mixedCategories.join(', ')}`);
  console.log('');
  console.log(`STRUCTURED-ONLY (${structuredCategories.length}): ${structuredCategories.join(', ')}`);
  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
