import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';
import { logSuperadminAction } from '@/lib/superadmin-audit';

async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

async function getSuperadminRole(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('superadmin_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return data?.role ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSystemAdmin(supabase, user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');

    switch (resource) {
      case 'superadmin_roles': {
        const { data: roleRows, error } = await supabase
          .from('superadmin_roles')
          .select('*, system_admins!inner(user_id)')
          .order('created_at');

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ roles: roleRows ?? [] });
      }

      case 'impersonation_log': {
        const limit = parseInt(searchParams.get('limit') ?? '100');
        const { data, error } = await supabase
          .from('impersonation_session_events')
          .select('*, organizations(name)')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ log: data ?? [] });
      }

      case 'export_audit': {
        const { data, error } = await supabase
          .from('data_export_audit')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ exports: data ?? [] });
      }

      case 'deletion_requests': {
        const { data, error } = await supabase
          .from('tenant_deletion_requests')
          .select('*, organizations(name, subscription_tier)')
          .order('created_at', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ requests: data ?? [] });
      }

      case 'my_role': {
        const role = await getSuperadminRole(supabase, user.id);
        return NextResponse.json({ role: role ?? 'platform_admin' });
      }

      default:
        return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
    }
  } catch (err) {
    console.error('Governance API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSystemAdmin(supabase, user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'assign_superadmin_role': {
        const { target_user_id, role } = body;
        const validRoles = ['platform_admin', 'compliance_manager', 'finance_manager', 'support_agent'];
        if (!target_user_id || !role || !validRoles.includes(role))
          return NextResponse.json({ error: 'target_user_id and valid role required' }, { status: 400 });

        // Ensure target is a system admin
        const isAdmin = await isSystemAdmin(supabase, target_user_id);
        if (!isAdmin)
          return NextResponse.json({ error: 'User is not a system admin' }, { status: 400 });

        const { data, error } = await supabase
          .from('superadmin_roles')
          .upsert({
            user_id: target_user_id,
            role,
            granted_by: user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'assign_superadmin_role',
          targetType: 'user',
          targetId: target_user_id,
          afterState: { role },
          request,
        });

        return NextResponse.json({ role_assignment: data, success: true });
      }

      case 'log_impersonation_event': {
        const { session_id, impersonated_org_id, impersonated_user_id, event_type, action_description, resource_type, resource_id, metadata } = body;
        if (!session_id || !event_type)
          return NextResponse.json({ error: 'session_id and event_type required' }, { status: 400 });

        const { data, error } = await supabase
          .from('impersonation_session_events')
          .insert({
            session_id,
            superadmin_id: user.id,
            impersonated_org_id,
            impersonated_user_id,
            event_type,
            action_description,
            resource_type,
            resource_id,
            metadata: metadata ?? {},
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ event: data, success: true });
      }

      case 'log_data_export': {
        const { export_type, scope_description, record_count, org_id, metadata } = body;
        if (!export_type || !scope_description)
          return NextResponse.json({ error: 'export_type and scope_description required' }, { status: 400 });

        const { data, error } = await supabase
          .from('data_export_audit')
          .insert({
            exported_by: user.id,
            export_type,
            scope_description,
            record_count,
            org_id,
            metadata: metadata ?? {},
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ export_log: data, success: true });
      }

      case 'request_tenant_deletion': {
        const { org_id, deletion_reason, retention_obligations, scheduled_deletion_date } = body;
        if (!org_id || !deletion_reason)
          return NextResponse.json({ error: 'org_id and deletion_reason required' }, { status: 400 });

        const { data, error } = await supabase
          .from('tenant_deletion_requests')
          .insert({
            org_id,
            requested_by: user.id,
            deletion_reason,
            retention_obligations: retention_obligations ?? {},
            scheduled_deletion_date,
            status: 'pending',
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'request_tenant_deletion',
          targetType: 'organization',
          targetId: String(org_id),
          afterState: { deletion_reason, scheduled_deletion_date },
          request,
        });

        return NextResponse.json({ deletion_request: data, success: true });
      }

      case 'approve_tenant_deletion': {
        const { request_id, notes } = body;
        if (!request_id) return NextResponse.json({ error: 'request_id required' }, { status: 400 });

        const { data, error } = await supabase
          .from('tenant_deletion_requests')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', request_id)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'approve_tenant_deletion',
          targetType: 'organization',
          targetId: request_id,
          request,
        });

        return NextResponse.json({ deletion_request: data, success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Governance API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
