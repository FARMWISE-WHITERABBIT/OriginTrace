import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = adminClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { org_id: orgId, role } = profile;
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || role;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ── Aggregator dashboard ─────────────────────────────────────────────────
    if (view === 'aggregator') {
      const [
        totalBatchesRes,
        collectingRes,
        resolvedRes,
        dispatchedRes,
        flaggedRes,
        todayWeightRes,
        weekWeightRes,
        monthWeightRes,
        agentCountRes,
        dispatchedWeightRes,
        recentBatchesRes,
      ] = await Promise.all([
        supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'collecting'),
        supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'resolved'),
        supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'dispatched'),
        supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', orgId).not('yield_flag_reason', 'is', null),
        supabase.from('collection_batches').select('total_weight').eq('org_id', orgId).gte('created_at', todayStart.toISOString()),
        supabase.from('collection_batches').select('total_weight').eq('org_id', orgId).gte('created_at', weekStart.toISOString()),
        supabase.from('collection_batches').select('total_weight').eq('org_id', orgId).gte('created_at', monthStart.toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', 'agent'),
        supabase.from('collection_batches').select('total_weight').eq('org_id', orgId).eq('status', 'dispatched'),
        supabase.from('collection_batches').select('id, batch_id, status, total_weight, bag_count, created_at, yield_flag_reason').eq('org_id', orgId).order('created_at', { ascending: false }).limit(5),
      ]);

      const sumWeight = (rows: any[]) => rows.reduce((s, r) => s + Number(r.total_weight || 0), 0);

      return NextResponse.json({
        totalBatches: totalBatchesRes.count || 0,
        collectingBatches: collectingRes.count || 0,
        resolvedBatches: resolvedRes.count || 0,
        dispatchedBatches: dispatchedRes.count || 0,
        flaggedBatches: flaggedRes.count || 0,
        todayWeight: Math.round(sumWeight(todayWeightRes.data || []) * 100) / 100,
        weekWeight: Math.round(sumWeight(weekWeightRes.data || []) * 100) / 100,
        monthWeight: Math.round(sumWeight(monthWeightRes.data || []) * 100) / 100,
        agentCount: agentCountRes.count || 0,
        dispatchedWeight: Math.round(sumWeight(dispatchedWeightRes.data || []) * 100) / 100,
        recentBatches: recentBatchesRes.data || [],
      });
    }

    // ── Compliance officer dashboard ─────────────────────────────────────────
    if (view === 'compliance_officer') {
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
      return NextResponse.json({
        totalFarms: total,
        approvedFarms: approved,
        pendingFarms: pendingRes.count || 0,
        rejectedFarms: rejectedRes.count || 0,
        complianceRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        ddsExportCount: ddsRes.count || 0,
        complianceFilesCount: compFilesRes.count || 0,
        recentActivity: recentRes.data || [],
      });
    }

    // ── Logistics coordinator dashboard ──────────────────────────────────────
    if (view === 'logistics_coordinator') {
      const [
        unusedBagsRes,
        collectedBagsRes,
        processedBagsRes,
        totalBagsRes,
        recentBatchesRes,
        pendingShipmentsRes,
        activeShipmentsRes,
      ] = await Promise.all([
        supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'unused'),
        supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'collected'),
        supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'processed'),
        supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('collection_batches').select('id, batch_id, status, bag_count, total_weight, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(5),
        supabase.from('shipments').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending'),
        supabase.from('shipments').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'in_transit'),
      ]);

      return NextResponse.json({
        unusedBags: unusedBagsRes.count || 0,
        collectedBags: collectedBagsRes.count || 0,
        processedBags: processedBagsRes.count || 0,
        totalBags: totalBagsRes.count || 0,
        recentBatches: recentBatchesRes.data || [],
        pendingShipments: pendingShipmentsRes.count || 0,
        activeShipments: activeShipmentsRes.count || 0,
      });
    }

    // ── Warehouse supervisor dashboard ───────────────────────────────────────
    if (view === 'warehouse_supervisor') {
      const [
        unusedBagsRes,
        collectedBagsRes,
        processedBagsRes,
        totalBagsRes,
        recentBatchesRes,
      ] = await Promise.all([
        supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'unused'),
        supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'collected'),
        supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'processed'),
        supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('collection_batches').select('id, batch_id, status, bag_count, total_weight, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(5),
      ]);

      return NextResponse.json({
        unusedBags: unusedBagsRes.count || 0,
        collectedBags: collectedBagsRes.count || 0,
        processedBags: processedBagsRes.count || 0,
        totalBags: totalBagsRes.count || 0,
        recentBatches: recentBatchesRes.data || [],
      });
    }

    return NextResponse.json({ error: 'Unknown dashboard view' }, { status: 400 });
  } catch (err) {
    console.error('[dashboard API] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
