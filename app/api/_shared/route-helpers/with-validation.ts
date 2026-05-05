/**
 * app/api/_shared/route-helpers/with-validation.ts
 *
 * Higher-order function that parses and validates the JSON request body
 * against a Zod schema before passing it to the handler.
 *
 * Usage:
 *   const schema = z.object({ name: z.string(), weight: z.number() });
 *
 *   export const POST = withValidation(schema, async (request, { body }) => {
 *     // body is fully typed as z.infer<typeof schema>
 *     return NextResponse.json({ ok: true });
 *   });
 *
 * Compose with withAuth:
 *   export const POST = withAuth(
 *     withValidation(schema, async (request, { body, profile }) => { ... }),
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError, z } from 'zod';

export interface ValidationContext<T> {
  body: T;
}

type ValidatedHandler<T, Ctx = Record<string, never>> = (
  request: NextRequest,
  context: ValidationContext<T> & Ctx,
) => Promise<NextResponse>;

export function withValidation<T, Ctx = Record<string, never>>(
  schema: ZodSchema<T>,
  handler: ValidatedHandler<T, Ctx>,
) {
  return async (request: NextRequest, ctx?: Ctx): Promise<NextResponse> => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[]>;
      return NextResponse.json(
        { error: 'Validation failed', details: fieldErrors },
        { status: 400 },
      );
    }

    return handler(request, {
      ...((ctx ?? {}) as Ctx),
      body: result.data,
    });
  };
}

/**
 * Validate URL search params against a Zod schema.
 *
 * Usage:
 *   const querySchema = z.object({ limit: z.coerce.number().max(500).default(100) });
 *   export const GET = withQueryValidation(querySchema, async (request, { query }) => { ... });
 */
export function withQueryValidation<T extends z.ZodRawShape, Ctx = Record<string, never>>(
  schema: z.ZodObject<T>,
  handler: (request: NextRequest, context: { query: z.infer<z.ZodObject<T>> } & Ctx) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ctx?: Ctx): Promise<NextResponse> => {
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());

    const result = schema.safeParse(raw);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[]>;
      return NextResponse.json(
        { error: 'Invalid query parameters', details: fieldErrors },
        { status: 400 },
      );
    }

    return handler(request, {
      ...((ctx ?? {}) as Ctx),
      query: result.data,
    });
  };
}
