import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { enforceTier } from '@/lib/api/tier-guard';
import { parsePagination } from '@/lib/api/validation';
import { documentCreateSchema, parseBody } from '@/lib/api/validation';
import { requireRole, ROLES } from '@/lib/rbac';
import { ApiError, withErrorHandling } from '@/lib/api/errors';
import { documentLinkBelongsToOrganization } from '@/lib/api/document-link-validation';


export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const tierBlock = await enforceTier(profile.org_id, 'documents');
    if (tierBlock) return tierBlock;

    const { searchParams } = new URL(request.url);
    const { from, to, page, limit } = parsePagination(searchParams);
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');
    const linkedEntityType = searchParams.get('linked_entity_type');

    let query = supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (typeFilter) {
      query = query.eq('document_type', typeFilter);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (linkedEntityType) {
      query = query.eq('linked_entity_type', linkedEntityType);
    }

    const { data: documents, error: docsError, count } = await query;

    if (docsError) {
      console.error('Documents fetch error:', docsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: docsError.message },
        { status: 500 }
      );
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const updatedDocs = (documents || []).map(doc => {
      if (!doc.expiry_date || doc.status === 'archived') return doc;
      const expiry = new Date(doc.expiry_date);
      if (expiry < now && doc.status !== 'expired') {
        return { ...doc, status: 'expired' };
      }
      if (expiry <= sevenDaysFromNow && expiry >= now && doc.status !== 'expiring_soon') {
        return { ...doc, status: 'expiring_soon' };
      }
      return doc;
    });

    return NextResponse.json({ documents: updatedDocs, pagination: { page, limit, total: count ?? 0 } });

  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const rawBody = await request.json();
  const { data: body, error: validationError } = parseBody(documentCreateSchema, rawBody);
  if (validationError) return validationError;

  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return ApiError.unauthorized();
  if (!profile) return ApiError.notFound('Profile');
  if (!profile.org_id) return ApiError.forbidden('No organization assigned');
  const supabaseAdmin = createAdminClient();

  const roleError = requireRole(profile, ROLES.DOC_ROLES);
  if (roleError) return roleError;

  const tierBlock = await enforceTier(profile.org_id, 'documents');
  if (tierBlock) return tierBlock;

  const linkBelongsToOrganization = await documentLinkBelongsToOrganization(
    supabaseAdmin,
    profile.org_id,
    body.linked_entity_type,
    body.linked_entity_id,
  );
  if (!linkBelongsToOrganization) {
    return ApiError.badRequest('Linked entity is invalid or outside the active organization');
  }

  let status = 'active';
  if (body.expiry_date) {
    const now = new Date();
    const expiry = new Date(body.expiry_date);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (expiry < now) {
      status = 'expired';
    } else if (expiry <= sevenDaysFromNow) {
      status = 'expiring_soon';
    }
  }

  const newDoc = {
    org_id: profile.org_id,
    title: body.title,
    document_type: body.document_type,
    file_url: body.file_url || null,
    file_name: body.file_name || null,
    file_size: body.file_size || null,
    issued_date: body.issued_date || null,
    expiry_date: body.expiry_date || null,
    status,
    linked_entity_type: body.linked_entity_type || null,
    linked_entity_id: body.linked_entity_id || null,
    notes: body.notes || null,
    uploaded_by: user.id,
  };

  const { data: document, error: insertError } = await supabaseAdmin
    .from('documents')
    .insert(newDoc as any)
    .select()
    .single();

  if (insertError) return ApiError.internal(insertError, 'documents/POST insert');

  await logAuditEvent({
    orgId: profile.org_id,
    actorId: user.id,
    actorEmail: user.email,
    action: 'document.uploaded',
    resourceType: 'document',
    resourceId: document.id?.toString(),
    metadata: { title: body.title, document_type: body.document_type },
  });

  dispatchWebhookEvent(profile.org_id, 'document.uploaded', {
    document_id: document.id, title: body.title, document_type: body.document_type,
  });

  return NextResponse.json({ document });
}, 'documents/POST');
