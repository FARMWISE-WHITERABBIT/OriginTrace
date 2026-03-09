import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';
import { createClient as createServerClient } from '@/lib/supabase/server';

async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', userId)
      .single();
    return !!data;
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
        
        const { count: buyerOrgCount } = await supabase
          .from('buyer_organizations')
          .select('*', { count: 'exact', head: true });

        const { count: supplyChainLinkCount } = await supabase
          .from('supply_chain_links')
          .select('*', { count: 'exact', head: true });

        const { count: contractCount } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true });

        const { count: documentCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true });

        const { count: expiredDocCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .in('status', ['expired', 'expiring_soon']);

        const { data: paymentData } = await supabase
          .from('payments')
          .select('amount, currency');

        const paymentCount = (paymentData || []).length;
        const paymentByCurrency: Record<string, number> = {};
        for (const p of paymentData || []) {
          const cur = p.currency || 'NGN';
          paymentByCurrency[cur] = (paymentByCurrency[cur] || 0) + (parseFloat(p.amount) || 0);
        }

        const { count: dppCount } = await supabase
          .from('digital_product_passports')
          .select('*', { count: 'exact', head: true });

        const { count: activeDppCount } = await supabase
          .from('digital_product_passports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        const { count: revokedDppCount } = await supabase
          .from('digital_product_passports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'revoked');

        const { count: apiKeyCount } = await supabase
          .from('api_keys')
          .select('*', { count: 'exact', head: true });

        const { count: activeApiKeyCount } = await supabase
          .from('api_keys')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        const { count: complianceProfileCount } = await supabase
          .from('compliance_profiles')
          .select('*', { count: 'exact', head: true });

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
            compliance_rate: complianceRate,
            buyer_organizations: buyerOrgCount || 0,
            supply_chain_links: supplyChainLinkCount || 0,
            contracts: contractCount || 0,
            documents: documentCount || 0,
            expired_documents: expiredDocCount || 0,
            payment_count: paymentCount,
            payment_by_currency: paymentByCurrency,
            dpp_total: dppCount || 0,
            dpp_active: activeDppCount || 0,
            dpp_revoked: revokedDppCount || 0,
            api_keys_total: apiKeyCount || 0,
            api_keys_active: activeApiKeyCount || 0,
            compliance_profiles: complianceProfileCount || 0,
          }
        });
      }
      
      case 'buyer_organizations': {
        const { data: buyerOrgs, error: buyerOrgsError } = await supabase
          .from('buyer_organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (buyerOrgsError) {
          return NextResponse.json({ error: buyerOrgsError.message }, { status: 500 });
        }

        const buyerOrgIds = (buyerOrgs || []).map((o: any) => o.id);

        if (buyerOrgIds.length === 0) {
          return NextResponse.json({ buyer_organizations: [] });
        }

        const [linksResult, contractsResult] = await Promise.all([
          supabase
            .from('supply_chain_links')
            .select('id, buyer_org_id, exporter_org_id, status, invited_at, accepted_at')
            .in('buyer_org_id', buyerOrgIds),
          supabase
            .from('contracts')
            .select('buyer_org_id')
            .in('buyer_org_id', buyerOrgIds),
        ]);

        const allLinks = linksResult.data || [];
        const allContracts = contractsResult.data || [];

        const linksByBuyerOrg = new Map<string, any[]>();
        const allExporterOrgIds = new Set<string>();
        for (const link of allLinks) {
          const list = linksByBuyerOrg.get(link.buyer_org_id) || [];
          list.push(link);
          linksByBuyerOrg.set(link.buyer_org_id, list);
          if (link.exporter_org_id) allExporterOrgIds.add(link.exporter_org_id);
        }

        const contractCountByBuyerOrg = new Map<string, number>();
        for (const c of allContracts) {
          contractCountByBuyerOrg.set(c.buyer_org_id, (contractCountByBuyerOrg.get(c.buyer_org_id) || 0) + 1);
        }

        let exporterMap = new Map<string, any>();
        if (allExporterOrgIds.size > 0) {
          const { data: exporters } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .in('id', Array.from(allExporterOrgIds));
          exporterMap = new Map((exporters || []).map((e: any) => [e.id, e]));
        }

        const enrichedBuyerOrgs = (buyerOrgs || []).map((org: any) => {
          const links = linksByBuyerOrg.get(org.id) || [];
          const linkedExporters = links.map((link: any) => {
            const exporter = exporterMap.get(link.exporter_org_id);
            return {
              id: link.id,
              exporter_name: exporter?.name || 'Unknown',
              exporter_slug: exporter?.slug || '-',
              status: link.status || 'pending',
              invited_at: link.invited_at,
              accepted_at: link.accepted_at,
            };
          });

          return {
            ...org,
            supply_chain_link_count: links.length,
            contract_count: contractCountByBuyerOrg.get(org.id) || 0,
            linked_exporters: linkedExporters,
          };
        });

        return NextResponse.json({ buyer_organizations: enrichedBuyerOrgs });
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
    const { action, org_id, target_user_id } = body;
    
    switch (action) {
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
        const validRoles = ['admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor', 'buyer'];
        if (!role || !validRoles.includes(role)) {
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
