/**
 * Utility functions for rendering TipTap JSON content as HTML
 */

function escapeHtml(s: string): string {
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
        if (m.type === 'underline') text = `<u>${text}</u>`;
        if (m.type === 'strike') text = `<s>${text}</s>`;
        if (m.type === 'wikiLink') {
          const title = escapeHtml(m.attrs?.title || m.attrs?.slug || '');
          text = `<span data-wikilink title="${title}">[[${title}]]</span>`;
        }
      }
      return text;
    }
    case 'heading': {
      const level = Math.min(6, Math.max(1, node.attrs?.level || 1));
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
      const codeContent = (node.content || []).map(serializeNodeToHtml).join('');
      const language = node.attrs?.language ? ` class="language-${escapeHtml(node.attrs.language)}"` : '';
      return `<pre><code${language}>${codeContent}</code></pre>`;
    case 'horizontalRule':
      return '<hr />';
    case 'image':
      const src = node.attrs?.src || '';
      const alt = escapeHtml(node.attrs?.alt || '');
      const title = node.attrs?.title ? ` title="${escapeHtml(node.attrs.title)}"` : '';
      return `<img src="${src}" alt="${alt}"${title} />`;
    case 'hardBreak':
      return '<br />';
    default:
      // For unknown node types, try to render content if available
      if (node.content && Array.isArray(node.content)) {
        return (node.content || []).map(serializeNodeToHtml).join('');
      }
      return '';
  }
}

/**
 * Converts TipTap JSON content to HTML string
 * @param content - TipTap JSON content (as string or object)
 * @returns HTML string
 */
export function tiptapToHtml(content: string | object | null | undefined): string {
  if (!content) return '';
  
  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Validate it's a TipTap doc structure
    if (json && json.type === 'doc' && Array.isArray(json.content)) {
      return serializeNodeToHtml(json);
    }
    
    // If it's not a doc, try to wrap it
    if (json && typeof json === 'object') {
      return serializeNodeToHtml({ type: 'doc', content: [json] });
    }
    
    return '';
  } catch (error) {
    console.warn('Failed to parse TipTap content:', error);
    return '';
  }
}

/**
 * Extracts plain text from TipTap JSON content
 * @param content - TipTap JSON content (as string or object)
 * @returns Plain text string
 */
export function tiptapToText(content: string | object | null | undefined): string {
  if (!content) return '';
  
  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    
    function extractText(node: any): string {
      if (!node) return '';
      
      if (node.type === 'text') {
        return node.text || '';
      }
      
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('');
      }
      
      return '';
    }
    
    if (json && json.type === 'doc' && Array.isArray(json.content)) {
      return json.content.map(extractText).join(' ').trim();
    }
    
    return '';
  } catch (error) {
    console.warn('Failed to extract text from TipTap content:', error);
    return '';
  }
}
