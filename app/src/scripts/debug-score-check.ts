
import { STOP_WORDS } from '../lib/parallax/search-dictionary';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'debug_score_output.txt');
fs.writeFileSync(LOG_FILE, '');

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

// --- MOCK LOGIC FROM route.ts ---

function cleanQueryForScoring(query: string): string {
    return query.toLowerCase().split(/\s+/)
        .filter(w => !STOP_WORDS.has(w))
        .join(' ');
}

function calculateKeywordFrequency(content: string, query: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

    if (queryWords.length === 0) return 0;

    let totalMatches = 0;
    for (const word of queryWords) {
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = contentLower.match(regex);
        totalMatches += matches ? matches.length : 0;
    }

    // Normalize by content length (words per 1000 words)
    const contentWords = contentLower.split(/\s+/).length;
    // Bug fix reproduction? No, copying current logic
    return contentWords > 0 ? (totalMatches / contentWords) * 1000 : 0;
}

function calculateRelevanceScore(
    title: string,
    content: string,
    query: string,
    vectorScore?: number,
    ftsScore?: number
): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

    // Clean query for exact/phrase matching
    const cleanQuery = cleanQueryForScoring(query);
    const cleanTitle = cleanQueryForScoring(title);

    log(`Debug: cleanQuery="${cleanQuery}", cleanTitle="${cleanTitle}"`);
    log(`Debug: queryWords=[${queryWords.join(', ')}]`);

    // 1. Base Score: Blend Vector (Semantic) and FTS (Keyword)
    let score = 0;
    if (vectorScore !== undefined && ftsScore !== undefined) {
        const normVector = Math.max(0, (vectorScore - 0.5) / 0.5);
        const normFts = Math.min(1.0, ftsScore);
        score = (normVector * 0.5) + (normFts * 0.5);
        log(`Debug: Base score (Hybrid): ${score.toFixed(4)} (Vector=${normVector.toFixed(4)}, FTS=${normFts.toFixed(4)})`);
    } else if (vectorScore !== undefined) {
        score = Math.max(0, (vectorScore - 0.5) / 0.5);
    } else if (ftsScore !== undefined) {
        score = Math.min(1.0, ftsScore);
    }

    // 2. Keyword Density Boost
    const keywordFreq = calculateKeywordFrequency(contentLower, query);
    const keywordBoost = Math.min(0.2, keywordFreq / 50);
    score += keywordBoost;
    log(`Debug: Keyword Boost: +${keywordBoost.toFixed(4)} (Freq=${keywordFreq.toFixed(2)})`);

    // 3. Title Match Boost
    if (cleanTitle === cleanQuery) {
        score += 0.5;
        log('Debug: Title Boost (Exact): +0.5');
    } else if (cleanTitle.includes(cleanQuery)) {
        score += 0.3;
        log('Debug: Title Boost (Contains): +0.3');
    } else {
        // Partial word match boost
        const titleMatchCount = queryWords.filter(word => title.toLowerCase().includes(word)).length;
        if (titleMatchCount > 0 && queryWords.length > 0) {
            const boost = 0.2 * (titleMatchCount / queryWords.length);
            score += boost;
            log(`Debug: Title Boost (Partial): +${boost.toFixed(4)}`);
        }
    }

    // 4. Exact Phrase Boost
    if (contentLower.includes(cleanQuery)) {
        score += 0.25;
        log('Debug: Phrase Boost: +0.25');
    }

    return Math.min(1.0, score);
}

// --- TEST CASES ---

const QUERY = "The Seven sons";

// Case 1: The Secret Doctrine (Actual Chunk 62)
const SD_CHUNK = `The triad forms within the circle the Tetraktis or Sacred Four, the Square within the Circle being the most potent of all the magical figures .  ( c ) The "One Rejected" is the Sun of our system .  There therefore must be many Fohats, whom we consider as conscious and intelligent Forces .  This, no doubt, to the modern physicist...`;
const SD_TITLE = "The Secret Doctrine";

// Case 2: Irrelevant Book ( Lots of "The", no "Seven sons")
const NOISE_CHUNK = `The man went to the store and the dog barked at the moon. The end of the story is that the cat meowed. The the the.`;
const NOISE_TITLE = "The Great Gatsby";

log(`\n\n=== TEST 1: RELEVANT (Secret Doctrine) ===`);
// Note: In real app, FTS score for "Seven sons" matches would be high. 
// If vector score is high but FTS is low (unlikely if chunks contain keys), score is blended.
const score1 = calculateRelevanceScore(SD_TITLE, SD_CHUNK, QUERY, 0.8, 0.2);
log(`FINAL SCORE 1: ${score1.toFixed(4)}`);

log(`\n\n=== TEST 2: NOISE (Just "The") ===`);
// "The" should be filtered out, so "cleanQuery" is "seven sons".
// "seven sons" is NOT in noise chunk.
const score2 = calculateRelevanceScore(NOISE_TITLE, NOISE_CHUNK, QUERY, 0.6, 0.9);
log(`FINAL SCORE 2: ${score2.toFixed(4)}`);

log(`\n\n=== TEST 3: "Seven sons" in content ===`);
const MATCH_CHUNK = "And then the Seven sons of Light appeared.";
const score3 = calculateRelevanceScore(SD_TITLE, MATCH_CHUNK, QUERY, 0.9, 0.8);
log(`FINAL SCORE 3: ${score3.toFixed(4)}`);
