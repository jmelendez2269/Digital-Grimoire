/**
 * Course Markdown Serializer
 *
 * Inverse of parseCourseMarkdown. Takes a course row from the `courses` table
 * and produces markdown that re-parses faithfully via parseCourseMarkdown.
 *
 * Pure function — no I/O.
 */

interface SerializableReadingTier {
  reference?: string | null;
  description?: string | null;
}

interface SerializableReading {
  sort_order?: number;
  title?: string;
  author?: string | null;
  section?: string | null;
  selection_rationale?: string;
  tiers?: {
    keystone?: SerializableReadingTier;
    passage?: SerializableReadingTier;
    full?: SerializableReadingTier;
  };
}

interface SerializableLensExercise {
  prompt?: string;
  instructions?: string[];
}

interface SerializableFeatureExercise {
  feature?: 'deep_search' | 'lens_engine' | 'knowledge_graph';
  prompt?: string;
  instructions?: string[];
  documentation?: string;
}

interface SerializableSynthesisPrompt {
  prompt?: string;
  expansion?: string[];
}

interface SerializableMicroArtifact {
  name?: string;
  description?: string;
  purpose?: string;
  capstone_connection?: string;
}

interface SerializableCapstoneArtifact {
  name?: string;
  description?: string;
  components?: string[];
  purpose?: string;
}

interface SerializableWeek {
  week_number?: number;
  title?: string;
  week_type?: 'standard' | 'capstone';
  core_question?: string;
  key_tension?: string;
  lens_focus?: string[];
  readings?: SerializableReading[];
  lens_exercise?: SerializableLensExercise;
  feature_exercises?: SerializableFeatureExercise[];
  synthesis_prompt?: SerializableSynthesisPrompt;
  micro_artifact?: SerializableMicroArtifact;
  capstone_artifact?: SerializableCapstoneArtifact;
  final_reflection?: string;
}

interface SerializableContent {
  arc?: string;
  arc_position?: number;
  core_question?: string;
  course_id_tag?: string;
  orientation?: string;
  mode?: string;
  curator_note_public?: string;
  curator_note?: string;
  tone_safety?: string;
  // Phase 2: course family taxonomy
  course_family?: string;
  track_slug?: string;
  track_order?: number;
  recommended_level?: string;
  entry_point?: boolean;
  prerequisites?: string[];
  related_course_slugs?: string[];
  multi_family?: boolean;
  key_tensions?: Array<{ label?: string; description?: string }>;
  completion_pathways?: Array<{ code?: string; title?: string; description?: string }>;
  weeks?: SerializableWeek[];
}

export interface SerializableCourse {
  title?: string | null;
  premise?: string | null;
  learning_outcomes?: string[] | null;
  duration_weeks?: number | null;
  level?: string | null;
  content?: SerializableContent | null;
}

const FEATURE_HEADINGS: Record<NonNullable<SerializableFeatureExercise['feature']>, string> = {
  deep_search: 'Deep Search Practice',
  lens_engine: 'Lens Engine Analysis',
  knowledge_graph: 'Graph Exploration',
};

