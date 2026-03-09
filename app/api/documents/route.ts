import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { enforceTier } from '@/lib/api/tier-guard';
import { documentCreateSchema, parseBody } from '@/lib/api/validation';


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

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.org_id) {
      return NextResponse.json(
        { error: 'No organization assigned' },
        { status: 403 }
      );
    }

    const tierBlock = await enforceTier(profile.org_id, 'documents');
    if (tierBlock) return tierBlock;

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');
    const linkedEntityType = searchParams.get('linked_entity_type');

    let query = supabaseAdmin
      .from('documents')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (typeFilter) {
      query = query.eq('document_type', typeFilter);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (linkedEntityType) {
      query = query.eq('linked_entity_type', linkedEntityType);
    }

    const { data: documents, error: docsError } = await query;

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

    const docsToUpdate = updatedDocs.filter((doc, i) => doc.status !== (documents || [])[i]?.status);
    for (const doc of docsToUpdate) {
      await supabaseAdmin
        .from('documents')
        .update({ status: doc.status })
        .eq('id', doc.id);
    }

    return NextResponse.json({ documents: updatedDocs });

  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(documentCreateSchema, rawBody);
    if (validationError) return validationError;

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.org_id) {
      return NextResponse.json(
        { error: 'No organization assigned' },
        { status: 403 }
      );
    }

    const roleError = requireRole(profile, ['admin', 'compliance_officer', 'quality_manager', 'logistics_coordinator']);
    if (roleError) return roleError;

    const tierBlock = await enforceTier(profile.org_id, 'documents');
    if (tierBlock) return tierBlock;

    // Validation handled by documentCreateSchema above

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
      .insert(newDoc)
      .select()
      .single();

    if (insertError) {
      console.error('Document insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create document', details: insertError.message },
        { status: 500 }
      );
    }

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

  } catch (error) {
    console.error('Document create error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
