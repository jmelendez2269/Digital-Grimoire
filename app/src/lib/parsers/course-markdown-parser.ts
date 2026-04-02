/**
 * Course Markdown Parser
 *
 * Parses the Digital Grimoire course markdown format into structured data
 * suitable for storage in the Supabase `courses` table `content` JSONB field.
 *
 * Pure function — no I/O, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReadingTier {
  reference: string;
  description: string;
}

export interface CourseReading {
  sort_order: number;
  title: string;
  author?: string;
  section?: string;
  selection_rationale: string;
  tiers: {
    keystone: ReadingTier;
    passage: ReadingTier;
    full: ReadingTier;
  };
}

export interface LensExercise {
  prompt: string;
  instructions: string[];
}

export interface SynthesisPrompt {
  prompt: string;
  expansion: string[];
}

export interface MicroArtifact {
  name: string;
  description: string;
  purpose: string;
  capstone_connection: string;
}

export interface CapstoneArtifact {
  name: string;
  description: string;
  components: string[];
  purpose: string;
}

export interface CourseWeek {
  week_number: number;
  title: string;
  week_type: 'standard' | 'capstone';
  core_question: string;
  key_tension: string;
  lens_focus: string[];
  readings: CourseReading[];
  lens_exercise?: LensExercise;
  synthesis_prompt?: SynthesisPrompt;
  micro_artifact?: MicroArtifact;
  capstone_artifact?: CapstoneArtifact;
  final_reflection?: string;
}

export interface KeyTension {
  label: string;
  description: string;
}

export interface CompletionPathway {
  code: string;
  title: string;
  description?: string;
}

export interface CourseContent {
  arc: string;
  arc_position: number;
  core_question: string;
  course_id_tag: string;
  orientation?: string;
  mode?: string;
  tone_safety?: string;
  key_tensions: KeyTension[];
  completion_pathways: CompletionPathway[];
  weeks: CourseWeek[];
}

export interface ParsedCourse {
  title: string;
  slug: string;
  premise: string;
  description: string;
  learning_outcomes: string[];
  course_type: 'foundational' | 'theme' | 'rotation';
  level: 'foundational' | 'intermediate' | 'advanced';
  duration_weeks: number;
  content: CourseContent;
}

export type ParseResult =
  | { success: true; course: ParsedCourse; warnings: string[] }
  | { success: false; error: string; warnings: string[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripBold(text: string): string {
  return text.replace(/\*\*/g, '').trim();
}

/** Normalize various dash types to a plain hyphen for splitting */
function normalizeDashes(text: string): string {
  return text.replace(/[—–]/g, '-');
}

function mapLevel(levelStr: string): 'foundational' | 'intermediate' | 'advanced' {
  const lower = levelStr.toLowerCase();
  if (lower.includes('advanced')) return 'advanced';
  if (lower.includes('intermediate')) return 'intermediate';
  return 'foundational';
}

function mapCourseType(arc: string): 'foundational' | 'theme' | 'rotation' {
  const lower = arc.toLowerCase();
  if (lower.includes('theme')) return 'theme';
  if (lower.includes('rotation')) return 'rotation';
  return 'foundational';
}

/** Strip markdown italics markers */
function stripItalics(text: string): string {
  return text.replace(/\*/g, '').trim();
}

/**
 * Split the markdown document into named H2 sections.
 * Returns a map of { sectionHeading: sectionBody }.
 */
function splitIntoSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};

  // Split on H2 headings (## at start of line)
  const parts = markdown.split(/^## /m);

  for (const part of parts) {
    if (!part.trim()) continue;
    const newlineIdx = part.indexOf('\n');
    if (newlineIdx === -1) continue;
    const heading = part.substring(0, newlineIdx).trim();
    const body = part.substring(newlineIdx + 1);
    sections[heading] = body;
  }

  return sections;
}

/**
 * Parse a markdown pipe table into an array of objects.
 * Assumes first row is header row.
 */
