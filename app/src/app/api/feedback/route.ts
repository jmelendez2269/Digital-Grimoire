import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/feedback - Submit feedback
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication (optional - allow anonymous feedback)
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { feedback_type, subject, description, screenshot_url, user_email } = body;

    // Validate required fields
    if (!feedback_type || !subject || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate feedback_type
    const validTypes = ['bug', 'feature_request', 'general', 'book_request', 'other'];
    if (!validTypes.includes(feedback_type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    // Determine priority based on feedback type
    let priority = 'normal';
    if (feedback_type === 'bug') {
      // Check if description contains critical keywords
      const criticalKeywords = ['crash', 'error', 'broken', 'not working', 'failed', 'critical'];
      const descriptionLower = description.toLowerCase();
      if (criticalKeywords.some(keyword => descriptionLower.includes(keyword))) {
        priority = 'high';
      }
    }

    // Insert feedback
    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user?.id || null,
        feedback_type,
        subject: subject.trim(),
        description: description.trim(),
        screenshot_url: screenshot_url || null,
        user_email: user_email?.trim() || null,
        priority,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting feedback:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    // TODO: Send email notification for high/critical priority bugs
    // This would integrate with your email service (Resend, SendGrid, etc.)
    if (priority === 'high' || priority === 'critical') {
      // Example: await sendEmailNotification(feedback);
      console.log('High priority feedback received:', {
        id: feedback.id,
        type: feedback_type,
        subject,
        priority,
      });
    }

    return NextResponse.json(
      { 
        message: 'Feedback submitted successfully',
        feedback: {
          id: feedback.id,
          feedback_type: feedback.feedback_type,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/feedback - Get user's feedback (or all feedback for admins)
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

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'admin';

    // Build query
    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    // Non-admins can only see their own feedback
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const feedbackType = searchParams.get('type');
    const priority = searchParams.get('priority');

    if (status) {
      query = query.eq('status', status);
    }
    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: feedback, error } = await query;

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback }, { status: 200 });
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

