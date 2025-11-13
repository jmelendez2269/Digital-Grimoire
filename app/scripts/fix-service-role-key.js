// Script to fix Supabase Service Role Key mismatch
// Usage: node fix-service-role-key.js [new-service-role-key]

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env.local file not found at', envPath);
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');

// Extract current values
const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const serviceKeyMatch = content.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

if (!urlMatch || !serviceKeyMatch) {
  console.error('❌ Error: Could not find required environment variables');
  process.exit(1);
}

const url = urlMatch[1].trim();
const serviceKey = serviceKeyMatch[1].trim().replace(/\s+/g, '');

// Extract project refs
function getProjectRef(jwt) {
  if (!jwt) return null;
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    const json = JSON.parse(payload);
    return json.ref;
  } catch (e) {
    return null;
  }
}

const urlRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const serviceRef = getProjectRef(serviceKey);

console.log('🔧 Supabase Service Role Key Fix Script\n');
console.log('Current Configuration:');
console.log('  URL Project:        ', urlRef);
console.log('  Service Key Project:', serviceRef);
console.log('');

if (urlRef === serviceRef) {
  console.log('✅ All keys match! No fix needed.');
  process.exit(0);
}

if (urlRef !== serviceRef) {
  console.log('⚠️  MISMATCH DETECTED!');
  console.log('  URL/Anon Key:', urlRef);
  console.log('  Service Key: ', serviceRef);
  console.log('');
  
  const newKey = process.argv[2];
  
  if (!newKey) {
    console.log('To fix this:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select project:', urlRef);
    console.log('3. Go to Settings -> API');
    console.log('4. Copy the service_role key (secret)');
    console.log('');
    console.log('Then run this script with the new key:');
    console.log('  node fix-service-role-key.js "your-service-role-key-here"');
    process.exit(0);
  }
  
  const newKeyRef = getProjectRef(newKey);
  if (newKeyRef !== urlRef) {
    console.error('❌ Error: New key is from project', newKeyRef, 'but URL is from', urlRef);
    process.exit(1);
  }
  
  console.log('✅ New key matches URL project!');
  console.log('Updating .env.local...');
  
  // Update the service role key
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      return `SUPABASE_SERVICE_ROLE_KEY=${newKey}`;
    }
    return line;
  });
  
  fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
  
  console.log('✅ Updated .env.local successfully!');
  console.log('');
  console.log('⚠️  IMPORTANT: Restart your dev server for changes to take effect:');
  console.log('   1. Stop the server (Ctrl+C)');
  console.log('   2. Run: pnpm dev');
}

