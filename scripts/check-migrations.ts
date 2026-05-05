#!/usr/bin/env tsx
/**
 * scripts/check-migrations.ts
 *
 * CI guard for migration hygiene. Fails on:
 *
 *  1. SQL files found in the legacy /migrations/ root directory.
 *     All migrations must live in /supabase/migrations/.
 *
 *  2. Migration filenames that don't follow the timestamp convention:
 *     YYYYMMDD_<description>.sql  or  YYYYMMDDHHMMSS_<description>.sql
 *
 *  3. Duplicate timestamps — two migrations with the same date prefix
 *     will conflict when applied in order.
 *
 *  4. Migrations whose timestamp is in the future (likely a copy-paste error).
 *
 * Run in CI: npx tsx scripts/check-migrations.ts
 * Exit code 1 on any violation.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_DIR = path.join(ROOT, 'supabase', 'migrations');
const LEGACY_DIR    = path.join(ROOT, 'migrations');

const FILENAME_RE = /^(\d{8,14})_[\w-]+\.sql$/;

interface Issue {
  severity: 'error' | 'warn';
  message: string;
}

const issues: Issue[] = [];

// ---------------------------------------------------------------------------
// Check 1: Legacy /migrations/ directory must be empty (or absent)
// ---------------------------------------------------------------------------
if (fs.existsSync(LEGACY_DIR)) {
  const legacyFiles = fs.readdirSync(LEGACY_DIR).filter((f) => f.endsWith('.sql'));
  if (legacyFiles.length > 0) {
    issues.push({
      severity: 'error',
      message:
        `Legacy /migrations/ directory contains ${legacyFiles.length} SQL file(s):\n` +
        legacyFiles.map((f) => `    migrations/${f}`).join('\n') +
        '\n  Move them to /supabase/migrations/ or delete if already applied.',
    });
  }
}

// ---------------------------------------------------------------------------
// Check 2-4: Canonical migration files
// ---------------------------------------------------------------------------
if (!fs.existsSync(CANONICAL_DIR)) {
  issues.push({
    severity: 'error',
    message: `Canonical migration directory not found: supabase/migrations/`,
  });
} else {
  const files = fs
    .readdirSync(CANONICAL_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const seenTimestamps = new Map<string, string>();
  const today = new Date();
  const todayStr = today.toISOString().replace(/[-:T]/g, '').slice(0, 14);

  for (const file of files) {
    // Check 2: Filename convention
    const match = file.match(FILENAME_RE);
    if (!match) {
      issues.push({
        severity: 'error',
        message: `supabase/migrations/${file}: filename does not match YYYYMMDD[HHMMSS]_description.sql`,
      });
      continue;
    }

    const ts = match[1];

    // Check 3: Duplicate timestamps
    if (seenTimestamps.has(ts)) {
      issues.push({
        severity: 'error',
        message:
          `supabase/migrations/${file}: timestamp "${ts}" conflicts with ${seenTimestamps.get(ts)}. ` +
          `Rename one to use a unique timestamp.`,
      });
    } else {
      seenTimestamps.set(ts, file);
    }

    // Check 4: Future timestamps
    const paddedTs = ts.padEnd(14, '0');
    if (paddedTs > todayStr) {
      issues.push({
        severity: 'warn',
        message: `supabase/migrations/${file}: timestamp is in the future (${ts}). Likely a copy-paste error.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const errors = issues.filter((i) => i.severity === 'error');
const warnings = issues.filter((i) => i.severity === 'warn');

if (warnings.length > 0) {
  console.warn(`\n⚠️   Migration warnings (${warnings.length}):\n`);
  for (const w of warnings) {
    console.warn(`  WARN  ${w.message}\n`);
  }
}

if (errors.length > 0) {
  console.error(`\n❌  Migration check failed — ${errors.length} error(s):\n`);
  for (const e of errors) {
    console.error(`  ERROR  ${e.message}\n`);
  }
  process.exit(1);
}

if (issues.length === 0) {
  const count = fs.existsSync(CANONICAL_DIR)
    ? fs.readdirSync(CANONICAL_DIR).filter((f) => f.endsWith('.sql')).length
    : 0;
  console.log(`✅  Migration check passed — ${count} migration(s) in supabase/migrations/.`);
}
