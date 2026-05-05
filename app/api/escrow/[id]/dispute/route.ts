/**
 * POST /api/escrow/[id]/dispute
 * Open a dispute hold on an escrow account. Blocks further milestone releases.
 * Roles: admin, aggregator, buyer
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { openDispute } from '@/lib/services/escrow';

const ALLOWED_ROLES = ['admin', 'aggregator', 'buyer'];

const disputeSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = disputeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const dispute = await openDispute({
      escrowId: params.id,
      reason: parsed.data.reason,
      raisedBy: user.id,
      actorEmail: user.email,
      orgId: profile.org_id,
    });

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (error) {
    console.error('Open dispute error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') || message.includes('Cannot') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
