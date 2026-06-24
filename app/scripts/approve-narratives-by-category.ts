/**
 * Approve narrative drafts by category.
 *
 * Copies narrative_draft → description and flips narrative_status to
 * 'approved' for all draft entities in the chosen category (or all
 * categories at once). Only entities with status='draft' and a non-trivial
 * draft (>50 chars) are touched.
 *
 * Reads/writes prod by default. Pass --db staging to target staging instead.
 *
 * Usage:
 *   pnpm exec tsx scripts/approve-narratives-by-category.ts --list
 *   pnpm exec tsx scripts/approve-narratives-by-category.ts --category stone --dry-run
 *   pnpm exec tsx scripts/approve-narratives-by-category.ts --category stone
 *   pnpm exec tsx scripts/approve-narratives-by-category.ts --all --dry-run
 *   pnpm exec tsx scripts/approve-narratives-by-category.ts --all
 *   pnpm exec tsx scripts/approve-narratives-by-category.ts --all --db staging
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MIN_DRAFT_LEN = 50;
const BATCH = 200;

type Args = {
  list: boolean;
  all: boolean;
  category: string | null;
  dryRun: boolean;
  db: 'prod' | 'staging';
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const out: Args = { list: false, all: false, category: null, dryRun: false, db: 'prod' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--list') out.list = true;
    else if (arg === '--all') out.all = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--category' && argv[i + 1]) out.category = argv[++i];
    else if (arg === '--db' && argv[i + 1]) out.db = argv[++i] as 'prod' | 'staging';
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

async function getCategoryCounts(client: SupabaseClient): Promise<Map<string, number>> {
  const PAGE = 1000;
  const counts = new Map<string, number>();
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from('correspondences')
      .select('category, narrative_draft')
      .eq('narrative_status', 'draft')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch drafts: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      if ((row.narrative_draft?.length ?? 0) >= MIN_DRAFT_LEN) {
        counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return counts;
}

async function approveCategory(
  client: SupabaseClient,
  category: string,
  dryRun: boolean,
): Promise<number> {
  // Fetch IDs + drafts for this category
  const PAGE = 1000;
  const rows: { id: string; narrative_draft: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from('correspondences')
      .select('id, narrative_draft')
      .eq('category', category)
      .eq('narrative_status', 'draft')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch ${category}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      if ((row.narrative_draft?.length ?? 0) >= MIN_DRAFT_LEN) {
        rows.push({ id: row.id, narrative_draft: row.narrative_draft });
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (rows.length === 0) return 0;
  if (dryRun) return rows.length;

  // Update in batches
  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const ids = batch.map((r) => r.id);

    // We need per-row description values, so update one at a time within each batch
    // but group rows that share the same draft text to reduce round-trips.
    // In practice each entity has a unique draft, so we update individually.
    // For speed we'll use Promise.all with small concurrency.
    const updates = batch.map((row) =>
      client
        .from('correspondences')
        .update({
          description: row.narrative_draft,
          narrative_status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .then(({ error }) => {
          if (error) throw new Error(`update ${row.id}: ${error.message}`);
        }),
    );

    // Run in chunks of 20 concurrent requests
    const CONCURRENCY = 20;
    for (let j = 0; j < updates.length; j += CONCURRENCY) {
      await Promise.all(updates.slice(j, j + CONCURRENCY));
    }
    updated += batch.length;
    process.stdout.write(`\r  ${category}: ${updated}/${rows.length}`);
  }
  console.log();
  return rows.length;
}

(async () => {
  const args = parseArgs();

  if (!args.list && !args.all && !args.category) {
    console.log(`Usage:
  --list                   show draft counts per category
  --category <name>        approve one category
  --all                    approve all categories
  --dry-run                preview without writing
  --db prod|staging        default: prod`);
    process.exit(0);
  }

  const client = makeClient(args.db);
  console.log(`DB: ${args.db}  |  dry-run: ${args.dryRun}`);
  console.log();

  // --- --list ---
  if (args.list) {
    console.log('Fetching draft counts...');
    const counts = await getCategoryCounts(client);
    const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let total = 0;
    console.log('\nCategory                         drafts-ready');
    console.log('─'.repeat(48));
    for (const [cat, n] of sorted) {
      console.log(`  ${cat.padEnd(32)} ${n}`);
      total += n;
    }
    console.log('─'.repeat(48));
    console.log(`  ${'TOTAL'.padEnd(32)} ${total}`);
    return;
  }

  // --- --category or --all ---
  let categories: string[];

  if (args.all) {
    console.log('Fetching category list...');
    const counts = await getCategoryCounts(client);
    categories = [...counts.keys()].sort();
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    console.log(`  ${categories.length} categories, ${total} entities to approve`);
    if (!args.dryRun) {
      console.log();
      // Brief confirmation pause so accidental --all doesn't run silently
      console.log('Starting in 3 seconds... (Ctrl-C to abort)');
      await new Promise((r) => setTimeout(r, 3000));
    }
  } else {
    categories = [args.category!];
  }

  console.log();
  let grandTotal = 0;

  for (const cat of categories) {
    const n = await approveCategory(client, cat, args.dryRun);
    console.log(`  ${cat}: ${n} ${args.dryRun ? '(dry run)' : 'approved'}`);
    grandTotal += n;
  }

  console.log();
  if (args.dryRun) {
    console.log(`DRY RUN — ${grandTotal} entities would be approved. Pass without --dry-run to apply.`);
  } else {
    console.log(`Done. ${grandTotal} entities approved.`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
