import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type ParsedArgs = {
  apply: boolean;
  ids: string[] | null;
  verbose: boolean;
};

type RelatedText = { id: string; title: string; resonance: string };

type TextRow = {
  id: string;
  title: string;
  author: string | null;
  curator_note: string | null;
  long_summary: string | null;
  related_texts: RelatedText[] | null;
  curator_note_status: string | null;
  curator_note_reviewed_at: string | null;
};

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { apply: false, ids: null, verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') out.apply = true;
    else if (arg === '--verbose' || arg === '-v') out.verbose = true;
    else if (arg === '--ids') out.ids = (argv[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

function printHelp() {
  console.log(`Sync approved curator notes from staging to production.

Reads STAGING from NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
Reads PRODUCTION from PROD_SUPABASE_URL + PROD_SUPABASE_SERVICE_KEY.

Only syncs staging rows where curator_note_status = 'live' (approved via /admin/curator-notes).
Re-maps related_texts UUIDs from staging IDs to production IDs by title+author.

Usage:
  pnpm exec tsx scripts/sync-curator-notes-to-prod.ts             # dry run
  pnpm exec tsx scripts/sync-curator-notes-to-prod.ts --apply     # write to prod
  pnpm exec tsx scripts/sync-curator-notes-to-prod.ts --ids id1,id2 --apply

Flags:
  --apply       Write to prod. Without this, dry-run only.
  --ids         Only process specific staging text IDs.
  --verbose     Show per-row decisions for unmatched/skipped texts.
  --help        Show this message.
`);
}

function normalize(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Title-only normalization — trims off subtitle after first colon for looser matching.
function normalizeTitleLoose(title: string | null | undefined): string {
  if (!title) return '';
  const primary = title.split(/[:—–-]/)[0];
  return normalize(primary);
}

type ProdIndex = {
  byTitleAuthor: Map<string, TextRow>;
  byTitleLoose: Map<string, TextRow[]>;
};

function buildProdIndex(rows: TextRow[]): ProdIndex {
  const byTitleAuthor = new Map<string, TextRow>();
  const byTitleLoose = new Map<string, TextRow[]>();
  for (const row of rows) {
    const key = `${normalize(row.title)}|${normalize(row.author)}`;
    if (!byTitleAuthor.has(key)) {
      byTitleAuthor.set(key, row);
    }
    const looseKey = normalizeTitleLoose(row.title);
    const bucket = byTitleLoose.get(looseKey) ?? [];
    bucket.push(row);
    byTitleLoose.set(looseKey, bucket);
  }
  return { byTitleAuthor, byTitleLoose };
}

type MatchResult =
  | { kind: 'exact'; prod: TextRow }
  | { kind: 'loose'; prod: TextRow }
  | { kind: 'ambiguous'; candidates: TextRow[] }
  | { kind: 'none' };

function findProdMatch(staging: TextRow, index: ProdIndex): MatchResult {
  const exactKey = `${normalize(staging.title)}|${normalize(staging.author)}`;
  const exact = index.byTitleAuthor.get(exactKey);
  if (exact) return { kind: 'exact', prod: exact };

  const looseKey = normalizeTitleLoose(staging.title);
  const looseBucket = index.byTitleLoose.get(looseKey) ?? [];
  if (looseBucket.length === 1) return { kind: 'loose', prod: looseBucket[0] };
  if (looseBucket.length > 1) return { kind: 'ambiguous', candidates: looseBucket };
  return { kind: 'none' };
}

function remapRelatedTexts(
  related: RelatedText[] | null,
  stagingIdToRow: Map<string, TextRow>,
  prodIndex: ProdIndex,
): { remapped: RelatedText[]; droppedTitles: string[] } {
  if (!related || related.length === 0) return { remapped: [], droppedTitles: [] };
  const remapped: RelatedText[] = [];
  const droppedTitles: string[] = [];

  for (const entry of related) {
    const stagingRow = stagingIdToRow.get(entry.id);
    // Prefer matching by staging row's actual title+author if we know the source row,
    // otherwise fall back to the title stored inside the related_texts entry.
    const lookupTitle = stagingRow?.title ?? entry.title;
    const lookupAuthor = stagingRow?.author ?? null;

    const exactKey = `${normalize(lookupTitle)}|${normalize(lookupAuthor)}`;
    let prodMatch = prodIndex.byTitleAuthor.get(exactKey);

    if (!prodMatch) {
      const looseBucket = prodIndex.byTitleLoose.get(normalizeTitleLoose(lookupTitle)) ?? [];
      if (looseBucket.length === 1) prodMatch = looseBucket[0];
    }

    if (prodMatch) {
      remapped.push({
        id: prodMatch.id,
        title: prodMatch.title,
        resonance: entry.resonance,
      });
    } else {
      droppedTitles.push(entry.title);
    }
  }

  return { remapped, droppedTitles };
}

async function fetchAllTexts(client: SupabaseClient, label: string): Promise<TextRow[]> {
  const { data, error } = await client
    .from('texts')
    .select('id,title,author,curator_note,long_summary,related_texts,curator_note_status,curator_note_reviewed_at')
    .order('title', { ascending: true });
  if (error) {
    throw new Error(`Failed to fetch ${label} texts: ${error.message}`);
  }
  return (data ?? []) as TextRow[];
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }
  const args = parseArgs(process.argv.slice(2));

  const stagingUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const stagingKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const prodUrl = process.env.PROD_SUPABASE_URL;
  const prodKey = process.env.PROD_SUPABASE_SERVICE_KEY;

  if (!stagingUrl || !stagingKey) {
    throw new Error('Missing staging credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  if (!prodUrl || !prodKey) {
    throw new Error('Missing prod credentials. Set PROD_SUPABASE_URL and PROD_SUPABASE_SERVICE_KEY in .env.local');
  }
  if (stagingUrl === prodUrl) {
    throw new Error('Staging and prod URLs are identical — refusing to sync a project to itself');
  }

  const staging = createClient(stagingUrl, stagingKey, { auth: { persistSession: false } });
  const prod = createClient(prodUrl, prodKey, { auth: { persistSession: false } });

  console.log(`🔄 Sync curator notes — staging → prod, apply=${args.apply}`);
  console.log(`   staging: ${stagingUrl}`);
  console.log(`   prod:    ${prodUrl}`);

  const [stagingRows, prodRows] = await Promise.all([
    fetchAllTexts(staging, 'staging'),
    fetchAllTexts(prod, 'prod'),
  ]);

  console.log(`   loaded: ${stagingRows.length} staging texts, ${prodRows.length} prod texts`);

  const stagingIdToRow = new Map(stagingRows.map((r) => [r.id, r]));
  const prodIndex = buildProdIndex(prodRows);

  // Eligible = staging row is approved (curator_note_status = 'live') and has a reviewed timestamp
  // and has a non-empty curator_note. This filter is what makes the sync safe — only YOU promoting
  // a draft in the admin UI will set status='live' + reviewed_at.
  let eligible = stagingRows.filter(
    (r) => r.curator_note_status === 'live' && r.curator_note_reviewed_at && r.curator_note,
  );

  if (args.ids && args.ids.length > 0) {
    const wanted = new Set(args.ids);
    eligible = eligible.filter((r) => wanted.has(r.id));
  }

  console.log(`   eligible (approved on staging): ${eligible.length}\n`);

  let exactMatched = 0;
  let looseMatched = 0;
  let ambiguous = 0;
  let unmatched = 0;
  let skippedAlreadyCurrent = 0;
  let synced = 0;
  let droppedRefs = 0;

  for (const stagingRow of eligible) {
    const match = findProdMatch(stagingRow, prodIndex);

    if (match.kind === 'none') {
      unmatched += 1;
      if (args.verbose) console.log(`  ⊘ unmatched: "${stagingRow.title}" (${stagingRow.author ?? '—'})`);
      continue;
    }

    if (match.kind === 'ambiguous') {
      ambiguous += 1;
      console.log(`  ⚠ ambiguous: "${stagingRow.title}" matches ${match.candidates.length} prod rows`);
      for (const c of match.candidates) console.log(`      - ${c.title} (${c.author ?? '—'})`);
      continue;
    }

    const prodRow = match.prod;

    // Skip if prod already has this exact note + reviewed timestamp.
    if (
      prodRow.curator_note === stagingRow.curator_note &&
      prodRow.curator_note_reviewed_at === stagingRow.curator_note_reviewed_at
    ) {
      skippedAlreadyCurrent += 1;
      if (args.verbose) console.log(`  · already current: "${stagingRow.title}"`);
      continue;
    }

    const { remapped, droppedTitles } = remapRelatedTexts(
      stagingRow.related_texts,
      stagingIdToRow,
      prodIndex,
    );
    droppedRefs += droppedTitles.length;

    const matchLabel = match.kind === 'exact' ? '✓' : '~';
    if (match.kind === 'exact') exactMatched += 1;
    else looseMatched += 1;

    console.log(`  ${matchLabel} ${stagingRow.title}`);
    if (match.kind === 'loose') {
      console.log(`      loose match on title (authors differ — staging: "${stagingRow.author ?? '—'}", prod: "${prodRow.author ?? '—'}")`);
    }
    if (droppedTitles.length > 0) {
      console.log(`      dropped ${droppedTitles.length} related-text refs (not in prod): ${droppedTitles.join(', ')}`);
    }
    console.log(`      → would update prod row ${prodRow.id}`);

    if (!args.apply) {
      continue;
    }

    const { error: updateError } = await prod
      .from('texts')
      .update({
        curator_note: stagingRow.curator_note,
        long_summary: stagingRow.long_summary,
        related_texts: remapped,
        curator_note_reviewed_at: stagingRow.curator_note_reviewed_at,
      })
      .eq('id', prodRow.id);

    if (updateError) {
      console.warn(`      ❌ write failed: ${updateError.message}`);
      continue;
    }
    synced += 1;
    console.log(`      💾 synced`);
  }

  console.log(`\n=========================================`);
  console.log(`Summary:`);
  console.log(`  eligible on staging:    ${eligible.length}`);
  console.log(`  exact matches:          ${exactMatched}`);
  console.log(`  loose (title-only):     ${looseMatched}`);
  console.log(`  ambiguous (skipped):    ${ambiguous}`);
  console.log(`  unmatched (skipped):    ${unmatched}`);
  console.log(`  already current:        ${skippedAlreadyCurrent}`);
  console.log(`  dropped related refs:   ${droppedRefs}`);
  if (args.apply) {
    console.log(`  rows written to prod:   ${synced}`);
  } else {
    console.log(`  (dry run — pass --apply to write)`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
