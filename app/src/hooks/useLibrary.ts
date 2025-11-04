import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface Text {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  type: string | null;
  domain: string | null;
  tags: string[] | null;
  lenses: string[] | null;
  file_size: number | null;
  status: string;
  created_at: string;
  cover_image_url: string | null;
  short_summary: string | null;
  curator_note: string | null;
  metadata?: any;
}

export interface FilterValues {
  domain: string;
  type: string;
  yearMin: number | null;
  yearMax: number | null;
  tags: string[];
  lenses: string[];
}

export interface LibraryTextsResponse {
  texts: Text[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  domains: string[];
  types: string[];
  allTags: string[];
  allLenses: string[];
}

interface UseLibraryTextsParams {
  page: number;
  limit: number;
  searchQuery: string;
  filterValues: FilterValues;
  sortBy: 'title' | 'author' | 'year' | 'created_at' | 'domain' | 'type';
  sortOrder: 'asc' | 'desc';
  enabled?: boolean;
}

export function useLibraryTexts({
  page,
  limit,
  searchQuery,
  filterValues,
  sortBy,
  sortOrder,
  enabled = true,
}: UseLibraryTextsParams): UseQueryResult<LibraryTextsResponse, Error> {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'library',
      'texts',
      page,
      limit,
      searchQuery,
      filterValues.domain,
      filterValues.type,
      filterValues.yearMin,
      filterValues.yearMax,
      filterValues.tags.join(','),
      filterValues.lenses.join(','),
      sortBy,
      sortOrder,
    ],
    queryFn: async (): Promise<LibraryTextsResponse> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (filterValues.domain !== 'all') {
        params.append('domain', filterValues.domain);
      }
      if (filterValues.type !== 'all') {
        params.append('type', filterValues.type);
      }
      if (filterValues.yearMin !== null) {
        params.append('yearMin', filterValues.yearMin.toString());
      }
      if (filterValues.yearMax !== null) {
        params.append('yearMax', filterValues.yearMax.toString());
      }
      if (filterValues.tags.length > 0) {
        params.append('tags', filterValues.tags.join(','));
      }
      if (filterValues.lenses.length > 0) {
        params.append('lenses', filterValues.lenses.join(','));
      }
      if (sortBy) {
        params.append('sortBy', sortBy);
      }
      if (sortOrder) {
        params.append('sortOrder', sortOrder);
      }

      const response = await fetch(`/api/texts?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to load library (${response.status})`);
      }

      const data = await response.json();
      return {
        texts: data.texts || [],
        total: data.total || 0,
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.totalPages || 0,
      };
    },
    enabled: enabled && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes for library data
  });
}

export function useLibraryFilterOptions(): UseQueryResult<FilterOptions, Error> {
  const { supabase, user } = useAuth();

  return useQuery({
    queryKey: ['library', 'filterOptions'],
    queryFn: async (): Promise<FilterOptions> => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Fetch all documents to extract unique values
      const { data, error } = await supabase
        .from('texts')
        .select('domain, type, tags, lenses');

      if (error) throw error;

      if (!data) {
        return {
          domains: [],
          types: [],
          allTags: [],
          allLenses: [],
        };
      }

      // Extract unique domains
      const domains = Array.from(
        new Set(data.map((t) => t.domain).filter(Boolean))
      ) as string[];

      // Extract unique types
      const types = Array.from(
        new Set(data.map((t) => t.type).filter(Boolean))
      ) as string[];

      // Extract unique tags
      const tagsSet = new Set<string>();
      data.forEach((t) => {
        if (t.tags && Array.isArray(t.tags)) {
          t.tags.forEach((tag) => tagsSet.add(tag));
        }
      });

      // Extract unique lenses
      const lensesSet = new Set<string>();
      data.forEach((t) => {
        if (t.lenses && Array.isArray(t.lenses)) {
          t.lenses.forEach((lens) => lensesSet.add(lens));
        }
      });

      // Always show all 7 lenses in a specific order
      const allSevenLenses = [
        'scientific',
        'psychological',
        'philosophical',
        'religious_spiritual',
        'historical_anthropological',
        'symbolic_occult',
        'mathematical',
      ];

      return {
        domains: domains.sort(),
        types: types.sort(),
        allTags: Array.from(tagsSet).sort(),
        allLenses: allSevenLenses,
      };
    },
    enabled: !!supabase && !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes - filter options change rarely
  });
}

