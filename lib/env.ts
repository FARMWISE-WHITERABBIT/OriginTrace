/**
 * Validated environment variables.
 * Import from here instead of accessing process.env directly.
 * Throws at module load time if required vars are missing — fails fast at startup.
 */
import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL:      z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY:     z.string().min(1),

  // App
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CRON_SECRET: z.string().min(1).optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Payments
  MTN_MOMO_API_KEY:            z.string().optional(),
  MTN_MOMO_SUBSCRIPTION_KEY:   z.string().optional(),
  MTN_MOMO_BASE_URL:           z.string().url().optional(),
  MTN_MOMO_CALLBACK_URL:       z.string().url().optional(),
  MTN_MOMO_CALLBACK_SECRET:    z.string().optional(),
  OPAY_SECRET_KEY:             z.string().optional(),
  OPAY_MERCHANT_ID:            z.string().optional(),
  OPAY_BASE_URL:               z.string().url().optional(),
  PALMPAY_SECRET_KEY:          z.string().optional(),
  PALMPAY_APP_ID:              z.string().optional(),
  PALMPAY_BASE_URL:            z.string().url().optional(),

  // AI / external
  AI_INTEGRATIONS_OPENAI_API_KEY:  z.string().optional(),
  AI_INTEGRATIONS_OPENAI_BASE_URL: z.string().url().optional(),

  // Events
  EVENTS_ADMIN_KEY:   z.string().optional(),
  EVENTS_ADMIN_EMAIL: z.string().email().optional(),

});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = Object.keys(result.error.flatten().fieldErrors).join(', ');
    // Only hard-fail in production; warn in dev so local setup is easier
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing/invalid environment variables: ${missing}`);
    } else {
      console.warn(`[env] Missing/invalid vars (non-fatal in dev): ${missing}`);
    }
    // Return partial data in dev
    return process.env as unknown as Env;
  }
  return result.data;
}

export const env = validateEnv();
