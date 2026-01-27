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

// Helper to strip HTML
function stripHtml(html) {
    if (!html) return '';
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
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
    console.log('Scanning for books with missing content but available metadata chapters...');

    // Fetch books where content is null or very short
    const { data: books, error } = await supabase
        .from('texts')
        .select('*'); // Get all to inspect metadata safely

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    let affectedCount = 0;
    let fixedCount = 0;

    for (const book of books) {
        // Condition: missing content AND has chapters
        const hasContent = !!book.content && book.content.length > 50;
        const chapters = book.metadata?.chapters;
        const hasChapters = chapters && Array.isArray(chapters) && chapters.length > 0;

        if (!hasContent && hasChapters) {
            affectedCount++;
            console.log(`\nProcessing: ${book.title} (${book.id})`);

            let fullText = '';
            for (const chap of chapters) {
                const chapText = stripHtml(chap.content || '');
                if (chapText) {
                    fullText += `\n\n--- ${chap.title} ---\n\n`;
                    fullText += chapText;
                }
            }

            fullText = fullText.trim();

            if (fullText.length > 0) {
                console.log(`Extracted ${fullText.length} characters.`);

                const { error: updateError } = await supabase
                    .from('texts')
                    .update({ content: fullText })
                    .eq('id', book.id);

                if (updateError) {
                    console.error('Update Failed:', updateError);
                } else {
                    fixedCount++;
                    console.log('✅ Update Successful!');
                }
            } else {
                console.log('⚠️ Warning: Metadata found but no text could be extracted.');
            }
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Affected Books Found: ${affectedCount}`);
    console.log(`Successfully Fixed: ${fixedCount}`);

    if (affectedCount > fixedCount) {
        console.log(`⚠️ Note: ${affectedCount - fixedCount} books still have issues.`);
    }
}

run();
