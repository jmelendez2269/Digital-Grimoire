'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, BookOpen, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { tiptapToText } from '@/lib/tiptap/render';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseContent {
  arc?: string;
  arc_position?: number;
  core_question?: string;
  course_id_tag?: string;
  curator_note_public?: string;
  curator_note?: string;
  key_tensions?: Array<{ label: string; description: string }>;
  completion_pathways?: Array<{ code: string; title: string }>;
  weeks?: unknown[];
}

interface Text {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
}

interface CourseText {
  id: string;
  text_id: string;
  is_required: boolean;
  texts: Text | null;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  premise: string | null;
  learning_outcomes: string[] | null;
  course_type: 'foundational' | 'theme' | 'rotation' | null;
  level: 'foundational' | 'intermediate' | 'advanced' | null;
  duration_weeks: number | null;
  content: CourseContent | null;
  is_published: boolean;
  created_at: string;
  course_texts?: CourseText[];
}

interface Enrollment {
  current_week: number;
  progress: Record<string, unknown>;
}

interface EnrolledCourse extends Course {
  enrollment: Enrollment;
}

type ViewMode = 'arcs' | 'paths' | 'map' | 'catalog';

// ─── Constants / helpers ──────────────────────────────────────────────────────

// Spectrum palette from colors_and_type.css, assigned by arc index.
const ARC_PALETTE = [
  '#20E0F5', // cyan
  '#FF8C2A', // amber
  '#2AFFA0', // emerald
  '#3A7FFF', // sapphire
  '#F5D020', // gold
  '#B03AFF', // violet
  '#FF3A5C', // ruby
  '#B48F4A', // brass
];

// 7 Spectrum lenses — mapped to design tokens, with heuristic keyword sets
// for deriving per-course lens tags from title/description/key-tension text.
const LENS_DEFS: Array<{ key: string; label: string; color: string; keywords: RegExp }> = [
  {
    key: 'scientific',
    label: 'Scientific',
    color: '#FF3A5C', // --spectrum-ruby
    keywords: /\b(science|scientif|empiric|physic|biolog|chemist|evidence|hypothesi|experiment|data|methodolog|cognit|neuro)/i,
  },
  {
    key: 'psychological',
    label: 'Psychological',
    color: '#FF8C2A', // --spectrum-amber
    keywords: /\b(psycholog|psyche|mind|conscious|unconscious|jung|dream|archetyp|ego|identity|trauma|emotion|attention)/i,
  },
  {
    key: 'philosophical',
    label: 'Philosophical',
    color: '#F5D020', // --spectrum-gold
    keywords: /\b(philosoph|epistemolog|ontolog|metaphys|ethic|virtue|reason|logic|dialect|plato|aristotle|kant|stoic)/i,
  },
  {
    key: 'religious',
    label: 'Religious / Spiritual',
    color: '#2AFFA0', // --spectrum-emerald
    keywords: /\b(religion|religious|spirit|sacred|divine|god|devot|mystic|prayer|soul|salvation|ritual|monastic|gnos)/i,
  },
  {
    key: 'historical',
    label: 'Historical',
    color: '#20E0F5', // --spectrum-cyan
    keywords: /\b(histor|tradition|transmiss|inherit|lineage|ancient|century|era|archive|colonial|antiquity)/i,
  },
  {
    key: 'symbolic',
    label: 'Symbolic / Occult',
    color: '#3A7FFF', // --spectrum-sapphire
    keywords: /\b(symbol|sign|hermetic|alchem|kabbal|qabal|occult|magic|esoter|tarot|sigil|correspond|myth)/i,
  },
  {
    key: 'mathematical',
    label: 'Mathematical',
    color: '#B03AFF', // --spectrum-violet
    keywords: /\b(math|geometr|number|proportion|pattern|ratio|symmetr|fractal|pythagor|formula|topolog)/i,
  },
];

function deriveLenses(course: Course): number[] {
  const parts: string[] = [
    course.title,
    course.description ?? '',
    course.premise ?? '',
    course.content?.core_question ?? '',
    ...(course.content?.key_tensions?.map((t) => `${t.label} ${t.description}`) ?? []),
    ...(course.learning_outcomes ?? []),
  ];
  const blob = parts.join(' ');
  return LENS_DEFS.map((def, i) => (def.keywords.test(blob) ? i : -1)).filter((i) => i >= 0);
}

// ─── Seed data for Paths + Map (until schema supports it) ────────────────────

interface SeedPathStep {
  code: string;       // course tag e.g. "GM·1"
  title: string;
  level: 'foundational' | 'intermediate' | 'advanced';
  weeks: number;
  why: string;        // prose linking previous → this
}

interface SeedPath {
  id: string;
  name: string;
  tag: string;
  color: string;      // accent
  subtitle: string;
  steps: SeedPathStep[];
}

