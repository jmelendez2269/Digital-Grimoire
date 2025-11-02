import { NextRequest, NextResponse } from 'next/server';
import type { Browser } from 'playwright-core';

// Lazy import to keep cold start small
async function getBrowser() {
  const playwright = await import('playwright-core');
  // On many platforms, chromium is available. Adjust flags for serverless.
  return await playwright.chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serializeNodeToHtml(node: any): string {
  if (!node) return '';
  switch (node.type) {
    case 'doc':
      return (node.content || []).map(serializeNodeToHtml).join('');
    case 'paragraph':
      return `<p>${(node.content || []).map(serializeNodeToHtml).join('')}</p>`;
    case 'text': {
      let text = escapeHtml(node.text || '');
      const marks = node.marks || [];
      for (const m of marks) {
        if (m.type === 'bold') text = `<strong>${text}</strong>`;
        if (m.type === 'italic') text = `<em>${text}</em>`;
        if (m.type === 'code') text = `<code>${text}</code>`;
        if (m.type === 'wikiLink') text = `<span data-wikilink title="${escapeHtml(m.attrs?.title || m.attrs?.slug || '')}">[[${escapeHtml(m.attrs?.title || m.attrs?.slug || '')}]]</span>`;
      }
      return text;
    }
    case 'heading': {
      const level = Math.min(3, Math.max(1, node.attrs?.level || 1));
      const content = (node.content || []).map(serializeNodeToHtml).join('');
      return `<h${level}>${content}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${(node.content || []).map(serializeNodeToHtml).join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(node.content || []).map(serializeNodeToHtml).join('')}</ol>`;
    case 'listItem':
      return `<li>${(node.content || []).map(serializeNodeToHtml).join('')}</li>`;
    case 'blockquote':
      return `<blockquote>${(node.content || []).map(serializeNodeToHtml).join('')}</blockquote>`;
    case 'codeBlock':
      return `<pre><code>${(node.content || []).map(serializeNodeToHtml).join('')}</code></pre>`;
    case 'horizontalRule':
      return '<hr />';
    case 'image':
      return `<img src="${node.attrs?.src || ''}" alt="${escapeHtml(node.attrs?.alt || '')}" />`;
    default:
      return '';
  }
}

export async function POST(req: NextRequest) {
  let browser: Browser | null = null;
  try {
    const body = await req.json();
    const { content, title = 'Export' } = body || {};
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    const inner = serializeNodeToHtml(json);
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 24mm 18mm; }
    body { font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif; color: #111827; }
    h1, h2, h3 { margin: 1.2em 0 .6em; }
    p { margin: .6em 0; }
    blockquote { border-left: 3px solid #9CA3AF; padding-left: .8rem; color: #374151; }
    code { background: #F3F4F6; padding: 2px 4px; border-radius: 4px; }
    pre code { display: block; padding: 1rem; }
    img { max-width: 100%; height: auto; }
  </style>
  </head>
<body>
  ${inner}
</body>
</html>`;

    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdfOptions = {
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:10px;padding-left:18mm;color:#6B7280;">${escapeHtml(title)}</div>`,
      footerTemplate: `<div style="font-size:10px;width:100%;text-align:right;padding-right:18mm;color:#6B7280;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      format: 'A4' as const,
    };
    const pdf = await page.pdf(pdfOptions);
    await page.close();

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(title)}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to export pdf' }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}


