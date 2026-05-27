import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type ParsedArgs = {
  apply: boolean;
  skipTexts: boolean;
  skipCourses: boolean;
  skipBlurbs: boolean;
  verbose: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    apply: false,
    skipTexts: false,
    skipCourses: false,
    skipBlurbs: false,
    verbose: false,
  };
  for (const arg of argv) {
    if (arg === '--apply') out.apply = true;
    else if (arg === '--verbose' || arg === '-v') out.verbose = true;
    else if (arg === '--skip-texts') out.skipTexts = true;
    else if (arg === '--skip-courses') out.skipCourses = true;
    else if (arg === '--skip-blurbs') out.skipBlurbs = true;
  }
  return out;
}

function printHelp() {
  console.log(`Sync books (texts) and courses from staging to production.

Reads STAGING from NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
Reads PRODUCTION from PROD_SUPABASE_URL + PROD_SUPABASE_SERVICE_KEY.

What this syncs:
  - public.texts          UPSERT on id (staging wins on conflict).
                          content + embedding are NULLed on insert so prod can
                          re-derive them via the existing reprocess pipeline;
                          when staging overwrites an existing prod row we keep
                          prod's content/embedding by reading them back first.
                          uploaded_by is remapped staging-user-id -> prod-user-id
                          by matching public.users.email. parent_id is applied
                          in a second pass so children can reference parents
                          that were inserted in the same run.
  - public.courses        UPSERT on id (staging wins on conflict).
  - public.reading_blurbs UPSERT on reading_id.
  - public.course_texts   SKIPPED. Staging is a strict subset of prod here;
                          syncing would either be a no-op or destructive.

Usage:
  pnpm exec tsx scripts/sync-books-and-courses-to-prod.ts             # dry run
  pnpm exec tsx scripts/sync-books-and-courses-to-prod.ts --apply     # write to prod

Flags:
  --apply          Write to prod. Without this, dry-run only.
  --skip-texts     Don't touch the texts table.
  --skip-courses   Don't touch the courses table.
  --skip-blurbs    Don't touch the reading_blurbs table.
  --verbose, -v    Print per-row decisions.
  --help, -h       Show this message.
`);
}

const CHUNK = 25;

async function chunkedSelectByIds<T>(
  client: SupabaseClient,
  table: string,
  idColumn: string,
  ids: string[],
  columns: string,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await client.from(table).select(columns).in(idColumn, slice);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    if (data) out.push(...(data as T[]));
  }
  return out;
}

async function chunkedUpsert<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  rows: T[],
  conflictColumn: string,
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error, count } = await client
      .from(table)
      .upsert(slice, { onConflict: conflictColumn, count: 'exact' });
    if (error) throw new Error(`upsert ${table} chunk ${i}: ${error.message}`);
    written += count ?? slice.length;
  }
  return written;
}

async function buildUserEmailMap(client: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await client.from('users').select('id,email');
  if (error) throw new Error(`select users: ${error.message}`);
  const out = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; email: string | null }[]) {
    if (row.email) out.set(row.email.toLowerCase(), row.id);
  }
  return out;
}

