import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';

const ALLOWED_FILE_TYPES = ['photo', 'id_document', 'consent_form', 'certificate', 'other'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmId } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const editRoles = ['admin', 'aggregator'];
    if (!editRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify farm belongs to org
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .eq('org_id', profile.org_id)
      .single();
    if (farmError || !farm) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('file_type') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!fileType || !ALLOWED_FILE_TYPES.includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const storagePath = `kyc/${profile.org_id}/${farmId}/${fileType}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('compliance-files')
      .upload(storagePath, arrayBuffer, { upsert: true, contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('compliance-files')
      .getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl || storagePath;

    // Upsert the compliance_files record (replace if same farm + file_type)
    const { data: existing } = await supabase
      .from('compliance_files')
      .select('id')
      .eq('farm_id', farmId)
      .eq('file_type', fileType)
      .single();

    let fileRecord;
    if (existing) {
      const { data: updated } = await supabase
        .from('compliance_files')
        .update({ file_url: publicUrl, verification_status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id, file_type, file_url, verification_status, created_at')
        .single();
      fileRecord = updated;
    } else {
      const { data: inserted } = await supabase
        .from('compliance_files')
        .insert({ farm_id: farmId, org_id: profile.org_id, file_type: fileType, file_url: publicUrl, verification_status: 'pending' })
        .select('id, file_type, file_url, verification_status, created_at')
        .single();
      fileRecord = inserted;
    }

    return NextResponse.json({ file: fileRecord });

  } catch (err: any) {
    console.error('[farmers/[id]/files] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
