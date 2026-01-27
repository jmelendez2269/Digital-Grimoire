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
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY']; // Use Service Key to ensure write access

if (!url || !serviceKey) {
    console.error('Missing Service Key in .env.local');
    process.exit(1);
}

const supabase = createClient(url, serviceKey);

// Helper to strip HTML (simplified from process-document logic)
function stripHtml(html) {
    if (!html) return '';
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ') // Replace tags with space
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    return text;
}

async function run() {
    // Target both Kybalion and Secret Doctrine
    const targetIds = [
        'd918c6d0-8bac-4ba9-9449-b131305894ae',
        'fc9e6743-5b4e-4958-b59f-f028da499104'
    ];

    console.log(`Processing ${targetIds.length} books...`);

    const { data: books, error } = await supabase
        .from('texts')
        .select('*')
        .in('id', targetIds);

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    for (const book of books) {
        console.log(`Checking: ${book.title} (${book.id})`);

        if (book.content && book.content.length > 100) {
            console.log('Skipping: Already has content.');
            continue;
        }

        const chapters = book.metadata?.chapters;
        if (!chapters || !Array.isArray(chapters)) {
            console.log('Skipping: No structured chapters found.');
            continue;
        }

        console.log(`Found ${chapters.length} chapters.`);
        let fullText = '';

        for (const chap of chapters) {
            const chapText = stripHtml(chap.content || '');
            fullText += `\n\n--- ${chap.title} ---\n\n`;
            fullText += chapText;
        }

        fullText = fullText.trim();
        console.log(`Extracted ${fullText.length} characters.`);

        // Update DB
        const { error: updateError } = await supabase
            .from('texts')
            .update({ content: fullText })
            .eq('id', book.id);

        if (updateError) {
            console.error('Update Failed:', updateError);
        } else {
            console.log('✅ Update Successful!');
        }
    }
}

run();
