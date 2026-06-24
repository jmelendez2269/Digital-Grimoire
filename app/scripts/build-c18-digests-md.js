const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'C:\\Projects\\Digital-Grimoire\\app\\.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  const { data, error } = await supabase
    .from('reading_blurbs')
    .select('reading_id, week_number, blurb_live, status')
    .eq('course_slug', 'c18-technology-as-modern-myth')
    .eq('status', 'live')
    .order('week_number')
    .order('reading_id');

  if (error) throw error;

  // Derive title from reading_id: strip course prefix + week prefix, un-kebab
  function titleFromId(id) {
    const parts = id.split('-w');
    if (parts.length < 2) return id;
    const afterWeek = parts[1].replace(/^\d+-/, '');
    return afterWeek.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const lines = ["# c18-technology-as-modern-myth — Reader's Digests\n"];
  let currentWeek = null;

  for (const row of data) {
    if (row.week_number !== currentWeek) {
      currentWeek = row.week_number;
      lines.push(`\n---\n\n## Week ${currentWeek}\n`);
    }
    const title = titleFromId(row.reading_id);
    lines.push(`### ${title}`);
    lines.push(`*reading_id: ${row.reading_id} | status: ${row.status}*\n`);
    lines.push(row.blurb_live || '_No content._');
    lines.push('');
  }

  const outPath = 'c:\\Projects\\Digital-Grimoire\\reader-digests-by-course\\c18-technology-as-modern-myth-digests.md';
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Written ${data.length} readings → ${outPath}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
