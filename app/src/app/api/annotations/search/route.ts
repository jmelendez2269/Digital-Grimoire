import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * PostgreSQL Full-Text Search API for Annotations
 * 
 * Supports:
 * - Full-text search with ranking
 * - Pagination
 * - Filtering by category, color, text_id
 * - Date range filtering
 * - Highlighted snippets
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const category = searchParams.get('category');
    const color = searchParams.get('color');
    const textId = searchParams.get('text_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const offset = (page - 1) * pageSize;

    // If no query, return recent annotations with filters
    if (!query || query.trim() === '') {
      let baseQuery = supabase
        .from('user_annotations')
        .select(`
          *,
          texts (
            id,
            title,
            author
          )
        `, { count: 'exact' })
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (category) baseQuery = baseQuery.eq('category', category);
      if (color) baseQuery = baseQuery.eq('color', color);
      if (textId) baseQuery = baseQuery.eq('text_id', textId);
      if (dateFrom) baseQuery = baseQuery.gte('created_at', dateFrom);
      if (dateTo) baseQuery = baseQuery.lte('created_at', dateTo);

      const { data: annotations, error, count } = await baseQuery
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Error fetching annotations:', error);
        return NextResponse.json(
          { error: 'Failed to fetch annotations' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        annotations: annotations || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      });
    }

    // Prepare search query for PostgreSQL
    // Convert to tsquery format (spaces to &, handle special chars)
    const searchQuery = query
      .trim()
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(Boolean)
      .join(' & ');

    if (!searchQuery) {
      return NextResponse.json({
        annotations: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }

    // Build the full-text search query using RPC
    // We'll use a custom SQL query for better control over ranking and highlighting
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_annotations',
      {
        search_query: searchQuery,
        user_id_param: session.user.id,
        category_filter: category,
        color_filter: color,
        text_id_filter: textId,
        date_from_filter: dateFrom,
        date_to_filter: dateTo,
        limit_param: pageSize,
        offset_param: offset,
      }
    );

    // If RPC doesn't exist yet, fall back to direct query
    if (searchError && searchError.code === '42883') {
      // Function doesn't exist, use direct query
      let query_builder = supabase
        .from('user_annotations')
        .select(`
          *,
          texts (
            id,
            title,
            author
          )
        `, { count: 'exact' })
        .eq('user_id', session.user.id)
        .textSearch('search_vector', searchQuery)
        .order('created_at', { ascending: false });

      // Apply filters
      if (category) query_builder = query_builder.eq('category', category);
      if (color) query_builder = query_builder.eq('color', color);
      if (textId) query_builder = query_builder.eq('text_id', textId);
      if (dateFrom) query_builder = query_builder.gte('created_at', dateFrom);
      if (dateTo) query_builder = query_builder.lte('created_at', dateTo);

      const { data: annotations, error, count } = await query_builder
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Error searching annotations:', error);
        return NextResponse.json(
          { error: 'Failed to search annotations' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        annotations: annotations || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
        query: searchQuery,
      });
    }

    if (searchError) {
      console.error('Error searching annotations:', searchError);
      return NextResponse.json(
        { error: 'Failed to search annotations' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('user_annotations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .textSearch('search_vector', searchQuery);

    return NextResponse.json({
      annotations: searchResults || [],
      total: totalCount || 0,
      page,
      pageSize,
      totalPages: Math.ceil((totalCount || 0) / pageSize),
      query: searchQuery,
    });
  } catch (error) {
    console.error('Error in GET /api/annotations/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

