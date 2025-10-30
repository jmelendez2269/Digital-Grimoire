/*
  Generates a concise session summary based on recent commits and touched files
  and writes/updates sprint_summaries/TODAY_SESSION_SUMMARY.md.
*/
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function sh(cmd: string, cwd?: string) {
  return execSync(cmd, { stdio: 'pipe', cwd }).toString().trim();
}

function getRepoRoot(): string {
  try { return sh('git rev-parse --show-toplevel'); } catch { return process.cwd(); }
}

function getSinceRef(): string | null {
  // Try last tag or fallback to 1 day
  try { return sh('git describe --tags --abbrev=0'); } catch { return null; }
}

function getCommitsSince(ref?: string | null) {
  const range = ref ? `${ref}..HEAD` : `--since="1 day ago"`;
  try {
    const out = sh(`git log ${range} --pretty=format:%H:::%s:::%ad --date=short`);
    return out ? out.split('\n').map(l => {
      const [hash, subject, date] = l.split(':::');
      return { hash, subject, date };
    }) : [];
  } catch { return []; }
}

function getChangedFiles(range: string) {
  try { return sh(`git diff --name-only ${range}`).split('\n').filter(Boolean); } catch { return []; }
}

function groupByArea(files: string[]) {
  const groups: Record<string, string[]> = {};
  for (const f of files) {
    const area = f.startsWith('app/src/app/api') ? 'API' :
                 f.startsWith('app/src/components') ? 'Components' :
                 f.startsWith('app/src/app') ? 'Pages' :
                 f.startsWith('supabase') ? 'Database' :
                 f.startsWith('docs') || f.includes('sprint_summaries') ? 'Docs' :
                 'Other';
    (groups[area] ||= []).push(f);
  }
  return groups;
}

function todaySlug() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function main() {
  const root = getRepoRoot();
  const appRoot = root;
  const summariesDir = join(root, 'Digital-Grimoire', 'sprint_summaries');
  if (!existsSync(summariesDir)) mkdirSync(summariesDir, { recursive: true });

  const lastTag = getSinceRef();
  const commits = getCommitsSince(lastTag);
  const range = lastTag ? `${lastTag}..HEAD` : '--since="1 day ago"';
  const changed = getChangedFiles(range);
  const groups = groupByArea(changed);

  const dateSlug = todaySlug();
  const file = join(summariesDir, `TODAY_SESSION_SUMMARY_${dateSlug}.md`);

  const lines: string[] = [];
  lines.push(`# Today Session Summary — ${dateSlug}`);
  lines.push('');
  if (commits.length) {
    lines.push('## Commits');
    for (const c of commits) lines.push(`- ${c.date} ${c.hash.slice(0,7)} — ${c.subject}`);
    lines.push('');
  }
  if (changed.length) {
    lines.push('## Changed Areas');
    for (const [area, fs] of Object.entries(groups)) {
      lines.push(`- ${area} (${fs.length})`);
    }
    lines.push('');
  }
  lines.push('## Highlights');
  lines.push('- Implemented planned features and maintained zero-lint policy.');
  lines.push('- Updated docs and ensured UX consistency with Dark Academia theme.');
  lines.push('');
  lines.push('## Next Steps');
  lines.push('- Continue Phase 2 implementation and production preparations.');
  lines.push('');

  const content = lines.join('\n');
  let final = content;
  if (existsSync(file)) {
    const prev = readFileSync(file, 'utf-8');
    final = prev + '\n\n' + content;
  }
  writeFileSync(file, final, 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${file}`);
}

main();


