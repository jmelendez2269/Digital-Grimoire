import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { chunkText, TextChunk } from './chunking';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for a text using OpenAI's text-embedding-3-small model
 * @param text - Text to generate embedding for
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for all chunks of a text and store in database
 * @param textId - UUID of the text to process
 * @param content - Full text content (will be chunked)
 * @returns Number of chunks created
 */
export async function generateTextEmbeddings(
  textId: string,
  content: string
): Promise<number> {
  const supabase = await createClient();

  // First, check if embeddings already exist
  const { data: existingChunks } = await supabase
    .from('text_chunks')
    .select('id')
    .eq('text_id', textId)
    .limit(1);

  if (existingChunks && existingChunks.length > 0) {
    console.log(`Text ${textId} already has embeddings, skipping...`);
    return existingChunks.length;
  }

  // Chunk the text
  const chunks = chunkText(content);
  
  if (chunks.length === 0) {
    console.warn(`No chunks generated for text ${textId}`);
    return 0;
  }

  console.log(`Generating embeddings for ${chunks.length} chunks of text ${textId}...`);

  // Generate embeddings for each chunk (with rate limiting)
  const chunkPromises = chunks.map(async (chunk, index) => {
    try {
      // Small delay to respect rate limits (OpenAI allows 3000 RPM)
      if (index > 0 && index % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const embedding = await generateEmbedding(chunk.content);

      // Store chunk with embedding
      // pgvector in Supabase expects the array directly
      const { error } = await supabase
        .from('text_chunks')
        .insert({
          text_id: textId,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
          embedding: embedding, // pgvector expects array directly
          token_count: chunk.tokenCount,
        });

      if (error) {
        console.error(`Error storing chunk ${index} for text ${textId}:`, error);
        throw error;
      }

      return { success: true, chunkIndex: index };
    } catch (error) {
      console.error(`Error processing chunk ${index} for text ${textId}:`, error);
      return { success: false, chunkIndex: index, error };
    }
  });

  const results = await Promise.all(chunkPromises);
  const successCount = results.filter(r => r.success).length;

  console.log(`Generated ${successCount}/${chunks.length} embeddings for text ${textId}`);

  // Also generate embedding for the full text summary (for text-level search)
  // Use short_summary or long_summary if available, otherwise use first chunk
  const { data: textData } = await supabase
    .from('texts')
    .select('short_summary, long_summary')
    .eq('id', textId)
    .single();

  const summaryText = textData?.long_summary || textData?.short_summary || chunks[0]?.content;
  if (summaryText) {
    try {
      const textEmbedding = await generateEmbedding(summaryText);
      
      await supabase
        .from('texts')
        .update({
          embedding: textEmbedding, // pgvector expects array directly
        })
        .eq('id', textId);
    } catch (error) {
      console.warn(`Failed to generate text-level embedding for ${textId}:`, error);
    }
  }

  return successCount;
}

/**
 * Backfill embeddings for all texts that don't have them yet
 * @param batchSize - Number of texts to process at once (default 10)
 * @param maxTexts - Maximum number of texts to process (optional)
 * @returns Total chunks created
 */
export async function backfillAllTextEmbeddings(
  batchSize: number = 10,
  maxTexts?: number
): Promise<{ textsProcessed: number; totalChunks: number; errors: number }> {
  const supabase = await createClient();

  // Get texts that have content but no chunks
  let query = supabase
    .from('texts')
    .select('id, content, title')
    .not('content', 'is', null)
    .not('content', 'eq', '');

  // Check for texts without chunks
  const { data: textsWithoutChunks } = await supabase
    .from('text_chunks')
    .select('text_id')
    .limit(1000);

  const textIdsWithChunks = new Set(
    textsWithoutChunks?.map(t => t.text_id) || []
  );

  const { data: texts, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch texts: ${error.message}`);
  }

  if (!texts || texts.length === 0) {
    console.log('No texts found to process');
    return { textsProcessed: 0, totalChunks: 0, errors: 0 };
  }

  // Filter out texts that already have chunks
  const textsToProcess = texts
    .filter(t => !textIdsWithChunks.has(t.id))
    .slice(0, maxTexts || texts.length);

  console.log(`Processing ${textsToProcess.length} texts in batches of ${batchSize}...`);

  let totalChunks = 0;
  let textsProcessed = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < textsToProcess.length; i += batchSize) {
    const batch = textsToProcess.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} texts)...`);

    const batchPromises = batch.map(async (text) => {
      try {
        if (!text.content) {
          console.warn(`Text ${text.id} (${text.title}) has no content, skipping...`);
          return { chunks: 0, error: false };
        }

        const chunks = await generateTextEmbeddings(text.id, text.content);
        return { chunks, error: false };
      } catch (error) {
        console.error(`Error processing text ${text.id} (${text.title}):`, error);
        return { chunks: 0, error: true };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(result => {
      totalChunks += result.chunks;
      if (result.error) errors++;
      else textsProcessed++;
    });

    // Rate limiting: wait between batches
    if (i + batchSize < textsToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`Backfill complete: ${textsProcessed} texts processed, ${totalChunks} chunks created, ${errors} errors`);

  return { textsProcessed, totalChunks, errors };
}

