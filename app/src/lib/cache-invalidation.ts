/**
 * Cache Invalidation Utilities
 * 
 * Centralized functions for invalidating React Query caches after data mutations.
 * Use these functions whenever data is created, updated, or deleted to ensure
 * the UI reflects the latest data.
 * 
 * @see docs/Setup Docs/CACHING_STRATEGY.md for caching strategy details
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate all text-related caches
 * Use after creating, updating, or deleting a text document
 * 
 * @param queryClient - React Query client instance
 * @param textId - Optional specific text ID to invalidate
 */
export function invalidateTextCaches(queryClient: QueryClient, textId?: string) {
  // Invalidate library listings (all pages, filters, sorts)
  queryClient.invalidateQueries({ queryKey: ['library', 'texts'] });
  
  // Invalidate filter options (domains, types, tags, lenses may have changed)
  queryClient.invalidateQueries({ queryKey: ['library', 'filterOptions'] });
  
  // Invalidate specific text if ID provided
  if (textId) {
    queryClient.invalidateQueries({ queryKey: ['text', textId] });
    queryClient.invalidateQueries({ queryKey: ['texts', textId] });
  }
}

/**
 * Invalidate concept-related caches
 * Use after creating, updating, or deleting convergence concepts
 * 
 * @param queryClient - React Query client instance
 */
export function invalidateConceptCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['concepts'] });
  queryClient.invalidateQueries({ queryKey: ['convergence', 'concepts'] });
}

/**
 * Invalidate knowledge graph caches
 * Use after creating, updating, or deleting correspondences or relationships
 * 
 * @param queryClient - React Query client instance
 */
export function invalidateGraphCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['graph', 'entities'] });
  queryClient.invalidateQueries({ queryKey: ['graph', 'edges'] });
  queryClient.invalidateQueries({ queryKey: ['correspondences'] });
}

/**
 * Invalidate annotation-related caches
 * Use after creating, updating, or deleting annotations
 * 
 * @param queryClient - React Query client instance
 * @param textId - Optional text ID to invalidate annotations for specific text
 */
export function invalidateAnnotationCaches(queryClient: QueryClient, textId?: string) {
  queryClient.invalidateQueries({ queryKey: ['annotations'] });
  
  if (textId) {
    queryClient.invalidateQueries({ queryKey: ['annotations', textId] });
  }
}

/**
 * Invalidate journal-related caches
 * Use after creating, updating, or deleting journal pages
 * 
 * @param queryClient - React Query client instance
 * @param pageId - Optional page ID to invalidate specific page
 */
export function invalidateJournalCaches(queryClient: QueryClient, pageId?: string) {
  queryClient.invalidateQueries({ queryKey: ['journal'] });
  queryClient.invalidateQueries({ queryKey: ['journal', 'pages'] });
  
  if (pageId) {
    queryClient.invalidateQueries({ queryKey: ['journal', 'page', pageId] });
  }
}

/**
 * Invalidate collection-related caches
 * Use after creating, updating, or deleting collections
 * 
 * @param queryClient - React Query client instance
 * @param collectionId - Optional collection ID to invalidate specific collection
 */
export function invalidateCollectionCaches(queryClient: QueryClient, collectionId?: string) {
  queryClient.invalidateQueries({ queryKey: ['collections'] });
  
  if (collectionId) {
    queryClient.invalidateQueries({ queryKey: ['collections', collectionId] });
  }
}

/**
 * Invalidate all public data caches
 * Use after admin updates that affect public content
 * 
 * @param queryClient - React Query client instance
 */
export function invalidatePublicCaches(queryClient: QueryClient) {
  invalidateTextCaches(queryClient);
  invalidateConceptCaches(queryClient);
  invalidateGraphCaches(queryClient);
}

