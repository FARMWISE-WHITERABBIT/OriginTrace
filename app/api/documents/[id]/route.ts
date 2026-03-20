import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';

type AuthResult =
  | { error: NextResponse }
  | { user: { id: string }; profile: { org_id: string; role: string }; supabaseAdmin: SupabaseClient };

async function getAuthAndProfile(request: NextRequest): Promise<AuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { error: NextResponse.json({ error: 'Supabase is not properly configured' }, { status: 500 }) };
  }

  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!profile) return { error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }) };
  if (!profile.org_id) return { error: NextResponse.json({ error: 'No organization assigned' }, { status: 403 }) };

  const supabaseAdmin = createAdminClient();
  return { user, profile: profile as { org_id: string; role: string }, supabaseAdmin };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthAndProfile(request);
    if ('error' in auth) return auth.error;
    const { profile, supabaseAdmin } = auth;

    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document });

  } catch (error) {
    console.error('Document GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const auth = await getAuthAndProfile(request);
    if ('error' in auth) return auth.error;
    const { profile, supabaseAdmin } = auth;

    const patchAllowedRoles = ['admin', 'compliance_officer', 'quality_manager', 'logistics_coordinator'];
    if (!patchAllowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const allowedFields = [
      'title', 'document_type', 'file_url', 'file_name', 'file_size',
      'issued_date', 'expiry_date', 'status', 'linked_entity_type',
      'linked_entity_id', 'notes'
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) {
      console.error('Document update error:', error);
      return NextResponse.json({ error: 'Failed to update document', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ document });

  } catch (error) {
    console.error('Document PATCH error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthAndProfile(request);
    if ('error' in auth) return auth.error;
    const { profile, supabaseAdmin } = auth;

    const deleteAllowedRoles = ['admin', 'compliance_officer', 'quality_manager'];
    if (!deleteAllowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('org_id', profile.org_id);

    if (error) {
      console.error('Document delete error:', error);
      return NextResponse.json({ error: 'Failed to delete document', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Document DELETE error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
