import type { ConceptSearchLibraryResult } from "./types";

export type RetrievedPassage = {
  text_id: string;
  content: string;
  chunk_id?: string;
  text_title?: string;
  text_author?: string;
};
export function trustedLibraryResults(
  passages: RetrievedPassage[]
): ConceptSearchLibraryResult[] {
  const grouped = new Map<string, ConceptSearchLibraryResult>();
  for (const passage of passages) {
    const excerpt = {
      text: passage.content
        .replace(/^\.\.\.|\.\.\.$/g, "")
        .trim()
        .slice(0, 1200),
      page_number: null,
      ...(passage.chunk_id ? { chunk_id: passage.chunk_id } : {}),
    };
    const existing = grouped.get(passage.text_id);
    if (existing) {
      if (
        existing.excerpts.length < 3 &&
        !existing.excerpts.some((e) => e.text === excerpt.text)
      )
        grouped.set(passage.text_id, {
          ...existing,
          excerpts: [...existing.excerpts, excerpt],
        });
    } else
      grouped.set(passage.text_id, {
        book_id: passage.text_id,
        title: passage.text_title || "Unknown Title",
        author: passage.text_author || "Unknown Author",
        relevanceSentence:
          "This passage was retrieved from the library for your query.",
        excerpts: [excerpt],
      });
  }
  return [...grouped.values()];
}
