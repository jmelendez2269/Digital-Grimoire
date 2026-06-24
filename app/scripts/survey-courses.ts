/**
 * One-shot diagnostic: list every course with its title, premise, core
 * question, and the high-level shape of its weeks/readings. Used to map
 * external source candidates (Kunz, Vivekananda, Jastrow, Cunningham,
 * etc.) against existing course curricula.
 *
 * Usage:
 *   pnpm exec tsx scripts/survey-courses.ts
 *   pnpm exec tsx scripts/survey-courses.ts --detail   # also list every reading
 *   pnpm exec tsx scripts/survey-courses.ts --json out.json
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const detail = argv.includes('--detail');
  const jsonIdx = argv.indexOf('--json');
  const jsonOut = jsonIdx >= 0 ? argv[jsonIdx + 1] : null;

  const supabase = createService();
  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, title, content')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`courses: ${error.message}`);
  if (!data || data.length === 0) {
    console.log('No courses found.');
    return;
  }

  const summary = data.map((c) => {
    const content = (c.content as any) || {};
    const weeks = Array.isArray(content.weeks) ? content.weeks : [];
    return {
      slug: c.slug,
      title: c.title,
      premise: typeof content.premise === 'string' ? content.premise : '',
      core_question: typeof content.core_question === 'string' ? content.core_question : '',
      week_count: weeks.length,
      reading_count: weeks.reduce(
        (n: number, w: any) => n + (Array.isArray(w?.readings) ? w.readings.length : 0),
        0,
      ),
      weeks: weeks.map((w: any) => ({
        week_number: w.week_number,
        title: w.title,
        core_question: w.core_question,
        key_tension: w.key_tension,
        lens_focus: w.lens_focus,
        reading_count: Array.isArray(w?.readings) ? w.readings.length : 0,
        readings: Array.isArray(w?.readings)
          ? w.readings.map((r: any) => ({
              reading_id: r.reading_id,
              title: r.title,
              author: r.author,
              section: r.section,
            }))
          : [],
      })),
    };
  });

  console.log(`\nCourses survey — ${summary.length} course(s)\n`);
  console.log('='.repeat(120));
  for (const c of summary) {
    console.log(`\n[${c.slug}] ${c.title}`);
    console.log(`  weeks: ${c.week_count}, readings: ${c.reading_count}`);
    if (c.premise) console.log(`  premise: ${c.premise.slice(0, 280)}${c.premise.length > 280 ? '…' : ''}`);
    if (c.core_question) console.log(`  core Q: ${c.core_question.slice(0, 240)}${c.core_question.length > 240 ? '…' : ''}`);
    if (detail) {
      for (const w of c.weeks) {
        console.log(`    W${w.week_number}: ${w.title}`);
        if (w.core_question) {
          console.log(`       Q: ${(w.core_question as string).slice(0, 180)}`);
        }
        if (Array.isArray(w.lens_focus) && w.lens_focus.length > 0) {
          console.log(`       lenses: ${w.lens_focus.join(', ')}`);
        }
        for (const r of w.readings) {
          const auth = r.author ? ` — ${r.author}` : '';
          console.log(`       · ${r.title}${auth}`);
        }
      }
    }
  }

  if (jsonOut) {
    fs.writeFileSync(path.resolve(process.cwd(), jsonOut), JSON.stringify(summary, null, 2), 'utf8');
    console.log(`\n📝 Wrote full JSON: ${path.resolve(process.cwd(), jsonOut)}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
