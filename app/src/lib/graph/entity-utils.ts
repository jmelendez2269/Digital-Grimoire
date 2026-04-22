/**
 * Utility functions for entity operations
 */

/**
 * Parse a property value that may contain comma-separated values
 */
export function parsePropertyValue(value: string): string[] {
  if (!value || typeof value !== 'string') {
    return [];
  }
  
  return value
    .split(',')
    .map(v => v.trim())
    .filter(v => v.length > 0);
}

/**
 * Suggest entity category based on field key
 * Returns null if no suggestion can be made
 */
export function suggestCategoryFromField(fieldKey: string): string | null {
  const fieldToCategory: Record<string, string> = {
    element: 'element',
    planet: 'planet',
    dominant_planet: 'planet',
    secondary_planets: 'planet',
    zodiac: 'sign',
    chakra: 'other', // No chakra category, use other
    deity: 'deity',
    god: 'deity',
    goddess: 'deity',
    angel: 'angel',
    demon: 'demon',
    tarot: 'tarot',
    sephirah: 'sephirah',
    path: 'path',
    metal: 'metal',
    herb: 'herb',
    color: 'color',
    sign: 'sign',
    house: 'house',
    gemstone: 'stone',
    crystal: 'stone',
    stone: 'stone',
    note: 'note',
    musical_note: 'note',
    incense: 'herb', // Incense could be herb or other
    symbol: 'other',
    offerings: 'other',
    taboos: 'other',
  };
  
  return fieldToCategory[fieldKey] || null;
}

/**
 * Map original entity category to a field key for backwards compatibility claims
 * When entity A (category X) is converted from entity B's property,
 * entity A should have entity B listed in an appropriate field
 */
export function getBackwardsFieldKey(originalCategory: string): string {
  const categoryToField: Record<string, string> = {
    stone: 'gemstone',
    planet: 'planet',
    element: 'element',
    deity: 'deity',
    angel: 'angel',
    demon: 'demon',
    tarot: 'tarot',
    sephirah: 'sephirah',
    path: 'path',
    metal: 'metal',
    herb: 'herb',
    color: 'color',
    sign: 'zodiac',
    house: 'house',
    note: 'musical_note',
    other: 'notes',
  };
  
  return categoryToField[originalCategory] || 'notes';
}

/**
 * Generate a URL-friendly slug from an entity name
 */
export function slugifyEntityName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Heuristic guardrail for imported correspondence labels that are actually
 * descriptive sentences or parsing spillover rather than stable entities.
 */
export function isSentenceLikeEntityName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const normalized = name.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return false;
  }

  const wordCount = normalized.split(/\s+/).length;

  if (/[!?]/.test(normalized) || /\.\s+[A-Z]/.test(normalized)) {
    return true;
  }

  if (normalized.length > 120 || wordCount > 18) {
    return true;
  }

  if (wordCount >= 10 && /,/.test(normalized) && !/[()]/.test(normalized)) {
    return true;
  }

  if (
    wordCount >= 7 &&
    /\b(which|touching|represents|consciousness|offering|offerings|experience|experiences|through|radiance|spectrum)\b/i.test(normalized)
  ) {
    return true;
  }

  return false;
}
