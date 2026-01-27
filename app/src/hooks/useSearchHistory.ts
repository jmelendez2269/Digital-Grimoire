import { useState, useCallback } from 'react';
import { SearchHistoryEntry, SearchSource } from '@/lib/search/types';

export function useSearchHistory() {
    const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async (source?: SearchSource) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (source) params.set('source', source);

            const res = await fetch(`/api/search/history?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch history');

            const data = await res.json();
            setHistory(data.history);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const addHistory = useCallback(async (query: string, source: SearchSource, metadata: any = {}) => {
        try {
            const res = await fetch('/api/search/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, source, metadata }),
            });
            if (!res.ok) throw new Error('Failed to save history');

            const newEntry = await res.json();
            setHistory(prev => [newEntry, ...prev]);
        } catch (err: any) {
            console.error('Error saving history:', err);
            // Optional: set error state
        }
    }, []);

    const deleteHistory = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/search/history?id=${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete history');
            setHistory(prev => prev.filter(item => item.id !== id));
        } catch (err: any) {
            console.error('Error deleting history entry:', err);
        }
    }, []);

    return {
        history,
        loading,
        error,
        fetchHistory,
        addHistory,
        deleteHistory
    };
}
