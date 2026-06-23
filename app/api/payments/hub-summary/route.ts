import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';

/**
 * GET /api/payments/hub-summary
 * Returns the three KPI values shown on the Payments Hub header:
 *  - wallet_balance_usdc   (USDC balance from blockradar wallet)
 *  - pending_escrow_usd    (sum of active escrow accounts)
 *  - owed_to_farmers_ngn   (sum of pending + approved disbursements)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const supabase = createAdminClient();
    const orgId = profile.org_id;

    const [walletRes, escrowRes, disbursementRes] = await Promise.allSettled([
      // USDC wallet balance
      supabase
        .from('organizations')
        .select('wallet_id, wallet_balance_usdc')
        .eq('id', orgId)
        .single(),

      // Sum of active escrow amounts
      supabase
        .from('escrow_accounts')
        .select('amount_usd')
        .eq('org_id', orgId)
        .in('status', ['active', 'disputed']),

      // Sum of pending + approved disbursements
      supabase
        .from('disbursement_calculations')
        .select('net_amount')
        .eq('org_id', orgId)
        .in('status', ['pending', 'approved']),
    ]);

    let wallet_balance_usdc = 0;
    if (walletRes.status === 'fulfilled' && walletRes.value.data) {
      wallet_balance_usdc = Number(walletRes.value.data.wallet_balance_usdc ?? 0);
    }

    let pending_escrow_usd = 0;
    if (escrowRes.status === 'fulfilled' && escrowRes.value.data) {
      pending_escrow_usd = escrowRes.value.data.reduce(
        (sum, row) => sum + Number(row.amount_usd ?? 0),
        0,
      );
    }

    let owed_to_farmers_ngn = 0;
    if (disbursementRes.status === 'fulfilled' && disbursementRes.value.data) {
      owed_to_farmers_ngn = disbursementRes.value.data.reduce(
        (sum, row) => sum + Number(row.net_amount ?? 0),
        0,
      );
    }

    return NextResponse.json({ wallet_balance_usdc, pending_escrow_usd, owed_to_farmers_ngn });
  } catch (error) {
    console.error('Hub summary error:', error);
    return NextResponse.json({ wallet_balance_usdc: 0, pending_escrow_usd: 0, owed_to_farmers_ngn: 0 });
  }
}
