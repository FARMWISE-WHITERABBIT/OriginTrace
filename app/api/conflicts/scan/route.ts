import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';
import { detectConflicts, type FarmGeom } from '@/lib/geometry/polygon';

function readPolygonRing(value: unknown): [number, number][] | null {
  let boundary = value;
  if (typeof boundary === 'string') {
    try {
      boundary = JSON.parse(boundary);
    } catch {
      return null;
    }
  }

  const coordinates = (boundary as { type?: string; coordinates?: unknown })?.coordinates;
  const ring = Array.isArray(coordinates) && Array.isArray(coordinates[0]) ? coordinates[0] : null;
  if (!ring || ring.length < 4) return null;

  const points = ring
    .map((point) => Array.isArray(point) ? [Number(point[0]), Number(point[1])] as [number, number] : null)
    .filter((point): point is [number, number] => !!point && Number.isFinite(point[0]) && Number.isFinite(point[1]));
  if (points.length < 4) return null;

  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) points.push(first);
  return points;
}

/**
 * POST /api/conflicts/scan
 *
 * Fetches all farms with GPS boundaries for the authenticated org,
 * runs polygon intersection detection, and creates conflict records
 * for any pairs with overlap ratio >= 10%.
 *
 * Returns: { scanned, new_conflicts, skipped_existing }
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const tierBlock = await enforceTier(profile.org_id, 'boundary_conflicts');
    if (tierBlock) return tierBlock;

    // 1. Fetch all approved/pending farms with boundaries
    const { data: farms, error: farmsError } = await supabaseAdmin
      .from('farms')
      .select('id, farmer_name, boundary, boundary_geo, compliance_status')
      .eq('org_id', profile.org_id)
      .not('boundary', 'is', null);

    if (farmsError) {
      console.error('Failed to fetch farms for scan:', farmsError);
      return NextResponse.json({ error: 'Failed to fetch farms' }, { status: 500 });
    }

    if (!farms || farms.length < 2) {
      return NextResponse.json({ scanned: farms?.length ?? 0, new_conflicts: 0, skipped_existing: 0 });
    }

    // 2. Build geom array — skip farms with invalid/missing boundary rings
    const farmGeoms: FarmGeom[] = [];
    for (const farm of farms) {
      const ring = readPolygonRing(farm.boundary);
      if (!ring) continue;
      farmGeoms.push({ id: farm.id, farmer_name: farm.farmer_name, ring });
    }

    // 3. Prefer the PostGIS scan so concave polygons and geography areas are
    // handled correctly. Fall back to the winding-normalized JS detector only
    // for older installations that have not applied the scan RPC migration.
    const allBoundariesHavePostgisGeometry = farms.every((farm: any) => !!farm.boundary_geo);
    let postgisDetected: any[] | null = null;
    let postgisError: { message?: string } | null = null;
    if (allBoundariesHavePostgisGeometry) {
      // `scan_farm_boundary_conflicts` is defined in
      // supabase/migrations/20260720_120000_fix_boundary_conflicts.sql but that
      // migration has not been applied to the live DB (pre-existing drift,
      // unrelated to this change) — the type cast documents that gap since the
      // fallback below already tolerates the RPC being unavailable.
      const rpcResult = await (supabaseAdmin.rpc as any)(
        'scan_farm_boundary_conflicts',
        { p_org_id: profile.org_id, p_min_overlap_ratio: 0.10 },
      );
      postgisDetected = rpcResult.data as any[] | null;
      postgisError = rpcResult.error;
    }
    const jsDetected = detectConflicts(farmGeoms, 0.10);
    const detected = !postgisError && Array.isArray(postgisDetected) && allBoundariesHavePostgisGeometry
      ? postgisDetected.map((row: any) => ({
          farm_a_id: String(row.farm_a_id),
          farm_b_id: String(row.farm_b_id),
          overlap_ratio: Number(row.overlap_ratio),
        }))
      : jsDetected;

    if (postgisError) {
      console.warn('PostGIS conflict scan unavailable; using compatibility detector:', postgisError.message);
    }

    // 4. Fetch existing pending conflicts to avoid duplicates
    let { data: existing, error: existingError } = await supabaseAdmin
      .from('farm_conflicts')
      .select('farm_a_id, farm_b_id')
      .eq('org_id', profile.org_id)
      .eq('status', 'pending');

    // Compatibility for pre-migration databases: farm ids are still checked
    // against the authenticated org below, but the old conflict table did not
    // yet have its own org_id column.
    if (existingError?.message?.includes('org_id')) {
      const fallbackExisting = await supabaseAdmin
        .from('farm_conflicts')
        .select('farm_a_id, farm_b_id')
        .eq('status', 'pending');
      existing = fallbackExisting.data;
      existingError = fallbackExisting.error;
    }
    const orgFarmIds = new Set(farmGeoms.map((farm) => farm.id));
    existing = (existing || []).filter((conflict) =>
      orgFarmIds.has(conflict.farm_a_id) && orgFarmIds.has(conflict.farm_b_id)
    );

    const existingSet = new Set((existing || []).map(c => `${c.farm_a_id}-${c.farm_b_id}`));

    // Existing pending records are authoritative too. Repair statuses for
    // pairs created by the database trigger before this scan ran.
    const existingPairs = new Set<string>();
    for (const conflict of existing || []) {
      const pair = [conflict.farm_a_id, conflict.farm_b_id].sort().join('-');
      existingPairs.add(pair);
    }
    if (existingPairs.size > 0) {
      const ids = [...new Set((existing || []).flatMap(c => [c.farm_a_id, c.farm_b_id]))];
      await supabaseAdmin
        .from('farms')
        .update({ conflict_status: 'conflict' })
        .eq('org_id', profile.org_id)
        .in('id', ids);
    }

    // 5. Insert new conflicts in one request. The old per-pair insert/update
    // loop timed out as soon as a tenant had more than a handful of overlaps.
    let skipped = 0;
    const rowsToInsert: Array<{
      farm_a_id: string;
      farm_b_id: string;
      org_id: string;
      overlap_ratio: number;
      severity: string;
      status: string;
    }> = [];
    const farmIdsToMark = new Set<string>();

    for (const conflict of detected) {
      const key = `${conflict.farm_a_id}-${conflict.farm_b_id}`;
      const keyRev = `${conflict.farm_b_id}-${conflict.farm_a_id}`;
      if (existingSet.has(key) || existingSet.has(keyRev)) {
        skipped++;
        continue;
      }

      const severity =
        conflict.overlap_ratio > 0.50 ? 'critical' :
        conflict.overlap_ratio > 0.25 ? 'high' : 'low';
      rowsToInsert.push({
        farm_a_id: conflict.farm_a_id,
        farm_b_id: conflict.farm_b_id,
        org_id: profile.org_id,
        overlap_ratio: conflict.overlap_ratio,
        severity,
        status: 'pending',
      });
      farmIdsToMark.add(conflict.farm_a_id);
      farmIdsToMark.add(conflict.farm_b_id);
    }

    let newConflicts = 0;
    if (rowsToInsert.length > 0) {
      let { error: insertError } = await supabaseAdmin
        .from('farm_conflicts')
        .upsert(rowsToInsert as any, { onConflict: 'farm_a_id,farm_b_id', ignoreDuplicates: true });

      if (insertError?.message?.includes('org_id') || insertError?.message?.includes('severity')) {
        const fallbackRows = rowsToInsert.map(({ farm_a_id, farm_b_id, overlap_ratio, status }) => ({
          farm_a_id, farm_b_id, overlap_ratio, status,
        }));
        const fallbackInsert = await supabaseAdmin
          .from('farm_conflicts')
          .upsert(fallbackRows as any, { onConflict: 'farm_a_id,farm_b_id', ignoreDuplicates: true });
        insertError = fallbackInsert.error;
      }

      if (!insertError) {
        await supabaseAdmin
          .from('farms')
          .update({ conflict_status: 'conflict' })
          .eq('org_id', profile.org_id)
          .in('id', [...farmIdsToMark]);
        newConflicts = rowsToInsert.length;
      } else {
        console.error('Failed to persist farm conflicts:', insertError);
      }
    }

    return NextResponse.json({
      scanned: farmGeoms.length,
      new_conflicts: newConflicts,
      skipped_existing: skipped,
    });

  } catch (error) {
    console.error('Conflicts scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
