const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) env[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '');
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!url || !serviceKey) {
    console.error('Missing Service Key in .env.local');
    process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function run() {
    console.log('Fetching books that need indexing (content present but 0 chunks)...');

    // Fetch books with content
    const { data: books, error } = await supabase
        .from('texts')
        .select('id, title, content');

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    const appUrl = 'http://localhost:3000'; // Assuming local dev for trigger

    for (const book of books) {
        if (!book.content || book.content.length < 50) continue;

        // Check chunk count
        const { count, error: countError } = await supabase
            .from('text_chunks')
            .select('*', { count: 'exact', head: true })
            .eq('text_id', book.id);

        if (countError) continue;

        if (count === 0) {
            console.log(`\nTriggering Indexing for: ${book.title} (${book.id})`);
            try {
                const response = await fetch(`${appUrl}/api/process-document`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ textId: book.id })
                });
                const result = await response.json();
                console.log(`Response: ${JSON.stringify(result)}`);
            } catch (e) {
                console.error(`Request failed for ${book.id}:`, e.message);
            }
        }
    }
    console.log('\nBatch trigger complete.');
}

run();
