import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  try {
    // Check if user is in system_admins table
    const { data, error } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (data) return true;
    
    // If no system admins exist, auto-bootstrap the first user
    const { count } = await supabase
      .from('system_admins')
      .select('*', { count: 'exact', head: true });
    
    if (count === 0) {
      // Auto-add first authenticated user as system admin
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
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const isSuperAdmin = await isSystemAdmin(supabase, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    
    switch (resource) {
      case 'organizations': {
        const { data: orgs, error } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        const orgStats = await Promise.all((orgs || []).map(async (org: any) => {
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id);
          
          const { count: agentCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .eq('role', 'agent');
          
          const { count: farmCount } = await supabase
            .from('farms')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id);
          
          const { count: approvedFarms } = await supabase
            .from('farms')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .eq('compliance_status', 'approved');
          
          const { count: bagCount } = await supabase
            .from('bags')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id);
          
          const { data: tonnageData } = await supabase
            .from('collection_batches')
            .select('total_weight')
            .eq('org_id', org.id);
          
          const totalTonnage = (tonnageData || []).reduce((sum: number, b: any) => 
            sum + (parseFloat(b.total_weight) || 0), 0) / 1000;
          
          return {
            ...org,
            user_count: userCount || 0,
            agent_count: agentCount || 0,
            farm_count: farmCount || 0,
            approved_farms: approvedFarms || 0,
            bag_count: bagCount || 0,
            total_tonnage: totalTonnage
          };
        }));
        
        return NextResponse.json({ organizations: orgStats });
      }
      
      case 'users': {
        const orgId = searchParams.get('org_id');
        
        // Fetch from profiles table - only select columns that exist in schema cache
        let usersQuery = supabase
          .from('profiles')
          .select('*')
          .order('id', { ascending: false });
        
        if (orgId) {
          usersQuery = usersQuery.eq('org_id', orgId);
        }
        
        const { data: users, error: usersError } = await usersQuery;
        
        if (usersError) {
          console.error('Users fetch error:', usersError);
          return NextResponse.json({ error: usersError.message }, { status: 500 });
        }
        
        // Fetch all organizations for mapping
        const { data: organizations } = await supabase
          .from('organizations')
          .select('id, name, slug');
        
        const orgMap = new Map((organizations || []).map(o => [o.id, o]));
        
        const formattedUsers = (users || []).map((u: any) => ({
          id: u.id,
          user_id: u.user_id || u.id?.toString() || 'Unknown',
          full_name: u.full_name || u.email || u.user_id || 'Unknown',
          role: u.role || 'agent',
          org_id: u.org_id,
          organization: u.org_id ? orgMap.get(u.org_id) || null : null
        }));
        
        return NextResponse.json({ users: formattedUsers });
      }
      
      case 'metrics': {
        const { count: orgCount } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true });
        
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        const { count: farmCount } = await supabase
          .from('farms')
          .select('*', { count: 'exact', head: true });
        
        const { count: bagCount } = await supabase
          .from('bags')
          .select('*', { count: 'exact', head: true });
        
        const { count: approvedFarmCount } = await supabase
          .from('farms')
          .select('*', { count: 'exact', head: true })
          .eq('compliance_status', 'approved');
        
        return NextResponse.json({
          metrics: {
            organizations: orgCount || 0,
            users: userCount || 0,
            farms: farmCount || 0,
            bags: bagCount || 0,
            approved_farms: approvedFarmCount || 0
          }
        });
      }
      
      case 'enhanced_metrics': {
        const { count: orgCount } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true });
        
        const { count: activeOrgCount } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_status', 'active');
        
        const { count: suspendedOrgCount } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_status', 'suspended');
        
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        const { count: agentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'agent');
        
        const { count: onlineAgentCount } = await supabase
          .from('agent_sync_status')
          .select('*', { count: 'exact', head: true })
          .eq('is_online', true);
        
        const { count: farmCount } = await supabase
          .from('farms')
          .select('*', { count: 'exact', head: true });
        
        const { count: bagCount } = await supabase
          .from('bags')
          .select('*', { count: 'exact', head: true });
        
        const { count: approvedFarmCount } = await supabase
          .from('farms')
          .select('*', { count: 'exact', head: true })
          .eq('compliance_status', 'approved');
        
        const { data: weightData } = await supabase
          .from('collection_batches')
          .select('total_weight');
        
        const totalWeightKg = (weightData || []).reduce((sum: number, b: any) => 
          sum + (parseFloat(b.total_weight) || 0), 0);
        
        const complianceRate = farmCount && farmCount > 0 
          ? Math.round((approvedFarmCount || 0) / farmCount * 100) 
          : 0;
        
        return NextResponse.json({
          metrics: {
            organizations: orgCount || 0,
            active_orgs: activeOrgCount || 0,
            suspended_orgs: suspendedOrgCount || 0,
            users: userCount || 0,
            farms: farmCount || 0,
            bags: bagCount || 0,
            approved_farms: approvedFarmCount || 0,
            total_weight_kg: totalWeightKg,
            active_agents: agentCount || 0,
            online_agents: onlineAgentCount || 0,
            compliance_rate: complianceRate
          }
        });
      }
      
      case 'sync-status': {
        const { data: syncStatus, error } = await supabase
          .from('agent_sync_status')
          .select('*')
          .order('last_seen_at', { ascending: false });
        
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        // Fetch users and orgs for mapping
        const { data: allUsers } = await supabase.from('profiles').select('id, full_name, email, role');
        const { data: allOrgs } = await supabase.from('organizations').select('id, name');
        
        const userMap = new Map((allUsers || []).map(u => [u.id, { id: u.id, full_name: u.full_name || u.email || 'Unknown', role: u.role }]));
        const orgMap = new Map((allOrgs || []).map(o => [o.id, { id: o.id, name: o.name }]));
        
        const enrichedStatus = (syncStatus || []).map(s => ({
          ...s,
          agent: s.agent_id ? userMap.get(s.agent_id) || null : null,
          organization: s.org_id ? orgMap.get(s.org_id) || null : null
        }));
        
        return NextResponse.json({ sync_status: enrichedStatus });
      }
      
      default:
        return NextResponse.json({ status: 'authorized', role: 'superadmin', user_id: user.id });
    }
    
  } catch (error) {
    console.error('Superadmin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const isSuperAdmin = await isSystemAdmin(supabase, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { action, org_id, user_id, target_user_id } = body;
    
    switch (action) {
      case 'impersonate': {
        if (!target_user_id) {
          return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
        }
        
        const { data: targetUser, error: userError } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email, role, org_id')
          .eq('user_id', target_user_id)
          .single();
        
        // Fetch organization separately if needed
        let organization = null;
        if (targetUser?.org_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .eq('id', targetUser.org_id)
            .single();
          organization = orgData;
        }
        
        const targetProfile = targetUser ? { ...targetUser, organization } : null;
        
        if (userError || !targetProfile) {
          return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
        }
        
        return NextResponse.json({
          impersonation: {
            target_user_id,
            target_profile: targetProfile,
            original_admin_id: user.id,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          }
        });
      }
      
      case 'impersonate_org': {
        if (!org_id) {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        
        const { data: targetOrg, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', org_id)
          .single();
        
        if (orgError || !targetOrg) {
          return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        
        return NextResponse.json({
          impersonation: {
            org_id,
            organization: targetOrg,
            original_admin_id: user.id,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          },
          success: true
        });
      }
      
      case 'update_org_status': {
        if (!org_id) {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        
        const { subscription_status } = body;
        if (!subscription_status) {
          return NextResponse.json({ error: 'Subscription status required' }, { status: 400 });
        }
        
        const { data: org, error } = await supabase
          .from('organizations')
          .update({ subscription_status })
          .eq('id', org_id)
          .select()
          .single();
        
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        return NextResponse.json({ organization: org, success: true });
      }
      
      case 'update_user_role': {
        if (!target_user_id) {
          return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
        }
        
        const { role } = body;
        if (!role || !['admin', 'aggregator', 'agent'].includes(role)) {
          return NextResponse.json({ error: 'Valid role required' }, { status: 400 });
        }
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .update({ role })
          .eq('user_id', target_user_id)
          .select()
          .single();
        
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        return NextResponse.json({ profile, success: true });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Superadmin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
