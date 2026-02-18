export type SearchSource = 'library' | 'concept' | 'parallax';

export interface SearchHistoryEntry {
    id: string;
    user_id: string;
    query: string;
    source: SearchSource;
    metadata: Record<string, any>;
    created_at: string;
}

export interface SearchHistoryResponse {
    history: SearchHistoryEntry[];
    total: number;
}
