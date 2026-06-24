/**
 * Read-only diff: which entities exist in prod but not staging (and vice
 * versa), grouped by category. Helps locate where the 431-entity gap lives.
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function loadAll(s: SupabaseClient, label: string): Promise<Map<string, { name: string; category: string }>> {
  const out = new Map<string, { name: string; category: string }>();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await s
      .from('correspondences')
      .select('slug, name, category')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) out.set(r.slug, { name: r.name, category: r.category });
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

(async () => {
  const staging = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );
  const prod = createClient(
    process.env.PROD_SUPABASE_URL!,
    process.env.PROD_SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  console.log('Loading staging + prod entities (slug-keyed)...');
  const [s, p] = await Promise.all([loadAll(staging, 'staging'), loadAll(prod, 'prod')]);
  console.log(`  staging: ${s.size}, prod: ${p.size}`);

  // Prod-only slugs (exist in prod, missing from staging).
  const prodOnly: Array<{ slug: string; name: string; category: string }> = [];
  for (const [slug, info] of p) {
    if (!s.has(slug)) prodOnly.push({ slug, ...info });
  }
  // Staging-only slugs (exist in staging, missing from prod).
  const stagingOnly: Array<{ slug: string; name: string; category: string }> = [];
  for (const [slug, info] of s) {
    if (!p.has(slug)) stagingOnly.push({ slug, ...info });
  }

  console.log(`\nProd-only entities: ${prodOnly.length}`);
  const prodByCat = new Map<string, number>();
  for (const r of prodOnly) prodByCat.set(r.category, (prodByCat.get(r.category) ?? 0) + 1);
  console.log('  by category:');
  for (const [c, n] of [...prodByCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${c}`);
  }

  console.log(`\nStaging-only entities: ${stagingOnly.length}`);
  const stagingByCat = new Map<string, number>();
  for (const r of stagingOnly) stagingByCat.set(r.category, (stagingByCat.get(r.category) ?? 0) + 1);
  console.log('  by category:');
  for (const [c, n] of [...stagingByCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${c}`);
  }

  // Sample 10 prod-only entries from the biggest gap categories to see what they look like.
  console.log('\nSample 15 prod-only entities (from biggest gap categories):');
  for (const r of prodOnly.slice(0, 15)) {
    console.log(`  ${r.category}/${r.slug}  ::  ${r.name}`);
  }

  if (stagingOnly.length > 0 && stagingOnly.length <= 30) {
    console.log('\nAll staging-only entities:');
    for (const r of stagingOnly) {
      console.log(`  ${r.category}/${r.slug}  ::  ${r.name}`);
    }
  }
})();
