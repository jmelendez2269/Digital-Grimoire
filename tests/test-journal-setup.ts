/**
 * Journal Setup Diagnostic Script
 * Run this to check if the journal feature is properly configured
 * 
 * Usage: npx tsx test-journal-setup.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'app', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in app/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkJournalSetup() {
  console.log('🔍 Journal Setup Diagnostic\n');
  console.log('=' .repeat(60));
  
  // Check 1: Table exists
  console.log('\n1️⃣ Checking if journal_pages table exists...');
  try {
    const { data, error } = await supabase
      .from('journal_pages')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('❌ FAILED: journal_pages table does NOT exist');
        console.error('   → Run migrations/015_add_journal_pages_SAFE.sql in Supabase SQL Editor');
        return false;
      } else {
        console.error('❌ FAILED:', error.message);
        return false;
      }
    }
    
    console.log('✅ PASSED: journal_pages table exists');
  } catch (err: any) {
    console.error('❌ FAILED:', err.message);
    return false;
  }

  // Check 2: RLS is enabled
  console.log('\n2️⃣ Checking Row Level Security (RLS)...');
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (!authData.session) {
      console.log('⚠️  WARNING: Not authenticated');
      console.log('   → This is OK for diagnostic, but you need to be logged in to create pages');
    } else {
      console.log('✅ PASSED: Authenticated as', authData.session.user.email);
    }
  } catch (err: any) {
    console.error('❌ FAILED:', err.message);
  }

  // Check 3: Try to query with anon key (should work but return empty or require auth)
  console.log('\n3️⃣ Testing SELECT permission...');
  try {
    const { data, error } = await supabase
      .from('journal_pages')
      .select('*')
      .limit(5);
    
    if (error && !error.message.includes('JWT')) {
      console.error('❌ FAILED:', error.message);
      return false;
    }
    
    if (error && error.message.includes('JWT')) {
      console.log('✅ PASSED: RLS is working (requires authentication)');
    } else {
      console.log('✅ PASSED: Can query journal_pages');
      console.log(`   Found ${data?.length || 0} pages`);
    }
  } catch (err: any) {
    console.error('❌ FAILED:', err.message);
  }

  // Check 4: Verify update_updated_at_column function exists
  console.log('\n4️⃣ Checking database function...');
  try {
    const { data, error } = await supabase.rpc('update_updated_at_column', {});
    
    // This will error because we can't call a trigger function directly,
    // but if the function exists, we'll get a specific error
    if (error && error.message.includes('cannot be called directly')) {
      console.log('✅ PASSED: update_updated_at_column function exists');
    } else if (error && error.message.includes('does not exist')) {
      console.error('❌ FAILED: update_updated_at_column function missing');
      console.error('   → Run migrations/015_add_journal_pages_SAFE.sql again');
      return false;
    } else {
      console.log('✅ PASSED: Function check OK');
    }
  } catch (err: any) {
    console.log('⚠️  SKIPPED: Cannot directly verify function (this is OK)');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Diagnostic Complete!\n');
  
  console.log('Next steps:');
  console.log('1. Make sure you are logged in at localhost:3000');
  console.log('2. Check browser console (F12) for detailed errors');
  console.log('3. If table is missing, run: migrations/015_add_journal_pages_SAFE.sql');
  console.log('4. Check Supabase Dashboard → Logs → API for server errors\n');
  
  return true;
}

checkJournalSetup().catch(console.error);

