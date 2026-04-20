import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/supabase/service';
import { GraphBundle, importGraphBundle } from './graph-bundle';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

function parseArgs() {
  const args = process.argv.slice(2);
  let input = '';

  for (let i = 0; i < args.length; i += 1) {
    if ((args[i] === '--input' || args[i] === '-i') && args[i + 1]) {
      input = args[i + 1];
      i += 1;
    }
  }

  if (!input) {
    throw new Error('Missing required --input <path-to-graph-bundle.json>');
  }

  return { input };
}

async function main() {
  const { input } = parseArgs();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local');
  }

  const inputPath = path.resolve(process.cwd(), input);
  const raw = fs.readFileSync(inputPath, 'utf8');
  const bundle = JSON.parse(raw) as GraphBundle;

  await importGraphBundle(createServiceClient(), bundle);

  console.log(`Imported graph bundle from ${inputPath}`);
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
  console.error('Graph import failed:', error);
  process.exit(1);
});
