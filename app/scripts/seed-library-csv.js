const fs = require('fs');
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

function parsePipeDelimited(fileContent) {
  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split('|').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = line.split('|');
    const row = {};

    headers.forEach((header, index) => {
      row[header] = (cells[index] || '').trim();
    });

    return row;
  });
}

function parseYear(rawYear) {
  const value = (rawYear || '').trim();
  if (!value) return null;

  if (/^\d+\s*BCE$/i.test(value)) {
    return -parseInt(value, 10);
  }

  if (/^\d+\s*CE$/i.test(value)) {
    return parseInt(value, 10);
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildTags(row) {
  const tags = new Set();

  if (row.Domain) tags.add(row.Domain);
  if (row.Type) tags.add(row.Type);
  if (row.Author) tags.add(row.Author);

  return Array.from(tags);
}

function normalizeType(rawType, row) {
  const value = (rawType || '').trim();

  const validTypes = new Set([
    'book_esoteric',
    'book_spiritual',
    'book_psychology',
    'book_science',
    'article_scholarly',
    'anthropology',
    'reference_table',
    'historical',
    'mythology',
    'medical_overview',
    'commentary',
    'webpage',
    'dictionary',
    'astrology',
    'ritual_guide',
    'diagram',
    'transcript',
    'summary',
    'speculative',
    'misc',
  ]);

  if (validTypes.has(value)) return value;

  if (value === 'book_philosophical') {
    if ((row.Lenses || '').includes('religious_spiritual')) return 'book_spiritual';
    return 'commentary';
  }

  return 'misc';
}

function normalizeLenses(rawLenses) {
  const validLenses = new Set([
    'scientific',
    'psychological',
    'philosophical',
    'religious_spiritual',
    'historical_anthropological',
    'symbolic_occult',
    'mathematical',
  ]);

  return (rawLenses || '')
    .split(',')
    .map((lens) => lens.trim())
    .filter(Boolean)
    .filter((lens) => validLenses.has(lens));
}

async function seedLibrary() {
  const args = process.argv.slice(2);
  const csvArgIndex = args.indexOf('--csv');
  const csvPath =
    csvArgIndex >= 0 && args[csvArgIndex + 1]
      ? path.resolve(args[csvArgIndex + 1])
      : path.resolve(__dirname, '../../docs/LIBRARY_SEED_100_TEXTS_BALANCED.csv');

  const limitArgIndex = args.indexOf('--limit');
  const limit =
    limitArgIndex >= 0 && args[limitArgIndex + 1]
      ? parseInt(args[limitArgIndex + 1], 10)
      : null;

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parsePipeDelimited(csvContent);
  const selectedRows = limit ? rows.slice(0, limit) : rows;

  const supabase = createServiceClient();

  console.log(`Seeding library from ${csvPath}`);
  console.log(`Rows selected: ${selectedRows.length}`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of selectedRows) {
    const title = (row.Title || '').trim();
    const author = (row.Author || '').trim() || null;

    if (!title) {
      skippedCount += 1;
      continue;
    }

    const payload = {
      title,
      author,
      year: parseYear(row.Year),
      type: normalizeType(row.Type, row),
      domain: row.Domain || 'general',
      lenses: normalizeLenses(row.Lenses),
      source_url: row.Source_URL || null,
      license: 'public-domain',
      status: 'ready',
      tags: buildTags(row),
      summary: row.Why_Chosen || null,
      short_summary: row.Why_Chosen || null,
      curator_note: row.Why_Chosen || null,
      metadata: {
        seededFromCsv: true,
        seedPriority: row.Priority || null,
        seedStatus: row.Status || null,
        sourceCsv: path.basename(csvPath),
      },
    };

    const { data: existing, error: existingError } = await supabase
      .from('texts')
      .select('id')
      .eq('title', title)
      .eq('author', author)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('texts')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }

      updatedCount += 1;
      console.log(`Updated: ${title}`);
    } else {
      const { error: insertError } = await supabase.from('texts').insert(payload);

      if (insertError) {
        throw insertError;
      }

      insertedCount += 1;
      console.log(`Inserted: ${title}`);
    }
  }

  console.log('\nSeed complete');
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

seedLibrary().catch((error) => {
  console.error('Library seed failed:', error);
  process.exit(1);
});
