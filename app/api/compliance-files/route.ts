import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile, createServiceClient } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';
import { requireRole, ROLES } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user || !profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const _roleError = requireRole(profile, ['admin', 'aggregator', 'agent', 'compliance_officer', 'quality_manager']);
    if (_roleError) return _roleError;

    const body = await request.json();
    const { farm_id, file_type, file_url, verification_status } = body;

    if (!farm_id || !file_type || !file_url) {
      return NextResponse.json(
        { error: 'Missing required fields: farm_id, file_type, file_url' },
        { status: 400 }
      );
    }

    const validFileTypes = ['compliance_attestation', 'farmer_photo', 'id_document', 'organic_cert', 'ra_cert', 'ft_cert'];
    if (!validFileTypes.includes(file_type)) {
      return NextResponse.json(
        { error: `Invalid file_type. Must be one of: ${validFileTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServiceClient();

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('id, org_id')
      .eq('id', farm_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found or not in your organization' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('compliance_files')
      .insert({
        org_id: profile.org_id,
        farm_id,
        file_type,
        file_url,
        uploaded_by: profile.user_id,
        verification_status: verification_status || 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Compliance file insert error:', error);
      return NextResponse.json({ error: 'Failed to create compliance file' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: String(profile.org_id),
      actorId: user.id,
      actorEmail: user.email,
      action: 'compliance_file.created',
      resourceType: 'compliance_file',
      resourceId: String(data?.id),
      metadata: { farm_id, file_type },
    });

    return NextResponse.json({ success: true, id: data?.id }, { status: 201 });
  } catch (error) {
    console.error('Compliance files API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