function parsePipeTable(text: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const lines = text.split('\n');
  let headers: string[] = [];
  let pastSeparator = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;

    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map(c => stripBold(c.trim()));

    // Skip separator rows (|---|---|)
    if (cells.every(c => /^[-:\s]+$/.test(c))) {
      pastSeparator = true;
      continue;
    }

    if (headers.length === 0) {
      headers = cells;
      continue;
    }

    if (!pastSeparator) continue;

    const row: Record<string, string> = {};
    cells.forEach((cell, i) => {
      if (headers[i]) row[headers[i].toLowerCase()] = cell;
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse metadata table — the COURSE METADATA section uses | Field | Value | format
 */
function parseMetadataTable(section: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /^\|\s*\*?\*?([^|]+?)\*?\*?\s*\|\s*([^|]+?)\s*\|/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(section)) !== null) {
    const key = match[1].replace(/\*\*/g, '').trim().toLowerCase().replace(/\s+/g, '_');
    const value = match[2].replace(/\*\*/g, '').trim();
    if (key && key !== 'field' && !key.startsWith('-')) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Extract text content immediately following a given H3 heading,
 * stopping before the next H3 or H2 heading.
 */
function extractAfterH3(sectionBody: string, heading: string): string {
  // Match ### heading then capture until next ### or end
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `###\\s+${escapedHeading}[^\\n]*\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`,
    'i'
  );
  const match = sectionBody.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Parse learning outcomes — numbered list items
 */
function parseLearningOutcomes(section: string): string[] {
  const outcomes: string[] = [];
  const lines = section.split('\n');
  for (const line of lines) {
    const match = line.match(/^\d+\.\s+(.+)$/);
    if (match) {
      outcomes.push(stripBold(match[1].trim()));
    }
  }
  return outcomes;
}

/**
 * Parse key tensions — "N. **A** vs **B** – description"
 */
function parseKeyTensions(section: string): KeyTension[] {
  const tensions: KeyTension[] = [];
  const regex = /^\d+\.\s+\*\*(.+?)\*\*\s+vs\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(section)) !== null) {
    tensions.push({
      label: `${match[1].trim()} vs ${match[2].trim()}`,
      description: match[3].trim(),
    });
  }

  return tensions;
}

/**
 * Parse completion pathways — "- **CODE** – title and description"
 */
function parseCompletionPathways(section: string): CompletionPathway[] {
  const pathways: CompletionPathway[] = [];
  const regex = /^[-•]\s+\*\*(\w+)\*\*\s*[—–-]\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(section)) !== null) {
    const code = match[1].trim();
    const rest = match[2].trim();
    // Try to split into title (Alchemy: Inner...) and description (applies...)
    const parenMatch = rest.match(/^(.+?)\s*\((.+)\)$/);
    if (parenMatch) {
      pathways.push({ code, title: parenMatch[1].trim(), description: parenMatch[2].trim() });
    } else {
      pathways.push({ code, title: rest });
    }
  }

  return pathways;
}

/**
 * Parse lens focus line — "Philosophical · Symbolic/Occult · Psychological"
 */
function parseLensFocus(text: string): string[] {
  return text
    .split(/[·•,]/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Parse a tier table within a reading block.
 * Returns { keystone, passage, full } or nulls if not found.
 */
function parseTierTable(block: string): {
  keystone: ReadingTier;
  passage: ReadingTier;
  full: ReadingTier;
} {
  const defaultTier: ReadingTier = { reference: '', description: '' };
  const tiers: { keystone: ReadingTier; passage: ReadingTier; full: ReadingTier } = {
    keystone: { ...defaultTier },
    passage: { ...defaultTier },
    full: { ...defaultTier },
  };

  // Each row: | **The Keystone** | reference | description |
  const regex = /^\|\s*\*?\*?The\s+(Keystone|Passage|Full\s+Text)\*?\*?\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gim;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(block)) !== null) {
    const tierName = match[1].trim().toLowerCase().replace(/\s+/g, '_');
    const reference = match[2].trim();
    const description = match[3].trim();

    if (tierName === 'keystone') tiers.keystone = { reference, description };
    else if (tierName === 'passage') tiers.passage = { reference, description };
    else if (tierName === 'full_text') tiers.full = { reference, description };
  }

  return tiers;
}

