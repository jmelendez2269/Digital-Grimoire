import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Export Annotations API
 * 
 * Supports:
 * - Markdown format (formatted for readability)
 * - CSV format (for spreadsheets)
 * - Filtering by text_id, category, color, date range
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'markdown'; // 'markdown' or 'csv'
    const textId = searchParams.get('text_id');
    const category = searchParams.get('category');
    const color = searchParams.get('color');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Build query
    let query = supabase
      .from('user_annotations')
      .select(`
        *,
        texts (
          id,
          title,
          author
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    // Apply filters
    if (textId) query = query.eq('text_id', textId);
    if (category) query = query.eq('category', category);
    if (color) query = query.eq('color', color);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data: annotations, error } = await query;

    if (error) {
      console.error('Error fetching annotations for export:', error);
      return NextResponse.json(
        { error: 'Failed to fetch annotations' },
        { status: 500 }
      );
    }

    if (!annotations || annotations.length === 0) {
      return NextResponse.json(
        { error: 'No annotations found matching criteria' },
        { status: 404 }
      );
    }

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'csv') {
      const csv = generateCSV(annotations);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="annotations-${timestamp}.csv"`,
        },
      });
    } else {
      // Default to markdown
      const markdown = generateMarkdown(annotations);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="annotations-${timestamp}.md"`,
        },
      });
    }
  } catch (error) {
    console.error('Error in GET /api/annotations/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate Markdown format
 */
function generateMarkdown(annotations: any[]): string {
  const timestamp = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let markdown = `# Annotations Export\n\n`;
  markdown += `**Exported:** ${timestamp}  \n`;
  markdown += `**Total Annotations:** ${annotations.length}\n\n`;
  markdown += `---\n\n`;

  // Group by document
  const byDocument = annotations.reduce((acc: any, ann: any) => {
    const docId = ann.texts?.id || 'unknown';
    if (!acc[docId]) {
      acc[docId] = {
        title: ann.texts?.title || 'Unknown Document',
        author: ann.texts?.author || '',
        annotations: [],
      };
    }
    acc[docId].annotations.push(ann);
    return acc;
  }, {});

  // Generate markdown for each document
  for (const [docId, doc] of Object.entries(byDocument) as any) {
    markdown += `## ${doc.title}\n\n`;
    if (doc.author) {
      markdown += `**By:** ${doc.author}\n\n`;
    }

    for (const ann of doc.annotations) {
      markdown += `### ${getCategoryEmoji(ann.category)} ${formatCategory(ann.category)}\n\n`;
      
      // Quote
      markdown += `> ${ann.quote}\n\n`;
      
      // Note (if exists)
      if (ann.note) {
        markdown += `**Note:** ${ann.note}\n\n`;
      }
      
      // Metadata
      markdown += `<small>`;
      markdown += `**Category:** ${formatCategory(ann.category)} | `;
      markdown += `**Color:** ${formatColor(ann.highlight_color)} | `;
      if (ann.position?.pageNumber) {
        markdown += `**Page:** ${ann.position.pageNumber} | `;
      }
      markdown += `**Date:** ${new Date(ann.created_at).toLocaleDateString()}`;
      markdown += `</small>\n\n`;
      markdown += `---\n\n`;
    }
  }

  return markdown;
}

/**
 * Generate CSV format
 */
function generateCSV(annotations: any[]): string {
  // CSV Header
  const header = [
    'Document Title',
    'Author',
    'Quote',
    'Note',
    'Category',
    'Color',
    'Page',
    'Date',
  ].join(',');

  // CSV Rows
  const rows = annotations.map((ann) => {
    return [
      escapeCsv(ann.texts?.title || ''),
      escapeCsv(ann.texts?.author || ''),
      escapeCsv(ann.quote),
      escapeCsv(ann.note || ''),
      formatCategory(ann.category),
      formatColor(ann.highlight_color),
      ann.position?.pageNumber || '',
      new Date(ann.created_at).toLocaleDateString(),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Escape CSV values
 */
function escapeCsv(value: string): string {
  if (!value) return '""';
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return `"${value}"`;
}

/**
 * Format category name
 */
function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    general: 'General',
    important: 'Important',
    question: 'Question',
    insight: 'Insight',
    'to-research': 'To Research',
    quote: 'Quote',
    critique: 'Critique',
  };
  return categoryMap[category] || category;
}

/**
 * Get category emoji
 */
function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    general: '📝',
    important: '⭐',
    question: '❓',
    insight: '💡',
    'to-research': '🔍',
    quote: '💬',
    critique: '🎯',
  };
  return emojiMap[category] || '📝';
}

/**
 * Format color name
 */
function formatColor(color: string): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

