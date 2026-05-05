/**
 * GET    /api/lab-results/[id]  — fetch a single lab result
 * PATCH  /api/lab-results/[id]  — update result notes, file URL, or certificate details
 * DELETE /api/lab-results/[id]  — delete (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';

const labResultPatchSchema = z.object({
  result:           z.enum(['pass', 'fail', 'conditional']).optional(),
  result_value:     z.number().optional(),
  result_unit:      z.string().optional(),
  result_notes:     z.string().optional(),
  certificate_number: z.string().optional(),
  certificate_validity_days: z.number().int().positive().optional(),
  file_url:         z.string().url().optional(),
  file_name:        z.string().optional(),
  target_markets:   z.array(z.string()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { data, error } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Lab result not found' }, { status: 404 });

    return NextResponse.json({ result: data });
  } catch (error) {
    console.error('Lab result GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (!['admin', 'compliance_officer', 'quality_manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = labResultPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { ...parsed.data };

    // Recompute certificate_expiry_date if validity_days changed
    if (parsed.data.certificate_validity_days) {
      // Fetch current test_date
      const { data: current } = await supabase
        .from('lab_results')
        .select('test_date')
        .eq('id', params.id)
        .eq('org_id', profile.org_id)
        .single();

      if (current) {
        const testDate = new Date(current.test_date);
        testDate.setDate(testDate.getDate() + parsed.data.certificate_validity_days);
        updateData.certificate_expiry_date = testDate.toISOString().split('T')[0];
      }
    }

    const { data, error } = await supabase
      .from('lab_results')
      .update(updateData)
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'lab_result.updated',
      resourceType: 'lab_result',
      resourceId: params.id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    return NextResponse.json({ result: data });
  } catch (error) {
    console.error('Lab result PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete lab results' }, { status: 403 });
    }

    const { error } = await supabase
      .from('lab_results')
      .delete()
      .eq('id', params.id)
      .eq('org_id', profile.org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'lab_result.deleted',
      resourceType: 'lab_result',
      resourceId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lab result DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
