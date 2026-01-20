import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Diagnostic endpoint to check deep search setup status
 * Helps identify what's missing for deep search to work
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const checks = {
      // Database tables
      hasTextChunks: false,
      hasConvergenceConcepts: false,
      hasConvergenceQueries: false,

      // Database functions
      hasMatchTextChunksRPC: false,

      // Extensions
      hasPgVector: false,

      // Data
      chunksWithEmbeddings: 0,
      textsWithEmbeddings: 0,
      totalTexts: 0,

      // Environment
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,

      // Indexes
      hasChunkEmbeddingIndex: false,
    };

    // Check if text_chunks table exists
    try {
      const { count } = await supabase
        .from('text_chunks')
        .select('*', { count: 'exact', head: true });
      checks.hasTextChunks = true;
      checks.chunksWithEmbeddings = count || 0;
    } catch (error) {
      checks.hasTextChunks = false;
    }

    // Check if convergence_concepts table exists
    try {
      await supabase
        .from('convergence_concepts')
        .select('id', { count: 'exact', head: true });
      checks.hasConvergenceConcepts = true;
    } catch (error) {
      checks.hasConvergenceConcepts = false;
    }

    // Check if convergence_queries table exists
    try {
      await supabase
        .from('convergence_queries')
        .select('id', { count: 'exact', head: true });
      checks.hasConvergenceQueries = true;
    } catch (error) {
      checks.hasConvergenceQueries = false;
    }

    // Check if RPC function exists
    try {
      // Try calling the function with a dummy embedding (will fail but confirms function exists)
      const dummyEmbedding = new Array(1536).fill(0);
      const { error } = await supabase.rpc('match_text_chunks', {
        query_embedding: dummyEmbedding,
        match_threshold: 0.9,
        match_count: 1,
      });
      // If error is about function not existing, it's missing
      // If error is about data/parameters, function exists
      if (error) {
        checks.hasMatchTextChunksRPC = !error.message?.includes('does not exist') &&
          !error.message?.includes('function match_text_chunks');
      } else {
        checks.hasMatchTextChunksRPC = true;
      }
    } catch (error: any) {
      checks.hasMatchTextChunksRPC = false;
    }

    // Check pgvector extension (via SQL query)
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        query: "SELECT EXISTS(SELECT FROM pg_extension WHERE extname = 'vector') as has_vector;"
      });

      // Alternative check: try to query vector column
      const { error: vectorError } = await supabase
        .from('text_chunks')
        .select('embedding')
        .limit(1);

      checks.hasPgVector = !vectorError || !vectorError.message?.includes('vector');
    } catch (error) {
      checks.hasPgVector = false;
    }

    // Count texts with embeddings
    try {
      const { data: chunks } = await supabase
        .from('text_chunks')
        .select('text_id')
        .not('embedding', 'is', null);

      if (chunks) {
        const uniqueTextIds = new Set(chunks.map(c => c.text_id));
        checks.textsWithEmbeddings = uniqueTextIds.size;
      }
    } catch (error) {
      // Ignore
    }

    // Count total texts
    try {
      const { count } = await supabase
        .from('texts')
        .select('*', { count: 'exact', head: true });
      checks.totalTexts = count || 0;
    } catch (error) {
      // Ignore
    }

    // Determine status
    const isFullySetup =
      checks.hasTextChunks &&
      checks.hasConvergenceConcepts &&
      checks.hasPgVector &&
      checks.hasOpenAIKey &&
      checks.chunksWithEmbeddings > 0;

    const missingItems: string[] = [];
    if (!checks.hasTextChunks) missingItems.push('text_chunks table (Migration 021)');
    if (!checks.hasConvergenceConcepts) missingItems.push('convergence_concepts table (Migration 019)');
    if (!checks.hasPgVector) missingItems.push('pgvector extension');
    if (!checks.hasOpenAIKey) missingItems.push('OPENAI_API_KEY environment variable');
    if (checks.chunksWithEmbeddings === 0) missingItems.push('Text embeddings (generate via /api/convergence/generate-embeddings)');
    if (!checks.hasMatchTextChunksRPC) missingItems.push('match_text_chunks RPC function (Migration 030) - optional but recommended');

    return NextResponse.json({
      status: isFullySetup ? 'ready' : 'incomplete',
      checks,
      missingItems,
      recommendations: {
        migrations: {
          required: [
            checks.hasTextChunks ? null : '021_add_convergence_machine_schema.sql',
            checks.hasConvergenceConcepts ? null : '019_add_convergence_concepts.sql',
          ].filter(Boolean),
          recommended: [
            checks.hasMatchTextChunksRPC ? null : '030_add_match_text_chunks_rpc.sql',
          ].filter(Boolean),
        },
        nextSteps: missingItems.length > 0 ? [
          'Run missing migrations in Supabase SQL Editor',
          checks.hasOpenAIKey ? null : 'Set OPENAI_API_KEY in .env.local',
          checks.chunksWithEmbeddings === 0 ? 'Generate embeddings for texts via /api/convergence/generate-embeddings-by-title' : null,
        ].filter(Boolean) : ['✅ Deep search is ready to use!'],
      },
    });
  } catch (error) {
    console.error('Error checking deep search status:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
