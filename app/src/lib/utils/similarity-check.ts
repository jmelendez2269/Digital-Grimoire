/**
 * Utility functions for detecting duplicate or similar documents
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SimilarDocument {
  id: string;
  title: string;
  author?: string;
  year?: number;
  standardizedId?: string;
  similarityScore: number;
  matchReason: string;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  if (normalized1 === normalized2) return 1.0;

  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - distance / maxLen;
}

/**
 * Normalize a string for comparison (remove special chars, normalize spaces)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if two strings are similar enough (fuzzy match)
 */
function isSimilarString(str1: string, str2: string, threshold: number = 0.85): boolean {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  // Exact match after normalization
  if (normalized1 === normalized2) return true;

  // Check if one contains the other (for partial matches)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const shorter = Math.min(normalized1.length, normalized2.length);
    const longer = Math.max(normalized1.length, normalized2.length);
    if (shorter / longer >= 0.8) return true; // 80% overlap
  }

  // Use Levenshtein distance
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

/**
 * Find similar documents in the database
 */
export async function findSimilarDocuments(
  supabase: SupabaseClient,
  title: string,
  author?: string,
  year?: number,
  standardizedId?: string,
  content?: string
): Promise<SimilarDocument[]> {
  const similarDocs: SimilarDocument[] = [];

  try {
    // 1. Check for exact standardizedId match (highest priority)
    if (standardizedId) {
      const { data: exactIdMatch } = await supabase
        .from('texts')
        .select('id, title, author, year, metadata')
        .eq('metadata->>standardizedId', standardizedId)
        .limit(5);

      if (exactIdMatch && exactIdMatch.length > 0) {
        for (const doc of exactIdMatch) {
          similarDocs.push({
            id: doc.id,
            title: doc.title,
            author: doc.author,
            year: doc.year,
            standardizedId: doc.metadata?.standardizedId,
            similarityScore: 1.0,
            matchReason: 'Exact standardized ID match',
          });
        }
      }
    }

    // 2. Check for similar titles (fuzzy match)
    const { data: allTexts } = await supabase
      .from('texts')
      .select('id, title, author, year, metadata')
      .limit(1000); // Limit to prevent performance issues

    if (allTexts) {
      for (const doc of allTexts) {
        // Skip if already found by standardizedId
        if (similarDocs.some((s) => s.id === doc.id)) continue;

        let score = 0;
        let reason = '';

        // Title similarity
        const titleSimilarity = calculateSimilarity(
          normalizeString(title),
          normalizeString(doc.title)
        );

        if (titleSimilarity >= 0.85) {
          score = titleSimilarity;
          reason = `Similar title (${Math.round(titleSimilarity * 100)}% match)`;

          // Boost score if author also matches
          if (author && doc.author) {
            const authorSimilarity = calculateSimilarity(
              normalizeString(author),
              normalizeString(doc.author)
            );
            if (authorSimilarity >= 0.8) {
              score = Math.min(1.0, score + 0.1);
              reason += `, same author`;
            }
          }

          // Boost score if year matches
          if (year && doc.year && Math.abs(year - doc.year) <= 2) {
            score = Math.min(1.0, score + 0.05);
            reason += `, similar year`;
          }

          similarDocs.push({
            id: doc.id,
            title: doc.title,
            author: doc.author,
            year: doc.year,
            standardizedId: doc.metadata?.standardizedId,
            similarityScore: score,
            matchReason: reason,
          });
        }
        // Check for author + title combination match
        else if (author && doc.author && title && doc.title) {
          const authorMatch = isSimilarString(author, doc.author, 0.8);
          const titleMatch = isSimilarString(title, doc.title, 0.7);

          if (authorMatch && titleMatch) {
            const combinedScore =
              (calculateSimilarity(normalizeString(author), normalizeString(doc.author)) +
                calculateSimilarity(normalizeString(title), normalizeString(doc.title))) /
              2;

            if (combinedScore >= 0.75) {
              similarDocs.push({
                id: doc.id,
                title: doc.title,
                author: doc.author,
                year: doc.year,
                standardizedId: doc.metadata?.standardizedId,
                similarityScore: combinedScore,
                matchReason: `Similar author and title (${Math.round(combinedScore * 100)}% match)`,
              });
            }
          }
        }
      }
    }

    // Sort by similarity score (highest first) and return top matches
    return similarDocs
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5); // Return top 5 matches
  } catch (error) {
    console.error('Error finding similar documents:', error);
    return [];
  }
}

/**
 * Check if a document should trigger a duplicate warning
 */
export function shouldWarnAboutDuplicate(similarDocs: SimilarDocument[]): boolean {
  if (similarDocs.length === 0) return false;

  // Warn if there's an exact match (score >= 0.95) or multiple high-confidence matches
  const highConfidenceMatches = similarDocs.filter((doc) => doc.similarityScore >= 0.85);
  return highConfidenceMatches.length > 0;
}

