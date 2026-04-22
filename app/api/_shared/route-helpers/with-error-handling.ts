/**
 * app/api/_shared/route-helpers/with-error-handling.ts
 *
 * Higher-order function that wraps a handler in a try/catch, returning a
 * consistent 500 response on unhandled exceptions.
 *
 * Re-exports the same function already available in lib/api/errors.ts so
 * callers can import everything route-helper related from one place.
 *
 * Usage:
 *   export const GET = withErrorHandling(async (request) => {
 *     // throw new Error(...) → 500 with sanitized message
 *   }, 'farms/GET');
 */

export { withErrorHandling } from '@/lib/api/errors';
