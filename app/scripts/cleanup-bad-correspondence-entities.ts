import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/supabase/service';
import { isSentenceLikeEntityName } from '../src/lib/graph/entity-utils';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type Args = {
  category?: string;
  execute: boolean;
  confirmCount?: number;
  reportPath?: string;
  slugsFile?: string;
};

type CandidateEntity = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
};

type RelationshipRow = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
};

async function selectAllPages<T>(
  queryFactory: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await queryFactory(from, to);
    if (error) throw error;

    const batch = data || [];
    if (batch.length === 0) break;

    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Args = {
    execute: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--execute') {
      parsed.execute = true;
      continue;
    }

    if (arg === '--category' && next) {
      parsed.category = next;
      index += 1;
      continue;
    }

    if (arg === '--confirm-count' && next) {
      parsed.confirmCount = Number(next);
      index += 1;
      continue;
    }

    if (arg === '--report' && next) {
      parsed.reportPath = next;
      index += 1;
      continue;
    }

    if (arg === '--slugs-file' && next) {
      parsed.slugsFile = next;
      index += 1;
    }
  }

  if (parsed.execute && typeof parsed.confirmCount !== 'number') {
    throw new Error('Refusing to execute without --confirm-count <expected-candidate-count>');
  }

  return parsed;
}

function normalizeSlugListFile(filePath: string): Set<string> {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) {
    return new Set();
  }

  if (raw.startsWith('[')) {
    const values = JSON.parse(raw);
    if (!Array.isArray(values)) {
      throw new Error(`Expected JSON array in ${filePath}`);
    }
    return new Set(values.map((value) => String(value).trim()).filter(Boolean));
  }

  return new Set(
    raw
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function summarizeByCategory(entities: CandidateEntity[]) {
  const counts = new Map<string, number>();

  for (const entity of entities) {
    const key = entity.category || 'uncategorized';
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

async function main() {
  const args = parseArgs();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local');
  }

  const supabase = createServiceClient();
  const slugAllowlist = args.slugsFile
    ? normalizeSlugListFile(path.resolve(process.cwd(), args.slugsFile))
    : null;

  const entities = await selectAllPages<CandidateEntity>((from, to) =>
    supabase
      .from('correspondences')
      .select('id, slug, name, category')
      .order('slug', { ascending: true })
      .range(from, to),
  );

  const candidateEntities = (entities || [])
    .filter((entity) => slugAllowlist || isSentenceLikeEntityName(entity.name))
    .filter((entity) => !args.category || entity.category === args.category)
    .filter((entity) => !slugAllowlist || slugAllowlist.has(entity.slug)) as CandidateEntity[];

  const candidateIds = new Set(candidateEntities.map((entity) => entity.id));

  const relationships = await selectAllPages<RelationshipRow>((from, to) =>
    supabase
      .from('correspondence_relationships')
      .select('id, source_id, target_id, type')
      .range(from, to),
  );

  const affectedRelationships = relationships.filter(
    (relationship) => candidateIds.has(relationship.source_id) || candidateIds.has(relationship.target_id),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    filters: {
      category: args.category || null,
      slugsFile: args.slugsFile || null,
      execute: args.execute,
    },
    candidates: {
      count: candidateEntities.length,
      byCategory: summarizeByCategory(candidateEntities),
      sample: candidateEntities.slice(0, 50),
    },
    relationships: {
      affectedCount: affectedRelationships.length,
      sample: affectedRelationships.slice(0, 50),
    },
  };

  if (args.reportPath) {
    const resolvedReportPath = path.resolve(process.cwd(), args.reportPath);
    fs.mkdirSync(path.dirname(resolvedReportPath), { recursive: true });
    fs.writeFileSync(resolvedReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify(report, null, 2));

  if (!args.execute) {
    console.log('\nDry run only. Re-run with --execute --confirm-count <count> once you have reviewed the candidates.');
    return;
  }

  if (candidateEntities.length !== args.confirmCount) {
    throw new Error(
      `Refusing to delete because candidate count ${candidateEntities.length} does not match --confirm-count ${args.confirmCount}`,
    );
  }

  if (candidateEntities.length === 0) {
    console.log('No matching candidate entities found. Nothing to delete.');
    return;
  }

  const candidateIdList = candidateEntities.map((entity) => entity.id);

  const { error: sourceRelationshipDeleteError } = await supabase
    .from('correspondence_relationships')
    .delete()
    .in('source_id', candidateIdList);
  if (sourceRelationshipDeleteError) throw sourceRelationshipDeleteError;

  const { error: targetRelationshipDeleteError } = await supabase
    .from('correspondence_relationships')
    .delete()
    .in('target_id', candidateIdList);
  if (targetRelationshipDeleteError) throw targetRelationshipDeleteError;

  const { error: claimDeleteError } = await supabase
    .from('knowledge_claims')
    .delete()
    .eq('entity_type', 'correspondence')
    .in('entity_id', candidateIdList);
  if (claimDeleteError) throw claimDeleteError;

  const { error: entityDeleteError } = await supabase
    .from('correspondences')
    .delete()
    .in('id', candidateIdList);
  if (entityDeleteError) throw entityDeleteError;

  console.log(
    JSON.stringify(
      {
        deletedEntityCount: candidateEntities.length,
        deletedEntitySlugs: candidateEntities.map((entity) => entity.slug),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
