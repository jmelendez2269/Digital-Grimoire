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

/**
 * Common English stop words to exclude from keyword density and partial match calculations
 * tailored for minimizing false positives in title/concept matching.
 */
export const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'can\'t', 'cannot', 'could', 'couldn\'t',
    'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
    'each',
    'few', 'for', 'from', 'further',
    'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
    'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
    'let\'s',
    'me', 'more', 'most', 'mustn\'t', 'my', 'myself',
    'no', 'nor', 'not',
    'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
    'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
    'under', 'until', 'up',
    'very',
    'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t',
    'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);
