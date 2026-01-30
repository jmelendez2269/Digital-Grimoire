
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOG_FILE = 'debug_output.txt';

// Clear log file
try {
    fs.writeFileSync(LOG_FILE, '');
} catch (e) {
    // Ignore
}

function log(msg: string) {
    console.log(msg);
    try {
        fs.appendFileSync(LOG_FILE, msg + '\n');
    } catch (e) {
        // Ignore
    }
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    log('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    log('--- Debugging Search Data ---');

    // 1. Check if "The Secret Doctrine" exists
    log('\n1. Searching for "Secret Doctrine" in texts table...');
    const { data: books, error: bookError } = await supabase
        .from('texts')
        .select('id, title, author')
        .ilike('title', '%Secret Doctrine%');

    if (bookError) {
        log('Error finding book: ' + JSON.stringify(bookError));
    } else {
        log(`Found ${books?.length || 0} books:`);
        books?.forEach(b => log(`- [${b.id}] ${b.title} (${b.author})`));
    }

    if (!books || books.length === 0) {
        log('Stopping: Book not found.');
        return;
    }

    const bookIds = books.map(b => b.id);

    // 2. Check chunks for "Seven sons" in these books
    log(`\n2. Searching for "Seven sons" in chunks of these books (${bookIds.join(', ')})...`);
    const { data: chunks, error: chunkError } = await supabase
        .from('text_chunks')
        .select('id, chunk_index, content')
        .in('text_id', bookIds)
        .ilike('content', '%Seven sons%')
        .limit(5);

    if (chunkError) {
        log('Error finding chunks: ' + JSON.stringify(chunkError));
    } else {
        log(`Found ${chunks?.length || 0} chunks containing "Seven sons":`);
        chunks?.forEach(c => {
            log(`\n--- Chunk ${c.chunk_index} ---`);
            log(c.content.substring(0, 200) + '...');
        });
    }

    // 3. Check for "sons" generally
    log('\n3. Checking noise: "sons" in chunks...');
    const { count: sonsCount } = await supabase
        .from('text_chunks')
        .select('*', { count: 'exact', head: true })
        .in('text_id', bookIds)
        .ilike('content', '%sons%');

    log(`"sons" appears in ${sonsCount} chunks.`);
}

main().catch((err) => {
    log('Error in main: ' + err);
});
