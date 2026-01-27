const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        let value = values.join('=').trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[key.trim()] = value;
    }
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!url || (!anonKey && !serviceKey)) {
    console.error('Missing Supabase Config in .env.local');
    process.exit(1);
}

const keyToUse = serviceKey || anonKey;
console.log('Connected to:', url);
console.log('Using Key Type:', serviceKey ? 'SERVICE_ROLE' : 'ANON');

// 2. Query Supabase
const supabase = createClient(url, keyToUse);

async function run() {
    const targetId = 'd918c6d0-8bac-4ba9-9449-b131305894ae'; // Kybalion Ghost ID

    console.log(`Checking ID: ${targetId}`);

    const { data: book, error } = await supabase
        .from('texts')
        .select('id, title, s3_key, mime_type, content, created_at')
        .eq('id', targetId)
        .single();

    if (error) {
        console.error('Error fetching book:', error);
        return;
    }

    if (!book) {
        console.log('Book not found!');
        return;
    }

    console.log('Book Found:');
    console.log('Title:', book.title);
    console.log('S3 Key:', book.s3_key);
    console.log('Mime Type:', book.mime_type);
    console.log('Content Length:', book.content ? book.content.length : 0);

    // Also check chunks
    const { count } = await supabase
        .from('text_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('text_id', targetId);

    console.log('Chunk Count:', count);
}

run();
