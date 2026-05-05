import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { listTransactions } from '@/lib/payments/blockradar';

/**
 * GET /api/org/wallet/transactions
 * Returns combined inbound transaction history:
 * - USDC deposits from Blockradar (if wallet provisioned)
 * - Inbound NGN records from payments table (payee_type='buyer')
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);

    const { data: org } = await supabase
      .from('organizations')
      .select('blockradar_wallet_id, grey_virtual_accounts')
      .eq('id', profile.org_id)
      .single();

    // USDC transactions from Blockradar
    let usdcTransactions: any[] = [];
    if (org?.blockradar_wallet_id) {
      try {
        const { transactions } = await listTransactions(org.blockradar_wallet_id, {
          page,
          limit,
          type: 'deposit',
        });
        usdcTransactions = transactions.map((tx) => ({
          id: tx.id,
          type: 'usdc_deposit',
          amount: tx.amount,
          currency: 'USDC',
          from: tx.from ?? null,
          network: tx.network,
          hash: tx.hash,
          reference: tx.reference ?? null,
          status: tx.status,
          created_at: tx.created_at,
        }));
      } catch (e) {
        console.warn('[Wallet] Blockradar transactions fetch failed:', e);
      }
    }

    // Inbound NGN/SWIFT records from payments table (where payee_type = 'buyer')
    const { data: ngnTransactions } = await supabase
      .from('payments')
      .select('id, amount, currency, reference_number, notes, status, payment_date, payment_method')
      .eq('org_id', profile.org_id)
      .eq('payee_type', 'buyer')
      .order('payment_date', { ascending: false })
      .limit(limit);

    const ngnMapped = (ngnTransactions ?? []).map((p) => ({
      id: p.id,
      type: p.payment_method === 'usdc' ? 'usdc_deposit' : 'bank_transfer',
      amount: Number(p.amount),
      currency: p.currency,
      from: null,
      network: null,
      hash: null,
      reference: p.reference_number ?? null,
      status: p.status,
      created_at: p.payment_date,
    }));

    // Merge and sort by date descending
    const all = [...usdcTransactions, ...ngnMapped].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ transactions: all.slice(0, limit) });
  } catch (error) {
    console.error('GET org/wallet/transactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
