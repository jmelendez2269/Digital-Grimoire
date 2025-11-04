import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

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

    // Get content for analysis
    let contentToAnalyze = '';
    
    // For structured text, use chapter content
    if (document.metadata?.isStructuredText && document.metadata?.chapters) {
      const chapters = document.metadata.chapters;
      // Use first 3 chapters or all if fewer
      const sampleChapters = chapters.slice(0, 3);
      contentToAnalyze = sampleChapters
        .map((ch: any) => `${ch.title}\n\n${ch.content}`)
        .join('\n\n---\n\n')
        .substring(0, 10000);
    } else if (document.content) {
      // Use OCR content
      contentToAnalyze = document.content.substring(0, 10000);
    } else {
      return NextResponse.json(
        { error: 'No content available for analysis' },
        { status: 400 }
      );
    }

    // Generate the requested field
    let generatedText = '';
    const title = document.title || 'this document';
    const author = document.author ? ` by ${document.author}` : '';
    const domain = document.domain || 'the subject matter';

    if (field === 'curatorNote') {
      const prompt = `You are analyzing "${title}"${author} for the Digital Grimoire collection.

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
        model: 'gpt-4o',
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
        model: 'gpt-4o',
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
    } else if (field === 'domain') {
      const prompt = `Analyze "${title}"${author} and determine its primary subject domain.

This document is part of the Digital Grimoire collection, which focuses on synthesizing knowledge across esoteric, religious, philosophical, scientific, and wisdom traditions.

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
        model: 'gpt-4o',
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

