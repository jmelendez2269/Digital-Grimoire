
import { extractMetadata } from '../src/lib/claude-metadata';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testExtraction() {
  console.log('Testing metadata extraction with empty OCR text...');
  try {
    const { metadata } = await extractMetadata(
      '', // Empty OCR text
      'test-doc',
      'test-user',
      'test-doc-id',
      'The Kybalion',
      'Three Initiates'
    );
    console.log('Success! Metadata generated:');
    console.log(JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Extraction failed:', error);
  }
}

testExtraction();
