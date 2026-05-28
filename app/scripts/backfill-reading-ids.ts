/**
 * Backfill a stable `reading_id` slug onto every reading inside
 * `courses.content` JSONB.
 *
 * The slug is the join key for the `reading_blurbs` table. Slugs are
 * stable across reorders and title renames, so blurbs stay bound to the
 * right reading. Idempotent: existing reading_ids are preserved unless
 * --overwrite is passed.
 *
 * Usage:
 *   pnpm exec tsx scripts/backfill-reading-ids.ts --dry-run
 *   pnpm exec tsx scripts/backfill-reading-ids.ts --apply
 *   pnpm exec tsx scripts/backfill-reading-ids.ts --course c06-the-hermetic-tradition --apply
 *   pnpm exec tsx scripts/backfill-reading-ids.ts --overwrite --apply   # regenerate all (orphans blurbs)
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type Args = {
  apply: boolean;
  course: string | null;
  overwrite: boolean;
};

type Reading = {
  reading_id?: string;
  sort_order?: number;
  title?: string;
  author?: string;
  section?: string;
  selection_rationale?: string;
  tiers?: unknown;
  [key: string]: unknown;
};

type Week = {
  week_number?: number;
  title?: string;
  readings?: Reading[];
  [key: string]: unknown;
};

type CourseContent = {
  course_id_tag?: string;
  weeks?: Week[];
  [key: string]: unknown;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  content: CourseContent | null;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { apply: false, course: null, overwrite: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--dry-run') out.apply = false;
    else if (a === '--overwrite') out.overwrite = true;
    else if (a === '--course') {
      out.course = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function printHelp() {
  console.log(`Backfill reading_id slugs into every reading inside courses.content.

Usage:
  pnpm exec tsx scripts/backfill-reading-ids.ts --dry-run
  pnpm exec tsx scripts/backfill-reading-ids.ts --apply
  pnpm exec tsx scripts/backfill-reading-ids.ts --course <slug> --apply
  pnpm exec tsx scripts/backfill-reading-ids.ts --overwrite --apply

Flags:
  --dry-run     (default) Print proposed slugs without writing
  --apply       Write the updated content JSONB back to Supabase
  --course      Limit to one course by slug
  --overwrite   Regenerate reading_ids even where one exists (orphans existing reading_blurbs)
`);
}

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function kebab(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')           // strip combining diacritics
    .toLowerCase()
    .replace(/['‘’]/g, '')           // drop apostrophes (don't introduce a hyphen)
    .replace(/[^a-z0-9]+/g, '-')               // any other non-alphanumeric run -> hyphen
    .replace(/^-+|-+$/g, '')                   // trim leading/trailing hyphens
    .slice(0, 80);                             // cap length so slugs stay readable
}

function coursePrefix(course: CourseRow): string {
  // Prefer the course_id_tag (C06) lowercased; fall back to the slug if absent.
  const tag = course.content?.course_id_tag;
  if (typeof tag === 'string' && /^C\d{2}$/i.test(tag.trim())) {
    return tag.trim().toLowerCase();
  }
  return course.slug;
}

type ProposedChange = {
  course_slug: string;
  course_title: string;
  week_number: number;
  reading_index: number;
  reading_title: string;
  previous_id: string | null;
  new_id: string;
};

function planCourse(course: CourseRow, overwrite: boolean): { updatedContent: CourseContent | null; changes: ProposedChange[] } {
  const content = course.content;
  if (!content || !Array.isArray(content.weeks)) {
    return { updatedContent: null, changes: [] };
  }

  const prefix = coursePrefix(course);
  const changes: ProposedChange[] = [];
  // Deep clone so we don't mutate the in-memory row until we know we want to write it.
  const nextContent: CourseContent = JSON.parse(JSON.stringify(content));

  for (const week of nextContent.weeks ?? []) {
    const wn = typeof week.week_number === 'number' ? week.week_number : null;
    if (wn === null || !Array.isArray(week.readings)) continue;

    const usedInWeek = new Set<string>();
    week.readings.forEach((reading, idx) => {
      const hasExisting = typeof reading.reading_id === 'string' && reading.reading_id.length > 0;
      if (hasExisting && !overwrite) {
        usedInWeek.add(reading.reading_id as string);
        return;
      }

      const title = (reading.title ?? '').trim();
      if (!title) {
        // Skip readings with no title — they can't produce a meaningful slug.
        return;
      }

      const baseSlug = `${prefix}-w${wn}-${kebab(title)}`;
      let slug = baseSlug;
      let suffix = 2;
      while (usedInWeek.has(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }
      usedInWeek.add(slug);

      changes.push({
        course_slug: course.slug,
        course_title: course.title,
        week_number: wn,
        reading_index: idx,
        reading_title: title,
        previous_id: hasExisting ? (reading.reading_id as string) : null,
        new_id: slug,
      });
      reading.reading_id = slug;
    });
  }

  return { updatedContent: changes.length > 0 ? nextContent : null, changes };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService();

  console.log(`reading_id backfill — apply=${args.apply} overwrite=${args.overwrite}${args.course ? ` course=${args.course}` : ''}`);

  let query = supabase
    .from('courses')
    .select('id, slug, title, content')
    .order('sort_order', { ascending: true });

  if (args.course) {
    query = query.eq('slug', args.course);
  }

  const { data: courses, error } = await query;
  if (error) throw new Error(`fetch courses: ${error.message}`);
  if (!courses || courses.length === 0) {
    console.log('No courses found.');
    return;
  }

  const allChanges: ProposedChange[] = [];
  let writeCount = 0;
  let writeFailCount = 0;

  for (const course of courses as CourseRow[]) {
    const { updatedContent, changes } = planCourse(course, args.overwrite);
    if (changes.length === 0) {
      continue;
    }

    console.log(`\n— ${course.title} (${course.slug}) — ${changes.length} slug(s)`);
    for (const c of changes) {
      const arrow = c.previous_id ? `${c.previous_id}  →  ${c.new_id}` : `+ ${c.new_id}`;
      console.log(`  w${c.week_number} r${c.reading_index}: ${c.reading_title}`);
      console.log(`      ${arrow}`);
    }
    allChanges.push(...changes);

    if (args.apply && updatedContent) {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ content: updatedContent })
        .eq('id', course.id);
      if (updateError) {
        writeFailCount += 1;
        console.warn(`  ❌ write failed: ${updateError.message}`);
      } else {
        writeCount += 1;
        console.log(`  💾 written`);
      }
    }
  }

  console.log(`\n=========================================`);
  console.log(`Courses scanned: ${courses.length}`);
  console.log(`Slugs proposed: ${allChanges.length}`);
  if (args.apply) {
    console.log(`Courses written: ${writeCount} (failed: ${writeFailCount})`);
  } else {
    console.log(`(dry run — re-run with --apply to write)`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
