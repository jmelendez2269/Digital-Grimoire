

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hybridSearch, HybridSearchResult } from '@/lib/parallax/hybrid-retrieval';
import { aiOrchestrator, ChatMessage } from '@/lib/ai/ai-orchestrator';
import { checkRateLimit } from '@/lib/parallax/rate-limit';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter-client';

interface AiSearchResult {
    summary: string;
    libraryResults: Array<{
        book_id: string;
        title: string;
        author: string;
        relevanceSentence: string;
        relevanceLabel?: string;
        excerpts: Array<{
            text: string;
            page_number: number;
        }>;
    }>;
    externalRecommendations: Array<{
        title: string;
        author: string;
        reason: string;
    }>;
}

function buildFallbackLibraryResults(searchResults: HybridSearchResult[]): AiSearchResult['libraryResults'] {
    return searchResults.slice(0, 8).map((result, index) => ({
        book_id: result.text_id,
        title: result.text_title || 'Unknown Title',
        author: result.text_author || 'Unknown Author',
        relevanceSentence: index === 0
            ? 'This appears to be the strongest direct match in the library results.'
            : 'This text surfaced as a relevant supporting source for the search concept.',
        relevanceLabel: index === 0 ? 'Top Match' : 'Relevant Source',
        excerpts: [
            {
                text: result.content.trim().slice(0, 280),
                page_number: 1,
            },
        ],
    }));
}

function buildFallbackSummary(query: string, searchResults: HybridSearchResult[]): string {
    if (searchResults.length === 0) {
        return `No strong library matches were found for "${query}" yet. The search completed, but the system could not assemble a richer AI synthesis from the current results.`;
    }

    const topTitles = searchResults
        .slice(0, 3)
        .map(result => result.text_title || 'Unknown Title')
        .join(', ');

    return `Here is a direct library-first view of "${query}" based on the strongest matches currently available. The most relevant texts surfaced were ${topTitles}, and the excerpts below should still give you a useful starting point while the richer AI synthesis is unavailable.`;
}

function buildFallbackResponse(query: string, searchResults: HybridSearchResult[]): AiSearchResult {
    return {
        summary: buildFallbackSummary(query, searchResults),
        libraryResults: buildFallbackLibraryResults(searchResults),
        externalRecommendations: [],
    };
}

function hasUsableCachedLibraryResults(results: unknown): boolean {
    return !!results
        && typeof results === 'object'
        && Array.isArray((results as Partial<AiSearchResult>).libraryResults)
        && ((results as Partial<AiSearchResult>).libraryResults?.length ?? 0) > 0;
}