const SEED_PATHS: SeedPath[] = [
  {
    id: 'hermetic',
    name: 'The Hermetic Arc',
    tag: 'Esoteric',
    color: '#B48F4A',
    subtitle: 'The classical Western esoteric lineage traced from alchemy through geometry to synthesis.',
    steps: [
      { code: 'C01', title: 'How Humans Know What They Know', level: 'foundational', weeks: 8, why: 'The grammar of knowing — what counts as valid knowledge in the first place.' },
      { code: 'C06', title: 'Alchemy: Inner, Outer, and Psychological', level: 'intermediate', weeks: 8, why: 'You arrive knowing what a legitimate knowledge claim looks like, and can evaluate alchemical claims precisely.' },
      { code: 'C07', title: 'The Qabalah and the Tree of Life', level: 'intermediate', weeks: 8, why: 'The Qabalah is the most systematic map in the same tradition; C06 gives you the substrate, C07 the architecture.' },
      { code: 'C13', title: 'Sacred Geometry and the Mathematical Cosmos', level: 'advanced', weeks: 8, why: 'The Sefirot carry numerical and geometric properties; the mathematical-cosmological thread of C07 is what C13 examines in full.' },
      { code: 'C15', title: 'Synthesis as a Practice', level: 'advanced', weeks: 8, why: 'Seven weeks with incompatible positions makes the demand for synthesis training exact and unavoidable.' },
      { code: 'C17', title: 'Reality Cracks and Liminal States', level: 'advanced', weeks: 8, why: 'The threshold material is the most demanding test of the synthesizer\'s discernment — seven traditions, one phenomenon, no resolution.' },
    ],
  },
  {
    id: 'mystical',
    name: 'The Mystical Traditions',
    tag: 'Mysticism',
    color: '#B03AFF',
    subtitle: 'Direct knowing across Christian, Eastern, Islamic, and women\'s mystical traditions — tracing what gnosis requires.',
    steps: [
      { code: 'C01', title: 'How Humans Know What They Know', level: 'foundational', weeks: 8, why: 'The grammar of knowing — what counts as valid knowledge.' },
      { code: 'C08', title: 'Gnosis vs. Belief', level: 'intermediate', weeks: 8, why: 'The gnosis/belief distinction is the first precise application of C01\'s instruments to a claim that resists verification.' },
      { code: 'C09', title: 'What the Self Obscures', level: 'intermediate', weeks: 8, why: 'C08 establishes the cross-traditional vocabulary; C09 asks what must dissolve for direct knowing to become possible.' },
      { code: 'C10', title: 'Islamic Thought', level: 'intermediate', weeks: 8, why: 'The Buddhist and Vedantic accounts meet their Islamic parallel — fana and baqa — with vocabulary already in place.' },
      { code: 'C11', title: 'The Women Mystics', level: 'intermediate', weeks: 8, why: 'Rabia bridges the Sufi tradition to women who made the same claim under different institutional constraints.' },
      { code: 'C15', title: 'Synthesis as a Practice', level: 'advanced', weeks: 8, why: 'The women mystics generate the most demanding synthesis demand — coded speech, suppression, and claimed direct knowledge.' },
    ],
  },
  {
    id: 'philosophical',
    name: 'The Philosophical Spine',
    tag: 'Philosophy',
    color: '#3A7FFF',
    subtitle: 'Epistemology into science into Western philosophy into ethics — the rigorous critical mind trained from first principles.',
    steps: [
      { code: 'C01', title: 'How Humans Know What They Know', level: 'foundational', weeks: 8, why: 'The grammar of knowing.' },
      { code: 'C04', title: 'What Science Can and Can\'t Say', level: 'intermediate', weeks: 8, why: 'C04 stress-tests the scientific lens — what it can establish, and the category errors when its claims overstep.' },
      { code: 'C05', title: 'Every Map Lies a Little', level: 'intermediate', weeks: 8, why: 'Every map distorts the territory — the epistemological consequence of C04 applied to representation itself.' },
      { code: 'C12', title: 'The Western Philosophical Inheritance', level: 'intermediate', weeks: 8, why: 'The Stoic tradition is the inheritance\'s most practically powerful and undervalued leg; C12 shows the context it was formed within.' },
      { code: 'C14', title: 'Ethics Without Absolutes', level: 'advanced', weeks: 8, why: 'Ethics Without Absolutes generates the synthesis demand; once you\'ve reasoned ethically without foundations, you need the methodology.' },
      { code: 'C15', title: 'Synthesis as a Practice', level: 'advanced', weeks: 8, why: 'Bergson and Whitehead\'s process critique is the most sophisticated internal account of how maps distort territory.' },
    ],
  },
  {
    id: 'symbolic',
    name: 'Myth, Symbol & the Modern World',
    tag: 'Symbolic',
    color: '#FF8C2A',
    subtitle: 'From symbol mechanics through correspondence — arriving at how the same structures appear in contemporary technology.',
    steps: [
      { code: 'C02', title: 'Why Stories Keep Working', level: 'foundational', weeks: 8, why: 'The mechanics of myth — why certain symbols survive, what psychotechnology does.' },
      { code: 'C03', title: 'Why Everything Seems Connected', level: 'foundational', weeks: 8, why: 'Symbols organise reality; C03 asks whether the connections they reveal are in the world or in the symbol-making mind.' },
      { code: 'C06', title: 'Alchemy: Inner, Outer, and Psychological', level: 'intermediate', weeks: 8, why: 'The correspondence principle C03 examined is the philosophical foundation of the Hermetic tradition; C06 gives you the full tradition.' },
      { code: 'C15', title: 'Synthesis as a Practice', level: 'advanced', weeks: 8, why: 'Lévi\'s reconstruction in C06 Week 6 is a case study in both responsible and irresponsible synthesis.' },
      { code: 'C18', title: 'Technology as Modern Myth', level: 'advanced', weeks: 8, why: 'Technology mythology applies exactly the multi-lens symbolic analysis C15 develops — C18 is C02\'s methods at advanced resolution.' },
    ],
  },
  {
    id: 'methodologist',
    name: 'The Methodologist',
    tag: 'Method',
    color: '#2AFFA0',
    subtitle: 'Method, discernment, reading, and application — the full analytical toolkit before engaging with contemporary concerns.',
    steps: [
      { code: 'C01', title: 'How Humans Know What They Know', level: 'foundational', weeks: 8, why: 'The grammar of knowing.' },
      { code: 'C05', title: 'Every Map Lies a Little', level: 'intermediate', weeks: 8, why: 'Every map distorts — the epistemological consequence applied to representation itself.' },
      { code: 'C12', title: 'The Western Philosophical Inheritance', level: 'intermediate', weeks: 8, why: 'The Western philosophical inheritance is the largest map in the curriculum; C05 equips you to read it as one.' },
      { code: 'C15', title: 'Synthesis as a Practice', level: 'advanced', weeks: 8, why: 'The Western tradition\'s fractures generate the synthesis demands C15 is designed to meet.' },
      { code: 'C16', title: "Reading the Colonizer's Record", level: 'advanced', weeks: 8, why: 'Where C15 develops responsible synthesis, C16 develops responsible reading — together they are a complete discernment practice.' },
      { code: 'C17', title: 'Reality Cracks and Liminal States', level: 'advanced', weeks: 8, why: 'The reading discipline equips you to engage with liminal traditions without collapsing their cosmologies.' },
    ],
  },
  {
    id: 'self',
    name: 'The Self and Its Dissolution',
    tag: 'Inner Work',
    color: '#FF3A5C',
    subtitle: "Eastern traditions on constructed selfhood, Islamic mysticism, women's threshold experience, liminality, and karma.",
    steps: [
      { code: 'C09', title: 'What the Self Obscures', level: 'intermediate', weeks: 8, why: "The Eastern traditions' most sustained argument that the working self was already not what it appeared." },
      { code: 'C10', title: 'Islamic Thought', level: 'intermediate', weeks: 8, why: 'The Buddhist and Vedantic accounts meet their Islamic parallel in fana and baqa — structurally similar claims in very different theological frames.' },
      { code: 'C11', title: 'The Women Mystics', level: 'intermediate', weeks: 8, why: "Rabia bridges to C11's women who made the divine-love claim from outside institutional authority." },
      { code: 'C17', title: 'Reality Cracks and Liminal States', level: 'advanced', weeks: 8, why: 'The threshold experiences the women mystics described are exactly what C17 maps across traditions; you arrive with the case studies in hand.' },
      { code: 'C19', title: 'Karma and the Long Arc', level: 'advanced', weeks: 8, why: 'Karma is one answer to what the return carries across — the long arc of consequence extends beyond any single life or framework.' },
    ],
  },
  {
    id: 'mathematical',
    name: 'The Pattern Traditions',
    tag: 'Mathematical',
    color: '#B48F4A',
    subtitle: 'From the drive to find connection, through Hermetic correspondence and Kabbalistic architecture, to the mathematical-cosmological claim.',
    steps: [
      { code: 'C03', title: 'Why Everything Seems Connected', level: 'foundational', weeks: 8, why: 'Is the human drive to find pattern a discovery or a symptom? The question the entire path holds open.' },
      { code: 'C06', title: 'Alchemy: Inner, Outer, and Psychological', level: 'intermediate', weeks: 8, why: 'The Hermetic tradition is built directly on the correspondence claim C03 examined.' },
      { code: 'C07', title: 'The Qabalah and the Tree of Life', level: 'intermediate', weeks: 8, why: "The Tree of Life is simultaneously philosophical, cosmological, and mathematical; C06's substrate makes it legible from the inside." },
      { code: 'C13', title: 'Sacred Geometry and the Mathematical Cosmos', level: 'advanced', weeks: 8, why: "The Sefirot's numerical and geometric properties find their hardest formulation in C13's discovery/projection question." },
    ],
  },
  {
    id: 'modern',
    name: 'Into the Present',
    tag: 'Arc 4',
    color: '#22D3EE',
    subtitle: 'The full toolkit turned on contemporary reality — technology mythology, long-arc consequence, and the question of what the universe is made of.',
    steps: [
      { code: 'C01', title: 'How Humans Know What They Know', level: 'foundational', weeks: 8, why: "Without C01's distinctions, contemporary discourse collapses into assertion vs. counter-assertion." },
      { code: 'C15', title: 'Synthesis as a Practice', level: 'advanced', weeks: 8, why: 'Synthesis as a Practice is the methodological bridge into Arc 4.' },
      { code: 'C17', title: 'Reality Cracks and Liminal States', level: 'advanced', weeks: 8, why: 'The threshold material generates the most demanding test of synthesis discernment.' },
      { code: 'C18', title: 'Technology as Modern Myth', level: 'advanced', weeks: 8, why: 'The initiatory grammar from C17 reappears in how technology structures its salvation and apocalypse narratives.' },
      { code: 'C19', title: 'Karma and the Long Arc', level: 'advanced', weeks: 8, why: 'The mythology of technology asks what a myth costs; karma asks what consequence looks like beyond a single product cycle.' },
      { code: 'C20', title: 'The Fabric of the Universe', level: 'advanced', weeks: 8, why: 'The long arc arrives at the substance question — what the universe is made of when all traditions reach the same edge.' },
    ],
  },
];

// Map seed data: 20 courses, 4 arc bands, edge list.
interface MapSeedNode {
  id: string;
  title: string;
  q: string;
  arc: 'FS' | 'TT' | 'PA' | 'CM';
  level: 'foundational' | 'intermediate' | 'advanced';
  weeks: number;
}

