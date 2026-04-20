import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/supabase/service';
import { exportGraphBundle } from './graph-bundle';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

function parseArgs() {
  const args = process.argv.slice(2);
  let output = '';

  for (let i = 0; i < args.length; i += 1) {
    if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      output = args[i + 1];
      i += 1;
    }
  }

  return { output };
}

async function main() {
  const { output } = parseArgs();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local');
  }

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
  const outputPath = output
    ? path.resolve(process.cwd(), output)
    : path.resolve(process.cwd(), '..', 'graph-bundles', `${projectRef}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const bundle = await exportGraphBundle(createServiceClient(), supabaseUrl);
  fs.writeFileSync(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  console.log(`Exported graph bundle to ${outputPath}`);
  console.log(
    JSON.stringify(
      {
        convergenceConcepts: bundle.convergence.concepts.length,
        convergenceRelationships: bundle.convergence.relationships.length,
        correspondenceEntities: bundle.correspondences.entities.length,
        correspondenceRelationships: bundle.correspondences.relationships.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('Graph export failed:', error);
  process.exit(1);
});
