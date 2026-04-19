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

async function tryOpenLibrary(title, author) {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`.trim());
  const searchUrl = `https://openlibrary.org/search.json?q=${searchQuery}&limit=1`;
  const response = await fetch(searchUrl, {
    headers: { 'User-Agent': 'DigitalGrimoire/1.0' },
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (data.docs && data.docs.length > 0 && data.docs[0].cover_i) {
    return {
      imageUrl: `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`,
      source: 'scraped',
    };
  }

  return null;
}

async function tryInternetArchive(title, author) {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`.trim());
  const searchUrl = `https://archive.org/advancedsearch.php?q=${searchQuery}&fl=identifier,title&output=json&rows=1`;
  const response = await fetch(searchUrl);

  if (!response.ok) return null;

  const data = await response.json();
  const identifier = data.response?.docs?.[0]?.identifier;
  if (!identifier) return null;

  return {
    imageUrl: `https://archive.org/services/img/${identifier}`,
    source: 'scraped',
  };
}

async function tryGoogleBooks(title, author) {
  const searchQuery = encodeURIComponent(`intitle:${title} inauthor:${author || ''}`.trim());
  const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&maxResults=1`;
  const response = await fetch(apiUrl);

  if (!response.ok) return null;

  const data = await response.json();
  const thumbnail = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
  if (!thumbnail) return null;

  return {
    imageUrl: thumbnail.replace('zoom=1', 'zoom=2').replace('http://', 'https://'),
    source: 'scraped',
  };
}

async function scrapeCover(title, author) {
  return (
    (await tryOpenLibrary(title, author)) ||
    (await tryInternetArchive(title, author)) ||
    (await tryGoogleBooks(title, author))
  );
}

async function main() {
  const args = process.argv.slice(2);
  const courseSlugIndex = args.indexOf('--course-slug');
  const courseSlug = courseSlugIndex >= 0 ? args[courseSlugIndex + 1] : null;
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1], 10) : 20;

  const supabase = createServiceClient();

  let texts = [];

  if (courseSlug) {
    const { data: course, error } = await supabase
      .from('courses')
      .select('course_texts(texts(id, title, author, cover_image_url))')
      .eq('slug', courseSlug)
      .single();

    if (error) throw error;

    texts = (course.course_texts || [])
      .map((ct) => ct.texts)
      .filter((text) => text && !text.cover_image_url);
  } else {
    const { data, error } = await supabase
      .from('texts')
      .select('id, title, author, cover_image_url')
      .is('cover_image_url', null)
      .limit(limit);

    if (error) throw error;
    texts = data || [];
  }

  let updated = 0;

  for (const text of texts) {
    console.log(`Searching cover for: ${text.title} by ${text.author || 'Unknown'}`);

    const result = await scrapeCover(text.title, text.author || '');
    if (!result) {
      console.log('  No cover found');
      continue;
    }

    const { error } = await supabase
      .from('texts')
      .update({
        cover_image_url: result.imageUrl,
        cover_source: result.source,
        cover_status: 'valid',
        cover_last_checked: new Date().toISOString(),
      })
      .eq('id', text.id);

    if (error) throw error;

    updated += 1;
    console.log(`  Saved cover: ${result.imageUrl}`);
  }

  console.log(`\nCover scrape complete. Updated ${updated} text(s).`);
}

main().catch((error) => {
  console.error('Cover scrape failed:', error);
  process.exit(1);
});
