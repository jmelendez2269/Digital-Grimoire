
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getHostnames() {
    const { data, error } = await supabase
        .from('texts')
        .select('cover_image_url')
        .not('cover_image_url', 'is', null);

    if (error) {
        console.error('Error fetching texts:', error);
        process.exit(1);
    }

    const hostnames = new Set();
    data.forEach(text => {
        try {
            const url = new URL(text.cover_image_url);
            hostnames.add(url.hostname);
        } catch (e) {
            // Ignore invalid URLs
        }
    });

    console.log(JSON.stringify(Array.from(hostnames), null, 2));
}

getHostnames();
