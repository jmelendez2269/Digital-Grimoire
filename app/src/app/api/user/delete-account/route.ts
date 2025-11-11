import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getR2Client, DeleteObjectCommand } from '@/lib/storage/r2-client';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/user/delete-account
 * 
 * Permanently deletes a user account and all associated data.
 * This includes:
 * - User profile
 * - Annotations
 * - Bookmarks
 * - Collections
 * - Reading progress
 * - Journal pages
 * - Uploaded documents (if user uploaded them)
 * - Avatar images
 * - Feedback submissions
 */
export async function DELETE(request: NextRequest) {
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

    // Get list of documents uploaded by this user (for R2 cleanup)
    const { data: userDocuments } = await supabase
      .from('texts')
      .select('id, blob_url, cover_image_url')
      .eq('uploaded_by', userId);

    // Delete user's uploaded documents from R2 storage
    if (userDocuments && userDocuments.length > 0) {
      const r2Client = getR2Client();
      const filesToDelete: string[] = [];

      for (const doc of userDocuments) {
        // Extract file paths from URLs
        if (doc.blob_url) {
          const blobPath = extractR2Path(doc.blob_url);
          if (blobPath) filesToDelete.push(blobPath);
        }
        if (doc.cover_image_url) {
          const coverPath = extractR2Path(doc.cover_image_url);
          if (coverPath) filesToDelete.push(coverPath);
        }
      }

      // Delete files from R2 (in batches if needed)
      if (filesToDelete.length > 0) {
        try {
          // R2 delete operations
          for (const filePath of filesToDelete) {
            try {
              await r2Client.send(new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: filePath
              }));
            } catch (err) {
              console.error(`Failed to delete R2 file ${filePath}:`, err);
              // Continue with other deletions
            }
          }
        } catch (err) {
          console.error('Error deleting files from R2:', err);
          // Continue with database deletion even if R2 deletion fails
        }
      }
    }

    // Delete avatar from Supabase Storage
    const { data: userProfile } = await supabase
      .from('users')
      .select('image')
      .eq('id', userId)
      .single();

    if (userProfile?.image) {
      try {
        // Extract filename from URL
        const avatarPath = extractSupabaseStoragePath(userProfile.image);
        if (avatarPath) {
          await supabase.storage.from('avatars').remove([avatarPath]);
        }
      } catch (err) {
        console.error('Error deleting avatar:', err);
        // Continue with account deletion
      }
    }

    // Delete user data from database (cascade deletes will handle related data)
    // Order matters due to foreign key constraints
    
    // 1. Delete user's uploaded documents (cascades to annotations, bookmarks, etc.)
    if (userDocuments && userDocuments.length > 0) {
      const documentIds = userDocuments.map(doc => doc.id);
      await supabase
        .from('texts')
        .delete()
        .in('id', documentIds);
    }

    // 2. Delete user's journal pages
    await supabase
      .from('journal_pages')
      .delete()
      .eq('user_id', userId);

    // 3. Delete user's collections (cascades to collection_items)
    await supabase
      .from('user_collections')
      .delete()
      .eq('user_id', userId);

    // 4. Delete user's reading progress
    await supabase
      .from('reading_progress')
      .delete()
      .eq('user_id', userId);

    // 5. Delete user's annotations
    await supabase
      .from('user_annotations')
      .delete()
      .eq('user_id', userId);

    // 6. Delete user's bookmarks
    await supabase
      .from('user_bookmarks')
      .delete()
      .eq('user_id', userId);

    // 7. Delete user's feedback
    await supabase
      .from('feedback')
      .delete()
      .eq('user_id', userId);

    // 8. Delete user's activity summaries
    await supabase
      .from('user_activity_summary')
      .delete()
      .eq('user_id', userId);

    // 9. Delete user profile
    await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    // 10. Delete from Supabase Auth (this requires service role key)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const serviceSupabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { error: deleteAuthError } = await serviceSupabase.auth.admin.deleteUser(userId);
        
        if (deleteAuthError) {
          console.error('Error deleting auth user:', deleteAuthError);
          // If auth deletion fails, we've still deleted all the data
          // Return success but log the error
        }
      } catch (err) {
        console.error('Error with service client:', err);
        // Continue - data is already deleted
      }
    }

    return NextResponse.json(
      { 
        message: 'Account deleted successfully',
        deleted: {
          documents: userDocuments?.length || 0,
          userId: userId
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account. Please contact support.' },
      { status: 500 }
    );
  }
}

/**
 * Extract R2 file path from URL
 */
function extractR2Path(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // R2 URLs typically look like: https://pub-xxx.r2.dev/bucket-name/path/to/file
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 1) {
      // Remove bucket name, return the rest
      return pathParts.slice(1).join('/');
    }
    return pathParts[0] || null;
  } catch {
    return null;
  }
}

/**
 * Extract Supabase Storage path from URL
 */
function extractSupabaseStoragePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // Supabase storage URLs: /storage/v1/object/public/bucket-name/path
    const bucketIndex = pathParts.findIndex(part => part === 'public') + 1;
    if (bucketIndex > 0 && pathParts[bucketIndex]) {
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    return null;
  } catch {
    return null;
  }
}

