export const CORE_STUDY_TOOLS = [
  "Library",
  "Seven Lenses",
  "Concept Search",
  "Knowledge Graph",
  "Study Journal",
] as const;

export const CORE_STUDY_TOOL_COUNT = CORE_STUDY_TOOLS.length;

export interface PlatformTotals {
  tools: number;
  books: number | null;
  courses: number | null;
}

export const EMPTY_PLATFORM_TOTALS: PlatformTotals = {
  tools: CORE_STUDY_TOOL_COUNT,
  books: null,
  courses: null,
};