const MAP_NODES: MapSeedNode[] = [
  { id: 'C01', title: 'How Humans Know What They Know', q: 'What counts as truth — and who decides?', arc: 'FS', level: 'foundational', weeks: 8 },
  { id: 'C02', title: 'Why Stories Keep Working', q: 'Why do certain symbols refuse to die?', arc: 'FS', level: 'foundational', weeks: 8 },
  { id: 'C03', title: 'Why Everything Seems Connected', q: 'Is the drive to find connection a discovery — or a symptom?', arc: 'FS', level: 'foundational', weeks: 8 },
  { id: 'C04', title: "What Science Can and Can't Say", q: 'What can science settle — and what does it leave untouched?', arc: 'FS', level: 'intermediate', weeks: 8 },
  { id: 'C05', title: 'Every Map Lies a Little', q: 'If every map distorts the territory, what do we do with maps?', arc: 'FS', level: 'intermediate', weeks: 8 },
  { id: 'C06', title: 'Alchemy: Inner, Outer, Psychological', q: 'Can transformation be systematized?', arc: 'TT', level: 'intermediate', weeks: 8 },
  { id: 'C07', title: 'The Qabalah and the Tree of Life', q: 'What does a diagram do that a doctrine cannot?', arc: 'TT', level: 'intermediate', weeks: 8 },
  { id: 'C08', title: 'Gnosis vs. Belief', q: 'Is direct experience a kind of knowledge?', arc: 'TT', level: 'intermediate', weeks: 8 },
  { id: 'C09', title: 'What the Self Obscures', q: 'What do Eastern traditions know about the self?', arc: 'TT', level: 'intermediate', weeks: 8 },
  { id: 'C10', title: 'Islamic Thought', q: 'What does it mean to know God beyond categories?', arc: 'TT', level: 'intermediate', weeks: 8 },
  { id: 'C11', title: 'The Women Mystics', q: 'What happens when the gatekeepers are men?', arc: 'TT', level: 'intermediate', weeks: 8 },
  { id: 'C12', title: 'Western Philosophical Inheritance', q: 'What did Western philosophy inherit?', arc: 'TT', level: 'intermediate', weeks: 8 },
  { id: 'C13', title: 'Sacred Geometry & Mathematical Cosmos', q: 'Is mathematical pattern discovered — or projected?', arc: 'TT', level: 'advanced', weeks: 8 },
  { id: 'C14', title: 'Ethics Without Absolutes', q: 'How do you reason ethically when foundations collapse?', arc: 'PA', level: 'advanced', weeks: 8 },
  { id: 'C15', title: 'Synthesis as a Practice', q: 'What does integration look like as method?', arc: 'PA', level: 'advanced', weeks: 8 },
  { id: 'C16', title: "Reading the Colonizer's Record", q: 'How do you engage traditions preserved in misunderstanding?', arc: 'PA', level: 'advanced', weeks: 8 },
  { id: 'C17', title: 'Reality Cracks and Liminal States', q: 'What becomes visible at the edges of frameworks?', arc: 'CM', level: 'advanced', weeks: 8 },
  { id: 'C18', title: 'Technology as Modern Myth', q: 'What myths is technology asking us to live inside?', arc: 'CM', level: 'advanced', weeks: 8 },
  { id: 'C19', title: 'Karma and the Long Arc', q: 'What if every action ripples across generations?', arc: 'CM', level: 'advanced', weeks: 8 },
  { id: 'C20', title: 'The Fabric of the Universe', q: 'Physics, mysticism, and philosophy at the same edge.', arc: 'CM', level: 'advanced', weeks: 8 },
];

const MAP_EDGES: Array<[string, string]> = [
  ['C01','C02'],['C01','C04'],['C01','C06'],['C01','C08'],['C01','C12'],
  ['C02','C03'],['C02','C18'],
  ['C03','C06'],
  ['C04','C05'],['C04','C12'],
  ['C05','C12'],
  ['C06','C07'],['C06','C08'],['C06','C12'],['C06','C13'],['C06','C15'],
  ['C07','C08'],['C07','C09'],['C07','C12'],['C07','C13'],
  ['C08','C09'],['C08','C11'],
  ['C09','C10'],['C09','C11'],['C09','C12'],
  ['C10','C11'],['C10','C12'],
  ['C11','C15'],
  ['C12','C13'],['C12','C14'],
  ['C13','C14'],['C13','C15'],['C13','C17'],
  ['C14','C15'],
  ['C15','C16'],['C15','C17'],['C15','C18'],['C15','C19'],['C15','C20'],
  ['C16','C17'],
  ['C17','C18'],['C17','C19'],
  ['C18','C19'],['C18','C20'],
  ['C19','C20'],
];

const ARC_BAND_META: Record<MapSeedNode['arc'], { label: string; color: string; y: number }> = {
  FS: { label: 'Foundational Synthesis', color: '#22D3EE', y: 58 },
  TT: { label: 'Traditions Across Time', color: '#B48F4A', y: 200 },
  PA: { label: 'The Practical Arts',      color: '#2AFFA0', y: 350 },
  CM: { label: 'Convergence & Modern',    color: '#3A7FFF', y: 470 },
};

// Count how many seed paths a given course id appears in
function countPathsForCourse(id: string): number {
  return SEED_PATHS.filter((p) => p.steps.some((s) => s.code === id)).length;
}

function getCoreQuestion(course: Course, maxLength = 200): string | null {
  const direct = course.content?.core_question;
  if (direct) return direct.length > maxLength ? direct.slice(0, maxLength) + '…' : direct;
  return getTextExcerpt(course.description, maxLength) || getTextExcerpt(course.premise, maxLength);
}

function getTextExcerpt(text: string | null | undefined, maxLength = 120): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const extracted = tiptapToText(JSON.parse(trimmed));
      if (extracted) return extracted.length > maxLength ? extracted.slice(0, maxLength) + '…' : extracted;
    } catch { /* fall through */ }
  }
  const clean = trimmed.replace(/\s+/g, ' ');
  return clean.length > maxLength ? clean.slice(0, maxLength) + '…' : clean;
}

interface ArcBucket {
  key: string;
  name: string;
  color: string;
  courses: Course[];
  totalWeeks: number;
}