/**
 * Extract selection rationale from a reading block.
 * Looks for "*Selection rationale:*" paragraph.
 */
function parseSelectionRationale(block: string): string {
  const match = block.match(/\*Selection rationale:\*\s*([\s\S]+?)(?=\n\n|\n\*\*\d+\.|$)/);
  if (match) return match[1].replace(/\n/g, ' ').trim();
  return '';
}

/**
 * Parse a reading title block like "**1. The Kybalion – Chapter 2 (Carl Jung)**"
 * Returns { sort_order, title, author, section }
 */
function parseReadingTitle(headerLine: string): {
  sort_order: number;
  title: string;
  author?: string;
  section?: string;
} {
  // Remove bold markers and trim
  const clean = stripBold(headerLine).trim();

  // Match: "N. Title – Section (Author)" or "N. Title – Author, Section" etc.
  const numMatch = clean.match(/^(\d+)\.\s+(.+)$/);
  if (!numMatch) return { sort_order: 0, title: stripItalics(clean) };

  const sortOrder = parseInt(numMatch[1]);
  let rest = numMatch[2].trim();

  // Try to extract content in parentheses at the very end
  let extra: string | undefined;
  const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    rest = parenMatch[1].trim();
    extra = parenMatch[2].trim();
  }

  // Handle various dash types: em-dash (—), en-dash (–), and plain hyphen (-)
  const dashParts = rest.split(/\s*[—–-]\s*/);
  let partA = stripItalics(dashParts[0] || '').trim();
  let partB = stripItalics(dashParts[1] || '').trim();

  let title = partA;
  let author: string | undefined;
  let section: string | undefined;

  if (dashParts.length > 1) {
    // Heuristic: If partA is very short (likely author) or partB contains keywords (likely title/section)
    const partBIsSection = /book|chapter|part|verse|section|tractate|\d/i.test(partB);
    const partAIsKnownAuthor = /plato|lao tzu|marcus aurelius|descartes|bacon|rumi|eckhart/i.test(partA);

    if (partAIsKnownAuthor && !partBIsSection) {
        author = partA;
        title = partB;
    } else if (partBIsSection) {
        title = partA;
        section = partB;
    } else {
        // Default to Title — Author
        title = partA;
        author = partB;
    }
  }

  // If we found something in parentheses, decide if it's author or section
  if (extra) {
    if (!author && extra.length < 30) {
      author = extra;
    } else if (!section) {
      section = extra;
    }
  }

  return { sort_order: sortOrder, title, author, section };
}

/**
 * Parse the Readings section of a week.
 */
function parseReadings(readingsSection: string): CourseReading[] {
  if (!readingsSection.trim()) return [];

  const readings: CourseReading[] = [];

  // Split on **N. at the start of a line (reading number markers)
  // We look for lines starting with **1., **2., **3., etc.
  const blocks = readingsSection.split(/(?=^\*\*\d+\.\s)/m);

  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Find the header line (first line starting with **)
    const headerMatch = trimmedBlock.match(/^(\*\*\d+\..+?\*\*)/m);
    if (!headerMatch) continue;

    const headerLine = headerMatch[1];
    const { sort_order, title, author, section } = parseReadingTitle(headerLine);
    if (!title || sort_order === 0) continue;

    const tiers = parseTierTable(trimmedBlock);
    const selection_rationale = parseSelectionRationale(trimmedBlock);

    const reading: CourseReading = {
      sort_order,
      title,
      selection_rationale,
      tiers,
    };

    if (author) reading.author = author;
    if (section) reading.section = section;

    readings.push(reading);
  }

  return readings.sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Parse a Lens Exercise or Synthesis Prompt block.
 */
