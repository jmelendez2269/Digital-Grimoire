/**
 * Course Markdown Parser
 *
 * Parses the Digital Grimoire course markdown format into structured data
 * suitable for storage in the Supabase `courses` table `content` JSONB field.
 *
 * Pure function - no I/O, no side effects.
 */

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

export interface FeatureExercise {
  feature: 'deep_search' | 'lens_engine' | 'knowledge_graph';
  prompt: string;
  instructions: string[];
  documentation: string;
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
  feature_exercises?: FeatureExercise[];
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

function stripItalics(text: string): string {
  return text.replace(/\*/g, '').trim();
}

function splitIntoSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};
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
      .map((cell) => stripBold(cell.trim()));

    if (cells.every((cell) => /^[-:\s]+$/.test(cell))) {
      pastSeparator = true;
      continue;
    }

    if (headers.length === 0) {
      headers = cells;
      continue;
    }

    if (!pastSeparator) continue;

    const row: Record<string, string> = {};
    cells.forEach((cell, index) => {
      if (headers[index]) row[headers[index].toLowerCase()] = cell;
    });
    rows.push(row);
  }

  return rows;
}

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

function extractCourseTitle(
  markdown: string,
  metadata: Record<string, string>
): { courseIdTag: string; courseTitle: string } | null {
  const firstHeading = markdown
    .split('\n')
    .find((line) => /^#\s+/.test(line))
    ?.replace(/^#\s+/, '')
    .trim();

  if (firstHeading) {
    const normalizedHeading = normalizeDashes(firstHeading);

    const primaryMatch = normalizedHeading.match(/^Course\s+([A-Za-z]\d+)\s*[-:]\s*(.+)$/i);
    if (primaryMatch) {
      return {
        courseIdTag: primaryMatch[1].trim().toUpperCase(),
        courseTitle: primaryMatch[2].trim(),
      };
    }

    const directMatch = normalizedHeading.match(/^([A-Za-z]\d+)\s*[-:]\s*(.+)$/);
    if (directMatch) {
      return {
        courseIdTag: directMatch[1].trim().toUpperCase(),
        courseTitle: directMatch[2].trim(),
      };
    }

    const fallbackMatch = normalizedHeading.match(/\b([A-Za-z]\d+)\b\s*[-:]\s*(.+)$/);
    if (fallbackMatch) {
      return {
        courseIdTag: fallbackMatch[1].trim().toUpperCase(),
        courseTitle: fallbackMatch[2].trim(),
      };
    }
  }

  const metadataCourseId = (metadata.course_id || metadata.course || metadata.course_code || '').trim();
  const metadataTitle = (metadata.title || '').trim();

  if (metadataCourseId && metadataTitle) {
    return {
      courseIdTag: metadataCourseId.toUpperCase(),
      courseTitle: metadataTitle,
    };
  }

  return null;
}

function getSection(sections: Record<string, string>, ...names: string[]): string {
  const normalizedNames = names.map((name) => name.trim().toLowerCase());

  for (const [heading, body] of Object.entries(sections)) {
    if (normalizedNames.includes(heading.trim().toLowerCase())) {
      return body;
    }
  }

  return '';
}

function extractAfterH3(sectionBody: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `###\\s+${escapedHeading}[^\\n]*\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`,
    'i'
  );
  const match = sectionBody.match(regex);
  return match ? match[1].trim() : '';
}

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

function parseCompletionPathways(section: string): CompletionPathway[] {
  const pathways: CompletionPathway[] = [];
  const regex = /^[-•]\s+\*\*(\w+)\*\*\s*[—–-]\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(section)) !== null) {
    const code = match[1].trim();
    const rest = match[2].trim();
    const parenMatch = rest.match(/^(.+?)\s*\((.+)\)$/);
    if (parenMatch) {
      pathways.push({ code, title: parenMatch[1].trim(), description: parenMatch[2].trim() });
    } else {
      pathways.push({ code, title: rest });
    }
  }

  return pathways;
}

