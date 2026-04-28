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

export type GraphType = 'parallax' | 'correspondences';

export interface ParallaxConcept {
  id: string;
  slug: string;
  name: string;
  tradition: string | null;
  tradition_ref?: {
    id: string;
    slug: string;
    label: string;
    color?: string;
    icon?: string;
  };
  era?: string;
  short_definition?: string;
  primary_sources?: string[];
  tags?: string[];
  created_at?: string;
}

export interface CorrespondenceEntity {
  id: string;
  slug?: string;
  name: string;
  category: string | null;
  type?: {
    id: string;
    slug: string;
    label: string;
    color?: string;
    icon?: string;
  };
  aliases?: string[];
  description?: string;
  lenses?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Relationship {
  id: string;
  source: string; // or object depending on d3 usage
  target: string;
  type: string;
  strength?: number;
}

export interface ParallaxRelationship {
  id: string;
  source_id: string;
  target_id: string;
  similarity: number;
  source_citation?: string;
  notes?: string;
  // visualization props
  source?: any;
  target?: any;
}
