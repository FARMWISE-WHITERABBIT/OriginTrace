import { createClient as createServerClient } from '@/lib/supabase/server';
/**
 * GET /api/account/export — GDPR Article 20: Right to data portability
 * Returns all personal data held for the authenticated user as JSON.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createAdminClient();

    const [profileRes, auditRes, notifRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('user_id', user.id).single(),
      supabaseAdmin.from('audit_logs').select('action, resource_type, resource_id, created_at, metadata')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
      supabaseAdmin.from('notifications').select('*').eq('user_id', user.id).limit(200),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      data_subject: {
        user_id:   user.id,
        email:     user.email,
        created_at: user.created_at,
      },
      profile:       profileRes.data,
      activity_log:  auditRes.data || [],
      notifications: notifRes.data || [],
    };

    // Fire-and-forget audit log — ignore errors so export is never blocked
    void supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'account.data_exported',
      resource_type: 'user',
      resource_id: user.id,
      metadata: { exported_at: exportData.exported_at },
    });

    const filename = `origintrace-data-export-${new Date().toISOString().split('T')[0]}.json`;
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('[account/export]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
