import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/payments/instruction/[token]
 * Public endpoint — no auth required.
 * Returns payment instructions for a buyer given the opaque token.
 * Exposes only what the buyer needs; never exposes internal org IDs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const supabase = createAdminClient();

    const { data: shipment } = await supabase
      .from('shipments')
      .select(`
        id,
        shipment_code,
        commodity,
        destination_country,
        buyer_company,
        total_shipment_value_usd,
        payment_method,
        payment_status,
        org_id,
        organizations!org_id (
          name,
          wallet_id,
          wallet_deposit_address
        )
      `)
      .eq('payment_instruction_token', token)
      .single();

    if (!shipment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (shipment.payment_status === 'none' || !shipment.payment_method) {
      return NextResponse.json({ error: 'Payment has not been set up yet' }, { status: 410 });
    }

    const org = (shipment as any).organizations;

    // Fetch wallet + virtual accounts for SWIFT method
    let walletAddress: string | null = null;
    let virtualAccounts: any[] = [];

    if (shipment.payment_method === 'escrow_usdc') {
      // Get USDC deposit address
      const { data: orgData } = await supabase
        .from('organizations')
        .select('wallet_deposit_address')
        .eq('id', shipment.org_id)
        .single();
      walletAddress = orgData?.wallet_deposit_address ?? null;
    } else if (shipment.payment_method === 'swift_virtual') {
      const { data: accounts } = await supabase
        .from('virtual_accounts')
        .select('currency, account_number, routing_number, bank_name, iban, swift')
        .eq('org_id', shipment.org_id);
      virtualAccounts = accounts ?? [];
    }

    // Fetch escrow milestones if USDC
    let milestones: any[] = [];
    if (shipment.payment_method === 'escrow_usdc') {
      const { data: escrow } = await supabase
        .from('escrow_accounts')
        .select('amount_usd, milestone_config, status')
        .eq('shipment_id', shipment.id)
        .in('status', ['active', 'disputed'])
        .limit(1)
        .maybeSingle();
      milestones = escrow?.milestone_config ?? [];
    }

    return NextResponse.json({
      shipment_code: shipment.shipment_code,
      commodity: shipment.commodity,
      destination_country: shipment.destination_country,
      buyer_company: shipment.buyer_company,
      total_amount_usd: shipment.total_shipment_value_usd,
      payment_method: shipment.payment_method,
      payment_status: shipment.payment_status,
      seller_name: org?.name ?? 'OriginTrace Seller',
      // Method-specific fields
      usdc_deposit_address: walletAddress,
      virtual_accounts: virtualAccounts,
      milestones,
    });
  } catch (error) {
    console.error('Payment instruction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
