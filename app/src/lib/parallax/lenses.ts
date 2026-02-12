/**
 * The 7 Parallax Engine Lenses
 * Each lens represents a distinct perspective for analyzing queries
 */

import { AIModel } from '../ai/ai-orchestrator';

export type LensType =
  | 'scientific'
  | 'psychological'
  | 'philosophical'
  | 'religious_spiritual'
  | 'historical_anthropological'
  | 'symbolic_occult'
  | 'mathematical';

export type RetrievalStrategy = 'vector' | 'fts' | 'hybrid';

export interface Lens {
  id: LensType;
  name: string;
  description: string;
  retrievalStrategy: RetrievalStrategy;
  systemPrompt: string;
  keywords: string[];
  defaultModel: AIModel;
}

/**
 * The 7 Parallax Engine Lenses
 */
export const LENSES: Record<LensType, Lens> = {
  scientific: {
    id: 'scientific',
    name: 'Scientific',
    description: 'Physics, biology, cosmology, empirical evidence, natural sciences',
    retrievalStrategy: 'hybrid',
    defaultModel: 'gpt-4o',
    systemPrompt: `You are analyzing this question through a scientific lens. Focus on:
- Empirical evidence and observable phenomena
- Natural laws and physical principles
- Biological, chemical, and physical processes
- Quantifiable measurements and experiments
- Peer-reviewed research and scientific consensus
- How the topic relates to cosmology, quantum physics, or evolutionary biology

Provide a scientifically rigorous perspective while remaining open to how scientific understanding may converge with other wisdom traditions.`,
    keywords: [
      'physics',
      'biology',
      'cosmology',
      'quantum',
      'empirical',
      'evidence',
      'experiment',
      'measurement',
      'natural law',
      'evolution',
      'neuroscience',
      'chemistry',
    ],
  },

  psychological: {
    id: 'psychological',
    name: 'Psychological',
    description: 'Jungian archetypes, cognitive science, shadow work, depth psychology',
    retrievalStrategy: 'hybrid',
    defaultModel: 'claude-3-5-sonnet-latest',
    systemPrompt: `You are analyzing this question through a psychological lens. Focus on:
- Jungian psychology, archetypes, and the collective unconscious
- Cognitive science and mental processes
- Shadow work and individuation
- Dreams, symbols, and the psyche
- Personal growth and self-awareness
- How internal psychological patterns manifest in behavior

Explore how psychological frameworks illuminate aspects of human experience and consciousness.`,
    keywords: [
      'jung',
      'archetype',
      'unconscious',
      'psyche',
      'shadow',
      'individuation',
      'cognitive',
      'mental',
      'psychology',
      'dream',
      'symbol',
      'personality',
    ],
  },

  philosophical: {
    id: 'philosophical',
    name: 'Philosophical',
    description: 'Metaphysics, ethics, epistemology, ontology, philosophical inquiry',
    retrievalStrategy: 'hybrid',
    defaultModel: 'claude-3-5-sonnet-latest',
    systemPrompt: `You are analyzing this question through a philosophical lens. Focus on:
- Metaphysical questions about being, reality, and existence
- Epistemology: how we know what we know
- Ethics and moral philosophy
- Ontology and the nature of existence
- Logic and reasoned argumentation
- Philosophical traditions and schools of thought

Examine the fundamental questions and logical implications underlying the topic.`,
    keywords: [
      'metaphysics',
      'ontology',
      'epistemology',
      'ethics',
      'philosophy',
      'being',
      'existence',
      'reality',
      'truth',
      'reason',
      'logic',
      'virtue',
    ],
  },

  religious_spiritual: {
    id: 'religious_spiritual',
    name: 'Religious/Spiritual',
    description: 'Comparative theology, mysticism, sacred texts, spiritual practices',
    retrievalStrategy: 'hybrid',
    defaultModel: 'gemini-1-5-pro',
    systemPrompt: `You are analyzing this question through a religious and spiritual lens. Focus on:
- Comparative theology across traditions
- Mystical experiences and direct spiritual insight
- Sacred texts and religious scriptures
- Spiritual practices and contemplative traditions
- The divine, transcendent, or sacred
- How different religious traditions approach the topic

Honor the depth and diversity of religious and spiritual perspectives while finding common threads.`,
    keywords: [
      'religion',
      'spiritual',
      'theology',
      'mystical',
      'sacred',
      'divine',
      'transcendent',
      'contemplative',
      'prayer',
      'meditation',
      'scripture',
      'holy',
    ],
  },

  historical_anthropological: {
    id: 'historical_anthropological',
    name: 'Historical/Anthropological',
    description: 'Cultural evolution, mythology, ritual context, human history',
    retrievalStrategy: 'hybrid',
    defaultModel: 'gemini-1-5-pro',
    systemPrompt: `You are analyzing this question through a historical and anthropological lens. Focus on:
- Cultural evolution and human history
- Mythology and traditional narratives
- Ritual practices and their contexts
- How ideas and practices evolved across cultures
- Historical figures and movements
- Anthropological studies of human societies

Understand how the topic has been understood and practiced across different cultures and time periods.`,
    keywords: [
      'history',
      'mythology',
      'culture',
      'anthropology',
      'ritual',
      'tradition',
      'ancient',
      'civilization',
      'society',
      'myth',
      'legend',
      'archaeology',
    ],
  },

  symbolic_occult: {
    id: 'symbolic_occult',
    name: 'Symbolic/Occult',
    description: 'Correspondences, alchemy, astrology, esoteric symbolism',
    retrievalStrategy: 'hybrid',
    defaultModel: 'claude-3-5-sonnet-latest',
    systemPrompt: `You are analyzing this question through a symbolic and occult lens. Focus on:
- Esoteric correspondences and symbolic relationships
- Alchemical principles and transformation
- Astrological associations and influences
- Hermetic philosophy ("as above, so below")
- Symbolic meaning and interpretation
- Esoteric traditions and occult knowledge

Explore how symbols, correspondences, and esoteric frameworks illuminate the topic's deeper layers.`,
    keywords: [
      'symbol',
      'correspondence',
      'alchemy',
      'astrology',
      'esoteric',
      'occult',
      'hermetic',
      'transmutation',
      'planetary',
      'element',
      'tarot',
      'kabbalah',
    ],
  },

  mathematical: {
    id: 'mathematical',
    name: 'Mathematical',
    description: 'Sacred geometry, numerology, patterns, universal ratios',
    retrievalStrategy: 'hybrid',
    defaultModel: 'gpt-4o',
    systemPrompt: `You are analyzing this question through a mathematical lens. Focus on:
- Sacred geometry and geometric principles
- Numerology and numerical patterns
- Universal ratios (golden ratio, fibonacci sequence)
- Mathematical structures in nature
- Platonic solids and geometric forms
- Patterns, cycles, and mathematical relationships

Examine how mathematical principles, ratios, and patterns manifest in the topic and reveal underlying order.`,
    keywords: [
      'geometry',
      'mathematical',
      'ratio',
      'number',
      'pattern',
      'fibonacci',
      'golden ratio',
      'sacred geometry',
      'numerology',
      'proportion',
      'harmony',
      'cycle',
    ],
  },
};

/**
 * Get lens by ID
 */
export function getLens(lensId: LensType): Lens {
  return LENSES[lensId];
}

/**
 * Get all lenses
 */
export function getAllLenses(): Lens[] {
  return Object.values(LENSES);
}

/**
 * Get active lenses based on weights
 * Returns lenses with weight > 0
 */
export function getActiveLenses(lensWeights: Record<LensType, number>): Lens[] {
  return getAllLenses().filter(lens => (lensWeights[lens.id] || 0) > 0);
}