async function syncTexts(staging: SupabaseClient, prod: SupabaseClient, apply: boolean, verbose: boolean) {
  console.log(`\n📚 Syncing texts…`);

  // 1. Build staging user-id -> email map, then resolve to prod user-id via email.
  const [stagingUsers, prodUsers] = await Promise.all([
    staging.from('users').select('id,email'),
    prod.from('users').select('id,email'),
  ]);
  if (stagingUsers.error) throw new Error(`staging users: ${stagingUsers.error.message}`);
  if (prodUsers.error) throw new Error(`prod users: ${prodUsers.error.message}`);

  const stagingUserIdToEmail = new Map<string, string>();
  for (const u of (stagingUsers.data ?? []) as { id: string; email: string | null }[]) {
    if (u.email) stagingUserIdToEmail.set(u.id, u.email.toLowerCase());
  }
  const prodEmailToUserId = new Map<string, string>();
  for (const u of (prodUsers.data ?? []) as { id: string; email: string | null }[]) {
    if (u.email) prodEmailToUserId.set(u.email.toLowerCase(), u.id);
  }

  const mapUploader = (stagingUserId: string | null): string | null => {
    if (!stagingUserId) return null;
    const email = stagingUserIdToEmail.get(stagingUserId);
    if (!email) return null;
    return prodEmailToUserId.get(email) ?? null;
  };

  // 2. Pull all staging text rows (minus content + embedding to keep payloads sane).
  const stagingColumns = [
    'id', 'title', 'summary', 's3_key', 'mime_type', 'file_size', 'type', 'author', 'year',
    'publisher', 'license', 'domain', 'confidence', 'source_url', 'tags', 'associated_names',
    'metadata', 'uploaded_by', 'status', 'created_at', 'updated_at', 'short_summary',
    'long_summary', 'lenses', 'cover_source', 'source_format', 'cover_image_url',
    'curator_note', 'cover_status', 'cover_last_checked', 'parent_id', 'curator_note_draft',
    'long_summary_draft', 'curator_note_status', 'related_texts', 'curator_note_reviewed_at',
    'curator_note_reviewed_by',
  ].join(',');
  const { data: stagingTextsRaw, error: stagingErr } = await staging
    .from('texts')
    .select(stagingColumns)
    .order('parent_id', { ascending: true, nullsFirst: true });
  if (stagingErr) throw new Error(`staging texts: ${stagingErr.message}`);
  const stagingTexts = (stagingTextsRaw ?? []) as Record<string, unknown>[];
  console.log(`   staging texts: ${stagingTexts.length}`);

  // 3. Find which staging ids already exist in prod — those rows we want to preserve
  //    prod's content + embedding (since we're not shipping content blobs).
  const stagingIds = stagingTexts.map((r) => String(r.id));
  const existingProdRows = await chunkedSelectByIds<{ id: string; content: string | null; embedding: unknown }>(
    prod, 'texts', 'id', stagingIds, 'id,content,embedding',
  );
  const existingProd = new Map<string, { content: string | null; embedding: unknown }>();
  for (const r of existingProdRows) existingProd.set(r.id, { content: r.content, embedding: r.embedding });
  console.log(`   overlap with prod: ${existingProd.size}`);
  console.log(`   new in prod:       ${stagingTexts.length - existingProd.size}`);

  // 4. Prepare rows for upsert.
  //    Pass 1: insert with parent_id = NULL so children don't fail FK before parents land.
  //    Pass 2: update parent_id from staging values.
  let unmappedUploaders = 0;
  const pass1Rows = stagingTexts.map((row) => {
    const stagingUploader = (row.uploaded_by as string | null) ?? null;
    const mappedUploader = mapUploader(stagingUploader);
    if (stagingUploader && !mappedUploader) unmappedUploaders += 1;
    const existing = existingProd.get(String(row.id));
    return {
      ...row,
      uploaded_by: mappedUploader,
      parent_id: null,
      // Preserve prod's content/embedding if the row already exists; otherwise insert NULL.
      content: existing?.content ?? null,
      embedding: existing?.embedding ?? null,
    };
  });

  if (unmappedUploaders > 0) {
    console.log(`   ⚠ ${unmappedUploaders} staging rows had an uploaded_by that doesn't match any prod user email — those will be NULLed.`);
  }

  const parentUpdates = stagingTexts
    .filter((r) => r.parent_id)
    .map((r) => ({ id: String(r.id), parent_id: String(r.parent_id) }));

  console.log(`   pass 1 rows (upsert):       ${pass1Rows.length}`);
  console.log(`   pass 2 rows (parent_id):    ${parentUpdates.length}`);

  if (verbose) {
    const sample = pass1Rows.slice(0, 3).map((r) => ({ id: r.id, title: r.title, uploaded_by: r.uploaded_by }));
    console.log(`   sample: ${JSON.stringify(sample, null, 2)}`);
  }

  if (!apply) {
    console.log(`   (dry run — pass --apply to write)`);
    return;
  }

  console.log(`   writing pass 1…`);
  const wrote1 = await chunkedUpsert(prod, 'texts', pass1Rows, 'id');
  console.log(`   pass 1 wrote: ${wrote1}`);

  console.log(`   writing pass 2 (parent_id)…`);
  let wrote2 = 0;
  let failed2 = 0;
  for (const row of parentUpdates) {
    const { error } = await prod.from('texts').update({ parent_id: row.parent_id }).eq('id', row.id);
    if (error) {
      failed2 += 1;
      console.warn(`     ❌ ${row.id}: ${error.message}`);
    } else {
      wrote2 += 1;
    }
  }
  console.log(`   pass 2 wrote: ${wrote2}${failed2 ? `, failed: ${failed2}` : ''}`);
}

