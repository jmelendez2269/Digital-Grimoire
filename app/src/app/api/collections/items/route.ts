import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/collections/items - Add an item to a collection
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
    const { collection_id, text_id, notes } = body;

    if (!collection_id || !text_id) {
      return NextResponse.json(
        { error: 'collection_id and text_id are required' },
        { status: 400 }
      );
    }

    // Verify collection belongs to user
    const { data: collection } = await supabase
      .from('user_collections')
      .select('id')
      .eq('id', collection_id)
      .eq('user_id', user.id)
      .single();

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found or access denied' },
        { status: 404 }
      );
    }

    // Check if item already exists in collection
    const { data: existing } = await supabase
      .from('collection_items')
      .select('id')
      .eq('collection_id', collection_id)
      .eq('text_id', text_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Item already exists in collection' },
        { status: 409 }
      );
    }

    // Add item to collection
    const { data, error } = await supabase
      .from('collection_items')
      .insert({
        collection_id,
        text_id,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding item to collection:', error);
      return NextResponse.json(
        { error: 'Failed to add item to collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/collections/items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/items?collection_id=xxx&text_id=xxx - Remove an item from a collection
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
    const collection_id = searchParams.get('collection_id');
    const text_id = searchParams.get('text_id');

    if (!collection_id || !text_id) {
      return NextResponse.json(
        { error: 'collection_id and text_id are required' },
        { status: 400 }
      );
    }

    // Verify collection belongs to user
    const { data: collection } = await supabase
      .from('user_collections')
      .select('id')
      .eq('id', collection_id)
      .eq('user_id', user.id)
      .single();

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found or access denied' },
        { status: 404 }
      );
    }

    // Remove item from collection
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collection_id)
      .eq('text_id', text_id);

    if (error) {
      console.error('Error removing item from collection:', error);
      return NextResponse.json(
        { error: 'Failed to remove item from collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/collections/items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

