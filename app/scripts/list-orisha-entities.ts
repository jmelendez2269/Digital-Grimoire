/**
 * One-shot: list every orisha-category entity with its name + aliases, and
 * also report whether Vivekananda's text_chunks are present (for later
 * mudra/yoga_pose backfill decision).
 *
 * Usage:
 *   pnpm exec tsx scripts/list-orisha-entities.ts
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const VIVEKANANDA_ID = '4ceb7c95-333d-4dcb-841f-b1cf5c3ddd9a';

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function main() {
  const supabase = createService();

  const { data: orishas, error: orishaErr } = await supabase
    .from('correspondences')
    .select('id, slug, name, aliases, narrative_status')
    .eq('category', 'orisha')
    .order('name', { ascending: true });
  if (orishaErr) throw new Error(`orisha fetch: ${orishaErr.message}`);

  console.log(`\n=== orisha entities (${orishas?.length ?? 0}) ===\n`);
  for (const e of orishas ?? []) {
    const aliasList = (e.aliases ?? []).join(', ') || '(no aliases)';
    console.log(`  • ${e.name}`);
    console.log(`      slug: ${e.slug}`);
    console.log(`      aliases: ${aliasList}`);
    console.log(`      status: ${e.narrative_status}`);
  }

  const { count: vivChunks, error: vivErr } = await supabase
    .from('text_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('text_id', VIVEKANANDA_ID);
  if (vivErr) throw new Error(`vivekananda chunk count: ${vivErr.message}`);
  console.log(`\n=== Vivekananda text_chunks: ${vivChunks ?? 0} ===`);

  const { data: vivText } = await supabase
    .from('texts')
    .select('id, title, content')
    .eq('id', VIVEKANANDA_ID)
    .maybeSingle();
  const contentLen = vivText?.content?.length ?? 0;
  console.log(`  texts.content length: ${contentLen.toLocaleString()} chars`);
  console.log(`  title: ${vivText?.title ?? '(none)'}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
