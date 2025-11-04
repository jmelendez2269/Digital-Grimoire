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
      .select('*', { count: 'exact' });

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

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Apply sorting
    const ascending = sortOrder === 'asc';
    const validSortFields = ['title', 'author', 'year', 'created_at', 'domain', 'type'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortField, { ascending, nullsFirst: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      texts: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

