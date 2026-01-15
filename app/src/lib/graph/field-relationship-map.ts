/**
 * Mapping of field keys to suggested relationship types
 * Used when converting property values to entities
 */
export const FIELD_RELATIONSHIP_MAP: Record<string, string> = {
  element: 'corresponds_to',
  planet: 'governs',
  dominant_planet: 'governs',
  secondary_planets: 'governs',
  zodiac: 'associated_with',
  chakra: 'corresponds_to',
  deity: 'associated_with',
  god: 'associated_with',
  goddess: 'associated_with',
  angel: 'associated_with',
  demon: 'associated_with',
  tarot: 'corresponds_to',
  sephirah: 'corresponds_to',
  path: 'corresponds_to',
  metal: 'corresponds_to',
  herb: 'associated_with',
  color: 'corresponds_to',
  sign: 'associated_with',
  house: 'associated_with',
  gemstone: 'associated_with',
  crystal: 'associated_with',
  stone: 'associated_with',
  note: 'corresponds_to',
  musical_note: 'corresponds_to',
  incense: 'associated_with',
  symbol: 'corresponds_to',
  offerings: 'associated_with',
  taboos: 'opposes',
  // Default fallback
  default: 'associated_with',
};

/**
 * Get suggested relationship type for a field key
 */
export function getSuggestedRelationshipType(fieldKey: string): string {
  return FIELD_RELATIONSHIP_MAP[fieldKey] || FIELD_RELATIONSHIP_MAP.default;
}
