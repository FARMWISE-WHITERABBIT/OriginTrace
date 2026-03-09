import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const settingsPatchSchema = z.object({
  name: z.string().min(2).optional(),
  logo_url: z.string().url().nullable().optional(),
  settings: z.record(z.any()).optional(),
  active_lgas: z.array(z.string()).optional(),
  commodity_types: z.array(z.string()).optional(),
  commodities: z.array(z.string()).optional(),
  brand_colors: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).nullable().optional(),
});

const IMPERSONATION_COOKIE = 'origintrace_impersonation';

async function getImpersonatedOrgId(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE);
    
    if (impersonationCookie) {
      const data = JSON.parse(impersonationCookie.value);
      if (new Date(data.expires_at) > new Date()) {
        return data.org_id;
      }
    }
  } catch (error) {
    console.error('Error reading impersonation cookie:', error);
  }
  return null;
}

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
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    const isSuperAdmin = await isSystemAdmin(supabaseAdmin, user.id);
    
    if (!profile && !isSuperAdmin) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    let orgId = profile?.org_id;
    let canEdit = profile?.role === 'admin';
    
    if (isSuperAdmin) {
      const impersonatedOrgId = await getImpersonatedOrgId();
      if (impersonatedOrgId) {
        orgId = impersonatedOrgId;
        canEdit = true;
      }
    }
    
    if (!orgId) {
      return NextResponse.json({ error: 'No organization context' }, { status: 404 });
    }
    
    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    
    if (error || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!organization.invite_code) {
      let newCode = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = String(Math.floor(100000 + Math.random() * 900000));
        const { data: existing } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('invite_code', candidate)
          .maybeSingle();
        if (!existing) {
          newCode = candidate;
          break;
        }
      }
      if (!newCode) newCode = String(Math.floor(100000 + Math.random() * 900000));
      await supabaseAdmin
        .from('organizations')
        .update({ invite_code: newCode })
        .eq('id', orgId);
      organization.invite_code = newCode;
    }
    
    return NextResponse.json({ 
      organization,
      canEdit,
      isImpersonating: isSuperAdmin && orgId !== profile?.org_id
    });
    
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    const isSuperAdmin = await isSystemAdmin(supabaseAdmin, user.id);

    if (!profile && !isSuperAdmin) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    let orgId = profile?.org_id;

    if (isSuperAdmin) {
      const impersonatedOrgId = await getImpersonatedOrgId();
      if (impersonatedOrgId) {
        orgId = impersonatedOrgId;
      }
    }

    if (!isSuperAdmin && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update organization settings' }, { status: 403 });
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization context' }, { status: 404 });
    }
    
    const body = await request.json();

    const parsed = settingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, logo_url, settings, active_lgas, commodity_types, commodities, brand_colors } = parsed.data;
    
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (name) {
      updates.name = name.trim();
    }
    
    if (logo_url !== undefined) {
      updates.logo_url = logo_url || null;
    }
    
    if (settings) {
      const { data: currentOrg } = await supabaseAdmin
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();
      
      updates.settings = { ...(currentOrg?.settings || {}), ...settings };
    }
    
    if (active_lgas !== undefined) {
      updates.active_lgas = active_lgas;
    }
    
    if (commodity_types !== undefined) {
      updates.commodity_types = commodity_types;
    }
    
    if (commodities !== undefined) {
      updates.commodities = commodities;
    }
    
    if (brand_colors !== undefined) {
      if (brand_colors) {
        const validColors: Record<string, string> = {};
        for (const key of ['primary', 'secondary', 'accent'] as const) {
          if (brand_colors[key]) {
            validColors[key] = brand_colors[key];
          }
        }
        updates.brand_colors = Object.keys(validColors).length > 0 ? validColors : null;
      } else {
        updates.brand_colors = null;
      }
    }
    
    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();
    
    if (error) {
      console.error('Settings update error:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
    
    return NextResponse.json({ organization });
    
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    const isSuperAdmin = await isSystemAdmin(supabaseAdmin, user.id);

    if (!profile && !isSuperAdmin) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    let orgId = profile?.org_id;

    if (isSuperAdmin) {
      const impersonatedOrgId = await getImpersonatedOrgId();
      if (impersonatedOrgId) {
        orgId = impersonatedOrgId;
      }
    }

    if (!isSuperAdmin && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can regenerate invite code' }, { status: 403 });
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization context' }, { status: 404 });
    }
    
    const body = await request.json();
    
    if (body.action === 'regenerate_invite_code') {
      let newCode = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = String(Math.floor(100000 + Math.random() * 900000));
        const { data: existing } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('invite_code', candidate)
          .maybeSingle();
        if (!existing) {
          newCode = candidate;
          break;
        }
      }
      if (!newCode) newCode = String(Math.floor(100000 + Math.random() * 900000));
      
      const { data: organization, error } = await supabaseAdmin
        .from('organizations')
        .update({ invite_code: newCode, updated_at: new Date().toISOString() })
        .eq('id', orgId)
        .select()
        .single();
      
      if (error) {
        console.error('Invite code regeneration error:', error);
        return NextResponse.json({ error: 'Failed to regenerate invite code' }, { status: 500 });
      }
      
      return NextResponse.json({ organization, invite_code: newCode });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
