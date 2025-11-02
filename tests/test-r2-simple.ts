/**
 * Simple R2 Credentials Test
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, 'app', '.env.local') });

console.log('🔍 R2 Credentials Check');
console.log('═'.repeat(60));
console.log('Checking what credentials are loaded...\n');

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

console.log('R2_ENDPOINT:', endpoint ? '✅ SET' : '❌ MISSING');
if (endpoint) {
  console.log('  Value:', endpoint);
  console.log('  Length:', endpoint.length, 'characters');
  console.log('  Starts with https://?', endpoint.startsWith('https://') ? '✅' : '❌');
  console.log('  Ends with .r2.cloudflarestorage.com?', endpoint.endsWith('.r2.cloudflarestorage.com') ? '✅' : '❌');
  console.log('  Has trailing slash?', endpoint.endsWith('/') ? '❌ PROBLEM!' : '✅');
}

console.log('\nR2_ACCESS_KEY_ID:', accessKeyId ? '✅ SET' : '❌ MISSING');
if (accessKeyId) {
  console.log('  First 8 chars:', accessKeyId.substring(0, 8) + '...');
  console.log('  Length:', accessKeyId.length, 'characters');
  console.log('  Has spaces?', accessKeyId.includes(' ') ? '❌ PROBLEM!' : '✅');
}

console.log('\nR2_SECRET_ACCESS_KEY:', secretAccessKey ? '✅ SET' : '❌ MISSING');
if (secretAccessKey) {
  console.log('  First 8 chars:', secretAccessKey.substring(0, 8) + '...');
  console.log('  Length:', secretAccessKey.length, 'characters');
  console.log('  Has spaces?', secretAccessKey.includes(' ') ? '❌ PROBLEM!' : '✅');
}

console.log('\n' + '═'.repeat(60));

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.log('❌ Some credentials are missing!');
  console.log('\nMake sure app/.env.local has:');
  console.log('R2_ENDPOINT=https://...r2.cloudflarestorage.com');
  console.log('R2_ACCESS_KEY_ID=your_key_id');
  console.log('R2_SECRET_ACCESS_KEY=your_secret_key');
} else {
  console.log('✅ All credentials are present!');
  console.log('\nIf you still get 403 errors, the issue is likely:');
  console.log('1. Token permissions in Cloudflare dashboard');
  console.log('2. Token not applied to the specific bucket');
  console.log('3. Credentials copied incorrectly (extra spaces/characters)');
}

