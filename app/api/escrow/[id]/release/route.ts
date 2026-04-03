/**
 * POST /api/escrow/[id]/release
 * Release funds for a specific milestone. Blocked during active disputes.
 * Roles: admin, aggregator
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { releaseMilestone } from '@/lib/services/escrow';

const ALLOWED_ROLES = ['admin', 'aggregator'];

const releaseSchema = z.object({
  milestone_id: z.string().min(1),
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
    const parsed = releaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    await releaseMilestone({
      escrowId: params.id,
      milestoneId: parsed.data.milestone_id,
      actorId: user.id,
      actorEmail: user.email,
      orgId: profile.org_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Escrow release error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('blocked') || message.includes('not found') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