async function syncCourses(staging: SupabaseClient, prod: SupabaseClient, apply: boolean) {
  console.log(`\n🎓 Syncing courses…`);
  const { data, error } = await staging.from('courses').select('*');
  if (error) throw new Error(`staging courses: ${error.message}`);
  const rows = (data ?? []) as Record<string, unknown>[];
  console.log(`   staging courses: ${rows.length}`);

  if (!apply) {
    console.log(`   (dry run — pass --apply to write)`);
    return;
  }

  const wrote = await chunkedUpsert(prod, 'courses', rows, 'id');
  console.log(`   wrote: ${wrote}`);
}

async function syncReadingBlurbs(staging: SupabaseClient, prod: SupabaseClient, apply: boolean) {
  console.log(`\n📖 Syncing reading_blurbs…`);
  const { data, error } = await staging.from('reading_blurbs').select('*');
  if (error) throw new Error(`staging reading_blurbs: ${error.message}`);
  const rows = (data ?? []) as Record<string, unknown>[];
  console.log(`   staging reading_blurbs: ${rows.length}`);

  if (!apply) {
    console.log(`   (dry run — pass --apply to write)`);
    return;
  }

  const wrote = await chunkedUpsert(prod, 'reading_blurbs', rows, 'reading_id');
  console.log(`   wrote: ${wrote}`);
}

async function printCounts(staging: SupabaseClient, prod: SupabaseClient) {
  console.log(`\n📊 Final counts`);
  const tables: { name: string; pk: string }[] = [
    { name: 'texts', pk: 'id' },
    { name: 'courses', pk: 'id' },
    { name: 'reading_blurbs', pk: 'reading_id' },
    { name: 'course_texts', pk: 'id' },
  ];
  for (const { name: t, pk } of tables) {
    const [s, p] = await Promise.all([
      staging.from(t).select(pk, { count: 'exact', head: true }),
      prod.from(t).select(pk, { count: 'exact', head: true }),
    ]);
    const stagingCount = s.error ? `err(${s.error.message})` : String(s.count);
    const prodCount = p.error ? `err(${p.error.message})` : String(p.count);
    console.log(`   ${t.padEnd(18)} staging=${stagingCount.padStart(4)}  prod=${prodCount.padStart(4)}`);
  }
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

  console.log(`🔄 Sync books + courses — staging → prod, apply=${args.apply}`);
  console.log(`   staging: ${stagingUrl}`);
  console.log(`   prod:    ${prodUrl}`);

  if (!args.skipTexts) await syncTexts(staging, prod, args.apply, args.verbose);
  if (!args.skipCourses) await syncCourses(staging, prod, args.apply);
  if (!args.skipBlurbs) await syncReadingBlurbs(staging, prod, args.apply);

  await printCounts(staging, prod);

  if (!args.apply) {
    console.log(`\n(dry run — re-run with --apply to write to prod)`);
  } else {
    console.log(`\n✅ done.`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
