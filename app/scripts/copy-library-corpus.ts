import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type EnvMap = Record<string, string>;

type TextRow = {
  id: string;
  title: string;
  content: string | null;
  summary: string | null;
  short_summary?: string | null;
  long_summary?: string | null;
  s3_key: string | null;
  type: string | null;
  author: string | null;
  year: number | null;
  publisher: string | null;
  license?: string | null;
  domain: string | null;
  confidence: string | null;
  source_url?: string | null;
  tags: unknown;
  lenses?: unknown;
  curator_note?: string | null;
  cover_image_url?: string | null;
  cover_source?: string | null;
  status: string | null;
  uploaded_by?: string | null;
  source_format?: string | null;
  metadata: Record<string, unknown> | null;
  embedding?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
};

type ParsedArgs = {
  sourceEnv: string;
  limit: number | null;
  dryRun: boolean;
  skipFiles: boolean;
  onlyMissing: boolean;
};

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let sourceEnv = '';
  let limit: number | null = null;
  let dryRun = false;
  let skipFiles = false;
  let onlyMissing = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if ((arg === '--source-env' || arg === '-s') && args[i + 1]) {
      sourceEnv = args[i + 1];
      i += 1;
      continue;
    }

    if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i += 1;
      continue;
    }

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--skip-files') {
      skipFiles = true;
      continue;
    }

    if (arg === '--only-missing') {
      onlyMissing = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!sourceEnv) {
    throw new Error('Missing required --source-env <path-to-source-env-file>');
  }

  return {
    sourceEnv,
    limit,
    dryRun,
    skipFiles,
    onlyMissing,
  };
}

function printHelp() {
  console.log(`Copy the library corpus from a source instance into the current target env.

Usage:
  pnpm exec tsx scripts/copy-library-corpus.ts --source-env <path> [options]

Options:
  --source-env, -s   Path to the source instance env file
  --limit, -l        Copy only the first N texts
  --dry-run          Show what would be copied without writing
  --skip-files       Copy database rows only, not R2 objects
  --only-missing     Skip texts whose ids already exist in the target
  --help, -h         Show this help message
`);
}

