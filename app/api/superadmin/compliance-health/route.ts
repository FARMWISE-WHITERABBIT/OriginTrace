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

// compliance_profiles columns (actual schema):
//   org_id, name, destination_market, regulation_framework, required_documents,
//   required_certifications, geo_verification_level, min_traceability_depth,
//   custom_rules, is_default, created_at, updated_at
//
// Note: no target_markets[], readiness_score, or dds_submitted columns.
// We derive active markets from the distinct regulation_frameworks per org.
// Readiness score and DDS status come from the submission_health_log (our own table).

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
      .select('id, name, subscription_tier, subscription_status, created_at')
      .eq('subscription_status', 'active')
      .order('name');

    if (orgsError) return NextResponse.json({ error: orgsError.message }, { status: 500 });

    const orgIds = (orgs ?? []).map((o: any) => o.id);
    if (orgIds.length === 0) return NextResponse.json({ tenants: [] });

    // Fetch compliance profiles — one org may have multiple profiles (one per framework)
    // We collect all regulation_frameworks per org to build active_markets list
    const [
      { data: compProfiles },
      { data: kycRecords },
      { data: apiCreds },
      { data: recentSubmissions },
      { data: failedFarms },
      { data: shipmentData },
    ] = await Promise.all([
      supabase
        .from('compliance_profiles')
        .select('org_id, regulation_framework, destination_market')
        .in('org_id', orgIds),
      supabase
        .from('org_kyc_records')
        .select('org_id, kyc_status')
        .in('org_id', orgIds),
      supabase
        .from('api_credential_status')
        .select('org_id, integration, is_configured, validation_status')
        .in('org_id', orgIds)
        .eq('integration', 'EU_TRACES'),
      supabase
        .from('submission_health_log')
        .select('org_id, status, submitted_at, framework')
        .in('org_id', orgIds)
        .eq('framework', 'EU_TRACES')
        .order('submitted_at', { ascending: false })
        .limit(orgIds.length * 3),
      supabase
        .from('farms')
        .select('org_id')
        .in('org_id', orgIds)
        .eq('compliance_status', 'rejected'),
      supabase
        .from('shipments')
        .select('org_id, readiness_decision, created_at')
        .in('org_id', orgIds)
        .order('created_at', { ascending: false })
        .limit(orgIds.length * 20),
    ]);

    // Map: org_id → list of regulation_frameworks (active markets)
    const activeMarketsMap = new Map<string, string[]>();
    for (const cp of compProfiles ?? []) {
      const current = activeMarketsMap.get(cp.org_id) ?? [];
      const fw = cp.regulation_framework ?? cp.destination_market;
      if (fw && !current.includes(fw)) current.push(fw);
      activeMarketsMap.set(cp.org_id, current);
    }

    // KYC lookup
    const kycMap = new Map<string, string>();
    for (const k of kycRecords ?? []) kycMap.set(k.org_id, k.kyc_status);

    // TRACES credential lookup
    const tracesCredMap = new Map<string, boolean>();
    for (const c of apiCreds ?? []) tracesCredMap.set(c.org_id, c.is_configured);

    // Last DDS submission per org
    const lastSubmissionMap = new Map<string, any>();
    for (const s of recentSubmissions ?? []) {
      if (!lastSubmissionMap.has(s.org_id)) lastSubmissionMap.set(s.org_id, s);
    }

    // Failed deforestation farm count
    const failedFarmCountMap = new Map<string, number>();
    for (const f of failedFarms ?? []) {
      failedFarmCountMap.set(f.org_id, (failedFarmCountMap.get(f.org_id) ?? 0) + 1);
    }

    // Clean shipment rate: readiness_decision = 'go' as approved proxy
    const shipmentsByOrg = new Map<string, any[]>();
    for (const s of shipmentData ?? []) {
      const list = shipmentsByOrg.get(s.org_id) ?? [];
      list.push(s);
      shipmentsByOrg.set(s.org_id, list);
    }

    const tenants = (orgs ?? []).map((org: any) => {
      const orgShipments = shipmentsByOrg.get(org.id) ?? [];
      const cleanShipments = orgShipments.filter(
        (s: any) => s.readiness_decision === 'go'
      ).length;
      const cleanShipmentRate =
        orgShipments.length > 0
          ? Math.round((cleanShipments / orgShipments.length) * 100)
          : null;

      const lastSub = lastSubmissionMap.get(org.id);

      return {
        org_id: org.id,
        org_name: org.name,
        subscription_tier: org.subscription_tier,
        active_markets: activeMarketsMap.get(org.id) ?? [],
        // readiness_score not in schema — null until we derive it
        audit_readiness_score: null as number | null,
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