function parseLensExercise(text: string): LensExercise | undefined {
  const promptMatch = text.match(/\*\*Prompt:\*\*\s*([\s\S]+?)(?=\n\n|\*\*Instructions|\*\*Expansion|$)/);
  if (!promptMatch) return undefined;

  const prompt = promptMatch[1].replace(/\n/g, ' ').trim();
  const instructions: string[] = [];

  const instructionsMatch = text.match(/\*\*Instructions:\*\*\s*([\s\S]+?)(?=\n\n\*\*|\n###|$)/);
  if (instructionsMatch) {
    const lines = instructionsMatch[1].split('\n');
    for (const line of lines) {
      const m = line.match(/^\d+\.\s+(.+)$/);
      if (m) instructions.push(m[1].trim());
    }
  }

  return { prompt, instructions };
}

function parseSynthesisPrompt(text: string): SynthesisPrompt | undefined {
  const promptMatch = text.match(/\*\*Prompt:\*\*\s*([\s\S]+?)(?=\n\n|\*\*Expansion|$)/);
  if (!promptMatch) return undefined;

  const prompt = promptMatch[1].replace(/\n/g, ' ').trim();
  const expansion: string[] = [];

  const expansionMatch = text.match(/\*\*Expansion:\*\*\s*([\s\S]+?)(?=\n\n\*\*|\n###|$)/);
  if (expansionMatch) {
    const lines = expansionMatch[1].split('\n');
    for (const line of lines) {
      const m = line.match(/^[-•]\s+(.+)$/);
      if (m) expansion.push(m[1].trim());
    }
  }

  return { prompt, expansion };
}

/**
 * Parse a Convergence Micro-Artifact table.
 */
function parseMicroArtifact(text: string): MicroArtifact | undefined {
  const rows = parsePipeTable(text);
  if (rows.length === 0) {
    // Try direct regex for key fields
    const nameMatch = text.match(/\*\*Name\*\*\s*\|\s*(.+)/);
    const descMatch = text.match(/\*\*Description\*\*\s*\|\s*(.+)/);
    const purposeMatch = text.match(/\*\*Purpose\*\*\s*\|\s*(.+)/);
    const capstoneMatch = text.match(/\*\*Capstone Connection\*\*\s*\|\s*(.+)/);

    if (!nameMatch) return undefined;

    return {
      name: stripBold(nameMatch[1].trim()),
      description: descMatch ? stripBold(descMatch[1].trim()) : '',
      purpose: purposeMatch ? stripBold(purposeMatch[1].trim()) : '',
      capstone_connection: capstoneMatch ? stripBold(capstoneMatch[1].trim()) : '',
    };
  }

  // The artifact table format is | Field | Content |
  // rows are individual field rows
  const fieldMap: Record<string, string> = {};
  for (const row of rows) {
    // Try 'field' key directly
    const fieldKey = Object.keys(row).find(k => k === 'field' || k === '**field**');
    const contentKey = Object.keys(row).find(k => k === 'content' || k === '**content**');
    if (fieldKey && contentKey) {
      fieldMap[row[fieldKey].toLowerCase()] = row[contentKey];
    }
  }

  if (Object.keys(fieldMap).length === 0) {
    // Try treating rows as field→content pairs by key inspection
    for (const row of rows) {
      const keys = Object.keys(row);
      if (keys.length >= 1) {
        fieldMap[keys[0]] = row[keys[0]];
      }
    }
  }

  const name = fieldMap['name'] || fieldMap['**name**'] || '';
  if (!name) return undefined;

  return {
    name,
    description: fieldMap['description'] || fieldMap['**description**'] || '',
    purpose: fieldMap['purpose'] || fieldMap['**purpose**'] || '',
    capstone_connection:
      fieldMap['capstone connection'] ||
      fieldMap['**capstone connection**'] ||
      fieldMap['capstone_connection'] ||
      '',
  };
}

/**
 * Parse a single week section body (everything after the ## WEEK N – Title line).
 */
function parseWeek(weekNumber: number, weekTitle: string, weekBody: string): CourseWeek {
  const isCapstone =
    /capstone|integration|building your/i.test(weekTitle);

  // Extract H3 subsections
  const coreQuestionText = extractAfterH3(weekBody, 'Core Question');
  const keyTensionText = extractAfterH3(weekBody, 'Key Tension');
  const lensFocusText = extractAfterH3(weekBody, 'Lens Focus');
  const readingsText = extractAfterH3(weekBody, 'Readings (Selections)');
  const lensExerciseText = extractAfterH3(weekBody, 'Lens Exercise');
  const synthesisText = extractAfterH3(weekBody, 'Synthesis Prompt');
  const artifactText = extractAfterH3(weekBody, 'Convergence Micro-Artifact');

  // Core question: first non-empty line of the section
  const core_question = coreQuestionText.split('\n').find(l => l.trim())?.trim() || '';

  // Key tension: extract the bold pattern "**A** vs **B** – description"
  let key_tension = '';
  const ktMatch = keyTensionText.match(/\*\*(.+?)\*\*\s+vs\s+\*\*(.+?)\*\*/);
  if (ktMatch) {
    key_tension = `${ktMatch[1].trim()} vs ${ktMatch[2].trim()}`;
  } else {
    key_tension = keyTensionText.split('\n').find(l => l.trim())?.trim() || '';
  }

  const lens_focus = parseLensFocus(lensFocusText.split('\n').find(l => l.trim()) || '');
  const readings = parseReadings(readingsText);
  const lens_exercise = parseLensExercise(lensExerciseText) || undefined;
  const synthesis_prompt = parseSynthesisPrompt(synthesisText) || undefined;
  const micro_artifact = parseMicroArtifact(artifactText) || undefined;

  const week: CourseWeek = {
    week_number: weekNumber,
    title: weekTitle,
    week_type: isCapstone ? 'capstone' : 'standard',
    core_question,
    key_tension,
    lens_focus,
    readings,
  };

  if (lens_exercise) week.lens_exercise = lens_exercise;
  if (synthesis_prompt) week.synthesis_prompt = synthesis_prompt;
  if (micro_artifact) week.micro_artifact = micro_artifact;

  // Capstone: look for "Final Reflection" and "Capstone Artifact"
  if (isCapstone) {
    const reflectionText = extractAfterH3(weekBody, 'Final Reflection');
    if (reflectionText) week.final_reflection = reflectionText.trim();
  }

  return week;
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

/**
 * Parse a course markdown document into structured data.
 */
export function parseCourseMarkdown(markdown: string): ParseResult {
  const warnings: string[] = [];

  try {
    // ── Step 1: Split into sections ────────────────────────────────────────
    const sections = splitIntoSections(markdown);

    // ── Step 2: Extract the course title from # heading ────────────────────
    const titleMatch = markdown.match(/^#\s+Course\s+(\w+)\s*[—–-]\s*(.+)$/m);
    if (!titleMatch) {
      return { success: false, error: 'Could not find course title (expected: # Course CXX – Title)', warnings };
    }
    const courseIdTag = titleMatch[1].trim();
    const courseTitle = titleMatch[2].trim();

    // ── Step 3: Parse metadata table ───────────────────────────────────────
    const metadataSection = sections['COURSE METADATA'] || '';
    const metadata = parseMetadataTable(metadataSection);

    if (!metadata.arc) {
      warnings.push('No Arc field found in metadata — defaulting to "Foundational Synthesis"');
      metadata.arc = 'Foundational Synthesis';
    }

    const arc = metadata.arc || 'Foundational Synthesis';
    const arcPosition = parseInt(metadata.arc_position || '1') || 1;
    const durationWeeks = parseInt((metadata.length || '8').match(/\d+/)?.[0] || '8');
    const levelStr = metadata.level || 'foundational';
    const level = mapLevel(levelStr);
    const courseType = mapCourseType(arc);
    const coreQuestion = metadata.core_question || '';
    const orientation = metadata.orientation;
    const mode = metadata.mode;

    // ── Step 4: Premise ────────────────────────────────────────────────────
    const premiseSection = sections['COURSE PREMISE'] || '';
    const premise = premiseSection.trim();
    if (!premise) warnings.push('No COURSE PREMISE section found');

    // ── Step 5: Learning outcomes ──────────────────────────────────────────
    const outcomesSection = sections['LEARNING OUTCOMES'] || '';
    const learning_outcomes = parseLearningOutcomes(outcomesSection);
    if (learning_outcomes.length === 0) warnings.push('No learning outcomes found');

    // ── Step 6: Key tensions ───────────────────────────────────────────────
    const tensionsSection = sections['KEY TENSIONS (Course Spine)'] ||
      sections['KEY TENSIONS'] ||
      Object.entries(sections).find(([k]) => k.startsWith('KEY TENSIONS'))?.[1] || '';
    const key_tensions = parseKeyTensions(tensionsSection);
    if (key_tensions.length === 0) warnings.push('No key tensions found');

    // ── Step 7: Completion pathways ────────────────────────────────────────
    const pathwaysSection = sections['COMPLETION PATHWAYS'] ||
      Object.entries(sections).find(([k]) => k.startsWith('COMPLETION PATHWAYS'))?.[1] || '';
    const completion_pathways = parseCompletionPathways(pathwaysSection);
    if (completion_pathways.length === 0) warnings.push('No completion pathways found');

    // ── Step 8: Tone/safety note ───────────────────────────────────────────
    const toneSafetySection = sections['TONE & SAFETY NOTE'] ||
      Object.entries(sections).find(([k]) => k.includes('TONE'))?.[1];
    const tone_safety = toneSafetySection?.trim();

    // ── Step 9: Parse weekly sections ─────────────────────────────────────
    const weeks: CourseWeek[] = [];

    for (const [heading, body] of Object.entries(sections)) {
      // Match "WEEK N – Title" or "WEEK N — Title"
      const weekMatch = heading.match(/^WEEK\s+(\d+)\s*[—–-]\s*(.+)$/i);
      if (!weekMatch) continue;

      const weekNumber = parseInt(weekMatch[1]);
      const weekTitle = weekMatch[2].trim();

      const week = parseWeek(weekNumber, weekTitle, body);
      weeks.push(week);

      if (week.readings.length === 0 && week.week_type !== 'capstone') {
        warnings.push(`Week ${weekNumber} ("${weekTitle}") has no readings parsed`);
      }
    }

    if (weeks.length === 0) {
      return { success: false, error: 'No weekly sections found (expected: ## WEEK N – Title)', warnings };
    }

    // Sort weeks by week number
    weeks.sort((a, b) => a.week_number - b.week_number);

    // ── Step 10: Build the course content JSONB ────────────────────────────
    const content: CourseContent = {
      arc,
      arc_position: arcPosition,
      core_question: coreQuestion,
      course_id_tag: courseIdTag,
      key_tensions,
      completion_pathways,
      weeks,
    };

    if (orientation) content.orientation = orientation;
    if (mode) content.mode = mode;
    if (tone_safety) content.tone_safety = tone_safety;

    // ── Step 11: Generate slug ─────────────────────────────────────────────
    const slug = `${courseIdTag.toLowerCase()}-${slugify(courseTitle)}`;

    // ── Step 12: Build description (summary of premise) ────────────────────
    // Use first 2 sentences of premise as description
    const sentences = premise.match(/[^.!?]*[.!?]+/g) || [];
    const description = sentences.slice(0, 2).join(' ').trim() || premise.substring(0, 280);

    const course: ParsedCourse = {
      title: courseTitle,
      slug,
      premise,
      description,
      learning_outcomes,
      course_type: courseType,
      level,
      duration_weeks: durationWeeks,
      content,
    };

    return { success: true, course, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Parser threw an exception: ${message}`, warnings };
  }
}
