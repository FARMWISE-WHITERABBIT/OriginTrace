import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { createWallet, getWalletBalance, getDepositAddress } from '@/lib/payments/blockradar';
import { logAuditEvent, getClientIp } from '@/lib/audit';

/**
 * GET /api/org/wallet
 * Returns the org's NGN balance (Paystack) + USDC wallet info (Blockradar).
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createAdminClient();
    const { data: org } = await supabase
      .from('organizations')
      .select('blockradar_wallet_id, usdc_deposit_address, usdc_balance, grey_virtual_accounts, name')
      .eq('id', profile.org_id)
      .single();

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Fetch live USDC balance from Blockradar if wallet is provisioned
    let usdcBalance = Number(org.usdc_balance ?? 0);
    let usdcAddress = org.usdc_deposit_address;

    if (org.blockradar_wallet_id) {
      try {
        const bal = await getWalletBalance(org.blockradar_wallet_id);
        usdcBalance = Number(bal.available ?? bal) || 0;

        // Cache updated balance
        await supabase
          .from('organizations')
          .update({ usdc_balance: usdcBalance })
          .eq('id', profile.org_id);
      } catch (e) {
        console.warn('[Wallet] Blockradar balance fetch failed:', e);
      }
    }

    // Fetch NGN balance from Paystack (if key is configured)
    let ngnBalance: number | null = null;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (paystackKey) {
      try {
        const psRes = await fetch('https://api.paystack.co/balance', {
          headers: { Authorization: `Bearer ${paystackKey}` },
        });
        if (psRes.ok) {
          const psData = await psRes.json();
          // Paystack returns balance in kobo; convert to NGN
          const ngnEntry = (psData.data ?? []).find((b: any) => b.currency === 'NGN');
          ngnBalance = ngnEntry ? ngnEntry.balance / 100 : null;
        }
      } catch (e) {
        console.warn('[Wallet] Paystack balance fetch failed:', e);
      }
    }

    return NextResponse.json({
      usdc: {
        provisioned: !!org.blockradar_wallet_id,
        wallet_id: org.blockradar_wallet_id ?? null,
        balance: usdcBalance,
        deposit_address: usdcAddress ?? null,
        networks: ['polygon', 'ethereum', 'tron'],
      },
      ngn: {
        balance: ngnBalance,
        currency: 'NGN',
      },
      virtual_accounts: org.grey_virtual_accounts ?? [],
    });
  } catch (error) {
    console.error('GET org/wallet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/org/wallet
 * Provision a USDC wallet for the org if one doesn't exist.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createAdminClient();
    const { data: org } = await supabase
      .from('organizations')
      .select('blockradar_wallet_id, name')
      .eq('id', profile.org_id)
      .single();

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    if (org.blockradar_wallet_id) {
      return NextResponse.json(
        { error: 'USDC wallet already provisioned for this organization' },
        { status: 409 }
      );
    }

    const wallet = await createWallet(`OriginTrace-${org.name}-${profile.org_id.slice(0, 8)}`);
    const depositAddress = await getDepositAddress(wallet.id, 'polygon');

    await supabase
      .from('organizations')
      .update({
        blockradar_wallet_id: wallet.id,
        usdc_deposit_address: depositAddress,
        usdc_balance: 0,
      })
      .eq('id', profile.org_id);

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'wallet.provisioned',
      resourceType: 'organization',
      resourceId: profile.org_id,
      metadata: { wallet_id: wallet.id, network: 'polygon' },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      wallet_id: wallet.id,
      deposit_address: depositAddress,
      network: 'polygon',
    }, { status: 201 });
  } catch (error) {
    console.error('POST org/wallet error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
