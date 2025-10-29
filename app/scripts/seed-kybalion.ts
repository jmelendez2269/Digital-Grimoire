import * as path from 'path';
import * as dotenv from 'dotenv';
import { parseKybalion } from './parse-kybalion';
import { createServiceClient } from '../src/lib/supabase/service';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function seedKybalion() {
  console.log('🔮 Seeding The Kybalion...\n');

  // Parse the text file
  const kybalionPath = process.argv[2] || path.join(__dirname, '../../kyb.txt');
  console.log('📖 Parsing Kybalion from:', kybalionPath);
  
  const data = parseKybalion(kybalionPath);
  console.log(`✓ Parsed ${data.chapters.length} chapters\n`);

  // Connect to Supabase
  const supabase = createServiceClient();

  // Check if The Kybalion already exists
  const { data: existing, error: checkError } = await supabase
    .from('texts')
    .select('id, title')
    .eq('title', 'The Kybalion')
    .single();

  if (existing) {
    console.log('⚠️  The Kybalion already exists in the database');
    console.log(`   ID: ${existing.id}`);
    console.log('   Use DELETE to remove it first if you want to re-seed\n');
    return;
  }

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is what we want
    throw checkError;
  }

  // Insert The Kybalion
  const { data: inserted, error: insertError } = await supabase
    .from('texts')
    .insert({
      title: 'The Kybalion',
      author: 'Three Initiates',
      year: 1912,
      publisher: 'The Yogi Publication Society',
      type: 'book_esoteric',
      domain: 'hermeticism',
      lenses: ['philosophical', 'symbolic_occult', 'religious_spiritual', 'historical_anthropological'],
      status: 'ready',
      content: null, // No OCR text for structured documents
      s3_key: null, // No PDF for structured documents
      license: 'public-domain',
      tags: ['hermeticism', 'occult', 'philosophy', 'hermetic principles', 'ancient wisdom'],
      source_url: 'https://www.sacred-texts.com/eso/kyb/',
      metadata: {
        isStructuredText: true,
        chapters: data.chapters,
        description: 'A Study of The Hermetic Philosophy of Ancient Egypt and Greece',
        dedication: 'To Hermes Trismegistus, known by the ancient Egyptians as "The Great Great" and "Master of Masters"'
      },
      // Add summary fields
      short_summary: 'An early 20th century work on Hermetic philosophy presenting seven universal principles.',
      long_summary: 'The Kybalion is a 1912 book presenting a study of Hermetic Philosophy, claiming to be based on ancient teachings of Hermes Trismegistus. It outlines seven Hermetic Principles: Mentalism, Correspondence, Vibration, Polarity, Rhythm, Cause and Effect, and Gender. The text explores these principles and their application to mental transmutation and spiritual development.'
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error inserting The Kybalion:', insertError);
    throw insertError;
  }

  console.log('✅ Successfully seeded The Kybalion!');
  console.log(`   ID: ${inserted.id}`);
  console.log(`   Title: ${inserted.title}`);
  console.log(`   Author: ${inserted.author}`);
  console.log(`   Chapters: ${data.chapters.length}`);
  console.log(`   Status: ${inserted.status}`);
  
  console.log('\n📚 Chapter Summary:');
  data.chapters.forEach((chapter, index) => {
    console.log(`   ${index + 1}. ${chapter.title}`);
  });

  console.log('\n🎉 Seeding complete!\n');
}

// Run the seeder
seedKybalion()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

