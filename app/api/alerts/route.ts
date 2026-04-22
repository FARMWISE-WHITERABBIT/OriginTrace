import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';

/**
 * GET /api/alerts
 * Returns critical operational alerts for the org:
 * - Stale pending disbursements (>7 days unresolved)
 * - Shipments awaiting payment setup (>14 days)
 * - Low / unfunded escrow accounts
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const supabase = createAdminClient();
    const orgId = profile.org_id;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [disbursementsRes, shipmentsRes, escrowRes] = await Promise.allSettled([
      // Stale pending disbursements (pending or approved but older than 7 days)
      supabase
        .from('disbursement_calculations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('status', ['pending', 'approved'])
        .lt('created_at', sevenDaysAgo),

      // Shipments awaiting payment that haven't been acted on in 14 days
      supabase
        .from('shipments')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('payment_status', 'awaiting_payment')
        .lt('updated_at', fourteenDaysAgo),

      // Escrow accounts with < 10% of target funded (partially_funded or awaiting_payment)
      supabase
        .from('escrow_accounts')
        .select('id, amount_usd, funded_amount_usd, status')
        .eq('org_id', orgId)
        .in('status', ['awaiting_payment', 'partially_funded']),
    ]);

    const alerts: Array<{
      type: string;
      label: string;
      count: number;
      priority: 'high' | 'medium';
      href: string;
      action: string;
    }> = [];

    // Stale disbursements
    if (disbursementsRes.status === 'fulfilled' && !disbursementsRes.value.error) {
      const count = disbursementsRes.value.count ?? 0;
      if (count > 0) {
        alerts.push({
          type: 'stale_disbursements',
          label: `${count} disbursement${count !== 1 ? 's' : ''} pending for more than 7 days`,
          count,
          priority: count >= 5 ? 'high' : 'medium',
          href: '/app/payments?tab=disbursements',
          action: 'Process',
        });
      }
    }

    // Shipments awaiting payment
    if (shipmentsRes.status === 'fulfilled' && !shipmentsRes.value.error) {
      const count = shipmentsRes.value.count ?? 0;
      if (count > 0) {
        alerts.push({
          type: 'awaiting_payment_shipments',
          label: `${count} shipment${count !== 1 ? 's' : ''} awaiting buyer payment for over 14 days`,
          count,
          priority: 'medium',
          href: '/app/shipments',
          action: 'Follow up',
        });
      }
    }

    // Low-funded escrow
    if (escrowRes.status === 'fulfilled' && !escrowRes.value.error) {
      const accounts = escrowRes.value.data ?? [];
      const lowFunded = accounts.filter((a: any) => {
        const funded = Number(a.funded_amount_usd ?? 0);
        const target = Number(a.amount_usd ?? 0);
        return target > 0 && funded / target < 0.1;
      });
      if (lowFunded.length > 0) {
        alerts.push({
          type: 'low_escrow',
          label: `${lowFunded.length} escrow account${lowFunded.length !== 1 ? 's' : ''} less than 10% funded`,
          count: lowFunded.length,
          priority: 'high',
          href: '/app/payments?tab=receivables',
          action: 'Review',
        });
      }
    }

    return NextResponse.json({ alerts });
  } catch (err: any) {
    console.error('[alerts] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
