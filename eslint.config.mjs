// @ts-check

/**
 * ESLint flat config — enforces the layer boundaries defined in ADR-001.
 *
 * Install deps (if not already present):
 *   npm install --save-dev eslint @eslint/js typescript-eslint
 *
 * Run:
 *   npx eslint . --ext .ts,.tsx
 */

import { defineConfig } from 'eslint/config';

// ---------------------------------------------------------------------------
// Layer-boundary patterns (see docs/architecture/adr/ADR-001-layer-boundaries.md)
// ---------------------------------------------------------------------------

/** Domain layer: pure TypeScript — no infra, no application, no UI */
const domainLayerRule = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['**/infra/**', '**/infra'],
          message:
            'Domain layer must not import from infra. Declare a port interface in domain and implement it in infra.',
        },
        {
          group: ['**/application/**', '**/application'],
          message: 'Domain layer must not import from application (dependency direction violation).',
        },
        {
          group: ['@/app/**', '../../../app/**'],
          message: 'Domain layer must not import from the UI/app layer.',
        },
        {
          group: ['next/server', 'next/navigation', 'next/headers'],
          message: 'Domain layer must not import Next.js server utilities (keep domain pure).',
        },
        {
          group: ['@supabase/*', '@/lib/supabase/**'],
          message:
            'Domain layer must not import Supabase directly. Use a port interface implemented in infra.',
        },
      ],
    },
  ],
};

/** Application layer: orchestration — no direct infra imports */
const applicationLayerRule = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['**/infra/**', '@/lib/supabase/**', '@supabase/*'],
          message:
            'Application layer must not import from infra directly. Inject ports via constructor or function arguments.',
        },
        {
          group: ['@/app/**'],
          message: 'Application layer must not import from the UI/app layer.',
        },
      ],
    },
  ],
};

/** API routes: no direct domain imports — must go through application use-cases */
const apiRouteRule = {
  'no-restricted-imports': [
    'warn',
    {
      patterns: [
        {
          group: ['**/domain/**'],
          message:
            'API routes should not import domain entities directly. Call an application use-case instead.',
        },
      ],
    },
  ],
};

/** Env access: no direct process.env outside lib/env.ts (ADR-005) */
const noDirectProcessEnv = {
  'no-restricted-globals': [
    'error',
    {
      name: 'process',
      message:
        'Do not access process.env directly. Import `env` from @/lib/env instead (ADR-005).',
    },
  ],
};

// ---------------------------------------------------------------------------
// Config export
// ---------------------------------------------------------------------------
export default defineConfig([
  // ── Domain layer ──────────────────────────────────────────────────────────
  {
    files: ['modules/*/domain/**/*.ts', 'modules/*/domain/**/*.tsx'],
    rules: domainLayerRule,
  },

  // ── Application layer ─────────────────────────────────────────────────────
  {
    files: ['modules/*/application/**/*.ts', 'modules/*/application/**/*.tsx'],
    rules: applicationLayerRule,
  },

  // ── API routes ────────────────────────────────────────────────────────────
  {
    files: ['app/api/**/*.ts'],
    rules: apiRouteRule,
  },

  // ── Cross-module import enforcement ───────────────────────────────────────
  // Modules may only import other modules through their published api/ barrel.
  {
    files: ['modules/**/*.ts', 'modules/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Allow imports from own module freely; block deep imports into other modules
              group: ['@/modules/*/application/**', '@/modules/*/domain/**', '@/modules/*/infra/**'],
              message:
                "Import from another module's public api/ barrel, not from its internal layers. E.g. use @/modules/identity-access/api instead of @/modules/identity-access/domain/...",
            },
          ],
        },
      ],
    },
  },
]);
