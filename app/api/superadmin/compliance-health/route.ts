import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';

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

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier, subscription_status, created_at, settings')
      .eq('subscription_status', 'active')
      .order('name');

    if (orgsError) return NextResponse.json({ error: orgsError.message }, { status: 500 });

    const orgIds = (orgs ?? []).map((o: any) => o.id);

    if (orgIds.length === 0) return NextResponse.json({ tenants: [] });

    // Fetch compliance data in parallel
    const [
      { data: compProfiles },
      { data: kycRecords },
      { data: apiCreds },
      { data: recentSubmissions },
      { data: shipments },
    ] = await Promise.all([
      supabase
        .from('compliance_profiles')
        .select('org_id, target_markets, readiness_score, updated_at')
        .in('org_id', orgIds),
      supabase
        .from('org_kyc_records')
        .select('org_id, status')
        .in('org_id', orgIds),
      supabase
        .from('api_credential_status')
        .select('org_id, integration, is_configured, validation_status')
        .in('org_id', orgIds)
        .eq('integration', 'EU_TRACES'),
      supabase
        .from('submission_health_log')
        .select('org_id, status, submitted_at')
        .in('org_id', orgIds)
        .eq('framework', 'EU_TRACES')
        .order('submitted_at', { ascending: false })
        .limit(orgIds.length * 3),
      supabase
        .from('shipments')
        .select('org_id, compliance_status, created_at')
        .in('org_id', orgIds)
        .order('created_at', { ascending: false })
        .limit(orgIds.length * 20),
    ]);

    // Also get farms with failed deforestation checks
    const { data: failedFarms } = await supabase
      .from('farms')
      .select('org_id')
      .in('org_id', orgIds)
      .eq('compliance_status', 'rejected');

    // Build lookup maps
    const compProfileMap = new Map<string, any>();
    for (const cp of compProfiles ?? []) compProfileMap.set(cp.org_id, cp);

    const kycMap = new Map<string, string>();
    for (const k of kycRecords ?? []) kycMap.set(k.org_id, k.status);

    const tracesCredMap = new Map<string, boolean>();
    for (const c of apiCreds ?? []) tracesCredMap.set(c.org_id, c.is_configured);

    const lastSubmissionMap = new Map<string, any>();
    for (const s of recentSubmissions ?? []) {
      if (!lastSubmissionMap.has(s.org_id)) lastSubmissionMap.set(s.org_id, s);
    }

    const failedFarmCountMap = new Map<string, number>();
    for (const f of failedFarms ?? []) {
      failedFarmCountMap.set(f.org_id, (failedFarmCountMap.get(f.org_id) ?? 0) + 1);
    }

    const shipmentsByOrg = new Map<string, any[]>();
    for (const s of shipments ?? []) {
      const list = shipmentsByOrg.get(s.org_id) ?? [];
      list.push(s);
      shipmentsByOrg.set(s.org_id, list);
    }

    const tenants = (orgs ?? []).map((org: any) => {
      const cp = compProfileMap.get(org.id);
      const orgShipments = shipmentsByOrg.get(org.id) ?? [];
      const cleanShipments = orgShipments.filter((s: any) => s.compliance_status === 'approved').length;
      const cleanShipmentRate = orgShipments.length > 0
        ? Math.round((cleanShipments / orgShipments.length) * 100)
        : null;

      const lastSub = lastSubmissionMap.get(org.id);

      return {
        org_id: org.id,
        org_name: org.name,
        subscription_tier: org.subscription_tier,
        active_markets: cp?.target_markets ?? [],
        audit_readiness_score: cp?.readiness_score ?? null,
        failed_deforestation_farms: failedFarmCountMap.get(org.id) ?? 0,
        last_dds_submission_date: lastSub?.submitted_at ?? null,
        last_dds_status: lastSub?.status ?? null,
        clean_shipment_rate: cleanShipmentRate,
        total_shipments: orgShipments.length,
        traces_credentials_configured: tracesCredMap.get(org.id) ?? false,
        kyc_status: kycMap.get(org.id) ?? 'not_submitted',
      };
    });

    return NextResponse.json({ tenants });
  } catch (err) {
    console.error('Compliance health API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