function parseLensFocus(text: string): string[] {
  return text
    .split(/[·•,]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

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

function parseSelectionRationale(block: string): string {
  const match = block.match(/\*Selection rationale:\*\s*([\s\S]+?)(?=\n\n|\n\*\*\d+\.|$)/);
  if (match) return match[1].replace(/\n/g, ' ').trim();
  return '';
}

function parseReadingTitle(headerLine: string): {
  sort_order: number;
  title: string;
  author?: string;
  section?: string;
} {
  const clean = stripBold(headerLine).trim();
  const numMatch = clean.match(/^(\d+)\.\s+(.+)$/);
  if (!numMatch) return { sort_order: 0, title: stripItalics(clean) };

  const sortOrder = parseInt(numMatch[1], 10);
  let rest = numMatch[2].trim();

  let extra: string | undefined;
  const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    rest = parenMatch[1].trim();
    extra = parenMatch[2].trim();
  }

  rest = normalizeDashes(rest);
  const dashParts = rest.split(/\s*-\s*/);
  const partA = stripItalics(dashParts[0] || '').trim();
  const partB = stripItalics(dashParts[1] || '').trim();

  let title = partA;
  let author: string | undefined;
  let section: string | undefined;

  if (dashParts.length > 1) {
    const partBIsSection = /book|chapter|part|verse|section|tractate|\d/i.test(partB);
    const partAIsKnownAuthor = /plato|lao tzu|marcus aurelius|descartes|bacon|rumi|eckhart/i.test(partA);

    if (partAIsKnownAuthor && !partBIsSection) {
      author = partA;
      title = partB;
    } else if (partAIsKnownAuthor && partB.includes(',')) {
      const [titlePart, ...sectionParts] = partB.split(',');
      author = partA;
      title = titlePart.trim();
      const derivedSection = sectionParts.join(',').trim();
      if (derivedSection) section = derivedSection;
    } else if (partBIsSection) {
      title = partA;
      section = partB;
    } else {
      title = partA;
      author = partB;
    }
  }

  if (extra) {
    if (!author && extra.length < 30) {
      author = extra;
    } else if (!section) {
      section = extra;
    }
  }

  return { sort_order: sortOrder, title, author, section };
}

function parseReadings(readingsSection: string): CourseReading[] {
  if (!readingsSection.trim()) return [];

  const readings: CourseReading[] = [];
  const blocks = readingsSection.split(/(?=^\*\*\d+\.\s)/m);

  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

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

function parseLensExercise(text: string): LensExercise | undefined {
  const promptMatch = text.match(/\*\*Prompt:\*\*\s*([\s\S]+?)(?=\n\n|\*\*Instructions|\*\*Expansion|$)/);
  if (!promptMatch) return undefined;

  const prompt = promptMatch[1].replace(/\n/g, ' ').trim();
  const instructions: string[] = [];

  const instructionsMatch = text.match(/\*\*Instructions:\*\*\s*([\s\S]+?)(?=\n\n\*\*|\n###|$)/);
  if (instructionsMatch) {
    const lines = instructionsMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^\d+\.\s+(.+)$/);
      if (match) instructions.push(match[1].trim());
    }
  }

  return { prompt, instructions };
}

function parseFeatureExercise(
  text: string,
  feature: FeatureExercise['feature']
): FeatureExercise | undefined {
  if (!text.trim()) return undefined;

  const validFeatures: FeatureExercise['feature'][] = ['deep_search', 'lens_engine', 'knowledge_graph'];
  if (!validFeatures.includes(feature)) return undefined;

  const normalized = text.trim();

  const promptMatch = normalized.match(
    /^\s*\*\*[^*\n]+:\*\*\s*([\s\S]*?)(?=\n\s*\*\*[^*\n]+:\*\*|\n\s*\d+\.\s+|$)/i
  );
  const prompt = promptMatch ? promptMatch[1].replace(/\n/g, ' ').trim() : '';

  const instructions: string[] = [];
  const instructionsBlockMatch = normalized.match(
    /\*\*What to do:\*\*\s*([\s\S]*?)(?=\n\s*\*\*[^*\n]+:\*\*|$)/i
  );
  if (instructionsBlockMatch) {
    const lines = instructionsBlockMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*\d+\.\s+(.+)$/);
      if (match) instructions.push(match[1].trim());
    }
  }

  const documentationMatch = normalized.match(
    /\*\*What to document:\*\*\s*([\s\S]*?)(?=\n\s*\*\*[^*\n]+:\*\*|$)/i
  );
  const documentation = documentationMatch
    ? documentationMatch[1].replace(/\n/g, ' ').trim()
    : '';

  return {
    feature,
    prompt,
    instructions,
    documentation,
  };
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
      const match = line.match(/^[-•]\s+(.+)$/);
      if (match) expansion.push(match[1].trim());
    }
  }

  return { prompt, expansion };
}