function loadEnvFile(filePath: string): EnvMap {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Env file not found: ${absolutePath}`);
  }

  const parsed = dotenv.parse(fs.readFileSync(absolutePath, 'utf8'));
  return parsed;
}

function getRequiredEnv(env: EnvMap, key: string): string {
  const value = env[key] || process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function getBucketName(env: EnvMap): string {
  return env.R2_BUCKET_NAME
    || process.env.R2_BUCKET_NAME
    || env.AWS_S3_BUCKET
    || process.env.AWS_S3_BUCKET
    || 'convergence-library';
}

function getProjectRefFromUrl(url: string): string | null {
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || null;
}

function getProjectRefFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { ref?: string; role?: string };
    return payload.ref || null;
  } catch {
    return null;
  }
}

function getJwtRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { ref?: string; role?: string };
    return payload.role || null;
  } catch {
    return null;
  }
}

function validateSupabaseEnv(env: EnvMap, label: string): void {
  const supabaseUrl = getRequiredEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = getRequiredEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');

  if (supabaseServiceKey.split('.').length !== 3) {
    throw new Error(
      `${label} SUPABASE_SERVICE_ROLE_KEY is not a JWT token. It looks like you may have pasted the project ref or another non-key value. Use the full service_role key from the Supabase dashboard for ${supabaseUrl}.`,
    );
  }

  const urlRef = getProjectRefFromUrl(supabaseUrl);
  const keyRef = getProjectRefFromJwt(supabaseServiceKey);
  const role = getJwtRole(supabaseServiceKey);

  if (role && role !== 'service_role') {
    throw new Error(
      `${label} SUPABASE_SERVICE_ROLE_KEY has role "${role}", not "service_role". Use the service_role key from the Supabase dashboard for ${supabaseUrl}.`,
    );
  }

  if (urlRef && keyRef && urlRef !== keyRef) {
    throw new Error(
      `${label} Supabase project mismatch: URL points to "${urlRef}" but service key belongs to "${keyRef}". Replace SUPABASE_SERVICE_ROLE_KEY with the service_role key from ${supabaseUrl}.`,
    );
  }
}

function createServiceClientFromEnv(env: EnvMap): SupabaseClient {
  const supabaseUrl = getRequiredEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = getRequiredEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        apikey: supabaseServiceKey,
      },
    },
  });
}

function createR2ClientFromEnv(env: EnvMap): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: getRequiredEnv(env, 'R2_ENDPOINT'),
    credentials: {
      accessKeyId: getRequiredEnv(env, 'R2_ACCESS_KEY_ID'),
      secretAccessKey: getRequiredEnv(env, 'R2_SECRET_ACCESS_KEY'),
    },
  });
}

function buildMetadataFileKey(text: TextRow): string | null {
  const metadata = text.metadata || {};
  const fromMetadata = metadata.metadataFileKey;
  return typeof fromMetadata === 'string' && fromMetadata.trim() ? fromMetadata : null;
}

function collectFileKeys(text: TextRow): string[] {
  const keys = new Set<string>();

  if (text.s3_key) {
    keys.add(text.s3_key);
  }

  const metadataKey = buildMetadataFileKey(text);
  if (metadataKey) {
    keys.add(metadataKey);
  }

  return Array.from(keys);
}

async function fetchAllTexts(client: SupabaseClient, limit: number | null): Promise<TextRow[]> {
  const batchSize = 500;
  let from = 0;
  let hasMore = true;
  const rows: TextRow[] = [];

  while (hasMore) {
    const to = from + batchSize - 1;
    const { data, error } = await client
      .from('texts')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const batch = (data || []) as TextRow[];
    rows.push(...batch);

    if (batch.length < batchSize || (limit !== null && rows.length >= limit)) {
      hasMore = false;
    } else {
      from += batchSize;
    }
  }

  return limit !== null ? rows.slice(0, limit) : rows;
}

async function fetchExistingTargetIds(client: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  const batchSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await client
      .from('texts')
      .select('id')
      .order('created_at', { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) {
      throw error;
    }

    const batch = data || [];
    for (const row of batch) {
      if (row.id) {
        ids.add(row.id as string);
      }
    }

    if (batch.length < batchSize) {
      hasMore = false;
    } else {
      from += batchSize;
    }
  }

  return ids;
}

function sanitizeTextForInsert(text: TextRow): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...text,
    uploaded_by: null,
    embedding: null,
  };

  return payload;
}

async function objectExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function copyObjectBetweenBuckets(
  sourceClient: S3Client,
  sourceBucket: string,
  targetClient: S3Client,
  targetBucket: string,
  key: string,
): Promise<void> {
  const objectResponse = await sourceClient.send(
    new GetObjectCommand({
      Bucket: sourceBucket,
      Key: key,
    }),
  );

  if (!objectResponse.Body) {
    throw new Error(`Source object ${key} returned no body`);
  }

  const bodyBytes = await objectResponse.Body.transformToByteArray();

  await targetClient.send(
    new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: Buffer.from(bodyBytes),
      ContentType: objectResponse.ContentType,
    }),
  );
}

async function main() {
  const { sourceEnv, limit, dryRun, skipFiles, onlyMissing } = parseArgs();

  dotenv.config({ path: path.join(__dirname, '../.env.local') });

  const sourceEnvMap = loadEnvFile(sourceEnv);
  const targetEnvMap: EnvMap = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    R2_ENDPOINT: process.env.R2_ENDPOINT || '',
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'convergence-library',
  };

  validateSupabaseEnv(sourceEnvMap, 'Source');
  validateSupabaseEnv(targetEnvMap, 'Target');

  const sourceSupabase = createServiceClientFromEnv(sourceEnvMap);
  const targetSupabase = createServiceClientFromEnv(targetEnvMap);

  const sourceBucket = getBucketName(sourceEnvMap);
  const targetBucket = getBucketName(targetEnvMap);
  const sourceR2 = createR2ClientFromEnv(sourceEnvMap);
  const targetR2 = createR2ClientFromEnv(targetEnvMap);

  const sourceUrl = getRequiredEnv(sourceEnvMap, 'NEXT_PUBLIC_SUPABASE_URL');
  const targetUrl = getRequiredEnv(targetEnvMap, 'NEXT_PUBLIC_SUPABASE_URL');

  const sourceTexts = await fetchAllTexts(sourceSupabase, limit);
  const existingTargetIds = await fetchExistingTargetIds(targetSupabase);
  const filteredTexts = onlyMissing
    ? sourceTexts.filter((text) => !existingTargetIds.has(text.id))
    : sourceTexts;

  let copiedTexts = 0;
  let skippedTexts = 0;
  let copiedFiles = 0;
  let skippedFiles = 0;

  console.log(`Source Supabase: ${sourceUrl}`);
  console.log(`Target Supabase: ${targetUrl}`);
  console.log(`Source bucket: ${sourceBucket}`);
  console.log(`Target bucket: ${targetBucket}`);
  console.log(`Texts selected from source: ${sourceTexts.length}`);
  console.log(`Texts to process: ${filteredTexts.length}`);

  for (const text of filteredTexts) {
    const exists = existingTargetIds.has(text.id);
    if (onlyMissing && exists) {
      skippedTexts += 1;
      continue;
    }

    if (!dryRun) {
      const payload = sanitizeTextForInsert(text);
      const { error } = await targetSupabase
        .from('texts')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        throw new Error(`Failed to upsert text ${text.id} (${text.title}): ${error.message}`);
      }
    }

    copiedTexts += 1;

    if (skipFiles) {
      continue;
    }

    for (const key of collectFileKeys(text)) {
      const targetHasObject = await objectExists(targetR2, targetBucket, key);
      if (targetHasObject) {
        skippedFiles += 1;
        continue;
      }

      if (!dryRun) {
        await copyObjectBetweenBuckets(sourceR2, sourceBucket, targetR2, targetBucket, key);
      }
      copiedFiles += 1;
    }
  }

  console.log('Library corpus copy complete');
  console.log(
    JSON.stringify(
      {
        dryRun,
        copiedTexts,
        skippedTexts,
        copiedFiles,
        skippedFiles,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('Library corpus copy failed:', error);
  process.exit(1);
});