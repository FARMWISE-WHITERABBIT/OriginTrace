'use server';

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

function getPeriodStart(period: string): string {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

function getIntervalLabel(period: string): 'day' | 'week' | 'month' {
  switch (period) {
    case '7d': return 'day';
    case '30d': return 'day';
    case '90d': return 'week';
    case '1y': return 'month';
    default: return 'day';
  }
}

function groupByInterval(
  records: Array<{ created_at: string; total_weight: number; bag_count: number; commodity?: string }>,
  interval: 'day' | 'week' | 'month',
  periodStart: string
): Array<{ date: string; weight: number; bags: number; batches: number }> {
  const grouped = new Map<string, { weight: number; bags: number; batches: number }>();

  for (const record of records) {
    const d = new Date(record.created_at);
    let key: string;
    if (interval === 'day') {
      key = d.toISOString().split('T')[0];
    } else if (interval === 'week') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    const existing = grouped.get(key) || { weight: 0, bags: 0, batches: 0 };
    existing.weight += Number(record.total_weight || 0);
    existing.bags += Number(record.bag_count || 0);
    existing.batches += 1;
    grouped.set(key, existing);
  }

  const start = new Date(periodStart);
  const now = new Date();
  const allKeys: string[] = [];
  if (interval === 'day') {
    const current = new Date(start);
    while (current <= now) {
      allKeys.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  } else if (interval === 'week') {
    const current = new Date(start);
    current.setDate(current.getDate() - current.getDay());
    while (current <= now) {
      allKeys.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    }
  } else {
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= now) {
      allKeys.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
  }

  return allKeys.map(key => ({
    date: key,
    weight: Math.round((grouped.get(key)?.weight || 0) * 100) / 100,
    bags: grouped.get(key)?.bags || 0,
    batches: grouped.get(key)?.batches || 0,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const allowedRoles = ['admin', 'aggregator', 'quality_manager', 'compliance_officer'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', profile.org_id)
      .single();

    const tier = org?.subscription_tier || 'starter';
    const tierLevel: Record<string, number> = { starter: 0, basic: 1, pro: 2, enterprise: 3 };
    if ((tierLevel[tier] ?? 0) < 1) {
      return NextResponse.json({ error: 'Analytics requires Basic tier or higher' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const section = searchParams.get('section') || 'all';
    const periodStart = getPeriodStart(period);
    const interval = getIntervalLabel(period);
    const prevStart = new Date(new Date(periodStart).getTime() - (new Date().getTime() - new Date(periodStart).getTime())).toISOString();
    const orgId = profile.org_id;

    const result: Record<string, any> = { period };

    const [
      batchesRes,
      prevBatchesRes,
      farmsRes,
      bagsRes,
    ] = await Promise.all([
      supabase
        .from('collection_batches')
        .select('id, created_at, total_weight, bag_count, status, agent_id, yield_flag_reason, commodity, state, farm_id')
        .eq('org_id', orgId)
        .gte('created_at', periodStart)
        .order('created_at', { ascending: true }),
      supabase
        .from('collection_batches')
        .select('id, total_weight, bag_count')
        .eq('org_id', orgId)
        .gte('created_at', prevStart)
        .lt('created_at', periodStart),
      supabase
        .from('farms')
        .select('id, compliance_status, commodity, area_hectares, state, deforestation_check, boundary_geo')
        .eq('org_id', orgId),
      supabase
        .from('bags')
        .select('id, grade, status, weight_kg, commodity, is_compliant')
        .eq('org_id', orgId),
    ]);

    const batches = batchesRes.data || [];
    const prevBatches = prevBatchesRes.data || [];
    const farms = farmsRes.data || [];
    const bags = bagsRes.data || [];

    const currentWeight = batches.reduce((s, r) => s + Number(r.total_weight || 0), 0);
    const previousWeight = prevBatches.reduce((s, r) => s + Number(r.total_weight || 0), 0);
    const currentBags = batches.reduce((s, b) => s + Number(b.bag_count || 0), 0);
    const previousBags = prevBatches.reduce((s, b) => s + Number(b.bag_count || 0), 0);

    const calcTrend = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

    if (section === 'all' || section === 'operational') {
      const volumeTrends = groupByInterval(
        batches.map(b => ({ created_at: b.created_at, total_weight: Number(b.total_weight || 0), bag_count: Number(b.bag_count || 0) })),
        interval, periodStart
      );

      const agentMap = new Map<string, { name: string; weight: number; bags: number; batches: number }>();
      const agentBatches = batches.filter(b => b.agent_id);
      for (const record of agentBatches) {
        const agentId = record.agent_id;
        const existing = agentMap.get(agentId) || { name: `Agent ${agentId?.slice(0, 6)}`, weight: 0, bags: 0, batches: 0 };
        existing.weight += Number(record.total_weight || 0);
        existing.bags += Number(record.bag_count || 0);
        existing.batches += 1;
        agentMap.set(agentId, existing);
      }

      const agentIds = Array.from(agentMap.keys()).filter(Boolean);
      if (agentIds.length > 0) {
        const { data: agentProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', agentIds);
        for (const ap of (agentProfiles || [])) {
          const agent = agentMap.get(ap.user_id);
          if (agent) agent.name = ap.full_name || agent.name;
        }
      }

      const agents = Array.from(agentMap.entries())
        .map(([id, data]) => ({ id, name: data.name, weight: Math.round(data.weight * 100) / 100, bags: data.bags, batches: data.batches }))
        .sort((a, b) => b.weight - a.weight);

      const flaggedCount = batches.filter(b => b.yield_flag_reason).length;
      const totalFarmsCount = farms.length;
      const approvedFarmsCount = farms.filter(f => f.compliance_status === 'approved').length;
      const pendingFarmsCount = farms.filter(f => f.compliance_status === 'pending').length;
      const rejectedFarmsCount = farms.filter(f => f.compliance_status === 'rejected').length;
      const totalBagsCount = bags.length;
      const compliantBagsCount = bags.filter(b => b.is_compliant).length;

      result.volumeTrends = volumeTrends;
      result.weightSummary = { current: Math.round(currentWeight * 100) / 100, previous: Math.round(previousWeight * 100) / 100, trend: calcTrend(currentWeight, previousWeight) };
      result.batchSummary = { current: batches.length, previous: prevBatches.length, trend: calcTrend(batches.length, prevBatches.length) };
      result.bagSummary = { current: currentBags, previous: previousBags, trend: calcTrend(currentBags, previousBags), total: totalBagsCount };
      result.farmSummary = { total: totalFarmsCount, approved: approvedFarmsCount, pending: pendingFarmsCount, rejected: rejectedFarmsCount };
      result.compliance = {
        farmRate: totalFarmsCount > 0 ? Math.round((approvedFarmsCount / totalFarmsCount) * 100) : 0,
        batchRate: batches.length > 0 ? Math.round(((batches.length - flaggedCount) / batches.length) * 100) : 100,
        bagRate: totalBagsCount > 0 ? Math.round((compliantBagsCount / totalBagsCount) * 100) : 100,
        flaggedBatches: flaggedCount,
      };
      result.agentPerformance = agents;
    }

    if (section === 'all' || section === 'strategic') {
      const commodityMap = new Map<string, { weight: number; batches: number; compliantFarms: number; totalFarms: number }>();
      for (const b of batches) {
        const c = b.commodity || 'Unknown';
        const existing = commodityMap.get(c) || { weight: 0, batches: 0, compliantFarms: 0, totalFarms: 0 };
        existing.weight += Number(b.total_weight || 0);
        existing.batches += 1;
        commodityMap.set(c, existing);
      }
      for (const f of farms) {
        const c = f.commodity || 'Unknown';
        const existing = commodityMap.get(c) || { weight: 0, batches: 0, compliantFarms: 0, totalFarms: 0 };
        existing.totalFarms += 1;
        if (f.compliance_status === 'approved') existing.compliantFarms += 1;
        commodityMap.set(c, existing);
      }
      result.commodityBreakdown = Array.from(commodityMap.entries()).map(([name, data]) => ({
        name,
        weight: Math.round(data.weight * 100) / 100,
        batches: data.batches,
        complianceRate: data.totalFarms > 0 ? Math.round((data.compliantFarms / data.totalFarms) * 100) : 0,
        totalFarms: data.totalFarms,
      })).sort((a, b) => b.weight - a.weight);

      const gradeMap = new Map<string, number>();
      for (const bag of bags) {
        const grade = bag.grade || 'Ungraded';
        gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
      }
      result.gradeDistribution = Array.from(gradeMap.entries()).map(([grade, count]) => ({ grade, count })).sort((a, b) => a.grade.localeCompare(b.grade));

      const farmComplianceBreakdown = [
        { status: 'Approved', count: farms.filter(f => f.compliance_status === 'approved').length },
        { status: 'Pending', count: farms.filter(f => f.compliance_status === 'pending').length },
        { status: 'Rejected', count: farms.filter(f => f.compliance_status === 'rejected').length },
        { status: 'Not Reviewed', count: farms.filter(f => !f.compliance_status || f.compliance_status === 'not_reviewed').length },
      ].filter(item => item.count > 0);
      result.farmComplianceBreakdown = farmComplianceBreakdown;

      const deforestationRisk: Record<string, number> = { 'None Detected': 0, 'Low': 0, 'Medium': 0, 'High': 0 };
      for (const farm of farms) {
        const check = farm.deforestation_check as any;
        if (check && check.risk_level) {
          const level = check.risk_level.charAt(0).toUpperCase() + check.risk_level.slice(1);
          if (deforestationRisk[level] !== undefined) deforestationRisk[level]++;
          else deforestationRisk['None Detected']++;
        } else {
          deforestationRisk['None Detected']++;
        }
      }
      result.deforestationRisk = Object.entries(deforestationRisk).map(([level, count]) => ({ level, count })).filter(item => item.count > 0);

      const regionMap = new Map<string, { weight: number; batches: number }>();
      for (const b of batches) {
        const region = b.state || 'Unknown';
        const existing = regionMap.get(region) || { weight: 0, batches: 0 };
        existing.weight += Number(b.total_weight || 0);
        existing.batches += 1;
        regionMap.set(region, existing);
      }
      result.regionalBreakdown = Array.from(regionMap.entries()).map(([region, data]) => ({
        region, weight: Math.round(data.weight * 100) / 100, batches: data.batches,
      })).sort((a, b) => b.weight - a.weight);

      const failureTypes = [
        { type: 'Yield Anomalies', count: batches.filter(b => b.yield_flag_reason).length },
        { type: 'Missing GPS', count: farms.filter(f => !f.boundary_geo).length },
        { type: 'Non-Compliant Farms', count: farms.filter(f => f.compliance_status === 'rejected').length },
        { type: 'Low Grade (C)', count: bags.filter(b => b.grade === 'C').length },
      ].filter(item => item.count > 0).sort((a, b) => b.count - a.count);
      result.riskIntelligence = failureTypes;

      const totalHectares = farms.reduce((s, f) => s + Number(f.area_hectares || 0), 0);
      const verifiedFarms = farms.filter(f => f.boundary_geo).length;
      result.supplyChainNodes = {
        totalFarms: farms.length,
        verifiedFarms,
        unverifiedFarms: farms.length - verifiedFarms,
        totalHectares: Math.round(totalHectares * 100) / 100,
      };
    }

    if (section === 'all' || section === 'shipments') {
      const [shipmentsRes] = await Promise.all([
        supabase
          .from('shipments')
          .select('id, status, destination_country, total_weight_kg, readiness_score, readiness_decision, risk_flags, score_breakdown, created_at, compliance_profile_id')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      const shipments = shipmentsRes.data || [];

      const shipmentScores = shipments.filter(s => s.score_breakdown).map(s => {
        const breakdown = s.score_breakdown as any;
        return {
          id: s.id,
          name: `${s.destination_country || 'Unknown'} - ${new Date(s.created_at).toLocaleDateString()}`,
          traceability: breakdown?.traceability?.score ?? 0,
          contamination: breakdown?.chemical?.score ?? breakdown?.contamination?.score ?? 0,
          documentation: breakdown?.documentation?.score ?? 0,
          regulatory: breakdown?.regulatory?.score ?? 0,
          storage: breakdown?.storage?.score ?? 0,
          overall: s.readiness_score || 0,
          decision: s.readiness_decision || 'unknown',
        };
      });
      result.shipmentScores = shipmentScores;

      const destinationMap = new Map<string, number>();
      for (const s of shipments) {
        const dest = s.destination_country || 'Unknown';
        destinationMap.set(dest, (destinationMap.get(dest) || 0) + 1);
      }
      result.shipmentsByDestination = Array.from(destinationMap.entries()).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);

      const decisionCounts = [
        { decision: 'Go', count: shipments.filter(s => s.readiness_decision === 'go').length },
        { decision: 'Conditional', count: shipments.filter(s => s.readiness_decision === 'conditional_go').length },
        { decision: 'No Go', count: shipments.filter(s => s.readiness_decision === 'no_go').length },
        { decision: 'Pending', count: shipments.filter(s => !s.readiness_decision || s.readiness_decision === 'unknown').length },
      ].filter(item => item.count > 0);
      result.shipmentDecisions = decisionCounts;

      const riskFlagMap = new Map<string, number>();
      for (const s of shipments) {
        const flags = s.risk_flags as any[];
        if (flags && Array.isArray(flags)) {
          for (const flag of flags) {
            const category = flag.category || flag.type || 'Other';
            riskFlagMap.set(category, (riskFlagMap.get(category) || 0) + 1);
          }
        }
      }
      result.shipmentRiskFlags = Array.from(riskFlagMap.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
    }

    if (section === 'all' || section === 'documents') {
      const { data: documents } = await supabase
        .from('documents')
        .select('id, type, status, expiry_date')
        .eq('org_id', orgId);
      const docs = documents || [];
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const validDocs = docs.filter(d => !d.expiry_date || new Date(d.expiry_date) > thirtyDaysFromNow).length;
      const expiringSoon = docs.filter(d => d.expiry_date && new Date(d.expiry_date) <= thirtyDaysFromNow && new Date(d.expiry_date) > now).length;
      const expired = docs.filter(d => d.expiry_date && new Date(d.expiry_date) <= now).length;

      result.documentHealth = [
        { status: 'Valid', count: validDocs },
        { status: 'Expiring Soon', count: expiringSoon },
        { status: 'Expired', count: expired },
      ].filter(item => item.count > 0);

      const docTypeMap = new Map<string, number>();
      for (const doc of docs) {
        const type = doc.type || 'Other';
        docTypeMap.set(type, (docTypeMap.get(type) || 0) + 1);
      }
      result.documentsByType = Array.from(docTypeMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
    }

    if (section === 'all' || section === 'financial') {
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, currency, status, payment_method, payment_date, payee_type')
        .eq('org_id', orgId);
      const paymentData = payments || [];

      const paymentStatusMap = new Map<string, number>();
      const paymentMethodMap = new Map<string, number>();
      let totalPayments = 0;
      for (const p of paymentData) {
        const status = p.status || 'unknown';
        const method = p.payment_method || 'Other';
        const amount = Number(p.amount || 0);
        paymentStatusMap.set(status, (paymentStatusMap.get(status) || 0) + amount);
        paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + amount);
        totalPayments += amount;
      }

      result.paymentsByStatus = Array.from(paymentStatusMap.entries()).map(([status, amount]) => ({
        status, amount: Math.round(amount * 100) / 100,
      }));
      result.paymentsByMethod = Array.from(paymentMethodMap.entries()).map(([method, amount]) => ({
        method, amount: Math.round(amount * 100) / 100,
      }));
      result.paymentSummary = { total: Math.round(totalPayments * 100) / 100, count: paymentData.length };

      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, status, quantity_mt, price_per_unit, delivery_deadline')
        .eq('exporter_org_id', orgId);
      const contractData = contracts || [];
      const contractStatus = [
        { status: 'Active', count: contractData.filter(c => c.status === 'active').length },
        { status: 'Completed', count: contractData.filter(c => c.status === 'completed').length },
        { status: 'Pending', count: contractData.filter(c => c.status === 'pending' || c.status === 'draft').length },
        { status: 'Cancelled', count: contractData.filter(c => c.status === 'cancelled').length },
      ].filter(item => item.count > 0);
      result.contractStatus = contractStatus;
      result.contractSummary = {
        total: contractData.length,
        totalVolumeMT: contractData.reduce((s, c) => s + Number(c.quantity_mt || 0), 0),
        totalValue: contractData.reduce((s, c) => s + (Number(c.quantity_mt || 0) * Number(c.price_per_unit || 0)), 0),
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
