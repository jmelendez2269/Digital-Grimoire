import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type EnvMap = Record<string, string>;

type ParsedArgs = {
  sourceEnv: string;
  dryRun: boolean;
  onlyMissing: boolean;
};

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  premise: string | null;
  learning_outcomes: unknown;
  course_type: string | null;
  level: string | null;
  duration_weeks: number | null;
  content: unknown;
  is_published: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  sort_order?: number | null;
};

type CourseTextRow = {
  id: string;
  course_id: string;
  text_id: string;
  week_number: number | null;
  selection_notes: string | null;
  is_required: boolean | null;
  created_at?: string | null;
  details?: string | null;
};

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let sourceEnv = '';
  let dryRun = false;
  let onlyMissing = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if ((arg === '--source-env' || arg === '-s') && args[i + 1]) {
      sourceEnv = args[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--dry-run') {
      dryRun = true;
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

  return { sourceEnv, dryRun, onlyMissing };
}

function printHelp() {
  console.log(`Copy courses and course-text links from a source instance into the current target env.

Usage:
  pnpm exec tsx scripts/copy-courses.ts --source-env <path> [options]

Options:
  --source-env, -s   Path to the source instance env file
  --dry-run          Show what would be copied without writing
  --only-missing     Skip courses whose ids already exist in the target
  --help, -h         Show this help message
`);
}

function loadEnvFile(filePath: string): EnvMap {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Env file not found: ${absolutePath}`);
  }

  return dotenv.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function getRequiredEnv(env: EnvMap, key: string): string {
  const value = env[key] || process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function getProjectRefFromUrl(url: string): string | null {
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || null;
}

function decodeJwtPayload(token: string): { ref?: string; role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { ref?: string; role?: string };
  } catch {
    return null;
  }
}

function validateSupabaseEnv(env: EnvMap, label: string): void {
  const supabaseUrl = getRequiredEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = getRequiredEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');

  if (supabaseServiceKey.split('.').length !== 3) {
    throw new Error(
      `${label} SUPABASE_SERVICE_ROLE_KEY is not a JWT token. Use the full service_role key from the Supabase dashboard for ${supabaseUrl}.`,
    );
  }

  const urlRef = getProjectRefFromUrl(supabaseUrl);
  const payload = decodeJwtPayload(supabaseServiceKey);
  const keyRef = payload?.ref || null;
  const role = payload?.role || null;

  if (role && role !== 'service_role') {
    throw new Error(`${label} SUPABASE_SERVICE_ROLE_KEY has role "${role}", not "service_role".`);
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

async function fetchAllCourses(client: SupabaseClient): Promise<CourseRow[]> {
  const { data, error } = await client.from('courses').select('*').order('created_at', { ascending: true });
  if (error) {
    throw error;
  }
  return (data || []) as CourseRow[];
}

async function fetchAllCourseTexts(client: SupabaseClient): Promise<CourseTextRow[]> {
  const { data, error } = await client.from('course_texts').select('*').order('created_at', { ascending: true });
  if (error) {
    throw error;
  }
  return (data || []) as CourseTextRow[];
}

async function fetchExistingCourseIds(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client.from('courses').select('id');
  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.id as string));
}

async function fetchExistingTextIds(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client.from('texts').select('id');
  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.id as string));
}

async function fetchExistingCourseTextIds(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client.from('course_texts').select('id');
  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.id as string));
}

async function main() {
  const { sourceEnv, dryRun, onlyMissing } = parseArgs();

  dotenv.config({ path: path.join(__dirname, '../.env.local') });

  const sourceEnvMap = loadEnvFile(sourceEnv);
  const targetEnvMap: EnvMap = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };

  validateSupabaseEnv(sourceEnvMap, 'Source');
  validateSupabaseEnv(targetEnvMap, 'Target');

  const sourceSupabase = createServiceClientFromEnv(sourceEnvMap);
  const targetSupabase = createServiceClientFromEnv(targetEnvMap);

  const sourceUrl = getRequiredEnv(sourceEnvMap, 'NEXT_PUBLIC_SUPABASE_URL');
  const targetUrl = getRequiredEnv(targetEnvMap, 'NEXT_PUBLIC_SUPABASE_URL');

  const sourceCourses = await fetchAllCourses(sourceSupabase);
  const sourceCourseTexts = await fetchAllCourseTexts(sourceSupabase);
  const existingCourseIds = await fetchExistingCourseIds(targetSupabase);
  const existingTextIds = await fetchExistingTextIds(targetSupabase);
  const existingCourseTextIds = await fetchExistingCourseTextIds(targetSupabase);

  const coursesToProcess = onlyMissing
    ? sourceCourses.filter((course) => !existingCourseIds.has(course.id))
    : sourceCourses;

  const courseIdsToProcess = new Set(coursesToProcess.map((course) => course.id));
  const courseTextsToProcess = sourceCourseTexts.filter((link) => courseIdsToProcess.has(link.course_id));
  const filteredCourseTexts = courseTextsToProcess.filter((link) => existingTextIds.has(link.text_id));
  const skippedLinksMissingTexts = courseTextsToProcess.length - filteredCourseTexts.length;

  console.log(`Source Supabase: ${sourceUrl}`);
  console.log(`Target Supabase: ${targetUrl}`);
  console.log(`Courses selected from source: ${sourceCourses.length}`);
  console.log(`Courses to process: ${coursesToProcess.length}`);
  console.log(`Course-text links to process: ${filteredCourseTexts.length}`);

  if (!dryRun && coursesToProcess.length > 0) {
    const { error } = await targetSupabase.from('courses').upsert(coursesToProcess, { onConflict: 'id' });
    if (error) {
      throw new Error(`Failed to copy courses: ${error.message}`);
    }
  }

  const linksToInsert = filteredCourseTexts.filter((link) => !existingCourseTextIds.has(link.id));
  if (!dryRun && linksToInsert.length > 0) {
    const { error } = await targetSupabase.from('course_texts').upsert(linksToInsert, { onConflict: 'id' });
    if (error) {
      throw new Error(`Failed to copy course-text links: ${error.message}`);
    }
  }

  console.log('Course copy complete');
  console.log(
    JSON.stringify(
      {
        dryRun,
        copiedCourses: coursesToProcess.length,
        skippedCourses: sourceCourses.length - coursesToProcess.length,
        copiedCourseTexts: linksToInsert.length,
        skippedCourseTexts: filteredCourseTexts.length - linksToInsert.length,
        skippedLinksMissingTexts,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('Course copy failed:', error);
  process.exit(1);
});