function parseMicroArtifact(text: string): MicroArtifact | undefined {
  const rows = parsePipeTable(text);
  if (rows.length === 0) {
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

  const fieldMap: Record<string, string> = {};
  for (const row of rows) {
    const fieldKey = Object.keys(row).find((key) => key === 'field' || key === '**field**');
    const contentKey = Object.keys(row).find((key) => key === 'content' || key === '**content**');
    if (fieldKey && contentKey) {
      fieldMap[row[fieldKey].toLowerCase()] = row[contentKey];
    }
  }

  if (Object.keys(fieldMap).length === 0) {
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

function parseWeek(
  weekNumber: number,
  weekTitle: string,
  weekBody: string
): { week: CourseWeek; warnings: string[] } {
  const warnings: string[] = [];
  const isCapstone = /capstone|integration|building your/i.test(weekTitle);

  const coreQuestionText = extractAfterH3(weekBody, 'Core Question');
  const keyTensionText = extractAfterH3(weekBody, 'Key Tension');
  const lensFocusText = extractAfterH3(weekBody, 'Lens Focus');
  const readingsText = extractAfterH3(weekBody, 'Readings (Selections)');
  const lensExerciseText = extractAfterH3(weekBody, 'Lens Exercise');
  const deepSearchText = extractAfterH3(weekBody, 'Deep Search Practice');
  const lensEngineAnalysisText = extractAfterH3(weekBody, 'Lens Engine Analysis');
  const graphExplorationText = extractAfterH3(weekBody, 'Graph Exploration');
  const synthesisText = extractAfterH3(weekBody, 'Synthesis Prompt');
  const artifactText = extractAfterH3(weekBody, 'Convergence Micro-Artifact');

  const core_question = coreQuestionText.split('\n').find((line) => line.trim())?.trim() || '';

  let key_tension = '';
  const tensionMatch = keyTensionText.match(/\*\*(.+?)\*\*\s+vs\s+\*\*(.+?)\*\*/);
  if (tensionMatch) {
    key_tension = `${tensionMatch[1].trim()} vs ${tensionMatch[2].trim()}`;
  } else {
    key_tension = keyTensionText.split('\n').find((line) => line.trim())?.trim() || '';
  }

  const lens_focus = parseLensFocus(lensFocusText.split('\n').find((line) => line.trim()) || '');
  const readings = parseReadings(readingsText);
  const lens_exercise = parseLensExercise(lensExerciseText) || undefined;
  const feature_exercises = [
    parseFeatureExercise(deepSearchText, 'deep_search'),
    parseFeatureExercise(lensEngineAnalysisText, 'lens_engine'),
    parseFeatureExercise(graphExplorationText, 'knowledge_graph'),
  ].filter((exercise): exercise is FeatureExercise => Boolean(exercise));
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
  if (feature_exercises.length > 0) week.feature_exercises = feature_exercises;
  if (synthesis_prompt) week.synthesis_prompt = synthesis_prompt;
  if (micro_artifact) week.micro_artifact = micro_artifact;

  if (!isCapstone) {
    if (feature_exercises.length < 3) {
      warnings.push(`Week ${weekNumber} ("${weekTitle}") has fewer than 3 feature exercises`);
    }

    for (const exercise of feature_exercises) {
      if (!['deep_search', 'lens_engine', 'knowledge_graph'].includes(exercise.feature)) {
        warnings.push(`Week ${weekNumber} ("${weekTitle}") references an unrecognized feature type: ${exercise.feature}`);
      }
      if (!exercise.prompt || exercise.instructions.length === 0 || !exercise.documentation) {
        warnings.push(`Week ${weekNumber} ("${weekTitle}") has an incomplete feature exercise for ${exercise.feature}`);
      }
    }
  }

  if (isCapstone) {
    const reflectionText = extractAfterH3(weekBody, 'Final Reflection');
    if (reflectionText) week.final_reflection = reflectionText.trim();
  }

  return { week, warnings };
}

export function parseCourseMarkdown(markdown: string): ParseResult {
  const warnings: string[] = [];

  try {
    const sections = splitIntoSections(markdown);

    const titleMatch = markdown.match(/^#\s+Course\s+(\w+)\s*[—–-]\s*(.+)$/m);
    let courseIdTag = titleMatch?.[1]?.trim() || '';
    let courseTitle = titleMatch?.[2]?.trim() || '';
    if (!titleMatch) {
      const metadataFallback = extractCourseTitle(markdown, parseMetadataTable(getSection(sections, 'COURSE METADATA', 'Course Metadata')));
      if (!metadataFallback) {
        return {
          success: false,
          error: 'Could not find course title (expected something like: # Course CXX - Title, # Course CXX: Title, # CXX - Title, or metadata with course_id + title)',
          warnings
        };
      }
      courseIdTag = metadataFallback.courseIdTag;
      courseTitle = metadataFallback.courseTitle;
    }

    const metadataSection = getSection(sections, 'COURSE METADATA', 'Course Metadata');
    const metadata = parseMetadataTable(metadataSection);

    if (!metadata.arc) {
      warnings.push('No Arc field found in metadata - defaulting to "Foundational Synthesis"');
      metadata.arc = 'Foundational Synthesis';
    }

    const arc = metadata.arc || 'Foundational Synthesis';
    const arcPosition = parseInt(metadata.arc_position || '1', 10) || 1;
    const durationWeeks = parseInt((metadata.length || metadata.length_weeks || '8').match(/\d+/)?.[0] || '8', 10);
    const levelStr = metadata.level || 'foundational';
    const level = mapLevel(levelStr);
    const courseType = mapCourseType(arc);
    const coreQuestion = metadata.core_question || '';
    const orientation = metadata.orientation;
    const mode = metadata.mode;

    const premiseSection = getSection(sections, 'COURSE PREMISE', 'Course Premise');
    const premise = premiseSection.trim();
    if (!premise) warnings.push('No COURSE PREMISE section found');

    const outcomesSection = getSection(sections, 'LEARNING OUTCOMES', 'Learning Outcomes');
    const learning_outcomes = parseLearningOutcomes(outcomesSection);
    if (learning_outcomes.length === 0) warnings.push('No learning outcomes found');

    const tensionsSection =
      sections['KEY TENSIONS (Course Spine)'] ||
      sections['KEY TENSIONS'] ||
      Object.entries(sections).find(([key]) => key.startsWith('KEY TENSIONS'))?.[1] ||
      '';
    const key_tensions = parseKeyTensions(tensionsSection);
    if (key_tensions.length === 0) warnings.push('No key tensions found');

    const pathwaysSection =
      sections['COMPLETION PATHWAYS'] ||
      Object.entries(sections).find(([key]) => key.startsWith('COMPLETION PATHWAYS'))?.[1] ||
      '';
    const completion_pathways = parseCompletionPathways(pathwaysSection);
    if (completion_pathways.length === 0) warnings.push('No completion pathways found');

    const toneSafetySection =
      sections['TONE & SAFETY NOTE'] ||
      Object.entries(sections).find(([key]) => key.includes('TONE'))?.[1];
    const tone_safety = toneSafetySection?.trim();

    const weeks: CourseWeek[] = [];

    for (const [heading, body] of Object.entries(sections)) {
      const weekMatch = heading.match(/^WEEK\s+(\d+)\s*[—–-]\s*(.+)$/i);
      if (!weekMatch) continue;

      const weekNumber = parseInt(weekMatch[1], 10);
      const weekTitle = weekMatch[2].trim();

      const { week, warnings: weekWarnings } = parseWeek(weekNumber, weekTitle, body);
      weeks.push(week);
      warnings.push(...weekWarnings);

      if (week.readings.length === 0 && week.week_type !== 'capstone') {
        warnings.push(`Week ${weekNumber} ("${weekTitle}") has no readings parsed`);
      }
    }

    if (weeks.length === 0) {
      return { success: false, error: 'No weekly sections found (expected: ## WEEK N - Title)', warnings };
    }

    weeks.sort((a, b) => a.week_number - b.week_number);

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

    const slug = `${courseIdTag.toLowerCase()}-${slugify(courseTitle)}`;

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
