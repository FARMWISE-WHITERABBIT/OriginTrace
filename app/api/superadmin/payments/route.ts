import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';
import { logSuperadminAction } from '@/lib/superadmin-audit';

async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSystemAdmin(supabase, user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');

    switch (resource) {
      case 'escrow_overview': {
        const [
          { data: allEscrows },
          { count: activeCount },
          { count: overdueCount },
          { count: disputedCount },
        ] = await Promise.all([
          supabase.from('escrow_accounts').select('amount, currency, status'),
          supabase.from('escrow_accounts').select('*', { count: 'exact', head: true }).eq('status', 'held'),
          supabase
            .from('escrow_accounts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'held')
            .lt('release_deadline', new Date().toISOString()),
          supabase.from('escrow_disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        ]);

        const totalByStatus: Record<string, number> = {};
        const totalByCurrency: Record<string, number> = {};
        for (const e of allEscrows ?? []) {
          totalByStatus[e.status] = (totalByStatus[e.status] ?? 0) + parseFloat(e.amount ?? 0);
          totalByCurrency[e.currency ?? 'NGN'] = (totalByCurrency[e.currency ?? 'NGN'] ?? 0) + parseFloat(e.amount ?? 0);
        }

        return NextResponse.json({
          escrow_overview: {
            total_accounts: (allEscrows ?? []).length,
            active_holds: activeCount ?? 0,
            overdue_releases: overdueCount ?? 0,
            disputed_holds: disputedCount ?? 0,
            total_by_status: totalByStatus,
            total_by_currency: totalByCurrency,
          },
        });
      }

      case 'failed_transactions': {
        const { data, error } = await supabase
          .from('escrow_transactions')
          .select('*, escrow_accounts(org_id, organizations(name))')
          .eq('type', 'failed')
          .order('created_at', { ascending: false })
          .limit(100);

        // Also check payments table for failed payments
        const { data: failedPayments, error: payErr } = await supabase
          .from('payments')
          .select('*, organizations(name)')
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error || payErr) return NextResponse.json({ error: (error || payErr)?.message }, { status: 500 });

        return NextResponse.json({
          failed_transactions: data ?? [],
          failed_payments: failedPayments ?? [],
        });
      }

      case 'kyc_queue': {
        const { data, error } = await supabase
          .from('org_kyc_records')
          .select('*, organizations(name, subscription_tier)')
          .eq('status', 'pending_review')
          .order('submitted_at', { ascending: true });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ kyc_queue: data ?? [] });
      }

      case 'provider_status': {
        const { data, error } = await supabase
          .from('payment_provider_status')
          .select('*')
          .order('provider');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ providers: data ?? [] });
      }

      case 'fee_config': {
        const { data, error } = await supabase
          .from('escrow_fee_config')
          .select('*')
          .order('tier');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ fee_config: data ?? [] });
      }

      case 'payout_controls': {
        const { data, error } = await supabase
          .from('payout_controls')
          .select('*, organizations(name, subscription_tier)')
          .eq('is_paused', true)
          .order('paused_at', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ paused_orgs: data ?? [] });
      }

      default:
        return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
    }
  } catch (err) {
    console.error('Payments API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSystemAdmin(supabase, user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'review_kyc': {
        const { org_id, decision, notes } = body;
        if (!org_id || !decision) return NextResponse.json({ error: 'org_id and decision required' }, { status: 400 });
        if (!['approved', 'rejected'].includes(decision))
          return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 });

        const { data, error } = await supabase
          .from('org_kyc_records')
          .update({
            status: decision === 'approved' ? 'approved' : 'rejected',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_notes: notes,
          })
          .eq('org_id', org_id)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: `kyc_${decision}`,
          targetType: 'organization',
          targetId: String(org_id),
          afterState: { status: decision, notes },
          request,
        });

        return NextResponse.json({ kyc_record: data, success: true });
      }

      case 'update_fee_config': {
        const { tier, escrow_fee_pct, stablecoin_fee_pct, audit_report_fee_ngn } = body;
        const validTiers = ['starter', 'basic', 'pro', 'enterprise'];
        if (!tier || !validTiers.includes(tier))
          return NextResponse.json({ error: 'Valid tier required' }, { status: 400 });

        const { data, error } = await supabase
          .from('escrow_fee_config')
          .upsert({
            tier,
            escrow_fee_pct: parseFloat(escrow_fee_pct),
            stablecoin_fee_pct: parseFloat(stablecoin_fee_pct),
            audit_report_fee_ngn: parseFloat(audit_report_fee_ngn),
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'tier' })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'update_fee_config',
          targetType: 'escrow_fee_config',
          targetId: tier,
          afterState: { escrow_fee_pct, stablecoin_fee_pct, audit_report_fee_ngn },
          request,
        });

        return NextResponse.json({ fee_config: data, success: true });
      }

      case 'pause_payouts': {
        const { org_id, reason } = body;
        if (!org_id || !reason) return NextResponse.json({ error: 'org_id and reason required' }, { status: 400 });

        const { data, error } = await supabase
          .from('payout_controls')
          .upsert({
            org_id,
            is_paused: true,
            pause_reason: reason,
            paused_by: user.id,
            paused_at: new Date().toISOString(),
          }, { onConflict: 'org_id' })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'pause_payouts',
          targetType: 'organization',
          targetId: String(org_id),
          afterState: { reason },
          request,
        });

        return NextResponse.json({ payout_control: data, success: true });
      }

      case 'resume_payouts': {
        const { org_id } = body;
        if (!org_id) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

        const { data, error } = await supabase
          .from('payout_controls')
          .update({
            is_paused: false,
            resumed_by: user.id,
            resumed_at: new Date().toISOString(),
          })
          .eq('org_id', org_id)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'resume_payouts',
          targetType: 'organization',
          targetId: String(org_id),
          request,
        });

        return NextResponse.json({ payout_control: data, success: true });
      }

      case 'refresh_provider_status': {
        const { provider, status, error_message } = body;
        const validProviders = ['paystack', 'blockradar', 'circle', 'mtn_momo', 'opay', 'palmpay'];
        if (!provider || !validProviders.includes(provider))
          return NextResponse.json({ error: 'Valid provider required' }, { status: 400 });

        const { data, error } = await supabase
          .from('payment_provider_status')
          .upsert({
            provider,
            status: status ?? 'unknown',
            last_checked_at: new Date().toISOString(),
            last_success_at: status === 'operational' ? new Date().toISOString() : undefined,
            error_message: error_message ?? null,
          }, { onConflict: 'provider' })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ provider_status: data, success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Payments API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
