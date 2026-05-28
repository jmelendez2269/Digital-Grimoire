import { createClient } from '@/lib/supabase/server';
import { logApiUsage } from '@/lib/usage-tracker';
import { getDefaultOpenRouterModel, getOpenRouterClient } from '@/lib/ai/openrouter-client';

export interface Concept {
  id: string;
  name: string;
  slug?: string;
  tradition?: string;
  tradition_id?: string;
  short_definition?: string;
  tags?: string[];
  era?: string;
}

export interface RelevanceScore {
  conceptId: string;
  score: number;
  reasoning?: string;
}

/**
 * Use AI to score concept relevance for ambiguous queries
 * This is only called when:
 * 1. Query doesn't match exact names
 * 2. Multiple concepts have similar text matches
 * 3. User explicitly requests AI sorting
 * 
 * Cost: ~$0.01-0.03 per search (depends on result count)
 */
export async function scoreConceptsWithAI(
  query: string,
  concepts: Concept[],
  userId?: string
): Promise<RelevanceScore[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('[AI Relevance] OpenRouter API key not configured, skipping AI scoring');
    return concepts.map((c) => ({ conceptId: c.id, score: 0 }));
  }

  if (concepts.length === 0) {
    return [];
  }

  // Limit to top 20 concepts to keep costs reasonable
  const conceptsToScore = concepts.slice(0, 20);
  
  const conceptsText = conceptsToScore.map((c, idx) => {
    const definition = c.short_definition || '';
    const tags = c.tags?.join(', ') || '';
    const tradition = c.tradition || '';
    return `${idx + 1}. "${c.name}"${tradition ? ` (${tradition})` : ''}${definition ? ` - ${definition.substring(0, 100)}` : ''}${tags ? ` [${tags}]` : ''}`;
  }).join('\n');

  const prompt = `You are a semantic search assistant. Score how relevant each concept is to the user's query.

User Query: "${query}"

Concepts to score:
${conceptsText}

For each concept, provide a relevance score from 0.0 to 1.0 where:
- 1.0 = Perfect match (concept directly answers the query)
- 0.8-0.9 = Very relevant (concept closely related to query)
- 0.5-0.7 = Moderately relevant (concept somewhat related)
- 0.2-0.4 = Slightly relevant (concept tangentially related)
- 0.0-0.1 = Not relevant

Return a JSON object with this exact format:
{
  "scores": [
    {"conceptId": "concept-id-1", "score": 0.95, "reasoning": "Brief explanation"},
    {"conceptId": "concept-id-2", "score": 0.72, "reasoning": "Brief explanation"},
    ...
  ]
}

The array should have exactly ${conceptsToScore.length} entries, one for each concept in order.`;

  try {
    const openai = getOpenRouterClient();
    const model = getDefaultOpenRouterModel();
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a semantic search assistant. Score concept relevance accurately. Always return valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent scoring
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const usage = completion.usage;
    const inputTokens = usage?.prompt_tokens || 0;
    const outputTokens = usage?.completion_tokens || 0;

    // Log usage
    if (userId && (inputTokens > 0 || outputTokens > 0)) {
      await logApiUsage({
        service: 'openai_metadata',
        operation: 'ai_concept_relevance_scoring',
        unitsUsed: inputTokens + outputTokens,
        unitType: 'tokens',
        userId,
        requestMetadata: {
          inputTokens,
          outputTokens,
          query,
          conceptCount: conceptsToScore.length,
          model: completion.model || model,
        },
        success: true,
      });
    }

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);
    const scores = parsed.scores || [];

    // Map scores back to concepts
    const scoreMap = new Map<string, RelevanceScore>();
    scores.forEach((s: any, idx: number) => {
      const concept = conceptsToScore[idx];
      if (concept) {
        scoreMap.set(concept.id, {
          conceptId: concept.id,
          score: Math.max(0, Math.min(1, parseFloat(s.score) || 0)),
          reasoning: s.reasoning,
        });
      }
    });

    // Add default scores for concepts not scored by AI
    conceptsToScore.forEach((c) => {
      if (!scoreMap.has(c.id)) {
        scoreMap.set(c.id, { conceptId: c.id, score: 0 });
      }
    });

    return Array.from(scoreMap.values());
  } catch (error) {
    console.error('[AI Relevance] Error scoring concepts:', error);
    // Return default scores on error
    return conceptsToScore.map((c) => ({ conceptId: c.id, score: 0 }));
  }
}

/**
 * Determine if a query would benefit from AI scoring
 * Returns true if query is ambiguous or has multiple similar matches
 */
export function shouldUseAIScoring(query: string, concepts: Concept[]): boolean {
  const queryLower = query.toLowerCase().trim();
  
  // Don't use AI for very short queries (likely exact matches)
  if (queryLower.length < 3) {
    return false;
  }

  // Count exact/close matches
  const exactMatches = concepts.filter((c) => {
    const nameLower = (c.name || '').toLowerCase();
    return nameLower === queryLower || nameLower.startsWith(queryLower);
  }).length;

  // Use AI if:
  // 1. No exact matches (ambiguous query)
  // 2. Multiple partial matches (need disambiguation)
  // 3. Query contains multiple words (semantic search needed)
  const wordCount = queryLower.split(/\s+/).length;
  const hasMultipleWords = wordCount > 1;
  const hasManyPartialMatches = exactMatches > 5;

  return hasMultipleWords || (exactMatches === 0 && concepts.length > 3) || hasManyPartialMatches;
}

/**
 * Cache key for AI-scored results
 */
export function getCacheKey(query: string, conceptIds: string[]): string {
  const ids = conceptIds.sort().join(',');
  return `ai_relevance:${query.toLowerCase()}:${ids}`;
}

/**
 * Check cache for AI-scored results
 */
export async function getCachedScores(
  query: string,
  conceptIds: string[]
): Promise<RelevanceScore[] | null> {
  const supabase = await createClient();
  const cacheKey = getCacheKey(query, conceptIds);

  const { data, error } = await supabase
    .from('ai_relevance_cache')
    .select('scores')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data.scores as RelevanceScore[];
}

/**
 * Cache AI-scored results
 */
export async function cacheScores(
  query: string,
  conceptIds: string[],
  scores: RelevanceScore[],
  ttlHours: number = 24
): Promise<void> {
  const supabase = await createClient();
  const cacheKey = getCacheKey(query, conceptIds);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  await supabase.from('ai_relevance_cache').upsert({
    cache_key: cacheKey,
    query: query.toLowerCase(),
    concept_ids: conceptIds,
    scores,
    expires_at: expiresAt.toISOString(),
  });
}
