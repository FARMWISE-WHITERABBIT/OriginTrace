import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';


const IMPERSONATION_COOKIE = 'origintrace_impersonation';

async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (data) return true;
    
    // Auto-bootstrap first user as system admin
    const { count } = await supabase
      .from('system_admins')
      .select('*', { count: 'exact', head: true });
    
    if (count === 0) {
      await supabase.from('system_admins').insert({ user_id: userId });
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('System admin check error:', err);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE);
    
    if (!impersonationCookie) {
      return NextResponse.json({ impersonating: false });
    }
    
    const impersonationData = JSON.parse(impersonationCookie.value);
    
    if (new Date(impersonationData.expires_at) < new Date()) {
      const response = NextResponse.json({ impersonating: false, expired: true });
      response.cookies.delete(IMPERSONATION_COOKIE);
      return response;
    }
    
    return NextResponse.json({
      impersonating: true,
      org_id: impersonationData.org_id,
      org_name: impersonationData.org_name,
      original_admin_id: impersonationData.original_admin_id,
      expires_at: impersonationData.expires_at
    });
    
  } catch (error) {
    console.error('Impersonation GET error:', error);
    return NextResponse.json({ impersonating: false, error: 'Failed to read impersonation status' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const isSuperAdmin = await isSystemAdmin(supabaseAdmin, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { action, org_id } = body;
    
    if (action === 'start') {
      if (!org_id) {
        return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
      }
      
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id, name, slug')
        .eq('id', org_id)
        .single();
      
      if (orgError || !org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      const impersonationData = {
        org_id: org.id,
        org_name: org.name,
        org_slug: org.slug,
        original_admin_id: user.id,
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      };
      
      try {
        await supabaseAdmin.from('audit_logs').insert({
          user_id: user.id,
          action: 'impersonation_start',
          resource_type: 'organization',
          resource_id: org.id.toString(),
          metadata: {
            org_name: org.name,
            impersonated_by: user.id,
            started_at: new Date().toISOString()
          }
        });
      } catch (auditErr) {
        console.error('[impersonate] Failed to write audit log for impersonation_start:', auditErr);
      }
      
      const response = NextResponse.json({
        success: true,
        impersonation: impersonationData,
        message: `Now viewing as ${org.name}`
      });
      
      response.cookies.set(IMPERSONATION_COOKIE, JSON.stringify(impersonationData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/'
      });
      
      return response;
    }
    
    if (action === 'stop') {
      const cookieStore = await cookies();
      const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE);
      
      if (impersonationCookie) {
        try {
          const impData = JSON.parse(impersonationCookie.value);
          try {
            await supabaseAdmin.from('audit_logs').insert({
              user_id: user.id,
              action: 'impersonation_end',
              resource_type: 'organization',
              resource_id: impData.org_id?.toString(),
              metadata: {
                org_name: impData.org_name,
                impersonated_by: user.id,
                ended_at: new Date().toISOString()
              }
            });
          } catch (auditErr) {
            console.error('[impersonate] Failed to write audit log for impersonation_end:', auditErr);
          }
        } catch (e) {}
      }
      
      const response = NextResponse.json({
        success: true,
        message: 'Impersonation ended'
      });
      
      response.cookies.delete(IMPERSONATION_COOKIE);
      
      return response;
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Impersonation POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
