/**
 * One-off warm-up for the course_texts fuzzy-match cache.
 *
 * `matchAndPersistCourseTexts` (src/lib/courses/match-course-texts.ts) now
 * writes its fuzzy-match result into `course_texts` the first time a course
 * is requested without existing rows there. This script just does that pass
 * for every course up front, instead of waiting for it to happen lazily on
 * real page loads (which is what made the Courses tab slow).
 *
 * Uses the same matching logic as the live API routes (no duplicated logic,
 * unlike the older scripts/backfill-course-texts.js).
 *
 * Usage:
 *   pnpm exec tsx scripts/warm-course-texts.ts --dry-run   (default)
 *   pnpm exec tsx scripts/warm-course-texts.ts --apply
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { createServiceClient } from '../src/lib/supabase/service';
import { matchAndPersistCourseTexts, matchCourseTextsFromContent } from '../src/lib/courses/match-course-texts';

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  content: unknown;
  course_texts: { id: string }[] | null;
};

function parseArgs(argv: string[]) {
  return { apply: argv.includes('--apply') };
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const supabase = createServiceClient();

  console.log(`course_texts warm-up — mode=${apply ? 'apply' : 'dry-run'}`);

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, slug, title, content, course_texts(id)')
    .order('title', { ascending: true });

  if (error) throw new Error(`fetch courses: ${error.message}`);
  if (!courses || courses.length === 0) {
    console.log('No courses found.');
    return;
  }

  let alreadyWarm = 0;
  let matched = 0;
  let noCandidates = 0;
  let noMatch = 0;
  let failed = 0;

  for (const course of courses as unknown as CourseRow[]) {
    if (Array.isArray(course.course_texts) && course.course_texts.length > 0) {
      alreadyWarm += 1;
      continue;
    }

    try {
      if (!apply) {
        // Dry run: reuse the read-only matcher so nothing is written.
        const preview = await matchCourseTextsFromContent(supabase, course.content as never);
        if (preview.length === 0) {
          noCandidates += 1;
          console.log(`  (dry) no match: ${course.title}`);
        } else {
          matched += 1;
          console.log(`  (dry) would link ${preview.length} text(s) -> ${course.title}`);
        }
        continue;
      }

      const result = await matchAndPersistCourseTexts(supabase, course.id, course.content as never);
      if (result.length === 0) {
        noMatch += 1;
        console.log(`  no match: ${course.title}`);
      } else {
        matched += 1;
        console.log(`  linked ${result.length} text(s) -> ${course.title}`);
      }
    } catch (err) {
      failed += 1;
      console.error(`  FAILED: ${course.title}`, err);
    }
  }

  console.log('\n=========================================');
  console.log(`Courses scanned: ${courses.length}`);
  console.log(`Already warm (had course_texts): ${alreadyWarm}`);
  console.log(`Matched: ${matched}`);
  console.log(`No candidates / no match: ${noCandidates + noMatch}`);
  console.log(`Failed: ${failed}`);
  if (!apply) {
    console.log('(dry run — re-run with --apply to write)');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
