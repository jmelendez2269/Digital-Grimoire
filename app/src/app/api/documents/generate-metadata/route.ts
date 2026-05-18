import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logMetadataExtractionUsage } from '@/lib/usage-tracker';
import { getDefaultOpenRouterMetadataModel, getOpenRouterClient } from '@/lib/ai/openrouter-client';

const MAX_ANALYSIS_CHARS = 10000;

function appendPart(parts: string[], label: string, value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    parts.push(`${label}: ${value.trim()}`);
  }
}

function buildDocumentDescription(document: any) {
  const parts: string[] = [];
  appendPart(parts, 'Title', document.title);
  appendPart(parts, 'Author', document.author);
  appendPart(parts, 'Domain', document.domain);
  appendPart(parts, 'Type', document.type);
  appendPart(parts, 'Short summary', document.short_summary);
  appendPart(parts, 'Long summary', document.long_summary);

  if (Array.isArray(document.tags) && document.tags.length > 0) {
    parts.push(`Tags: ${document.tags.join(', ')}`);
  }

  if (Array.isArray(document.lenses) && document.lenses.length > 0) {
    parts.push(`Lenses: ${document.lenses.join(', ')}`);
  }

  return parts.join('\n').substring(0, MAX_ANALYSIS_CHARS);
}

async function getChunkSample(supabase: Awaited<ReturnType<typeof createClient>>, textId: string) {
  const { data: chunks, error } = await supabase
    .from('text_chunks')
    .select('content, chunk_index')
    .eq('text_id', textId)
    .order('chunk_index', { ascending: true })
    .limit(5);

  if (error || !chunks?.length) {
    return '';
  }

  return chunks
    .map((chunk: any) => chunk.content)
    .filter((content: unknown): content is string => typeof content === 'string' && content.trim().length > 0)
    .join('\n\n---\n\n')
    .substring(0, MAX_ANALYSIS_CHARS);
}

async function getContentForAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  document: any,
  textId: string
) {
  // For structured text, use chapter content.
  if (
    document.metadata?.isStructuredText &&
    Array.isArray(document.metadata?.chapters) &&
    document.metadata.chapters.length > 0
  ) {
    const sampleChapters = document.metadata.chapters.slice(0, 3);
    const chapterSample = sampleChapters
      .map((ch: any) => `${ch.title || 'Untitled chapter'}\n\n${ch.content || ''}`)
      .join('\n\n---\n\n')
      .trim();

    if (chapterSample) {
      return chapterSample.substring(0, MAX_ANALYSIS_CHARS);
    }
  }

  if (typeof document.content === 'string' && document.content.trim()) {
    return document.content.trim().substring(0, MAX_ANALYSIS_CHARS);
  }

  const chunkSample = await getChunkSample(supabase, textId);
  if (chunkSample) {
    return chunkSample;
  }

  return buildDocumentDescription(document);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { textId, field } = body;

    if (!textId) {
      return NextResponse.json(
        { error: 'textId is required' },
        { status: 400 }
      );
    }

    if (!field || !['curatorNote', 'shortSummary', 'domain'].includes(field)) {
      return NextResponse.json(
        { error: 'field must be either "curatorNote", "shortSummary", or "domain"' },
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

    // Fetch the document
    const { data: document, error: fetchError } = await supabase
      .from('texts')
      .select('*')
      .eq('id', textId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const contentToAnalyze = await getContentForAnalysis(supabase, document, textId);

    if (!contentToAnalyze) {
      return NextResponse.json(
        { error: 'No document text or descriptive metadata is available for analysis' },
        { status: 400 }
      );
    }

    // Generate the requested field
    let generatedText = '';
    const title = document.title || 'this document';
    const author = document.author ? ` by ${document.author}` : '';
    const domain = document.domain || 'the subject matter';

    if (field === 'curatorNote') {
      const prompt = `You are analyzing "${title}"${author} for the Convergence collection.

This is a collection focused on synthesizing knowledge across traditions - esoteric, religious, philosophical, scientific, and wisdom texts.

Analyze the following content and write a brief curator's note (1-2 sentences) explaining:
- Why this document is significant
- Why it belongs in this collection
- What unique value or contribution it provides
- How it relates to knowledge synthesis across traditions

Be concise, insightful, and emphasize the document's value for understanding patterns across different wisdom traditions.

Content sample (first 10k chars):
${contentToAnalyze}

Respond with ONLY the curator's note text, no additional explanation or formatting.`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert curator specializing in esoteric, philosophical, and wisdom traditions. Write insightful curator notes that explain the significance of texts for knowledge synthesis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      generatedText = completion.choices[0].message.content?.trim() || '';

      // Log usage for curatorNote
      await logMetadataExtractionUsage({
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        userId: session.user.id,
        documentId: textId,
        success: true,
        model: completion.model || model,
      });
    } else if (field === 'shortSummary') {
      const prompt = `Write a brief summary (2-3 sentences) of "${title}"${author}.

Analyze the following content and provide a concise description that:
- Explains what the document covers
- Highlights the main themes or topics
- Gives readers a quick understanding of the content

Content sample (first 10k chars):
${contentToAnalyze}

Respond with ONLY the summary text, no additional explanation or formatting.`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing concise, informative summaries of documents. Write brief 2-3 sentence summaries that accurately capture the essence of the content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 300,
      });

      generatedText = completion.choices[0].message.content?.trim() || '';

      // Log usage for shortSummary
      await logMetadataExtractionUsage({
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        userId: session.user.id,
        documentId: textId,
        success: true,
        model: completion.model || model,
      });
    } else if (field === 'domain') {
      const prompt = `Analyze "${title}"${author} and determine its primary subject domain.

This document is part of the Convergence collection, which focuses on synthesizing knowledge across esoteric, religious, philosophical, scientific, and wisdom traditions.

Based on the content, identify the primary subject domain. Common domains include but are not limited to:
- astrology, alchemy, hermeticism, qabalah, tarot, mysticism
- psychology, philosophy, metaphysics, epistemology
- buddhism, hinduism, christianity, judaism, islam
- anthropology, history, mythology, comparative religion
- physics, mathematics, cosmology, natural sciences

Content sample (first 10k chars):
${contentToAnalyze}

Respond with ONLY a single word or short phrase (2-3 words max) representing the primary domain. Examples: "astrology", "hermetic philosophy", "jungian psychology", "buddhist mysticism", "comparative religion".

Do not include any explanation, just the domain name.`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at classifying documents into subject domains. Identify the primary domain based on content analysis. Return only the domain name, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      });

      generatedText = completion.choices[0].message.content?.trim() || '';

      // Log usage for domain
      await logMetadataExtractionUsage({
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        userId: session.user.id,
        documentId: textId,
        success: true,
        model: completion.model || model,
      });
    }

    if (!generatedText) {
      return NextResponse.json(
        { error: 'Failed to generate content' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      field,
      text: generatedText,
    });
  } catch (error) {
    console.error('[Generate Metadata] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

