import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateLensResponse, getResponseLengthConfig, ResponseLength } from '@/lib/parallax/lens-orchestrator';
import { hybridSearch } from '@/lib/parallax/hybrid-retrieval';
import { getLens } from '@/lib/parallax/lenses';
import { logApiUsage } from '@/lib/usage-tracker';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter-client';

/**
 * POST /api/parallax/lens/[lensId]
 * Generate detailed lens response on demand
 * 
 * Body: {
 *   query: string,
 *   lensWeights: LensWeights,
 *   responseLength?: ResponseLength
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lensId: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { lensId } = await params;

    // Parse request body
    const body = await request.json();
    const { query, lensWeights, responseLength = 'medium' } = body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get lens
    const lens = getLens(lensId as any);
    if (!lens) {
      return new Response(
        JSON.stringify({ error: 'Invalid lens ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get response length config
    const lengthConfig = getResponseLengthConfig(responseLength as ResponseLength);

    // Hybrid retrieval to get context
    const context = await hybridSearch(query, {
      lenses: [lensId],
      limit: 10,
    });

    if (!context || context.length === 0) {
      console.warn(`No context found for lens ${lensId} and query: ${query}`);
    }

    // Generate lens response
    const lensResponse = await generateLensResponse(
      query,
      lens,
      context,
      lengthConfig.lensMaxTokens
    );

    // AI Usage tracking
    if (lensResponse.tokenUsage) {
      await logApiUsage({
        service: 'parallax_query',
        operation: `lens_detail_${lensId}`,
        unitsUsed: lensResponse.tokenUsage.inputTokens + lensResponse.tokenUsage.outputTokens,
        unitType: 'tokens',
        userId: user.id,
        requestMetadata: {
          lensId,
          model: process.env.PARALLAX_LENS_MODEL || getDefaultOpenRouterModel(),
          inputTokens: lensResponse.tokenUsage.inputTokens,
          outputTokens: lensResponse.tokenUsage.outputTokens,
          query: query.substring(0, 100)
        }
      });
    }

    return new Response(
      JSON.stringify({ lensResponse }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating lens response:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

