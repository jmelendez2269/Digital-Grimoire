import OpenAI from 'openai';
import { logMetadataExtractionUsage } from './usage-tracker';
import { DocumentMetadata } from './claude-metadata';

export interface MediaMetadata extends DocumentMetadata {
  // Media-specific fields are stored in metadata JSONB in database
  // This interface extends DocumentMetadata for consistency
}

export interface MediaFileInfo {
  mimeType: string;
  duration?: number; // in seconds
  format?: string; // mp3, mp4, jpg, etc.
  bitrate?: number;
  resolution?: string; // e.g., "1920x1080"
  exif?: Record<string, any>; // Photo EXIF data
}

/**
 * Extract metadata from media files using AI
 * For photos: Uses GPT-4 Vision to analyze image content
 * For audio/video: Uses GPT-4 to analyze transcript and file metadata
 */
export async function extractMediaMetadata(
  mediaType: 'audio' | 'video' | 'photo',
  fileInfo: MediaFileInfo,
  transcriptOrImageUrl?: string, // transcript for audio/video, image URL for photos
  filename: string = 'media',
  userId?: string,
  documentId?: string
): Promise<{ metadata: MediaMetadata; rawOutput: string }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Add OPENAI_API_KEY to .env.local');
  }

  const openai = new OpenAI({ apiKey });

  console.log(`🤖 Calling OpenAI GPT-4${mediaType === 'photo' ? ' Vision' : ''} for ${mediaType} metadata extraction...`);

  if (mediaType === 'photo') {
    // Use GPT-4 Vision for photo analysis
    if (!transcriptOrImageUrl) {
      throw new Error('Image URL is required for photo metadata extraction');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a media metadata extraction expert specializing in esoteric, spiritual, and philosophical content. Analyze images and extract metadata, classifying them into these 20 types:
book_esoteric, book_spiritual, book_psychology, book_science, article_scholarly, 
anthropology, reference_table, historical, mythology, medical_overview, commentary, 
webpage, dictionary, astrology, ritual_guide, diagram, transcript, summary, speculative, misc

The 7 Parallax Lenses represent different perspectives for understanding knowledge:
1. scientific - Physics, biology, cosmology, empirical evidence, natural sciences
2. psychological - Jungian archetypes, cognitive science, shadow work, depth psychology
3. philosophical - Metaphysics, ethics, epistemology, ontology, philosophical inquiry
4. religious_spiritual - Comparative theology, mysticism, sacred texts, spiritual practices
5. historical_anthropological - Cultural evolution, mythology, ritual context, human history
6. symbolic_occult - Correspondences, alchemy, astrology, esoteric symbolism
7. mathematical - Sacred geometry, numerology, patterns, universal ratios, mathematical principles

Media can (and often should) relate to multiple lenses.

Always respond with valid JSON only.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and extract metadata. Return JSON with:
- title (string, required): Descriptive title of the image content
- standardizedId (string, required): Generate a unique ID in format: photo_shortname_author_year
  * Use "photo" as the type prefix
  * Add shortened description (2-3 key words, no articles)
  * Add photographer/creator last name if determinable
  * Add year if determinable
  * All lowercase, separated by underscores
  * Example: "photo_sacred_geometry_unknown_2024"
- author (string, optional): Photographer, artist, or creator name
- year (number, optional): Year the photo was taken or created
- publisher (string, optional): Source or publication
- type (one of the 20 types above, required): Classify the image content
- domain (string, optional: e.g., "astrology", "ritual", "symbolism", "nature")
- tags (array of strings, required, 3-5 relevant tags describing the image)
- lenses (array of strings, required): Which of the 7 Parallax Lenses apply?
  * Choose from: scientific, psychological, philosophical, religious_spiritual, historical_anthropological, symbolic_occult, mathematical
  * Most images should have 1-3 lenses
- confidence (string: "established", "interpretive", "speculative", or "tradition", required)
- shortSummary (string, required): A concise 2-3 sentence description of what this image shows
- longSummary (string, required): A detailed 1-2 paragraph description of the image content, symbolism, and significance
- curatorNote (string, optional): A brief explanation of why this image is significant for the Project Parallax collection

Filename: ${filename}
${fileInfo.exif ? `EXIF Data: ${JSON.stringify(fileInfo.exif)}` : ''}

Respond with valid JSON only, no markdown code blocks.`
            },
            {
              type: 'image_url',
              image_url: {
                url: transcriptOrImageUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    console.log('✅ OpenAI GPT-4 Vision response received');
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
  } else {
    // Use GPT-4 for audio/video transcript analysis
    if (!transcriptOrImageUrl) {
      throw new Error('Transcript is required for audio/video metadata extraction');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a media metadata extraction expert specializing in esoteric, spiritual, and philosophical content. Analyze audio/video transcripts and extract metadata, classifying them into these 20 types:
book_esoteric, book_spiritual, book_psychology, book_science, article_scholarly, 
anthropology, reference_table, historical, mythology, medical_overview, commentary, 
webpage, dictionary, astrology, ritual_guide, diagram, transcript, summary, speculative, misc

The 7 Parallax Lenses represent different perspectives for understanding knowledge:
1. scientific - Physics, biology, cosmology, empirical evidence, natural sciences
2. psychological - Jungian archetypes, cognitive science, shadow work, depth psychology
3. philosophical - Metaphysics, ethics, epistemology, ontology, philosophical inquiry
4. religious_spiritual - Comparative theology, mysticism, sacred texts, spiritual practices
5. historical_anthropological - Cultural evolution, mythology, ritual context, human history
6. symbolic_occult - Correspondences, alchemy, astrology, esoteric symbolism
7. mathematical - Sacred geometry, numerology, patterns, universal ratios, mathematical principles

Media can (and often should) relate to multiple lenses.

Always respond with valid JSON only.`
        },
        {
          role: 'user',
          content: `Extract metadata from this ${mediaType} transcript and return JSON with:
- title (string, required): Full title of the ${mediaType} content
- standardizedId (string, required): Generate a unique ID in format: ${mediaType}_shortname_author_year
  * Use "${mediaType}" as the type prefix
  * Add shortened title (2-3 key words from title, no articles)
  * Add creator's last name if available
  * Add year if available
  * All lowercase, separated by underscores
  * Example: "${mediaType}_lecture_hermeticism_smith_2023"
- author (string, optional): Speaker, creator, or artist name
- year (number, optional): Year created or recorded
- publisher (string, optional): Source, channel, or publication
- type (one of the 20 types above, required): Classify the ${mediaType} content
- domain (string, optional: e.g., "astrology", "psychology", "ritual", "lecture")
- tags (array of strings, required, 3-5 relevant tags)
- lenses (array of strings, required): Which of the 7 Parallax Lenses apply?
  * Choose from: scientific, psychological, philosophical, religious_spiritual, historical_anthropological, symbolic_occult, mathematical
  * Most ${mediaType} should have 2-4 lenses
- confidence (string: "established", "interpretive", "speculative", or "tradition", required)
- shortSummary (string, required): A concise 2-3 sentence description of what this ${mediaType} is about
- longSummary (string, required): A detailed 1-2 paragraph summary covering the main themes, content, and significance
- curatorNote (string, optional): A brief explanation of why this ${mediaType} is significant for the Project Parallax collection

Filename: ${filename}
Duration: ${fileInfo.duration ? `${Math.floor(fileInfo.duration / 60)}:${String(fileInfo.duration % 60).padStart(2, '0')}` : 'Unknown'}
Format: ${fileInfo.format || 'Unknown'}

Transcript (first 3000 chars):
${transcriptOrImageUrl.substring(0, 3000)}

Respond with valid JSON only, no markdown code blocks.`
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    console.log(`✅ OpenAI GPT-4 response received for ${mediaType}`);
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
}