function normalizeAiResult(
    rawResult: unknown,
    query: string,
    searchResults: HybridSearchResult[]
): AiSearchResult {
    const fallback = buildFallbackResponse(query, searchResults);

    if (!rawResult || typeof rawResult !== 'object') {
        return fallback;
    }

    const candidate = rawResult as Partial<AiSearchResult>;
    const validTextIds = new Set(searchResults.map(result => result.text_id));

    const libraryResults = Array.isArray(candidate.libraryResults)
        ? candidate.libraryResults
            .filter((item): item is NonNullable<AiSearchResult['libraryResults']>[number] => {
                return !!item && typeof item === 'object' && typeof item.book_id === 'string' && validTextIds.has(item.book_id);
            })
            .map(item => ({
                book_id: item.book_id,
                title: typeof item.title === 'string' && item.title.trim() ? item.title : 'Unknown Title',
                author: typeof item.author === 'string' && item.author.trim() ? item.author : 'Unknown Author',
                relevanceSentence: typeof item.relevanceSentence === 'string' && item.relevanceSentence.trim()
                    ? item.relevanceSentence
                    : 'This text appears relevant to the search concept.',
                relevanceLabel: typeof item.relevanceLabel === 'string' && item.relevanceLabel.trim()
                    ? item.relevanceLabel
                    : undefined,
                excerpts: Array.isArray(item.excerpts)
                    ? item.excerpts
                        .filter((excerpt): excerpt is { text: string; page_number: number } => {
                            return !!excerpt && typeof excerpt.text === 'string';
                        })
                        .slice(0, 2)
                        .map(excerpt => ({
                            text: excerpt.text.trim(),
                            page_number: Number.isFinite(excerpt.page_number) ? excerpt.page_number : 1,
                        }))
                    : [],
            }))
        : [];

    const externalRecommendations = Array.isArray(candidate.externalRecommendations)
        ? candidate.externalRecommendations
            .filter((item): item is NonNullable<AiSearchResult['externalRecommendations']>[number] => {
                return !!item && typeof item === 'object' && typeof item.title === 'string';
            })
            .map(item => ({
                title: item.title.trim(),
                author: typeof item.author === 'string' ? item.author.trim() : 'Unknown Author',
                reason: typeof item.reason === 'string' && item.reason.trim()
                    ? item.reason
                    : 'Relevant external reading for this concept.',
            }))
            .filter(item => item.title.length > 0)
            .slice(0, 3)
        : [];

    return {
        summary: typeof candidate.summary === 'string' && candidate.summary.trim()
            ? candidate.summary.trim()
            : fallback.summary,
        libraryResults: libraryResults.length > 0 ? libraryResults : fallback.libraryResults,
        externalRecommendations,
    };
}

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

        // Check rate limit
        const rateLimit = await checkRateLimit(user.id);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    remaining: rateLimit.remaining,
                    resetDate: rateLimit.resetDate
                },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Invalid query' },
                { status: 400 }
            );
        }

        const normalizedQuery = query.trim().toLowerCase();

        // 0. Check Cache
        try {
            const { data: cachedData } = await supabase
                .from('search_cache')
                .select('results')
                .eq('query', normalizedQuery)
                .maybeSingle();

            if (cachedData && cachedData.results) {
                if (hasUsableCachedLibraryResults(cachedData.results)) {
                    console.log(`[Deep Search] Cache hit for: "${normalizedQuery}"`);
                    return NextResponse.json(cachedData.results);
                }

                console.log(`[Deep Search] Cache hit for "${normalizedQuery}" had no library results; refreshing live retrieval`);
            }
        } catch (cacheReadError) {
            console.warn('[Deep Search] Cache read error, proceeding to live search:', cacheReadError);
        }

        // 1. Perform Hybrid Search
        console.log(`[Deep Search] Searching for: "${query}"`);
        const searchResults = await hybridSearch(query, {
            limit: 15, // Reduced from 40 to 15 for 2.5x faster AI processing
            // We can add specific lenses or types if needed, but default is good for deep search
        });

        console.log(`[Deep Search] Found ${searchResults.length} results`);

        // 2. Prepare Context for AI
        const contextText = searchResults.map((result, index) => `
ID: ${result.text_id}
Title: ${result.text_title || 'Unknown Title'}
Author: ${result.text_author || 'Unknown Author'}
Content Snippet: ${result.content}
Source Index: ${index}
`).join('\n---\n');

        // 3. Construct Prompt
        const systemPrompt = `you are the Seven Lenses engine, an advanced AI designed to synthesize esoteric, philosophical, and scientific knowledge.
Your goal is to provide a "Deep Search" result that gives a conceptual summary, analyzes relevant library books, and suggests external readings.

Output MUST be a valid JSON object matching this TypeScript interface:

interface AiSearchResult {
    summary: string; // A 2-3 paragraph synthesis of the concept based on the query and context.
    libraryResults: Array<{
        book_id: string; // MUST match the 'ID' provided in the context exactly.
        title: string;
        author: string;
        relevanceSentence: string; // A single brief sentence explaining why this book is relevant.
        relevanceLabel?: string; // e.g., "High Relevance", "Foundational Text", "Scientific Perspective"
        excerpts: Array<{
            text: string; // A relevant quote from the content snippet.
            page_number: number; // Estimate based on content or default to 1 if unknown.
        }>; // Max 2 excerpts per book to save generation time.
    }>; // Only include the most relevant books (up to 15 max) from the context. Sort placing the most relevant books first.
    externalRecommendations: Array<{
        title: string;
        author: string;
        reason: string;
    }>; // Suggest 3 relevant books NOT in the context (real-world books).
}

Analyze the provided context quickly but deeply. Extract quotes accurately. If the context is empty or irrelevant, provide a general summary and external recommendations, but leave libraryResults empty.
`;

        const userPrompt = `Query: "${query}"

Context from Library:
${contextText}

Generate the Deep Search response JSON.`;

        // 4. Call AI Orchestrator
        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        let finalResponse: AiSearchResult;
        try {
            const aiResponse = await aiOrchestrator.chatComplete(messages, {
                model: getDefaultOpenRouterModel(),
                jsonMode: true,
                temperature: 0.3 // Keep it relatively focused
            });

            let parsedResult: unknown;
            try {
                parsedResult = JSON.parse(aiResponse.content);
            } catch (parseError) {
                console.error('[Deep Search] Failed to parse AI JSON:', parseError);
                console.error('[Deep Search] Raw content:', aiResponse.content);
                parsedResult = null;
            }

            finalResponse = normalizeAiResult(parsedResult, query, searchResults);
        } catch (aiError) {
            console.error('[Deep Search] AI synthesis failed, returning fallback response:', aiError);
            finalResponse = buildFallbackResponse(query, searchResults);
        }

        // 6. Save to Cache
        try {
            await supabase
                .from('search_cache')
                .upsert({
                    query: normalizedQuery,
                    results: finalResponse
                });
            console.log(`[Deep Search] Saved new result to cache for: "${normalizedQuery}"`);
        } catch (cacheWriteError) {
            console.error('[Deep Search] Failed to write cache:', cacheWriteError);
        }

        return NextResponse.json(finalResponse);

    } catch (error) {
        console.error('[Deep Search] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
