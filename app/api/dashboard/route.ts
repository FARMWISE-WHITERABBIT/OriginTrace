import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

async function getAggregatorData(supabase: any, orgId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    batchesRes,
    collectingRes,
    resolvedRes,
    dispatchedRes,
    flaggedRes,
    todayWeightRes,
    weekWeightRes,
    monthWeightRes,
    agentsRes,
    allWeightRes,
  ] = await Promise.all([
    supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'collecting'),
    supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'resolved'),
    supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'dispatched'),
    supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId).not('yield_flag_reason', 'is', null),
    supabase.from('collection_batches').select('total_weight').eq('org_id', orgId).gte('created_at', todayStart),
    supabase.from('collection_batches').select('total_weight').eq('org_id', orgId).gte('created_at', weekStart),
    supabase.from('collection_batches').select('total_weight').eq('org_id', orgId).gte('created_at', monthStart),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', 'agent'),
    supabase.from('collection_batches').select('total_weight').eq('org_id', orgId).eq('status', 'dispatched'),
  ]);

  const todayWeight = todayWeightRes.data?.reduce((sum: number, b: any) => sum + Number(b.total_weight || 0), 0) || 0;
  const weekWeight = weekWeightRes.data?.reduce((sum: number, b: any) => sum + Number(b.total_weight || 0), 0) || 0;
  const monthWeight = monthWeightRes.data?.reduce((sum: number, b: any) => sum + Number(b.total_weight || 0), 0) || 0;
  const totalWeight = allWeightRes.data?.reduce((sum: number, b: any) => sum + Number(b.total_weight || 0), 0) || 0;

  const total = batchesRes.count || 0;
  const flagged = flaggedRes.count || 0;
  const complianceScore = total > 0 ? Math.round(((total - flagged) / total) * 100) : 100;

  return {
    totalBatches: total,
    collectingBatches: collectingRes.count || 0,
    resolvedBatches: resolvedRes.count || 0,
    dispatchedBatches: dispatchedRes.count || 0,
    totalWeight,
    todayWeight,
    weekWeight,
    monthWeight,
    activeAgents: agentsRes.count || 0,
    complianceScore,
    flaggedBatches: flagged,
  };
}

async function getComplianceOfficerData(supabase: any, orgId: string) {
  const [
    totalFarmsRes,
    approvedRes,
    pendingRes,
    rejectedRes,
    ddsRes,
    compFilesRes,
    recentRes,
  ] = await Promise.all([
    supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('compliance_status', 'approved'),
    supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('compliance_status', 'pending'),
    supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('compliance_status', 'rejected'),
    supabase.from('dds_exports').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('compliance_files').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('farms').select('id, farmer_name, compliance_status, updated_at').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(5),
  ]);

  const total = totalFarmsRes.count || 0;
  const approved = approvedRes.count || 0;
  const complianceRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return {
    totalFarms: total,
    approvedFarms: approved,
    pendingFarms: pendingRes.count || 0,
    rejectedFarms: rejectedRes.count || 0,
    complianceRate,
    ddsExportCount: ddsRes.count || 0,
    complianceFilesCount: compFilesRes.count || 0,
    recentActivity: recentRes.data || [],
  };
}

async function getLogisticsData(supabase: any, orgId: string) {
  const [
    unusedBagsRes,
    collectedBagsRes,
    processedBagsRes,
    totalBagsRes,
    recentDispatchesRes,
  ] = await Promise.all([
    supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'unused'),
    supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'collected'),
    supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'processed'),
    supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('collection_batches').select('id, status, bag_count, total_weight, created_at').eq('org_id', orgId).in('status', ['shipped', 'completed']).order('created_at', { ascending: false }).limit(5),
  ]);

  const { data: shipments } = await supabase
    .from('shipments')
    .select('id, status')
    .eq('org_id', orgId);

  const shipmentList = shipments || [];
  const shipmentStats = {
    total: shipmentList.length,
    pending: shipmentList.filter((s: any) => s.status === 'pending' || s.status === 'booked').length,
    inTransit: shipmentList.filter((s: any) => s.status === 'in_transit').length,
    delivered: shipmentList.filter((s: any) => s.status === 'delivered').length,
  };

  return {
    totalShipments: shipmentStats.total,
    pendingShipments: shipmentStats.pending,
    inTransitShipments: shipmentStats.inTransit,
    deliveredShipments: shipmentStats.delivered,
    unusedBags: unusedBagsRes.count || 0,
    collectedBags: collectedBagsRes.count || 0,
    processedBags: processedBagsRes.count || 0,
    totalBags: totalBagsRes.count || 0,
    recentDispatches: recentDispatchesRes.data || [],
  };
}

async function getWarehouseData(supabase: any, orgId: string) {
  const [
    unusedRes,
    collectedRes,
    processedRes,
    totalRes,
    recentBatchesRes,
  ] = await Promise.all([
    supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'unused'),
    supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'collected'),
    supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'processed'),
    supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('collection_batches').select('id, status, bag_count, total_weight, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(5),
  ]);

  return {
    unusedBags: unusedRes.count || 0,
    collectedBags: collectedRes.count || 0,
    processedBags: processedRes.count || 0,
    totalBags: totalRes.count || 0,
    recentBatches: recentBatchesRes.data || [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (!role) {
      return NextResponse.json({ error: 'Missing role parameter' }, { status: 400 });
    }

    const orgId = profile.org_id;

    switch (role) {
      case 'aggregator': {
        const data = await getAggregatorData(supabase, orgId);
        return NextResponse.json(data);
      }
      case 'compliance_officer': {
        const data = await getComplianceOfficerData(supabase, orgId);
        return NextResponse.json(data);
      }
      case 'logistics': {
        const data = await getLogisticsData(supabase, orgId);
        return NextResponse.json(data);
      }
      case 'warehouse': {
        const data = await getWarehouseData(supabase, orgId);
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json({ error: 'Invalid role parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
