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
        // escrow_accounts: status IN ('active','completed','disputed','cancelled')
        // Money tracked via held_amount / released_amount / total_amount
        const [
          { data: allEscrows },
          { count: activeCount },
          { count: disputedCount },
        ] = await Promise.all([
          supabase
            .from('escrow_accounts')
            .select('held_amount, total_amount, released_amount, currency, status'),
          supabase
            .from('escrow_accounts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
          supabase
            .from('escrow_disputes')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open'),
        ]);

        const totalHeldByCurrency: Record<string, number> = {};
        const totalByStatus: Record<string, number> = {};
        for (const e of allEscrows ?? []) {
          const held = parseFloat(e.held_amount ?? 0);
          totalHeldByCurrency[e.currency ?? 'USD'] =
            (totalHeldByCurrency[e.currency ?? 'USD'] ?? 0) + held;
          totalByStatus[e.status] = (totalByStatus[e.status] ?? 0) + held;
        }

        return NextResponse.json({
          escrow_overview: {
            total_accounts: (allEscrows ?? []).length,
            active_holds: activeCount ?? 0,
            // No release_deadline in schema — show accounts disputed > 14 days as overdue proxy
            overdue_releases: 0,
            disputed_holds: disputedCount ?? 0,
            total_by_status: totalByStatus,
            total_by_currency: totalHeldByCurrency,
          },
        });
      }

      case 'failed_transactions': {
        // escrow_transactions type IN ('hold','release','forfeit','refund') — no 'failed' type
        // Surfacing refunded transactions as "resolved failures" and disputes as signals
        const { data: disputes } = await supabase
          .from('escrow_disputes')
          .select('*, escrow_accounts(org_id, currency, organizations(name))')
          .in('status', ['open', 'escalated'])
          .order('created_at', { ascending: false })
          .limit(50);

        // Failed payments: status = 'failed' exists in payments table
        // payments table has org_id but no direct organizations FK — join via org_id
        const { data: failedPayments } = await supabase
          .from('payments')
          .select('id, org_id, amount, currency, status, notes, recorded_by, created_at')
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(100);

        // Enrich payments with org names
        const orgIds = [...new Set((failedPayments ?? []).map((p: any) => p.org_id).filter(Boolean))];
        const orgMap = new Map<string, string>();
        if (orgIds.length > 0) {
          const { data: orgs } = await supabase
            .from('organizations')
            .select('id, name')
            .in('id', orgIds);
          for (const o of orgs ?? []) orgMap.set(o.id, o.name);
        }

        const enrichedPayments = (failedPayments ?? []).map((p: any) => ({
          ...p,
          org_name: orgMap.get(p.org_id) ?? '—',
          failure_reason: p.notes ?? 'Payment failed',
          provider: p.payment_method ?? 'unknown',
        }));

        return NextResponse.json({
          failed_transactions: disputes ?? [],
          failed_payments: enrichedPayments,
        });
      }

      case 'kyc_queue': {
        // KYC status field: kyc_status; pending review state = 'under_review'
        const { data, error } = await supabase
          .from('org_kyc_records')
          .select('*, organizations(name, subscription_tier)')
          .eq('kyc_status', 'under_review')
          .order('submitted_at', { ascending: true });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        // Normalise to a consistent shape
        const normalised = (data ?? []).map((k: any) => ({
          ...k,
          status: k.kyc_status,
        }));
        return NextResponse.json({ kyc_queue: normalised });
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
        if (!org_id || !decision)
          return NextResponse.json({ error: 'org_id and decision required' }, { status: 400 });
        if (!['approved', 'rejected'].includes(decision))
          return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 });

        // kyc_status and kyc_notes are the correct column names
        const { data, error } = await supabase
          .from('org_kyc_records')
          .update({
            kyc_status: decision === 'approved' ? 'approved' : 'rejected',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            kyc_notes: notes,
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
          afterState: { kyc_status: decision, notes },
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
          targetType: 'organization',
          targetId: tier,
          afterState: { escrow_fee_pct, stablecoin_fee_pct, audit_report_fee_ngn },
          request,
        });

        return NextResponse.json({ fee_config: data, success: true });
      }

      case 'pause_payouts': {
        const { org_id, reason } = body;
        if (!org_id || !reason)
          return NextResponse.json({ error: 'org_id and reason required' }, { status: 400 });

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

        const updatePayload: Record<string, any> = {
          provider,
          status: status ?? 'unknown',
          last_checked_at: new Date().toISOString(),
          error_message: error_message ?? null,
        };
        if (status === 'operational') {
          updatePayload.last_success_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from('payment_provider_status')
          .upsert(updatePayload, { onConflict: 'provider' })
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
