import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCourseMarkdown } from '@/lib/parsers/course-markdown-parser';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { markdownContent } = body;

        if (!markdownContent || typeof markdownContent !== 'string') {
            return NextResponse.json(
                { error: 'markdownContent is required and must be a string' },
                { status: 400 }
            );
        }

        const result = parseCourseMarkdown(markdownContent);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error, warnings: result.warnings },
                { status: 400 }
            );
        }

        // Automatic book matching
        const allReadingTitles = new Set<string>();
        result.course.content.weeks.forEach(week => {
            week.readings?.forEach(reading => {
                if (reading.title) allReadingTitles.add(reading.title);
            });
        });

        const titles = Array.from(allReadingTitles);
        let matchedCourseTexts: any[] = [];

        if (titles.length > 0) {
            // Fuzzy search: Find texts that closely match our extracted titles
            // We search for books whose title is contained in the syllable title OR vice-versa
            const allPossibleMatches: any[] = [];
            
            for (const t of titles) {
                const { data: matches } = await supabase
                    .from('texts')
                    .select('id, title, author, cover_image_url')
                    .or(`title.ilike.%${t}%,author.ilike.%${t}%`)
                    .limit(3);
                
                if (matches) allPossibleMatches.push(...matches);
            }

            // Deduplicate and format for the UI
            const uniqueMatches = Array.from(new Map(allPossibleMatches.map(m => [m.id, m])).values());
            
            matchedCourseTexts = uniqueMatches.map(t => ({
                id: `matched-${t.id}`,
                text_id: t.id,
                is_required: true,
                texts: {
                    id: t.id,
                    title: t.title,
                    author: t.author,
                    cover_image_url: t.cover_image_url
                }
            }));
        }

        return NextResponse.json({
            success: true,
            course: result.course,
            course_texts: matchedCourseTexts,
            warnings: result.warnings ?? [],
        });

    } catch (error) {
        console.error('Error parsing course markdown:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
