/**
 * PATCH /api/org/kyc/[orgId]/review
 *
 * Superadmin-only: approve or reject a KYC submission.
 * Dispatches webhook event to notify the org.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';

const reviewSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  notes:  z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only superadmin or platform admins can review KYC
    if (profile?.role !== 'admin' && (profile as any)?.is_superadmin !== true) {
      // Allow org admin to self-approve only if they are superadmin
      const { data: sysAdmin } = await supabase
        .from('system_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!sysAdmin) {
        return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
      }
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { action, notes } = parsed.data;

    const { data: kyc, error: fetchErr } = await supabase
      .from('org_kyc_records')
      .select('id, org_id, kyc_status')
      .eq('org_id', params.orgId)
      .single();

    if (fetchErr || !kyc) {
      return NextResponse.json({ error: 'KYC record not found for this organisation' }, { status: 404 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('org_kyc_records')
      .update({
        kyc_status:  action,
        kyc_notes:   notes ?? null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('org_id', params.orgId)
      .select()
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await logAuditEvent({
      orgId:       params.orgId,
      actorId:     user.id,
      actorEmail:  user.email,
      action:      `kyc.${action}`,
      resourceType: 'org_kyc',
      resourceId:  kyc.id,
      metadata:    { action, notes },
    });

    const eventName = action === 'approved' ? 'kyc.approved' : 'kyc.rejected';
    dispatchWebhookEvent(params.orgId, eventName, {
      org_id: params.orgId,
      status: action,
      notes:  notes ?? null,
      reviewed_at: updated.reviewed_at,
    });

    return NextResponse.json({ kyc: updated, success: true });
  } catch (err) {
    console.error('KYC review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
