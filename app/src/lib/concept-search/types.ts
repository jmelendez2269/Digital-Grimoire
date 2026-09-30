export interface ConceptSearchExcerpt {
  text: string;
  page_number: number | null;
  chunk_id?: string;
}

export interface ConceptSearchLibraryResult {
  book_id: string;
  title: string;
  author: string;
  relevanceSentence: string;
  relevanceLabel?: string;
  excerpts: readonly ConceptSearchExcerpt[];
}

export interface ConceptSearchRecommendation {
  title: string;
  author: string;
  reason: string;
}

export interface ConceptSearchResult {
  summary: string;
  libraryResults: readonly ConceptSearchLibraryResult[];
  externalRecommendations: readonly ConceptSearchRecommendation[];
}