function buildArcs(courses: Course[]): ArcBucket[] {
  const map = new Map<string, Course[]>();
  for (const c of courses) {
    const key = (c.content?.arc?.trim() || 'Unsorted Paths');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return [...map.entries()].map(([name, list], i) => {
    const sorted = [...list].sort((a, b) => {
      const ap = a.content?.arc_position ?? 99;
      const bp = b.content?.arc_position ?? 99;
      if (ap !== bp) return ap - bp;
      return a.title.localeCompare(b.title);
    });
    const totalWeeks = sorted.reduce((s, c) => s + (c.duration_weeks ?? 0), 0);
    return {
      key: name,
      name,
      color: ARC_PALETTE[i % ARC_PALETTE.length],
      courses: sorted,
      totalWeeks,
    };
  });
}

function pickCurator(courses: Course[], enrollmentMap: Record<string, Enrollment>): Course | null {
  if (courses.length === 0) return null;
  // Prefer an in-progress enrolled course.
  const enrolled = courses.find((c) => enrollmentMap[c.id]);
  if (enrolled) return enrolled;
  // Else first foundational at arc_position 1.
  const opener = courses.find(
    (c) => (c.level === 'foundational' || c.course_type === 'foundational') && c.content?.arc_position === 1,
  );
  if (opener) return opener;
  // Else lowest arc_position overall.
  return [...courses].sort(
    (a, b) => (a.content?.arc_position ?? 99) - (b.content?.arc_position ?? 99),
  )[0];
}

type LengthBucket = 'all' | 'short' | 'mid' | 'long';
function inLengthBucket(weeks: number | null, bucket: LengthBucket): boolean {
  if (bucket === 'all') return true;
  const w = weeks ?? 0;
  if (bucket === 'short') return w > 0 && w <= 6;
  if (bucket === 'mid') return w >= 7 && w <= 9;
  if (bucket === 'long') return w >= 10;
  return true;
}

function courseStatus(course: Course, enrollment: Enrollment | undefined): {
  state: 'done' | 'current' | 'enter';
  pct: number;
  label: string;
} {
  const total = course.duration_weeks || 8;
  if (!enrollment) return { state: 'enter', pct: 0, label: 'Enter path →' };
  const week = enrollment.current_week || 1;
  const pct = Math.min(100, Math.round((week / total) * 100));
  if (week >= total) return { state: 'done', pct: 100, label: '✓ Completed' };
  return { state: 'current', pct, label: `● Week ${week} of ${total} → Continue` };
}

// ─── Active Transmissions Rail ────────────────────────────────────────────────

function ActiveTransmissionsRail({ courses }: { courses: EnrolledCourse[] }) {
  if (courses.length === 0) return null;
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        <span className="text-xs uppercase tracking-widest font-mono text-amber-500">
          Active Transmissions
        </span>
        <div className="flex-1 h-px bg-amber-500/10" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {courses.map((course) => {
          const tag = course.content?.course_id_tag || '';
          const currentWeek = course.enrollment.current_week || 1;
          const totalWeeks = course.duration_weeks || 8;
          const pct = Math.min(100, Math.round((currentWeek / totalWeeks) * 100));

          return (
            <div
              key={course.id}
              className="min-w-[260px] max-w-[300px] flex-shrink-0 bg-zinc-900/60 border border-amber-500/20 rounded-lg p-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  {tag && (
                    <span className="text-xs font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  )}
                  <span className="text-xs font-mono text-zinc-500">
                    Wk {currentWeek}/{totalWeeks}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-zinc-100 leading-snug mb-3 line-clamp-2">
                  {course.title}
                </h3>
                <div className="h-1 bg-zinc-800 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <Link
                  href={`/courses/${course.slug}/learn`}
                  className="flex items-center justify-between w-full text-sm font-mono text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Book cover stack (used by both concepts) ────────────────────────────────

function CoverStack({ texts, compact = false }: { texts?: CourseText[]; compact?: boolean }) {
  const limit = compact ? 3 : 5;
  if (!texts || texts.length === 0) return null;
  const visible = texts.slice(0, limit);
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {visible.map((ct, idx) => (
          <div
            key={ct.id}
            className={`${compact ? 'w-6 h-9' : 'w-8 h-11'} rounded-[2px] bg-zinc-800 border border-white/10 overflow-hidden shadow-md`}
            style={{ zIndex: 10 - idx }}
            title={ct.texts?.title}
          >
            {ct.texts?.cover_image_url ? (
              <img src={ct.texts.cover_image_url} alt={ct.texts?.title ?? ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                <BookOpen className="w-3 h-3 text-zinc-600" />
              </div>
            )}
          </div>
        ))}
        {texts.length > limit && (
          <div className={`${compact ? 'w-6 h-9 text-[11px]' : 'w-8 h-11 text-xs'} rounded-[2px] bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 font-mono`}>
            +{texts.length - limit}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONCEPT A · Arc Spine View ───────────────────────────────────────────────

function ArcSpineView({
  arcs,
  activeArcKey,
  setActiveArcKey,
  enrollmentMap,
}: {
  arcs: ArcBucket[];
  activeArcKey: string | null;
  setActiveArcKey: (k: string) => void;
  enrollmentMap: Record<string, Enrollment>;
}) {
  const activeArc = arcs.find((a) => a.key === activeArcKey) ?? arcs[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-start">
      {/* Left rail */}
      <aside className="lg:sticky lg:top-4">
        <h5 className="text-xs font-mono uppercase tracking-[0.22em] text-zinc-500 mb-4">
          The eight arcs
        </h5>
        <div className="flex flex-col gap-2">
          {arcs.map((arc) => {
            const active = arc.key === activeArc?.key;
            return (
              <button
                key={arc.key}
                type="button"
                onClick={() => setActiveArcKey(arc.key)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-[10px] border text-left transition-all ${
                  active
                    ? 'border-cyan-500/55 bg-cyan-500/[0.06] shadow-[inset_0_0_24px_rgba(34,211,238,0.08)]'
                    : 'border-white/6 bg-zinc-900/40 hover:border-white/10'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: arc.color, boxShadow: `0 0 8px ${arc.color}` }}
                />
                <span className="font-serif text-[17px] leading-tight text-zinc-100 flex-1">
                  {arc.name}
                </span>
                <span className="font-mono text-xs text-zinc-500">{arc.courses.length}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Arc stage */}
      <section className="relative pl-7">
        {/* spine */}
        <div
          className="absolute left-2 top-3.5 bottom-0 w-px"
          style={{
            background:
              'linear-gradient(180deg, #22D3EE 0%, rgba(34,211,238,0.25) 30%, rgba(180,143,74,0.25) 70%, transparent 100%)',
          }}
        >
          <span
            className="absolute -left-[3px] -top-[2px] w-[7px] h-[7px] rounded-full"
            style={{ background: '#22D3EE', boxShadow: '0 0 12px #22D3EE' }}
          />
        </div>

        {/* arc header */}
        {activeArc && (
          <div className="flex flex-wrap items-end justify-between gap-4 mb-7 pb-4 border-b border-white/6">
            <div>
              <p className="font-serif italic text-3xl text-zinc-100 m-0">{activeArc.name}</p>
              {activeArc.courses[0]?.content?.core_question && (
                <p className="font-serif italic text-amber-400 text-lg mt-2 leading-relaxed">
                  {activeArc.courses[0].content.core_question}
                </p>
              )}
            </div>
            <div className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-400">
              <b className="text-amber-400 font-medium">{activeArc.courses.length} paths</b>
              {activeArc.totalWeeks > 0 && <> · ~{activeArc.totalWeeks} weeks</>}
            </div>
          </div>
        )}

        {/* course rows */}
        <div>
          {activeArc?.courses.map((course, idx) => (
            <ArcCourseRow
              key={course.id}
              course={course}
              positionLabel={String(course.content?.arc_position ?? idx + 1).padStart(2, '0')}
              enrollment={enrollmentMap[course.id]}
              arcColor={activeArc.color}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ArcCourseRow({
  course,
  positionLabel,
  enrollment,
  arcColor,
}: {
  course: Course;
  positionLabel: string;
  enrollment?: Enrollment;
  arcColor: string;
}) {
  const router = useRouter();
  const tag = course.content?.course_id_tag;
  const coreQuestion = getCoreQuestion(course, 220);
  const tensionsCount = course.content?.key_tensions?.length ?? 0;
  const status = courseStatus(course, enrollment);

  const levelDotColor =
    course.level === 'advanced' ? '#B03AFF' :
    course.level === 'intermediate' ? '#22D3EE' :
    '#B48F4A';

  const href = enrollment ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`;

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={`relative w-full text-left py-[18px] pb-[22px] border-b border-white/6 group ${
        status.state === 'current' ? '' : ''
      }`}
    >
      {/* spine dot */}
      <span
        className="absolute -left-[24px] top-6 w-[14px] h-[14px] rounded-full bg-zinc-950 border-[2px]"
        style={{
          borderColor: status.state === 'done' ? '#C5A05B' : status.state === 'current' ? '#B48F4A' : '#52525B',
          background: status.state === 'current' ? '#B48F4A' : '#0A1212',
          boxShadow: status.state === 'current' ? '0 0 16px rgba(180,143,74,0.45)' : 'none',
        }}
      />

      <div className="grid grid-cols-[56px_1fr_200px] gap-6 items-center md:grid-cols-[72px_1fr_240px]">
        <div className="font-display font-semibold text-[34px] leading-none text-amber-500/70">
          {positionLabel}
        </div>

        <div>
          <h4 className="font-sans font-semibold text-xl text-zinc-100 m-0 group-hover:text-amber-100 transition-colors leading-snug">
            {tag && (
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-amber-400 bg-amber-500/[0.06] border border-amber-500/25 px-2 py-[3px] rounded-[3px] mr-2 align-middle">
                {tag}
              </span>
            )}
            {course.title}
          </h4>

          {coreQuestion && (
            <p className="font-serif italic text-base text-zinc-300 mt-2 leading-relaxed">
              “{coreQuestion}”
            </p>
          )}

          <div className="font-mono text-xs tracking-wider uppercase text-zinc-400 mt-3 flex flex-wrap gap-4">
            {course.level && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: levelDotColor }} />
                {course.level}
              </span>
            )}
            {course.duration_weeks && <span>{course.duration_weeks} weeks</span>}
            {course.course_texts && course.course_texts.length > 0 && (
              <span>
                {course.course_texts.length} text{course.course_texts.length !== 1 ? 's' : ''}
              </span>
            )}
            {tensionsCount > 0 && <span>↔ {tensionsCount} key tensions</span>}
          </div>

          {status.state === 'current' && (
            <div className="h-[2px] rounded-[2px] bg-white/6 overflow-hidden mt-2">
              <div
                className="h-full rounded-[2px]"
                style={{
                  width: `${status.pct}%`,
                  background: 'linear-gradient(90deg, #B48F4A, #C5A05B)',
                }}
              />
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="flex justify-end mb-2">
            <CoverStack texts={course.course_texts} compact />
          </div>
          <span
            className={`font-mono text-xs tracking-[0.18em] uppercase inline-flex items-center gap-1.5 ${
              status.state === 'done'
                ? 'text-amber-400'
                : status.state === 'current'
                ? 'text-cyan-400'
                : 'text-cyan-500 group-hover:text-cyan-300'
            }`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* faint hover wash tinted by arc color */}
      <span
        className="absolute inset-x-0 -inset-y-px opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${arcColor}10, transparent 60%)` }}
      />
    </button>
  );
}

// ─── CONCEPT B · Catalog View ─────────────────────────────────────────────────

function CatalogView({
  courses,
  arcs,
  enrollmentMap,
  filterArc,
  setFilterArc,
  filterLevel,
  setFilterLevel,
  filterLength,
  setFilterLength,
  filterLens,
  setFilterLens,
  clearFilters,
}: {
  courses: Course[];
  arcs: ArcBucket[];
  enrollmentMap: Record<string, Enrollment>;
  filterArc: string;
  setFilterArc: (v: string) => void;
  filterLevel: string;
  setFilterLevel: (v: string) => void;
  filterLength: LengthBucket;
  setFilterLength: (v: LengthBucket) => void;
  filterLens: number | null;
  setFilterLens: (v: number | null) => void;
  clearFilters: () => void;
}) {
  // Precompute lenses per course
  const courseLenses = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const c of courses) m.set(c.id, deriveLenses(c));
    return m;
  }, [courses]);

  const filtered = courses.filter((c) => {
    if (filterArc !== 'all' && (c.content?.arc?.trim() ?? 'Unsorted Paths') !== filterArc) return false;
    if (filterLevel !== 'all' && c.level !== filterLevel) return false;
    if (!inLengthBucket(c.duration_weeks, filterLength)) return false;
    if (filterLens !== null && !(courseLenses.get(c.id) ?? []).includes(filterLens)) return false;
    return true;
  });

  // Levels with counts for chips
  const levelCount = (lvl: string) =>
    lvl === 'all' ? courses.length : courses.filter((c) => c.level === lvl).length;

  // Per-lens counts
  const lensCount = (idx: number) =>
    courses.filter((c) => (courseLenses.get(c.id) ?? []).includes(idx)).length;

  return (
    <div>
      {/* Lens filter rail */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <span className="font-mono text-xs tracking-[0.26em] uppercase text-zinc-400 mr-2">
          Lens
        </span>
        <button
          type="button"
          onClick={() => setFilterLens(null)}
          className={`inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] uppercase px-3 py-1.5 border rounded-full transition-colors ${
            filterLens === null
              ? 'bg-white/8 border-white/25 text-zinc-100'
              : 'bg-zinc-900/30 border-white/6 text-zinc-400 hover:border-white/15'
          }`}
        >
          All <span className="text-zinc-500 ml-1 text-xs">{courses.length}</span>
        </button>
        {LENS_DEFS.map((lens, i) => {
          const active = filterLens === i;
          const ct = lensCount(i);
          return (
            <button
              key={lens.key}
              type="button"
              onClick={() => setFilterLens(active ? null : i)}
              className={`inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] uppercase px-3 py-1.5 border rounded-full transition-colors`}
              style={
                active
                  ? { background: `${lens.color}18`, borderColor: `${lens.color}66`, color: lens.color }
                  : { background: 'rgba(13,20,37,0.3)', borderColor: 'rgba(255,255,255,0.06)', color: '#a1a1aa' }
              }
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: lens.color, boxShadow: `0 0 6px ${lens.color}` }}
              />
              {lens.label}
              <span className="text-xs ml-1" style={{ opacity: 0.7 }}>{ct}</span>
            </button>
          );
        })}
      </div>

      {/* Chip rails */}
      <div className="flex flex-wrap items-center gap-2 mb-7 pb-4 border-b border-white/6">
        <span className="font-mono text-xs tracking-[0.26em] uppercase text-zinc-400 mr-2">
          Arc
        </span>
        <Chip active={filterArc === 'all'} onClick={() => setFilterArc('all')}>
          All <Count>{courses.length}</Count>
        </Chip>
        {arcs.map((arc) => (
          <Chip key={arc.key} active={filterArc === arc.key} onClick={() => setFilterArc(arc.key)} dotColor={arc.color}>
            {arc.name} <Count>{arc.courses.length}</Count>
          </Chip>
        ))}

        <ChipSep />

        <span className="font-mono text-xs tracking-[0.26em] uppercase text-zinc-400 mr-2">
          Level
        </span>
        {(['all', 'foundational', 'intermediate', 'advanced'] as const).map((lvl) => (
          <Chip key={lvl} active={filterLevel === lvl} onClick={() => setFilterLevel(lvl)}>
            {lvl === 'all' ? 'All' : lvl} <Count>{levelCount(lvl)}</Count>
          </Chip>
        ))}

        <ChipSep />

        <span className="font-mono text-xs tracking-[0.26em] uppercase text-zinc-400 mr-2">
          Length
        </span>
        <Chip active={filterLength === 'all'} onClick={() => setFilterLength('all')}>
          Any
        </Chip>
        <Chip active={filterLength === 'short'} onClick={() => setFilterLength('short')}>
          ≤ 6 wks
        </Chip>
        <Chip active={filterLength === 'mid'} onClick={() => setFilterLength('mid')}>
          8 wks
        </Chip>
        <Chip active={filterLength === 'long'} onClick={() => setFilterLength('long')}>
          10+
        </Chip>

        <button
          type="button"
          onClick={clearFilters}
          className="ml-auto font-mono text-xs tracking-[0.18em] uppercase text-zinc-500 hover:text-amber-400 px-3 py-2 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Catalog grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-white/5 rounded-2xl bg-zinc-900/10">
          <div className="text-5xl font-mono text-zinc-800 mb-3">∅</div>
          <p className="text-base font-mono text-zinc-500 uppercase tracking-wide">
            No paths match your filters
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const arc = arcs.find((a) => a.key === (course.content?.arc?.trim() ?? 'Unsorted Paths'));
            return (
              <CatalogCard
                key={course.id}
                course={course}
                enrollment={enrollmentMap[course.id]}
                arcColor={arc?.color}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  dotColor,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  dotColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 font-mono text-xs tracking-[0.16em] uppercase px-3 py-1.5 border rounded-full transition-colors ${
        active
          ? 'bg-amber-500/[0.08] border-amber-500/40 text-amber-400'
          : 'bg-zinc-900/30 border-white/6 text-zinc-400 hover:border-white/15'
      }`}
    >
      {dotColor && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
        />
      )}
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="text-zinc-500 ml-1 text-xs">{children}</span>;
}

function ChipSep() {
  return <span className="w-px h-5 bg-white/8 mx-2.5" aria-hidden />;
}

function CuratorPick({ course, enrollment }: { course: Course; enrollment?: Enrollment }) {
  const tag = course.content?.course_id_tag;
  const arc = course.content?.arc;
  const arcPos = course.content?.arc_position;
  const coreQuestion = getCoreQuestion(course, 260);
  const status = courseStatus(course, enrollment);

  return (
    <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-7 p-7 rounded-2xl border border-cyan-500/30 overflow-hidden mb-2"
         style={{
           background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(13,20,37,0.6) 60%, rgba(180,143,74,0.04))',
         }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 0%, rgba(34,211,238,0.12), transparent 50%)' }}
      />
      <div className="relative">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-cyan-400 mb-3.5 flex items-center gap-2.5">
          <span>◈</span> Curator’s entry · this season
        </div>
        <h3 className="font-display font-semibold text-[30px] leading-tight text-zinc-100 m-0 mb-3">
          {course.title}
        </h3>
        {coreQuestion && (
          <p className="font-serif italic text-[17px] text-amber-400 m-0 mb-4 leading-relaxed max-w-[480px]">
            “{coreQuestion}”
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-wider uppercase text-zinc-500 mb-6">
          {arc && (
            <span>
              Arc · <b className="text-zinc-100 font-medium">{arc}{arcPos ? ` · ${String(arcPos).padStart(2, '0')}` : ''}</b>
            </span>
          )}
          {course.duration_weeks && <><span>·</span><span>{course.duration_weeks} weeks</span></>}
          {course.course_texts && course.course_texts.length > 0 && (
            <>
              <span>·</span>
              <span>{course.course_texts.length} core text{course.course_texts.length !== 1 ? 's' : ''}</span>
            </>
          )}
          {tag && (<><span>·</span><span className="text-amber-400">{tag}</span></>)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={enrollment ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`}
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-md border border-cyan-500 bg-cyan-500/10 text-cyan-400 font-mono text-[12px] tracking-[0.18em] uppercase hover:bg-cyan-500/15 hover:shadow-[0_0_24px_rgba(34,211,238,0.18)] transition-all"
          >
            {status.state === 'current' ? 'Continue path' : 'Enter the path'} →
          </Link>
          {course.content?.curator_note_public && (
            <Link
              href={`/courses/${course.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-white/8 text-zinc-400 font-mono text-[11px] tracking-[0.18em] uppercase hover:border-white/20 hover:text-zinc-100 transition-colors"
            >
              Read the curator’s note
            </Link>
          )}
        </div>
      </div>

      {/* Prism graphic */}
      <div className="relative hidden md:flex items-center justify-center">
        <svg viewBox="0 0 260 260" className="w-[260px] h-[260px]" fill="none">
          <g opacity="0.9">
            <polygon points="130,50 210,180 50,180" stroke="rgba(34,211,238,0.55)" strokeWidth="1" fill="rgba(34,211,238,0.04)" />
            <polygon points="130,50 210,180 50,180" stroke="rgba(34,211,238,0.2)" strokeWidth="1" fill="none" transform="translate(2,1)" />
          </g>
          <line x1="-10" y1="115" x2="130" y2="115" stroke="rgba(255,255,255,0.45)" strokeWidth="1.3" strokeDasharray="3 2" />
          <circle cx="-5" cy="115" r="2" fill="rgba(255,255,255,0.7)" />
          <line x1="130" y1="115" x2="260" y2="74" stroke="#FF3A5C" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="90" stroke="#FF8C2A" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="106" stroke="#F5D020" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="122" stroke="#2AFFA0" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="138" stroke="#20E0F5" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="154" stroke="#3A7FFF" strokeWidth="1.3" />
          <line x1="130" y1="115" x2="260" y2="170" stroke="#B03AFF" strokeWidth="1.3" />
          <circle cx="258" cy="74" r="2" fill="#FF3A5C" />
          <circle cx="258" cy="90" r="2" fill="#FF8C2A" />
          <circle cx="258" cy="106" r="2" fill="#F5D020" />
          <circle cx="258" cy="122" r="2" fill="#2AFFA0" />
          <circle cx="258" cy="138" r="2" fill="#20E0F5" />
          <circle cx="258" cy="154" r="2" fill="#3A7FFF" />
          <circle cx="258" cy="170" r="2" fill="#B03AFF" />
        </svg>
      </div>
    </div>
  );
}

function CatalogCard({
  course,
  enrollment,
  arcColor,
}: {
  course: Course;
  enrollment?: Enrollment;
  arcColor?: string;
}) {
  const router = useRouter();
  const arc = course.content?.arc;
  const arcPos = course.content?.arc_position;
  const coreQuestion = getCoreQuestion(course, 180);
  const status = courseStatus(course, enrollment);

  const pip =
    course.level === 'advanced'
      ? { label: 'Advanced', cls: 'text-violet-400 border-violet-500/30 bg-violet-500/[0.06]' }
      : course.level === 'intermediate'
      ? { label: 'Theme', cls: 'text-cyan-400 border-cyan-500/25 bg-cyan-500/[0.06]' }
      : { label: 'Foundational', cls: 'text-amber-400 border-amber-500/25 bg-amber-500/[0.06]' };

  const href = enrollment ? `/courses/${course.slug}/learn` : `/courses/${course.slug}`;

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="relative flex flex-col text-left p-6 min-h-[280px] rounded-[14px] border border-white/6 bg-zinc-900/35 hover:border-amber-500/55 transition-colors"
    >
      <span className={`absolute top-3.5 right-3.5 font-mono text-xs tracking-[0.18em] uppercase px-2 py-1 rounded-[3px] border ${pip.cls}`}>
        {pip.label}
      </span>

      <div className="flex items-center gap-2.5 font-mono text-xs tracking-[0.22em] uppercase text-amber-500 mb-4">
        <span className="text-zinc-500">{arcPos ? String(arcPos).padStart(2, '0') : '—'}</span>
        <span>{arc ?? 'Unsorted'}</span>
        <span
          className="flex-1 h-px"
          style={{
            background: `linear-gradient(90deg, ${arcColor ?? 'rgba(180,143,74,0.4)'}, transparent)`,
          }}
        />
      </div>

      <h4 className="font-display font-semibold text-[22px] leading-tight text-zinc-100 m-0 mb-3">
        {course.title}
      </h4>

      {coreQuestion && (
        <p className="font-serif italic text-base leading-relaxed text-amber-400/90 m-0 mb-4 flex-grow">
          “{coreQuestion}”
        </p>
      )}

      <div className="flex justify-between items-center pt-3.5 border-t border-dashed border-white/8">
        <CoverStack texts={course.course_texts} compact />
        <div className="font-mono text-xs tracking-[0.18em] uppercase text-zinc-400 flex items-center gap-3">
          {status.state === 'current' ? (
            <span className="flex items-center gap-2 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Active · Wk {enrollment?.current_week ?? 1}
            </span>
          ) : status.state === 'done' ? (
            <span className="text-amber-400">✓ Completed</span>
          ) : (
            <span>
              {course.duration_weeks ? `${course.duration_weeks} wks` : ''}
              {course.course_texts && course.course_texts.length > 0
                ? ` · ${course.course_texts.length} text${course.course_texts.length !== 1 ? 's' : ''}`
                : ''}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Paths View (seed data) ───────────────────────────────────────────────────

function PathsView({
  activeId,
  setActiveId,
}: {
  activeId: string;
  setActiveId: (id: string) => void;
}) {
  const active = SEED_PATHS.find((p) => p.id === activeId) ?? SEED_PATHS[0];
  const totalWeeks = active.steps.reduce((s, st) => s + st.weeks, 0);

  // Hub courses = appear in 3+ paths
  const hubs = active.steps
    .filter((s) => countPathsForCourse(s.code) >= 3)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
      {/* Left rail */}
      <aside className="lg:sticky lg:top-4">
        <h5 className="text-xs font-mono uppercase tracking-[0.22em] text-zinc-500 mb-4">
          {SEED_PATHS.length} paths · seed
        </h5>
        <div className="flex flex-col gap-2">
          {SEED_PATHS.map((p) => {
            const isActive = p.id === active.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                className={`text-left p-3.5 rounded-[10px] border transition-all ${
                  isActive ? 'bg-zinc-900/60' : 'bg-zinc-900/30 hover:bg-zinc-900/45'
                }`}
                style={{
                  borderColor: isActive ? `${p.color}66` : 'rgba(255,255,255,0.06)',
                  boxShadow: isActive ? `inset 0 0 24px ${p.color}10` : undefined,
                }}
              >
                <div className="font-serif text-[17px] leading-tight text-zinc-100 mb-2">{p.name}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs tracking-[0.18em] uppercase text-zinc-500">
                    {p.steps.length} courses
                  </span>
                  <span
                    className="font-mono text-[11px] tracking-[0.18em] uppercase px-2 py-[3px] rounded-[2px]"
                    style={{ background: `${p.color}18`, color: p.color }}
                  >
                    {p.tag}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <section>
        {/* Path header */}
        <div className="pb-5 mb-5 border-b border-white/6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ background: active.color, boxShadow: `0 0 8px ${active.color}` }} />
            <span
              className="font-mono text-xs tracking-[0.2em] uppercase px-2 py-[3px] rounded-[2px]"
              style={{ background: `${active.color}18`, color: active.color }}
            >
              {active.tag}
            </span>
          </div>
          <h2 className="font-serif italic text-[34px] text-zinc-100 m-0 mb-3 leading-tight">{active.name}</h2>
          <p className="text-base text-zinc-300 leading-relaxed max-w-2xl">{active.subtitle}</p>
          <div className="flex items-center gap-3 mt-4 font-mono text-xs tracking-[0.18em] uppercase text-zinc-500">
            <span><b className="text-zinc-200 font-medium">{active.steps.length}</b> courses</span>
            <span>·</span>
            <span>~<b className="text-zinc-200 font-medium">{totalWeeks}</b> weeks</span>
            <span>·</span>
            <span className="text-zinc-600">From completion pathways</span>
          </div>
        </div>

        {/* Hub courses */}
        {hubs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-7">
            {hubs.map((h) => {
              const pn = countPathsForCourse(h.code);
              return (
                <div
                  key={h.code}
                  className="border rounded-md p-4"
                  style={{ borderColor: `${active.color}30` }}
                >
                  <div className="font-mono text-xs tracking-[0.16em] uppercase mb-2" style={{ color: active.color }}>
                    {h.code} · hub course
                  </div>
                  <div className="font-serif italic text-[15px] leading-snug text-zinc-200">{h.title}</div>
                  <div className="mt-3 font-mono text-xs tracking-[0.18em] uppercase" style={{ color: `${active.color}99` }}>
                    in {pn} of {SEED_PATHS.length} paths
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Chain of steps */}
        <div>
          {active.steps.map((step, idx) => {
            const isLast = idx === active.steps.length - 1;
            const pn = countPathsForCourse(step.code);
            return (
              <div key={step.code + idx}>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center" style={{ width: 48 }}>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-semibold border-[1.5px]"
                      style={{
                        background: `${active.color}18`,
                        borderColor: `${active.color}66`,
                        color: active.color,
                      }}
                    >
                      {step.code.replace(/^C/, '')}
                    </div>
                    {!isLast && (
                      <div
                        className="w-[1.5px] flex-1 min-h-[22px]"
                        style={{ background: `${active.color}22` }}
                      />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2.5 font-mono text-xs tracking-[0.18em] uppercase text-zinc-500 mb-1.5">
                      <span>{step.code}</span>
                      {pn > 1 && (
                        <span
                          className="font-mono text-[11px] tracking-[0.18em] uppercase px-2 py-[2px] rounded-[2px]"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          in {pn} paths
                        </span>
                      )}
                    </div>
                    <div className="font-sans font-semibold text-[18px] text-zinc-100 mb-2 leading-snug">{step.title}</div>
                    <p className="font-serif italic text-base text-zinc-300 leading-relaxed m-0 mb-3 max-w-2xl">
                      {step.why}
                    </p>
                    <div className="flex items-center gap-3 font-mono text-xs tracking-[0.15em] uppercase text-zinc-500">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: active.color }}
                      />
                      <span>{step.level}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{step.weeks} weeks</span>
                    </div>
                  </div>
                </div>
                {!isLast && (
                  <div className="pl-12 pb-3 font-mono text-xs tracking-[0.22em] uppercase" style={{ color: `${active.color}55` }}>
                    ↓ leads to
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* End line */}
        <div className="flex items-center gap-3 mt-7">
          <span className="flex-1 h-px bg-white/6" />
          <span className="font-mono text-xs tracking-[0.22em] uppercase text-zinc-600">Path complete</span>
          <span className="flex-1 h-px bg-white/6" />
        </div>
      </section>
    </div>
  );
}

// ─── Map View (seed graph) ────────────────────────────────────────────────────

function MapView() {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const W = 760;
  const H = 540;

  // Positions: spread nodes within each arc band horizontally
  const positions = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    const byArc: Record<MapSeedNode['arc'], MapSeedNode[]> = { FS: [], TT: [], PA: [], CM: [] };
    for (const n of MAP_NODES) byArc[n.arc].push(n);
    (Object.keys(byArc) as Array<MapSeedNode['arc']>).forEach((arc) => {
      const list = byArc[arc];
      const y = ARC_BAND_META[arc].y;
      const step = (W - 100) / Math.max(list.length - 1, 1);
      list.forEach((n, i) => {
        m[n.id] = { x: 50 + i * step, y };
      });
    });
    return m;
  }, []);

  // Node radius by # of paths
  const radius = (id: string) => 8 + Math.min(countPathsForCourse(id), 6) * 2;

  // Edge path
  const edgePath = (a: string, b: string) => {
    const pa = positions[a], pb = positions[b];
    if (!pa || !pb) return '';
    const dy = pb.y - pa.y, dx = pb.x - pa.x;
    if (Math.abs(dy) < 25) {
      // same band — arch up
      const mx = (pa.x + pb.x) / 2;
      const arch = pa.y - Math.max(28, Math.abs(dx) * 0.15);
      return `M${pa.x},${pa.y} Q${mx},${arch} ${pb.x},${pb.y}`;
    }
    const cp1x = pa.x + dx * 0.15, cp1y = pa.y + dy * 0.5;
    const cp2x = pb.x - dx * 0.15, cp2y = pb.y - dy * 0.5;
    return `M${pa.x},${pa.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${pb.x},${pb.y}`;
  };

  const connected = useMemo(() => {
    if (!hoverId) return new Set<string>();
    const s = new Set<string>();
    for (const [a, b] of MAP_EDGES) {
      if (a === hoverId) s.add(b);
      if (b === hoverId) s.add(a);
    }
    return s;
  }, [hoverId]);

  const hoverNode = hoverId ? MAP_NODES.find((n) => n.id === hoverId) ?? null : null;
  const hoverPaths = hoverNode
    ? SEED_PATHS.filter((p) => p.steps.some((s) => s.code === hoverNode.id))
    : [];
  const hoverColor = hoverNode ? ARC_BAND_META[hoverNode.arc].color : '#52525B';

  return (
    <div className="border border-white/6 rounded-2xl overflow-hidden bg-zinc-950/40">
      {/* Legend bar */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-4 border-b border-white/6">
        <span className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-400">Arc</span>
        {(Object.entries(ARC_BAND_META) as Array<[MapSeedNode['arc'], typeof ARC_BAND_META[MapSeedNode['arc']]]>).map(
          ([arc, meta]) => (
            <span key={arc} className="inline-flex items-center gap-2 font-mono text-xs text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
              {meta.label}
            </span>
          ),
        )}
        <span className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-400 ml-2">Size</span>
        <span className="inline-flex items-center gap-2 font-mono text-xs text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-zinc-500" /> 1 path
        </span>
        <span className="inline-flex items-center gap-2 font-mono text-xs text-zinc-300">
          <span className="w-3 h-3 rounded-full bg-zinc-500" /> 3 paths
        </span>
        <span className="inline-flex items-center gap-2 font-mono text-xs text-zinc-300">
          <span className="w-4 h-4 rounded-full bg-zinc-500" /> 5+ paths
        </span>
        <span className="ml-auto font-mono text-xs tracking-[0.18em] uppercase text-zinc-500">
          Hover node to explore
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block">
          {/* Arc bands */}
          {(Object.entries(ARC_BAND_META) as Array<[MapSeedNode['arc'], typeof ARC_BAND_META[MapSeedNode['arc']]]>).map(
            ([arc, meta]) => (
              <g key={arc}>
                <rect
                  x={0}
                  y={meta.y - 35}
                  width={W}
                  height={70}
                  fill={meta.color}
                  fillOpacity={0.04}
                />
                <text
                  x={12}
                  y={meta.y - 20}
                  fontSize={12}
                  fontFamily="var(--font-mono, 'Fira Mono', monospace)"
                  letterSpacing="1.8"
                  fill={meta.color}
                  fillOpacity={0.6}
                >
                  {meta.label.toUpperCase()}
                </text>
              </g>
            ),
          )}

          {/* Edges */}
          {MAP_EDGES.map(([a, b]) => {
            const involves = hoverId && (a === hoverId || b === hoverId);
            const dim = hoverId && !involves;
            return (
              <path
                key={`${a}-${b}`}
                d={edgePath(a, b)}
                stroke={involves ? hoverColor : '#27272a'}
                strokeWidth={involves ? 1.8 : 1}
                opacity={dim ? 0.15 : involves ? 1 : 0.7}
                fill="none"
              />
            );
          })}

          {/* Nodes */}
          {MAP_NODES.map((n) => {
            const pos = positions[n.id];
            if (!pos) return null;
            const color = ARC_BAND_META[n.arc].color;
            const r = radius(n.id);
            const isHover = hoverId === n.id;
            const isConnected = connected.has(n.id);
            const dim = hoverId && !isHover && !isConnected;
            return (
              <g
                key={n.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                opacity={dim ? 0.2 : 1}
              >
                <circle cx={pos.x} cy={pos.y} r={r + 3} fill={`${color}10`} />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={isHover ? `${color}55` : `${color}22`}
                  stroke={color}
                  strokeOpacity={0.7}
                  strokeWidth={isHover ? 2.5 : countPathsForCourse(n.id) >= 4 ? 2 : 1.5}
                />
                <text
                  x={pos.x}
                  y={pos.y + 5}
                  textAnchor="middle"
                  fontSize={r > 12 ? 13 : 12}
                  fill={color}
                  fontFamily="var(--font-mono, 'Fira Mono', monospace)"
                  fontWeight={500}
                  pointerEvents="none"
                >
                  {n.id.replace(/^C/, '')}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoverNode && (
          <div
            className="absolute pointer-events-none border rounded-md px-4 py-3 max-w-[300px] bg-zinc-950/95 backdrop-blur"
            style={{
              borderColor: `${hoverColor}55`,
              left: `${(positions[hoverNode.id].x / W) * 100}%`,
              top: `${(positions[hoverNode.id].y / H) * 100}%`,
              transform: 'translate(14px, -100%)',
              boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${hoverColor}22`,
            }}
          >
            <div className="font-mono text-xs tracking-[0.18em] uppercase mb-2" style={{ color: hoverColor }}>
              {hoverNode.id} · {ARC_BAND_META[hoverNode.arc].label}
            </div>
            <div className="text-base text-zinc-100 leading-snug mb-2 font-medium">{hoverNode.title}</div>
            <p className="font-serif italic text-sm text-zinc-300 leading-snug m-0 mb-3">
              “{hoverNode.q}”
            </p>
            {hoverPaths.length > 0 ? (
              <div className="font-mono text-xs tracking-[0.16em] uppercase text-zinc-400">
                In {hoverPaths.length} path{hoverPaths.length !== 1 ? 's' : ''}:
                <div className="mt-1.5 flex flex-col gap-1">
                  {hoverPaths.map((p) => (
                    <span key={p.id} style={{ color: p.color }} className="text-[13px]">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span className="font-mono text-xs tracking-[0.16em] uppercase text-zinc-600">
                Not yet in a named path
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CoursesPageContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // View toggle (default: arcs — first tab)
  const [viewMode, setViewMode] = useState<ViewMode>('arcs');

  // Concept A state
  const [activeArcKey, setActiveArcKey] = useState<string | null>(null);

  // Concept B state
  const [filterArc, setFilterArc] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterLength, setFilterLength] = useState<LengthBucket>('all');
  const [filterLens, setFilterLens] = useState<number | null>(null);

  // Paths view state
  const [activePathId, setActivePathId] = useState<string>(SEED_PATHS[0].id);

  const enrollmentMap: Record<string, Enrollment> = useMemo(() => {
    const m: Record<string, Enrollment> = {};
    for (const ec of enrolledCourses) m[ec.id] = ec.enrollment;
    return m;
  }, [enrolledCourses]);

  // Seed search from URL
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) setSearchQuery(decodeURIComponent(urlSearch));
  }, [searchParams]);

  // Fetch catalog (server-side search only; level/length/arc filter client-side)
  useEffect(() => {
    if (authLoading) return;

    const fetchCourses = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        params.append('published', 'true');

        const res = await fetch(`/api/courses?${params}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) setCourses(data.courses || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [authLoading, searchQuery]);

  // Fetch enrolled courses
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchEnrolled = async () => {
      try {
        const res = await fetch('/api/courses/my-courses');
        const data = await res.json();
        if (data.success && data.courses) {
          setEnrolledCourses(data.courses.filter((c: EnrolledCourse) => c.enrollment));
        }
      } catch (err) {
        console.error('Error fetching enrolled courses:', err);
      }
    };

    fetchEnrolled();
  }, [authLoading, user]);

  // Build arc buckets (client-side, filtered by search but not by chip filters,
  // so the rail shows the full landscape).
  const arcs = useMemo(() => buildArcs(courses), [courses]);

  // Pick a default active arc when arcs first arrive
  useEffect(() => {
    if (!activeArcKey && arcs.length > 0) {
      // Prefer the arc containing an enrolled course
      const enrolledArc = arcs.find((a) => a.courses.some((c) => enrollmentMap[c.id]));
      setActiveArcKey((enrolledArc ?? arcs[0]).key);
    }
  }, [arcs, activeArcKey, enrollmentMap]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-200 font-sans">
      <Header />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-amber-900/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/6 rounded-full blur-[120px]" />
      </div>

      <main className="flex-1 relative z-10">
        {/* Archive header */}
        <div className="border-b border-white/8 bg-zinc-900/20 backdrop-blur-md">
          <div className="max-w-screen-2xl mx-auto px-6 py-10">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px w-8 bg-amber-500/40" />
                  <span className="text-xs uppercase tracking-widest font-mono text-amber-500/80">
                    The Convergence Archive
                  </span>
                </div>
                <h1 className="text-5xl font-bold text-white tracking-tight mb-3">
                  The Paths
                </h1>
                <p className="text-zinc-400 max-w-2xl text-base leading-relaxed">
                  Eight arcs of inquiry. Each is a sustained encounter with a domain — read in order, or step in wherever a question calls you.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2.5">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                  <input
                    type="text"
                    placeholder="SEARCH_PATHS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-black/40 border border-white/8 rounded-lg text-amber-400 placeholder-amber-500/25 font-mono text-sm focus:outline-none focus:border-amber-500/40 w-80 transition-all tracking-[0.16em]"
                  />
                </div>

                {/* Stats */}
                <div className="flex gap-4 font-mono text-xs tracking-[0.22em] uppercase text-zinc-400">
                  <span>
                    <b className="text-amber-400 font-medium">{courses.length}</b> paths
                  </span>
                  <span>
                    <b className="text-amber-400 font-medium">{arcs.length}</b> arc{arcs.length === 1 ? '' : 's'}
                  </span>
                  {enrolledCourses.length > 0 && (
                    <span>
                      <b className="text-amber-400 font-medium">{enrolledCourses.length}</b> active
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          {!authLoading && user && enrolledCourses.length > 0 && (
            <ActiveTransmissionsRail courses={enrolledCourses} />
          )}

          {/* Persistent Curator's Entry — visible above both views */}
          {!loading && courses.length > 0 && (() => {
            const curator = pickCurator(courses, enrollmentMap);
            return curator ? (
              <CuratorPick course={curator} enrollment={enrollmentMap[curator.id]} />
            ) : null;
          })()}

          {/* View bar: 4-tab toggle + view-stats */}
          {!loading && courses.length > 0 && (
            <div className="flex flex-wrap justify-between items-center gap-4 mb-7 mt-7">
              <div className="inline-flex p-[3px] bg-black/40 border border-white/8 rounded-lg gap-[2px]">
                {(['arcs', 'paths', 'map', 'catalog'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={`font-mono text-sm tracking-[0.22em] uppercase px-5 py-3 rounded-[5px] transition-colors ${
                      viewMode === m
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 font-mono text-xs tracking-[0.22em] uppercase text-zinc-400">
                <span>
                  <b className="text-amber-400 font-medium">{arcs.length}</b> arc{arcs.length === 1 ? '' : 's'}
                </span>
                <span>·</span>
                <span>
                  <b className="text-amber-400 font-medium">{courses.length}</b> paths
                </span>
                {(viewMode === 'paths' || viewMode === 'map') && (
                  <>
                    <span>·</span>
                    <span className="text-zinc-500">Seed data preview</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Loading / Empty / View */}
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-52 bg-zinc-900/20 border border-white/5 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-28 border border-white/5 rounded-2xl bg-zinc-900/10">
              <div className="text-4xl font-mono text-zinc-800 mb-4">∅</div>
              <p className="text-sm font-mono text-zinc-600 uppercase tracking-wide">
                {searchQuery ? 'No paths match your query' : 'No paths available yet'}
              </p>
            </div>
          ) : viewMode === 'arcs' ? (
            <ArcSpineView
              arcs={arcs}
              activeArcKey={activeArcKey}
              setActiveArcKey={setActiveArcKey}
              enrollmentMap={enrollmentMap}
            />
          ) : viewMode === 'catalog' ? (
            <CatalogView
              courses={courses}
              arcs={arcs}
              enrollmentMap={enrollmentMap}
              filterArc={filterArc}
              setFilterArc={setFilterArc}
              filterLevel={filterLevel}
              setFilterLevel={setFilterLevel}
              filterLength={filterLength}
              setFilterLength={setFilterLength}
              filterLens={filterLens}
              setFilterLens={setFilterLens}
              clearFilters={() => {
                setFilterArc('all');
                setFilterLevel('all');
                setFilterLength('all');
                setFilterLens(null);
              }}
            />
          ) : viewMode === 'paths' ? (
            <PathsView activeId={activePathId} setActiveId={setActivePathId} />
          ) : (
            <MapView />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-zinc-950">
          <Header />
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
          <Footer />
        </div>
      }
    >
      <CoursesPageContent />
    </Suspense>
  );
}
