import OpenAI from 'openai';
import { logMetadataExtractionUsage } from './usage-tracker';

export interface DocumentMetadata {
  title: string;
  standardizedId: string;
  author?: string;
  year?: number;
  publisher?: string;
  type: string;
  domain?: string;
  tags: string[];
  lenses: string[]; // The 7 Parallax Engine lenses that apply to this document
  confidence: 'established' | 'interpretive' | 'speculative' | 'tradition';
  shortSummary: string;
  longSummary: string;
  curatorNote?: string; // Explanation of why this document is significant
}

export async function extractMetadata(
  ocrText: string,
  filename: string = 'document',
  userId?: string,
  documentId?: string
): Promise<{ metadata: DocumentMetadata; rawOutput: string }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Add OPENAI_API_KEY to .env.local');
  }

  const openai = new OpenAI({ apiKey });

  console.log('🤖 Calling OpenAI GPT-4 for metadata extraction...');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a document metadata extraction expert. Extract metadata from OCR text and classify documents into these 20 types:
book_esoteric, book_spiritual, book_psychology, book_science, article_scholarly, 
anthropology, reference_table, historical, mythology, medical_overview, commentary, 
webpage, dictionary, astrology, ritual_guide, diagram, transcript, summary, speculative, misc

The 7 Parallax Engine Lenses represent different perspectives for understanding knowledge:
1. scientific - Physics, biology, cosmology, empirical evidence, natural sciences
2. psychological - Jungian archetypes, cognitive science, shadow work, depth psychology
3. philosophical - Metaphysics, ethics, epistemology, ontology, philosophical inquiry
4. religious_spiritual - Comparative theology, mysticism, sacred texts, spiritual practices
5. historical_anthropological - Cultural evolution, mythology, ritual context, human history
6. symbolic_occult - Correspondences, alchemy, astrology, esoteric symbolism
7. mathematical - Sacred geometry, numerology, patterns, universal ratios, mathematical principles

Documents can (and often should) relate to multiple lenses.

Always respond with valid JSON only.`
      },
      {
        role: 'user',
        content: `Extract metadata from this OCR text and return JSON with:
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
- tags (array of strings, required, 3-5 relevant tags)
- lenses (array of strings, required): Which of the 7 Parallax Engine lenses apply to this document?
  * Choose from: scientific, psychological, philosophical, religious_spiritual, historical_anthropological, symbolic_occult, mathematical
  * Most documents should have 2-4 lenses
  * Select based on the document's primary perspectives and approaches
  * Examples:
    - A book on alchemy: ["symbolic_occult", "philosophical", "historical_anthropological"]
    - A psychology text on archetypes: ["psychological", "philosophical", "symbolic_occult"]
    - A sacred geometry guide: ["mathematical", "symbolic_occult", "philosophical"]
- confidence (string: "established", "interpretive", "speculative", or "tradition", required)
- shortSummary (string, required): A concise 2-3 sentence description of what this document is about
- longSummary (string, required): A detailed 1-2 paragraph summary covering the document's main themes, content, and significance
- curatorNote (string, optional): A brief explanation of why this document is significant and why it belongs in the Parallax collection. Should explain its value, uniqueness, or contribution to knowledge synthesis. 1-2 sentences.

OCR Text (first 3000 chars):
${ocrText.substring(0, 3000)}

Respond with valid JSON only, no markdown code blocks.`
      }
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });

  const responseText = completion.choices[0].message.content;
  if (!responseText) {
    throw new Error('Empty response from OpenAI');
  }

  console.log('✅ OpenAI GPT-4 response received');
  console.log('📄 LLM Raw Output:');
  console.log('='.repeat(80));
  console.log(responseText);
  console.log('='.repeat(80));

  const metadata = JSON.parse(responseText);
  console.log('📋 Parsed Metadata:', JSON.stringify(metadata, null, 2));

  // Log token usage for tracking
  await logMetadataExtractionUsage({
    inputTokens: completion.usage?.prompt_tokens || 0,
    outputTokens: completion.usage?.completion_tokens || 0,
    userId,
    documentId,
    success: true,
    model: 'gpt-4o',
  });

  return { metadata, rawOutput: responseText };
}

