import { NextResponse } from 'next/server';

/**
 * Public buyer registration has been removed.
 * New buyer organisations are provisioned by the superadmin.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Self-service registration is not available. Contact your administrator.' },
    { status: 410 }
  );
}
