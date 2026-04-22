import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { enforceTier } from '@/lib/api/tier-guard';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { parsePagination } from '@/lib/api/validation';
import { checkFarmEligibility } from '@/lib/services/farm-eligibility';
import { normalizeMarketCodes } from '@/lib/services/market-normalization';
import { emitEvent } from '@/lib/services/events';

const batchCreateSchema = z.object({
  farm_id: z.union([z.string(), z.number()]).transform(v => String(v)),
  bags: z.array(z.object({
    serial: z.string().optional(),
    weight: z.number().optional(),
    grade: z.string().optional(),
    is_compliant: z.boolean().optional(),
  })).optional(),
  notes: z.string().optional(),
  local_id: z.string().optional(),
  collected_at: z.string().optional(),
  // Admin override fields for farm compliance gate
  compliance_override_reason: z.string().trim().min(10, 'Override reason must be at least 10 characters').optional(),
  target_markets: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const tierBlock = await enforceTier(profile.org_id, 'smart_collect');
    if (tierBlock) return tierBlock;
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const farmId = searchParams.get('farm_id');
    const agentId = searchParams.get('agent_id');
    const { from, to, page, limit } = parsePagination(searchParams);
    
    let query = supabase
      .from('collection_batches')
      .select(`
        *,
        farm:farms(id, farmer_name, community),
        agent:profiles(id, full_name)
      `, { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    if (profile.role === 'agent') {
      query = query.eq('agent_id', profile.id);
    }
    
    const { data: batches, error, count } = await query;
    
    if (error) {
      console.error('Error fetching batches:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ batches: batches || [], pagination: { page, limit, total: count ?? 0 } });
    
  } catch (error) {
    console.error('Batches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const tierBlock = await enforceTier(profile.org_id, 'smart_collect');
    if (tierBlock) return tierBlock;
    
    const body = await request.json();

    const parsed = batchCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { farm_id, bags, notes, local_id, collected_at, compliance_override_reason, target_markets } = parsed.data;

    // ── Farm Compliance Gate ──────────────────────────────────────────────────
    // Fetch full farm record including compliance gate fields
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id, compliance_status, boundary_geo, deforestation_check, consent_timestamp, conflict_status')
      .eq('id', farm_id)
      .eq('org_id', profile.org_id)
      .single();

    if (farmError || !farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Resolve target markets: use provided value, else fall back to org's active compliance profiles
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
          blocker_codes: eligibility.blocker_codes,
          warnings: eligibility.warnings,
          warning_codes: eligibility.warning_codes,
          farmId: farm_id,
        },
        { status: 422 }
      );
    }

    // If admin used override, log it before proceeding
    if (override && eligibility.warnings.some((w) => w.startsWith('[ADMIN OVERRIDE]'))) {
      await logAuditEvent({
        orgId: profile.org_id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'farm.compliance_gate.overridden',
        resourceType: 'farm',
        resourceId: farm_id,
        metadata: {
          overrideReason: compliance_override_reason,
          actorRole: profile.role,
          overrideWarnings: eligibility.warnings,
        },
      });
    }
    // ─────────────────────────────────────────────────────────────────────────
    
    const totalWeight = bags?.reduce((sum: number, bag: any) => sum + (bag.weight || 0), 0) || 0;
    const bagCount = bags?.length || 0;
    
    const { data: batch, error: batchError } = await supabase
      .from('collection_batches')
      .insert({
        org_id: profile.org_id,
        farm_id,
        agent_id: profile.id,
        status: 'collecting',
        total_weight: totalWeight,
        bag_count: bagCount,
        notes,
        local_id,
        collected_at: collected_at || new Date().toISOString(),
        synced_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (batchError) {
      console.error('Error creating batch:', batchError);
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }
    
    if (bags && bags.length > 0) {
      for (const bag of bags) {
        if (bag.serial) {
          await supabase
            .from('bags')
            .update({
              collection_batch_id: batch.id,
              weight: bag.weight,
              grade: bag.grade,
              is_compliant: bag.is_compliant !== false,
              status: 'collected'
            })
            .eq('serial', bag.serial)
            .eq('org_id', profile.org_id);
        }
      }
    }

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'batch.created',
      resourceType: 'collection_batch',
      resourceId: batch.id?.toString(),
      metadata: { farm_id, bag_count: bagCount, total_weight: totalWeight },
    });

    // Cross-layer propagation: update farm last_collection_date, log propagation event
    await emitEvent(
      {
        name: 'batch.created',
        orgId: profile.org_id,
        actorId: user.id,
        actorEmail: user.email,
        payload: {
          batchId: batch.id,
          farmId: farm_id,
          farmComplianceStatus: farm.compliance_status,
          totalWeight: totalWeight,
          bagCount: bagCount,
          targetMarkets: resolvedTargetMarkets,
        },
      },
      supabase
    );

    dispatchWebhookEvent(profile.org_id, 'batch.created', {
      batch_id: batch.id, farm_id, bag_count: bagCount, total_weight: totalWeight,
    });
    
    return NextResponse.json({ batch, success: true });
    
  } catch (error) {
    console.error('Batches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const tierBlock = await enforceTier(profile.org_id, 'smart_collect');
    if (tierBlock) return tierBlock;
    
    const body = await request.json();
    const { id, status, notes, total_weight, bag_count } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }
    
    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (total_weight !== undefined) updateData.total_weight = total_weight;
    if (bag_count !== undefined) updateData.bag_count = bag_count;
    
    const { data: batch, error } = await supabase
      .from('collection_batches')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select('*, farms(farmer_name, phone)')
      .single();
    
    if (error) {
      console.error('Error updating batch:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ batch, success: true });
    
  } catch (error) {
    console.error('Batches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
