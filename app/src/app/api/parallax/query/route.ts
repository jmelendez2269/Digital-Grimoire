import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/parallax/rate-limit';
import { createSSEStream } from '@/lib/parallax/streaming';
import { LensWeights, ResponseLength } from '@/lib/parallax/lens-orchestrator';

/**
 * POST /api/parallax/query
 * Main query endpoint for Parallax Engine
 * Returns Server-Sent Events stream
 * 
 * Body: {
 *   query: string,
 *   lensWeights: LensWeights
 * }
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { query, lensWeights, responseLength = 'short' } = body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate lens weights
    const validLensWeights: LensWeights = {
      scientific: lensWeights?.scientific || 0,
      psychological: lensWeights?.psychological || 0,
      philosophical: lensWeights?.philosophical || 0,
      religious_spiritual: lensWeights?.religious_spiritual || 0,
      historical_anthropological: lensWeights?.historical_anthropological || 0,
      symbolic_occult: lensWeights?.symbolic_occult || 0,
      mathematical: lensWeights?.mathematical || 0,
    };

    // Ensure at least one lens is active
    const totalWeight = Object.values(validLensWeights).reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one lens must have weight > 0' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetDate: rateLimit.resetDate.toISOString(),
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Write SSE headers (already set by Next.js, but ensure proper format)
          for await (const chunk of createSSEStream(query, validLensWeights, user.id, responseLength as ResponseLength)) {
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        } catch (error) {
          console.error('Error in SSE stream:', error);
          const errorMessage = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`));
          controller.close();
        }
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in query endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

