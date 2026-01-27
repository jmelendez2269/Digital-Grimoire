export type TarotCard = {
    id: number;
    name: string;
    arcana: 'Major' | 'Minor';
    suit?: 'Wands' | 'Cups' | 'Swords' | 'Pentacles';
    keywords: string[];
    meaning_upright: string;
    meaning_reversed: string;
};

export const MAJOR_ARCANA: TarotCard[] = [
    {
        id: 0,
        name: "The Fool",
        arcana: "Major",
        keywords: ["Beginnings", "Innocence", "Leap of Faith"],
        meaning_upright: "New beginnings, optimism, trust in life.",
        meaning_reversed: "Recklessness, risk-taking, inconsideration."
    },
    {
        id: 1,
        name: "The Magician",
        arcana: "Major",
        keywords: ["Manifestation", "Power", "Action"],
        meaning_upright: "Action, the power to manifest.",
        meaning_reversed: "Manipulation, poor planning, latent talents."
    },
    {
        id: 2,
        name: "The High Priestess",
        arcana: "Major",
        keywords: ["Intuition", "Unconscious", "Mystery"],
        meaning_upright: "Intuition, higher powers, mystery, subconscious mind.",
        meaning_reversed: "Hidden agendas, need to listen to inner voice."
    },
    {
        id: 3,
        name: "The Empress",
        arcana: "Major",
        keywords: ["Fertility", "Femininity", "Beauty"],
        meaning_upright: "Fertility, femininity, beauty, nature, abundance.",
        meaning_reversed: "Creative block, dependence on others."
    },
    {
        id: 4,
        name: "The Emperor",
        arcana: "Major",
        keywords: ["Authority", "Structure", "Control"],
        meaning_upright: "Authority, structure, control, fatherhood.",
        meaning_reversed: "Domination, excessive control, lack of discipline."
    },
    // ... Truncated for MVP brevity, imagine 5-21 here
    {
        id: 13,
        name: "Death",
        arcana: "Major",
        keywords: ["Endings", "Change", "Transformation"],
        meaning_upright: "Endings, change, transformation, transition.",
        meaning_reversed: "Resistance to change, personal transformation."
    },
    {
        id: 19,
        name: "The Sun",
        arcana: "Major",
        keywords: ["Positivity", "Fun", "Warmth"],
        meaning_upright: "Positivity, fun, warmth, success, vitality.",
        meaning_reversed: "Inner child, feeling down, overly optimistic."
    },
    {
        id: 21,
        name: "The World",
        arcana: "Major",
        keywords: ["Completion", "Integration", "Travel"],
        meaning_upright: "Completion, integration, accomplishment, travel.",
        meaning_reversed: "Seeking personal closure, short-cuts, delays."
    }
];

// Helper to simulate full deck
export const getFullDeck = () => MAJOR_ARCANA; 
