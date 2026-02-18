import {
  generateMultiLensResponse,
  generateSynthesisFromSummaries,
  getResponseLengthConfig,
  LensWeights,
  MultiLensResponse,
  ResponseLength,
  ResponseLengthConfig
} from './lens-orchestrator';
import { hybridSearch } from './hybrid-retrieval';
import { createClient } from '@/lib/supabase/server';
import { recordQuery } from './rate-limit';
import { logParallaxQueryUsage } from '@/lib/usage-tracker';

/**
 * Stream Parallax Engine response using Server-Sent Events (SSE)
 * @param query - User's query
 * @param lensWeights - Lens weights (0-100 each)
 * @param userId - User ID for rate limiting and history
 * @param onProgress - Optional callback for progress updates
 */
export async function streamParallaxResponse(
  query: string,
  lensWeights: LensWeights,
  userId: string,
  onProgress?: (chunk: string, type: 'lens' | 'synthesis' | 'done') => void
): Promise<MultiLensResponse> {
  // Record the query for rate limiting
  await recordQuery(userId, query, lensWeights);

  // Step 1: Hybrid retrieval to get context
  const context = await hybridSearch(query, {
    lenses: Object.entries(lensWeights)
      .filter(([_, weight]) => (weight as number) > 0)
      .map(([lens, _]) => lens),
    limit: 10,
  });

  // Step 2: Generate multi-lens response
  const responseWithTokens = await generateMultiLensResponse(query, lensWeights, context);

  // Step 3: Save to conversation history (extract MultiLensResponse without tokenUsage)
  const { tokenUsage, ...response } = responseWithTokens;
  await saveConversationHistory(userId, query, lensWeights, response);

  // Log usage and costs
  const supabase = await createClient();
  const { data: recentQuery } = await supabase
    // NOTE: 'convergence_queries' is the legacy table name. Do not change unless database migration is performed.
    .from('convergence_queries')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  await logParallaxQueryUsage({
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    userId,
    queryId: recentQuery?.id,
    queryText: query,
    lensWeights: lensWeights as unknown as Record<string, number>,
    success: true,
  });

  console.log(`[Usage Tracking] Logged Parallax query usage for user ${userId} via streamParallaxResponse`);

  return response;
}

/**
 * Create SSE stream for streaming response
 * This is used by the API route to stream tokens as they're generated
 */
