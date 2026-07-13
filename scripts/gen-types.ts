#!/usr/bin/env tsx
/**
 * scripts/gen-types.ts
 *
 * Regenerates lib/supabase/database.types.ts from the LIVE OriginTrace database
 * so the Supabase client can be typed and wrong column names fail `npm run check`
 * instead of a production 500. This is the primary defence against the #1 bug
 * family in this repo (code/live-DB schema drift — see docs/FRICTION-AUDIT.md).
 *
 * The OriginTrace database is NOT the "FarmWise" Supabase project (that is a
 * different product). Point this at the project whose schema has `farms`,
 * `collection_batches`, `shipments`, `profiles`, etc.
 *
 * Project ref resolution order:
 *   1. SUPABASE_PROJECT_ID env var (explicit ref, e.g. "abcdeffghij")
 *   2. Parsed from NEXT_PUBLIC_SUPABASE_URL (https://<ref>.supabase.co)
 *
 * Requires the Supabase CLI on PATH and an access token (SUPABASE_ACCESS_TOKEN
 * or `supabase login`).
 *
 * Usage:
 *   SUPABASE_PROJECT_ID=xxxx npm run gen:types
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'lib', 'supabase', 'database.types.ts');

function resolveRef(): string {
  const explicit = process.env.SUPABASE_PROJECT_ID?.trim();
  if (explicit) return explicit;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const m = url?.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (m) return m[1];

  console.error(
    'ERROR: cannot resolve Supabase project ref.\n' +
      '  Set SUPABASE_PROJECT_ID=<ref> or NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co\n' +
      '  (The OriginTrace DB has tables: farms, collection_batches, shipments, profiles.\n' +
      '   Do NOT use the FarmWise project — it is a different product.)'
  );
  process.exit(1);
}

const ref = resolveRef();
const HEADER =
  '// Auto-generated Supabase types. DO NOT EDIT BY HAND.\n' +
  '// Regenerate with: npm run gen:types\n' +
  `// Source project ref: ${ref}\n` +
  '// This file is the single source of truth for DB column names — a wrong\n' +
  '// column now fails `npm run check` instead of a production 500.\n\n';

console.log(`Generating Supabase types from project ${ref} …`);
let out: string;
try {
  out = execFileSync(
    'supabase',
    ['gen', 'types', 'typescript', '--project-id', ref],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
} catch (err) {
  console.error(
    'ERROR: `supabase gen types` failed. Is the Supabase CLI installed and are you\n' +
      'logged in (SUPABASE_ACCESS_TOKEN or `supabase login`)?\n',
    err instanceof Error ? err.message : err
  );
  process.exit(1);
}

// Sanity check: refuse to write types from the wrong database.
if (!/\bfarms:|\bcollection_batches:|\bshipments:/.test(out)) {
  console.error(
    'ERROR: generated types are missing OriginTrace signature tables\n' +
      '(farms / collection_batches / shipments). This is probably the wrong project.\n' +
      'Refusing to overwrite database.types.ts.'
  );
  process.exit(1);
}

fs.writeFileSync(OUT, HEADER + out.trimEnd() + '\n');
console.log(`✅  Wrote ${OUT}`);
console.log('   Next: type the client — createClient<Database>(url, key) in lib/supabase/*.');
