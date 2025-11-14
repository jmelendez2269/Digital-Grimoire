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
 * Retry a function with exponential backoff
 * Useful for handling rate limiting
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // If it's a rate limit error and we have retries left, wait and retry
      if (lastError.message.includes('Rate limited') || 
          lastError.message.includes('HTTP 429')) {
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`[retryWithBackoff] Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // All retries exhausted - update error message
          throw new Error(`${lastError.message} (Automatic retries exhausted. Please wait 5-10 minutes before trying again.)`);
        }
      }
      
      // For other errors or if we're out of retries, throw immediately
      throw lastError;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Main function to parse web texts from supported sources
 * Supports sacred-texts.com and generic websites
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
      // Use generic parser for other websites
      return await parseGenericWebPage(url, format);
    }
  } catch (error) {
    console.error('Error parsing web text:', error);
    // Don't wrap errors that already have descriptive messages
    if (error instanceof Error) {
      // If error already contains descriptive prefixes or rate limiting, just re-throw it
      if (error.message.includes('Failed to parse') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('Rate limited') ||
          error.message.includes('HTTP 429')) {
        throw error;
      }
      throw new Error(`Failed to parse web text: ${error.message}`);
    }
    throw new Error(`Failed to parse web text: Unknown error`);
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
      
      // Add delay before fetching metadata to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      metadata = await extractMetadata(url);
      
      // Fetch chapters sequentially with delays to avoid rate limiting
      chapters = [];
      for (let index = 0; index < chapterLinks.length; index++) {
        const link = chapterLinks[index];
        const absoluteUrl = resolveUrl(url, link.href);
        
        // Add delay between requests (2-3 seconds to be respectful)
        if (index > 0) {
          const delay = 2000 + Math.random() * 1000; // 2-3 seconds with some randomization
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        try {
          const content = await fetchChapterContent(absoluteUrl, format);
          chapters.push({
            id: `chapter-${index + 1}`,
            title: link.title || `Chapter ${index + 1}`,
            content: content,
          });
        } catch (error) {
          console.error(`[parseSacredText] Failed to fetch chapter ${index + 1} (${link.title}):`, error);
          // If rate limited, throw immediately
          if (error instanceof Error && error.message.includes('Rate limited')) {
            throw error;
          }
          // For other errors, continue but log
          chapters.push({
            id: `chapter-${index + 1}`,
            title: link.title || `Chapter ${index + 1}`,
            content: `[Error: Failed to fetch this chapter]`,
          });
        }
      }
    } else {
      // Single page text
      metadata = await extractMetadata(url);
      const content = await fetchChapterContent(url, format);
      
      console.log(`[parseSacredText] Single page - extracted content length: ${content.length}`);
      console.log(`[parseSacredText] First 200 chars: ${content.substring(0, 200)}`);
      
      // If content is very short or empty, try to extract sections from the page
      if (!content || content.trim().length < 100) {
        console.log('[parseSacredText] Content is too short, trying to extract sections...');
        const sections = await extractSectionsFromPage(url, format);
        if (sections.length > 0) {
          chapters = sections;
          console.log(`[parseSacredText] Extracted ${sections.length} sections instead`);
        } else {
          chapters = [{
            id: 'chapter-1',
            title: metadata.title,
            content: content,
          }];
        }
      } else {
        chapters = [{
          id: 'chapter-1',
          title: metadata.title,
          content: content,
        }];
      }
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
    // Don't wrap errors that already have descriptive messages
    if (error instanceof Error) {
      // If error already contains descriptive prefixes or rate limiting, just re-throw it
      if (error.message.includes('Failed to parse') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('Rate limited') ||
          error.message.includes('HTTP 429')) {
        throw error;
      }
      throw new Error(`Failed to parse sacred text: ${error.message}`);
    }
    throw new Error(`Failed to parse sacred text: Unknown error`);
  }
}

/**
 * Fetch and parse the chapter list from an index page
 */
export async function fetchChapterList(indexUrl: string): Promise<ChapterLink[]> {
  return retryWithBackoff(async () => {
    const response = await fetch(indexUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`Rate limited by server (HTTP 429). Please wait a few minutes before trying again. The website may be blocking too many requests.`);
      }
      throw new Error(`Failed to fetch index page (HTTP ${response.status}): ${response.statusText}`);
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
  }, 3, 2000); // 3 retries with 2 second initial delay
}

/**
 * Fetch and extract content from a chapter page
 */
export async function fetchChapterContent(
  chapterUrl: string,
  format: 'html' | 'markdown' | 'plaintext'
): Promise<string> {
  try {
    const response = await fetch(chapterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`Rate limited by server (HTTP 429). Please wait a few minutes before trying again. The website may be blocking too many requests.`);
      }
      throw new Error(`Failed to fetch chapter (HTTP ${response.status}): ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements (navigation, ads, etc.)
    $('script, style, noscript, iframe, header, footer').remove();
    
    // Remove navigation elements more carefully
    // First, identify and remove navigation centers/tables
    $('center').each((_, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();
      // Check if this center element contains navigation
      if (text.includes('previous') && text.includes('next') || 
          text.includes('index') && (text.includes('previous') || text.includes('next')) ||
          text.includes('sacred-texts') && text.includes('esoteric')) {
        $el.remove();
      }
    });
    
    // Remove navigation tables
    $('table').each((_, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();
      if (text.includes('previous') && text.includes('next') && text.includes('index')) {
        $el.remove();
      }
    });
    
    // Remove navigation links but keep content links
    $('a[href*="index.htm"]').each((_, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();
      if (text === 'index' || text.includes('contents')) {
        $el.parent().filter('center, p, td').remove();
      }
    });
    
    $('hr').remove();
    
    // Try to find the main content
    // Sacred-texts.com uses various structures: direct body children, center tags, divs, etc.
    let contentHtml = '';
    
    // Try different content selectors in order of preference
    // We want to preserve the full structure with headings, paragraphs, lists, etc.
    const contentSelectors = [
      // Direct body children (most common)
      'body > h1, body > h2, body > h3, body > h4, body > h5, body > h6, body > p, body > blockquote, body > ul, body > ol, body > pre, body > table, body > div',
      // Content in center tags (sacred-texts.com often uses center for main content)
      'body > center > h1, body > center > h2, body > center > h3, body > center > h4, body > center > p, body > center > blockquote, body > center > ul, body > center > ol, body > center > pre, body > center > table, body > center > div',
      // Just paragraphs
      'body > p',
      '#content > *',
      'main > *',
      // All body children (including center)
      'body > *',
    ];

    for (const selector of contentSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        // Preserve the structure by keeping all block elements
        contentHtml = elements
          .map((_, el) => {
            const $el = $(el);
            const tagName = $el.prop('tagName')?.toLowerCase();
            const text = $el.text().toLowerCase();
            
            // Skip navigation elements
            if (text.includes('previous') && text.includes('next') && text.includes('index')) {
              return '';
            }
            if (text.includes('sacred-texts') && text.includes('esoteric') && text.length < 50) {
              return '';
            }
            
            // Only include block-level elements and inline elements that are part of formatting
            if (tagName && ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'strong', 'em', 'i', 'b', 'a', 'br', 'center'].includes(tagName)) {
              // For center tags, extract their content
              if (tagName === 'center') {
                return $el.html() || '';
              }
              return $.html(el);
            }
            return '';
          })
          .get()
          .filter(html => html && html.trim().length > 0)
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
        
        // Remove navigation centers
        $body('center').each((_, el) => {
          const $el = $body(el);
          const text = $el.text().toLowerCase();
          if (text.includes('previous') && text.includes('next') || 
              text.includes('index') && (text.includes('previous') || text.includes('next'))) {
            $el.remove();
          }
        });
        
        // Try to get content more aggressively - look for any text content
        const textContent = $body('body').text() || $body.text();
        if (textContent && textContent.trim().length > 100) {
          // If we have text but no HTML structure, try to reconstruct it
          // Split by double line breaks and wrap in paragraphs
          const paragraphs = textContent
            .split(/\n\n+/)
            .filter(p => p.trim().length > 10)
            .map(p => `<p>${p.trim().replace(/\n/g, ' ')}</p>`)
            .join('\n');
          contentHtml = paragraphs;
          console.log(`[fetchChapterContent] Fallback: Created ${paragraphs.split('</p>').length - 1} paragraphs from text`);
        } else {
          contentHtml = $body.html() || '';
        }
      }
    }
    
    console.log(`[fetchChapterContent] Final content length: ${contentHtml.trim().length}`);

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
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`Rate limited by server (HTTP 429). Please wait a few minutes before trying again. The website may be blocking too many requests.`);
      }
      throw new Error(`Failed to fetch page (HTTP ${response.status}): ${response.statusText}`);
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
  // Note: We allow 'center' temporarily so we can extract its content, then unwrap it
  const sanitized = purify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'center',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  });

  // Additional cleanup and structure improvement
  const $ = cheerio.load(sanitized);
  
  // Unwrap center tags - extract their content and replace with div
  // This preserves content while removing deprecated center tags
  $('center').each((_, el) => {
    const $el = $(el);
    const content = $el.html();
    if (content) {
      $el.replaceWith(`<div>${content}</div>`);
    } else {
      $el.remove();
    }
  });
  
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
 * Extract sections from a single page that has multiple headings/sections
 * This is useful for pages like the Emerald Tablet that have multiple major sections
 */
