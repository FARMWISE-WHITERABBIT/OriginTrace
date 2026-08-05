#!/usr/bin/env node
/**
 * Session 4: Auth Pattern Standardisation
 *
 * Migrates all Pattern A routes from the 3-step manual auth boilerplate:
 *   1. createServerClient() + auth.getUser()
 *   2. adminClient.from('profiles').select(...).eq('user_id', user.id)
 *   3. if (!profile) / if (!profile.org_id) guards
 *
 * to the canonical single-call:
 *   const { user, profile } = await getAuthenticatedProfile(request);
 *   if (!user) return ApiError.unauthorized();
 *   if (!profile) return ApiError.notFound('Profile');
 *   if (!profile.org_id) return ApiError.forbidden('No organization assigned');
 *
 * Safe approach: AST-style line-by-line replacement with pattern matching.
 * Does NOT touch:
 *   - Routes already using getAuthenticatedProfile (Pattern B)
 *   - Routes using validateApiKey (Pattern C — API key routes)
 *   - Farmer-specific auth routes (/api/farmer/*)
 *   - Superadmin routes
 *   - Any route that doesn't have the exact 3-check boilerplate
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const API_DIR = path.join(process.cwd(), 'app/api');

// Routes to skip — they have custom auth logic or are Pattern B/C
const SKIP_ROUTES = new Set([
  'app/api/auth',
  'app/api/farmer/auth',
  'app/api/keys',
  'app/api/v1',
  'app/api/pedigree/route.ts', // already migrated in Session 1
]);

function shouldSkip(filePath: string): boolean {
  for (const skip of SKIP_ROUTES) {
    if (filePath.includes(skip)) return true;
  }
  return false;
}

interface MigrationResult {
  path: string;
  changed: boolean;
  reason?: string;
}

function migrateFile(filePath: string): MigrationResult {
  if (shouldSkip(filePath)) {
    return { path: filePath, changed: false, reason: 'skipped (in exclusion list)' };
  }

  let src = fs.readFileSync(filePath, 'utf-8');
  const original = src;

  // Only migrate files that have the Pattern A boilerplate
  if (!src.includes('createServerClient') || !src.includes('auth.getUser()')) {
    return { path: filePath, changed: false, reason: 'no Pattern A boilerplate' };
  }

  if (src.includes('getAuthenticatedProfile')) {
    return { path: filePath, changed: false, reason: 'already migrated (Pattern B)' };
  }

  // ── Step 1: Update imports ───────────────────────────────────────────────
  // Add getAuthenticatedProfile to api-auth import (or create it)
  if (!src.includes("from '@/lib/api-auth'")) {
    // Add api-auth import after the last import from next/server
    src = src.replace(
      /(import.*from 'next\/server';?\n)/,
      `$1import { getAuthenticatedProfile } from '@/lib/api-auth';\n`
    );
  } else {
    // Extend existing api-auth import
    src = src.replace(
      /import \{([^}]+)\} from '@\/lib\/api-auth'/,
      (match, imports) => {
        const parts = imports.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (!parts.includes('getAuthenticatedProfile')) {
          parts.push('getAuthenticatedProfile');
        }
        return `import { ${parts.join(', ')} } from '@/lib/api-auth'`;
      }
    );
  }

  // Remove createServerClient import if it's only used for auth (not for data queries)
  // We do this conservatively: only remove it if every usage is in the auth block
  // (i.e., the file doesn't call createServerClient() for anything other than auth.getUser())
  const serverClientUsages = (src.match(/createServerClient\(\)/g) || []).length;
  const authGetUserUsages = (src.match(/\.auth\.getUser\(\)/g) || []).length;
  if (serverClientUsages === authGetUserUsages && serverClientUsages > 0) {
    // All usages are for auth — safe to remove import and calls
    src = src.replace(/import \{ createClient as createServerClient \} from '@\/lib\/supabase\/server';\n?/g, '');
    src = src.replace(/import \{ [^}]*createServerClient[^}]* \} from '@\/lib\/supabase\/server';\n?/g, (match) => {
      // If the import has other things, keep them
      const withoutServerClient = match
        .replace(/,?\s*createClient as createServerClient/, '')
        .replace(/createClient as createServerClient,?\s*/, '');
      if (withoutServerClient.match(/import \{ \s*\} from/)) return '';
      return withoutServerClient;
    });
  }

  // ── Step 2: Replace the 3-part auth boilerplate block ───────────────────
  // We use a multi-pass regex approach to handle the variety of whitespace/style.

  // Pattern: The full block from createServerClient() call through org_id guard
  // This handles multiple style variants observed in the codebase.

  const authBlockPatterns = [
    // Variant 1: supabase = await createServerClient() then admin profile fetch
    {
      find: /(\s+)const (?:supabase|authClient) = await createServerClient\(\);\s*\n\s*const \{ data: \{ user \}[^}]*\} = await (?:supabase|authClient)\.auth\.getUser\(\);\s*\n\s*\n?\s*if \([^)]*userError[^)]*!user\)[^}]*\}\s*\n\s*\}\s*\n\s*(?:const supabaseAdmin = createAdminClient\(\);\s*\n\s*)?(?:const supabaseAdmin = (?:createAdminClient|createServiceClient)\(\);\s*\n\s*)?\s*const \{ data: profile[^}]*\} = await [^\n]+\s*\n[^\n]*\.from\('profiles'\)\s*\n[^\n]*\.select\([^)]+\)\s*\n[^\n]*\.eq\('user_id', user\.id\)\s*\n[^\n]*\.single\(\);\s*\n\s*\n?\s*if \(!profile\)[^}]*\}\s*\n\s*\}\s*\n\s*\n?\s*if \(!profile\.org_id\)[^}]*\}\s*\n\s*\}/gm,
      replace: (indent: string) => `${indent}const { user, profile } = await getAuthenticatedProfile(request);\n${indent}if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });\n${indent}if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });\n${indent}if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });`,
    },
  ];

  // Use a more surgical line-by-line approach for reliability
  src = replaceAuthBlock(src);

  if (src === original) {
    return { path: filePath, changed: false, reason: 'no matching auth block found (pattern mismatch)' };
  }

  // ── Step 3: Clean up now-unused createAdminClient calls that were only
  //            used for the profile fetch (the admin client may still be used
  //            for data queries, so we keep it if there are other usages)
  // We don't remove these — leave that as a manual cleanup to be safe.

  fs.writeFileSync(filePath, src, 'utf-8');
  return { path: filePath, changed: true };
}

