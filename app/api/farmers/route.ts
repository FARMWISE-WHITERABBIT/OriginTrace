// READ-ONLY: this route only lists/aggregates farmers (GET) for reporting — it has no POST.
// Farmer/farm CREATION happens in app/api/farms/route.ts, which the registration UI
// (app/app/farmers/new/page.tsx) actually posts to.
// Why the split: "farms" is the CRUD entity table (one row per registered farm/farmer), while
// this route is a read-side aggregation over farmer_performance_ledger / a farmers RPC / the
// farms table, built for the farmers list & performance views rather than for writing data.
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { requireRole, ROLES } from '@/lib/rbac';
import { parsePagination } from '@/lib/api/validation';


export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const _roleError = requireRole(profile, ['admin', 'aggregator']);
    if (_roleError) return _roleError;

    const { searchParams } = new URL(request.url);
    const { from, to, page, limit } = parsePagination(searchParams);

    // TODO(schema-drift): the 'get_org_farmers' RPC no longer exists in the live DB (not in the
    // generated types' Functions list) — this call always errors and falls through to the
    // farmer_performance_ledger / farms fallbacks below (working as designed, but the RPC should
    // either be restored via migration or this dead code path removed).
    const { data: rpcFarmers, error: rpcError } = await supabaseAdmin.rpc('get_org_farmers' as any, {
      p_org_id: profile.org_id
    });

    if (!rpcError && rpcFarmers) {
      // RPC doesn't support .range() — slice in-process
      const total = (rpcFarmers as any[]).length;
      const paged = (rpcFarmers as any[]).slice(from, to + 1);
      return NextResponse.json({ farmers: paged, pagination: { page, limit, total } });
    }

    // Fallback 1: farmer_performance_ledger static table (pre-seeded data)
    const { data: ledgerFarmers, error: ledgerError, count: ledgerCount } = await supabaseAdmin
      .from('farmer_performance_ledger')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('total_delivery_kg', { ascending: false })
      .range(from, to);

    if (!ledgerError && ledgerFarmers && ledgerFarmers.length > 0) {
      return NextResponse.json({ farmers: ledgerFarmers, pagination: { page, limit, total: ledgerCount ?? 0 } });
    }

    // Fallback 2: query farms table directly so newly registered farmers always appear
    const { data: farms, error: farmsError, count: farmsCount } = await supabaseAdmin
      .from('farms')
      .select('id, farmer_name, org_id, community, area_hectares, commodity, consent_timestamp, compliance_status', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('farmer_name', { ascending: true })
      .range(from, to);

    if (farmsError) {
      console.error('Farmers query error:', farmsError);
      return NextResponse.json({ farmers: [], pagination: { page, limit, total: 0 } });
    }

    const farmers = (farms || []).map((f: any) => ({
      farm_id: f.id,
      farmer_name: f.farmer_name,
      org_id: f.org_id,
      community: f.community,
      area_hectares: f.area_hectares,
      commodity: f.commodity,
      total_delivery_kg: 0,
      total_batches: 0,
      total_bags: 0,
      avg_grade_score: null,
      last_delivery_date: null,
      delivery_frequency: 'low' as const,
      has_consent: !!f.consent_timestamp,
    }));

    return NextResponse.json({ farmers, pagination: { page, limit, total: farmsCount ?? 0 } });
    
  } catch (error) {
    console.error('Farmers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
