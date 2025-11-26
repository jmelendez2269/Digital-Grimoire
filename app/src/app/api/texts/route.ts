import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const domain = searchParams.get('domain');
    const type = searchParams.get('type');
    const yearMin = searchParams.get('yearMin');
    const yearMax = searchParams.get('yearMax');
    const tags = searchParams.get('tags'); // Comma-separated
    const lenses = searchParams.get('lenses'); // Comma-separated
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = supabase
      .from('texts')
      .select('*', { count: 'exact' } as any) as any;

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }

    // Apply domain filter
    if (domain && domain !== 'all') {
      query = query.eq('domain', domain);
    }

    // Apply type filter
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // Apply year range filter
    if (yearMin) {
      query = query.gte('year', parseInt(yearMin));
    }
    if (yearMax) {
      query = query.lte('year', parseInt(yearMax));
    }

    // Apply tags filter
    if (tags) {
      const tagsArray = tags.split(',').filter(t => t.trim());
      if (tagsArray.length > 0) {
        query = query.overlaps('tags', tagsArray);
      }
    }

    // Apply lenses filter
    if (lenses) {
      const lensesArray = lenses.split(',').filter(l => l.trim());
      if (lensesArray.length > 0) {
        query = query.overlaps('lenses', lensesArray);
      }
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    const validSortFields = ['title', 'author', 'year', 'created_at', 'domain', 'type'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    
    // Special handling for title sorting to ignore articles (a, an, the)
    if (sortField === 'title') {
      // Since Supabase order() doesn't support expressions, we'll sort after fetching
      // Fetch all matching records (without pagination) to sort properly
      const { data: allData, error: fetchError, count } = await (query as any).select('*', { count: 'exact' });
      
      if (fetchError) {
        console.error('Database error:', fetchError);
        return NextResponse.json(
          { error: 'Database error', details: fetchError.message },
          { status: 500 }
        );
      }
      
      // Sort by title with articles ignored
      const sortedData = (allData || []).sort((a: any, b: any) => {
        const stripArticles = (title: string | null): string => {
          if (!title) return '';
          const lowerTitle = title.toLowerCase().trim();
          // Remove leading articles: "a ", "an ", "the "
          const withoutArticles = lowerTitle.replace(/^(a|an|the)\s+/i, '');
          return withoutArticles;
        };
        
        const titleA = stripArticles(a.title);
        const titleB = stripArticles(b.title);
        
        if (ascending) {
          return titleA.localeCompare(titleB);
        } else {
          return titleB.localeCompare(titleA);
        }
      });
      
      // Apply pagination after sorting
      const from = (page - 1) * limit;
      const to = from + limit;
      const paginatedData = sortedData.slice(from, to);
      
      const response = NextResponse.json({
        texts: paginatedData || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      });
      
      // Add cache headers for public, read-only data (5-15 minutes)
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=600'
      );
      
      return response;
    } else {
      // For non-title sorting, use normal database sorting with pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      query = query.order(sortField, { ascending, nullsFirst: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Database error', details: error.message },
          { status: 500 }
        );
      }

      const response = NextResponse.json({
        texts: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      });
      
      // Add cache headers for public, read-only data (5-15 minutes)
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=600'
      );
      
      return response;
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

