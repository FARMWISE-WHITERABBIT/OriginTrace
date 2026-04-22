/**
 * GET  /api/org/kyc  — fetch the org's KYC record (all members)
 * POST /api/org/kyc  — submit or update KYC details (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';

const kycSubmitSchema = z.object({
  cac_registration_number: z.string().optional(),
  tin:                     z.string().optional(),
  rc_number:               z.string().optional(),
  director_name:           z.string().optional(),
  director_id_type:        z.enum(['nin', 'passport', 'drivers_license']).optional(),
  director_id_number:      z.string().optional(),
  director_id_url:         z.string().url().optional(),
  bank_account_number:     z.string().optional(),
  bank_code:               z.string().optional(),
  bank_name:               z.string().optional(),
});

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_kyc_records')
      .select('*')
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ kyc: data ?? null });
  } catch (error) {
    console.error('KYC GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only org admins can submit KYC details' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = kycSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    // Upsert KYC record
    const { data: existing } = await supabase
      .from('org_kyc_records')
      .select('id, kyc_status')
      .eq('org_id', profile.org_id)
      .maybeSingle();

    const payload = {
      ...parsed.data,
      org_id: profile.org_id,
      // Move from pending → under_review on submission (if not already reviewed/approved)
      kyc_status: existing?.kyc_status === 'approved' ? 'approved' : 'under_review',
      submitted_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('org_kyc_records')
        .update(payload)
        .eq('org_id', profile.org_id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      result = data;
    } else {
      const { data, error } = await supabase
        .from('org_kyc_records')
        .insert(payload)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      result = data;
    }

    await logAuditEvent({
      orgId:       profile.org_id,
      actorId:     user.id,
      actorEmail:  user.email,
      action:      'kyc.submitted',
      resourceType: 'org_kyc',
      resourceId:  result.id,
      metadata:    { fields: Object.keys(parsed.data) },
    });

    return NextResponse.json({ kyc: result, success: true });
  } catch (error) {
    console.error('KYC POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
