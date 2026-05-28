import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiUsage } from '@/lib/usage-tracker';
import { getDefaultOpenRouterMetadataModel, getOpenRouterClient } from '@/lib/ai/openrouter-client';

interface Chapter {
  id: string;
  title: string;
  content: string;
  volume?: 'science' | 'religion';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chapters, documentTitle } = body;
    
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    if (!chapters || !Array.isArray(chapters)) {
      return NextResponse.json(
        { error: 'Chapters array is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    const openai = getOpenRouterClient();
    const model = getDefaultOpenRouterMetadataModel();

    // Group chapters by volume
    const scienceChapters = chapters.filter((ch: Chapter) => 
      !ch.volume || ch.volume === 'science'
    );
    const religionChapters = chapters.filter((ch: Chapter) => 
      ch.volume === 'religion'
    );

    // Generate names for each volume separately
    const generateChapterNames = async (
      volumeChapters: Chapter[],
      volumeType: 'science' | 'religion'
    ) => {
      if (volumeChapters.length === 0) return [];

      const chapterContents = volumeChapters.map((ch, idx) => ({
        index: idx + 1,
        currentTitle: ch.title,
        contentPreview: ch.content.substring(0, 500), // First 500 chars
      }));

      const prompt = `You are analyzing a ${volumeType} volume of "${documentTitle || 'a document'}".

For each chapter below, analyze the content and generate an appropriate, descriptive chapter title. The title should:
- Be concise (5-10 words max)
- Accurately reflect the chapter's main topic
- Be appropriate for a ${volumeType} volume
- Not include "Chapter X:" prefix (just the title)

Here are the chapters:

${chapterContents.map(ch => 
  `Chapter ${ch.index}:
Current title: "${ch.currentTitle}"
Content preview: "${ch.contentPreview}..."
`).join('\n---\n')}

Return a JSON object with this exact format:
{
  "chapterNames": [
    "Title 1",
    "Title 2",
    "Title 3",
    ...
  ]
}

The array should have exactly ${volumeChapters.length} titles, one for each chapter in order.`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing document structure and generating descriptive chapter titles. Always respond with valid JSON only.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      // Track token usage
      totalInputTokens += completion.usage?.prompt_tokens || 0;
      totalOutputTokens += completion.usage?.completion_tokens || 0;
      
      const response = JSON.parse(
        completion.choices[0].message.content || '{}'
      );
      return response.chapterNames || [];
    };

    // Generate names for both volumes
    const [scienceNames, religionNames] = await Promise.all([
      scienceChapters.length > 0
        ? generateChapterNames(scienceChapters, 'science')
        : [],
      religionChapters.length > 0
        ? generateChapterNames(religionChapters, 'religion')
        : [],
    ]);

    // Map generated names back to chapters
    const updatedChapters = chapters.map((chapter: Chapter) => {
      const isReligion = chapter.volume === 'religion';
      const volumeChapters = isReligion ? religionChapters : scienceChapters;
      const volumeNames = isReligion ? religionNames : scienceNames;
      const chapterIndex = volumeChapters.findIndex(
        (ch: Chapter) => ch.id === chapter.id
      );

      if (chapterIndex >= 0 && volumeNames[chapterIndex]) {
        return {
          ...chapter,
          title: volumeNames[chapterIndex],
          titleGenerated: true,
        };
      }
      return chapter;
    });

    // Log total usage for all chapter name generation
    if (totalInputTokens > 0 || totalOutputTokens > 0) {
      await logApiUsage({
        service: 'openai_metadata',
        operation: 'generate_chapter_names',
        unitsUsed: totalInputTokens + totalOutputTokens,
        unitType: 'tokens',
        userId: user.id,
        requestMetadata: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          chapterCount: chapters.length,
          documentTitle,
          model,
        },
        success: true,
      });
    }

    return NextResponse.json({ chapters: updatedChapters });
  } catch (error: any) {
    console.error('Error generating chapter names:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate chapter names' },
      { status: 500 }
    );
  }
}

