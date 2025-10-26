import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/annotations?text_id=xxx - Get annotations for a specific text
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
    const text_id = searchParams.get('text_id');

    if (!text_id) {
      // Get all annotations for user
      const { data, error } = await supabase
        .from('user_annotations')
        .select(`
          *,
          texts (
            id,
            title,
            author
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching annotations:', error);
        return NextResponse.json(
          { error: 'Failed to fetch annotations' },
          { status: 500 }
        );
      }

      return NextResponse.json({ annotations: data || [] });
    }

    // Get annotations for specific text
    const { data, error } = await supabase
      .from('user_annotations')
      .select('*')
      .eq('user_id', user.id)
      .eq('text_id', text_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching annotations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch annotations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ annotations: data || [] });
  } catch (error) {
    console.error('Error in GET /api/annotations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/annotations - Create an annotation
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
    const { text_id, quote, note, position } = body;

    if (!text_id || !quote) {
      return NextResponse.json(
        { error: 'text_id and quote are required' },
        { status: 400 }
      );
    }

    // Create annotation
    const { data, error } = await supabase
      .from('user_annotations')
      .insert({
        user_id: user.id,
        text_id,
        quote,
        note: note || null,
        position: position || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating annotation:', error);
      return NextResponse.json(
        { error: 'Failed to create annotation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ annotation: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/annotations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/annotations/:id - Update an annotation
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
        { error: 'annotation id is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { quote, note, position } = body;

    const updateData: any = {};
    if (quote !== undefined) updateData.quote = quote;
    if (note !== undefined) updateData.note = note;
    if (position !== undefined) updateData.position = position;

    // Update annotation
    const { data, error } = await supabase
      .from('user_annotations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating annotation:', error);
      return NextResponse.json(
        { error: 'Failed to update annotation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ annotation: data });
  } catch (error) {
    console.error('Error in PUT /api/annotations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/annotations?id=xxx - Delete an annotation
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
        { error: 'annotation id is required' },
        { status: 400 }
      );
    }

    // Delete annotation
    const { error } = await supabase
      .from('user_annotations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting annotation:', error);
      return NextResponse.json(
        { error: 'Failed to delete annotation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/annotations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

