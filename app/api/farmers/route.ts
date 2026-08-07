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

    // farms is the source of truth for who's registered — it's written to on every
    // farmer registration. farmer_performance_ledger is a point-in-time snapshot
    // (populated by seed scripts / batch jobs), not a live table, so it must only be
    // used to *enrich* delivery stats, never as the primary list — using it as the
    // primary list meant a seeded org's real, newly-registered farmers could never
    // appear behind the seeded ledger rows.
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

    const farmIds = (farms || []).map((f) => f.id);
    const ledgerByFarmId = new Map<string, {
      total_delivery_kg: number | null;
      total_batches: number | null;
      total_bag_count: number | null;
      avg_grade_score: number | null;
      last_delivery_date: string | null;
    }>();
    if (farmIds.length > 0) {
      const { data: ledgerRows, error: ledgerError } = await supabaseAdmin
        .from('farmer_performance_ledger')
        .select('farm_id, total_delivery_kg, total_batches, total_bag_count, avg_grade_score, last_delivery_date')
        .eq('org_id', profile.org_id)
        .in('farm_id', farmIds);

      if (ledgerError) {
        console.error('Farmer performance ledger fetch error:', ledgerError);
      } else {
        for (const row of ledgerRows || []) {
          ledgerByFarmId.set(row.farm_id, row);
        }
      }
    }

    const farmers = (farms || []).map((f: any) => {
      const ledger = ledgerByFarmId.get(f.id);
      return {
        farm_id: f.id,
        farmer_name: f.farmer_name,
        org_id: f.org_id,
        community: f.community,
        area_hectares: f.area_hectares,
        commodity: f.commodity,
        total_delivery_kg: ledger?.total_delivery_kg ?? 0,
        total_batches: ledger?.total_batches ?? 0,
        total_bags: ledger?.total_bag_count ?? 0,
        avg_grade_score: ledger?.avg_grade_score ?? null,
        last_delivery_date: ledger?.last_delivery_date ?? null,
        delivery_frequency: 'low' as const,
        has_consent: !!f.consent_timestamp,
        compliance_status: f.compliance_status,
      };
    });

    return NextResponse.json({ farmers, pagination: { page, limit, total: farmsCount ?? 0 } });
    
  } catch (error) {
    console.error('Farmers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
