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
      hasMatchTextFtsRPC: false,

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
      hasChunkFtsIndex: false,
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

    // Check if match_text_chunks RPC function exists
    try {
      const dummyEmbedding = new Array(1536).fill(0);
      const { error } = await supabase.rpc('match_text_chunks', {
        query_embedding: dummyEmbedding,
        match_threshold: 0.9,
        match_count: 1,
      });
      if (error) {
        checks.hasMatchTextChunksRPC = !error.message?.includes('does not exist');
      } else {
        checks.hasMatchTextChunksRPC = true;
      }
    } catch (error: any) {
      checks.hasMatchTextChunksRPC = false;
    }

    // Check if match_text_fts RPC function exists
    try {
      const { error } = await supabase.rpc('match_text_fts', {
        search_query: 'test',
        match_count: 1,
      });
      if (error) {
        checks.hasMatchTextFtsRPC = !error.message?.includes('does not exist');
      } else {
        checks.hasMatchTextFtsRPC = true;
      }
    } catch (error: any) {
      checks.hasMatchTextFtsRPC = false;
    }

    // Check pgvector extension
    try {
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
      checks.hasPgVector &&
      checks.hasOpenAIKey &&
      checks.hasMatchTextChunksRPC &&
      checks.hasMatchTextFtsRPC &&
      checks.chunksWithEmbeddings > 0;

    const missingItems: string[] = [];
    if (!checks.hasTextChunks) missingItems.push('text_chunks table');
    if (!checks.hasPgVector) missingItems.push('pgvector extension');
    if (!checks.hasOpenAIKey) missingItems.push('OPENAI_API_KEY environment variable');
    if (checks.chunksWithEmbeddings === 0) missingItems.push('Text embeddings');
    if (!checks.hasMatchTextChunksRPC) missingItems.push('match_text_chunks RPC (Migration 034)');
    if (!checks.hasMatchTextFtsRPC) missingItems.push('match_text_fts RPC (Migration 034)');

    return NextResponse.json({
      status: isFullySetup ? 'ready' : 'incomplete',
      checks,
      missingItems,
      recommendations: {
        migrations: {
          required: [
            checks.hasTextChunks ? null : '021_add_convergence_machine_schema.sql',
          ].filter(Boolean),
          recommended: [
            checks.hasMatchTextChunksRPC && checks.hasMatchTextFtsRPC ? null : '034_search_optimizations.sql',
          ].filter(Boolean),
        },
        nextSteps: missingItems.length > 0 ? [
          'Run missing migrations in Supabase SQL Editor',
          checks.hasOpenAIKey ? null : 'Set OPENAI_API_KEY in .env.local',
          checks.chunksWithEmbeddings === 0 ? 'Generate embeddings for texts via /api/parallax/generate-embeddings' : null,
        ].filter(Boolean) : ['✅ Search is optimized and ready!'],
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
