/**
 * One-off data fix: rename "Reading the Colonizer's Record" from C15 to C16.
 *
 * Resolves a duplicate-tag situation where both this course and "Synthesis
 * as a Practice" were tagged C15. C16 was the empty slot in the sequence.
 *
 * Updates:
 *   - courses.slug:                  c15-reading-the-colonizers-record → c16-reading-the-colonizers-record
 *   - courses.content.course_id_tag: C15 → C16
 *
 * Idempotent: re-running after a successful apply is a no-op.
 *
 * Usage:
 *   pnpm exec tsx scripts/rename-colonizer-c15-to-c16.ts            # dry-run (default)
 *   pnpm exec tsx scripts/rename-colonizer-c15-to-c16.ts --apply    # write changes
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

const OLD_SLUG = 'c15-reading-the-colonizers-record';
const NEW_SLUG = 'c16-reading-the-colonizers-record';
const NEW_TAG = 'C16';

async function main() {
  const apply = process.argv.includes('--apply');

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

  const { data: course, error: fetchError } = await supabase
    .from('courses')
    .select('id, title, slug, content')
    .or(`slug.eq.${OLD_SLUG},slug.eq.${NEW_SLUG}`)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch course:', fetchError);
    process.exit(1);
  }

  if (!course) {
    console.error(`No course found with slug ${OLD_SLUG} or ${NEW_SLUG}.`);
    process.exit(1);
  }

  const content = (course.content ?? {}) as Record<string, unknown>;
  const currentTag = typeof content.course_id_tag === 'string' ? content.course_id_tag : '';
  const slugAlreadyCorrect = course.slug === NEW_SLUG;
  const tagAlreadyCorrect = currentTag === NEW_TAG;

  console.log('Found course:');
  console.log(`  id:    ${course.id}`);
  console.log(`  title: ${course.title}`);
  console.log(`  slug:  ${course.slug}${slugAlreadyCorrect ? ' (already correct)' : ` → ${NEW_SLUG}`}`);
  console.log(`  tag:   ${currentTag || '(none)'}${tagAlreadyCorrect ? ' (already correct)' : ` → ${NEW_TAG}`}`);

  if (slugAlreadyCorrect && tagAlreadyCorrect) {
    console.log('\nNothing to do — already at C16.');
    return;
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to write changes.');
    return;
  }

  // Pre-flight: make sure NEW_SLUG isn't already taken by a different course
  if (!slugAlreadyCorrect) {
    const { data: conflict } = await supabase
      .from('courses')
      .select('id, title')
      .eq('slug', NEW_SLUG)
      .neq('id', course.id)
      .maybeSingle();

    if (conflict) {
      console.error(`\nSlug ${NEW_SLUG} is already in use by another course (id=${conflict.id}, title="${conflict.title}"). Aborting.`);
      process.exit(1);
    }
  }

  const nextContent = { ...content, course_id_tag: NEW_TAG };

  const { error: updateError } = await supabase
    .from('courses')
    .update({ slug: NEW_SLUG, content: nextContent })
    .eq('id', course.id);

  if (updateError) {
    console.error('Update failed:', updateError);
    process.exit(1);
  }

  console.log('\nApplied. New state:');
  console.log(`  slug: ${NEW_SLUG}`);
  console.log(`  tag:  ${NEW_TAG}`);
  console.log('\nReminder: the /courses/c15-… → /courses/c16-… redirect is in next.config.ts.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
