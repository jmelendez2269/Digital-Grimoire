import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        if (!slug) {
            return NextResponse.json(
                { success: false, error: 'Slug is required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        const { data: course, error } = await supabase
            .from('courses')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { success: false, error: 'Course not found' },
                    { status: 404 }
                );
            }
            console.error('Error fetching course:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch course' },
                { status: 500 }
            );
        }

        if (!course) {
            return NextResponse.json(
                { success: false, error: 'Course not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            course,
        });

    } catch (error) {
        console.error('Unexpected error in course API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
