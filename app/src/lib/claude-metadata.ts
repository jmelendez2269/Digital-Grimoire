import Anthropic from '@anthropic-ai/sdk';

interface DocumentMetadata {
  title: string;
  author?: string;
  year?: number;
  publisher?: string;
  type: string;
  domain?: string;
  tags: string[];
  confidence: 'established' | 'interpretive' | 'speculative' | 'tradition';
}

export async function extractMetadata(ocrText: string): Promise<DocumentMetadata> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const anthropic = new Anthropic({ apiKey });

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
- title (string, required)
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

  return JSON.parse(content.text);
}

