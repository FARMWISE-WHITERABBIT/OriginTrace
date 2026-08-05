import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';
import { logAuditEvent, getClientIp } from '@/lib/audit';

const teamCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  role: z.string().min(1, 'Role is required'),
  assigned_state: z.string().optional(),
  assigned_lga: z.string().optional(),
});


export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    if (profile.role !== 'admin' && profile.role !== 'aggregator') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const { data: teamMembers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, full_name, role, created_at')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching team:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    
    const emailMap: Record<string, string> = {};
    authUsers?.users?.forEach(u => {
      emailMap[u.id] = u.email || '';
    });
    
    const membersWithEmail = teamMembers?.map(m => ({
      ...m,
      email: emailMap[m.user_id] || 'Unknown'
    }));
    
    return NextResponse.json({ team: membersWithEmail });
    
  } catch (error) {
    console.error('Team API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    if (profile.role !== 'admin' && profile.role !== 'aggregator') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const body = await request.json();

    const parsed = teamCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, fullName, role, assigned_state, assigned_lga } = parsed.data;
    
    const validRoles = profile.role === 'admin' 
      ? ['admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor']
      : ['agent'];
    
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: profile.role === 'aggregator' 
          ? 'Aggregators can only create agent accounts' 
          : 'Invalid role' 
      }, { status: 400 });
    }
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    
    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 });
    }
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        org_id: profile.org_id,
        role,
        full_name: fullName,
        assigned_state: assigned_state || null,
        assigned_lga: assigned_lga || null,
      });
    
    if (profileError) {
      console.error('Profile error:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }
    
    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'team.user_invited',
      resourceType: 'user',
      resourceId: authData.user.id,
      metadata: { invited_email: email, role, full_name: fullName },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: `${role} account created for ${email}`
    });
    
  } catch (error) {
    console.error('Team API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can remove team members' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }
    
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, org_id')
      .eq('user_id', userId)
      .single();
    
    if (!targetProfile || targetProfile.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'User not found in your organization' }, { status: 404 });
    }
    
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    
    return NextResponse.json({ success: true, message: 'User removed' });
    
  } catch (error) {
    console.error('Team API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
