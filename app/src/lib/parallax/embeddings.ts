import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { chunkText, TextChunk } from './chunking';
import { logApiUsage } from '@/lib/usage-tracker';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for a text using OpenAI's text-embedding-3-small model
 * @param text - Text to generate embedding for
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<{ embedding: number[], usage: { prompt_tokens: number } }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    });

    return {
      embedding: response.data[0].embedding,
      usage: { prompt_tokens: response.usage?.prompt_tokens || 0 }
    };
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

  let totalInputTokens = 0;

  // Generate embeddings for each chunk (with rate limiting)
  const chunkPromises = chunks.map(async (chunk, index) => {
    try {
      // Small delay to respect rate limits (OpenAI allows 3000 RPM)
      if (index > 0 && index % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const res = await generateEmbedding(chunk.content);
      totalInputTokens += res.usage.prompt_tokens;

      // Store chunk with embedding
      // pgvector in Supabase expects the array directly
      const { error } = await supabase
        .from('text_chunks')
        .insert({
          text_id: textId,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
          embedding: res.embedding, // pgvector expects array directly
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
    .select('short_summary, long_summary, uploaded_by')
    .eq('id', textId)
    .single();

  const summaryText = textData?.long_summary || textData?.short_summary || chunks[0]?.content;
  if (summaryText) {
    try {
      const res = await generateEmbedding(summaryText);
      totalInputTokens += res.usage.prompt_tokens;

      await supabase
        .from('texts')
        .update({
          embedding: res.embedding, // pgvector expects array directly
        })
        .eq('id', textId);
    } catch (error) {
      console.warn(`Failed to generate text-level embedding for ${textId}:`, error);
    }
  }

  // Log usage for the entire document
  if (totalInputTokens > 0) {
    await logApiUsage({
      service: 'other',
      operation: 'generate_text_embeddings',
      unitsUsed: totalInputTokens,
      unitType: 'tokens',
      userId: textData?.uploaded_by || undefined,
      documentId: textId,
      requestMetadata: {
        model: 'text-embedding-3-small',
        chunkCount: chunks.length,
        totalTokens: totalInputTokens
      },
      success: true
    });
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

  // 1. Get ALL text IDs that have content (lightweight query)
  // We use range to ensure we get past 1000 limit
  let allTextIds: { id: string }[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error: idError } = await supabase
      .from('texts')
      .select('id')
      .not('content', 'is', null)
      .not('content', 'eq', '')
      .range(from, from + 999);

    if (idError) throw idError;
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allTextIds = [...allTextIds, ...data];
      from += 1000;
      if (data.length < 1000) hasMore = false;
    }
    if (from > 100000) hasMore = false; // Safety cap
  }

  // 2. Get all unique text IDs that already have chunks using efficient RPC
  const { data: indexedIdsData } = await supabase.rpc('get_indexed_text_ids');
  const indexedIds = new Set(indexedIdsData?.map((t: { text_id: string }) => t.text_id) || []);

  // 3. Identify missing texts
  const missingIds = allTextIds.filter(t => !indexedIds.has(t.id)).map(t => t.id);

  if (missingIds.length === 0) {
    return { textsProcessed: 0, totalChunks: 0, errors: 0 };
  }

  // 4. Fetch content only for the batch we are about to process
  const batchLimit = maxTexts || missingIds.length;
  const idsToProcess = missingIds.slice(0, batchLimit);

  // Supabase 'in' has limits too, so we might need to chunk this if batchLimit is huge, 
  // but backfill defaults to 10 at a time in terms of concurrent processing.
  // Actually backfill processes all 'subset' in a loop.

  const { data: texts, error: fetchError } = await supabase
    .from('texts')
    .select('id, content, title')
    .in('id', idsToProcess);

  if (fetchError) throw fetchError;

  let totalChunks = 0;
  let textsProcessed = 0;
  let errors = 0;

  console.log(`Starting backfill for ${texts?.length} texts...`);

  // 5. Process in batches
  for (let i = 0; i < (texts?.length || 0); i += batchSize) {
    const currentBatch = texts!.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${currentBatch.length} texts)...`);

    const batchPromises = currentBatch.map(async (text) => {
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
    if (i + batchSize < texts!.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`Backfill complete: ${textsProcessed} texts processed, ${totalChunks} chunks created, ${errors} errors`);
  return { textsProcessed, totalChunks, errors };
}

