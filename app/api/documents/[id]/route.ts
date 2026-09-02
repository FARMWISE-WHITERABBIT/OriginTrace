import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { documentPatchSchema, parseBody } from '@/lib/api/validation';
import { deleteDocumentFile } from '@/lib/supabase/storage';
import { requireRole, ROLES } from '@/lib/rbac';
import { ApiError, withErrorHandling } from '@/lib/api/errors';
import { documentLinkBelongsToOrganization } from '@/lib/api/document-link-validation';

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
  
  const { enforceTier } = await import('@/lib/api/tier-guard');
  const tierBlock = await enforceTier(profile.org_id, 'documents');
  if (tierBlock) return { error: tierBlock };

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

export const PATCH = withErrorHandling(async (request: NextRequest, ctx: unknown) => {
  const { params } = ctx as { params: Promise<{ id: string }> };
  const { id } = await params;
  const rawBody = await request.json();

  const { data: body, error: validationError } = parseBody(documentPatchSchema, rawBody);
  if (validationError) return validationError;

  const auth = await getAuthAndProfile(request);
  if ('error' in auth) return auth.error;
  const { profile, supabaseAdmin } = auth;

  const roleError = requireRole(profile, ROLES.DOC_ROLES);
  if (roleError) return roleError;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('documents')
    .select('id, file_url, file_name, linked_entity_type, linked_entity_id')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (existingError) return ApiError.internal(existingError, 'documents/[id]/PATCH lookup');
  if (!existing) return ApiError.notFound('Document');

  const updates: Record<string, unknown> = { ...body };
  if (Object.keys(updates).length === 0) {
    return ApiError.badRequest('No valid fields to update');
  }

  if ('linked_entity_type' in body || 'linked_entity_id' in body) {
    const entityType = 'linked_entity_type' in body
      ? body.linked_entity_type
      : existing.linked_entity_type;
    const entityId = 'linked_entity_id' in body
      ? body.linked_entity_id
      : existing.linked_entity_id;
    const linkBelongsToOrganization = await documentLinkBelongsToOrganization(
      supabaseAdmin,
      profile.org_id,
      entityType,
      entityId,
    );
    if (!linkBelongsToOrganization) {
      return ApiError.badRequest('Linked entity is invalid or outside the active organization');
    }
  }

  if ('file_url' in updates && updates.file_url !== existing.file_url && existing.file_url) {
    try {
      const oldPath = extractStoragePath(existing.file_url as string);
      if (oldPath) await deleteDocumentFile(oldPath);
    } catch (cleanupErr) {
      console.warn('Failed to delete old storage file:', cleanupErr);
    }
  }

  const { data: document, error } = await supabaseAdmin
    .from('documents')
    .update(updates)
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select()
    .single();

  if (error) return ApiError.internal(error, 'documents/[id]/PATCH update');
  return NextResponse.json({ document });
}, 'documents/[id]/PATCH');

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
      .select('id, file_url')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (existing.file_url) {
      try {
        const storagePath = extractStoragePath(existing.file_url as string);
        if (storagePath) await deleteDocumentFile(storagePath);
      } catch (cleanupErr) {
        console.warn('Failed to delete storage file on document delete:', cleanupErr);
      }
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

function extractStoragePath(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl);
    const match = url.pathname.match(/\/storage\/v1\/object\/sign\/documents\/(.+)/);
    if (match && match[1]) return decodeURIComponent(match[1]);
    const fallback = url.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated)\/documents\/(.+)/);
    if (fallback && fallback[1]) return decodeURIComponent(fallback[1]);
    return null;
  } catch {
    return null;
  }
}
