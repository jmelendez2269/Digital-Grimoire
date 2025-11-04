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

/**
 * Stream Convergence Machine response using Server-Sent Events (SSE)
 * @param query - User's query
 * @param lensWeights - Lens weights (0-100 each)
 * @param userId - User ID for rate limiting and history
 * @param onProgress - Optional callback for progress updates
 */
export async function streamConvergenceResponse(
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
      .filter(([_, weight]) => weight > 0)
      .map(([lens, _]) => lens),
    limit: 10,
  });

  // Step 2: Generate multi-lens response
  const response = await generateMultiLensResponse(query, lensWeights, context);

  // Step 3: Save to conversation history
  await saveConversationHistory(userId, query, lensWeights, response);

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
  try {
    // Send initial message
    yield `data: ${JSON.stringify({ type: 'start', message: 'Starting convergence analysis...' })}\n\n`;

    // Record query
    await recordQuery(userId, query, lensWeights);
    yield `data: ${JSON.stringify({ type: 'status', message: 'Searching library...' })}\n\n`;

    // Hybrid retrieval
    const context = await hybridSearch(query, {
      lenses: Object.entries(lensWeights)
        .filter(([_, weight]) => weight > 0)
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
    
    const synthesis = await generateSynthesisFromSummaries(query, lensWeights, context, lengthConfig);

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
      .filter(([_, weight]) => weight > 0)
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

    // Final message
    yield `data: ${JSON.stringify({ 
      type: 'done', 
      response: response,
      message: 'Analysis complete' 
    })}\n\n`;

  } catch (error) {
    console.error('Error in SSE stream:', error);
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
    .filter(([_, weight]) => weight > 0)
    .map(([lens, _]) => lens);

  // Combine all lens responses into full text
  const fullResponse = response.responses
    .map(r => `## ${r.lensName}\n\n${r.content}`)
    .join('\n\n---\n\n') + 
    `\n\n## Synthesis\n\n${response.synthesis}`;

  const { error } = await supabase
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

