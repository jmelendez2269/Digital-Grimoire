/**
 * Rebuild the staging correspondences catalog from prod.
 *
 * WARNING: Truncates staging's correspondence_relationships and correspondences
 * tables. All staging-only data in those tables will be lost.
 *
 * Syncs in order:
 *   1. correspondence_entity_types   upsert on id (38-row lookup table)
 *   2. correspondences               delete-all then insert from prod
 *   3. correspondence_relationships  delete-all then insert from prod
 *
 * Reads PROD  via PROD_SUPABASE_URL + PROD_SUPABASE_SERVICE_KEY.
 * Writes STAGING via NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   pnpm exec tsx scripts/rebuild-staging-from-prod.ts           # dry run
 *   pnpm exec tsx scripts/rebuild-staging-from-prod.ts --apply
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const PAGE = 1000;
const BATCH = 500;

function parseArgs() {
  const args = process.argv.slice(2);
  return { apply: args.includes('--apply') };
}

async function readAllPages<T>(
  client: SupabaseClient,
  table: string,
  select = '*',
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`read ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function deleteAll(client: SupabaseClient, table: string, pkCol: string) {
  // Supabase JS requires a filter for delete — gte min UUID catches all rows.
  const { error } = await client
    .from(table)
    .delete()
    .gte(pkCol, '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`delete ${table}: ${error.message}`);
}

async function insertBatched(
  client: SupabaseClient,
  table: string,
  rows: unknown[],
  label: string,
) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await client.from(table).insert(batch);
    if (error) throw new Error(`insert ${label} batch ${i}: ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`\r  ${label}: ${inserted}/${rows.length}`);
  }
  console.log();
}

(async () => {
  const { apply } = parseArgs();

  const prodUrl = process.env.PROD_SUPABASE_URL;
  const prodKey = process.env.PROD_SUPABASE_SERVICE_KEY;
  const stagingUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const stagingKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!prodUrl || !prodKey) throw new Error('Missing PROD_SUPABASE_URL or PROD_SUPABASE_SERVICE_KEY');
  if (!stagingUrl || !stagingKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

  const prod = createClient(prodUrl, prodKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const staging = createClient(stagingUrl, stagingKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  console.log(`Prod:    ${prodUrl}`);
  console.log(`Staging: ${stagingUrl}`);
  console.log();

  // --- Read from prod ---
  console.log('Reading prod data...');

  process.stdout.write('  correspondence_relationship_types... ');
  const relationshipTypes = await readAllPages(prod, 'correspondence_relationship_types');
  console.log(`${relationshipTypes.length} rows`);

  process.stdout.write('  correspondence_entity_types... ');
  const entityTypes = await readAllPages(prod, 'correspondence_entity_types');
  console.log(`${entityTypes.length} rows`);

  process.stdout.write('  correspondences... ');
  const correspondences = await readAllPages(prod, 'correspondences');
  console.log(`${correspondences.length} rows`);

  process.stdout.write('  correspondence_relationships... ');
  const relationships = await readAllPages(prod, 'correspondence_relationships');
  console.log(`${relationships.length} rows`);

  console.log();
  console.log('Summary:');
  console.log(`  correspondence_relationship_types: ${relationshipTypes.length}`);
  console.log(`  correspondence_entity_types      : ${entityTypes.length}`);
  console.log(`  correspondences                  : ${correspondences.length}`);
  console.log(`  correspondence_relationships     : ${relationships.length}`);
  console.log();

  if (!apply) {
    console.log('DRY RUN — pass --apply to write to staging.');
    return;
  }

  // --- Write to staging ---
  console.log('Writing to staging...');

  // Delete in FK order: relationships → correspondences → entity_types → relationship_types
  process.stdout.write('  deleting correspondence_relationships... ');
  await deleteAll(staging, 'correspondence_relationships', 'id');
  console.log('done');

  process.stdout.write('  deleting correspondences... ');
  await deleteAll(staging, 'correspondences', 'id');
  console.log('done');

  process.stdout.write('  deleting correspondence_entity_types... ');
  const { error: etDelErr } = await staging
    .from('correspondence_entity_types')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');
  if (etDelErr) throw new Error(`delete correspondence_entity_types: ${etDelErr.message}`);
  console.log('done');

  process.stdout.write('  deleting correspondence_relationship_types... ');
  const { error: rtDelErr } = await staging
    .from('correspondence_relationship_types')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');
  if (rtDelErr) throw new Error(`delete correspondence_relationship_types: ${rtDelErr.message}`);
  console.log('done');

  // Insert in reverse FK order: relationship_types → entity_types → correspondences → relationships
  await insertBatched(staging, 'correspondence_relationship_types', relationshipTypes, 'correspondence_relationship_types');
  await insertBatched(staging, 'correspondence_entity_types', entityTypes, 'correspondence_entity_types');
  await insertBatched(staging, 'correspondences', correspondences, 'correspondences');
  await insertBatched(staging, 'correspondence_relationships', relationships, 'correspondence_relationships');

  console.log();
  console.log('Staging rebuild complete.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
