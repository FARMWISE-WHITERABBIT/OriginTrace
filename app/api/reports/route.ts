import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rate-limit';

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  const ms: Record<string, number> = {
    '7d': 7 * 86400000,
    '30d': 30 * 86400000,
    '90d': 90 * 86400000,
    '1y': 365 * 86400000,
  };
  const start = new Date(now.getTime() - (ms[period] || ms['30d'])).toISOString();
  return { start, end };
}

export async function GET(request: NextRequest) {
  const rateCheck = await checkRateLimit(request, null, RATE_LIMIT_PRESETS.reports);
  if (rateCheck) return rateCheck;

  try {
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const orgId = profile.org_id;
    const type = request.nextUrl.searchParams.get('type');
    const period = request.nextUrl.searchParams.get('period') || '30d';
    const { start, end } = getDateRange(period);

    if (!type) {
      return NextResponse.json({ error: 'Report type is required' }, { status: 400 });
    }

    switch (type) {
      case 'period_performance':
        return NextResponse.json(await buildPeriodPerformance(supabase, orgId, start, end, period));
      case 'shipment_dds':
        return NextResponse.json(await buildShipmentDDS(supabase, orgId, start, end));
      case 'supplier_audit':
        return NextResponse.json(await buildSupplierAudit(supabase, orgId, start, end));
      case 'regulatory_readiness':
        return NextResponse.json(await buildRegulatoryReadiness(supabase, orgId, start, end));
      case 'buyer_intelligence':
        return NextResponse.json(await buildBuyerIntelligence(supabase, orgId, start, end));
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function buildPeriodPerformance(supabase: any, orgId: number, start: string, end: string, period: string) {
  const [batchesRes, farmsRes, paymentsRes, docsRes] = await Promise.all([
    supabase.from('collection_batches').select('id, total_weight, bag_count, commodity, created_at').eq('org_id', orgId).gte('created_at', start).lte('created_at', end),
    supabase.from('farms').select('id, compliance_status, commodity, area_hectares').eq('org_id', orgId),
    supabase.from('payments').select('id, amount, currency, status, created_at').eq('org_id', orgId).gte('created_at', start).lte('created_at', end),
    supabase.from('documents').select('id, status, expiry_date, document_type').eq('org_id', orgId),
  ]);

  const batches = batchesRes.data || [];
  const farms = farmsRes.data || [];
  const payments = paymentsRes.data || [];
  const docs = docsRes.data || [];

  const totalWeight = batches.reduce((s: number, b: any) => s + (b.total_weight || 0), 0);
  const totalBatches = batches.length;
  const approvedFarms = farms.filter((f: any) => f.compliance_status === 'approved').length;
  const farmComplianceRate = farms.length > 0 ? Math.round((approvedFarms / farms.length) * 100) : 0;
  const totalPayments = payments.filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + (p.amount || 0), 0);

  const commodityMap = new Map<string, { weight: number; batches: number; farms: number; approvedFarms: number }>();
  for (const b of batches) {
    const key = b.commodity || 'Unknown';
    const entry = commodityMap.get(key) || { weight: 0, batches: 0, farms: 0, approvedFarms: 0 };
    entry.weight += b.total_weight || 0;
    entry.batches += 1;
    commodityMap.set(key, entry);
  }
  for (const f of farms) {
    const key = f.commodity || 'Unknown';
    const entry = commodityMap.get(key) || { weight: 0, batches: 0, farms: 0, approvedFarms: 0 };
    entry.farms += 1;
    if (f.compliance_status === 'approved') entry.approvedFarms += 1;
    commodityMap.set(key, entry);
  }

  const commodityBreakdown = Array.from(commodityMap.entries()).map(([name, v]) => ({
    name,
    weight: Math.round(v.weight * 100) / 100,
    batches: v.batches,
    totalFarms: v.farms,
    complianceRate: v.farms > 0 ? Math.round((v.approvedFarms / v.farms) * 100) : 0,
  }));

  const dayMs = 86400000;
  const volumeTrends: Array<{ date: string; weight: number; batches: number }> = [];
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const bucketSize = period === '7d' ? dayMs : period === '30d' ? dayMs : period === '90d' ? 7 * dayMs : 30 * dayMs;
  for (let t = startMs; t < endMs; t += bucketSize) {
    const bucketStart = new Date(t).toISOString();
    const bucketEnd = new Date(t + bucketSize).toISOString();
    const inBucket = batches.filter((b: any) => b.created_at >= bucketStart && b.created_at < bucketEnd);
    volumeTrends.push({
      date: new Date(t).toISOString().split('T')[0],
      weight: Math.round(inBucket.reduce((s: number, b: any) => s + (b.total_weight || 0), 0) * 100) / 100,
      batches: inBucket.length,
    });
  }

  const expiredDocs = docs.filter((d: any) => d.expiry_date && new Date(d.expiry_date) < new Date()).length;
  const validDocs = docs.filter((d: any) => d.status === 'active' || d.status === 'verified').length;

  return {
    weightSummary: { current: Math.round(totalWeight * 100) / 100 },
    batchSummary: { current: totalBatches },
    compliance: { farmRate: farmComplianceRate, approvedFarms, totalFarms: farms.length },
    paymentSummary: { total: Math.round(totalPayments * 100) / 100, count: payments.length },
    commodityBreakdown,
    volumeTrends,
    documentHealth: { total: docs.length, valid: validDocs, expired: expiredDocs },
  };
}

async function buildShipmentDDS(supabase: any, orgId: number, start: string, end: string) {
  const { data: shipments } = await supabase
    .from('shipments')
    .select('id, destination_country, commodity, status, shipment_score, compliance_score, documentation_score, quality_score, logistics_score, created_at, decision')
    .eq('org_id', orgId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  const shipmentList = shipments || [];

  const shipmentDetails = await Promise.all(
    shipmentList.slice(0, 50).map(async (s: any) => {
      const [itemsRes, lotsRes, outcomesRes] = await Promise.all([
        supabase.from('shipment_items').select('id, item_type, batch_id, finished_good_id').eq('shipment_id', s.id),
        supabase.from('shipment_lots').select('id, lot_number, weight_kg, mass_balance_valid').eq('shipment_id', s.id),
        supabase.from('shipment_outcomes').select('id, outcome, reason').eq('shipment_id', s.id),
      ]);

      return {
        id: s.id,
        destination_country: s.destination_country,
        commodity: s.commodity,
        status: s.status,
        decision: s.decision,
        created_at: s.created_at,
        scores: {
          overall: s.shipment_score,
          compliance: s.compliance_score,
          documentation: s.documentation_score,
          quality: s.quality_score,
          logistics: s.logistics_score,
        },
        item_count: (itemsRes.data || []).length,
        lot_count: (lotsRes.data || []).length,
        outcomes: (outcomesRes.data || []).map((o: any) => ({ type: o.outcome_type, status: o.status })),
      };
    })
  );

  const scoreDistribution = {
    go: shipmentList.filter((s: any) => s.decision === 'go').length,
    conditional: shipmentList.filter((s: any) => s.decision === 'conditional').length,
    no_go: shipmentList.filter((s: any) => s.decision === 'no_go').length,
    pending: shipmentList.filter((s: any) => !s.decision || s.decision === 'pending').length,
  };

  const avgScore = shipmentList.length > 0
    ? Math.round(shipmentList.reduce((s: number, sh: any) => s + (sh.shipment_score || 0), 0) / shipmentList.length)
    : 0;

  return {
    summary: { totalShipments: shipmentList.length, averageScore: avgScore, scoreDistribution },
    shipments: shipmentDetails,
  };
}

async function buildSupplierAudit(supabase: any, orgId: number, start: string, end: string) {
  const [farmsRes, batchesRes] = await Promise.all([
    supabase.from('farms').select('id, farmer_name, community, compliance_status, boundary_geo, area_hectares, commodity, created_at, updated_at').eq('org_id', orgId),
    supabase.from('collection_batches').select('id, farm_id, total_weight, bag_count, created_at').eq('org_id', orgId).gte('created_at', start).lte('created_at', end),
  ]);

  const farms = farmsRes.data || [];
  const batches = batchesRes.data || [];

  const farmVolumes = new Map<number, { weight: number; batches: number; bags: number }>();
  for (const b of batches) {
    if (!b.farm_id) continue;
    const entry = farmVolumes.get(b.farm_id) || { weight: 0, batches: 0, bags: 0 };
    entry.weight += b.total_weight || 0;
    entry.batches += 1;
    entry.bags += b.bag_count || 0;
    farmVolumes.set(b.farm_id, entry);
  }

  const farmDetails = farms.map((f: any) => {
    const vol = farmVolumes.get(f.id) || { weight: 0, batches: 0, bags: 0 };
    return {
      id: f.id,
      farmer_name: f.farmer_name,
      community: f.community,
      state: f.state,
      commodity: f.commodity,
      compliance_status: f.compliance_status,
      has_boundary: !!f.boundary_geo,
      area_hectares: f.area_hectares,
      period_weight: Math.round(vol.weight * 100) / 100,
      period_batches: vol.batches,
      period_bags: vol.bags,
    };
  });

  const gpsVerifiedCount = farms.filter((f: any) => f.boundary_geo).length;
  const complianceBreakdown = {
    approved: farms.filter((f: any) => f.compliance_status === 'approved').length,
    pending: farms.filter((f: any) => f.compliance_status === 'pending' || !f.compliance_status).length,
    rejected: farms.filter((f: any) => f.compliance_status === 'rejected').length,
  };

  return {
    summary: {
      totalFarms: farms.length,
      gpsVerifiedCount,
      gpsVerificationRate: farms.length > 0 ? Math.round((gpsVerifiedCount / farms.length) * 100) : 0,
      complianceBreakdown,
    },
    farms: farmDetails.sort((a: any, b: any) => b.period_weight - a.period_weight),
  };
}

async function buildRegulatoryReadiness(supabase: any, orgId: number, start: string, end: string) {
  const [farmsRes, shipmentsRes, docsRes, profilesRes] = await Promise.all([
    supabase.from('farms').select('id, compliance_status, boundary_geo, deforestation_check, area_hectares').eq('org_id', orgId),
    supabase.from('shipments').select('id, compliance_score, shipment_score, decision, compliance_profile_id, destination_country, created_at').eq('org_id', orgId).gte('created_at', start).lte('created_at', end),
    supabase.from('documents').select('id, document_type, status, expiry_date').eq('org_id', orgId),
    supabase.from('compliance_profiles').select('id, name, framework, rules').eq('org_id', orgId),
  ]);

  const farms = farmsRes.data || [];
  const shipments = shipmentsRes.data || [];
  const docs = docsRes.data || [];
  const profiles = profilesRes.data || [];

  const geoVerified = farms.filter((f: any) => f.boundary_geo).length;
  const deforestationChecked = farms.filter((f: any) => f.deforestation_check).length;
  const deforestationClear = farms.filter((f: any) => {
    const check = f.deforestation_check;
    return check && (check.deforestation_free === true || check.risk_level === 'low');
  }).length;

  const requiredDocTypes = ['phytosanitary', 'certificate_of_origin', 'fumigation', 'quality_certificate', 'dds'];
  const docCoverage: Record<string, { total: number; valid: number }> = {};
  for (const dt of requiredDocTypes) {
    const matching = docs.filter((d: any) => d.document_type === dt);
    const valid = matching.filter((d: any) => d.status === 'active' || d.status === 'verified');
    docCoverage[dt] = { total: matching.length, valid: valid.length };
  }

  const frameworks = [
    {
      name: 'EUDR',
      metrics: {
        geoVerification: farms.length > 0 ? Math.round((geoVerified / farms.length) * 100) : 0,
        deforestationCheck: farms.length > 0 ? Math.round((deforestationChecked / farms.length) * 100) : 0,
        deforestationClear: deforestationChecked > 0 ? Math.round((deforestationClear / deforestationChecked) * 100) : 0,
        ddsReady: (docCoverage['dds']?.valid || 0) > 0,
      },
    },
    {
      name: 'FSMA 204',
      metrics: {
        lotTraceability: shipments.length > 0 ? Math.round(shipments.filter((s: any) => s.shipment_score >= 70).length / shipments.length * 100) : 0,
        kdeCompleteness: (docCoverage['quality_certificate']?.valid || 0) > 0,
        cteVerification: farms.length > 0 ? Math.round((geoVerified / farms.length) * 100) : 0,
      },
    },
    {
      name: 'UK Environment Act',
      metrics: {
        dueDiligence: farms.length > 0 ? Math.round((farms.filter((f: any) => f.compliance_status === 'approved').length / farms.length) * 100) : 0,
        geoVerification: farms.length > 0 ? Math.round((geoVerified / farms.length) * 100) : 0,
        legalityVerification: (docCoverage['certificate_of_origin']?.valid || 0) > 0,
      },
    },
    {
      name: 'Lacey Act / UFLPA',
      metrics: {
        supplyChainTransparency: farms.length > 0 ? Math.round((geoVerified / farms.length) * 100) : 0,
        countryOfOriginDocs: (docCoverage['certificate_of_origin']?.valid || 0) > 0,
        importDeclaration: (docCoverage['phytosanitary']?.valid || 0) > 0,
      },
    },
  ];

  return {
    summary: {
      totalFarms: farms.length,
      totalShipments: shipments.length,
      geoVerificationRate: farms.length > 0 ? Math.round((geoVerified / farms.length) * 100) : 0,
      complianceProfiles: profiles.length,
    },
    frameworks,
    documentCoverage: docCoverage,
  };
}

async function buildBuyerIntelligence(supabase: any, orgId: number, start: string, end: string) {
  const [contractsRes, shipmentsRes, docsRes] = await Promise.all([
    supabase.from('contracts').select('id, buyer_org_id, status, total_value, currency, commodity, created_at').eq('exporter_org_id', orgId),
    supabase.from('shipments').select('id, destination_country, commodity, status, shipment_score, decision, created_at').eq('org_id', orgId).gte('created_at', start).lte('created_at', end),
    supabase.from('documents').select('id, document_type, status').eq('org_id', orgId),
  ]);

  const contracts = contractsRes.data || [];
  const shipments = shipmentsRes.data || [];
  const docs = docsRes.data || [];

  const activeContracts = contracts.filter((c: any) => c.status === 'active').length;
  const avgShipmentScore = shipments.length > 0
    ? Math.round(shipments.reduce((s: number, sh: any) => s + (sh.shipment_score || 0), 0) / shipments.length)
    : 0;

  const destinationMap = new Map<string, { count: number; avgScore: number; totalScore: number }>();
  for (const s of shipments) {
    const key = s.destination_country || 'Unknown';
    const entry = destinationMap.get(key) || { count: 0, avgScore: 0, totalScore: 0 };
    entry.count += 1;
    entry.totalScore += s.shipment_score || 0;
    destinationMap.set(key, entry);
  }

  const byDestination = Array.from(destinationMap.entries()).map(([country, v]) => ({
    country,
    shipments: v.count,
    avgScore: v.count > 0 ? Math.round(v.totalScore / v.count) : 0,
  })).sort((a, b) => b.shipments - a.shipments);

  const riskFlags = {
    lowScoreShipments: shipments.filter((s: any) => (s.shipment_score || 0) < 50).length,
    noGoDecisions: shipments.filter((s: any) => s.decision === 'no_go').length,
    conditionalDecisions: shipments.filter((s: any) => s.decision === 'conditional').length,
  };

  const validDocCount = docs.filter((d: any) => d.status === 'active' || d.status === 'verified').length;
  const docCompleteness = docs.length > 0 ? Math.round((validDocCount / docs.length) * 100) : 0;

  return {
    summary: {
      activeContracts,
      totalShipments: shipments.length,
      averageShipmentScore: avgShipmentScore,
      documentCompleteness: docCompleteness,
    },
    byDestination,
    riskFlags,
    contractSummary: {
      total: contracts.length,
      active: activeContracts,
      completed: contracts.filter((c: any) => c.status === 'completed').length,
    },
  };
}
