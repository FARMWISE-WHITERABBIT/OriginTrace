import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';

const paymentSetupSchema = z.object({
  payment_method: z.enum(['escrow_usdc', 'swift_virtual', 'manual']),
  amount_usd: z.number().positive(),
  milestones: z.array(
    z.object({
      stage: z.string(),
      amount: z.number().positive(),
      description: z.string().min(1),
    })
  ).optional(),
});

/**
 * POST /api/shipments/[id]/payment-setup
 * Sets up inbound payment for a shipment.
 * - Creates an escrow account if method is escrow_usdc
 * - Updates shipment payment_status and payment_method
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: shipmentId } = await params;
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await request.json();
    const parsed = paymentSetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify shipment belongs to this org
    const { data: shipment } = await supabase
      .from('shipments')
      .select('id, payment_status, payment_instruction_token')
      .eq('id', shipmentId)
      .eq('org_id', profile.org_id)
      .single();

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const { payment_method, amount_usd, milestones } = parsed.data;

    // Build milestone config
    const milestoneConfig = (milestones ?? [
      { stage: 'on_delivery', amount: amount_usd, description: 'Full payment on delivery' },
    ]).map((m, i) => ({
      milestone_id: `m${i + 1}`,
      stage: m.stage,
      amount: m.amount,
      description: m.description,
    }));

    // Create escrow account if USDC method
    let escrowId: string | null = null;
    if (payment_method === 'escrow_usdc') {
      const { data: escrow, error: escrowErr } = await supabase
        .from('escrow_accounts')
        .insert({
          org_id: profile.org_id,
          shipment_id: shipmentId,
          amount_usd,
          status: 'active',
          milestone_config: milestoneConfig,
        })
        .select('id')
        .single();

      if (escrowErr) {
        console.error('Escrow creation error:', escrowErr.message);
        return NextResponse.json({ error: 'Failed to create escrow account' }, { status: 500 });
      }
      escrowId = escrow.id;
    }

    // Update shipment payment fields
    const { error: updateErr } = await supabase
      .from('shipments')
      .update({
        payment_method,
        payment_status: 'awaiting_payment',
      })
      .eq('id', shipmentId)
      .eq('org_id', profile.org_id);

    if (updateErr) {
      console.error('Shipment update error:', updateErr.message);
      return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      payment_method,
      payment_status: 'awaiting_payment',
      escrow_id: escrowId,
      payment_instruction_token: shipment.payment_instruction_token,
    });
  } catch (error) {
    console.error('Payment setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
