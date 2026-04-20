import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';
import { detectConflicts, type FarmGeom } from '@/lib/geometry/polygon';

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
      .select('id, farmer_name, boundary, compliance_status')
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
      const ring = farm.boundary?.coordinates?.[0];
      if (!ring || ring.length < 3) continue;
      farmGeoms.push({ id: farm.id, farmer_name: farm.farmer_name, ring });
    }

    // 3. Run detection
    const detected = detectConflicts(farmGeoms, 0.10);
    if (detected.length === 0) {
      return NextResponse.json({ scanned: farmGeoms.length, new_conflicts: 0, skipped_existing: 0 });
    }

    // 4. Fetch existing pending conflicts to avoid duplicates
    const { data: existing } = await supabaseAdmin
      .from('farm_conflicts')
      .select('farm_a_id, farm_b_id')
      .eq('status', 'pending');

    const existingSet = new Set((existing || []).map(c => `${c.farm_a_id}-${c.farm_b_id}`));

    // 5. Insert new conflicts
    let newConflicts = 0;
    let skipped = 0;

    for (const conflict of detected) {
      const key = `${conflict.farm_a_id}-${conflict.farm_b_id}`;
      const keyRev = `${conflict.farm_b_id}-${conflict.farm_a_id}`;
      if (existingSet.has(key) || existingSet.has(keyRev)) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabaseAdmin
        .from('farm_conflicts')
        .insert({
          farm_a_id: conflict.farm_a_id,
          farm_b_id: conflict.farm_b_id,
          overlap_ratio: conflict.overlap_ratio,
          status: 'pending',
        });

      if (!insertError) {
        // Mark both farms as having a conflict
        await supabaseAdmin
          .from('farms')
          .update({ conflict_status: 'conflict' })
          .in('id', [conflict.farm_a_id, conflict.farm_b_id]);
        newConflicts++;
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
