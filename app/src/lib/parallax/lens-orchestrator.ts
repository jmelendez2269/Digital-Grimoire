import { Lens, LensType, getLens, getActiveLenses, getAllLenses } from './lenses';
import { hybridSearch, HybridSearchResult } from './hybrid-retrieval';
import { aiOrchestrator, ChatMessage, AIModel } from '@/lib/ai/ai-orchestrator';

export interface LensWeights {
  scientific: number;
  psychological: number;
  philosophical: number;
  religious_spiritual: number;
  historical_anthropological: number;
  symbolic_occult: number;
  mathematical: number;
}

export type ResponseLength = 'short' | 'medium' | 'long';

export interface ResponseLengthConfig {
  synthesisMaxTokens: number;
  lensMaxTokens: number;
  lensSummaryMaxTokens: number;
}

export interface LensResponse {
  lens: LensType;
  lensName: string;
  content: string;
  sources: Array<{
    text_id: string;
    text_title?: string;
    text_author?: string;
    chunk_id?: string;
    chunk_index?: number;
    relevance: number;
    content_preview?: string; // First 200 chars of chunk content
  }>;
}

export interface MultiLensResponse {
  query: string;
  responses: LensResponse[];
  synthesis: string;
  sources: Array<{
    text_id: string;
    text_title?: string;
    text_author?: string;
    chunk_id?: string;
    chunk_index?: number;
    relevance?: number;
  }>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Get max tokens based on response length preference
 */
export function getResponseLengthConfig(length: ResponseLength = 'short'): ResponseLengthConfig {
  switch (length) {
    case 'short':
      return {
        synthesisMaxTokens: 200,
        lensMaxTokens: 150,
        lensSummaryMaxTokens: 60,
      };
    case 'long':
      return {
        synthesisMaxTokens: 1000,
        lensMaxTokens: 750,
        lensSummaryMaxTokens: 150,
      };
    default: // medium
      return {
        synthesisMaxTokens: 400,
        lensMaxTokens: 400,
        lensSummaryMaxTokens: 90,
      };
  }
}

/**
 * Get intensity label from numeric value
 */
function getIntensityLabel(value: number): string {
  if (value === 0) return 'OFF';
  if (value <= 15) return 'MINIMAL';
  if (value <= 30) return 'STANDARD';
  if (value <= 60) return 'BOOSTED';
  return 'DOMINANT';
}

/**
 * Normalize weights to percentages that sum to 100
 */
function normalizeWeights(weights: LensWeights): Record<string, { normalized: number; intensity: string }> {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (total === 0) return {};

  const normalized: Record<string, { normalized: number; intensity: string }> = {};
  Object.entries(weights).forEach(([lens, weight]) => {
    if (weight > 0) {
      normalized[lens] = {
        normalized: Math.round((weight / total) * 100 * 10) / 10, // Round to 1 decimal
        intensity: getIntensityLabel(weight),
      };
    }
  });

  return normalized;
}

/**
 * Detect dominance pattern in weights
 */
function detectDominance(normalizedWeights: Record<string, { normalized: number; intensity: string }>): {
  type: 'single' | 'dual' | 'tiered' | 'balanced';
  primary?: string[];
  secondary?: string[];
} {
  const entries = Object.entries(normalizedWeights)
    .map(([lens, data]) => ({ lens, ...data }))
    .sort((a, b) => b.normalized - a.normalized);

  if (entries.length === 0) {
    return { type: 'balanced' };
  }

  const top = entries[0];
  const second = entries[1];
  const third = entries[2];

  // Single dominant (>50% of total)
  if (top.normalized > 50) {
    return {
      type: 'single',
      primary: [top.lens],
      secondary: entries.slice(1).map(e => e.lens),
    };
  }

  // Dual focus (top 2 >60% combined)
  if (second && (top.normalized + second.normalized) > 60) {
    return {
      type: 'dual',
      primary: [top.lens, second.lens],
      secondary: entries.slice(2).map(e => e.lens),
    };
  }

  // Tiered (top 3 >70% combined)
  if (third && (top.normalized + second.normalized + third.normalized) > 70) {
    return {
      type: 'tiered',
      primary: [top.lens, second.lens, third.lens],
      secondary: entries.slice(3).map(e => e.lens),
    };
  }

  // Balanced
  return {
    type: 'balanced',
    primary: entries.map(e => e.lens),
  };
}

/**
 * Build intensity-aware instructions based on the mix of intensity levels
 */
function buildIntensityAwareInstructions(
  activeLenses: Lens[],
  lensWeights: LensWeights,
  normalizedWeights: Record<string, { normalized: number; intensity: string }>,
  dominance: { type: string; primary?: string[]; secondary?: string[] }
): { dominanceInstructions: string; openingInstructions: string } {

  // Group lenses by intensity level
  const intensityGroups: Record<string, { lenses: string[]; totalNormalized: number }> = {
    MAX: { lenses: [], totalNormalized: 0 },
    HIGH: { lenses: [], totalNormalized: 0 },
    MID: { lenses: [], totalNormalized: 0 },
    LOW: { lenses: [], totalNormalized: 0 },
  };

  activeLenses.forEach(lens => {
    const weight = lensWeights[lens.id as keyof LensWeights] || 0;
    const normalized = normalizedWeights[lens.id];
    if (normalized) {
      const intensity = normalized.intensity;
      if (intensity === 'DOMINANT' || weight === 100) {
        intensityGroups.MAX.lenses.push(lens.name);
        intensityGroups.MAX.totalNormalized += normalized.normalized;
      } else if (intensity === 'BOOSTED' || weight === 60) {
        intensityGroups.HIGH.lenses.push(lens.name);
        intensityGroups.HIGH.totalNormalized += normalized.normalized;
      } else if (intensity === 'STANDARD' || weight === 30) {
        intensityGroups.MID.lenses.push(lens.name);
        intensityGroups.MID.totalNormalized += normalized.normalized;
      } else if (intensity === 'MINIMAL' || weight === 15) {
        intensityGroups.LOW.lenses.push(lens.name);
        intensityGroups.LOW.totalNormalized += normalized.normalized;
      }
    }
  });

  let dominanceInstructions = '';
  let openingInstructions = '';

  // Case 1: One Max, all others off
  if (intensityGroups.MAX.lenses.length === 1 &&
    intensityGroups.HIGH.lenses.length === 0 &&
    intensityGroups.MID.lenses.length === 0 &&
    intensityGroups.LOW.lenses.length === 0) {
    dominanceInstructions = `\n\nPRIMARY FOCUS: The ${intensityGroups.MAX.lenses[0]} perspective is set to MAXIMUM intensity (100% weight). Your synthesis should focus PRIMARILY and HEAVILY on this perspective.`;
  }
  // Case 2: One Max + High (Boosted) - e.g., Max + Boosted + Low mix
  else if (intensityGroups.MAX.lenses.length === 1 && intensityGroups.HIGH.lenses.length > 0) {
    const highPercent = intensityGroups.HIGH.totalNormalized.toFixed(1);
    dominanceInstructions = `\n\nPRIMARY FOCUS: The ${intensityGroups.MAX.lenses[0]} perspective is MAXIMUM intensity and should be the primary focus. The ${intensityGroups.HIGH.lenses.join(' and ')} perspective(s) at HIGH intensity (${highPercent}% combined) should provide significant supporting context.`;
    if (intensityGroups.MID.lenses.length > 0) {
      const midPercent = intensityGroups.MID.totalNormalized.toFixed(1);
      dominanceInstructions += ` The ${intensityGroups.MID.lenses.join(' and ')} perspective(s) at MID intensity (${midPercent}% combined) should provide moderate context.`;
    }
    if (intensityGroups.LOW.lenses.length > 0) {
      const lowPercent = intensityGroups.LOW.totalNormalized.toFixed(1);
      dominanceInstructions += ` Other perspectives (${intensityGroups.LOW.lenses.join(', ')}) at LOW intensity (${lowPercent}% combined) should provide minimal context.`;
    }
  }
  // Case 3: One Max + Mid/Low mix (no High)
  else if (intensityGroups.MAX.lenses.length === 1) {
    const supporting: string[] = [];
    if (intensityGroups.MID.lenses.length > 0) {
      const midPercent = intensityGroups.MID.totalNormalized.toFixed(1);
      supporting.push(`${intensityGroups.MID.lenses.join(' and ')} at MID intensity (${midPercent}% combined)`);
    }
    if (intensityGroups.LOW.lenses.length > 0) {
      const lowPercent = intensityGroups.LOW.totalNormalized.toFixed(1);
      supporting.push(`${intensityGroups.LOW.lenses.join(' and ')} at LOW intensity (${lowPercent}% combined)`);
    }
    dominanceInstructions = `\n\nPRIMARY FOCUS: The ${intensityGroups.MAX.lenses[0]} perspective is MAXIMUM intensity and should be the primary focus. ${supporting.join(', ')} should provide supporting context.`;
  }
  // Case 4: Multiple High (Boosted) lenses, no Max
  else if (intensityGroups.HIGH.lenses.length >= 2 && intensityGroups.MAX.lenses.length === 0) {
    const highPercent = intensityGroups.HIGH.totalNormalized.toFixed(1);
    dominanceInstructions = `\n\nPRIMARY FOCUS: The ${intensityGroups.HIGH.lenses.join(' and ')} perspectives at HIGH intensity together represent ${highPercent}% of total weight. Focus primarily on these perspectives.`;
    if (intensityGroups.MID.lenses.length > 0) {
      const midPercent = intensityGroups.MID.totalNormalized.toFixed(1);
      dominanceInstructions += ` The ${intensityGroups.MID.lenses.join(' and ')} perspective(s) at MID intensity (${midPercent}% combined) should provide moderate context.`;
    }
    if (intensityGroups.LOW.lenses.length > 0) {
      const lowPercent = intensityGroups.LOW.totalNormalized.toFixed(1);
      dominanceInstructions += ` Other perspectives (${intensityGroups.LOW.lenses.join(', ')}) at LOW intensity (${lowPercent}% combined) should provide minimal context.`;
    }
  }
  // Case 5: One High + Mid/Low mix
  else if (intensityGroups.HIGH.lenses.length === 1 && intensityGroups.MAX.lenses.length === 0) {
    const highPercent = intensityGroups.HIGH.totalNormalized.toFixed(1);
    dominanceInstructions = `\n\nPRIMARY FOCUS: The ${intensityGroups.HIGH.lenses[0]} perspective at HIGH intensity (${highPercent}%) should be the primary focus.`;
    if (intensityGroups.MID.lenses.length > 0) {
      const midPercent = intensityGroups.MID.totalNormalized.toFixed(1);
      dominanceInstructions += ` The ${intensityGroups.MID.lenses.join(' and ')} perspective(s) at MID intensity (${midPercent}% combined) should provide moderate context.`;
    }
    if (intensityGroups.LOW.lenses.length > 0) {
      const lowPercent = intensityGroups.LOW.totalNormalized.toFixed(1);
      dominanceInstructions += ` Other perspectives (${intensityGroups.LOW.lenses.join(', ')}) at LOW intensity (${lowPercent}% combined) should provide minimal context.`;
    }
  }
  // Case 6: Balanced mix (no Max, no High, mix of Mid/Low)
  else if (intensityGroups.MAX.lenses.length === 0 && intensityGroups.HIGH.lenses.length === 0) {
    const primary: string[] = [];
    if (intensityGroups.MID.lenses.length > 0) {
      primary.push(...intensityGroups.MID.lenses);
      const midPercent = intensityGroups.MID.totalNormalized.toFixed(1);
      dominanceInstructions = `\n\nFOCUS: Emphasize the ${intensityGroups.MID.lenses.join(' and ')} perspective(s) at MID intensity (${midPercent}% combined).`;
    }
    if (intensityGroups.LOW.lenses.length > 0) {
      const lowPercent = intensityGroups.LOW.totalNormalized.toFixed(1);
      if (primary.length > 0) {
        dominanceInstructions += ` The ${intensityGroups.LOW.lenses.join(' and ')} perspective(s) at LOW intensity (${lowPercent}% combined) should provide supporting context.`;
      } else {
        dominanceInstructions = `\n\nFOCUS: All perspectives are at LOW intensity. Provide a balanced synthesis across ${intensityGroups.LOW.lenses.join(', ')} (${lowPercent}% combined).`;
      }
    }
  }
  // Fallback to existing dominance detection for edge cases
  else {
    if (dominance.type === 'single' && dominance.primary) {
      const primaryLens = activeLenses.find(l => l.id === dominance.primary![0]);
      const rawWeight = lensWeights[dominance.primary[0] as keyof LensWeights] || 0;
      if (rawWeight === 100) {
        dominanceInstructions = `\n\nPRIMARY FOCUS: The ${primaryLens?.name || 'primary'} perspective is set to MAXIMUM intensity (100% weight). Your synthesis should focus PRIMARILY and HEAVILY on this perspective, with other perspectives providing minimal supporting context only.`;
      } else {
        dominanceInstructions = `\n\nPRIMARY FOCUS: The ${primaryLens?.name || 'primary'} perspective is DOMINANT (${normalizedWeights[dominance.primary[0]]?.normalized}% of total weight). Your synthesis should focus PRIMARILY on this perspective, with other perspectives providing brief supporting context only.`;
      }
    } else if (dominance.type === 'dual' && dominance.primary) {
      const primaryLenses = dominance.primary.map(id => activeLenses.find(l => l.id === id)?.name).filter(Boolean);
      const primaryPercent = dominance.primary.reduce((sum, id) => sum + (normalizedWeights[id]?.normalized || 0), 0);
      dominanceInstructions = `\n\nPRIMARY FOCUS: The ${primaryLenses.join(' and ')} perspectives together represent ${primaryPercent.toFixed(1)}% of total weight. Focus primarily on these two perspectives, with other perspectives providing supporting context.`;
    } else if (dominance.type === 'tiered' && dominance.primary) {
      const primaryLenses = dominance.primary.map(id => activeLenses.find(l => l.id === id)?.name).filter(Boolean);
      const primaryPercent = dominance.primary.reduce((sum, id) => sum + (normalizedWeights[id]?.normalized || 0), 0);
      dominanceInstructions = `\n\nTIERED FOCUS: The ${primaryLenses.join(', ')} perspectives represent the top tier (${primaryPercent.toFixed(1)}% combined). Emphasize these perspectives, with others providing minimal supporting context.`;
    } else {
      dominanceInstructions = `\n\nFOCUS: Synthesize all perspectives proportionally based on their intensity levels.`;
    }
  }

  openingInstructions = `\n\nIMPORTANT: Avoid formulaic openings. Start with a direct, varied response that doesn't repeat the question structure. Do not begin with "The concept of X is multifaceted..." or similar generic phrases.`;

  return { dominanceInstructions, openingInstructions };
}

/**
 * Get length-specific instructions for synthesis prompts
 */
function getLengthInstructions(maxTokens: number): string {
  if (maxTokens <= 200) {
    // Short: Very concise, 1-2 paragraphs max
    return `CRITICAL: Keep your response EXTREMELY CONCISE. Aim for 1-2 short paragraphs (approximately 150-200 tokens). Focus ONLY on the most essential insights and parallax points. Be direct, avoid elaboration, and cut any unnecessary words.`;
  } else if (maxTokens <= 400) {
    // Medium: Balanced
    return `Keep your response concise and focused. Aim for 2-3 paragraphs (approximately 300-400 tokens). Provide essential detail while remaining brief.`;
  } else {
    // Long: Comprehensive
    return `Provide a comprehensive synthesis. You may use up to ${maxTokens} tokens to explore the synthesis of perspectives, provide detailed analysis, and include nuanced insights.`;
  }
}

/**
 * Generate a brief summary for a lens (used for synthesis when full response not needed)
 */
export async function generateLensSummary(
  query: string,
  lens: Lens,
  context: HybridSearchResult[],
  maxTokens: number = 200
): Promise<{ summary: string; tokenUsage: TokenUsage }> {
  const contextText = context
    .slice(0, 3) // Use top 3 results for summary
    .map((result, idx) => {
      const title = result.text_title || 'Unknown';
      return `[Source ${idx + 1}: ${title}]\n${result.content.substring(0, 300)}...\n`;
    })
    .join('\n---\n\n');

  const systemPrompt = `${lens.systemPrompt}

You are providing a BRIEF summary (2-3 sentences) from the ${lens.name} perspective. Be concise.`;

  const userPrompt = `Question: ${query}

Context:
${contextText}

Provide a brief summary from the ${lens.name} perspective.`;

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const model = lens.defaultModel || 'gpt-4o';
    const completion = await aiOrchestrator.chatComplete(messages, {
      model,
      temperature: 0.7,
      maxTokens,
    });

    const tokenUsage: TokenUsage = {
      inputTokens: completion.usage.promptTokens,
      outputTokens: completion.usage.completionTokens,
    };

    console.log(`[Token Tracking] ${lens.name} summary (${model}): ${tokenUsage.inputTokens} input, ${tokenUsage.outputTokens} output tokens`);

    return {
      summary: completion.content,
      tokenUsage,
    };
  } catch (error) {
    console.error(`Error generating ${lens.name} summary:`, error);
    return {
      summary: '',
      tokenUsage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

/**
 * Generate response for a single lens
 */
export async function generateLensResponse(
  query: string,
  lens: Lens,
  context: HybridSearchResult[],
  maxTokens: number = 1000
): Promise<LensResponse & { tokenUsage: TokenUsage }> {
  // Prepare context for the lens
  const contextText = context
    .slice(0, 5) // Use top 5 results
    .map((result, idx) => {
      const title = result.text_title || 'Unknown';
      const author = result.text_author ? ` by ${result.text_author}` : '';
      return `[Source ${idx + 1}: ${title}${author}]\n${result.content}\n`;
    })
    .join('\n---\n\n');

  const systemPrompt = `${lens.systemPrompt}

You are responding to a user's question using the retrieved context below. Cite your sources using [Source X] format. Be concise but thorough.`;

  const userPrompt = `Question: ${query}

Context:
${contextText}

Please answer the question from the ${lens.name} perspective.`;

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const model = lens.defaultModel || 'gpt-4o';
    const completion = await aiOrchestrator.chatComplete(messages, {
      model,
      temperature: 0.7,
      maxTokens,
    });

    const tokenUsage: TokenUsage = {
      inputTokens: completion.usage.promptTokens,
      outputTokens: completion.usage.completionTokens,
    };

    console.log(`[Token Tracking] ${lens.name} response (${model}): ${tokenUsage.inputTokens} input, ${tokenUsage.outputTokens} output tokens`);

    const content = completion.content || 'No response generated.';

    // Extract sources from context with preview
    const sources = context.slice(0, 5).map(result => ({
      text_id: result.text_id,
      text_title: result.text_title,
      text_author: result.text_author,
      chunk_id: result.chunk_id,
      chunk_index: result.chunk_index,
      relevance: result.finalScore,
      content_preview: result.content?.substring(0, 200) || undefined,
    }));

    return {
      lens: lens.id,
      lensName: lens.name,
      content,
      sources,
      tokenUsage,
    };
  } catch (error) {
    console.error(`Error generating ${lens.name} response:`, error);
    return {
      lens: lens.id,
      lensName: lens.name,
      content: `Error generating ${lens.name} perspective. Please try again.`,
      sources: [],
      tokenUsage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

/**
 * Generate synthesis from lens summaries (without full lens responses)
 */
export async function generateSynthesisFromSummaries(
  query: string,
  lensWeights: LensWeights,
  context: HybridSearchResult[],
  lengthConfig: ResponseLengthConfig
): Promise<{ synthesis: string; tokenUsage: TokenUsage }> {
  const activeLenses = getActiveLenses(lensWeights);

  if (activeLenses.length === 0) {
    return {
      synthesis: 'No active lenses selected. Please enable at least one lens.',
      tokenUsage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  // Generate brief summaries for each active lens (in parallel)
  const lensSummaryResults = await Promise.all(
    activeLenses.map(lens =>
      generateLensSummary(query, lens, context, lengthConfig.lensSummaryMaxTokens)
    )
  );

  // Extract summaries and accumulate token usage
  const lensSummaries = lensSummaryResults.map(r => r.summary);
  let totalInputTokens = lensSummaryResults.reduce((sum, r) => sum + r.tokenUsage.inputTokens, 0);
  let totalOutputTokens = lensSummaryResults.reduce((sum, r) => sum + r.tokenUsage.outputTokens, 0);

  // Normalize weights and get intensity labels
  const normalizedWeights = normalizeWeights(lensWeights);
  const dominance = detectDominance(normalizedWeights);

  // Build weighted synthesis prompt from summaries with intensity labels
  const perspectivesText = activeLenses
    .map((lens, idx) => {
      const weight = lensWeights[lens.id] || 0;
      const normalized = normalizedWeights[lens.id];
      const intensity = normalized?.intensity || 'OFF';
      const percentage = normalized?.normalized || 0;
      return `[${lens.name} Perspective - ${intensity} intensity (${percentage}% of total)]\n${lensSummaries[idx]}\n`;
    })
    .join('\n---\n\n');

  // Check if one lens has 100% raw weight (exclusive focus)
  const rawWeights = Object.entries(lensWeights);
  const dominantLensRaw = rawWeights.find(([_, weight]) => weight === 100);
  const hasExclusiveDominant = dominantLensRaw && rawWeights.filter(([_, weight]) => weight > 0).length === 1;

  // Build intensity-aware instructions
  const { dominanceInstructions, openingInstructions } = buildIntensityAwareInstructions(
    activeLenses,
    lensWeights,
    normalizedWeights,
    dominance
  );

  const lengthInstructions = getLengthInstructions(lengthConfig.synthesisMaxTokens);

  // Vary prompt structure based on dominance pattern
  let promptStructure = '';
  if (hasExclusiveDominant) {
    promptStructure = `You are synthesizing multiple perspectives, with one perspective at maximum intensity.

Original Question: ${query}

Perspectives:
${perspectivesText}

Synthesize these perspectives with primary focus on the maximum intensity perspective.`;
  } else if (dominance.type === 'single') {
    promptStructure = `You are synthesizing multiple perspectives, with one dominant focus.

Original Question: ${query}

Perspectives:
${perspectivesText}

Synthesize these perspectives with primary focus on the dominant perspective.`;
  } else {
    promptStructure = `You are synthesizing multiple perspectives on the same question.

Original Question: ${query}

Perspectives:
${perspectivesText}

Synthesize these perspectives into a coherent, unified answer.`;
  }

  const synthesisPrompt = `${promptStructure}
${dominanceInstructions}${openingInstructions}

${lengthInstructions}

IMPORTANT: Your response must not exceed ${lengthConfig.synthesisMaxTokens} tokens. Stay strictly within this limit.`;

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at synthesizing multiple perspectives into unified insights.',
      },
      { role: 'user', content: synthesisPrompt },
    ];

    const completion = await aiOrchestrator.chatComplete(messages, {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: lengthConfig.synthesisMaxTokens,
    });

    // Accumulate token usage from synthesis call
    totalInputTokens += completion.usage.promptTokens;
    totalOutputTokens += completion.usage.completionTokens;

    const tokenUsage: TokenUsage = {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    };

    console.log(`[Token Tracking] Synthesis: ${tokenUsage.inputTokens} input, ${tokenUsage.outputTokens} output tokens (total)`);

    return {
      synthesis: completion.content || 'Synthesis generation failed.',
      tokenUsage,
    };
  } catch (error) {
    console.error('Error generating synthesis:', error);
    return {
      synthesis: 'Synthesis generation failed.',
      tokenUsage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
    };
  }
}

/**
 * Generate multi-lens response with weighted perspectives
 */
export async function generateMultiLensResponse(
  query: string,
  lensWeights: LensWeights,
  context: HybridSearchResult[],
  lengthConfig?: ResponseLengthConfig
): Promise<MultiLensResponse & { tokenUsage: TokenUsage }> {
  const activeLenses = getActiveLenses(lensWeights);
  const config = lengthConfig || getResponseLengthConfig('medium');

  if (activeLenses.length === 0) {
    return {
      query,
      responses: [],
      synthesis: 'No active lenses selected. Please enable at least one lens.',
      sources: [],
      tokenUsage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  // Generate responses for each active lens (in parallel)
  const lensResponses = await Promise.all(
    activeLenses.map(lens => generateLensResponse(query, lens, context, config.lensMaxTokens))
  );

  // Merge responses based on weights
  const synthesisResult = await mergeLensResponses(lensResponses, lensWeights, query, config.synthesisMaxTokens);

  // Extract lens responses without tokenUsage for the response object
  const lensResponsesWithoutTokens: LensResponse[] = lensResponses.map(({ tokenUsage, ...rest }) => rest);

  // Collect unique sources (prefer highest relevance)
  const sourceMap = new Map<string, {
    text_id: string;
    text_title?: string;
    text_author?: string;
    chunk_id?: string;
    chunk_index?: number;
    relevance?: number;
  }>();
  lensResponses.forEach(response => {
    response.sources.forEach(source => {
      const existing = sourceMap.get(source.text_id);
      if (!existing || (source.relevance && (!existing.relevance || source.relevance > existing.relevance))) {
        sourceMap.set(source.text_id, {
          text_id: source.text_id,
          text_title: source.text_title,
          text_author: source.text_author,
          chunk_id: source.chunk_id,
          chunk_index: source.chunk_index,
          relevance: source.relevance,
        });
      }
    });
  });

  return {
    query,
    responses: lensResponsesWithoutTokens,
    synthesis: synthesisResult.synthesis,
    sources: Array.from(sourceMap.values()),
    tokenUsage: synthesisResult.tokenUsage,
  };
}

/**
 * Merge multiple lens responses into a unified synthesis
 */
export async function mergeLensResponses(
  responses: (LensResponse & { tokenUsage?: TokenUsage })[],
  weights: LensWeights,
  originalQuery: string,
  maxTokens: number = 1500
): Promise<{ synthesis: string; tokenUsage: TokenUsage }> {
  // Accumulate token usage from lens responses
  let totalInputTokens = responses.reduce((sum, r) => sum + (r.tokenUsage?.inputTokens || 0), 0);
  let totalOutputTokens = responses.reduce((sum, r) => sum + (r.tokenUsage?.outputTokens || 0), 0);

  if (responses.length === 0) {
    return {
      synthesis: 'No perspectives available.',
      tokenUsage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  if (responses.length === 1) {
    return {
      synthesis: responses[0].content,
      tokenUsage: responses[0].tokenUsage || { inputTokens: 0, outputTokens: 0 },
    };
  }

  // Normalize weights and get intensity labels
  const normalizedWeights = normalizeWeights(weights);
  const dominance = detectDominance(normalizedWeights);

  // Build weighted synthesis prompt with intensity labels
  const perspectivesText = responses
    .map(response => {
      const weight = weights[response.lens] || 0;
      const normalized = normalizedWeights[response.lens];
      const intensity = normalized?.intensity || 'OFF';
      const percentage = normalized?.normalized || 0;
      return `[${response.lensName} Perspective - ${intensity} intensity (${percentage}% of total)]\n${response.content}\n`;
    })
    .join('\n---\n\n');

  // Get active lenses from responses for intensity-aware instructions
  const activeLensIds = responses.map(r => r.lens);
  const activeLensesFromResponses = activeLensIds.map(id => {
    const lens = getAllLenses().find(l => l.id === id);
    return lens!;
  }).filter(Boolean);

  // Build intensity-aware instructions
  const { dominanceInstructions, openingInstructions } = buildIntensityAwareInstructions(
    activeLensesFromResponses,
    weights,
    normalizedWeights,
    dominance
  );

  // Check if one lens has 100% raw weight (exclusive focus)
  const rawWeights = Object.entries(weights);
  const dominantLensRaw = rawWeights.find(([_, weight]) => weight === 100);
  const hasExclusiveDominant = dominantLensRaw && rawWeights.filter(([_, weight]) => weight > 0).length === 1;

  // Vary prompt structure based on dominance pattern
  let promptStructure = '';
  if (hasExclusiveDominant) {
    promptStructure = `You are synthesizing multiple perspectives, with one perspective at maximum intensity.

Original Question: ${originalQuery}

Perspectives:
${perspectivesText}

Synthesize these perspectives with primary focus on the maximum intensity perspective.`;
  } else if (dominance.type === 'single') {
    promptStructure = `You are synthesizing multiple perspectives, with one dominant focus.

Original Question: ${originalQuery}

Perspectives:
${perspectivesText}

Synthesize these perspectives with primary focus on the dominant perspective.`;
  } else {
    promptStructure = `You are synthesizing multiple perspectives on the same question.

Original Question: ${originalQuery}

Perspectives:
${perspectivesText}

Synthesize these perspectives into a coherent, unified answer.`;
  }

  const lengthInstructions = getLengthInstructions(maxTokens);

  const synthesisPrompt = `${promptStructure}
${dominanceInstructions}${openingInstructions}

${lengthInstructions}

IMPORTANT: Your response must not exceed ${maxTokens} tokens. Stay strictly within this limit.`;

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at synthesizing multiple perspectives into unified insights.',
      },
      { role: 'user', content: synthesisPrompt },
    ];

    const completion = await aiOrchestrator.chatComplete(messages, {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens,
    });

    // Accumulate token usage from synthesis call
    totalInputTokens += completion.usage.promptTokens;
    totalOutputTokens += completion.usage.completionTokens;

    return {
      synthesis: completion.content || 'Synthesis generation failed.',
      tokenUsage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
    };
  } catch (error) {
    console.error('Error generating synthesis:', error);
    // Fallback: simple concatenation
    return {
      synthesis: responses.map(r => `**${r.lensName}:** ${r.content}`).join('\n\n'),
      tokenUsage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
    };
  }
}

