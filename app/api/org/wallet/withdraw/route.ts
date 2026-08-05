/**
 * POST /api/org/wallet/withdraw
 *
 * Withdraws funds from the OriginTrace wallet to the org's registered bank account.
 * Requires 2FA (TOTP) when totp_enabled = true.
 *
 * Body:
 *   amount: number          — amount in target currency
 *   currency: string        — 'NGN' | 'USD' | 'GBP' | 'EUR' | 'USDC'
 *   account_number: string  — destination bank account
 *   bank_code: string       — destination bank code (for NGN transfers)
 *   account_name: string    — beneficiary name
 *   totp_token?: string     — 6-digit TOTP code (required when 2FA enabled)
 *   notes?: string
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { verifyTOTP } from '@/lib/totp';
import { logAuditEvent, getClientIp } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user || !profile?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden — only admins can withdraw' }, { status: 403 });

    const body = await request.json();
    const { amount, currency, account_number, bank_code, account_name, totp_token, notes } = body;

    if (!amount || !currency || !account_number || !account_name) {
      return NextResponse.json({ error: 'amount, currency, account_number, and account_name are required' }, { status: 400 });
    }
    if (Number(amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch org's 2FA settings and wallet info
    const { data: org } = await supabase
      .from('organizations')
      .select('totp_enabled, totp_secret, name')
      .eq('id', profile.org_id)
      .single();

    // Enforce 2FA if enabled
    const totpEnabled = (org as any)?.totp_enabled ?? false;
    if (totpEnabled) {
      if (!totp_token) {
        return NextResponse.json({ error: '2FA code required', requires_2fa: true }, { status: 401 });
      }
      const totpSecret = (org as any)?.totp_secret;
      if (!totpSecret || !verifyTOTP(totp_token, totpSecret)) {
        return NextResponse.json({ error: 'Invalid 2FA code', requires_2fa: true }, { status: 401 });
      }
    }

    // Record the withdrawal request in payments table
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        org_id: profile.org_id,
        payee_name: account_name,
        payee_type: 'supplier',
        amount: Number(amount),
        currency,
        payment_method: 'bank_transfer',
        reference_number: null,
        payment_date: new Date().toISOString().split('T')[0],
        notes: notes || `Withdrawal to ${account_name} — ${account_number}`,
        status: 'pending',
        recorded_by: user.id,
      })
      .select()
      .single();

    if (payErr) {
      return NextResponse.json({ error: 'Failed to record withdrawal', details: payErr.message }, { status: 500 });
    }

    // TODO: Integrate with actual payment provider (Paystack / Grey) to initiate the transfer.
    // For now, the withdrawal is logged as pending and requires manual processing or webhook confirmation.

    await logAuditEvent({
      orgId: String(profile.org_id),
      actorId: user.id,
      actorEmail: user.email,
      action: 'wallet.withdrawal_requested',
      resourceType: 'payment',
      resourceId: payment.id,
      metadata: { amount, currency, account_name, account_number, two_fa_used: totpEnabled },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      message: `Withdrawal of ${currency} ${amount} to ${account_name} has been initiated and is pending processing.`,
    });
  } catch (err: any) {
    console.error('[wallet/withdraw]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
