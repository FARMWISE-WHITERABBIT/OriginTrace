import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function getBuyerProfile(supabaseAdmin: any, userId: string) {
  const { data } = await supabaseAdmin
    .from('buyer_profiles')
    .select('id, buyer_org_id, full_name, role')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase is not properly configured' }, { status: 500 });
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const buyerProfile = await getBuyerProfile(supabaseAdmin, user.id);
    if (!buyerProfile) {
      return NextResponse.json({ error: 'No buyer profile found' }, { status: 404 });
    }

    const buyerOrgId = buyerProfile.buyer_org_id;

    const [linksRes, contractsRes, shipmentsData, documentsData, farmsData, certificationsData] = await Promise.all([
      supabaseAdmin
        .from('supply_chain_links')
        .select('id, status, exporter_org_id')
        .eq('buyer_org_id', buyerOrgId),
      supabaseAdmin
        .from('contracts')
        .select('id, status, commodity, quantity_mt, exporter_org_id, compliance_profile_id, created_at')
        .eq('buyer_org_id', buyerOrgId),
      getLinkedShipments(supabaseAdmin, buyerOrgId),
      getLinkedDocuments(supabaseAdmin, buyerOrgId),
      getLinkedFarms(supabaseAdmin, buyerOrgId),
      getLinkedCertifications(supabaseAdmin, buyerOrgId),
    ]);

    const links = linksRes.data || [];
    const contracts = contractsRes.data || [];
    const shipments = shipmentsData;
    const documents = documentsData;
    const farms = farmsData;
    const certifications = certificationsData;

    const activeLinks = links.filter((l: any) => l.status === 'active');
    const activeContracts = contracts.filter((c: any) => c.status === 'active' || c.status === 'fulfilled');

    const totalVolumeMT = activeContracts.reduce((sum: number, c: any) => sum + (Number(c.quantity_mt) || 0), 0);

    const portfolioComplianceScore = computePortfolioCompliance(shipments);

    const avgReadinessScore = shipments.length > 0
      ? shipments.reduce((sum: number, s: any) => sum + (Number(s.readiness_score) || 0), 0) / shipments.length
      : 0;

    const supplierRiskTiers = computeSupplierRiskTiers(shipments, links);

    const complianceTrend = computeComplianceTrend(shipments);

    const commodityBreakdown = computeCommodityBreakdown(contracts);

    const documentHealth = computeDocumentHealth(documents);

    const frameworkCoverage = computeFrameworkCoverage(shipments);

    const certificationCoverage = computeCertificationCoverage(certifications, farms);

    const supplierComparison = await computeSupplierComparison(supabaseAdmin, links, contracts, shipments);

    return NextResponse.json({
      portfolioComplianceScore: Math.round(portfolioComplianceScore * 10) / 10,
      avgReadinessScore: Math.round(avgReadinessScore * 10) / 10,
      totalVolumeMT: Math.round(totalVolumeMT * 100) / 100,
      supplierCount: activeLinks.length,
      supplierRiskTiers,
      complianceTrend,
      commodityBreakdown,
      documentHealth,
      frameworkCoverage,
      certificationCoverage,
      supplierComparison,
    });
  } catch (error) {
    console.error('Buyer analytics API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

async function getLinkedShipments(supabaseAdmin: any, buyerOrgId: string) {
  const { data: contracts } = await supabaseAdmin
    .from('contracts')
    .select('id')
    .eq('buyer_org_id', buyerOrgId);

  if (!contracts || contracts.length === 0) return [];

  const contractIds = contracts.map((c: any) => c.id);
  const { data: contractShipments } = await supabaseAdmin
    .from('contract_shipments')
    .select('contract_id, shipment_id')
    .in('contract_id', contractIds);

  const shipmentIds = (contractShipments || [])
    .map((cs: any) => cs.shipment_id)
    .filter((id: any): id is string => !!id);

  if (shipmentIds.length === 0) return [];

  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('id, org_id, status, readiness_score, readiness_decision, score_breakdown, commodity, total_weight_kg, created_at, destination_country')
    .in('id', shipmentIds);

  return shipments || [];
}

async function getLinkedDocuments(supabaseAdmin: any, buyerOrgId: string) {
  const { data: links } = await supabaseAdmin
    .from('supply_chain_links')
    .select('exporter_org_id')
    .eq('buyer_org_id', buyerOrgId)
    .eq('status', 'active');

  if (!links || links.length === 0) return [];

  const exporterOrgIds = links.map((l: any) => l.exporter_org_id);
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, status, expiry_date, document_type, org_id, created_at')
    .in('org_id', exporterOrgIds);

  return docs || [];
}

async function getLinkedFarms(supabaseAdmin: any, buyerOrgId: string) {
  const { data: links } = await supabaseAdmin
    .from('supply_chain_links')
    .select('exporter_org_id')
    .eq('buyer_org_id', buyerOrgId)
    .eq('status', 'active');

  if (!links || links.length === 0) return [];

  const exporterOrgIds = links.map((l: any) => l.exporter_org_id);
  const { data: farms } = await supabaseAdmin
    .from('farms')
    .select('id, org_id, compliance_status, commodity')
    .in('org_id', exporterOrgIds);

  return farms || [];
}

async function getLinkedCertifications(supabaseAdmin: any, buyerOrgId: string) {
  const { data: links } = await supabaseAdmin
    .from('supply_chain_links')
    .select('exporter_org_id')
    .eq('buyer_org_id', buyerOrgId)
    .eq('status', 'active');

  if (!links || links.length === 0) return [];

  const exporterOrgIds = links.map((l: any) => l.exporter_org_id);
  const { data: certs } = await supabaseAdmin
    .from('farm_certifications')
    .select('id, farm_id, org_id, certification_body, status, expiry_date')
    .in('org_id', exporterOrgIds)
    .eq('status', 'active');

  return certs || [];
}

function computePortfolioCompliance(shipments: any[]): number {
  if (shipments.length === 0) return 0;

  const scoredShipments = shipments.filter((s: any) => s.readiness_score != null);
  if (scoredShipments.length === 0) return 0;

  const totalWeight = scoredShipments.reduce((sum: number, s: any) => sum + (Number(s.total_weight_kg) || 1), 0);
  const weightedScore = scoredShipments.reduce((sum: number, s: any) => {
    const weight = Number(s.total_weight_kg) || 1;
    return sum + (Number(s.readiness_score) * weight);
  }, 0);

  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

function computeSupplierRiskTiers(shipments: any[], links: any[]) {
  const supplierScores = new Map<string, number[]>();

  for (const s of shipments) {
    const orgId = s.org_id;
    if (!supplierScores.has(orgId)) supplierScores.set(orgId, []);
    if (s.readiness_score != null) {
      supplierScores.get(orgId)!.push(Number(s.readiness_score));
    }
  }

  let low = 0, medium = 0, high = 0;

  for (const [, scores] of supplierScores) {
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    if (avg >= 80) low++;
    else if (avg >= 50) medium++;
    else high++;
  }

  const unscored = links.filter((l: any) => l.status === 'active' && !supplierScores.has(l.exporter_org_id)).length;
  medium += unscored;

  return { low, medium, high };
}

function computeComplianceTrend(shipments: any[]) {
  const now = new Date();
  const months: { month: string; score: number; count: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const monthShipments = shipments.filter((s: any) => {
      const created = new Date(s.created_at);
      return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
    });

    const scored = monthShipments.filter((s: any) => s.readiness_score != null);
    const avgScore = scored.length > 0
      ? scored.reduce((sum: number, s: any) => sum + Number(s.readiness_score), 0) / scored.length
      : 0;

    months.push({ month: label, score: Math.round(avgScore * 10) / 10, count: monthShipments.length });
  }

  return months;
}

function computeCommodityBreakdown(contracts: any[]) {
  const commodityMap = new Map<string, { volume: number; count: number }>();

  for (const c of contracts) {
    if (c.status === 'cancelled') continue;
    const commodity = c.commodity || 'Unknown';
    const existing = commodityMap.get(commodity) || { volume: 0, count: 0 };
    existing.volume += Number(c.quantity_mt) || 0;
    existing.count += 1;
    commodityMap.set(commodity, existing);
  }

  return Array.from(commodityMap.entries()).map(([name, data]) => ({
    name,
    volume: Math.round(data.volume * 100) / 100,
    count: data.count,
  }));
}

function computeDocumentHealth(documents: any[]) {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let valid = 0, expiringSoon = 0, expired = 0;

  for (const doc of documents) {
    if (doc.status === 'archived') continue;
    if (doc.expiry_date) {
      const expiry = new Date(doc.expiry_date);
      if (expiry < now) expired++;
      else if (expiry <= thirtyDays) expiringSoon++;
      else valid++;
    } else {
      valid++;
    }
  }

  return { valid, expiringSoon, expired, total: valid + expiringSoon + expired };
}

function computeFrameworkCoverage(shipments: any[]) {
  const frameworks: Record<string, { total: number; compliant: number }> = {};

  for (const s of shipments) {
    const breakdown = s.score_breakdown || {};
    for (const [framework, score] of Object.entries(breakdown)) {
      if (!frameworks[framework]) frameworks[framework] = { total: 0, compliant: 0 };
      frameworks[framework].total++;
      if (typeof score === 'number' && score >= 70) frameworks[framework].compliant++;
      else if (typeof score === 'object' && score !== null && 'score' in (score as any)) {
        if (Number((score as any).score) >= 70) frameworks[framework].compliant++;
      }
    }
  }

  return Object.entries(frameworks).map(([name, data]) => ({
    name,
    coverage: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0,
    total: data.total,
    compliant: data.compliant,
  }));
}

function computeCertificationCoverage(certifications: any[], farms: any[]) {
  const totalFarms = farms.length;
  if (totalFarms === 0) return [];

  const certBodies: Record<string, Set<string>> = {};

  for (const cert of certifications) {
    const body = cert.certification_body;
    if (!certBodies[body]) certBodies[body] = new Set();
    certBodies[body].add(cert.farm_id);
  }

  const labels: Record<string, string> = {
    rainforest_alliance: 'Rainforest Alliance',
    utz: 'UTZ',
    fairtrade: 'Fairtrade',
    organic: 'Organic',
    globalgap: 'GlobalGAP',
    fsc: 'FSC',
    pefc: 'PEFC',
    other: 'Other',
  };

  return Object.entries(certBodies).map(([body, farmSet]) => ({
    name: labels[body] || body,
    certifiedFarms: farmSet.size,
    totalFarms,
    penetration: Math.round((farmSet.size / totalFarms) * 100),
  }));
}

async function computeSupplierComparison(supabaseAdmin: any, links: any[], contracts: any[], shipments: any[]) {
  const activeLinks = links.filter((l: any) => l.status === 'active');
  if (activeLinks.length === 0) return [];

  const exporterOrgIds = activeLinks.map((l: any) => l.exporter_org_id);
  const { data: orgs } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .in('id', exporterOrgIds);

  const orgMap = new Map((orgs || []).map((o: any) => [o.id, o.name]));

  return activeLinks.map((link: any) => {
    const orgId = link.exporter_org_id;
    const supplierContracts = contracts.filter((c: any) => c.exporter_org_id === orgId);
    const supplierShipments = shipments.filter((s: any) => s.org_id === orgId);
    const scoredShipments = supplierShipments.filter((s: any) => s.readiness_score != null);

    const avgScore = scoredShipments.length > 0
      ? scoredShipments.reduce((sum: number, s: any) => sum + Number(s.readiness_score), 0) / scoredShipments.length
      : 0;

    const totalVolume = supplierContracts.reduce((sum: number, c: any) => sum + (Number(c.quantity_mt) || 0), 0);

    let riskTier: 'low' | 'medium' | 'high' = 'medium';
    if (avgScore >= 80) riskTier = 'low';
    else if (avgScore < 50 && scoredShipments.length > 0) riskTier = 'high';

    return {
      id: orgId,
      name: orgMap.get(orgId) || 'Unknown Supplier',
      avgComplianceScore: Math.round(avgScore * 10) / 10,
      contractCount: supplierContracts.length,
      shipmentCount: supplierShipments.length,
      totalVolumeMT: Math.round(totalVolume * 100) / 100,
      riskTier,
    };
  }).sort((a: any, b: any) => b.avgComplianceScore - a.avgComplianceScore);
}
