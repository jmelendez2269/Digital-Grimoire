import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type ParsedArgs = {
  inputPath?: string;
  apply: boolean;
  listMissing: boolean;
  publishedOnly: boolean;
  overwrite: boolean;
};

type CourseContent = Record<string, unknown>;

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  sort_order: number | null;
  content: CourseContent | null;
};

type NoteInput = {
  id?: string;
  slug?: string;
  course_id_tag?: string;
  title?: string;
  curator_note_public?: string;
  note?: string;
};

type NoteFile = NoteInput[] | { notes: NoteInput[] };

function printHelp() {
  console.log(`Backfill Curator's Notes into already-uploaded courses.

Usage:
  pnpm exec tsx scripts/backfill-course-curator-notes.ts --list-missing
  pnpm exec tsx scripts/backfill-course-curator-notes.ts --input <notes.json>
  pnpm exec tsx scripts/backfill-course-curator-notes.ts --input <notes.json> --apply

Options:
  --input, -i       JSON file containing notes keyed by slug, id, course_id_tag, or title
  --list-missing   Print a JSON starter file for courses missing curator_note_public
  --apply          Write changes to Supabase. Omit for preview-only dry run
  --include-drafts Include draft courses. By default, only published courses are targeted
  --overwrite      Replace existing curator notes. By default, existing notes are skipped
  --help, -h       Show this help message
`);
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const parsed: ParsedArgs = {
    apply: false,
    listMissing: false,
    publishedOnly: true,
    overwrite: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if ((arg === '--input' || arg === '-i') && args[i + 1]) {
      parsed.inputPath = args[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--apply') {
      parsed.apply = true;
      continue;
    }

    if (arg === '--list-missing') {
      parsed.listMissing = true;
      continue;
    }

    if (arg === '--include-drafts') {
      parsed.publishedOnly = false;
      continue;
    }

    if (arg === '--overwrite') {
      parsed.overwrite = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.listMissing && !parsed.inputPath) {
    throw new Error('Missing --input <notes.json>. Use --list-missing to generate a starter file.');
  }

  return parsed;
}

function createServiceClientFromEnv(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local');
  }

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

function getCuratorNote(content: CourseContent | null | undefined): string {
  const note = content?.curator_note_public || content?.curator_note;
  return typeof note === 'string' ? note.trim() : '';
}

function getCourseIdTag(content: CourseContent | null | undefined): string {
  const tag = content?.course_id_tag;
  return typeof tag === 'string' ? tag.trim().toUpperCase() : '';
}

function normalize(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function readNoteFile(inputPath: string): NoteInput[] {
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw) as NoteFile;
  return Array.isArray(parsed) ? parsed : parsed.notes || [];
}

async function fetchCourses(supabase: SupabaseClient, publishedOnly: boolean): Promise<CourseRow[]> {
  let query = supabase
    .from('courses')
    .select('id, title, slug, is_published, sort_order, content')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (publishedOnly) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []) as CourseRow[];
}

function resolveCourse(note: NoteInput, courses: CourseRow[]): CourseRow | undefined {
  if (note.id) {
    const byId = courses.find((course) => course.id === note.id);
    if (byId) return byId;
  }

  if (note.slug) {
    const bySlug = courses.find((course) => course.slug === note.slug);
    if (bySlug) return bySlug;
  }

  if (note.course_id_tag) {
    const wantedTag = note.course_id_tag.trim().toUpperCase();
    const byTag = courses.find((course) => getCourseIdTag(course.content) === wantedTag);
    if (byTag) return byTag;
  }

  if (note.title) {
    const wantedTitle = normalize(note.title);
    return courses.find((course) => normalize(course.title) === wantedTitle);
  }

  return undefined;
}

async function updateCourseNote(
  supabase: SupabaseClient,
  course: CourseRow,
  note: string
): Promise<void> {
  const nextContent: CourseContent = {
    ...(course.content || {}),
    curator_note_public: note.trim(),
  };
  delete nextContent.curator_note;

  const { error } = await supabase
    .from('courses')
    .update({
      content: nextContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', course.id);

  if (error) throw error;
}

async function main() {
  const args = parseArgs();
  dotenv.config({ path: path.join(__dirname, '../.env.local') });

  const supabase = createServiceClientFromEnv();
  const courses = await fetchCourses(supabase, args.publishedOnly);

  if (args.listMissing) {
    const missing = courses.filter((course) => !getCuratorNote(course.content));
    console.log(JSON.stringify({
      notes: missing.map((course) => ({
        slug: course.slug,
        course_id_tag: getCourseIdTag(course.content) || undefined,
        title: course.title,
        curator_note_public: '',
      })),
    }, null, 2));
    console.error(`Found ${missing.length} ${args.publishedOnly ? 'published ' : ''}courses missing curator notes.`);
    return;
  }

  const notes = readNoteFile(args.inputPath!);
  let planned = 0;
  let skipped = 0;
  let updated = 0;

  for (const noteInput of notes) {
    const note = (noteInput.curator_note_public || noteInput.note || '').trim();
    const course = resolveCourse(noteInput, courses);

    if (!course) {
      skipped += 1;
      console.warn(`Skipped: no matching course for ${JSON.stringify(noteInput)}`);
      continue;
    }

    if (!note) {
      skipped += 1;
      console.warn(`Skipped ${course.title}: empty curator note`);
      continue;
    }

    const existingNote = getCuratorNote(course.content);
    if (existingNote && !args.overwrite) {
      skipped += 1;
      console.log(`Skipped ${course.title}: curator note already exists`);
      continue;
    }

    planned += 1;
    const action = args.apply ? 'Updating' : 'Would update';
    console.log(`${action} ${course.title} (${course.slug})`);

    if (args.apply) {
      await updateCourseNote(supabase, course, note);
      updated += 1;
    }
  }

  if (!args.apply) {
    console.log(`Preview only: ${planned} planned, ${skipped} skipped. Re-run with --apply to write changes.`);
    return;
  }

  console.log(`Done: ${updated} updated, ${skipped} skipped.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
