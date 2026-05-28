/**
 * Convert a plain-text book (including SourceLibrary's structured markdown-with-tags
 * format) into clean HTML for rendering in HTMLViewer.
 *
 * Handles:
 *  - Markdown headings (#, ##, ###)
 *  - Markdown bold/italic (**, *)
 *  - Decorative divider lines (═══, ───, ***, etc.) → <hr>
 *  - SourceLibrary page markers: [Page N] → <h3> anchor
 *  - SourceLibrary tags: <language>, <page-type>, <page-num>, <vocab>, <warning>,
 *    <meta> — page metadata, hidden from prose view
 *  - <image-desc>...</image-desc> → italic blockquote
 *  - <insert>x</insert> → x (inlined, square brackets)
 *  - <unclear>x</unclear> → x with question mark
 *  - Centered text: ->text<- → centered paragraph
 *  - Chapter / Part / Book / roman numeral lines → <h2>
 */

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, c => HTML_ESCAPE[c]);
}

// Apply inline markdown: **bold**, *italic*, _italic_. Run on already-escaped text.
function applyInlineMarkdown(escaped: string): string {
  return escaped
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, '$1<em>$2</em>')
    .replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, '$1<em>$2</em>');
}

// SourceLibrary page-metadata tags that should not appear in the rendered prose.
const HIDDEN_TAGS = ['language', 'page-type', 'page-num', 'vocab', 'warning', 'meta'];

function stripHiddenTags(input: string): string {
  let out = input;
  for (const tag of HIDDEN_TAGS) {
    const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'gi');
    out = out.replace(re, '');
    // also drop self-closing / unclosed forms on their own line
    const selfClose = new RegExp(`^\\s*<${tag}\\s*/?>\\s*$`, 'gim');
    out = out.replace(selfClose, '');
  }
  return out;
}

const DIVIDER_CHAR_CLASS = '=\\-_*~#·•─━═╌╍╴╶∙◆◇◈▪▫■□●○';
const DIVIDER_LINE_RE = new RegExp(`^[${DIVIDER_CHAR_CLASS}\\s]{3,}$`);

function isDividerBlock(block: string): boolean {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.length > 0 && lines.every(l => DIVIDER_LINE_RE.test(l));
}

function renderBlock(block: string): string {
  const trimmed = block.trim();
  if (!trimmed) return '';

  // Decorative divider
  if (isDividerBlock(trimmed)) return '<hr>';

  // SourceLibrary page marker: [Page N]
  const pageMatch = trimmed.match(/^\[Page\s+(\d+)\]$/i);
  if (pageMatch) {
    const n = pageMatch[1];
    return `<h3 id="page-${n}" class="page-marker">Page ${n}</h3>`;
  }

  // <image-desc>...</image-desc> — render as a captioned italic blockquote
  const imgDesc = trimmed.match(/^<image-desc>([\s\S]*?)<\/image-desc>$/i);
  if (imgDesc) {
    const inner = applyInlineMarkdown(escapeHtml(imgDesc[1].trim()));
    return `<blockquote class="image-desc"><em>Image: ${inner}</em></blockquote>`;
  }

  // Markdown heading (#, ##, ###, ####)
  const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
  if (headingMatch && !trimmed.includes('\n')) {
    const level = headingMatch[1].length;
    const text = applyInlineMarkdown(escapeHtml(headingMatch[2].trim()));
    return `<h${level}>${text}</h${level}>`;
  }

  // Centered text: ->text<-  (single line or multi-line block of these)
  const lines = trimmed.split('\n');
  if (lines.every(l => /^->.*<-$/.test(l.trim()))) {
    const inner = lines
      .map(l => applyInlineMarkdown(escapeHtml(l.trim().replace(/^->/, '').replace(/<-$/, ''))))
      .join('<br>');
    return `<p style="text-align:center">${inner}</p>`;
  }

  // Common book heading lines (Chapter N, Part II, roman numerals, short ALL-CAPS)
  if (
    !trimmed.includes('\n') &&
    (
      /^(chapter|part|book|section|volume)\s+[\divxlcm]+\b/i.test(trimmed) ||
      /^[ivxlcm]{1,6}\.?$/i.test(trimmed) ||
      /^[A-Z0-9][A-Z0-9 .,'":;!?\-—]{0,80}$/.test(trimmed)
    )
  ) {
    return `<h2>${applyInlineMarkdown(escapeHtml(trimmed))}</h2>`;
  }

  // Regular paragraph — preserve hard line breaks within
  const escaped = applyInlineMarkdown(escapeHtml(trimmed));
  return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
}

export function convertPlainTextBookToHtml(raw: string, title: string): string {
  // Normalize and strip noise tags first.
  const normalized = stripHiddenTags(
    raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  );

  // Inline tag substitutions that apply across the document.
  const withInlineTags = normalized
    .replace(/<insert>([\s\S]*?)<\/insert>/gi, '[$1]')
    .replace(/<unclear>([\s\S]*?)<\/unclear>/gi, '$1?');

  const blocks = withInlineTags
    .split(/\n\s*\n+/)
    .map(b => b.trim())
    .filter(Boolean);

  const html = blocks.map(renderBlock).filter(Boolean).join('\n');
  const safeTitle = escapeHtml(title);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body>${html}</body></html>`;
}
