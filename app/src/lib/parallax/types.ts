import { AIModel } from '@/lib/ai/types';

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

export interface LensWeights {
    scientific: number;
    psychological: number;
    philosophical: number;
    religious_spiritual: number;
    historical_anthropological: number;
    symbolic_occult: number;
    mathematical: number;
}

export type ResponseLength = 'short' | 'medium' | 'long';

export interface ResponseLengthConfig {
    synthesisMaxTokens: number;
    lensMaxTokens: number;
    lensSummaryMaxTokens: number;
}

export interface LensResponse {
    lens: LensType;
    lensName: string;
    content: string;
    sources: Array<{
        text_id: string;
        text_title?: string;
        text_author?: string;
        chunk_id?: string;
        chunk_index?: number;
        relevance: number;
        content_preview?: string; // First 200 chars of chunk content
    }>;
}

export interface MultiLensResponse {
    query: string;
    responses: LensResponse[];
    synthesis: string;
    sources: Array<{
        text_id: string;
        text_title?: string;
        text_author?: string;
        chunk_id?: string;
        chunk_index?: number;
        relevance?: number;
    }>;
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
}
