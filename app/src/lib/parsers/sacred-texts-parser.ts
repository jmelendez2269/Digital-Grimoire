import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import puppeteer from 'puppeteer';

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
  extraMetadata?: Record<string, unknown>;
}

interface ChapterLink {
  href: string;
  title: string;
  fetchVia?: 'direct' | 'jina';
}

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'max-age=0',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

const JINA_READER_PREFIX = 'https://r.jina.ai/http://r.jina.ai/http://';

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
          lastError.message.includes('HTTP 429') ||
          lastError.message.includes('HTTP 503')) {
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
    
    if (isApocryphaCorpusIndexUrl(url)) {
      return parseApocryphaCorpusIndex(url, format);
    }

    if (hostname.includes('sacred-texts.com')) {
      return await parseSacredText(url, format);
    } else if (hostname === 'hermetic.com' || hostname.endsWith('.hermetic.com')) {
      return await parseHermeticLibraryText(url, format);
    } else if (hostname === 'gutenberg.org' || hostname.endsWith('.gutenberg.org')) {
      return await parseGutenbergText(url, format);
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

    // Determine if this is an index page or a single page.
    // Sacred Texts also exposes per-book index pages like /bib/apo/bar.htm
    // whose URLs don't contain /index.htm but list every chapter file.
    const isIndexPage = url.includes('/index.htm') || isBibleApocryphaBookIndex(url);
    
    let chapters: Chapter[];
    let metadata: ParsedTextMetadata;
    let requiresPuppeteer = false;

    if (isIndexPage) {
      // Multi-chapter book
      let chapterLinks: ChapterLink[] = [];
      try {
        chapterLinks = await fetchChapterList(url, false);
      } catch (err: any) {
        if (err.message.includes('HTTP 403') || err.message.includes('Forbidden') || err.message.includes('Puppeteer')) {
          console.warn('[parseSacredText] Index returned 403, falling back to Puppeteer');
          requiresPuppeteer = true;
          chapterLinks = await fetchChapterList(url, true);
        } else if (err.message.includes('HTTP 429') || err.message.includes('Rate limited')) {
          console.warn('[parseSacredText] Index returned 429, falling back to Jina Reader');
          chapterLinks = await fetchChapterListViaJina(url);
        } else {
          throw err;
        }
      }

      // For per-book index pages like /bib/apo/bar.htm, chapter files always
      // follow the pattern `{bookPrefix}\d+\.htm` (bar001.htm, bar002.htm, ...).
      // Filter out sibling-book nav (sir.htm, epj.htm), cross-version nav
      // (Polyglot/Sep/Vul), and footer Previous/Next links.
      const bookPrefix = getSacredTextsBookPrefix(url);
      if (bookPrefix) {
        const chapterPattern = new RegExp(`^${escapeRegex(bookPrefix)}\\d+\\.htm$`, 'i');
        const before = chapterLinks.length;
        chapterLinks = chapterLinks.filter(link => {
          const filename = (link.href.split('/').pop() || '').toLowerCase();
          return chapterPattern.test(filename);
        });
        console.log(`[parseSacredText] Book-prefix chapter filter: ${before} -> ${chapterLinks.length} (prefix=${bookPrefix})`);
        if (chapterLinks.length === 0) {
          throw new Error(`No chapter pages matched the book pattern ${bookPrefix}NNN.htm on ${url}`);
        }
      }

      const usingJina = chapterLinks.some(link => link.fetchVia === 'jina');

      if (!usingJina) {
        // Add delay before fetching metadata to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }

      try {
        metadata = usingJina
          ? await extractMetadataViaJina(url)
          : await extractMetadata(url, requiresPuppeteer);
      } catch (err: any) {
        if (err.message.includes('HTTP 429') || err.message.includes('Rate limited') || err.message.includes('HTTP 403')) {
          console.warn('[parseSacredText] Metadata fetch was blocked, falling back to Jina Reader');
          metadata = await extractMetadataViaJina(url);
        } else {
          throw err;
        }
      }

      const startReadingLink = chapterLinks.find(link => isStartReadingLink(link));
      if (startReadingLink && startReadingLink.fetchVia !== 'jina') {
        const combinedUrl = resolveUrl(url, startReadingLink.href);
        try {
          const combinedChapters = await fetchCombinedSacredText(combinedUrl, format, requiresPuppeteer);
          if (combinedChapters.length > 1) {
            console.log(`[parseSacredText] Parsed ${combinedChapters.length} chapters from combined Start Reading file`);
            chapters = combinedChapters;
          } else {
            console.warn('[parseSacredText] Combined Start Reading file did not contain split chapters, falling back to linked pages');
            chapters = [];
          }
        } catch (error) {
          console.warn('[parseSacredText] Failed to parse combined Start Reading file, falling back to linked pages:', error);
          chapters = [];
        }
      } else {
        chapters = [];
      }

      if (chapters.length === 0) {
        // Fetch chapters sequentially with delays to avoid rate limiting
        const linkedChapters = chapterLinks.filter(link => !isStartReadingLink(link));
        const failedChapters: string[] = [];

        for (let index = 0; index < linkedChapters.length; index++) {
          const link = linkedChapters[index];
          const absoluteUrl = resolveUrl(url, link.href);

          // Add delay between requests (2-3 seconds to be respectful)
          if (index > 0) {
            const delay = link.fetchVia === 'jina'
              ? 250
              : 2000 + Math.random() * 1000; // 2-3 seconds with some randomization
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          try {
            const content = link.fetchVia === 'jina'
              ? await fetchChapterContentViaJina(absoluteUrl, format)
              : await fetchChapterContent(absoluteUrl, format, requiresPuppeteer);
            chapters.push({
              id: `chapter-${index + 1}`,
              title: link.title || `Chapter ${index + 1}`,
              content: content,
            });
          } catch (error) {
            console.error(`[parseSacredText] Failed to fetch chapter ${index + 1} (${link.title}):`, error);
            failedChapters.push(link.title || `Chapter ${index + 1}`);
          }
        }

        if (failedChapters.length > 0) {
          throw new Error(
            `Failed to fetch ${failedChapters.length} chapter(s): ${failedChapters.slice(0, 5).join(', ')}${failedChapters.length > 5 ? ', ...' : ''}. Import aborted so broken placeholder chapters are not saved.`
          );
        }
      }
    } else {
      // Single page text
      try {
        metadata = await extractMetadata(url, false);
      } catch (err: any) {
        if (err.message.includes('HTTP 403')) {
          requiresPuppeteer = true;
          metadata = await extractMetadata(url, true);
        } else if (err.message.includes('HTTP 429') || err.message.includes('Rate limited')) {
          metadata = await extractMetadataViaJina(url);
        } else {
          throw err;
        }
      }
      const content = requiresPuppeteer
        ? await fetchChapterContent(url, format, requiresPuppeteer)
        : await fetchChapterContent(url, format, false).catch(async (err) => {
            if (err instanceof Error && (err.message.includes('HTTP 429') || err.message.includes('Rate limited'))) {
              return fetchChapterContentViaJina(url, format);
            }
            throw err;
          });
      
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

function isStartReadingLink(link: ChapterLink): boolean {
  return link.title.trim().toLowerCase() === 'start reading';
}

/**
 * Fetch a page using Puppeteer to bypass Cloudflare
 */
async function fetchWithPuppeteer(url: string): Promise<string> {
  console.log(`[fetchWithPuppeteer] Launching headless browser for ${url}`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent(COMMON_HEADERS['User-Agent']);
    await page.setExtraHTTPHeaders({
      'Accept': COMMON_HEADERS['Accept'],
      'Accept-Language': COMMON_HEADERS['Accept-Language'],
    });

    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    if (response && !response.ok()) {
      throw new Error(`Puppeteer failed to fetch (HTTP ${response.status()})`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const content = await page.content();
    return content;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Fetch and parse the chapter list from an index page
 */
export async function fetchChapterList(indexUrl: string, forcePuppeteer: boolean = false): Promise<ChapterLink[]> {
  return retryWithBackoff(async () => {
    if (forcePuppeteer) {
      const html = await fetchWithPuppeteer(indexUrl);
      const $ = cheerio.load(html);
      
      const links: ChapterLink[] = [];
      $('a').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        
        if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#') && href.endsWith('.htm')) {
          if (!href.includes('index.htm') && !title.toLowerCase().includes('index')) {
            links.push({ href, title });
          }
        }
      });
      return links;
    }

    const response = await fetch(indexUrl, {
      headers: {
        ...COMMON_HEADERS,
        'Sec-Fetch-Site': 'none',
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(`Failed to fetch index page (HTTP 403): Forbidden`);
      }
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

async function fetchChapterListViaJina(indexUrl: string): Promise<ChapterLink[]> {
  const markdown = await fetchJinaMarkdown(indexUrl);
  const base = new URL(indexUrl);
  const baseDir = base.pathname.replace(/\/[^/]*$/, '/');
  const chapters: ChapterLink[] = [];
  const seen = new Set<string>();
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/(?:www\.)?sacred-texts\.com\/[^)]+?\.htm)\)/g;

  for (const match of markdown.matchAll(linkRegex)) {
    const title = match[1].replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim();
    const hrefUrl = new URL(match[2]);
    const hrefPath = hrefUrl.pathname;
    const lowerTitle = title.toLowerCase();

    if (
      !title ||
      !hrefPath.startsWith(baseDir) ||
      hrefPath.endsWith('/index.htm') ||
      hrefPath.includes('../') ||
      lowerTitle.includes('contents') ||
      lowerTitle.includes('next') ||
      lowerTitle.includes('previous')
    ) {
      continue;
    }

    const href = hrefPath.split('/').pop();
    if (!href || seen.has(href)) {
      continue;
    }

    seen.add(href);
    chapters.push({ href, title, fetchVia: 'jina' });
  }

  if (chapters.length === 0) {
    throw new Error('No chapters found on index page through Jina Reader');
  }

  return chapters;
}

async function fetchChapterContentViaJina(
  chapterUrl: string,
  format: 'html' | 'markdown' | 'plaintext'
): Promise<string> {
  const markdown = await fetchJinaMarkdown(chapterUrl);
  const markdownContent = extractJinaMarkdownContent(markdown);

  if (format === 'markdown') {
    return markdownContent;
  }

  const html = markdownToBasicHtml(markdownContent);

  if (format === 'plaintext') {
    return htmlToPlaintext(html);
  }

  return html;
}

async function fetchJinaMarkdown(sourceUrl: string): Promise<string> {
  const jinaUrl = `${JINA_READER_PREFIX}${sourceUrl}`;

  return retryWithBackoff(async () => {
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain, text/markdown;q=0.9, */*;q=0.8',
        'User-Agent': COMMON_HEADERS['User-Agent'],
      },
    });

    if (!response.ok) {
      throw new Error(`Jina Reader failed to fetch ${sourceUrl} (HTTP ${response.status}): ${response.statusText}`);
    }

    const markdown = await response.text();

    if (!markdown || markdown.trim().length < 50) {
      throw new Error(`Jina Reader returned empty content for ${sourceUrl}`);
    }

    return markdown;
  }, 3, 1000);
}

function extractJinaMarkdownContent(markdown: string): string {
  const marker = 'Markdown Content:';
  const markerIndex = markdown.indexOf(marker);
  const body = markerIndex >= 0 ? markdown.slice(markerIndex + marker.length) : markdown;

  return body
    .replace(/^\s*\[[^\]]+\]\(https?:\/\/(?:www\.)?sacred-texts\.com\/(?:index\.htm)?\)\s*$/gim, '')
    .replace(/^\s*\* \* \*\s*$/gm, '\n')
    .trim();
}

function markdownToBasicHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    if (text) {
      blocks.push(`<p>${formatInlineMarkdown(text)}</p>`);
    }
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^!\[[^\]]*\]\([^)]+\)/.test(trimmed)) {
      flushParagraph();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = Math.min(headingMatch[1].length, 6);
      blocks.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();

  return cleanHtml(blocks.join('\n'));
}

function formatInlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
}

async function extractMetadataViaJina(url: string): Promise<ParsedTextMetadata> {
  const markdown = await fetchJinaMarkdown(url);
  const titleMatch = markdown.match(/^Title:\s*(.+)$/m);
  const publishedMatch = markdown.match(/^Published Time:\s*(.+)$/m);
  const content = extractJinaMarkdownContent(markdown);

  let title = titleMatch?.[1]?.trim() || 'Untitled Document';
  title = title
    .replace(/\s*\|\s*Internet Sacred Text Archive\s*$/i, '')
    .replace(/\s*[-:]\s*(Index|Contents|Sacred[- ]Texts\.com).*$/i, '')
    .trim() || 'Untitled Document';

  let author: string | null = null;
  const authorMatch =
    content.match(/#{1,6}\s+([A-Z][\w.\s-]+),\s*(?:tr\.|trans\.|translator)/i) ||
    content.match(/\b([A-Z][\w.\s-]+),\s*(?:tr\.|trans\.|translator)/i) ||
    content.match(/\bby\s+([A-Z][\w.\s-]+?)(?:\n|$)/i);

  if (authorMatch?.[1]) {
    author = authorMatch[1].replace(/\s+/g, ' ').trim();
  }

  let year: number | null = null;
  const yearMatch =
    content.match(/\[(1[6-9]\d{2}|20[0-2]\d)\]/) ||
    publishedMatch?.[1]?.match(/\b(1[6-9]\d{2}|20[0-2]\d)\b/) ||
    content.match(/\b(1[6-9]\d{2}|20[0-2]\d)\b/);

  if (yearMatch?.[1]) {
    year = parseInt(yearMatch[1], 10);
  }

  const description = content
    .split(/\n\s*\n+/)
    .map(section => section.replace(/[#_*[\]()]/g, '').trim())
    .find(section => section.length > 80 && section.length < 600) || null;

  return {
    title,
    author,
    year,
    publisher: null,
    description,
    sourceUrl: url,
  };
}

async function fetchCombinedSacredText(
  combinedUrl: string,
  format: 'html' | 'markdown' | 'plaintext',
  forcePuppeteer: boolean = false
): Promise<Chapter[]> {
  let html: string;

  if (forcePuppeteer) {
    html = await fetchWithPuppeteer(combinedUrl);
  } else {
    const response = await fetch(combinedUrl, {
      headers: {
        ...COMMON_HEADERS,
        'Referer': new URL(combinedUrl).origin,
        'Sec-Fetch-Site': 'same-origin',
      }
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        console.warn(`[fetchCombinedSacredText] Server blocked fetch (HTTP ${response.status}). Falling back to Puppeteer.`);
        html = await fetchWithPuppeteer(combinedUrl);
      } else {
        throw new Error(`Failed to fetch combined text (HTTP ${response.status}): ${response.statusText}`);
      }
    } else {
      html = await response.text();
    }
  }

  assertNotChallengePage(html, combinedUrl);

  const markerRegex = /\{file\s+"([^"]+)"\s+"([^"]+)"\}/g;
  const markers = Array.from(html.matchAll(markerRegex));

  if (markers.length < 2) {
    return [];
  }

  const chapters: Chapter[] = [];

  for (let index = 0; index < markers.length; index++) {
    const marker = markers[index];
    const title = marker[1]?.trim() || `Chapter ${index + 1}`;
    const start = (marker.index || 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? html.length;
    const rawContent = html.slice(start, end).trim();

    if (!rawContent || rawContent.length < 20) {
      continue;
    }

    const contentHtml = looksLikeHtml(rawContent)
      ? cleanHtml(rawContent)
      : sacredTextMarkupToHtml(rawContent);

    chapters.push({
      id: `chapter-${chapters.length + 1}`,
      title,
      content: format === 'html'
        ? contentHtml
        : format === 'markdown'
          ? htmlToMarkdown(contentHtml)
          : htmlToPlaintext(contentHtml),
    });
  }

  return chapters;
}

function looksLikeHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function sacredTextMarkupToHtml(content: string): string {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    if (text) {
      blocks.push(`<p>${escapeHtml(text)}</p>`);
    }
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = Math.min(headingMatch[1].length, 6);
      blocks.push(`<h${level}>${escapeHtml(cleanSacredTextMarkerText(headingMatch[2]))}</h${level}>`);
      continue;
    }

    if (/^\{(?:p|prr|page|footnote)\b/i.test(trimmed)) {
      flushParagraph();
      blocks.push(`<p class="source-page">${escapeHtml(trimmed.replace(/[{}]/g, ''))}</p>`);
      continue;
    }

    if (/^\{img\b/i.test(trimmed)) {
      flushParagraph();
      continue;
    }

    paragraph.push(cleanSacredTextMarkerText(trimmed));
  }

  flushParagraph();

  return cleanHtml(blocks.join('\n'));
}

function cleanSacredTextMarkerText(text: string): string {
  return text
    .replace(/\{fr\.\s*([^}]+)\}/gi, '$1')
    .replace(/\{fn\.\s*/gi, 'Note: ')
    .replace(/\{\/?[^}]+\}/g, '')
    .replace(/\|3([^|]+)\|/g, 'Ž$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assertNotChallengePage(html: string, url: string): void {
  const lower = html.slice(0, 12000).toLowerCase();

  if (
    lower.includes('<title>just a moment') ||
    lower.includes('cf-chl') ||
    lower.includes('cloudflare') && lower.includes('enable javascript and cookies')
  ) {
    throw new Error(`Sacred Texts returned an anti-bot challenge for ${url}`);
  }
}

/**
 * Fetch and extract content from a chapter page
 */
export async function fetchChapterContent(
  chapterUrl: string,
  format: 'html' | 'markdown' | 'plaintext',
  forcePuppeteer: boolean = false
): Promise<string> {
  try {
    const baseUrl = new URL(chapterUrl).origin;
    let html: string;
    
    if (forcePuppeteer) {
      html = await fetchWithPuppeteer(chapterUrl);
    } else {
      const response = await fetch(chapterUrl, {
        headers: {
          ...COMMON_HEADERS,
          'Referer': baseUrl,
          'Sec-Fetch-Site': 'same-origin',
        }
      });
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          console.warn(`[fetchChapterContent] Server blocked fetch (HTTP ${response.status}). Falling back to Puppeteer.`);
          html = await fetchWithPuppeteer(chapterUrl);
        } else {
          throw new Error(`Failed to fetch chapter (HTTP ${response.status}): ${response.statusText}`);
        }
      } else {
        html = await response.text();
      }
    }
    assertNotChallengePage(html, chapterUrl);
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
export async function extractMetadata(url: string, forcePuppeteer: boolean = false): Promise<ParsedTextMetadata> {
  try {
    let html: string;
    
    if (forcePuppeteer) {
      html = await fetchWithPuppeteer(url);
    } else {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
           throw new Error(`Failed to fetch index page (HTTP 403): Forbidden`);
        }
        if (response.status === 429) {
          throw new Error(`Rate limited by server (HTTP 429). Please wait a few minutes before trying again. The website may be blocking too many requests.`);
        }
        throw new Error(`Failed to fetch page (HTTP ${response.status}): ${response.statusText}`);
      }
      html = await response.text();
    }

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
    let html: string = '';
    let usedPuppeteer = false;
    
    try {
      const response = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          'Sec-Fetch-Site': 'none',
        }
      });
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 429 || response.status === 401) {
          console.warn(`[parseGenericWebPage] Fetch blocked (HTTP ${response.status}), falling back to Puppeteer`);
          html = await fetchWithPuppeteer(url);
          usedPuppeteer = true;
        } else {
          throw new Error(`Failed to fetch page (HTTP ${response.status}): ${response.statusText}`);
        }
      } else {
        html = await response.text();
      }
    } catch (fetchError) {
      console.error('[parseGenericWebPage] Fetch error, attempting Puppeteer fallback:', fetchError);
      try {
        html = await fetchWithPuppeteer(url);
        usedPuppeteer = true;
      } catch (puppeteerError) {
        console.error('[parseGenericWebPage] Puppeteer fallback also failed:', puppeteerError);
        throw new Error(`Failed to fetch page from ${url}: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
      }
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
 * Parse a Project Gutenberg HTML page (gutenberg.org).
 * Handles the canonical "<pre> header → body content → <pre> license footer" layout,
 * strips the START/END boilerplate, drops the TOC and back-of-book index, and pulls
 * Title/Author from the header block so the AI metadata step has clean input.
 */
export async function parseGutenbergText(
  url: string,
  format: 'html' | 'markdown' | 'plaintext' = 'html'
): Promise<ParsedText> {
  console.log('[parseGutenbergText] Parsing:', url);

  // Direct fetch first; fall back to Puppeteer on network errors (some hosts
  // refuse undici's default IPv6 path) or soft-block HTTP codes.
  let html = '';
  try {
    const response = await fetch(url, {
      headers: { ...COMMON_HEADERS, 'Sec-Fetch-Site': 'none' },
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429 || response.status === 401) {
        console.warn(`[parseGutenbergText] Fetch blocked (HTTP ${response.status}), falling back to Puppeteer`);
        html = await fetchWithPuppeteer(url);
      } else {
        throw new Error(`Failed to fetch Gutenberg page (HTTP ${response.status}): ${response.statusText}`);
      }
    } else {
      html = await response.text();
    }
  } catch (fetchError) {
    console.warn('[parseGutenbergText] Direct fetch failed, falling back to Puppeteer:', fetchError);
    try {
      html = await fetchWithPuppeteer(url);
    } catch (puppeteerError) {
      console.error('[parseGutenbergText] Puppeteer fallback also failed:', puppeteerError);
      throw new Error(
        `Failed to fetch Gutenberg page from ${url}: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`
      );
    }
  }

  if (!html || html.trim().length === 0) {
    throw new Error('Gutenberg page returned empty content');
  }

  const $ = cheerio.load(html);

  // Grab header <pre> text BEFORE we strip it — that's where Title/Author live.
  const headerText = $('pre').first().text() || '';
  const metadata = extractGutenbergMetadata(url, $, headerText);

  // Strip the Gutenberg boilerplate: header + END/license <pre>, plus standard noise.
  $('pre').remove();
  $('script, style, noscript, iframe, header, footer, nav, aside').remove();

  // Drop the TOC ("Contents") and back-of-book index sections so they don't
  // pollute chapter output. Common Gutenberg anchor names.
  for (const anchor of ['contents', 'toc', 'bkindex', 'index']) {
    removeSectionByAnchor($, anchor);
  }

  // Some Gutenberg books mark chapters with <p class="chapter">CHAPTER N</p>
  // instead of heading tags. Promote those markers to <h3> so the heading-based
  // splitter picks them up. Prefix with the current PART (when the book is
  // divided into parts) so chapter titles stay unique across parts.
  promoteGutenbergChapterMarkers($);

  const bodyHtml = $('body').html() || '';
  if (!bodyHtml.trim()) {
    throw new Error('Gutenberg page had no body content after stripping boilerplate');
  }

  // Reuse the generic heading-based splitter — Gutenberg's <h2>/<h3> structure
  // matches it cleanly once boilerplate is gone.
  const chapters = extractSectionsFromGenericContent(bodyHtml, metadata.title, format)
    .map(ch => ({ ...ch, title: ch.title.replace(/\s+/g, ' ').trim() }))
    .filter(ch => {
      // Drop any straggler title-page / dedication shells that survived splitting.
      const t = ch.title.toLowerCase();
      return t !== 'contents.' && t !== 'contents' && t !== 'index.' && t !== 'index';
    });

  const totalLength = chapters.reduce((sum, ch) => sum + ch.content.length, 0);
  console.log(`[parseGutenbergText] Extracted ${chapters.length} chapters, total length: ${totalLength}`);

  return {
    metadata,
    chapters,
    format,
    chapterCount: chapters.length,
    totalLength,
  };
}

/**
 * Extract Title / Author / original-work year from the Gutenberg header <pre> block.
 * Note: "Release Date" in the header is when the EBook was posted to Gutenberg, NOT
 * when the work was written, so we deliberately leave `year` null and let the AI
 * metadata pass (or the human override field) fill it.
 */
function extractGutenbergMetadata(
  url: string,
  $: cheerio.CheerioAPI,
  headerText: string
): ParsedTextMetadata {
  let title = '';
  let author: string | null = null;

  const titleMatch = headerText.match(/^\s*Title:\s*(.+?)\s*$/m);
  if (titleMatch) title = titleMatch[1].trim();
  const authorMatch = headerText.match(/^\s*Author:\s*(.+?)\s*$/m);
  if (authorMatch) author = authorMatch[1].trim();

  if (!title) {
    title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
  }

  let description: string | null =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    null;
  if (!description) {
    const firstParagraph = $('p').first().text().trim();
    if (firstParagraph.length > 50 && firstParagraph.length < 500) {
      description = firstParagraph;
    }
  }

  return {
    title,
    author,
    year: null,
    publisher: 'Project Gutenberg',
    description,
    sourceUrl: url,
  };
}

/**
 * Promote <p class="chapter"> markers to <h3> headings (used by some Gutenberg
 * editions instead of real heading tags). Tracks the current PART so chapter
 * titles in multi-part works don't collide ("PART ONE — CHAPTER 1" vs
 * "PART TWO — CHAPTER 1").
 */
function promoteGutenbergChapterMarkers($: cheerio.CheerioAPI): void {
  let currentPart: string | null = null;
  $('body').children().each((_, el) => {
    const $el = $(el);
    const tag = ($el.prop('tagName') || '').toLowerCase();
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (/^h[1-6]$/.test(tag) && /^part\s+/i.test(text)) {
      currentPart = text;
      return;
    }
    if (tag === 'p' && $el.hasClass('chapter') && text) {
      const title = currentPart ? `${currentPart} — ${text}` : text;
      $el.replaceWith(`<h3>${escapeHtml(title)}</h3>`);
    }
  });
}

/**
 * Remove a Gutenberg section identified by an <a name="..."> anchor inside a heading:
 * removes the heading itself plus every following sibling up to (but not including)
 * the next heading of equal or higher level.
 */
function removeSectionByAnchor($: cheerio.CheerioAPI, anchorName: string): void {
  const anchor = $(`a[name="${anchorName}"]`).first();
  if (anchor.length === 0) return;
  const heading = anchor.closest('h1, h2, h3, h4, h5, h6');
  if (heading.length === 0) return;
  const headingLevel = parseInt((heading.prop('tagName') || 'H6').slice(1), 10);

  let cur = heading.next();
  while (cur.length > 0) {
    const tag = (cur.prop('tagName') || '').toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      const lvl = parseInt(tag.slice(1), 10);
      if (lvl <= headingLevel) break;
    }
    const next = cur.next();
    cur.remove();
    cur = next;
  }
  heading.remove();
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

// Sacred Texts subsections that contain a curated set of independently-imported
// books, each with its own per-book index page (e.g. /bib/apo/bar.htm).
// Used both for corpus-shell detection on /<section>/index.htm and for book-index
// detection on /<section>/<basename>.htm (where basename has no 3-digit suffix).
const SACRED_TEXTS_CURATED_SECTIONS = ['/chr/apo/', '/bib/apo/', '/bib/kjv/', '/alc/hermmuse/', '/hin/rigveda/'] as const;

function isApocryphaCorpusIndexUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes('sacred-texts.com')) return false;
    const path = parsed.pathname.replace(/\/+$/, '');
    return SACRED_TEXTS_CURATED_SECTIONS.some(section => path === `${section.replace(/\/$/, '')}/index.htm`);
  } catch {
    return false;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSacredTextsBookPrefix(url: string): string | null {
  if (!isSacredTextsBookIndex(url)) return null;
  try {
    const parsed = new URL(url);
    const filename = parsed.pathname.split('/').pop() || '';
    const match = filename.match(/^([a-z0-9]+)\.htm$/i);
    if (!match) return null;
    const raw = match[1].toLowerCase();

    // Rig Veda quirk: book-index pages are `rvi01.htm` … `rvi10.htm` but the
    // per-hymn chapter pages drop the "i" (`rv01001.htm`, `rv01002.htm`, …).
    // Strip the "i" so the chapter-filter regex matches.
    if (parsed.pathname.startsWith('/hin/rigveda/') && /^rvi\d+$/.test(raw)) {
      return raw.replace(/^rvi/, 'rv');
    }

    return raw;
  } catch {
    return null;
  }
}

function isSacredTextsBookIndex(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes('sacred-texts.com')) return false;
    const path = parsed.pathname;
    if (path.endsWith('/index.htm')) return false;
    const matchedSection = SACRED_TEXTS_CURATED_SECTIONS.find(section => {
      const pattern = new RegExp(`^${section.replace(/\//g, '\\/')}[^/]+\\.htm$`, 'i');
      return pattern.test(path);
    });
    if (!matchedSection) return false;
    const filename = path.split('/').pop() || '';
    // Chapter pages end with 3 digits before .htm (bar001.htm, gen001.htm).
    // Book-index pages do not (bar.htm, gen.htm, sa1.htm).
    return !/\d{3}\.htm$/i.test(filename);
  } catch {
    return false;
  }
}

// Backwards-compatible alias for the previous narrower helper.
const isBibleApocryphaBookIndex = isSacredTextsBookIndex;

function getApocryphaCorpus(sourceUrl: string) {
  const path = new URL(sourceUrl).pathname.replace(/\/+$/, '');

  if (path === '/bib/kjv/index.htm') {
    return {
      slug: 'kjv-bible',
      title: 'The King James Bible',
      metadataTitle: 'The King James Bible',
      metadataDescription: 'The 1611 King James Version of the Bible, split into 39 Old Testament and 27 New Testament books for individual study.',
      sourceUrl,
      sourceNote: 'The KJV index at the Internet Sacred Text Archive lists each of the 66 books as its own multi-chapter document. Each entry below points to a book and imports as its own library item.',
      importStrategy: 'Import this shell once, then import each book individually (or batch all unlinked) so each becomes a proper multi-chapter library item.',
      groups: [
        {
          id: 'old-testament',
          title: 'Old Testament',
          description: 'The 39 books of the Hebrew Bible canon as received in the Protestant Old Testament. Sacred Texts retains Septuagint book numbering ("1 Kings" = 1 Samuel, "3 Kings" = 1 Kings) on its archive labels; titles here use the conventional Protestant names.',
          items: [
            { title: 'Genesis', sourceUrl: 'https://sacred-texts.com/bib/kjv/gen.htm' },
            { title: 'Exodus', sourceUrl: 'https://sacred-texts.com/bib/kjv/exo.htm' },
            { title: 'Leviticus', sourceUrl: 'https://sacred-texts.com/bib/kjv/lev.htm' },
            { title: 'Numbers', sourceUrl: 'https://sacred-texts.com/bib/kjv/num.htm' },
            { title: 'Deuteronomy', sourceUrl: 'https://sacred-texts.com/bib/kjv/deu.htm' },
            { title: 'Joshua', sourceUrl: 'https://sacred-texts.com/bib/kjv/jos.htm' },
            { title: 'Judges', sourceUrl: 'https://sacred-texts.com/bib/kjv/jdg.htm' },
            { title: 'Ruth', sourceUrl: 'https://sacred-texts.com/bib/kjv/rut.htm' },
            { title: '1 Samuel', sourceUrl: 'https://sacred-texts.com/bib/kjv/sa1.htm' },
            { title: '2 Samuel', sourceUrl: 'https://sacred-texts.com/bib/kjv/sa2.htm' },
            { title: '1 Kings', sourceUrl: 'https://sacred-texts.com/bib/kjv/kg1.htm' },
            { title: '2 Kings', sourceUrl: 'https://sacred-texts.com/bib/kjv/kg2.htm' },
            { title: '1 Chronicles', sourceUrl: 'https://sacred-texts.com/bib/kjv/ch1.htm' },
            { title: '2 Chronicles', sourceUrl: 'https://sacred-texts.com/bib/kjv/ch2.htm' },
            { title: 'Ezra', sourceUrl: 'https://sacred-texts.com/bib/kjv/ezr.htm' },
            { title: 'Nehemiah', sourceUrl: 'https://sacred-texts.com/bib/kjv/neh.htm' },
            { title: 'Esther', sourceUrl: 'https://sacred-texts.com/bib/kjv/est.htm' },
            { title: 'Job', sourceUrl: 'https://sacred-texts.com/bib/kjv/job.htm' },
            { title: 'Psalms', sourceUrl: 'https://sacred-texts.com/bib/kjv/psa.htm' },
            { title: 'Proverbs', sourceUrl: 'https://sacred-texts.com/bib/kjv/pro.htm' },
            { title: 'Ecclesiastes', sourceUrl: 'https://sacred-texts.com/bib/kjv/ecc.htm' },
            { title: 'Song of Solomon', sourceUrl: 'https://sacred-texts.com/bib/kjv/sol.htm' },
            { title: 'Isaiah', sourceUrl: 'https://sacred-texts.com/bib/kjv/isa.htm' },
            { title: 'Jeremiah', sourceUrl: 'https://sacred-texts.com/bib/kjv/jer.htm' },
            { title: 'Lamentations', sourceUrl: 'https://sacred-texts.com/bib/kjv/lam.htm' },
            { title: 'Ezekiel', sourceUrl: 'https://sacred-texts.com/bib/kjv/eze.htm' },
            { title: 'Daniel', sourceUrl: 'https://sacred-texts.com/bib/kjv/dan.htm' },
            { title: 'Hosea', sourceUrl: 'https://sacred-texts.com/bib/kjv/hos.htm' },
            { title: 'Joel', sourceUrl: 'https://sacred-texts.com/bib/kjv/joe.htm' },
            { title: 'Amos', sourceUrl: 'https://sacred-texts.com/bib/kjv/amo.htm' },
            { title: 'Obadiah', sourceUrl: 'https://sacred-texts.com/bib/kjv/oba.htm' },
            { title: 'Jonah', sourceUrl: 'https://sacred-texts.com/bib/kjv/jon.htm' },
            { title: 'Micah', sourceUrl: 'https://sacred-texts.com/bib/kjv/mic.htm' },
            { title: 'Nahum', sourceUrl: 'https://sacred-texts.com/bib/kjv/nah.htm' },
            { title: 'Habakkuk', sourceUrl: 'https://sacred-texts.com/bib/kjv/hab.htm' },
            { title: 'Zephaniah', sourceUrl: 'https://sacred-texts.com/bib/kjv/zep.htm' },
            { title: 'Haggai', sourceUrl: 'https://sacred-texts.com/bib/kjv/hag.htm' },
            { title: 'Zechariah', sourceUrl: 'https://sacred-texts.com/bib/kjv/zac.htm' },
            { title: 'Malachi', sourceUrl: 'https://sacred-texts.com/bib/kjv/mal.htm' },
          ],
        },
        {
          id: 'new-testament',
          title: 'New Testament',
          description: 'The 27 books of the New Testament canon: gospels, Acts, Pauline and general epistles, and the Apocalypse of John.',
          items: [
            { title: 'Matthew', sourceUrl: 'https://sacred-texts.com/bib/kjv/mat.htm' },
            { title: 'Mark', sourceUrl: 'https://sacred-texts.com/bib/kjv/mar.htm' },
            { title: 'Luke', sourceUrl: 'https://sacred-texts.com/bib/kjv/luk.htm' },
            { title: 'John', sourceUrl: 'https://sacred-texts.com/bib/kjv/joh.htm' },
            { title: 'Acts', sourceUrl: 'https://sacred-texts.com/bib/kjv/act.htm' },
            { title: 'Romans', sourceUrl: 'https://sacred-texts.com/bib/kjv/rom.htm' },
            { title: '1 Corinthians', sourceUrl: 'https://sacred-texts.com/bib/kjv/co1.htm' },
            { title: '2 Corinthians', sourceUrl: 'https://sacred-texts.com/bib/kjv/co2.htm' },
            { title: 'Galatians', sourceUrl: 'https://sacred-texts.com/bib/kjv/gal.htm' },
            { title: 'Ephesians', sourceUrl: 'https://sacred-texts.com/bib/kjv/eph.htm' },
            { title: 'Philippians', sourceUrl: 'https://sacred-texts.com/bib/kjv/phi.htm' },
            { title: 'Colossians', sourceUrl: 'https://sacred-texts.com/bib/kjv/col.htm' },
            { title: '1 Thessalonians', sourceUrl: 'https://sacred-texts.com/bib/kjv/th1.htm' },
            { title: '2 Thessalonians', sourceUrl: 'https://sacred-texts.com/bib/kjv/th2.htm' },
            { title: '1 Timothy', sourceUrl: 'https://sacred-texts.com/bib/kjv/ti1.htm' },
            { title: '2 Timothy', sourceUrl: 'https://sacred-texts.com/bib/kjv/ti2.htm' },
            { title: 'Titus', sourceUrl: 'https://sacred-texts.com/bib/kjv/tit.htm' },
            { title: 'Philemon', sourceUrl: 'https://sacred-texts.com/bib/kjv/plm.htm' },
            { title: 'Hebrews', sourceUrl: 'https://sacred-texts.com/bib/kjv/heb.htm' },
            { title: 'James', sourceUrl: 'https://sacred-texts.com/bib/kjv/jam.htm' },
            { title: '1 Peter', sourceUrl: 'https://sacred-texts.com/bib/kjv/pe1.htm' },
            { title: '2 Peter', sourceUrl: 'https://sacred-texts.com/bib/kjv/pe2.htm' },
            { title: '1 John', sourceUrl: 'https://sacred-texts.com/bib/kjv/jo1.htm' },
            { title: '2 John', sourceUrl: 'https://sacred-texts.com/bib/kjv/jo2.htm' },
            { title: '3 John', sourceUrl: 'https://sacred-texts.com/bib/kjv/jo3.htm' },
            { title: 'Jude', sourceUrl: 'https://sacred-texts.com/bib/kjv/jde.htm' },
            { title: 'Revelation', sourceUrl: 'https://sacred-texts.com/bib/kjv/rev.htm' },
          ],
        },
      ],
    };
  }

  if (path === '/alc/hermmuse/index.htm') {
    return {
      slug: 'hermetic-museum',
      title: 'The Hermetic Museum',
      metadataTitle: 'The Hermetic Museum',
      metadataDescription: 'Arthur Edward Waite\'s 1893 English translation of the Musaeum Hermeticum, a curated collection of twenty-three alchemical treatises across two volumes.',
      sourceUrl,
      sourceNote: 'The Hermetic Museum index at the Internet Sacred Text Archive is a hub across two volumes of independent alchemical tracts. Each treatise below is preserved as its own importable document.',
      importStrategy: 'Import this shell once, then import each treatise individually so each becomes its own library item.',
      groups: [
        {
          id: 'volume-1',
          title: 'Volume I',
          description: 'Eleven alchemical tracts compiled in the first volume of Waite\'s edition.',
          items: [
            { title: 'The Golden Tract Concerning the Stone of the Philosophers', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm104.htm' },
            { title: 'The Golden Age Restored', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm105.htm' },
            { title: 'The Sophic Hydrolith', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm106.htm' },
            { title: 'A Demonstration of Nature', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm107.htm' },
            { title: 'A Short Tract or Philosophical Summary', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm108.htm' },
            { title: 'The Only True Way', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm109.htm' },
            { title: 'The Glory of the World; or, Table of Paradise', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm110.htm' },
            { title: 'A Tract of Great Price', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm111.htm' },
            { title: 'The Book of Alze', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm112.htm' },
            { title: 'The Book of Lambspring', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm113.htm' },
            { title: 'The Golden Tripod', sourceUrl: 'https://sacred-texts.com/alc/hm1/hm114.htm' },
          ],
        },
        {
          id: 'volume-2',
          title: 'Volume II',
          description: 'Twelve alchemical tracts compiled in the second volume, including the three Philalethes treatises.',
          items: [
            { title: 'Believe-Me, or The Ordinal of Alchemy', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm202.htm' },
            { title: 'The Testament of Cremer', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm203.htm' },
            { title: 'The New Chemical Light', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm204.htm' },
            { title: 'The New Chemical Light, Second Treatise', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm205.htm' },
            { title: 'An Open Entrance to the Closed Palace of the King', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm206.htm' },
            { title: 'A Subtle Allegory Concerning the Secrets of Alchemy', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm207.htm' },
            { title: 'The Metamorphosis of Metals', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm209.htm' },
            { title: 'A Brief Guide to the Celestial Ruby', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm210.htm' },
            { title: 'The Fount of Chemical Truth', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm211.htm' },
            { title: 'Helvetius’ Golden Calf', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm212.htm' },
            { title: 'The All-Wise Doorkeeper or A Fourfold Figure', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm213.htm' },
            { title: 'Addendum', sourceUrl: 'https://sacred-texts.com/alc/hm2/hm214.htm' },
          ],
        },
      ],
    };
  }

  if (path === '/hin/rigveda/index.htm') {
    return {
      slug: 'rig-veda',
      title: 'The Rig Veda',
      metadataTitle: 'The Rig Veda',
      metadataDescription: 'Ralph T.H. Griffith\'s 1896 English translation of the Rig Veda, the oldest of the four Vedic sacred texts, organized into ten Mandalas (books) of hymns to the Vedic deities.',
      sourceUrl,
      sourceNote: 'The Rig Veda index at the Internet Sacred Text Archive lists each of the ten Mandalas as its own multi-hymn document. Each entry below points to a book index and imports as its own library item.',
      importStrategy: 'Import this shell once, then import each Mandala individually so each becomes its own multi-hymn library item.',
      groups: [
        {
          id: 'the-ten-mandalas',
          title: 'The Ten Mandalas',
          description: 'The ten books (Mandalas) of the Rig Veda. Mandalas II–VII are the oldest "family books" composed by single priestly lineages; Mandalas I and VIII are middle-layer collections; Mandala IX gathers the Soma hymns; Mandala X is the latest, containing the philosophical and cosmogonic hymns including the Purusha Sukta and the Nasadiya Sukta.',
          items: [
            { title: 'Mandala I', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi01.htm' },
            { title: 'Mandala II', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi02.htm' },
            { title: 'Mandala III', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi03.htm' },
            { title: 'Mandala IV', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi04.htm' },
            { title: 'Mandala V', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi05.htm' },
            { title: 'Mandala VI', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi06.htm' },
            { title: 'Mandala VII', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi07.htm' },
            { title: 'Mandala VIII', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi08.htm' },
            { title: 'Mandala IX', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi09.htm' },
            { title: 'Mandala X', sourceUrl: 'https://sacred-texts.com/hin/rigveda/rvi10.htm' },
          ],
        },
      ],
    };
  }

  if (path === '/bib/apo/index.htm') {
    return {
      slug: 'deuterocanonical-bible-apocrypha',
      title: 'The Deuterocanonical Books of the Bible',
      metadataTitle: 'The Deuterocanonical Books of the Bible',
      metadataDescription: 'A curated corpus shell for the deuterocanonical and biblical apocrypha collected at the Internet Sacred Text Archive.',
      sourceUrl,
      sourceNote: 'Curated from the Internet Sacred Text Archive Bible Apocrypha index. The page is a map across 16 independent public-domain source texts rather than a single book.',
      importStrategy: 'Import this shell once, then import each book individually so its chapters are stored as a proper multi-chapter document.',
      groups: [
        {
          id: 'deuterocanonical',
          title: 'Deuterocanonical & Biblical Apocrypha',
          description: 'Books considered deuterocanonical in Catholic and Orthodox Bibles, plus related apocrypha excluded from the modern canon.',
          items: [
            { title: '1 Esdras', sourceUrl: 'https://sacred-texts.com/bib/apo/es1.htm' },
            { title: '2 Esdras', sourceUrl: 'https://sacred-texts.com/bib/apo/es2.htm' },
            { title: 'Additions to Esther', sourceUrl: 'https://sacred-texts.com/bib/apo/aes.htm' },
            { title: '1 Maccabees', sourceUrl: 'https://sacred-texts.com/bib/apo/ma1.htm' },
            { title: '2 Maccabees', sourceUrl: 'https://sacred-texts.com/bib/apo/ma2.htm' },
            { title: 'Tobias', sourceUrl: 'https://sacred-texts.com/bib/apo/tob.htm' },
            { title: 'Judith', sourceUrl: 'https://sacred-texts.com/bib/apo/jdt.htm' },
            { title: 'Wisdom', sourceUrl: 'https://sacred-texts.com/bib/apo/wis.htm' },
            { title: 'Sirach', sourceUrl: 'https://sacred-texts.com/bib/apo/sir.htm' },
            { title: 'Baruch', sourceUrl: 'https://sacred-texts.com/bib/apo/bar.htm' },
            { title: 'Epistle of Jeremiah', sourceUrl: 'https://sacred-texts.com/bib/apo/epj.htm' },
            { title: 'Susanna', sourceUrl: 'https://sacred-texts.com/bib/apo/sus.htm' },
            { title: 'Prayer of Azariah', sourceUrl: 'https://sacred-texts.com/bib/apo/aza.htm' },
            { title: 'Prayer of Manasseh', sourceUrl: 'https://sacred-texts.com/bib/apo/man.htm' },
            { title: 'Bel and the Dragon', sourceUrl: 'https://sacred-texts.com/bib/apo/bel.htm' },
            { title: 'Laodiceans', sourceUrl: 'https://sacred-texts.com/bib/apo/lao.htm' },
          ],
        },
      ],
    };
  }

  return {
    slug: 'apocrypha-christian-pseudepigrapha',
    title: 'Apocrypha & Christian Pseudepigrapha',
    metadataTitle: 'Apocrypha & Christian Pseudepigrapha',
    metadataDescription: 'A curated corpus shell for deuterocanonical books, Old Testament pseudepigrapha, New Testament apocrypha, apostolic literature, and related late antique texts.',
    sourceUrl,
    sourceNote: 'Curated from the Internet Sacred Text Archive Apocrypha hub. The hub is a map across several independent public-domain source texts rather than a single book.',
    importStrategy: 'Import this shell once, then import each source item as its own document and optionally add its textId back to the matching corpus item.',
    groups: [
      {
        id: 'deuterocanonical',
        title: 'Deuterocanonical / Biblical Apocrypha',
        description: 'Books that appear in some biblical canons and were excluded from others.',
        items: [
          { title: 'The Deuterocanonical Books of the Bible', sourceUrl: 'https://sacred-texts.com/bib/apo/index.htm', expectedSections: 16 },
        ],
      },
      {
        id: 'old-testament-pseudepigrapha',
        title: 'Old Testament Pseudepigrapha & Patriarchal Legends',
        description: 'Second Temple, patriarchal, and legendary expansions around Genesis, Enoch, Jubilees, and related traditions.',
        items: [
          { title: 'The Forgotten Books of Eden', sourceUrl: 'https://sacred-texts.com/bib/fbe/index.htm' },
          { title: 'The Book of Enoch', subtitle: 'R. H. Charles translation', sourceUrl: 'https://sacred-texts.com/bib/boe/index.htm' },
          { title: 'The Book of Enoch the Prophet', subtitle: 'Richard Laurence translation', sourceUrl: 'https://sacred-texts.com/bib/bep/index.htm' },
          { title: 'The Book of Jubilees', sourceUrl: 'https://sacred-texts.com/bib/jub/index.htm' },
          { title: 'Slavonic Life of Adam and Eve', sourceUrl: 'https://sacred-texts.com/chr/apo/slanev.htm' },
          { title: 'The Books of Adam and Eve', sourceUrl: 'https://sacred-texts.com/chr/apo/adamnev.htm' },
          { title: 'The Book of Jasher', sourceUrl: 'https://sacred-texts.com/chr/apo/jasher/index.htm' },
        ],
      },
      {
        id: 'new-testament-apocrypha',
        title: 'New Testament Apocrypha & Apostolic Literature',
        description: 'Infancy gospels, passion narratives, apostolic acts, epistles, sayings texts, and early church manuals.',
        items: [
          { title: 'The Lost Books of the Bible', sourceUrl: 'https://sacred-texts.com/bib/lbob/index.htm' },
          { title: 'The Gospel of Thomas', sourceUrl: 'https://sacred-texts.com/chr/thomas.htm' },
          { title: 'The Didache', sourceUrl: 'https://sacred-texts.com/chr/did/index.htm' },
          { title: 'Excerpts from the Gospel of Mary', sourceUrl: 'https://sacred-texts.com/chr/apo/marym.htm' },
        ],
      },
      {
        id: 'oracular-late-antique',
        title: 'Oracular & Late Antique Border Texts',
        description: 'Texts adjacent to Jewish and Christian apocalyptic imagination, reception, and late antique sacred history.',
        items: [
          { title: 'The Sibylline Oracles', sourceUrl: 'https://sacred-texts.com/cla/sib/index.htm' },
          { title: 'The Biblical Antiquities of Philo', sourceUrl: 'https://sacred-texts.com/bib/bap/index.htm' },
        ],
      },
    ],
  };
}

function parseApocryphaCorpusIndex(
  url: string,
  format: 'html' | 'markdown' | 'plaintext' = 'html'
): ParsedText {
  const sourceUrl = stripUrlHash(url);
  const corpus = getApocryphaCorpus(sourceUrl);

  const overviewHtml = cleanHtml(`
    <h2>Corpus Guide</h2>
    <p>This library item is a curated shell for <strong>${escapeHtml(corpus.title)}</strong>. The source page is a hub across several independent public-domain works rather than a single book, so each work is preserved as its own importable document under one collection-facing entry.</p>
    <p>Open the viewer for the nested corpus map, then import each source item as its own text when you are ready to add it to the collection.</p>
  `);

  const chapterContent = format === 'html'
    ? overviewHtml
    : format === 'markdown'
      ? htmlToMarkdown(overviewHtml)
      : htmlToPlaintext(overviewHtml);

  return {
    metadata: {
      title: corpus.metadataTitle,
      author: 'Various',
      year: null,
      publisher: 'Internet Sacred Text Archive',
      description: corpus.metadataDescription,
      sourceUrl,
    },
    chapters: [
      {
        id: 'corpus-guide',
        title: 'Corpus Guide',
        content: chapterContent,
      },
    ],
    format,
    chapterCount: 1,
    totalLength: chapterContent.length,
    extraMetadata: {
      isCorpusCollection: true,
      corpus,
    },
  };
}

/**
 * Parse Hermetic Library / DokuWiki texts.
 * Pages like hermetic.com/texts/yetzirah store clean book content in .dw-content
 * with heading nodes followed by matching level divs.
 */
export async function parseHermeticLibraryText(
  url: string,
  format: 'html' | 'markdown' | 'plaintext' = 'html'
): Promise<ParsedText> {
  const normalizedUrl = stripUrlHash(url);
  const response = await fetch(normalizedUrl, {
    headers: {
      ...COMMON_HEADERS,
      'Sec-Fetch-Site': 'none',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Hermetic Library page (HTTP ${response.status}): ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $('script, style, noscript, iframe, .dw-toc, .editbutton_section').remove();

  const $content = $('.dw-content').first();
  if ($content.length === 0) {
    throw new Error('Could not find Hermetic Library content container');
  }

  const metadata = extractHermeticMetadata(normalizedUrl, $);
  const chapters: Chapter[] = [];
  let currentSection: { title: string; content: string[] } | null = null;

  const flushSection = () => {
    if (!currentSection) return;

    const sectionHtml = currentSection.content.join('\n');
    const textLength = cheerio.load(sectionHtml).text().replace(/\s+/g, ' ').trim().length;
    const normalizedTitle = currentSection.title.toLowerCase();

    if (textLength >= 50 && normalizedTitle !== 'sepher yetzirah') {
      const cleanContent = cleanHtml(sectionHtml);
      chapters.push({
        id: `chapter-${chapters.length + 1}`,
        title: currentSection.title,
        content: format === 'html'
          ? cleanContent
          : format === 'markdown'
            ? htmlToMarkdown(cleanContent)
            : htmlToPlaintext(cleanContent),
      });
    }

    currentSection = null;
  };

  $content.children().each((_, element) => {
    const $element = $(element);
    const tagName = $element.prop('tagName')?.toLowerCase();
    const text = $element.text().replace(/\s+/g, ' ').trim();

    if (tagName && /^h[1-6]$/.test(tagName) && text) {
      flushSection();
      currentSection = {
        title: text,
        content: [],
      };
      return;
    }

    if (!currentSection) return;

    const htmlFragment = $.html(element);
    if (htmlFragment && text.length > 0) {
      currentSection.content.push(htmlFragment);
    }
  });

  flushSection();

  if (chapters.length === 0) {
    throw new Error('Could not split Hermetic Library page into chapters');
  }

  const totalLength = chapters.reduce((sum, chapter) => sum + chapter.content.length, 0);

  return {
    metadata,
    chapters,
    format,
    chapterCount: chapters.length,
    totalLength,
  };
}

function stripUrlHash(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.toString();
}

function extractHermeticMetadata(url: string, $: cheerio.CheerioAPI): ParsedTextMetadata {
  let title = $('.dw-content h1').first().text().trim() || $('title').text().trim();
  title = title
    .replace(/\s*-\s*Sacred Texts\s*-\s*Hermetic Library\s*$/i, '')
    .replace(/\s*-\s*Hermetic Library\s*$/i, '')
    .trim() || 'Untitled Hermetic Library Text';

  const contentText = $('.dw-content').text().replace(/\s+/g, ' ').trim();
  const authorMatch =
    contentText.match(/Translated from the Hebrew by\s+([^(.]+)/i) ||
    contentText.match(/\bby\s+([A-Z][\w.\s-]+?)(?:\.|\(|$)/i);
  const yearMatch = contentText.match(/\b(1[6-9]\d{2}|20[0-2]\d)\b/);
  const description = $('.dw-content p')
    .map((_, element) => $(element).text().replace(/\s+/g, ' ').trim())
    .get()
    .find(paragraph => paragraph.length > 80 && paragraph.length < 600) || null;

  return {
    title,
    author: authorMatch?.[1]?.trim() || null,
    year: yearMatch ? parseInt(yearMatch[1], 10) : null,
    publisher: 'Hermetic Library',
    description,
    sourceUrl: url,
  };
}

