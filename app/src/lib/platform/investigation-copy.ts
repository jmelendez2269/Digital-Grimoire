import { CORE_STUDY_TOOL_COUNT } from "@/lib/platform/catalog";

const COUNT_WORDS: readonly string[] = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** English word for small study-tool counts used in marketing copy (e.g. "Six ways"). */
export function studyToolCountAsWord(count: number = CORE_STUDY_TOOL_COUNT): string {
  if (Number.isInteger(count) && count >= 0 && count < COUNT_WORDS.length) {
    return capitalizeWord(COUNT_WORDS[count]);
  }
  return count.toLocaleString("en-US");
}

export function formatInvestigationWaysHeading(
  toolCount: number = CORE_STUDY_TOOL_COUNT,
): string {
  return `${studyToolCountAsWord(toolCount)} ways to investigate`;
}
