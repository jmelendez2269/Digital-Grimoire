import Anthropic from '@anthropic-ai/sdk';

interface DocumentMetadata {
  title: string;
  standardizedId: string;
  author?: string;
  year?: number;
  publisher?: string;
  type: string;
  domain?: string;
  tags: string[];
  confidence: 'established' | 'interpretive' | 'speculative' | 'tradition';
}

/**
 * Generate basic metadata from filename as fallback
 */
function generateBasicMetadata(filename: string, ocrText: string): DocumentMetadata {
  // Extract title from filename (remove extension and clean up)
  const title = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
    .replace(/\d{3,4}-/g, '') // Remove leading numbers
    .trim();

  // Try to extract year from filename
  const yearMatch = filename.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : undefined;

  // Generate simple standardized ID
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 50);
  const standardizedId = `misc_${cleanTitle}${year ? `_${year}` : ''}`;

  return {
    title,
    standardizedId,
    year,
    type: 'misc',
    tags: ['uncategorized'],
    confidence: 'speculative',
  };
}

export async function extractMetadata(
  ocrText: string, 
  filename: string = 'document'
): Promise<DocumentMetadata> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  Anthropic API key not configured, using basic metadata extraction');
    return generateBasicMetadata(filename, ocrText);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    console.log('🤖 Calling Claude API for metadata extraction...');
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Extract metadata from this OCR text and classify it into one of these 20 types:
book_esoteric, book_spiritual, book_psychology, book_science, article_scholarly, 
anthropology, reference_table, historical, mythology, medical_overview, commentary, 
webpage, dictionary, astrology, ritual_guide, diagram, transcript, summary, speculative, misc

Return JSON with:
- title (string, required): Full title of the document
- standardizedId (string, required): Generate a unique ID in format: type_shortname_author_year
  * Use the document type (e.g., book_esoteric)
  * Add shortened document name (2-3 key words from title, no articles)
  * Add author's last name if available
  * Add year if available
  * All lowercase, separated by underscores
  * Example: "book_esoteric_secret_doctrine_blavatsky_1888"
- author (string, optional)
- year (number, optional)
- publisher (string, optional)
- type (one of the 20 types above, required)
- domain (string, optional: e.g., "astrology", "psychology", "anthropology")
- tags (array of strings, required)
- confidence (string: "established", "interpretive", "speculative", or "tradition", required)

OCR Text (first 3000 chars):
${ocrText.substring(0, 3000)}

Respond with valid JSON only.`
      }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response from Claude');
    }

    console.log('✅ Claude API response received');
    return JSON.parse(content.text);

  } catch (error) {
    console.error('❌ Claude API error:', error);
    console.warn('⚠️  Falling back to basic metadata extraction');
    return generateBasicMetadata(filename, ocrText);
  }
}