export async function* createSSEStream(
  query: string,
  lensWeights: LensWeights,
  userId: string,
  responseLength: ResponseLength = 'short'
): AsyncGenerator<string, void, unknown> {
  let totalTokenUsage = { inputTokens: 0, outputTokens: 0 };

  try {
    // Send initial message
    yield `data: ${JSON.stringify({ type: 'start', message: 'Starting Parallax analysis...' })}\n\n`;

    // Record query
    await recordQuery(userId, query, lensWeights);
    yield `data: ${JSON.stringify({ type: 'status', message: 'Searching library...' })}\n\n`;

    // Hybrid retrieval
    const context = await hybridSearch(query, {
      lenses: Object.entries(lensWeights)
        .filter(([_, weight]) => (weight as number) > 0)
        .map(([lens, _]) => lens),
      limit: 10,
    });

    yield `data: ${JSON.stringify({
      type: 'status',
      message: `Found ${context.length} relevant sources`,
      sources: context.length
    })}\n\n`;

    // Get response length configuration
    const lengthConfig = getResponseLengthConfig(responseLength);

    // Generate synthesis FIRST using brief lens summaries (much faster and cheaper)
    yield `data: ${JSON.stringify({ type: 'status', message: 'Generating synthesis...' })}\n\n`;

    const synthesisResult = await generateSynthesisFromSummaries(query, lensWeights, context, lengthConfig);
    const synthesis = synthesisResult.synthesis;
    totalTokenUsage = synthesisResult.tokenUsage; // Update the outer variable, don't redeclare

    // Collect sources from context (for synthesis display)
    const sourceMap = new Map<string, {
      text_id: string;
      text_title?: string;
      text_author?: string;
      chunk_id?: string;
      chunk_index?: number;
      relevance?: number;
    }>();

    context.slice(0, 10).forEach(result => {
      if (!sourceMap.has(result.text_id)) {
        sourceMap.set(result.text_id, {
          text_id: result.text_id,
          text_title: result.text_title,
          text_author: result.text_author,
          chunk_id: result.chunk_id,
          chunk_index: result.chunk_index,
          relevance: result.finalScore,
        });
      }
    });

    // Stream synthesis first (main answer)
    yield `data: ${JSON.stringify({
      type: 'synthesis',
      content: synthesis,
      sources: Array.from(sourceMap.values())
    })}\n\n`;

    // Create response object with empty lens responses (will be loaded on demand)
    const activeLenses = Object.entries(lensWeights)
      .filter(([_, weight]) => (weight as number) > 0)
      .map(([lens, _]) => lens);

    // Send lens placeholders (not full responses yet - saves tokens)
    for (const lensId of activeLenses) {
      yield `data: ${JSON.stringify({
        type: 'lens_placeholder',
        lens: lensId,
        message: 'Click to expand for detailed analysis'
      })}\n\n`;
    }

    // Create minimal response for history
    const response: MultiLensResponse = {
      query,
      responses: [], // Empty - will be loaded on demand
      synthesis,
      sources: Array.from(sourceMap.values()),
    };

    // Save to history
    await saveConversationHistory(userId, query, lensWeights, response);

    // Track token usage and costs
    // Token usage is now returned from generateSynthesisFromSummaries
    console.log(`[Token Tracking] Total usage: ${totalTokenUsage.inputTokens} input, ${totalTokenUsage.outputTokens} output tokens`);

    // Validate token usage before logging
    if (totalTokenUsage.inputTokens === 0 && totalTokenUsage.outputTokens === 0) {
      console.warn(`[Usage Tracking] ⚠️ WARNING: Token usage is zero for user ${userId}. This may indicate a tracking issue.`);
    }

    // Get query ID from the most recent query
    const supabase = await createClient();
    const { data: recentQuery, error: queryError } = await supabase
      // NOTE: 'convergence_queries' is the legacy table name. Do not change unless database migration is performed.
      .from('convergence_queries')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (queryError) {
      console.warn(`[Usage Tracking] Could not find recent query for user ${userId}:`, queryError);
    }

    // Log usage and costs
    console.log(`[Usage Tracking] Logging Parallax query usage for user ${userId}:`, {
      inputTokens: totalTokenUsage.inputTokens,
      outputTokens: totalTokenUsage.outputTokens,
      queryId: recentQuery?.id,
    });

    await logParallaxQueryUsage({
      inputTokens: totalTokenUsage.inputTokens,
      outputTokens: totalTokenUsage.outputTokens,
      userId,
      queryId: recentQuery?.id,
      queryText: query,
      lensWeights: lensWeights as unknown as Record<string, number>,
      responseLength,
      success: true,
    });

    console.log(`[Usage Tracking] ✅ Logged Parallax query usage for user ${userId}`);

    // Final message
    yield `data: ${JSON.stringify({
      type: 'done',
      response: response,
      message: 'Analysis complete'
    })}\n\n`;

  } catch (error) {
    console.error('Error in SSE stream:', error);

    // Log failed query usage if we have any token data
    // Try to get token usage from the error context if available
    const tokenUsage = (totalTokenUsage && (totalTokenUsage.inputTokens > 0 || totalTokenUsage.outputTokens > 0))
      ? totalTokenUsage
      : { inputTokens: 0, outputTokens: 0 };

    if (tokenUsage.inputTokens > 0 || tokenUsage.outputTokens > 0) {
      await logParallaxQueryUsage({
        inputTokens: tokenUsage.inputTokens,
        outputTokens: tokenUsage.outputTokens,
        userId,
        queryText: query,
        lensWeights: lensWeights as unknown as Record<string, number>,
        responseLength,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`[Usage Tracking] Logged failed Parallax query usage for user ${userId}`);
    }

    yield `data: ${JSON.stringify({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`;
  }
}

/**
 * Save conversation to history
 */
async function saveConversationHistory(
  userId: string,
  query: string,
  lensWeights: LensWeights,
  response: MultiLensResponse
): Promise<void> {
  const supabase = await createClient();

  // Prepare sources array
  const sources = response.sources.map(source => ({
    text_id: source.text_id,
    text_title: source.text_title,
    chunk_id: source.chunk_id,
  }));

  // Get active lenses
  const lensesUsed = Object.entries(lensWeights)
    .filter(([_, weight]) => (weight as number) > 0)
    .map(([lens, _]) => lens);

  // Combine all lens responses into full text
  const fullResponse = response.responses
    .map(r => `## ${r.lensName}\n\n${r.content}`)
    .join('\n\n---\n\n') +
    `\n\n## Synthesis\n\n${response.synthesis}`;

  const { error } = await supabase
    // NOTE: 'convergence_responses' is the legacy table name. Do not change unless database migration is performed.
    // NOTE: 'convergence_responses' is the legacy table name. Do not change unless database migration is performed.
    .from('convergence_responses')
    .insert({
      user_id: userId,
      query_text: query,
      lens_weights: lensWeights,
      response_text: fullResponse,
      sources: sources,
      lenses_used: lensesUsed,
    });

  if (error) {
    console.error('Error saving conversation history:', error);
    // Don't throw - history saving shouldn't break the response
  }
}

