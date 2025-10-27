/**
 * Test script to verify Supabase service role permissions
 * Run with: npx tsx test-permissions.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  console.error('\nCreate a .env.local file with:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_url');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

// Create client with SERVICE ROLE key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPermissions() {
  console.log('🧪 Testing Supabase Service Role Permissions...\n');

  // Test 1: Insert into api_usage (most important)
  console.log('Test 1: Inserting into api_usage table...');
  const { data: insertData, error: insertError } = await supabase
    .from('api_usage')
    .insert({
      service: 'other',
      endpoint: 'test',
      operation: 'permission_test',
      units_used: 0,
      unit_type: 'requests',
      estimated_cost: 0,
      success: true,
      request_metadata: { test: true, timestamp: new Date().toISOString() }
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ FAILED to insert into api_usage:');
    console.error(insertError);
  } else {
    console.log('✅ Successfully inserted into api_usage');
    console.log(`   Record ID: ${insertData.id}\n`);
  }

  // Test 2: Read from api_usage
  console.log('Test 2: Reading from api_usage table...');
  const { data: usageData, error: usageError } = await supabase
    .from('api_usage')
    .select('*')
    .limit(5);

  if (usageError) {
    console.error('❌ FAILED to read from api_usage:');
    console.error(usageError);
  } else {
    console.log(`✅ Successfully read from api_usage (${usageData.length} records)\n`);
  }

  // Test 3: Read from daily_usage_summary
  console.log('Test 3: Reading from daily_usage_summary...');
  const { data: summaryData, error: summaryError } = await supabase
    .from('daily_usage_summary')
    .select('*')
    .limit(5);

  if (summaryError) {
    console.error('❌ FAILED to read from daily_usage_summary:');
    console.error(summaryError);
  } else {
    console.log(`✅ Successfully read from daily_usage_summary (${summaryData.length} records)\n`);
  }

  // Test 4: Read from user_activity_summary
  console.log('Test 4: Reading from user_activity_summary...');
  const { data: activityData, error: activityError } = await supabase
    .from('user_activity_summary')
    .select('*')
    .limit(5);

  if (activityError) {
    console.error('❌ FAILED to read from user_activity_summary:');
    console.error(activityError);
  } else {
    console.log(`✅ Successfully read from user_activity_summary (${activityData.length} records)\n`);
  }

  // Test 5: Read from storage_usage
  console.log('Test 5: Reading from storage_usage...');
  const { data: storageData, error: storageError } = await supabase
    .from('storage_usage')
    .select('*')
    .limit(5);

  if (storageError) {
    console.error('❌ FAILED to read from storage_usage:');
    console.error(storageError);
  } else {
    console.log(`✅ Successfully read from storage_usage (${storageData.length} records)\n`);
  }

  // Test 6: Read from cost_alerts
  console.log('Test 6: Reading from cost_alerts...');
  const { data: alertsData, error: alertsError } = await supabase
    .from('cost_alerts')
    .select('*');

  if (alertsError) {
    console.error('❌ FAILED to read from cost_alerts:');
    console.error(alertsError);
  } else {
    console.log(`✅ Successfully read from cost_alerts (${alertsData.length} records)\n`);
  }

  // Summary
  console.log('=====================================');
  console.log('📊 Test Summary');
  console.log('=====================================');
  if (!insertError && !usageError && !summaryError && !activityError && !storageError && !alertsError) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('   Service role has full permissions to:');
    console.log('   • Insert into api_usage');
    console.log('   • Read from all usage tables');
    console.log('\n🎉 Your permissions are correctly configured!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('   Check the errors above and verify:');
    console.log('   1. Migrations have been run (010_add_usage_tracking.sql)');
    console.log('   2. SUPABASE_SERVICE_ROLE_KEY is correct');
    console.log('   3. Tables exist in your database');
  }

  // Cleanup test record
  if (insertData?.id) {
    console.log('\n🧹 Cleaning up test record...');
    await supabase.from('api_usage').delete().eq('id', insertData.id);
    console.log('✅ Test record deleted');
  }
}

testPermissions().catch(console.error);

