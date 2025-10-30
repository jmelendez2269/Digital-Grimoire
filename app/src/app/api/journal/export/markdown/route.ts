import { NextRequest, NextResponse } from 'next/server';

function serializeNode(node: any): string {
  if (!node) return '';
  switch (node.type) {
    case 'doc':
      return (node.content || []).map(serializeNode).join('\n\n');
    case 'paragraph':
      return (node.content || []).map(serializeNode).join('');
    case 'text': {
      let text = node.text || '';
      const marks = node.marks || [];
      for (const m of marks) {
        if (m.type === 'bold') text = `**${text}**`;
        if (m.type === 'italic') text = `*${text}*`;
        if (m.type === 'code') text = `\`${text}\``;
        if (m.type === 'wikiLink') text = `[[${m.attrs?.title || m.attrs?.slug || text}]]`;
      }
      return text;
    }
    case 'heading': {
      const level = node.attrs?.level || 1;
      const content = (node.content || []).map(serializeNode).join('');
      return `${'#'.repeat(level)} ${content}`;
    }
    case 'bulletList':
      return (node.content || []).map(li => serializeNode(li)).join('\n');
    case 'orderedList':
      return (node.content || []).map((li, i) => serializeNode({ ...li, attrs: { order: (node.attrs?.start || 1) + i } })).join('\n');
    case 'listItem':
      if (node.attrs?.order) {
        const inner = (node.content || []).map(serializeNode).join(' ');
        return `${node.attrs.order}. ${inner}`;
      }
      return `- ${(node.content || []).map(serializeNode).join(' ')}`;
    case 'blockquote':
      return (node.content || []).map(serializeNode).join('\n').split('\n').map(l => `> ${l}`).join('\n');
    case 'codeBlock':
      return `\n\n\
\`\`\`\n${(node.content || []).map(serializeNode).join('')}\n\
\`\`\`\n`;
    case 'horizontalRule':
      return '---';
    case 'image':
      return `![${node.attrs?.alt || ''}](${node.attrs?.src || ''})`;
    default:
      return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = body || {};
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    const md = serializeNode(json).trim() + '\n';
    return new NextResponse(md, {
      status: 200,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to export markdown' }, { status: 500 });
  }
}


