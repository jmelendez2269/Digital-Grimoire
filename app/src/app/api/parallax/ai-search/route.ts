

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hybridSearch } from '@/lib/parallax/hybrid-retrieval';
import { aiOrchestrator, ChatMessage } from '@/lib/ai/ai-orchestrator';
import { checkRateLimit } from '@/lib/parallax/rate-limit';

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
                console.log(`[Deep Search] Cache hit for: "${normalizedQuery}"`);
                return NextResponse.json(cachedData.results);
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
        const systemPrompt = `You are the Parallax Engine, an advanced AI designed to synthesize esoteric, philosophical, and scientific knowledge.
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

        const aiResponse = await aiOrchestrator.chatComplete(messages, {
            model: 'gpt-4o-mini', // Reduced from gpt-4o for 2-3x faster generation
            jsonMode: true,
            temperature: 0.3 // Keep it relatively focused
        });

        // 5. Parse and Return
        let parsedResult: AiSearchResult;
        try {
            parsedResult = JSON.parse(aiResponse.content);
        } catch (e) {
            console.error('[Deep Search] Failed to parse AI JSON:', e);
            console.error('[Deep Search] Raw content:', aiResponse.content);
            return NextResponse.json(
                { error: 'Failed to generate valid search results' },
                { status: 500 }
            );
        }

        // Filter out library results that don't match actual search results (hallucination guard)
        // and ensure IDs are correct
        const validLibraryResults = parsedResult.libraryResults.filter(libResult => {
            return searchResults.some(r => r.text_id === libResult.book_id);
        });

        const finalResponse: AiSearchResult = {
            ...parsedResult,
            libraryResults: validLibraryResults
        };

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
