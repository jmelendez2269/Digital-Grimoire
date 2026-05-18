/**
 * Phase 2 backfill: tag every existing course with course family taxonomy fields.
 *
 * Reads the existing `content.arc` and `content.course_id_tag` to derive:
 *   - course_family    (e.g. "core-spine")
 *   - track_slug       (e.g. "arc-1-foundational")
 *   - track_order      (mirrors arc_position; 1 for entry points)
 *   - entry_point      (true for PRE / TASTER courses)
 *
 * Idempotent: re-running after apply is a no-op for already-tagged courses
 * (unless --overwrite is passed).
 *
 * Does NOT touch:
 *   - recommended_level, prerequisites, related_course_slugs, multi_family
 *     These are editorial decisions per course. Set them by hand or by
 *     uploading a fresh course markdown that includes them.
 *
 * Usage:
 *   pnpm exec tsx scripts/backfill-course-family-taxonomy.ts             # dry run
 *   pnpm exec tsx scripts/backfill-course-family-taxonomy.ts --apply     # write
 *   pnpm exec tsx scripts/backfill-course-family-taxonomy.ts --overwrite # replace existing tags
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

type CourseContent = Record<string, unknown>;

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  content: CourseContent | null;
};

const ARC_TO_TRACK: Record<string, string> = {
  'foundational synthesis': 'arc-1-foundational',
  'traditions across time': 'arc-2-traditions',
  'the practical arts': 'arc-3-practical-arts',
  'convergence & modern application': 'arc-4-convergence',
  'convergence and modern application': 'arc-4-convergence',
  'standalone entry point': 'entry-point',
  'standalone taster': 'entry-point',
};

function deriveTaxonomy(course: CourseRow): {
  course_family: string;
  track_slug: string;
  track_order: number;
  entry_point: boolean;
} | null {
  const content = (course.content ?? {}) as Record<string, unknown>;
  const arcRaw = typeof content.arc === 'string' ? content.arc : '';
  const arcKey = arcRaw.trim().toLowerCase();
  const arcPosition = typeof content.arc_position === 'number' ? content.arc_position : 1;
  const tag = typeof content.course_id_tag === 'string' ? content.course_id_tag.toUpperCase() : '';

  const trackSlug = ARC_TO_TRACK[arcKey];
  if (!trackSlug) return null;

  const isEntryPoint = trackSlug === 'entry-point';
  // PRE → 1, TASTER → 2 (mirrors taxonomy doc ordering of entry points)
  const trackOrder = isEntryPoint ? (tag === 'PRE' ? 1 : tag === 'TASTER' ? 2 : arcPosition) : arcPosition;

  return {
    course_family: 'core-spine',
    track_slug: trackSlug,
    track_order: trackOrder,
    entry_point: isEntryPoint,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const overwrite = process.argv.includes('--overwrite');

  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, slug, content')
    .order('slug', { ascending: true });

  if (error) {
    console.error('Failed to fetch courses:', error);
    process.exit(1);
  }

  if (!courses || courses.length === 0) {
    console.log('No courses found.');
    return;
  }

  const updates: Array<{ row: CourseRow; nextContent: CourseContent; summary: string }> = [];
  const skipped: string[] = [];
  const unmapped: string[] = [];

  for (const row of courses as CourseRow[]) {
    const derived = deriveTaxonomy(row);
    if (!derived) {
      unmapped.push(`${row.slug} (arc="${(row.content as Record<string, unknown> | null)?.arc ?? ''}")`);
      continue;
    }

    const content = (row.content ?? {}) as Record<string, unknown>;
    const already =
      content.course_family === derived.course_family &&
      content.track_slug === derived.track_slug &&
      content.track_order === derived.track_order &&
      content.entry_point === derived.entry_point;

    if (already || (!overwrite && content.course_family)) {
      skipped.push(`${row.slug} (already tagged: family=${String(content.course_family)}, track=${String(content.track_slug)})`);
      continue;
    }

    const nextContent: CourseContent = {
      ...content,
      course_family: derived.course_family,
      track_slug: derived.track_slug,
      track_order: derived.track_order,
      entry_point: derived.entry_point,
    };

    updates.push({
      row,
      nextContent,
      summary: `${row.slug} → family=${derived.course_family}, track=${derived.track_slug}, order=${derived.track_order}, entry=${derived.entry_point}`,
    });
  }

  console.log(`\n=== ${updates.length} course${updates.length === 1 ? '' : 's'} to update ===`);
  for (const u of updates) console.log(`  ${u.summary}`);

  if (skipped.length > 0) {
    console.log(`\n=== ${skipped.length} skipped (already tagged) ===`);
    for (const s of skipped) console.log(`  ${s}`);
  }

  if (unmapped.length > 0) {
    console.log(`\n=== ${unmapped.length} unmapped (unknown arc) ===`);
    for (const u of unmapped) console.log(`  ${u}`);
    console.log('  → these will not be touched. Add the arc to ARC_TO_TRACK if needed.');
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to write changes.');
    if (!overwrite && skipped.length > 0) {
      console.log('Add --overwrite if you want to re-tag already-tagged courses.');
    }
    return;
  }

  if (updates.length === 0) {
    console.log('\nNothing to apply.');
    return;
  }

  console.log('\nApplying...');
  let ok = 0;
  let fail = 0;
  for (const u of updates) {
    const { error: updateError } = await supabase
      .from('courses')
      .update({ content: u.nextContent })
      .eq('id', u.row.id);
    if (updateError) {
      console.error(`  FAIL ${u.row.slug}: ${updateError.message}`);
      fail++;
    } else {
      console.log(`  OK   ${u.row.slug}`);
      ok++;
    }
  }

  console.log(`\nApplied: ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
