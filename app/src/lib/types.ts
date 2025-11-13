/**
 * Shared type definitions for text selection positions
 * Used across PDF, HTML, and Chapter viewers
 */
export interface TextPosition {
  pageIndex?: number;
  chapterId?: string;
  rects?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber?: number;
  }>;
  [key: string]: unknown; // Allow additional properties for flexibility
}

