import { NextResponse } from 'next/server';

/**
 * Public self-registration has been removed.
 * New organisations are provisioned by the superadmin via /api/superadmin/create-org.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Self-service registration is not available. Contact your administrator.' },
    { status: 410 }
  );
}
