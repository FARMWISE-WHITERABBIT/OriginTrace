#!/usr/bin/env tsx
/**
 * scripts/sync-skills.ts
 *
 * The project's 22 skills live in `.agents/skills/` (catalogued in agents.md),
 * but Claude Code only auto-loads skills from `.claude/skills/`. This script
 * mirrors the first-party project skills into `.claude/skills/` so they load
 * natively, keeping `.agents/skills/` as the single source of truth.
 *
 *   npm run skills:sync     # copy .agents/skills/* -> .claude/skills/*
 *   npm run skills:check    # CI: fail if .claude/skills is stale vs source
 *
 * Any skill dir containing a SKILL.md is mirrored, except the excluded set
 * (third-party bundles / non-skill dirs). `.claude/skills/ui-ux-pro-max` has a
 * separate origin and is never touched.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '.agents', 'skills');
const DEST = path.join(ROOT, '.claude', 'skills');

// Not mirrored: third-party bundle + non-skill helper dirs.
const EXCLUDE = new Set(['skills-main', 'testing-workspace']);

const checkMode = process.argv.includes('--check');

function skillDirs(): string[] {
  if (!fs.existsSync(SRC)) return [];
  return fs
    .readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !EXCLUDE.has(d.name))
    .filter((d) => fs.existsSync(path.join(SRC, d.name, 'SKILL.md')))
    .map((d) => d.name);
}

/** Recursively collect relative file paths under a dir. */
function walk(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
}

function differs(srcDir: string, destDir: string): boolean {
  const srcFiles = walk(srcDir).sort();
  const destFiles = walk(destDir).sort();
  if (srcFiles.join('\n') !== destFiles.join('\n')) return true;
  return srcFiles.some(
    (rel) =>
      fs.readFileSync(path.join(srcDir, rel), 'utf8') !==
      fs.readFileSync(path.join(destDir, rel), 'utf8')
  );
}

const dirs = skillDirs();
const stale: string[] = [];

for (const name of dirs) {
  const srcDir = path.join(SRC, name);
  const destDir = path.join(DEST, name);

  if (checkMode) {
    if (differs(srcDir, destDir)) stale.push(name);
    continue;
  }

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
}

if (checkMode) {
  if (stale.length > 0) {
    console.error(
      `❌  .claude/skills is stale for: ${stale.join(', ')}\n` +
        '   Run `npm run skills:sync` and commit the result.'
    );
    process.exit(1);
  }
  console.log(`✅  .claude/skills is in sync (${dirs.length} skills).`);
} else {
  console.log(`✅  Synced ${dirs.length} skills to .claude/skills/: ${dirs.join(', ')}`);
}
