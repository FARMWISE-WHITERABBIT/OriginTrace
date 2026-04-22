/**
 * GET  /api/escrow?shipment_id=xxx — fetch active escrow for a shipment
 * POST /api/escrow                  — Initialize a new escrow account
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { createEscrow } from '@/lib/services/escrow';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_ROLES = ['admin', 'aggregator'];

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipment_id');
    if (!shipmentId) return NextResponse.json({ error: 'shipment_id required' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: escrow, error } = await supabase
      .from('escrow_accounts')
      .select('id, amount_usd, status, milestone_config, created_at')
      .eq('org_id', profile.org_id)
      .eq('shipment_id', shipmentId)
      .in('status', ['active', 'disputed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ escrow: null });
    return NextResponse.json({ escrow: escrow ?? null });
  } catch {
    return NextResponse.json({ escrow: null });
  }
}

const createEscrowSchema = z.object({
  shipment_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  buyer_org_id: z.string().uuid().optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'NGN', 'XOF']).default('USD'),
  total_amount: z.number().positive(),
  milestones: z
    .array(
      z.object({
        milestone_id: z.string().min(1),
        stage: z.number().int().min(1).max(9),
        amount: z.number().positive(),
        description: z.string().min(1),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createEscrowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    if (!parsed.data.shipment_id && !parsed.data.contract_id) {
      return NextResponse.json({ error: 'Either shipment_id or contract_id is required' }, { status: 400 });
    }

    const escrow = await createEscrow({
      orgId: profile.org_id,
      buyerOrgId: parsed.data.buyer_org_id,
      contractId: parsed.data.contract_id,
      shipmentId: parsed.data.shipment_id,
      currency: parsed.data.currency,
      totalAmount: parsed.data.total_amount,
      milestones: parsed.data.milestones,
      createdBy: user.id,
      actorEmail: user.email,
    });

    return NextResponse.json({ escrow }, { status: 201 });
  } catch (error) {
    console.error('Create escrow error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
