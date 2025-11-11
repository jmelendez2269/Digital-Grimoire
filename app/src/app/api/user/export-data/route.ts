import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/export-data
 * 
 * Exports all user data in JSON format (GDPR compliant)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Fetch all user data in parallel
    const [
      userProfile,
      annotations,
      bookmarks,
      collections,
      readingProgress,
      journalPages,
      uploadedDocuments,
      feedback
    ] = await Promise.all([
      // User profile
      supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single(),

      // Annotations
      supabase
        .from('user_annotations')
        .select(`
          *,
          texts (
            id,
            title,
            author
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),

      // Bookmarks
      supabase
        .from('user_bookmarks')
        .select(`
          *,
          texts (
            id,
            title,
            author
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),

      // Collections
      supabase
        .from('user_collections')
        .select(`
          *,
          collection_items (
            id,
            text_id,
            texts (
              id,
              title,
              author
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),

      // Reading progress
      supabase
        .from('reading_progress')
        .select(`
          *,
          texts (
            id,
            title,
            author
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: true }),

      // Journal pages
      supabase
        .from('journal_pages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),

      // Uploaded documents
      supabase
        .from('texts')
        .select('*')
        .eq('uploaded_by', userId)
        .order('created_at', { ascending: true }),

      // Feedback
      supabase
        .from('feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
    ]);

    // Compile export data
    const exportData = {
      export_date: new Date().toISOString(),
      user_id: userId,
      account: {
        email: user.email,
        profile: userProfile.data,
        metadata: user.user_metadata,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at
      },
      data: {
        annotations: annotations.data || [],
        bookmarks: bookmarks.data || [],
        collections: collections.data || [],
        reading_progress: readingProgress.data || [],
        journal_pages: journalPages.data || [],
        uploaded_documents: uploadedDocuments.data || [],
        feedback: feedback.data || []
      },
      summary: {
        total_annotations: annotations.data?.length || 0,
        total_bookmarks: bookmarks.data?.length || 0,
        total_collections: collections.data?.length || 0,
        total_reading_progress: readingProgress.data?.length || 0,
        total_journal_pages: journalPages.data?.length || 0,
        total_uploaded_documents: uploadedDocuments.data?.length || 0,
        total_feedback: feedback.data?.length || 0
      }
    };

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `convergence-data-export-${timestamp}.json`;

    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export data. Please contact support.' },
      { status: 500 }
    );
  }
}

