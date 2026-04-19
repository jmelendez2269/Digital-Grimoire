const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
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

function looksLikeAuthorName(value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  const knownAuthors = new Set([
    'plato',
    'lao tzu',
    'marcus aurelius',
    'descartes',
    'bacon',
    'rumi',
    'eckhart',
    'william james',
    'anonymous',
    'zhuangzi',
    'ovid',
    'carl jung',
  ]);

  if (knownAuthors.has(normalized)) return true;
  return /^[a-z]+(?:\s+[a-z.]+){0,3}$/i.test(value) && !/[,:]/.test(value);
}

function getTitleCandidateFromSection(section) {
  if (!section) return null;
  return section.split(',')[0]?.trim() || null;
}

function extractReadingTitles(content) {
  const titles = new Set();

  for (const week of content?.weeks || []) {
    for (const reading of week?.readings || []) {
      const title = reading?.title?.trim();
      const sectionTitle = getTitleCandidateFromSection(reading?.section);

      if (title && !looksLikeAuthorName(title)) {
        titles.add(title);
      }

      if (sectionTitle) {
        titles.add(sectionTitle);
      }
    }
  }

  return Array.from(titles);
}

async function matchCourseTexts(supabase, content) {
  const titles = extractReadingTitles(content);
  const matched = new Map();

  for (const title of titles) {
    const { data, error } = await supabase
      .from('texts')
      .select('id, title')
      .ilike('title', `%${title}%`)
      .limit(1);

    if (error) throw error;
    if (data && data[0]) {
      matched.set(data[0].id, data[0]);
    }
  }

  return Array.from(matched.values());
}

async function backfillCourseTexts() {
  const supabase = createServiceClient();

  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, slug, title, content')
    .order('title', { ascending: true });

  if (coursesError) throw coursesError;

  let linkedCourses = 0;
  let linkedRows = 0;

  for (const course of courses || []) {
    const matches = await matchCourseTexts(supabase, course.content);

    await supabase.from('course_texts').delete().eq('course_id', course.id);

    if (matches.length === 0) {
      console.log(`No matches: ${course.title}`);
      continue;
    }

    const rows = matches.map((text) => ({
      course_id: course.id,
      text_id: text.id,
      is_required: true,
    }));

    const { error: insertError } = await supabase.from('course_texts').insert(rows);
    if (insertError) throw insertError;

    linkedCourses += 1;
    linkedRows += rows.length;
    console.log(`Linked ${rows.length} texts -> ${course.title}`);
  }

  console.log('\nBackfill complete');
  console.log(`Courses linked: ${linkedCourses}`);
  console.log(`Course text rows inserted: ${linkedRows}`);
}

backfillCourseTexts().catch((error) => {
  console.error('Course text backfill failed:', error);
  process.exit(1);
});
