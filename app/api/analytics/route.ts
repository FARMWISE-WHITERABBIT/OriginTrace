'use server';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const supabase = createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user;
}

async function getUserFromCookies(request: NextRequest) {
  const supabase = createServiceClient();
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );

  const accessToken = cookies['sb-access-token'] ||
    Object.entries(cookies).find(([k]) => k.includes('auth-token'))?.[1];

  if (!accessToken) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
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
    case '7d':
      return 'day';
    case '30d':
      return 'day';
    case '90d':
      return 'week';
    case '1y':
      return 'month';
    default:
      return 'day';
  }
}

function groupByInterval(
  records: Array<{ created_at: string; total_weight: number; bag_count: number }>,
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
      const dayOfWeek = d.getDay();
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - dayOfWeek);
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

    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }

    if (!user) {
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
    const periodStart = getPeriodStart(period);
    const interval = getIntervalLabel(period);

    const previousPeriodStart = getPeriodStart(
      period === '7d' ? '7d' : period === '30d' ? '30d' : period === '90d' ? '90d' : '1y'
    );
    const prevStart = new Date(new Date(periodStart).getTime() - (new Date().getTime() - new Date(periodStart).getTime())).toISOString();

    const [
      batchesInPeriod,
      batchesInPrevPeriod,
      agentPerformance,
      farmsTotal,
      farmsApproved,
      farmsPending,
      farmsRejected,
      bagsTotal,
      bagsCompliant,
      weightRes,
      prevWeightRes,
    ] = await Promise.all([
      supabase
        .from('collection_batches')
        .select('id, created_at, total_weight, bag_count, status, agent_id, yield_flag_reason')
        .eq('org_id', profile.org_id)
        .gte('created_at', periodStart)
        .order('created_at', { ascending: true }),
      supabase
        .from('collection_batches')
        .select('id, total_weight, bag_count')
        .eq('org_id', profile.org_id)
        .gte('created_at', prevStart)
        .lt('created_at', periodStart),
      supabase
        .from('collection_batches')
        .select('agent_id, total_weight, bag_count, profiles!collection_batches_agent_id_fkey(full_name)')
        .eq('org_id', profile.org_id)
        .gte('created_at', periodStart),
      supabase
        .from('farms')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id),
      supabase
        .from('farms')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('compliance_status', 'approved'),
      supabase
        .from('farms')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('compliance_status', 'pending'),
      supabase
        .from('farms')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('compliance_status', 'rejected'),
      supabase
        .from('bags')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id),
      supabase
        .from('bags')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('is_compliant', true),
      supabase
        .from('collection_batches')
        .select('total_weight')
        .eq('org_id', profile.org_id)
        .gte('created_at', periodStart),
      supabase
        .from('collection_batches')
        .select('total_weight')
        .eq('org_id', profile.org_id)
        .gte('created_at', prevStart)
        .lt('created_at', periodStart),
    ]);

    const batches = batchesInPeriod.data || [];
    const prevBatches = batchesInPrevPeriod.data || [];

    const volumeTrends = groupByInterval(
      batches.map(b => ({
        created_at: b.created_at,
        total_weight: Number(b.total_weight || 0),
        bag_count: Number(b.bag_count || 0),
      })),
      interval,
      periodStart
    );

    const currentWeight = (weightRes.data || []).reduce((s, r) => s + Number(r.total_weight || 0), 0);
    const previousWeight = (prevWeightRes.data || []).reduce((s, r) => s + Number(r.total_weight || 0), 0);
    const currentBatches = batches.length;
    const previousBatchCount = prevBatches.length;
    const currentBags = batches.reduce((s, b) => s + Number(b.bag_count || 0), 0);
    const previousBags = prevBatches.reduce((s, b) => s + Number(b.bag_count || 0), 0);

    const weightTrend = previousWeight > 0
      ? Math.round(((currentWeight - previousWeight) / previousWeight) * 100)
      : currentWeight > 0 ? 100 : 0;
    const batchTrend = previousBatchCount > 0
      ? Math.round(((currentBatches - previousBatchCount) / previousBatchCount) * 100)
      : currentBatches > 0 ? 100 : 0;
    const bagTrend = previousBags > 0
      ? Math.round(((currentBags - previousBags) / previousBags) * 100)
      : currentBags > 0 ? 100 : 0;

    const agentMap = new Map<string, { name: string; weight: number; bags: number; batches: number }>();
    for (const record of (agentPerformance.data || [])) {
      const agentId = record.agent_id;
      const agentName = (record as any).profiles?.full_name || 'Unknown';
      const existing = agentMap.get(agentId) || { name: agentName, weight: 0, bags: 0, batches: 0 };
      existing.weight += Number(record.total_weight || 0);
      existing.bags += Number(record.bag_count || 0);
      existing.batches += 1;
      agentMap.set(agentId, existing);
    }

    const agents = Array.from(agentMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        weight: Math.round(data.weight * 100) / 100,
        bags: data.bags,
        batches: data.batches,
      }))
      .sort((a, b) => b.weight - a.weight);

    const flaggedCount = batches.filter(b => b.yield_flag_reason).length;
    const batchComplianceRate = batches.length > 0
      ? Math.round(((batches.length - flaggedCount) / batches.length) * 100)
      : 100;

    const totalFarmsCount = farmsTotal.count || 0;
    const approvedFarmsCount = farmsApproved.count || 0;
    const farmComplianceRate = totalFarmsCount > 0
      ? Math.round((approvedFarmsCount / totalFarmsCount) * 100)
      : 0;

    const totalBagsCount = bagsTotal.count || 0;
    const compliantBagsCount = bagsCompliant.count || 0;
    const bagComplianceRate = totalBagsCount > 0
      ? Math.round((compliantBagsCount / totalBagsCount) * 100)
      : 100;

    return NextResponse.json({
      period,
      volumeTrends,
      weightSummary: {
        current: Math.round(currentWeight * 100) / 100,
        previous: Math.round(previousWeight * 100) / 100,
        trend: weightTrend,
      },
      batchSummary: {
        current: currentBatches,
        previous: previousBatchCount,
        trend: batchTrend,
      },
      bagSummary: {
        current: currentBags,
        previous: previousBags,
        trend: bagTrend,
        total: totalBagsCount,
      },
      farmSummary: {
        total: totalFarmsCount,
        approved: approvedFarmsCount,
        pending: farmsPending.count || 0,
        rejected: farmsRejected.count || 0,
      },
      compliance: {
        farmRate: farmComplianceRate,
        batchRate: batchComplianceRate,
        bagRate: bagComplianceRate,
        flaggedBatches: flaggedCount,
      },
      agentPerformance: agents,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
