import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/parallax/history
 * Get user's conversation history
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch conversation history
    const { data: responses, error } = await supabase
      .from('convergence_responses')
      .select('id, query_text, lens_weights, response_text, sources, lenses_used, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    // Get total count
    const { count } = await supabase
      .from('convergence_responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      responses: responses || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in history endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/parallax/history
 * Save a conversation to history
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, lensWeights, response, synthesis, sources } = body;

    // Validate required fields
    if (!query || !lensWeights || !response) {
      return NextResponse.json(
        { error: 'Missing required fields: query, lensWeights, and response are required' },
        { status: 400 }
      );
    }

    // Extract lens IDs that were used (weights > 0)
    const lensesUsed = Object.entries(lensWeights)
      .filter(([_, weight]) => (weight as number) > 0)
      .map(([lensId]) => lensId);

    // Prepare response data
    const responseData = {
      user_id: user.id,
      query_text: query,
      lens_weights: lensWeights,
      response_text: typeof response === 'string' ? response : JSON.stringify(response),
      sources: sources || [],
      lenses_used: lensesUsed,
    };

    // Save to database
    const { data: savedResponse, error } = await supabase
      .from('convergence_responses')
      .insert(responseData)
      .select()
      .single();

    if (error) {
      console.error('Error saving conversation:', error);
      return NextResponse.json(
        { error: 'Failed to save conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: savedResponse.id,
        conversation: savedResponse
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST history endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

