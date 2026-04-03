import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';
import { checkFarmEligibility } from '@/lib/services/farm-eligibility';
import { normalizeMarketCodes } from '@/lib/services/market-normalization';
import { logAuditEvent } from '@/lib/audit';

const ALLOWED_READ_ROLES = ['admin', 'aggregator', 'agent', 'quality_manager', 'compliance_officer'];
const ALLOWED_WRITE_ROLES = ['admin', 'aggregator', 'agent'];

const batchContributionSchema = z.object({
  batch_id:     z.string().uuid({ message: 'batch_id must be a valid UUID' }),
  farm_id:      z.string().uuid({ message: 'farm_id must be a valid UUID' }),
  farmer_name:  z.string().nullable().optional(),
  weight_kg:    z.number().min(0).default(0),
  bag_count:    z.number().int().min(0).default(0),
  notes:        z.string().nullable().optional(),
  target_markets: z.array(z.string()).optional(),
  compliance_override_reason: z.string().trim().min(10, 'Override reason must be at least 10 characters').optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    if (!ALLOWED_READ_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const batchId = request.nextUrl.searchParams.get('batch_id');
    if (!batchId) {
      return NextResponse.json({ error: 'batch_id required' }, { status: 400 });
    }

    const { data: batch } = await supabaseAdmin
      .from('collection_batches')
      .select('id, org_id')
      .eq('id', batchId)
      .eq('org_id', profile.org_id)
      .single();

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const { data: contributions, error } = await supabaseAdmin
      .from('batch_contributions')
      .select('*, farm:farm_id(farmer_name, community, compliance_status, area_hectares)')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Batch contributions fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contributions: contributions || [] });
  } catch (error) {
    console.error('Batch contributions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    if (!ALLOWED_WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = batchContributionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { batch_id, farm_id, farmer_name, weight_kg, bag_count, notes, target_markets, compliance_override_reason } = parsed.data;

    const { data: batch } = await supabaseAdmin
      .from('collection_batches')
      .select('id, org_id, status')
      .eq('id', batch_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('id, compliance_status, boundary_geo, deforestation_check, consent_timestamp')
      .eq('id', farm_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    const resolvedTargetMarkets = normalizeMarketCodes(target_markets ?? []);
    const override = compliance_override_reason
      ? { reason: compliance_override_reason, actorRole: profile.role }
      : undefined;
    const eligibility = checkFarmEligibility(farm as any, resolvedTargetMarkets, override);

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: 'Farm Compliance Gate: this farm cannot contribute to this batch.',
          blockers: eligibility.blockers,
          warnings: eligibility.warnings,
          farm_id,
        },
        { status: 422 }
      );
    }

    if (override && eligibility.warnings.some((w) => w.startsWith('[ADMIN OVERRIDE]'))) {
      await logAuditEvent({
        orgId: batch.org_id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'farm.compliance_gate.overridden',
        resourceType: 'farm',
        resourceId: farm_id,
        metadata: {
          batch_id,
          overrideReason: compliance_override_reason,
          actorRole: profile.role,
          overrideWarnings: eligibility.warnings,
        },
      });
    }

    const complianceStatus =
      eligibility.status === 'eligible' && farm.compliance_status === 'approved'
        ? 'verified'
        : 'pending';

    const { data: contribution, error } = await supabaseAdmin
      .from('batch_contributions')
      .insert({
        batch_id,
        farm_id,
        org_id: batch.org_id,
        farmer_name: farmer_name ?? null,
        weight_kg,
        bag_count,
        compliance_status: complianceStatus,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert contribution error:', error);
      return NextResponse.json({ error: 'Failed to add contribution', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ contribution });
  } catch (error) {
    console.error('Batch contributions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const contributionId = request.nextUrl.searchParams.get('id');
    if (!contributionId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const { data: contribution } = await supabaseAdmin
      .from('batch_contributions')
      .select('batch_id')
      .eq('id', contributionId)
      .single();

    if (!contribution) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 });
    }

    const { data: batch } = await supabaseAdmin
      .from('collection_batches')
      .select('id')
      .eq('id', contribution.batch_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!batch) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('batch_contributions')
      .delete()
      .eq('id', contributionId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Batch contributions DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
