/**
 * PATCH /api/escrow/disputes/[id]
 * Confirm dispute resolution for the calling party.
 * When both exporter and buyer confirm, the dispute auto-resolves and
 * the escrow is unblocked.
 * Roles: admin, aggregator, buyer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { confirmDisputeResolution } from '@/lib/services/escrow';

const ALLOWED_ROLES = ['admin', 'aggregator', 'buyer'];

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const dispute = await confirmDisputeResolution({
      disputeId: params.id,
      confirmingOrgId: profile.org_id,
      confirmingUserId: user.id,
      actorEmail: user.email,
    });

    const bothConfirmed = dispute.exporter_confirmed && dispute.buyer_confirmed;

    return NextResponse.json({
      dispute,
      message: bothConfirmed
        ? 'Dispute resolved. Escrow has been unblocked.'
        : 'Confirmation recorded. Awaiting the other party\'s confirmation.',
    });
  } catch (error) {
    console.error('Confirm resolution error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') || message.includes('already') || message.includes('Only') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
