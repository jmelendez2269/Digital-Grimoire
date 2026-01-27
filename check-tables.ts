import { createServiceClient } from './app/src/lib/supabase/service';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, './app/.env.local') });

async function checkTables() {
    const supabase = createServiceClient();
    const tables = ['rituals', 'ritual_steps', 'tarot_readings'];

    console.log('--- Database Table Check ---');
    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error) {
            console.log(`❌ Table "${table}" error:`, error.message);
        } else {
            console.log(`✅ Table "${table}" exists!`);
        }
    }
}

checkTables();
