import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTextEmbeddings } from '@/lib/convergence/embeddings';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const textId = searchParams.get('textId');

        const supabase = await createClient();

        if (textId) {
            // Index SPECIFIC book
            const { data: book, error } = await supabase
                .from('texts')
                .select('id, title, content')
                .eq('id', textId)
                .single();

            if (error || !book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
            if (!book.content) return NextResponse.json({ error: "No content to index" }, { status: 400 });

            console.log(`Indexing: ${book.title}`);
            const chunksCreated = await generateTextEmbeddings(book.id, book.content);

            return NextResponse.json({
                status: 'success',
                title: book.title,
                chunks: chunksCreated
            });
        }

        // List books needing indexing
        const { data: allBooks } = await supabase.from('texts').select('id, title, content');
        const results = [];

        for (const b of (allBooks || [])) {
            if (!b.content) continue;
            const { count } = await supabase
                .from('text_chunks')
                .select('*', { count: 'exact', head: true })
                .eq('text_id', b.id);

            if (count === 0) {
                results.push({ id: b.id, title: b.title, status: 'needs_indexing' });
            }
        }

        return NextResponse.json({
            message: "Targeted Indexing Queue",
            count: results.length,
            queue: results
        });

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
