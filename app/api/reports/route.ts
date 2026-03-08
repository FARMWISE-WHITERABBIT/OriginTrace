import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rate-limit';
import { hasTierAccess } from '@/lib/config/tier-gating';

/**
 * GET /api/reports?type=shipment_dds|supplier_audit|regulatory_readiness|buyer_intelligence|period_performance
 *
 * Each report type has its own dedicated data query — not a re-skin of analytics.
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles').select('org_id, role').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { data: org } = await supabase
      .from('organizations').select('subscription_tier').eq('id', profile.org_id).single();
    const tier = org?.subscription_tier || 'starter';

    const rateLimitResponse = checkRateLimit(request, profile.org_id, RATE_LIMIT_PRESETS.analytics);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'period_performance';
    const period = searchParams.get('period') || '30d';
    const orgId = profile.org_id;

    const periodStart = getPeriodStart(period);

    switch (type) {
      case 'period_performance':
        if (!hasTierAccess(tier, 'analytics')) {
          return NextResponse.json({ error: 'Analytics requires Basic tier or higher' }, { status: 403 });
        }
        return NextResponse.json(await buildPeriodPerformanceReport(supabase, orgId, periodStart));

      case 'shipment_dds':
        if (!hasTierAccess(tier, 'shipment_readiness')) {
          return NextResponse.json({ error: 'Shipment DDS report requires Pro tier' }, { status: 403 });
        }
        return NextResponse.json(await buildShipmentDDSReport(supabase, orgId, periodStart));

      case 'supplier_audit':
        if (!hasTierAccess(tier, 'compliance_review')) {
          return NextResponse.json({ error: 'Supplier Audit report requires Pro tier' }, { status: 403 });
        }
        return NextResponse.json(await buildSupplierAuditReport(supabase, orgId));

      case 'regulatory_readiness':
        if (!hasTierAccess(tier, 'shipment_readiness')) {
          return NextResponse.json({ error: 'Regulatory Readiness report requires Pro tier' }, { status: 403 });
        }
        return NextResponse.json(await buildRegulatoryReadinessReport(supabase, orgId));

      case 'buyer_intelligence':
        if (!hasTierAccess(tier, 'buyer_portal')) {
          return NextResponse.json({ error: 'Buyer Intelligence report requires Enterprise tier' }, { status: 403 });
        }
        return NextResponse.json(await buildBuyerIntelligenceReport(supabase, orgId));

      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }
  } catch (err) {
    console.error('[reports] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Report builders
// ---------------------------------------------------------------------------

async function buildPeriodPerformanceReport(supabase: any, orgId: string, periodStart: string) {
  const [batchesRes, farmsRes, bagsRes, shipmentsRes, paymentsRes] = await Promise.all([
    supabase.from('collection_batches').select('id, created_at, total_weight, bag_count, status, commodity, state, yield_flag_reason').eq('org_id', orgId).gte('created_at', periodStart).order('created_at', { ascending: true }),
    supabase.from('farms').select('id, compliance_status, commodity, area_hectares, deforestation_check').eq('org_id', orgId),
    supabase.from('bags').select('id, grade, is_compliant, weight_kg').eq('org_id', orgId),
    supabase.from('shipments').select('id, readiness_score, readiness_decision, destination_country, total_weight_kg, created_at').eq('org_id', orgId).gte('created_at', periodStart),
    supabase.from('payments').select('id, amount, currency, status').eq('org_id', orgId).gte('created_at', periodStart),
  ]);

  const batches = batchesRes.data || [];
  const farms = farmsRes.data || [];
  const bags = bagsRes.data || [];
  const shipments = shipmentsRes.data || [];
  const payments = paymentsRes.data || [];

  const totalWeight = batches.reduce((s: number, b: any) => s + Number(b.total_weight || 0), 0);
  const flagged = batches.filter((b: any) => b.yield_flag_reason).length;
  const approved = farms.filter((f: any) => f.compliance_status === 'approved').length;
  const compliantBags = bags.filter((b: any) => b.is_compliant).length;
  const totalPayments = payments.filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

  // Volume trend by week
  const weekMap = new Map<string, number>();
  for (const b of batches) {
    const week = getWeekLabel(b.created_at);
    weekMap.set(week, (weekMap.get(week) || 0) + Number(b.total_weight || 0));
  }
  const volumeTrend = Array.from(weekMap.entries()).map(([week, weight]) => ({ week, weight: Math.round(weight * 100) / 100 }));

  return {
    reportType: 'period_performance',
    generatedAt: new Date().toISOString(),
    summary: {
      totalBatches: batches.length,
      totalWeightKg: Math.round(totalWeight * 100) / 100,
      flaggedBatches: flagged,
      batchComplianceRate: batches.length > 0 ? Math.round(((batches.length - flagged) / batches.length) * 100) : 100,
      totalFarms: farms.length,
      farmComplianceRate: farms.length > 0 ? Math.round((approved / farms.length) * 100) : 0,
      totalBags: bags.length,
      bagComplianceRate: bags.length > 0 ? Math.round((compliantBags / bags.length) * 100) : 100,
      totalShipments: shipments.length,
      averageReadinessScore: shipments.length > 0 ? Math.round(shipments.reduce((s: number, sh: any) => s + (sh.readiness_score || 0), 0) / shipments.length) : null,
      totalPaymentsDisbursed: Math.round(totalPayments * 100) / 100,
    },
    volumeTrend,
    commodityBreakdown: buildCommodityBreakdown(batches, farms),
    gradeDistribution: buildGradeDistribution(bags),
    regionalBreakdown: buildRegionalBreakdown(batches),
  };
}

async function buildShipmentDDSReport(supabase: any, orgId: string, periodStart: string) {
  const { data: shipments } = await supabase
    .from('shipments')
    .select('id, destination_country, target_regulations, readiness_score, readiness_decision, risk_flags, score_breakdown, created_at, status, total_weight_kg, compliance_profile_id')
    .eq('org_id', orgId)
    .gte('created_at', periodStart)
    .order('readiness_score', { ascending: false });

  const shipmentList = shipments || [];

  // For each shipment, count linked farm polygons and deforestation checks
  const shipmentIds = shipmentList.map((s: any) => s.id);
  const itemsRes = shipmentIds.length > 0
    ? await supabase.from('shipment_items').select('shipment_id, batch_id').in('shipment_id', shipmentIds)
    : { data: [] };

  const batchIdsByShipment = new Map<string, string[]>();
  for (const item of (itemsRes.data || [])) {
    if (item.batch_id) {
      const arr = batchIdsByShipment.get(item.shipment_id) || [];
      arr.push(item.batch_id);
      batchIdsByShipment.set(item.shipment_id, arr);
    }
  }

  const allBatchIds = Array.from(new Set((itemsRes.data || []).map((i: any) => i.batch_id).filter(Boolean)));
  const farmIdsRes = allBatchIds.length > 0
    ? await supabase.from('collection_batches').select('id, farm_id').in('id', allBatchIds)
    : { data: [] };

  const farmIdByBatch = new Map((farmIdsRes.data || []).map((b: any) => [b.id, b.farm_id]));
  const farmIds = Array.from(new Set((farmIdsRes.data || []).map((b: any) => b.farm_id).filter(Boolean)));
  const farmsRes = farmIds.length > 0
    ? await supabase.from('farms').select('id, compliance_status, boundary_geo, deforestation_check').in('id', farmIds)
    : { data: [] };
  const farmDetailMap = new Map((farmsRes.data || []).map((f: any) => [String(f.id), f]));

  const enrichedShipments = shipmentList.map((s: any) => {
    const batchIds = batchIdsByShipment.get(s.id) || [];
    const linkedFarmIds = batchIds.map(bid => farmIdByBatch.get(bid)).filter(Boolean).map(String);
    const uniqueFarmIds = [...new Set(linkedFarmIds)];
    const linkedFarms = uniqueFarmIds.map(fid => farmDetailMap.get(fid)).filter(Boolean);

    return {
      id: s.id,
      destinationCountry: s.destination_country,
      targetRegulations: s.target_regulations || [],
      readinessScore: s.readiness_score,
      readinessDecision: s.readiness_decision,
      totalWeightKg: s.total_weight_kg,
      createdAt: s.created_at,
      status: s.status,
      farmCount: uniqueFarmIds.length,
      farmsWithPolygon: linkedFarms.filter((f: any) => !!f.boundary_geo).length,
      farmsDeforestationVerified: linkedFarms.filter((f: any) => !!f.deforestation_check).length,
      farmsDeforestationFree: linkedFarms.filter((f: any) => f.deforestation_check?.deforestation_free).length,
      riskFlags: s.risk_flags || [],
      scoreBreakdown: s.score_breakdown || {},
    };
  });

  const goCount = shipmentList.filter((s: any) => s.readiness_decision === 'go').length;
  const conditionalCount = shipmentList.filter((s: any) => s.readiness_decision === 'conditional').length;
  const noGoCount = shipmentList.filter((s: any) => s.readiness_decision === 'no_go').length;

  return {
    reportType: 'shipment_dds',
    generatedAt: new Date().toISOString(),
    summary: {
      totalShipments: shipmentList.length,
      goDecisions: goCount,
      conditionalDecisions: conditionalCount,
      noGoDecisions: noGoCount,
      averageReadinessScore: shipmentList.length > 0
        ? Math.round(shipmentList.reduce((s: number, sh: any) => s + (sh.readiness_score || 0), 0) / shipmentList.length)
        : null,
    },
    shipments: enrichedShipments,
  };
}

async function buildSupplierAuditReport(supabase: any, orgId: string) {
  const [farmsRes, agentsRes, batchesRes] = await Promise.all([
    supabase.from('farms').select('id, farmer_name, community, state, commodity, area_hectares, gps_latitude, gps_longitude, boundary_geo, compliance_status, deforestation_check, created_at').eq('org_id', orgId),
    supabase.from('profiles').select('user_id, full_name, role, created_at').eq('org_id', orgId).eq('role', 'agent'),
    supabase.from('collection_batches').select('id, farm_id, agent_id, total_weight, yield_flag_reason, status').eq('org_id', orgId),
  ]);

  const farms = farmsRes.data || [];
  const agents = agentsRes.data || [];
  const batches = batchesRes.data || [];

  // Farm-level audit stats
  const farmAuditRows = farms.map((farm: any) => {
    const farmBatches = batches.filter((b: any) => String(b.farm_id) === String(farm.id));
    const totalWeight = farmBatches.reduce((s: number, b: any) => s + Number(b.total_weight || 0), 0);
    const flaggedBatches = farmBatches.filter((b: any) => b.yield_flag_reason).length;
    const defoCheck = farm.deforestation_check as any;

    return {
      farmId: farm.id,
      farmerName: farm.farmer_name,
      community: farm.community,
      state: farm.state,
      commodity: farm.commodity,
      areaHectares: farm.area_hectares,
      hasGps: !!(farm.gps_latitude && farm.gps_longitude),
      hasPolygon: !!farm.boundary_geo,
      complianceStatus: farm.compliance_status || 'pending',
      deforestationFree: defoCheck?.deforestation_free ?? null,
      deforestationRisk: defoCheck?.risk_level ?? 'unchecked',
      totalBatches: farmBatches.length,
      totalWeightKg: Math.round(totalWeight * 100) / 100,
      flaggedBatches,
      flagRate: farmBatches.length > 0 ? Math.round((flaggedBatches / farmBatches.length) * 100) : 0,
      registeredAt: farm.created_at,
    };
  });

  // GPS verification rates
  const gpsVerified = farms.filter((f: any) => !!(f.gps_latitude && f.gps_longitude)).length;
  const polygonVerified = farms.filter((f: any) => !!f.boundary_geo).length;
  const defoChecked = farms.filter((f: any) => !!f.deforestation_check).length;
  const defoFree = farms.filter((f: any) => (f.deforestation_check as any)?.deforestation_free).length;

  // Agent performance
  const agentRows = agents.map((agent: any) => {
    const agentBatches = batches.filter((b: any) => b.agent_id === agent.user_id);
    const totalWeight = agentBatches.reduce((s: number, b: any) => s + Number(b.total_weight || 0), 0);
    const flagged = agentBatches.filter((b: any) => b.yield_flag_reason).length;
    return {
      agentId: agent.user_id,
      agentName: agent.full_name,
      totalBatches: agentBatches.length,
      totalWeightKg: Math.round(totalWeight * 100) / 100,
      flaggedBatches: flagged,
      flagRate: agentBatches.length > 0 ? Math.round((flagged / agentBatches.length) * 100) : 0,
    };
  });

  return {
    reportType: 'supplier_audit',
    generatedAt: new Date().toISOString(),
    summary: {
      totalFarms: farms.length,
      gpsVerificationRate: farms.length > 0 ? Math.round((gpsVerified / farms.length) * 100) : 0,
      polygonVerificationRate: farms.length > 0 ? Math.round((polygonVerified / farms.length) * 100) : 0,
      deforestationCheckCoverage: farms.length > 0 ? Math.round((defoChecked / farms.length) * 100) : 0,
      deforestationFreeRate: defoChecked > 0 ? Math.round((defoFree / defoChecked) * 100) : null,
      approvedFarms: farms.filter((f: any) => f.compliance_status === 'approved').length,
      pendingFarms: farms.filter((f: any) => f.compliance_status === 'pending').length,
      rejectedFarms: farms.filter((f: any) => f.compliance_status === 'rejected').length,
      totalAgents: agents.length,
    },
    farms: farmAuditRows,
    agents: agentRows,
  };
}

async function buildRegulatoryReadinessReport(supabase: any, orgId: string) {
  const { data: shipments } = await supabase
    .from('shipments')
    .select('id, destination_country, target_regulations, readiness_score, readiness_decision, score_breakdown, risk_flags')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  const shipmentList = shipments || [];

  // Aggregate scores per regulatory framework
  const frameworkStats: Record<string, { count: number; totalScore: number; goCount: number; flagCount: number }> = {};

  const FRAMEWORKS = ['EUDR', 'UK Environment Act', 'Lacey Act / UFLPA', 'FSMA 204', 'China Green Trade', 'UAE/Halal'];

  for (const fw of FRAMEWORKS) {
    frameworkStats[fw] = { count: 0, totalScore: 0, goCount: 0, flagCount: 0 };
  }

  for (const s of shipmentList) {
    const regs: string[] = s.target_regulations || [];
    for (const reg of regs) {
      // Match to framework
      const fw = FRAMEWORKS.find(f => f.toLowerCase().includes(reg.toLowerCase()) || reg.toLowerCase().includes(f.toLowerCase().split(' ')[0]));
      if (fw && frameworkStats[fw]) {
        frameworkStats[fw].count++;
        frameworkStats[fw].totalScore += s.readiness_score || 0;
        if (s.readiness_decision === 'go') frameworkStats[fw].goCount++;
        // Count relevant risk flags
        const flags = (s.risk_flags as any[]) || [];
        frameworkStats[fw].flagCount += flags.filter(f => f.category && fw.toLowerCase().includes(f.category.toLowerCase().split(' ')[0])).length;
      }
    }
  }

  const frameworkSummary = FRAMEWORKS.map(fw => ({
    framework: fw,
    shipmentCount: frameworkStats[fw].count,
    averageScore: frameworkStats[fw].count > 0 ? Math.round(frameworkStats[fw].totalScore / frameworkStats[fw].count) : null,
    approvalRate: frameworkStats[fw].count > 0 ? Math.round((frameworkStats[fw].goCount / frameworkStats[fw].count) * 100) : null,
    totalRiskFlags: frameworkStats[fw].flagCount,
  }));

  // Overall compliance portfolio
  const goCount = shipmentList.filter((s: any) => s.readiness_decision === 'go').length;
  const avgScore = shipmentList.length > 0
    ? Math.round(shipmentList.reduce((s: number, sh: any) => s + (sh.readiness_score || 0), 0) / shipmentList.length)
    : null;

  // Destination country breakdown
  const destMap = new Map<string, { count: number; avgScore: number }>();
  for (const s of shipmentList) {
    const dest = s.destination_country || 'Unknown';
    const existing = destMap.get(dest) || { count: 0, avgScore: 0 };
    existing.count++;
    existing.avgScore = Math.round(((existing.avgScore * (existing.count - 1)) + (s.readiness_score || 0)) / existing.count);
    destMap.set(dest, existing);
  }

  return {
    reportType: 'regulatory_readiness',
    generatedAt: new Date().toISOString(),
    summary: {
      totalShipments: shipmentList.length,
      overallApprovalRate: shipmentList.length > 0 ? Math.round((goCount / shipmentList.length) * 100) : null,
      averageReadinessScore: avgScore,
      activeFrameworks: FRAMEWORKS.filter(fw => frameworkStats[fw].count > 0).length,
    },
    frameworkSummary,
    destinationBreakdown: Array.from(destMap.entries()).map(([country, data]) => ({ country, ...data })).sort((a, b) => b.count - a.count),
  };
}

async function buildBuyerIntelligenceReport(supabase: any, orgId: string) {
  const [contractsRes, shipmentsRes, farmsRes] = await Promise.all([
    supabase.from('contracts').select('id, status, buyer_org_id, quantity_mt, price_per_unit, commodity, delivery_deadline').eq('exporter_org_id', orgId),
    supabase.from('shipments').select('id, destination_country, readiness_score, readiness_decision, total_weight_kg, status, risk_flags, score_breakdown').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50),
    supabase.from('farms').select('id, compliance_status, deforestation_check, boundary_geo').eq('org_id', orgId),
  ]);

  const contracts = contractsRes.data || [];
  const shipments = shipmentsRes.data || [];
  const farms = farmsRes.data || [];

  // ESG portfolio metrics
  const polygonRate = farms.length > 0 ? Math.round((farms.filter((f: any) => !!f.boundary_geo).length / farms.length) * 100) : 0;
  const defoFreeRate = farms.filter((f: any) => !!f.deforestation_check).length > 0
    ? Math.round((farms.filter((f: any) => (f.deforestation_check as any)?.deforestation_free).length / farms.filter((f: any) => !!f.deforestation_check).length) * 100)
    : null;
  const approvedFarmRate = farms.length > 0 ? Math.round((farms.filter((f: any) => f.compliance_status === 'approved').length / farms.length) * 100) : 0;

  // Provenance stats
  const avgReadiness = shipments.length > 0
    ? Math.round(shipments.reduce((s: number, sh: any) => s + (sh.readiness_score || 0), 0) / shipments.length)
    : null;

  // Contract value summary
  const activeContracts = contracts.filter((c: any) => c.status === 'active');
  const totalContractValue = activeContracts.reduce((s: number, c: any) => s + (Number(c.quantity_mt || 0) * Number(c.price_per_unit || 0)), 0);

  // Risk flag frequency analysis
  const riskFlagCounts = new Map<string, number>();
  for (const s of shipments) {
    const flags = (s.risk_flags as any[]) || [];
    for (const flag of flags) {
      const cat = flag.category || 'Other';
      riskFlagCounts.set(cat, (riskFlagCounts.get(cat) || 0) + 1);
    }
  }

  return {
    reportType: 'buyer_intelligence',
    generatedAt: new Date().toISOString(),
    esgMetrics: {
      farmComplianceRate: approvedFarmRate,
      polygonVerificationRate: polygonRate,
      deforestationFreeRate: defoFreeRate,
      averageShipmentReadiness: avgReadiness,
      goRateLastN: shipments.length > 0
        ? Math.round((shipments.filter((s: any) => s.readiness_decision === 'go').length / shipments.length) * 100)
        : null,
    },
    contracts: {
      totalActive: activeContracts.length,
      totalValue: Math.round(totalContractValue * 100) / 100,
      commodityMix: Object.fromEntries(
        contracts.reduce((map: Map<string, number>, c: any) => {
          const commodity = c.commodity || 'Unknown';
          map.set(commodity, (map.get(commodity) || 0) + Number(c.quantity_mt || 0));
          return map;
        }, new Map<string, number>())
      ),
    },
    provenanceStats: {
      totalShipments: shipments.length,
      shipmentsByDestination: Array.from(
        shipments.reduce((map: Map<string, number>, s: any) => {
          const dest = s.destination_country || 'Unknown';
          map.set(dest, (map.get(dest) || 0) + 1);
          return map;
        }, new Map<string, number>())
      ).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count),
    },
    riskProfile: Array.from(riskFlagCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodStart(period: string): string {
  const now = new Date();
  const map: Record<string, () => Date> = {
    '7d': () => new Date(now.getTime() - 7 * 86400000),
    '30d': () => new Date(now.getTime() - 30 * 86400000),
    '90d': () => new Date(now.getTime() - 90 * 86400000),
    '1y': () => new Date(now.getTime() - 365 * 86400000),
  };
  return (map[period] || map['30d'])().toISOString();
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const weekNum = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

function buildCommodityBreakdown(batches: any[], farms: any[]) {
  const map = new Map<string, { weight: number; batches: number; farms: number }>();
  for (const b of batches) {
    const c = b.commodity || 'Unknown';
    const e = map.get(c) || { weight: 0, batches: 0, farms: 0 };
    e.weight += Number(b.total_weight || 0);
    e.batches++;
    map.set(c, e);
  }
  for (const f of farms) {
    const c = f.commodity || 'Unknown';
    const e = map.get(c) || { weight: 0, batches: 0, farms: 0 };
    e.farms++;
    map.set(c, e);
  }
  return Array.from(map.entries()).map(([commodity, data]) => ({ commodity, ...data, weight: Math.round(data.weight * 100) / 100 })).sort((a, b) => b.weight - a.weight);
}

function buildGradeDistribution(bags: any[]) {
  const map = new Map<string, number>();
  for (const b of bags) map.set(b.grade || 'Ungraded', (map.get(b.grade || 'Ungraded') || 0) + 1);
  return Array.from(map.entries()).map(([grade, count]) => ({ grade, count })).sort((a, b) => a.grade.localeCompare(b.grade));
}

function buildRegionalBreakdown(batches: any[]) {
  const map = new Map<string, { weight: number; batches: number }>();
  for (const b of batches) {
    const r = b.state || 'Unknown';
    const e = map.get(r) || { weight: 0, batches: 0 };
    e.weight += Number(b.total_weight || 0);
    e.batches++;
    map.set(r, e);
  }
  return Array.from(map.entries()).map(([region, data]) => ({ region, weight: Math.round(data.weight * 100) / 100, batches: data.batches })).sort((a, b) => b.weight - a.weight);
}