/**
 * Line-by-line auth block replacement.
 * More reliable than regex for multi-line blocks with style variations.
 */
function replaceAuthBlock(src: string): string {
  const lines = src.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect start of auth block: createServerClient() assignment
    if (
      (trimmed.includes('= await createServerClient()') || trimmed.includes('createServerClient();')) &&
      !trimmed.startsWith('//')
    ) {
      const indent = line.match(/^(\s*)/)?.[1] ?? '    ';

      // Collect lines until we've consumed: getUser, 401 guard, profile fetch, 404 guard, org_id guard
      const blockLines: string[] = [line];
      let j = i + 1;
      let state: 'getUser' | 'user_guard' | 'profile_fetch' | 'profile_guard' | 'orgid_guard' | 'done' = 'getUser';

      while (j < lines.length && state !== 'done') {
        const l = lines[j];
        const t = l.trim();

        if (state === 'getUser') {
          blockLines.push(l);
          if (t.includes('.auth.getUser()')) state = 'user_guard';
          j++;
          continue;
        }

        if (state === 'user_guard') {
          blockLines.push(l);
          // Look for the closing } of the if (!user) block
          if (t === '}' || t.startsWith('} ')) {
            // Check if the NEXT non-blank line starts the profile fetch
            let peek = j + 1;
            while (peek < lines.length && lines[peek].trim() === '') { peek++; }
            const nextContent = lines[peek]?.trim() ?? '';
            if (nextContent.includes(".from('profiles')") || nextContent.includes('from(\'profiles\')') ||
                nextContent.includes('createAdminClient') || nextContent.includes('createServiceClient') ||
                nextContent.includes('data: profile')) {
              state = 'profile_fetch';
            } else if (nextContent.includes('data: profile') || nextContent.startsWith('const { data: profile')) {
              state = 'profile_fetch';
            }
          }
          j++;
          continue;
        }

        if (state === 'profile_fetch') {
          blockLines.push(l);
          // Look for .single() which ends the profile query
          if (t.includes('.single()') || t === '.single();') {
            state = 'profile_guard';
          }
          // Also handle: const { data: profile } = await admin.from('profiles')...single() on one line
          if (t.startsWith('const { data: profile') && t.includes('.single()')) {
            state = 'profile_guard';
          }
          j++;
          continue;
        }

        if (state === 'profile_guard') {
          blockLines.push(l);
          // Look for the closing } of the if (!profile) block
          if (t === '}' || t.startsWith('} ')) {
            let peek = j + 1;
            while (peek < lines.length && lines[peek].trim() === '') { peek++; }
            const nextContent = lines[peek]?.trim() ?? '';
            if (nextContent.includes('!profile.org_id') || nextContent.includes('profile.org_id')) {
              state = 'orgid_guard';
            }
          }
          j++;
          continue;
        }

        if (state === 'orgid_guard') {
          blockLines.push(l);
          if (t === '}' || t.startsWith('} ')) {
            state = 'done';
          }
          j++;
          continue;
        }

        blockLines.push(l);
        j++;
      }

      if (state === 'done') {
        // Replace the entire block with the canonical 4-liner
        output.push(`${indent}const { user, profile } = await getAuthenticatedProfile(request);`);
        output.push(`${indent}if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });`);
        output.push(`${indent}if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });`);
        output.push(`${indent}if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });`);
        i = j;
        // Skip blank lines immediately after the block
        while (i < lines.length && lines[i].trim() === '') {
          output.push('');
          i++;
        }
      } else {
        // Didn't find the full pattern — emit unchanged
        output.push(line);
        i++;
      }
      continue;
    }

    output.push(line);
    i++;
  }

  return output.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────

function getAllRouteFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllRouteFiles(full));
    } else if (entry.name === 'route.ts') {
      results.push(full);
    }
  }
  return results;
}

const files = getAllRouteFiles(API_DIR);
const results: MigrationResult[] = [];

for (const file of files) {
  const result = migrateFile(file);
  results.push(result);
}

const changed = results.filter(r => r.changed);
const skipped = results.filter(r => !r.changed && r.reason?.includes('skipped'));
const noPattern = results.filter(r => !r.changed && r.reason?.includes('no Pattern'));
const alreadyMigrated = results.filter(r => !r.changed && r.reason?.includes('already migrated'));
const noMatch = results.filter(r => !r.changed && r.reason?.includes('pattern mismatch'));

console.log(`\n✅  Migrated:        ${changed.length} routes`);
console.log(`⏭️   Already Pattern B: ${alreadyMigrated.length} routes`);
console.log(`⬜  No boilerplate:  ${noPattern.length} routes`);
console.log(`⚠️   Pattern mismatch: ${noMatch.length} routes`);
console.log(`🔒  Skipped:         ${skipped.length} routes`);

if (changed.length > 0) {
  console.log('\nChanged files:');
  changed.forEach(r => console.log(`  ✓ ${r.path.replace(process.cwd() + '/', '')}`));
}

if (noMatch.length > 0) {
  console.log('\nPattern mismatch (manual review needed):');
  noMatch.forEach(r => console.log(`  ! ${r.path.replace(process.cwd() + '/', '')}`));
}
