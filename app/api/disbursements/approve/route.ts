import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const approveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
});

/** POST /api/disbursements/approve — bulk approve disbursement calculations */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Only allow approving 'pending' rows that belong to this org
    const { data, error } = await supabase
      .from('disbursement_calculations')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: now,
        updated_at: now,
      })
      .eq('org_id', profile.org_id)
      .eq('status', 'pending')
      .in('id', parsed.data.ids)
      .select();

    if (error) throw error;

    const approvedCount = data?.length ?? 0;
    const totalAmount = (data ?? []).reduce((sum, d) => sum + Number(d.net_amount), 0);

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'disbursement.approved',
      resourceType: 'disbursement_calculation',
      metadata: { count: approvedCount, total_amount: totalAmount, ids: parsed.data.ids },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      approved: approvedCount,
      total_amount: totalAmount,
      skipped: parsed.data.ids.length - approvedCount,
    });
  } catch (error) {
    console.error('POST disbursements/approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
