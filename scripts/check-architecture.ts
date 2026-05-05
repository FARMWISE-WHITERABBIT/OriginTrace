#!/usr/bin/env tsx
/**
 * scripts/check-architecture.ts
 *
 * Validates layer-boundary imports defined in ADR-001.
 * Run in CI: npx tsx scripts/check-architecture.ts
 * Exit code 1 on any violation.
 *
 * Checks:
 *  1. Domain files must not import from infra, application, or UI layers.
 *  2. Application files must not import from infra directly.
 *  3. Module internals must not cross-import through internal paths
 *     (must use the published api/ barrel).
 *  4. process.env must not appear outside lib/env.ts and *.config.* files (ADR-005).
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walk(dir: string, exts: string[] = ['.ts', '.tsx']): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function extractImports(src: string): string[] {
  const imports: string[] = [];
  // static import / export from
  for (const m of src.matchAll(/^\s*(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/gm)) {
    imports.push(m[1]);
  }
  // dynamic import()
  for (const m of src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gm)) {
    imports.push(m[1]);
  }
  // require()
  for (const m of src.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gm)) {
    imports.push(m[1]);
  }
  return imports;
}

interface Violation {
  file: string;
  line: number;
  importPath: string;
  message: string;
}

function findLine(src: string, importPath: string): number {
  const lines = src.split('\n');
  const idx = lines.findIndex((l) => l.includes(`'${importPath}'`) || l.includes(`"${importPath}"`));
  return idx === -1 ? 1 : idx + 1;
}

const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Rule 1: Domain layer purity
// ---------------------------------------------------------------------------
function checkDomainLayer(): Violation[] {
  const violations: Violation[] = [];
  const domainFiles = walk(path.join(ROOT, 'modules'))
    .filter((f) => f.includes('/domain/'));

  for (const file of domainFiles) {
    const src = fs.readFileSync(file, 'utf8');
    for (const imp of extractImports(src)) {
      const forbidden =
        imp.includes('/infra') ||
        imp.includes('/infra/') ||
        imp.includes('/application') ||
        imp.includes('/application/') ||
        imp.startsWith('@/app/') ||
        imp === 'next/server' ||
        imp === 'next/navigation' ||
        imp === 'next/headers' ||
        imp.startsWith('@supabase/') ||
        imp.startsWith('@/lib/supabase');

      if (forbidden) {
        violations.push({
          file: path.relative(ROOT, file),
          line: findLine(src, imp),
          importPath: imp,
          message: `Domain layer violation: imports "${imp}" (infra/application/UI/Supabase forbidden in domain)`,
        });
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Rule 2: Application layer — no direct infra
// ---------------------------------------------------------------------------
function checkApplicationLayer(): Violation[] {
  const violations: Violation[] = [];
  const appFiles = walk(path.join(ROOT, 'modules'))
    .filter((f) => f.includes('/application/'));

  for (const file of appFiles) {
    const src = fs.readFileSync(file, 'utf8');
    for (const imp of extractImports(src)) {
      const forbidden =
        imp.includes('/infra') ||
        imp.includes('/infra/') ||
        imp.startsWith('@supabase/') ||
        imp.startsWith('@/lib/supabase');

      if (forbidden) {
        violations.push({
          file: path.relative(ROOT, file),
          line: findLine(src, imp),
          importPath: imp,
          message: `Application layer violation: imports "${imp}" (infra/Supabase must be injected, not imported directly)`,
        });
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Rule 3: Cross-module imports must go through api/ barrel
// ---------------------------------------------------------------------------
function checkCrossModuleImports(): Violation[] {
  const violations: Violation[] = [];
  const allModuleFiles = walk(path.join(ROOT, 'modules'));

  for (const file of allModuleFiles) {
    const relFile = path.relative(ROOT, file);
    // e.g. modules/identity-access/domain/tier-policy.ts → "identity-access"
    const ownModule = relFile.split('/')[1];
    const src = fs.readFileSync(file, 'utf8');

    for (const imp of extractImports(src)) {
      // Matches @/modules/<other-module>/application|domain|infra/...
      const m = imp.match(/^@\/modules\/([^/]+)\/(application|domain|infra)\//);
      if (m && m[1] !== ownModule) {
        violations.push({
          file: relFile,
          line: findLine(src, imp),
          importPath: imp,
          message: `Cross-module violation: imports internal path of module "${m[1]}". Use @/modules/${m[1]}/api barrel instead.`,
        });
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Rule 4: process.env access outside lib/env.ts (ADR-005)
// ---------------------------------------------------------------------------
function checkProcessEnv(): Violation[] {
  const violations: Violation[] = [];
  // Check lib/ (except lib/env.ts itself) and app/api/
  const targets = [
    ...walk(path.join(ROOT, 'lib')),
    ...walk(path.join(ROOT, 'app', 'api')),
  ];

  for (const file of targets) {
    const rel = path.relative(ROOT, file);
    // Exempt lib/env.ts and any *.config.* files
    if (rel === 'lib/env.ts' || rel.includes('.config.')) continue;

    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, idx) => {
      // Skip comments
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
      if (/process\.env\b/.test(line)) {
        violations.push({
          file: rel,
          line: idx + 1,
          importPath: 'process.env',
          message: `ADR-005 violation: direct process.env access. Import { env } from '@/lib/env' instead.`,
        });
      }
    });
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const allViolations: Violation[] = [
    ...checkDomainLayer(),
    ...checkApplicationLayer(),
    ...checkCrossModuleImports(),
    ...checkProcessEnv(),
  ];

  if (allViolations.length === 0) {
    console.log('✅  Architecture check passed — no layer-boundary violations.');
    process.exit(0);
  }

  console.error(`\n❌  Architecture check failed — ${allViolations.length} violation(s):\n`);
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}  ${v.message}`);
  }
  console.error('');
  process.exit(1);
}

main();
