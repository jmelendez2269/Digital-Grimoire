/**
 * Smart text chunking for embedding generation
 * Splits text on paragraph boundaries with overlap for context continuity
 */

export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  startChar?: number;
  endChar?: number;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 * For more accuracy, we'd use tiktoken, but this is sufficient for chunking
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks with smart paragraph boundaries
 * Maintains overlap between chunks for context continuity
 * 
 * @param content - Full text content to chunk
 * @param maxTokens - Maximum tokens per chunk (default 2000, leaving room for overlap)
 * @param overlapTokens - Number of tokens to overlap between chunks (default 200)
 * @returns Array of text chunks with indices
 */
export function chunkText(
  content: string,
  maxTokens: number = 2000,
  overlapTokens: number = 200
): TextChunk[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  if (paragraphs.length === 0) {
    // Fallback: split by sentences if no paragraphs
    const sentences = content.split(/([.!?]\s+)/);
    return chunkBySentences(sentences, maxTokens, overlapTokens);
  }

  let currentChunk = '';
  let currentTokens = 0;
  let chunkIndex = 0;
  let startChar = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    const paraTokens = estimateTokens(paragraph);

    // If single paragraph exceeds maxTokens, split it further
    if (paraTokens > maxTokens) {
      // Save current chunk if it has content
      if (currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          chunkIndex: chunkIndex++,
          tokenCount: currentTokens,
          startChar,
          endChar: startChar + currentChunk.length,
        });
      }

      // Split large paragraph by sentences
      const subChunks = splitLargeParagraph(paragraph, maxTokens, overlapTokens);
      for (const subChunk of subChunks) {
        chunks.push({
          content: subChunk,
          chunkIndex: chunkIndex++,
          tokenCount: estimateTokens(subChunk),
          startChar,
          endChar: startChar + subChunk.length,
        });
        startChar += subChunk.length;
      }
      
      currentChunk = '';
      currentTokens = 0;
      continue;
    }

    // Check if adding this paragraph would exceed maxTokens
    if (currentTokens + paraTokens > maxTokens && currentChunk.trim().length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        tokenCount: currentTokens,
        startChar,
        endChar: startChar + currentChunk.length,
      });

      // Start new chunk with overlap from previous chunk
      const overlapText = getOverlapText(currentChunk, overlapTokens);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentTokens = estimateTokens(currentChunk);
      startChar = startChar + currentChunk.length - paragraph.length - overlapText.length;
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n';
      }
      currentChunk += paragraph;
      currentTokens += paraTokens;
    }
  }

  // Add final chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex: chunkIndex++,
      tokenCount: currentTokens,
      startChar,
      endChar: startChar + currentChunk.length,
    });
  }

  return chunks;
}

/**
 * Split a large paragraph that exceeds maxTokens into smaller chunks
 */
function splitLargeParagraph(
  paragraph: string,
  maxTokens: number,
  overlapTokens: number
): string[] {
  const sentences = paragraph.split(/([.!?]\s+)/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (estimateTokens(currentChunk + sentence) > maxTokens && currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
      const overlap = getOverlapText(currentChunk, overlapTokens);
      currentChunk = overlap + ' ' + sentence;
    } else {
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extract overlap text from the end of a chunk
 */
function getOverlapText(text: string, overlapTokens: number): string {
  const targetChars = overlapTokens * 4; // Rough token to char conversion
  if (text.length <= targetChars) {
    return text;
  }

  // Try to break at sentence boundary
  const overlapStart = Math.max(0, text.length - targetChars);
  const beforeOverlap = text.substring(0, overlapStart);
  const lastSentenceEnd = Math.max(
    beforeOverlap.lastIndexOf('.'),
    Math.max(
      beforeOverlap.lastIndexOf('!'),
      beforeOverlap.lastIndexOf('?')
    )
  );

  if (lastSentenceEnd > 0) {
    return text.substring(lastSentenceEnd + 1).trim();
  }

  // Fallback: just take last N characters
  return text.substring(text.length - targetChars).trim();
}

/**
 * Fallback chunking by sentences when no paragraph structure exists
 */
function chunkBySentences(
  sentences: string[],
  maxTokens: number,
  overlapTokens: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (estimateTokens(currentChunk + sentence) > maxTokens && currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        tokenCount: estimateTokens(currentChunk),
      });
      
      const overlap = getOverlapText(currentChunk, overlapTokens);
      currentChunk = overlap + ' ' + sentence;
    } else {
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex: chunkIndex++,
      tokenCount: estimateTokens(currentChunk),
    });
  }

  return chunks;
}

