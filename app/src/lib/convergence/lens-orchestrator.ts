import OpenAI from 'openai';
import { Lens, LensType, getLens, getActiveLenses } from './lenses';
import { hybridSearch, HybridSearchResult } from './hybrid-retrieval';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

/**
 * Get max tokens based on response length preference
 */
export function getResponseLengthConfig(length: ResponseLength = 'short'): ResponseLengthConfig {
  switch (length) {
    case 'short':
      return {
        synthesisMaxTokens: 400,
        lensMaxTokens: 300,
        lensSummaryMaxTokens: 120,
      };
    case 'long':
      return {
        synthesisMaxTokens: 2000,
        lensMaxTokens: 1500,
        lensSummaryMaxTokens: 300,
      };
    default: // medium
      return {
        synthesisMaxTokens: 800,
        lensMaxTokens: 600,
        lensSummaryMaxTokens: 180,
      };
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
): Promise<string> {
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error(`Error generating ${lens.name} summary:`, error);
    return '';
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
): Promise<LensResponse> {
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const content = completion.choices[0]?.message?.content || 'No response generated.';

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
    };
  } catch (error) {
    console.error(`Error generating ${lens.name} response:`, error);
    return {
      lens: lens.id,
      lensName: lens.name,
      content: `Error generating ${lens.name} perspective. Please try again.`,
      sources: [],
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
): Promise<string> {
  const activeLenses = getActiveLenses(lensWeights);

  if (activeLenses.length === 0) {
    return 'No active lenses selected. Please enable at least one lens.';
  }

  // Generate brief summaries for each active lens (in parallel)
  const lensSummaries = await Promise.all(
    activeLenses.map(lens => 
      generateLensSummary(query, lens, context, lengthConfig.lensSummaryMaxTokens)
    )
  );

  // Build weighted synthesis prompt from summaries
  const perspectivesText = activeLenses
    .map((lens, idx) => {
      const weight = lensWeights[lens.id] || 0;
      const percentage = Math.round((weight / 100) * 100);
      return `[${lens.name} Perspective (Weight: ${percentage}%)]\n${lensSummaries[idx]}\n`;
    })
    .join('\n---\n\n');

  const synthesisPrompt = `You are synthesizing multiple perspectives on the same question.

Original Question: ${query}

Perspectives:
${perspectivesText}

Please synthesize these perspectives into a coherent, unified answer that:
1. Integrates insights from all perspectives (respecting their relative weights)
2. Highlights areas of convergence and common ground
3. Acknowledges unique contributions from each lens
4. Provides a holistic understanding of the question

Be comprehensive but concise.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at synthesizing multiple perspectives into unified insights.',
        },
        { role: 'user', content: synthesisPrompt },
      ],
      temperature: 0.7,
      max_tokens: lengthConfig.synthesisMaxTokens,
    });

    return completion.choices[0]?.message?.content || 'Synthesis generation failed.';
  } catch (error) {
    console.error('Error generating synthesis:', error);
    return 'Synthesis generation failed.';
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
): Promise<MultiLensResponse> {
  const activeLenses = getActiveLenses(lensWeights);
  const config = lengthConfig || getResponseLengthConfig('medium');

  if (activeLenses.length === 0) {
    return {
      query,
      responses: [],
      synthesis: 'No active lenses selected. Please enable at least one lens.',
      sources: [],
    };
  }

  // Generate responses for each active lens (in parallel)
  const lensResponses = await Promise.all(
    activeLenses.map(lens => generateLensResponse(query, lens, context, config.lensMaxTokens))
  );

  // Merge responses based on weights
  const synthesis = await mergeLensResponses(lensResponses, lensWeights, query, config.synthesisMaxTokens);

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
    responses: lensResponses,
    synthesis,
    sources: Array.from(sourceMap.values()),
  };
}

/**
 * Merge multiple lens responses into a unified synthesis
 */
export async function mergeLensResponses(
  responses: LensResponse[],
  weights: LensWeights,
  originalQuery: string,
  maxTokens: number = 1500
): Promise<string> {
  if (responses.length === 0) {
    return 'No perspectives available.';
  }

  if (responses.length === 1) {
    return responses[0].content;
  }

  // Build weighted synthesis prompt
  const perspectivesText = responses
    .map(response => {
      const weight = weights[response.lens] || 0;
      const percentage = Math.round((weight / 100) * 100);
      return `[${response.lensName} Perspective (Weight: ${percentage}%)]\n${response.content}\n`;
    })
    .join('\n---\n\n');

  const synthesisPrompt = `You are synthesizing multiple perspectives on the same question.

Original Question: ${originalQuery}

Perspectives:
${perspectivesText}

Please synthesize these perspectives into a coherent, unified answer that:
1. Integrates insights from all perspectives (respecting their relative weights)
2. Highlights areas of convergence and common ground
3. Acknowledges unique contributions from each lens
4. Provides a holistic understanding of the question

Be comprehensive but concise.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at synthesizing multiple perspectives into unified insights.',
        },
        { role: 'user', content: synthesisPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    return completion.choices[0]?.message?.content || 'Synthesis generation failed.';
  } catch (error) {
    console.error('Error generating synthesis:', error);
    // Fallback: simple concatenation
    return responses.map(r => `**${r.lensName}:** ${r.content}`).join('\n\n');
  }
}

