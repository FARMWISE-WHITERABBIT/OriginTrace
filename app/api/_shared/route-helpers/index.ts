/**
 * app/api/_shared/route-helpers/index.ts
 *
 * Public barrel for all route helper HOCs.
 *
 * Typical usage pattern (compose from outermost to innermost):
 *
 *   import { withErrorHandling, withRateLimit, withAuth, withValidation } from '@/app/api/_shared/route-helpers';
 *   import { RATE_LIMIT_PRESETS } from '@/lib/api/rate-limit';
 *   import { z } from 'zod';
 *
 *   const bodySchema = z.object({ name: z.string() });
 *
 *   export const POST = withErrorHandling(
 *     withRateLimit(
 *       RATE_LIMIT_PRESETS.general,
 *       withAuth(
 *         withValidation(bodySchema, async (request, { profile, body }) => {
 *           // profile and body are both typed and validated
 *           return NextResponse.json({ ok: true });
 *         }),
 *         { requiredRole: 'admin' }
 *       )
 *     ),
 *     'resource/POST'
 *   );
 */

export { withAuth } from './with-auth';
export type { AuthContext, WithAuthOptions, Role } from './with-auth';

export { withValidation, withQueryValidation } from './with-validation';
export type { ValidationContext } from './with-validation';

export { withRateLimit } from './with-rate-limit';

export { withErrorHandling } from './with-error-handling';
