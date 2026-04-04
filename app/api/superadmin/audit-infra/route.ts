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
      case 'auditor_sessions': {
        const { data, error } = await supabase
          .from('auditor_access_sessions')
          .select('*, organizations(name, subscription_tier)')
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ sessions: data ?? [] });
      }

      case 'audit_report_volume': {
        // Group audit report generation by org per month
        const { data, error } = await supabase
          .from('audit_events')
          .select('org_id, created_at, organizations(name)')
          .eq('action', 'generate_audit_report')
          .order('created_at', { ascending: false })
          .limit(500);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Aggregate by org and month
        const volumeMap: Record<string, { org_name: string; monthly: Record<string, number> }> = {};
        for (const ev of data ?? []) {
          const orgId = ev.org_id;
          const orgName = (ev.organizations as any)?.name ?? orgId;
          const month = ev.created_at.substring(0, 7);
          if (!volumeMap[orgId]) volumeMap[orgId] = { org_name: orgName, monthly: {} };
          volumeMap[orgId].monthly[month] = (volumeMap[orgId].monthly[month] ?? 0) + 1;
        }

        return NextResponse.json({ report_volume: Object.entries(volumeMap).map(([org_id, v]) => ({ org_id, ...v })) });
      }

      case 'badges': {
        const { data, error } = await supabase
          .from('compliance_badges')
          .select('*, organizations(name, subscription_tier)')
          .eq('is_active', true)
          .order('issued_at', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ badges: data ?? [] });
      }

      case 'evidence_packages': {
        const { data, error } = await supabase
          .from('evidence_package_log')
          .select('*, organizations(name)')
          .order('generated_at', { ascending: false })
          .limit(100);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ packages: data ?? [] });
      }

      default:
        return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
    }
  } catch (err) {
    console.error('Audit infra API error:', err);
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
      case 'revoke_auditor_session': {
        const { session_id } = body;
        if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

        const { data, error } = await supabase
          .from('auditor_access_sessions')
          .update({ is_active: false })
          .eq('id', session_id)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'revoke_auditor_session',
          targetType: 'organization',
          targetId: session_id,
          request,
        });

        return NextResponse.json({ session: data, success: true });
      }

      case 'invalidate_badge': {
        const { badge_id, reason } = body;
        if (!badge_id) return NextResponse.json({ error: 'badge_id required' }, { status: 400 });

        const { data, error } = await supabase
          .from('compliance_badges')
          .update({ is_active: false })
          .eq('id', badge_id)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'invalidate_compliance_badge',
          targetType: 'organization',
          targetId: badge_id,
          afterState: { reason },
          request,
        });

        return NextResponse.json({ badge: data, success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Audit infra API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
