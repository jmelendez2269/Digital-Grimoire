import { createServiceClient } from './app/src/lib/supabase/service';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, './app/.env.local') });

async function checkRpc() {
    const supabase = createServiceClient();
    console.log('Checking for exec_sql RPC...');

    try {
        const { data, error } = await (supabase as any).rpc('exec_sql', { sql: 'SELECT 1' });
        if (error) {
            console.log('exec_sql RPC not found or failed:', error.message);
        } else {
            console.log('✅ exec_sql RPC found!', data);
        }
    } catch (e) {
        console.log('Error calling RPC:', e);
    }
}

checkRpc();
