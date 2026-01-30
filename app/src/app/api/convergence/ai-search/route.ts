
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { ftsSearchChunks } from '@/lib/convergence/fts-search';
import { vectorSearch } from '@/lib/convergence/vector-search';

// Types
type ScoredChunk = {
    chunk_id: string;
    book_id: string; // UUID
    content: string;
    page_number: number;
    text_title: string;
    text_author: string;
    similarity: number;
};

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for backend
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // 1. Retrieve Context (Hybrid Search)
        // We get a significantly higher number of chunks to ensure we cover multiple books and don't just get pages from one book
        const ftsResults = await ftsSearchChunks(query, 250);
        const vectorResults = await vectorSearch(query, 250);

        // Merge and Deduplicate Results
        // Use string for chunk_id since it might be UUID
        const allChunksMap = new Map<string, ScoredChunk>();

        // Helper to add chunks
        const addChunk = (chunk: any, score: number) => {
            const chunkId = String(chunk.chunk_id || chunk.id);
            if (!allChunksMap.has(chunkId)) {
                allChunksMap.set(chunkId, {
                    ...chunk,
                    chunk_id: chunkId,
                    book_id: chunk.text_id, // Map text_id to book_id
                    similarity: score
                });
            }
        };

        vectorResults.forEach((c: any) => addChunk(c, c.similarity));
        ftsResults.forEach(c => addChunk(c, c.relevance ? Math.min(c.relevance, 1) : 0.5)); // Normalize rank, cap at 1

        const allChunks = Array.from(allChunksMap.values());

        // Group by Book
        const booksMap = new Map<string, { title: string, author: string, chunks: ScoredChunk[] }>();

        allChunks.forEach(chunk => {
            if (!booksMap.has(chunk.book_id)) {
                booksMap.set(chunk.book_id, {
                    title: chunk.text_title,
                    author: chunk.text_author,
                    chunks: []
                });
            }
            booksMap.get(chunk.book_id)!.chunks.push(chunk);
        });

        // Sort books by SUM of top 3 chunk scores to prioritize books with sustained relevance over single mentions
        const sortedBooks = Array.from(booksMap.entries()).sort((a, b) => {
            const getScore = (book: { chunks: ScoredChunk[] }) => {
                const top3 = book.chunks.sort((x, y) => y.similarity - x.similarity).slice(0, 3);
                return top3.reduce((sum, c) => sum + c.similarity, 0);
            };
            return getScore(b[1]) - getScore(a[1]);
        });

        // 2. Prepare Context for LLM
        // We only send the TOP 5 books to the LLM for deep analysis to save tokens and focus quality
        const topBooksForContext = sortedBooks.slice(0, 5);

        // We will return the rest as "other results" without LLM commentary, just raw matching
        const otherAndTopBooks = sortedBooks.slice(0, 50); // Return up to 50 books total

        const contextBooks = topBooksForContext.map(([id, book]) => {
            const snippets = book.chunks
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 5) // Top 5 chunks per book
                .map(c => `[Page ${c.page_number}]: ${c.content.substring(0, 300)}...`)
                .join('\n');

            return `
BOOK ID: ${id}
TITLE: ${book.title}
AUTHOR: ${book.author}
EXCERPTS:
${snippets}
        `;
        }).join('\n---\n');

        // 3. Generate AI Response
        const prompt = `
You are an expert librarian and esoteric scholar. The user is searching for: "${query}".

Here are the TOP relevant books from our library (Convergence Library):
${contextBooks}

Task:
1.  **Summary**: Write a concise 2-paragraph summary of the concept "${query}" based on the provided texts and your general knowledge.
2.  **Library Analysis**: For EACH of the books listed above:
    *   Provide a ONE-SENTENCE explanation of *how* it relates to the concept.
    *   Select the top 3 best short excerpts from the provided text that illustrate this relevance.
    *   Assign a "relevance label" (e.g., "Foundational Text", "Direct Reference", "Thematic Match", "Passing Mention").
3.  **Recommendations**: Recommend 3 essential EXTERNAL books (not in the list above) on this topic.

Return your response in this EXACT JSON structure:
{
  "summary": "string",
  "libraryResults": [
    {
      "book_id": "string (matches input BOOK ID)",
      "title": "string",
      "author": "string",
      "relevanceSentence": "string",
      "relevanceLabel": "string",
      "excerpts": [
        { "text": "string (quote)", "page_number": number (extract from [Page X]) }
      ]
    }
  ],
  "externalRecommendations": [
    { "title": "string", "author": "string", "reason": "string" }
  ]
}
    `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful research assistant. Output valid JSON only." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

        // 4. Merge "Other Results" into the response
        // Books that were NOT in the top 5 sent to LLM, but are in the search results
        // We manually construct their result objects using the best chunks we found
        const topBookIds = new Set(topBooksForContext.map(([id]) => id));

        const otherResults = otherAndTopBooks
            .filter(([id]) => !topBookIds.has(id))
            .map(([id, book]) => {
                // Get best chunk
                const bestChunks = book.chunks.sort((a, b) => b.similarity - a.similarity).slice(0, 1);
                const bestChunk = bestChunks[0];
                const maxScore = bestChunk.similarity;

                // Determine simple label based on score
                let label = "Related";
                if (maxScore > 0.82) label = "Highly Relevant";
                else if (maxScore > 0.78) label = "Relevant";
                else if (maxScore > 0.75) label = "Thematic Match";

                return {
                    book_id: id,
                    title: book.title,
                    author: book.author,
                    relevanceSentence: `Contains matching concepts (Similarity: ${(maxScore * 100).toFixed(0)}%)`,
                    relevanceLabel: label,
                    excerpts: bestChunks.map(c => ({
                        text: c.content.substring(0, 200) + "...",
                        page_number: c.page_number
                    }))
                };
            });

        // Append other results to libraryResults
        if (aiResponse.libraryResults) {
            aiResponse.libraryResults = [...aiResponse.libraryResults, ...otherResults];
        } else {
            aiResponse.libraryResults = otherResults;
        }

        return NextResponse.json(aiResponse);

    } catch (error: any) {
        console.error('AI Search Error:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            details: error.toString()
        }, { status: 500 });
    }
}
