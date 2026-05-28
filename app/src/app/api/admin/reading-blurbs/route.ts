import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

type ReadingTier = { reference?: string; description?: string };
type ContentReading = {
  reading_id?: string;
  title?: string;
  author?: string;
  section?: string;
  selection_rationale?: string;
  tiers?: { keystone?: ReadingTier; passage?: ReadingTier; full?: ReadingTier };
};
type LensExercise = { prompt?: string; instructions?: string[] };
type SynthesisPrompt = { prompt?: string; expansion?: string[] };
type MicroArtifact = { name?: string; description?: string; purpose?: string; capstone_connection?: string };

type ContentWeek = {
  week_number?: number;
  title?: string;
  core_question?: string;
  key_tension?: string | { side_a?: string; side_b?: string; description?: string };
  lens_focus?: string[];
  readings?: ContentReading[];
  lens_exercise?: LensExercise;
  synthesis_prompt?: SynthesisPrompt;
  micro_artifact?: MicroArtifact;
};
type CourseContent = { weeks?: ContentWeek[] };
type CourseRow = { slug: string; title: string; content: CourseContent | null };

function formatTension(t: ContentWeek['key_tension']): string {
  if (!t) return '';
  if (typeof t === 'string') return t;
  const a = t.side_a ?? '';
  const b = t.side_b ?? '';
  const desc = t.description ? ` — ${t.description}` : '';
  return a && b ? `${a} vs ${b}${desc}` : desc.replace(/^ — /, '');
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: drafts, error } = await service
    .from('reading_blurbs')
    .select(
      'reading_id, course_slug, week_number, text_title, blurb_live, blurb_draft, status, reviewed_at, updated_at',
    )
    .eq('status', 'draft_pending')
    .order('course_slug', { ascending: true })
    .order('week_number', { ascending: true })
    .order('text_title', { ascending: true });

  if (error) {
    console.error('[admin reading-blurbs list] fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = drafts ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ drafts: [] });
  }

  // Fetch course content for every course referenced by the drafts, then attach
  // the week and reading context to each row so reviewers can judge the blurb
  // without having to open the course separately.
  const slugs = Array.from(new Set(rows.map((r) => r.course_slug)));
  const { data: courses, error: courseError } = await service
    .from('courses')
    .select('slug, title, content')
    .in('slug', slugs);

  if (courseError) {
    console.error('[admin reading-blurbs list] course context error:', courseError);
    // Fall back to bare drafts rather than failing the request.
    return NextResponse.json({ drafts: rows });
  }

  const courseMap = new Map<string, CourseRow>();
  for (const c of (courses ?? []) as CourseRow[]) {
    courseMap.set(c.slug, c);
  }

  const enriched = rows.map((row) => {
    const course = courseMap.get(row.course_slug);
    const week = course?.content?.weeks?.find((w) => w.week_number === row.week_number);
    const reading = week?.readings?.find((r) => r.reading_id === row.reading_id);
    return {
      ...row,
      course_title: course?.title ?? null,
      week_title: week?.title ?? null,
      week_core_question: week?.core_question ?? null,
      week_key_tension: week ? formatTension(week.key_tension) : null,
      reading_author: reading?.author ?? null,
      reading_section: reading?.section ?? null,
      selection_rationale: reading?.selection_rationale ?? null,
      keystone_reference: reading?.tiers?.keystone?.reference ?? null,
      keystone_description: reading?.tiers?.keystone?.description ?? null,
      passage_reference: reading?.tiers?.passage?.reference ?? null,
      passage_description: reading?.tiers?.passage?.description ?? null,
      // The week's actual coursework — what the digest has to enable.
      lens_exercise_prompt: week?.lens_exercise?.prompt ?? null,
      lens_exercise_instructions: week?.lens_exercise?.instructions ?? null,
      synthesis_prompt: week?.synthesis_prompt?.prompt ?? null,
      synthesis_expansion: week?.synthesis_prompt?.expansion ?? null,
      micro_artifact_name: week?.micro_artifact?.name ?? null,
      micro_artifact_description: week?.micro_artifact?.description ?? null,
      micro_artifact_purpose: week?.micro_artifact?.purpose ?? null,
      // Sibling readings — what else the week leans on so this digest doesn't
      // have to carry context another reading already covers.
      sibling_readings:
        week?.readings
          ?.filter((r) => r.reading_id !== row.reading_id)
          .map((r) => ({
            reading_id: r.reading_id ?? null,
            title: r.title ?? '',
            author: r.author ?? null,
            section: r.section ?? null,
            selection_rationale: r.selection_rationale ?? null,
          })) ?? [],
    };
  });

  return NextResponse.json({ drafts: enriched });
}
