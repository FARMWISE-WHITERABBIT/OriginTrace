import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('sync route guards', () => {
  const src = readFileSync(join(__dirname, '..', 'app/api/sync/route.ts'), 'utf8');

  it('defines explicit allowed sync roles', () => {
    expect(src).toContain("const ALLOWED_SYNC_ROLES = ROLES.FIELD_ROLES;");
  });

  it('enforces role check in all handlers', () => {
    const occurrences = src.split("requireRole(profile, ALLOWED_SYNC_ROLES)").length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  it('returns structured blocker codes when compliance gate fails', () => {
    expect(src).toContain('blocker_codes');
    expect(src).toContain('warning_codes');
  });
});
