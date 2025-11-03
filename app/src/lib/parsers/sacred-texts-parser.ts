import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface ParsedTextMetadata {
  title: string;
  author: string | null;
  year: number | null;
  publisher: string | null;
  description: string | null;
  sourceUrl: string;
}

export interface ParsedText {
  metadata: ParsedTextMetadata;
  chapters: Chapter[];
  format: 'html' | 'markdown' | 'plaintext';
  chapterCount: number;
  totalLength: number;
}

interface ChapterLink {
  href: string;
  title: string;
}

/**
 * Main function to parse web texts from supported sources
 * Currently only supports sacred-texts.com
 */
export async function parseWebText(
  url: string,
  format: 'html' | 'markdown' | 'plaintext' = 'html'
): Promise<ParsedText> {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('sacred-texts.com')) {
      return await parseSacredText(url, format);
    } else {
      throw new Error('Unsupported source. Currently only supports: sacred-texts.com. For other sources (Gutenberg, Archive.org), please use the file upload feature.');
    }
  } catch (error) {
    console.error('Error parsing web text:', error);
    throw new Error(`Failed to parse web text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse sacred-texts.com URLs (original implementation)
 * Kept for backward compatibility and as a helper function
 */
export async function parseSacredText(
  url: string,
  format: 'html' | 'markdown' | 'plaintext' = 'html'
): Promise<ParsedText> {
  try {
    // Validate URL
    if (!url.includes('sacred-texts.com')) {
      throw new Error('URL must be from sacred-texts.com');
    }

    // Determine if this is an index page or a single page
    const isIndexPage = url.includes('/index.htm');
    
    let chapters: Chapter[];
    let metadata: ParsedTextMetadata;

    if (isIndexPage) {
      // Multi-chapter book
      const chapterLinks = await fetchChapterList(url);
      metadata = await extractMetadata(url);
      
      chapters = await Promise.all(
        chapterLinks.map(async (link, index) => {
          const absoluteUrl = resolveUrl(url, link.href);
          const content = await fetchChapterContent(absoluteUrl, format);
          
          return {
            id: `chapter-${index + 1}`,
            title: link.title || `Chapter ${index + 1}`,
            content: content,
          };
        })
      );
    } else {
      // Single page text
      metadata = await extractMetadata(url);
      const content = await fetchChapterContent(url, format);
      
      chapters = [{
        id: 'chapter-1',
        title: metadata.title,
        content: content,
      }];
    }

    // Calculate total length
    const totalLength = chapters.reduce((sum, ch) => sum + ch.content.length, 0);

    return {
      metadata,
      chapters,
      format,
      chapterCount: chapters.length,
      totalLength,
    };
  } catch (error) {
    console.error('Error parsing sacred text:', error);
    throw new Error(`Failed to parse sacred text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch and parse the chapter list from an index page
 */
export async function fetchChapterList(indexUrl: string): Promise<ChapterLink[]> {
  try {
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch index page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const chapters: ChapterLink[] = [];

    // Sacred-texts.com typically uses a specific pattern for chapter links
    // They're usually in a table or list with links to .htm files
    
    // Try to find the main content area (varies by page)
    const contentSelectors = [
      'table a[href$=".htm"]',
      'body > p > a[href$=".htm"]',
      'body > a[href$=".htm"]',
      '#content a[href$=".htm"]',
    ];

    for (const selector of contentSelectors) {
      const links = $(selector);
      
      if (links.length > 0) {
        links.each((_, element) => {
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          // Filter out navigation links (index, next, prev, etc.)
          if (href && 
              !href.includes('index.htm') && 
              !href.includes('../') &&
              title && 
              !title.toLowerCase().includes('contents') &&
              !title.toLowerCase().includes('next') &&
              !title.toLowerCase().includes('previous')) {
            chapters.push({ href, title });
          }
        });
        
        if (chapters.length > 0) break;
      }
    }

    if (chapters.length === 0) {
      throw new Error('No chapters found on index page');
    }

    return chapters;
  } catch (error) {
    console.error('Error fetching chapter list:', error);
    throw error;
  }
}

/**
 * Fetch and extract content from a chapter page
 */
export async function fetchChapterContent(
  chapterUrl: string,
  format: 'html' | 'markdown' | 'plaintext'
): Promise<string> {
  try {
    const response = await fetch(chapterUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch chapter: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements (navigation, ads, etc.)
    $('script, style, noscript, iframe, header, footer, nav').remove();
    
    // Remove common navigation elements
    $('a[href*="index.htm"]').parent().remove();
    $('hr').remove();
    
    // Try to find the main content
    // Sacred-texts.com usually has content in the body or a specific container
    let contentHtml = '';
    
    // Try different content selectors in order of preference
    // We want to preserve the full structure with headings, paragraphs, lists, etc.
    const contentSelectors = [
      'body > h1, body > h2, body > h3, body > h4, body > p, body > blockquote, body > ul, body > ol, body > pre, body > table',
      'body > p',
      '#content > *',
      'main > *',
      'body > *',
    ];

    for (const selector of contentSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        // Preserve the structure by keeping all block elements
        contentHtml = elements
          .map((_, el) => {
            const tagName = $(el).prop('tagName')?.toLowerCase();
            // Only include block-level elements and inline elements that are part of formatting
            if (tagName && ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'strong', 'em', 'i', 'b', 'a', 'br'].includes(tagName)) {
              return $.html(el);
            }
            return '';
          })
          .get()
          .filter(html => html.trim().length > 0)
          .join('\n');
        
        if (contentHtml.trim().length > 100) break;
      }
    }

    if (!contentHtml || contentHtml.trim().length < 50) {
      // Fallback: get all content from body but preserve structure
      const bodyContent = $('body').html() || '';
      if (bodyContent) {
        // Try to extract just the meaningful content
        const $body = cheerio.load(bodyContent);
        // Remove navigation, ads, etc.
        $body('script, style, noscript, iframe, nav, header, footer, .nav, .navigation, .ad, .advertisement').remove();
        contentHtml = $body.html() || '';
      }
    }

    // Clean and format based on desired output format
    if (format === 'html') {
      return cleanHtml(contentHtml);
    } else if (format === 'markdown') {
      return htmlToMarkdown(contentHtml);
    } else {
      // plaintext
      return htmlToPlaintext(contentHtml);
    }
  } catch (error) {
    console.error('Error fetching chapter content:', error);
    throw error;
  }
}

/**
 * Extract metadata from the index or main page
 */
export async function extractMetadata(url: string): Promise<ParsedTextMetadata> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    let title = $('title').text().trim();
    if (!title) {
      title = $('h1').first().text().trim();
    }
    // Clean up title (remove "Index" or "Sacred Texts" suffix)
    title = title.replace(/\s*[-:]\s*(Index|Contents|Sacred[- ]Texts\.com).*$/i, '').trim();

    // Try to find author
    let author: string | null = null;
    const authorPatterns = [
      $('body').text().match(/by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i),
      $('body').text().match(/author[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i),
    ];
    
    for (const match of authorPatterns) {
      if (match && match[1]) {
        author = match[1].trim();
        break;
      }
    }

    // Try to find year
    let year: number | null = null;
    const yearMatch = $('body').text().match(/\b(1[6-9]\d{2}|20[0-2]\d)\b/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    }

    // Try to find publisher
    let publisher: string | null = null;
    const publisherMatch = $('body').text().match(/(?:published by|publisher[:\s]+)([^,\n]+)/i);
    if (publisherMatch) {
      publisher = publisherMatch[1].trim();
    }

    // Extract description (if available)
    let description: string | null = null;
    const firstParagraph = $('body > p').first().text().trim();
    if (firstParagraph && firstParagraph.length > 50 && firstParagraph.length < 500) {
      description = firstParagraph;
    }

    return {
      title,
      author,
      year,
      publisher,
      description,
      sourceUrl: url,
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    throw error;
  }
}

/**
 * Clean HTML content - remove unwanted tags and attributes
 */
export function cleanHtml(html: string): string {
  // Create DOM for server-side sanitization
  const window = new JSDOM('').window;
  const purify = DOMPurify(window as any);
  
  // Sanitize HTML to prevent XSS
  const sanitized = purify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  });

  // Additional cleanup and structure improvement
  const $ = cheerio.load(sanitized);
  
  // Remove empty paragraphs and elements
  $('p:empty, div:empty, span:empty').remove();
  
  // Remove inline styles
  $('[style]').removeAttr('style');
  
  // Extract body content if it exists, otherwise use the whole document
  let content = '';
  const body = $('body');
  if (body.length > 0) {
    content = body.html() || '';
  } else {
    // No body tag, use the root content
    content = $.html();
    // Remove the root wrapper if cheerio added one
    const $content = cheerio.load(content);
    if ($content('body').length > 0) {
      content = $content('body').html() || content;
    }
  }
  
  // If we still don't have proper block structure, try to improve it
  const $content = cheerio.load(content || '');
  const hasBlockElements = $content('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table').length > 0;
  
  if (!hasBlockElements && content && content.trim().length > 50) {
    // Content exists but lacks block structure - wrap in paragraphs
    // Split by double line breaks and wrap each section in <p>
    const sections = content
      .split(/\n\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (sections.length > 0) {
      content = sections.map(s => `<p>${s.replace(/\n/g, ' ')}</p>`).join('\n');
    }
  }
  
  // Final cleanup - remove very short paragraphs
  const $final = cheerio.load(content || '');
  $final('p').each((_, el) => {
    const text = $final(el).text().trim();
    if (!text || text.length < 3) {
      $final(el).remove();
    }
  });
  
  return $final.html() || content || sanitized;
}

/**
 * Convert HTML to Markdown using Turndown
 */
export function htmlToMarkdown(html: string): string {
  const cleanedHtml = cleanHtml(html);
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });
  
  return turndownService.turndown(cleanedHtml);
}

/**
 * Convert HTML to plain text
 */
export function htmlToPlaintext(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove scripts, styles, and other non-content elements
  $('script, style, noscript, iframe').remove();
  
  // Get text content
  let text = $('body').text();
  
  // Clean up whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .replace(/[ \t]{2,}/g, ' ') // Multiple spaces to single
    .trim();
  
  return text;
}

/**
 * Resolve relative URLs to absolute URLs
 */
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  
  const base = new URL(baseUrl);
  const resolved = new URL(relativeUrl, base);
  return resolved.toString();
}

