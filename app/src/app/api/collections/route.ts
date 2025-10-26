import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/collections - Get all collections for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const include_items = searchParams.get('include_items') === 'true';

    if (include_items) {
      // Get collections with items count
      const { data, error } = await supabase
        .from('user_collections')
        .select(`
          *,
          collection_items (
            id,
            text_id,
            added_at,
            notes,
            texts (
              id,
              title,
              author,
              year,
              type,
              domain,
              status
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json(
          { error: 'Failed to fetch collections' },
          { status: 500 }
        );
      }

      return NextResponse.json({ collections: data || [] });
    }

    // Get collections without items
    const { data, error } = await supabase
      .from('user_collections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collections' },
        { status: 500 }
      );
    }

    return NextResponse.json({ collections: data || [] });
  } catch (error) {
    console.error('Error in GET /api/collections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, icon, color, is_public } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Create collection
    const { data, error } = await supabase
      .from('user_collections')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        icon: icon || '📚',
        color: color || '#f59e0b',
        is_public: is_public || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating collection:', error);
      return NextResponse.json(
        { error: 'Failed to create collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ collection: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/collections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/collections?id=xxx - Update a collection
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'collection id is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, icon, color, is_public } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (is_public !== undefined) updateData.is_public = is_public;

    // Update collection
    const { data, error } = await supabase
      .from('user_collections')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating collection:', error);
      return NextResponse.json(
        { error: 'Failed to update collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ collection: data });
  } catch (error) {
    console.error('Error in PUT /api/collections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/collections?id=xxx - Delete a collection
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'collection id is required' },
        { status: 400 }
      );
    }

    // Delete collection (will cascade delete items)
    const { error } = await supabase
      .from('user_collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting collection:', error);
      return NextResponse.json(
        { error: 'Failed to delete collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/collections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

