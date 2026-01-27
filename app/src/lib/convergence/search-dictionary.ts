/**
 * Search Dictionary for Esoteric Terms
 * 
 * Maps primary concepts to their common transliteration variants, 
 * historical synonyms, and related core principles.
 */

export interface TermMapping {
    primary: string;
    variants: string[];
    category?: 'sanskrit' | 'hermetic' | 'kabbalah' | 'alchemy' | 'general';
}

export const ESOTERIC_DICTIONARY: TermMapping[] = [
    {
        primary: 'Parabrahman',
        variants: ['Parabrahm', 'Para Brahman', 'Paramatman', 'The Absolute'],
        category: 'sanskrit'
    },
    {
        primary: 'Brahman',
        variants: ['Brahma', 'Brahm'],
        category: 'sanskrit'
    },
    {
        primary: 'Hermetic',
        variants: ['Hermeticism', 'Hermes Trismegistus', 'Thoth'],
        category: 'hermetic'
    },
    {
        primary: 'Alchemy',
        variants: ['Alchemical', 'Alchemist', 'Magnum Opus', 'Spagyric'],
        category: 'alchemy'
    },
    {
        primary: 'Kabbalah',
        variants: ['Qabalah', 'Cabala', 'Sephiroth', 'Tree of Life'],
        category: 'kabbalah'
    },
    {
        primary: 'Gnosis',
        variants: ['Gnostic', 'Gnosticism', 'Direct Knowledge'],
        category: 'general'
    },
    {
        primary: 'Microcosm',
        variants: ['As above so below', 'Individual self'],
        category: 'hermetic'
    },
    {
        primary: 'Macrocosm',
        variants: ['The Universe', 'Grand Man', 'Adam Kadmon'],
        category: 'hermetic'
    }
];

/**
 * Get all variants for a given term (including the term itself)
 */
export function getSearchVariants(query: string): string[] {
    const queryLower = query.toLowerCase().trim();

    // Find a mapping that contains the query (as primary or variant)
    const mapping = ESOTERIC_DICTIONARY.find(entry =>
        entry.primary.toLowerCase() === queryLower ||
        entry.variants.some(v => v.toLowerCase() === queryLower)
    );

    if (!mapping) return [query];

    // Return unique combination of primary and all variants
    const allTerms = new Set([mapping.primary, ...mapping.variants]);
    return Array.from(allTerms);
}

/**
 * Check if two terms are related via the dictionary
 */
export function areTermsRelated(term1: string, term2: string): boolean {
    const v1 = getSearchVariants(term1);
    const v2 = getSearchVariants(term2);

    // If they share any variants (or the primary term), they are related
    return v1.some(t => v2.includes(t));
}
