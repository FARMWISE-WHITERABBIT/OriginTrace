import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';
import { z } from 'zod';

const MODULE_TYPES = ['gap', 'safety', 'sustainability', 'organic', 'child_labor', 'eudr_awareness'] as const;
const STATUSES = ['not_started', 'in_progress', 'completed'] as const;

const trainingCreateSchema = z.object({
  module_name: z.string().min(1, 'Module name is required'),
  module_type: z.enum(MODULE_TYPES),
  status: z.enum(STATUSES).default('not_started'),
  score: z.number().min(0).max(100).optional().nullable(),
  completed_at: z.string().optional().nullable(),
  certificate_url: z.string().url().optional().nullable(),
});

const trainingPatchSchema = z.object({
  id: z.string().uuid(),
  module_name: z.string().min(1).optional(),
  module_type: z.enum(MODULE_TYPES).optional(),
  status: z.enum(STATUSES).optional(),
  score: z.number().min(0).max(100).optional().nullable(),
  completed_at: z.string().optional().nullable(),
});

// POST — admin/aggregator assigns a training module to a farmer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmId } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify farm belongs to org
    const { data: farm } = await supabase.from('farms').select('id').eq('id', farmId).eq('org_id', profile.org_id).single();
    if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 });

    const body = await request.json();
    const parsed = trainingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const insertData: Record<string, any> = {
      farm_id: farmId,
      org_id: profile.org_id,
      module_name: parsed.data.module_name,
      module_type: parsed.data.module_type,
      status: parsed.data.status,
      assigned_by: user.id,
    };
    if (parsed.data.score != null) insertData.score = parsed.data.score;
    if (parsed.data.completed_at) insertData.completed_at = parsed.data.completed_at;
    if (parsed.data.status === 'completed' && !parsed.data.completed_at) {
      insertData.completed_at = new Date().toISOString();
    }

    const { data: record, error } = await supabase.from('farmer_training').insert(insertData).select().single();
    if (error) {
      console.error('[farmer training POST]', error);
      return NextResponse.json({ error: 'Failed to add training record' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'farmer_training.assigned',
      resourceType: 'farm',
      resourceId: farmId,
      metadata: { module_name: parsed.data.module_name, module_type: parsed.data.module_type, status: parsed.data.status },
    });

    return NextResponse.json({ record });
  } catch (err) {
    console.error('[farmers/[id]/training POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — admin/aggregator updates a training record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmId } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = trainingPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id: trainingId, ...updates } = parsed.data;

    // Verify record belongs to farm in org
    const { data: existing } = await supabase.from('farmer_training').select('id').eq('id', trainingId).eq('farm_id', farmId).eq('org_id', profile.org_id).single();
    if (!existing) return NextResponse.json({ error: 'Training record not found' }, { status: 404 });

    const updateData: Record<string, any> = { ...updates };
    if (updates.status === 'completed' && !updates.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: record, error } = await supabase.from('farmer_training').update(updateData).eq('id', trainingId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'farmer_training.updated',
      resourceType: 'farm',
      resourceId: farmId,
      metadata: { training_id: trainingId, status: updates.status, score: updates.score },
    });

    return NextResponse.json({ record });
  } catch (err) {
    console.error('[farmers/[id]/training PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — admin/aggregator removes a training record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmId } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const trainingId = searchParams.get('training_id');
    if (!trainingId) return NextResponse.json({ error: 'training_id required' }, { status: 400 });

    const { data: existing } = await supabase.from('farmer_training').select('id').eq('id', trainingId).eq('farm_id', farmId).eq('org_id', profile.org_id).single();
    if (!existing) return NextResponse.json({ error: 'Training record not found' }, { status: 404 });

    const { error } = await supabase.from('farmer_training').delete().eq('id', trainingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[farmers/[id]/training DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