function trimOrEmpty(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function joinLines(parts: string[]): string {
  return parts.filter((part) => part !== null && part !== undefined).join('\n');
}

function formatList(values: string[]): string {
  return values.map((v) => v.trim()).filter(Boolean).join(', ');
}

function serializeMetadata(course: SerializableCourse): string {
  const content = course.content ?? {};
  const rows: Array<[string, string]> = [];
  if (content.course_id_tag) rows.push(['course_id', content.course_id_tag]);
  if (course.title) rows.push(['title', course.title]);
  if (content.core_question) rows.push(['core_question', content.core_question]);
  if (content.arc) rows.push(['arc', content.arc]);
  if (typeof content.arc_position === 'number') rows.push(['arc_position', String(content.arc_position)]);
  if (typeof course.duration_weeks === 'number') rows.push(['length_weeks', String(course.duration_weeks)]);
  if (course.level) rows.push(['level', course.level]);
  if (content.orientation) rows.push(['orientation', content.orientation]);
  if (content.mode) rows.push(['mode', content.mode]);

  // Phase 2: course family taxonomy
  if (content.course_family) rows.push(['course_family', content.course_family]);
  if (content.track_slug) rows.push(['track_slug', content.track_slug]);
  if (typeof content.track_order === 'number') rows.push(['track_order', String(content.track_order)]);
  if (content.recommended_level) rows.push(['recommended_level', content.recommended_level]);
  if (typeof content.entry_point === 'boolean') rows.push(['entry_point', String(content.entry_point)]);
  if (content.prerequisites && content.prerequisites.length > 0) {
    rows.push(['prerequisites', formatList(content.prerequisites)]);
  }
  if (content.related_course_slugs && content.related_course_slugs.length > 0) {
    rows.push(['related_course_slugs', formatList(content.related_course_slugs)]);
  }
  if (typeof content.multi_family === 'boolean') rows.push(['multi_family', String(content.multi_family)]);

  if (rows.length === 0) return '';

  const header = '| Field | Value |\n|-------|-------|';
  const body = rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  return `${header}\n${body}`;
}

function serializeLearningOutcomes(outcomes: string[] | null | undefined): string {
  if (!outcomes || outcomes.length === 0) return '';
  return outcomes.map((o, i) => `${i + 1}. ${o.trim()}`).join('\n');
}

function serializeKeyTensions(tensions: SerializableContent['key_tensions']): string {
  if (!tensions || tensions.length === 0) return '';
  return tensions
    .map((t, i) => {
      const label = trimOrEmpty(t.label);
      const description = trimOrEmpty(t.description);
      const parts = label.split(/\s+vs\s+/i);
      const a = (parts[0] || label).trim();
      const b = (parts[1] || '').trim();
      const left = b ? `**${a}** vs **${b}**` : `**${a}**`;
      return description ? `${i + 1}. ${left} — ${description}` : `${i + 1}. ${left}`;
    })
    .join('\n');
}

function serializeCompletionPathways(pathways: SerializableContent['completion_pathways']): string {
  if (!pathways || pathways.length === 0) return '';
  return pathways
    .map((p) => {
      const code = trimOrEmpty(p.code);
      const title = trimOrEmpty(p.title);
      const description = trimOrEmpty(p.description);
      const tail = description ? `${title} (${description})` : title;
      return `- **${code}** — ${tail}`;
    })
    .join('\n');
}

function serializeReadingTitle(reading: SerializableReading): string {
  const order = typeof reading.sort_order === 'number' ? reading.sort_order : 1;
  const title = trimOrEmpty(reading.title);
  const author = trimOrEmpty(reading.author);
  const section = trimOrEmpty(reading.section);

  let line = `${order}. ${title}`;
  if (author) line = `${order}. ${title} - ${author}`;
  let header = `**${line}**`;
  if (section) header = `${header} (${section})`;
  return header;
}

function serializeTierTable(tiers: SerializableReading['tiers']): string {
  const keystone = tiers?.keystone ?? {};
  const passage = tiers?.passage ?? {};
  const full = tiers?.full ?? {};

  const cell = (v: string | null | undefined) => trimOrEmpty(v).replace(/\|/g, '\\|') || '—';

  return joinLines([
    '|  | Reference | Description |',
    '|---|---|---|',
    `| **The Keystone** | ${cell(keystone.reference)} | ${cell(keystone.description)} |`,
    `| **The Passage** | ${cell(passage.reference)} | ${cell(passage.description)} |`,
    `| **The Full Text** | ${cell(full.reference)} | ${cell(full.description)} |`,
  ]);
}

function serializeReadings(readings: SerializableReading[] | undefined): string {
  if (!readings || readings.length === 0) return '';
  const ordered = [...readings].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const blocks = ordered.map((reading) => {
    const parts: string[] = [serializeReadingTitle(reading), '', serializeTierTable(reading.tiers)];
    const rationale = trimOrEmpty(reading.selection_rationale);
    if (rationale) {
      parts.push('');
      parts.push(`*Selection rationale:* ${rationale}`);
    }
    return joinLines(parts);
  });
  return blocks.join('\n\n');
}

function serializeLensExercise(exercise: SerializableLensExercise | undefined): string {
  if (!exercise) return '';
  const prompt = trimOrEmpty(exercise.prompt);
  const instructions = exercise.instructions ?? [];
  const parts: string[] = [];
  if (prompt) parts.push(`**Prompt:** ${prompt}`);
  if (instructions.length > 0) {
    parts.push('');
    parts.push('**Instructions:**');
    instructions.forEach((step, i) => parts.push(`${i + 1}. ${step.trim()}`));
  }
  return joinLines(parts);
}

function serializeFeatureExercise(exercise: SerializableFeatureExercise | undefined): string {
  if (!exercise) return '';
  const prompt = trimOrEmpty(exercise.prompt);
  const instructions = exercise.instructions ?? [];
  const documentation = trimOrEmpty(exercise.documentation);

  const parts: string[] = [];
  if (prompt) parts.push(`**Prompt:** ${prompt}`);
  if (instructions.length > 0) {
    parts.push('');
    parts.push('**What to do:**');
    instructions.forEach((step, i) => parts.push(`${i + 1}. ${step.trim()}`));
  }
  if (documentation) {
    parts.push('');
    parts.push(`**What to document:** ${documentation}`);
  }
  return joinLines(parts);
}

function serializeSynthesisPrompt(prompt: SerializableSynthesisPrompt | undefined): string {
  if (!prompt) return '';
  const text = trimOrEmpty(prompt.prompt);
  const expansion = prompt.expansion ?? [];
  const parts: string[] = [];
  if (text) parts.push(`**Prompt:** ${text}`);
  if (expansion.length > 0) {
    parts.push('');
    parts.push('**Expansion:**');
    expansion.forEach((item) => parts.push(`- ${item.trim()}`));
  }
  return joinLines(parts);
}

function serializeMicroArtifact(artifact: SerializableMicroArtifact | undefined): string {
  if (!artifact) return '';
  const cell = (v: string | null | undefined) => trimOrEmpty(v).replace(/\|/g, '\\|') || '—';
  return joinLines([
    '| Field | Content |',
    '|-------|---------|',
    `| Name | ${cell(artifact.name)} |`,
    `| Description | ${cell(artifact.description)} |`,
    `| Purpose | ${cell(artifact.purpose)} |`,
    `| Capstone Connection | ${cell(artifact.capstone_connection)} |`,
  ]);
}

function serializeWeek(week: SerializableWeek): string {
  const number = week.week_number ?? 1;
  const title = trimOrEmpty(week.title) || `Week ${number}`;
  const parts: string[] = [`## WEEK ${number} — ${title}`];

  const push = (heading: string, body: string) => {
    if (!body.trim()) return;
    parts.push('');
    parts.push(`### ${heading}`);
    parts.push(body);
  };

  push('Core Question', trimOrEmpty(week.core_question));

  const tension = trimOrEmpty(week.key_tension);
  if (tension) {
    const split = tension.split(/\s+vs\s+/i);
    const body =
      split.length === 2 ? `**${split[0].trim()}** vs **${split[1].trim()}**` : tension;
    push('Key Tension', body);
  }

  if (week.lens_focus && week.lens_focus.length > 0) {
    push('Lens Focus', week.lens_focus.map((l) => l.trim()).filter(Boolean).join(' · '));
  }

  push('Readings (Selections)', serializeReadings(week.readings));
  push('Lens Exercise', serializeLensExercise(week.lens_exercise));

  const featureMap = new Map<SerializableFeatureExercise['feature'], SerializableFeatureExercise>();
  for (const ex of week.feature_exercises ?? []) {
    if (ex.feature) featureMap.set(ex.feature, ex);
  }
  for (const feature of ['deep_search', 'lens_engine', 'knowledge_graph'] as const) {
    const ex = featureMap.get(feature);
    if (ex) push(FEATURE_HEADINGS[feature], serializeFeatureExercise(ex));
  }

  push('Synthesis Prompt', serializeSynthesisPrompt(week.synthesis_prompt));
  push('Convergence Micro-Artifact', serializeMicroArtifact(week.micro_artifact));

  if (week.week_type === 'capstone') {
    push('Final Reflection', trimOrEmpty(week.final_reflection));
  }

  return parts.join('\n');
}

export function serializeCourseToMarkdown(course: SerializableCourse): string {
  const content = course.content ?? {};
  const courseIdTag = trimOrEmpty(content.course_id_tag) || 'C00';
  const title = trimOrEmpty(course.title) || 'Untitled';

  const sections: string[] = [];
  sections.push(`# Course ${courseIdTag} — ${title}`);

  const metadata = serializeMetadata(course);
  if (metadata) {
    sections.push('');
    sections.push('## COURSE METADATA');
    sections.push('');
    sections.push(metadata);
  }

  const premise = trimOrEmpty(course.premise);
  if (premise) {
    sections.push('');
    sections.push('## COURSE PREMISE');
    sections.push('');
    sections.push(premise);
  }

  const curatorNote =
    trimOrEmpty(content.curator_note_public) || trimOrEmpty(content.curator_note);
  if (curatorNote) {
    sections.push('');
    sections.push("## CURATOR'S NOTE");
    sections.push('');
    sections.push(curatorNote);
  }

  const outcomes = serializeLearningOutcomes(course.learning_outcomes);
  if (outcomes) {
    sections.push('');
    sections.push('## LEARNING OUTCOMES');
    sections.push('');
    sections.push(outcomes);
  }

  const tensions = serializeKeyTensions(content.key_tensions);
  if (tensions) {
    sections.push('');
    sections.push('## KEY TENSIONS (Course Spine)');
    sections.push('');
    sections.push(tensions);
  }

  const pathways = serializeCompletionPathways(content.completion_pathways);
  if (pathways) {
    sections.push('');
    sections.push('## COMPLETION PATHWAYS');
    sections.push('');
    sections.push(pathways);
  }

  const toneSafety = trimOrEmpty(content.tone_safety);
  if (toneSafety) {
    sections.push('');
    sections.push('## TONE & SAFETY NOTE');
    sections.push('');
    sections.push(toneSafety);
  }

  const weeks = (content.weeks ?? []).slice().sort(
    (a, b) => (a.week_number ?? 0) - (b.week_number ?? 0)
  );
  for (const week of weeks) {
    sections.push('');
    sections.push(serializeWeek(week));
  }

  return sections.join('\n') + '\n';
}
