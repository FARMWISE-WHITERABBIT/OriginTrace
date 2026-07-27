import { existsSync, readFileSync } from 'fs';

export const LOCAL_DEMO_ADMIN_EMAIL = 'admin@demo.test';
export const LOCAL_DEMO_ADMIN_PASSWORD = 'Demo1234!';

const ALLOWED_APP_ORIGINS = new Set([
  'http://127.0.0.1:5000',
  'http://localhost:5000',
]);

const ALLOWED_SUPABASE_ORIGINS = new Set([
  'http://127.0.0.1:54321',
  'http://localhost:54321',
]);

export function getE2eEnvValue(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  if (!existsSync('.env.local')) return undefined;

  const line = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  return line?.slice(key.length + 1).trim();
}

function requireExactOrigin(value: string, label: string, allowedOrigins: Set<string>): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${label} must be an absolute URL; received an invalid URL`);
  }

  const isBareOrigin =
    url.pathname === '/' &&
    !url.search &&
    !url.hash &&
    !url.username &&
    !url.password;

  if (!isBareOrigin || !allowedOrigins.has(url.origin)) {
    throw new Error(
      `${label} must be one of ${Array.from(allowedOrigins).join(' or ')}; received origin ${url.origin}`,
    );
  }

  return url.origin;
}

export function getE2eBaseUrl(): string {
  return requireExactOrigin(
    process.env.E2E_BASE_URL || 'http://localhost:5000',
    'E2E_BASE_URL',
    ALLOWED_APP_ORIGINS,
  );
}

export function assertLocalE2eEnvironment(): { baseUrl: string; supabaseUrl: string } {
  const baseUrl = getE2eBaseUrl();
  const supabaseUrl = requireExactOrigin(
    getE2eEnvValue('NEXT_PUBLIC_SUPABASE_URL') || 'http://127.0.0.1:54321',
    'NEXT_PUBLIC_SUPABASE_URL',
    ALLOWED_SUPABASE_ORIGINS,
  );

  return { baseUrl, supabaseUrl };
}

export function getLocalE2eAdminCredentials(): { email: string; password: string } {
  assertLocalE2eEnvironment();

  const email = (process.env.E2E_ADMIN_EMAIL || LOCAL_DEMO_ADMIN_EMAIL).trim();
  const password = process.env.E2E_ADMIN_PASSWORD || LOCAL_DEMO_ADMIN_PASSWORD;

  if (!email.toLowerCase().endsWith('.test')) {
    throw new Error('E2E_ADMIN_EMAIL must use the reserved .test domain for local QA');
  }
  if (!password) {
    throw new Error('E2E_ADMIN_PASSWORD is required for local QA authentication');
  }

  return { email, password };
}
