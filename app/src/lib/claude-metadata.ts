import OpenAI from 'openai';

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

export async function extractMetadata(
  ocrText: string, 
  filename: string = 'document'
): Promise<DocumentMetadata> {
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
- confidence (string: "established", "interpretive", "speculative", or "tradition", required)

OCR Text (first 3000 chars):
${ocrText.substring(0, 3000)}

Respond with valid JSON only, no markdown code blocks.`
      }
    ],
    temperature: 0.3,
    max_tokens: 1000,
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
  
  return metadata;
}

