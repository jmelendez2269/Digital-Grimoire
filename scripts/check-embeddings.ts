
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // 1. Get ID of "The Veil of Isis" or similar
    const { data: books } = await supabase
        .from('texts')
        .select('id, title')
        .ilike('title', '%Alchemy%')
        .limit(5);

    if (!books || books.length === 0) {
        console.log("No books found matching 'Alchemy'");
        return;
    }

    console.log("Found books:", books.map(b => b.title));

    for (const book of books) {
        const { count, error } = await supabase
            .from('text_chunks')
            .select('*', { count: 'exact', head: true })
            .eq('text_id', book.id)
            .not('embedding', 'is', null);

        console.log(`Book "${book.title}" has ${count} chunks with embeddings. Error: ${error?.message}`);
    }
}

check();
