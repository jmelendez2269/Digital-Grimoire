/**
 * Read-only duplicate detector. For a given category (or all), groups
 * entities by likely-duplicate signals and prints the clusters worth
 * reviewing.
 *
 * Signals it detects:
 *   1. EXACT normalized-name collision  — "AMBER" and "Amber" become one cluster
 *   2. STRIPPED-PARENS collision        — "Amber" and "Amber (magical)" cluster
 *   3. SLUG-PREFIX collision            — "amber" vs "stone-amber"
 *   4. ALL-CAPS DATE-PREFIX style       — "APRIL 22 - EARTH DAY" vs "Earth Day"
 *   5. LEVENSHTEIN-1 typo               — "Ambar" vs "Amber"
 *
 * Each cluster of 2+ entities is a candidate for merging. The script does
 * NOT propose which canonical wins — that's a manual call.
 *
 * Usage:
 *   pnpm exec tsx scripts/audit-entity-duplicates.ts                    # all categories
 *   pnpm exec tsx scripts/audit-entity-duplicates.ts --category stone   # one category
 *   pnpm exec tsx scripts/audit-entity-duplicates.ts --db prod          # against prod
 *   pnpm exec tsx scripts/audit-entity-duplicates.ts --json out.json    # emit machine-readable report
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

type Entity = {
  id: string;
  slug: string;
  name: string;
  category: string;
  aliases: string[] | null;
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/^\d+(?:st|nd|rd|th)\s+day\s+of\s+\S+\s*(?:\([^)]+\))?\s*/i, '')
    .replace(/^[a-z]+\s+\d+(?:\s+(?:or|to)\s+\d+)?\s*-?\s*/i, '') // "april 22 - " or "december 21 or 22 -"
    .replace(/\s*\([^)]*\)\s*/g, ' ') // drop parentheticals
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stripParens(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').toLowerCase().trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function buildClient(args: { db: 'staging' | 'prod' }): SupabaseClient {
  const url =
    args.db === 'prod' ? process.env.PROD_SUPABASE_URL! : process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    args.db === 'prod' ? process.env.PROD_SUPABASE_SERVICE_KEY! : process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function loadEntities(s: SupabaseClient, category: string | null): Promise<Entity[]> {
  const PAGE = 1000;
  const out: Entity[] = [];
  let from = 0;
  while (true) {
    let q = s
      .from('correspondences')
      .select('id, slug, name, category, aliases')
      .range(from, from + PAGE - 1);
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...(data as Entity[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

type Cluster = {
  key: string;
  reason: string;
  entities: Entity[];
};

function findClusters(entities: Entity[]): Cluster[] {
  const byNormalized = new Map<string, Entity[]>();
  const byParensStripped = new Map<string, Entity[]>();
  const bySlugStem = new Map<string, Entity[]>();

  for (const e of entities) {
    const n = normalizeName(e.name);
    if (n.length > 0) {
      const k = `${e.category}|${n}`;
      const list = byNormalized.get(k) ?? [];
      list.push(e);
      byNormalized.set(k, list);
    }

    const p = stripParens(e.name);
    if (p.length > 0) {
      const k = `${e.category}|${p}`;
      const list = byParensStripped.get(k) ?? [];
      list.push(e);
      byParensStripped.set(k, list);
    }

    // Slug stem: drop "category-" prefix if present.
    const stem = e.slug.replace(new RegExp(`^${e.category}-`), '');
    const k = `${e.category}|${stem}`;
    const list = bySlugStem.get(k) ?? [];
    list.push(e);
    bySlugStem.set(k, list);
  }

  const clusters: Cluster[] = [];
  const seen = new Set<string>(); // entity-id pairs we've already grouped

  const addCluster = (key: string, reason: string, list: Entity[]) => {
    if (list.length < 2) return;
    const idsKey = list
      .map((e) => e.id)
      .sort()
      .join(',');
    if (seen.has(idsKey)) return;
    seen.add(idsKey);
    clusters.push({ key, reason, entities: list });
  };

  for (const [k, list] of byNormalized) addCluster(k, 'normalized-name', list);
  for (const [k, list] of byParensStripped) addCluster(k, 'parens-stripped', list);
  for (const [k, list] of bySlugStem) addCluster(k, 'slug-stem', list);

  // Levenshtein-1 typos within the same category. O(N^2) per category — fine
  // for our sizes (largest category is ~456 stones).
  const byCategory = new Map<string, Entity[]>();
  for (const e of entities) {
    const list = byCategory.get(e.category) ?? [];
    list.push(e);
    byCategory.set(e.category, list);
  }
  for (const [cat, list] of byCategory) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const aNorm = normalizeName(a.name);
      if (aNorm.length < 4) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const bNorm = normalizeName(b.name);
        if (bNorm.length < 4) continue;
        if (aNorm === bNorm) continue; // already handled by normalized-name cluster
        if (Math.abs(aNorm.length - bNorm.length) > 1) continue;
        const d = levenshtein(aNorm, bNorm);
        if (d === 1) {
          addCluster(`${cat}|typo|${aNorm}|${bNorm}`, 'levenshtein-1 typo', [a, b]);
        }
      }
    }
  }

  return clusters;
}

(async () => {
  const argv = process.argv.slice(2);
  const catIdx = argv.indexOf('--category');
  const category = catIdx >= 0 ? argv[catIdx + 1] : null;
  const dbIdx = argv.indexOf('--db');
  const db = (dbIdx >= 0 ? argv[dbIdx + 1] : 'staging') as 'staging' | 'prod';
  const jsonIdx = argv.indexOf('--json');
  const jsonOut = jsonIdx >= 0 ? argv[jsonIdx + 1] : null;

  console.log(`DB: ${db}${category ? `, category=${category}` : ', ALL categories'}`);
  const s = buildClient({ db });
  const entities = await loadEntities(s, category);
  console.log(`Loaded ${entities.length} entities.`);

  const clusters = findClusters(entities);
  console.log(`\nFound ${clusters.length} candidate duplicate cluster(s).`);

  // Group by category for the per-category summary.
  const byCategory = new Map<string, Cluster[]>();
  for (const c of clusters) {
    const cat = c.entities[0].category;
    const list = byCategory.get(cat) ?? [];
    list.push(c);
    byCategory.set(cat, list);
  }

  console.log('\nClusters per category (top 20):');
  const sortedCats = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [cat, list] of sortedCats.slice(0, 20)) {
    const totalEntities = list.reduce((n, c) => n + c.entities.length, 0);
    console.log(`  ${String(list.length).padStart(4)} cluster(s) / ${String(totalEntities).padStart(4)} entities  ${cat}`);
  }

  // For each category, print the actual clusters.
  if (category) {
    console.log(`\n=== ${category} clusters ===`);
    for (const c of clusters) {
      console.log(`\n  [${c.reason}]  key=${c.key}`);
      for (const e of c.entities) {
        console.log(`    • slug=${e.slug}  name="${e.name}"`);
      }
    }
  } else {
    // Print just the worst offenders.
    const big = clusters.filter((c) => c.entities.length >= 3).sort((a, b) => b.entities.length - a.entities.length);
    console.log(`\nClusters of 3+ entities (worst offenders): ${big.length}`);
    for (const c of big.slice(0, 20)) {
      console.log(`\n  [${c.reason}]  ${c.entities.length} entities`);
      for (const e of c.entities) {
        console.log(`    • ${e.category}/${e.slug}  "${e.name}"`);
      }
    }
  }

  if (jsonOut) {
    const payload = clusters.map((c) => ({
      key: c.key,
      reason: c.reason,
      entities: c.entities.map((e) => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        category: e.category,
      })),
    }));
    fs.writeFileSync(path.resolve(process.cwd(), jsonOut), JSON.stringify(payload, null, 2), 'utf8');
    console.log(`\nWrote ${jsonOut}`);
  }
})();