async function extractSectionsFromPage(
  url: string,
  format: 'html' | 'markdown' | 'plaintext'
): Promise<Chapter[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`Rate limited by server (HTTP 429). Please wait a few minutes before trying again. The website may be blocking too many requests.`);
      }
      throw new Error(`Failed to fetch page (HTTP ${response.status}): ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, noscript, iframe, header, footer, nav').remove();
    
    // Remove navigation elements
    $('center').each((_, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();
      if (text.includes('previous') && text.includes('next') || 
          text.includes('index') && (text.includes('previous') || text.includes('next')) ||
          text.includes('sacred-texts') && text.includes('esoteric')) {
        $el.remove();
      }
    });
    
    $('table').each((_, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();
      if (text.includes('previous') && text.includes('next') && text.includes('index')) {
        $el.remove();
      }
    });
    
    $('hr').remove();

    const sections: Chapter[] = [];
    let currentSection: { title: string; content: string[] } | null = null;

    // Find all headings and content between them
    // Try to find h1, h2, h3, h4, or strong elements that look like section headers
    const bodyElements = $('body > *').toArray();
    
    for (let i = 0; i < bodyElements.length; i++) {
      const el = bodyElements[i];
      const $el = $(el);
      const tagName = $el.prop('tagName')?.toLowerCase();
      const text = $el.text().trim();
      
      // Skip navigation
      if (text.toLowerCase().includes('previous') && text.toLowerCase().includes('next')) {
        continue;
      }
      
      // Check if this is a heading or section marker
      const isHeading = tagName && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
      const isStrongHeading = tagName === 'strong' && text.length < 100 && text.length > 5;
      const isBoldHeading = tagName === 'b' && text.length < 100 && text.length > 5;
      const looksLikeHeading = isHeading || isStrongHeading || isBoldHeading;
      
      if (looksLikeHeading && text.length > 0) {
        // Save previous section
        if (currentSection && currentSection.content.length > 0) {
          const sectionContent = currentSection.content.join('\n\n');
          if (sectionContent.trim().length > 50) {
            sections.push({
              id: `section-${sections.length + 1}`,
              title: currentSection.title,
              content: format === 'html' 
                ? cleanHtml(sectionContent)
                : format === 'markdown'
                ? htmlToMarkdown(sectionContent)
                : htmlToPlaintext(sectionContent),
            });
          }
        }
        
        // Start new section
        currentSection = {
          title: text,
          content: [],
        };
      } else if (currentSection) {
        // Add content to current section
        const htmlContent = $.html(el);
        if (htmlContent && htmlContent.trim().length > 0) {
          currentSection.content.push(htmlContent);
        }
      } else {
        // Before first section - collect as introduction
        if (!currentSection) {
          currentSection = {
            title: 'Introduction',
            content: [],
          };
        }
        const htmlContent = $.html(el);
        if (htmlContent && htmlContent.trim().length > 0) {
          currentSection.content.push(htmlContent);
        }
      }
    }
    
    // Save last section
    if (currentSection && currentSection.content.length > 0) {
      const sectionContent = currentSection.content.join('\n\n');
      if (sectionContent.trim().length > 50) {
        sections.push({
          id: `section-${sections.length + 1}`,
          title: currentSection.title,
          content: format === 'html' 
            ? cleanHtml(sectionContent)
            : format === 'markdown'
            ? htmlToMarkdown(sectionContent)
            : htmlToPlaintext(sectionContent),
        });
      }
    }

    // If we found sections, return them; otherwise return empty array
    if (sections.length > 0) {
      console.log(`[extractSectionsFromPage] Extracted ${sections.length} sections`);
      return sections;
    }
    
    return [];
  } catch (error) {
    console.error('Error extracting sections from page:', error);
    return [];
  }
}

/**
 * Generic parser for web pages from any source
 * Attempts to intelligently extract main content from HTML pages
 */
export async function parseGenericWebPage(
  url: string,
  format: 'html' | 'markdown' | 'plaintext' = 'html'
): Promise<ParsedText> {
  try {
    console.log('[parseGenericWebPage] Parsing:', url);
    
    // Fetch the page
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
    } catch (fetchError) {
      console.error('[parseGenericWebPage] Fetch error:', fetchError);
      throw new Error(`Failed to fetch page from ${url}: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page (HTTP ${response.status}): ${response.statusText}`);
    }

    let html: string;
    try {
      html = await response.text();
    } catch (textError) {
      throw new Error(`Failed to read page content: ${textError instanceof Error ? textError.message : 'Unknown error'}`);
    }
    
    if (!html || html.trim().length === 0) {
      throw new Error('Page returned empty content');
    }
    
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, noscript, iframe, header, footer, nav, aside, .nav, .navigation, .sidebar, .ad, .advertisement, .social, .share, .comments, .related').remove();

    // Extract metadata
    const metadata = await extractGenericMetadata(url, $);

    // Try to find main content area using common patterns
    let contentHtml = '';
    
    // Common content selectors (in order of preference)
    const contentSelectors = [
      'article', // HTML5 article tag
      'main', // HTML5 main tag
      '#content', // ID content
      '.content', // Class content
      '#main', // ID main
      '.main', // Class main
      '#article', // ID article
      '.article', // Class article
      '#post', // ID post (common in blogs)
      '.post', // Class post
      '[role="main"]', // ARIA role main
      'body > div:not(.header):not(.footer):not(.nav):not(.sidebar)', // Direct body divs
    ];

    for (const selector of contentSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        contentHtml = elements.first().html() || '';
        if (contentHtml.trim().length > 200) {
          console.log(`[parseGenericWebPage] Found content using selector: ${selector}`);
          break;
        }
      }
    }

    // If no main content area found, try to extract from body
    if (!contentHtml || contentHtml.trim().length < 200) {
      console.log('[parseGenericWebPage] No main content area found, extracting from body');
      
      // Remove navigation and other non-content elements
      $('body > nav, body > header, body > footer, body > .nav, body > .header, body > .footer').remove();
      
      // Get all block elements from body
      const bodyElements = $('body > *').toArray();
      const contentElements: string[] = [];
      
      for (const el of bodyElements) {
        const $el = $(el);
        const tagName = $el.prop('tagName')?.toLowerCase();
        const text = $el.text().trim();
        const className = $el.attr('class') || '';
        const id = $el.attr('id') || '';
        
        // Skip navigation, headers, footers
        if (id.toLowerCase().includes('nav') || 
            id.toLowerCase().includes('header') || 
            id.toLowerCase().includes('footer') ||
            className.toLowerCase().includes('nav') ||
            className.toLowerCase().includes('header') ||
            className.toLowerCase().includes('footer') ||
            className.toLowerCase().includes('sidebar') ||
            className.toLowerCase().includes('menu')) {
          continue;
        }
        
        // Skip empty or very short elements
        if (text.length < 10) {
          continue;
        }
        
        // Include block-level elements
        if (tagName && ['div', 'section', 'article', 'main', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'table'].includes(tagName)) {
          contentElements.push($.html(el));
        }
      }
      
      contentHtml = contentElements.join('\n');
    }

    // If still no content, try to extract all text content
    if (!contentHtml || contentHtml.trim().length < 100) {
      console.log('[parseGenericWebPage] Fallback: extracting all text content');
      const textContent = $('body').text().trim();
      if (textContent && textContent.length > 100) {
        // Split into paragraphs
        const paragraphs = textContent
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 20)
          .map(p => `<p>${p.replace(/\n/g, ' ')}</p>`)
          .join('\n');
        contentHtml = paragraphs;
      }
    }

    if (!contentHtml || contentHtml.trim().length < 50) {
      const pageTitle = $('title').text() || 'Unknown';
      throw new Error(`Could not extract meaningful content from the page. Page title: "${pageTitle}". The page may require JavaScript to load content or may have an unusual structure.`);
    }

    // Try to split content into sections/chapters
    const chapters = extractSectionsFromGenericContent(contentHtml, metadata.title, format);

    // Calculate total length
    const totalLength = chapters.reduce((sum, ch) => sum + ch.content.length, 0);

    console.log(`[parseGenericWebPage] Extracted ${chapters.length} chapters, total length: ${totalLength}`);

    return {
      metadata,
      chapters,
      format,
      chapterCount: chapters.length,
      totalLength,
    };
  } catch (error) {
    console.error('Error parsing generic web page:', error);
    throw new Error(`Failed to parse web page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract metadata from a generic web page
 */
async function extractGenericMetadata(url: string, $: cheerio.CheerioAPI): Promise<ParsedTextMetadata> {
  // Extract title
  let title = $('title').text().trim();
  if (!title || title.length < 3) {
    title = $('h1').first().text().trim();
  }
  if (!title) {
    title = $('meta[property="og:title"]').attr('content') || '';
  }
  // Clean up title
  title = title.replace(/\s*[-:]\s*(Index|Contents|Home|Page).*$/i, '').trim();
  if (!title) {
    title = 'Untitled Document';
  }

  // Try to find author
  let author: string | null = null;
  const authorPatterns = [
    $('meta[name="author"]').attr('content'),
    $('[rel="author"]').text().trim(),
    $('.author').first().text().trim(),
    $('[class*="author"]').first().text().trim(),
    $('body').text().match(/by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)?.[1],
    $('body').text().match(/author[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)?.[1],
  ];
  
  for (const pattern of authorPatterns) {
    if (pattern && typeof pattern === 'string' && pattern.trim().length > 2 && pattern.trim().length < 100) {
      author = pattern.trim();
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

  // Extract description
  let description: string | null = null;
  description = $('meta[name="description"]').attr('content') || 
                $('meta[property="og:description"]').attr('content') || 
                null;
  
  if (!description) {
    const firstParagraph = $('p').first().text().trim();
    if (firstParagraph && firstParagraph.length > 50 && firstParagraph.length < 500) {
      description = firstParagraph;
    }
  }

  return {
    title,
    author,
    year,
    publisher,
    description,
    sourceUrl: url,
  };
}

/**
 * Extract sections/chapters from generic HTML content
 * Attempts to identify headings and split content accordingly
 */
function extractSectionsFromGenericContent(
  html: string,
  defaultTitle: string,
  format: 'html' | 'markdown' | 'plaintext'
): Chapter[] {
  const $ = cheerio.load(html);
  const sections: Chapter[] = [];
  let currentSection: { title: string; content: string[] } | null = null;

  // Get all top-level elements (direct children of body or main container)
  const bodyElements = $('body > *, article > *, main > *, #content > *, .content > *').toArray();

  for (let i = 0; i < bodyElements.length; i++) {
    const el = bodyElements[i];
    const $el = $(el);
    const tagName = $el.prop('tagName')?.toLowerCase();
    const text = $el.text().trim();
    
    // Skip navigation and empty elements
    if (text.length < 3) {
      continue;
    }
    
    // Check if this is a heading
    const isHeading = tagName && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
    const isStrongHeading = tagName === 'strong' && text.length > 5 && text.length < 150 && 
                            ($el.parent().prop('tagName')?.toLowerCase() === 'p' || 
                             $el.parent().prop('tagName')?.toLowerCase() === 'div');
    
    if (isHeading || isStrongHeading) {
      // Save previous section
      if (currentSection && currentSection.content.length > 0) {
        const sectionContent = currentSection.content.join('\n');
        if (sectionContent.trim().length > 50) {
          sections.push({
            id: `section-${sections.length + 1}`,
            title: currentSection.title,
            content: format === 'html' 
              ? cleanHtml(sectionContent)
              : format === 'markdown'
              ? htmlToMarkdown(sectionContent)
              : htmlToPlaintext(sectionContent),
          });
        }
      }
      
      // Start new section
      currentSection = {
        title: text,
        content: [],
      };
    } else if (currentSection) {
      // Add content to current section
      const htmlContent = $.html(el);
      if (htmlContent && htmlContent.trim().length > 0) {
        // Only include block-level elements
        if (tagName && ['p', 'div', 'ul', 'ol', 'blockquote', 'pre', 'table', 'section', 'article', 'li'].includes(tagName)) {
          currentSection.content.push(htmlContent);
        }
      }
    } else {
      // Before first section - collect as introduction
      if (!currentSection) {
        currentSection = {
          title: 'Introduction',
          content: [],
        };
      }
      const htmlContent = $.html(el);
      if (htmlContent && htmlContent.trim().length > 0) {
        if (tagName && ['p', 'div', 'ul', 'ol', 'blockquote', 'pre', 'table', 'section', 'article', 'li'].includes(tagName)) {
          currentSection.content.push(htmlContent);
        }
      }
    }
  }
  
  // Save last section
  if (currentSection && currentSection.content.length > 0) {
    const sectionContent = currentSection.content.join('\n');
    if (sectionContent.trim().length > 50) {
      sections.push({
        id: `section-${sections.length + 1}`,
        title: currentSection.title,
        content: format === 'html' 
          ? cleanHtml(sectionContent)
          : format === 'markdown'
          ? htmlToMarkdown(sectionContent)
          : htmlToPlaintext(sectionContent),
      });
    }
  }

  // If no sections found, create a single chapter
  if (sections.length === 0) {
    sections.push({
      id: 'chapter-1',
      title: defaultTitle,
      content: format === 'html' 
        ? cleanHtml(html)
        : format === 'markdown'
        ? htmlToMarkdown(html)
        : htmlToPlaintext(html),
    });
  }

  return sections;
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

