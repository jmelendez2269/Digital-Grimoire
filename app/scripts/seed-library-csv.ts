import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/supabase/service';
import { scrapeCover } from '../src/lib/cover-scraper';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type SeedRow = {
  Title: string;
  Author: string;
  Year: string;
  Type: string;
  Domain: string;
  Lenses: string;
  Source_URL: string;
  Priority: string;
  Status: string;
  Why_Chosen?: string;
};

function parsePipeDelimited(fileContent: string): SeedRow[] {
  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split('|').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = line.split('|');
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = (cells[index] || '').trim();
    });

    return row as SeedRow;
  });
}

function parseYear(rawYear: string): number | null {
  const value = rawYear.trim();
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

function buildTags(row: SeedRow): string[] {
  const tags = new Set<string>();

  if (row.Domain) tags.add(row.Domain);
  if (row.Type) tags.add(row.Type);
  if (row.Author) tags.add(row.Author);

  return Array.from(tags);
}

async function seedLibrary() {
  const csvArgIndex = process.argv.indexOf('--csv');
  const csvPath =
    csvArgIndex >= 0 && process.argv[csvArgIndex + 1]
      ? path.resolve(process.argv[csvArgIndex + 1])
      : path.resolve(__dirname, '../../docs/LIBRARY_SEED_100_TEXTS_BALANCED.csv');

  const limitArgIndex = process.argv.indexOf('--limit');
  const limit =
    limitArgIndex >= 0 && process.argv[limitArgIndex + 1]
      ? parseInt(process.argv[limitArgIndex + 1], 10)
      : null;

  const withCovers = process.argv.includes('--with-covers');
  const forceCovers = process.argv.includes('--force-covers');

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parsePipeDelimited(csvContent);
  const selectedRows = limit ? rows.slice(0, limit) : rows;

  const supabase = createServiceClient();

  console.log(`Seeding library from ${csvPath}`);
  console.log(`Rows selected: ${selectedRows.length}`);
  console.log(`Cover scraping: ${withCovers ? 'enabled' : 'disabled'}`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let coverCount = 0;

  for (const row of selectedRows) {
    const title = row.Title?.trim();
    const author = row.Author?.trim() || null;

    if (!title) {
      skippedCount += 1;
      continue;
    }

    const payload = {
      title,
      author,
      year: parseYear(row.Year),
      type: row.Type || 'misc',
      domain: row.Domain || 'general',
      lenses: row.Lenses ? row.Lenses.split(',').map((lens) => lens.trim()).filter(Boolean) : [],
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
      .select('id, cover_image_url')
      .eq('title', title)
      .eq('author', author)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    let textId: string;
    let currentCoverUrl: string | null = null;

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
      textId = existing.id;
      currentCoverUrl = existing.cover_image_url;
      console.log(`Updated: ${title}`);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('texts')
        .insert(payload)
        .select('id')
        .single();

      if (insertError || !inserted) {
        throw insertError || new Error(`Failed to insert ${title}`);
      }

      insertedCount += 1;
      textId = inserted.id;
      console.log(`Inserted: ${title}`);
    }

    const shouldScrapeCover = withCovers && (!!author || author === null) && (!currentCoverUrl || forceCovers);

    if (shouldScrapeCover) {
      const coverResult = await scrapeCover(title, author || '');

      if (coverResult.success && coverResult.imageUrl) {
        const { error: coverUpdateError } = await supabase
          .from('texts')
          .update({
            cover_image_url: coverResult.imageUrl,
            cover_source: 'scraped',
            cover_status: 'valid',
            cover_last_checked: new Date().toISOString(),
          })
          .eq('id', textId);

        if (coverUpdateError) {
          throw coverUpdateError;
        }

        coverCount += 1;
        console.log(`  Cover: ${coverResult.source} -> ${coverResult.imageUrl}`);
      } else {
        console.log(`  Cover not found for: ${title}`);
      }
    }
  }

  console.log('\nSeed complete');
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Covers added: ${coverCount}`);
}

seedLibrary().catch((error) => {
  console.error('Library seed failed:', error);
  process.exit(1);
});
