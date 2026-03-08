import { NextResponse } from 'next/server';

/**
 * This migration endpoint has been disabled.
 *
 * The batch_contributions table is defined in supabase/schema.sql and should be
 * applied via `supabase db push` or the Supabase dashboard SQL editor.
 *
 * Exposing an exec_sql RPC over HTTP — even behind a role check — is a critical
 * security risk and has been removed.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'This migration endpoint is disabled. Apply schema changes via supabase/schema.sql.',
      docs: 'Run: supabase db push  OR  apply supabase/schema.sql in the Supabase dashboard.',
    },
    { status: 410 }
  );
}
