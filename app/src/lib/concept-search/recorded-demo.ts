import type { ConceptSearchResult } from "@/lib/concept-search/types";

export interface RecordedConceptSearchDemo {
  query: string;
  capturedAt: string;
  results: ConceptSearchResult;
}

/**
 * Editorially selected from the shared Concept Search cache on 2026-08-10.
 * Public demo playback imports this recording directly and never contacts the
 * Concept Search, autocomplete, database, or model-provider endpoints.
 */
export const RECORDED_CONCEPT_SEARCH_DEMO = {
  query: "belief",
  capturedAt: "2026-08-10T13:59:54.252782+00:00",
  results: {
    summary:
      "Belief sits at the crossroads of epistemology, psychology, and metaphysics: it is the mental act of holding a proposition to be true, distinct from knowledge (which typically requires belief plus justification plus truth) and distinct from mere assertion. Philosophers have long debated the sources of belief—whether it arises purely from sensory experience (empiricism) or is partly structured by innate, a priori principles that experience merely triggers rather than proves (rationalism). Bertrand Russell's careful dissection of logical principles shows that even our most basic beliefs rest on self-evident axioms we cannot derive from sense-data alone, yet which we cannot help but accept as soon as we contemplate them clearly.\n\nBeyond the logical scaffolding of belief, there is the psychological and moral dimension: why do people believe what they believe, and what do their beliefs serve? Nietzsche approaches belief genealogically, treating systems of morality, religion, and articles of belief as costumes worn by a civilization in crisis. For Nietzsche, belief is never neutral; it is entangled with power, vanity, self-contempt, and the psychological needs of the believer.\n\nTaken together, these two lenses reveal belief as a phenomenon that is simultaneously logical and existential. Russell asks what must be true for any belief to be justified at all. Nietzsche asks what psychological and cultural forces produce the beliefs we mistake for eternal truths. A full theory of belief must hold both questions in view.",
    libraryResults: [
      {
        title: "The Problems of Philosophy",
        author: "Bertrand Russell",
        book_id: "01c7a32b-f820-48a5-8ea7-c3066c490075",
        excerpts: [
          {
            text: "Our belief that the Emperor of China exists, for example, rests upon testimony, and testimony consists, in the last analysis, of sense-data seen or heard in reading or being spoken to.",
            page_number: 1,
          },
          {
            text: "Whenever one thing which we believe is used to prove something else, which we consequently believe, this principle is relevant.",
            page_number: 1,
          },
        ],
        relevanceLabel: "Foundational Text",
        relevanceSentence:
          "Russell examines the structure of belief, distinguishing beliefs grounded in direct experience from those that rest on testimony and inference. His analysis offers a rigorous framework for asking when belief is justified rather than merely habitual.",
      },
      {
        title: "Beyond Good and Evil",
        author: "Friedrich Nietzsche",
        book_id: "0858faec-d3af-45fd-a7b1-7c81685af59e",
        excerpts: [
          {
            text: "we are the first studious age in puncto of 'costumes,' I mean as concerns morals, articles of belief, artistic tastes, and religions.",
            page_number: 1,
          },
          {
            text: "None of the costumes fit him properly—he changes and changes.",
            page_number: 1,
          },
        ],
        relevanceLabel: "Psychological Perspective",
        relevanceSentence:
          "Nietzsche treats belief not as a neutral epistemic state but as a historically conditioned costume. This reframes belief as an expression of psychological need, vanity, and power rather than pure rational assent.",
      },
    ],
    externalRecommendations: [
      {
        title: "The Varieties of Religious Experience",
        author: "William James",
        reason:
          "A pragmatic and psychological account of how personal experience and emotion shape religious conviction.",
      },
      {
        title: "Belief: A Theory of Impulsion",
        author: "H. H. Price",
        reason:
          "A focused analytic treatment of belief, assertion, disposition, and degrees of confidence.",
      },
      {
        title: "Thinking, Fast and Slow",
        author: "Daniel Kahneman",
        reason:
          "A cognitive-science perspective on the heuristics and biases behind how people form and retain beliefs.",
      },
    ],
  },
} satisfies RecordedConceptSearchDemo;
