import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';

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
      case 'revenue_dashboard': {
        const now = new Date();
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const [
          { data: paymentLinks },
          { data: escrowAccounts },
          { data: auditReportEvents },
          { data: orgs },
        ] = await Promise.all([
          supabase
            .from('payment_links')
            .select('amount_ngn, tier, status, billing_period, paid_at')
            .eq('status', 'paid')
            .gte('paid_at', twelveMonthsAgo.toISOString()),
          supabase
            .from('escrow_accounts')
            .select('amount, currency, created_at')
            .gte('created_at', twelveMonthsAgo.toISOString()),
          supabase
            .from('audit_events')
            .select('created_at')
            .eq('action', 'generate_audit_report')
            .gte('created_at', twelveMonthsAgo.toISOString()),
          supabase
            .from('organizations')
            .select('subscription_tier, subscription_status'),
        ]);

        // MRR by tier
        const mrrByTier: Record<string, number> = {};
        const mrrByMonth: Record<string, number> = {};
        for (const pl of paymentLinks ?? []) {
          const tier = pl.tier ?? 'unknown';
          const monthly = pl.billing_period === 'annual' ? pl.amount_ngn / 12 : pl.amount_ngn;
          mrrByTier[tier] = (mrrByTier[tier] ?? 0) + monthly;
          const month = (pl.paid_at ?? '').substring(0, 7);
          if (month) mrrByMonth[month] = (mrrByMonth[month] ?? 0) + monthly;
        }

        // GMV and escrow fee revenue estimate (using 1.25% average fee)
        const gmv = (escrowAccounts ?? []).reduce((sum: number, e: any) => sum + parseFloat(e.amount ?? 0), 0);
        const escrowFeeRevenue = gmv * 0.0125;

        // Audit report revenue estimate (5000 NGN average)
        const auditReportRevenue = (auditReportEvents ?? []).length * 5000;

        // Tenant breakdown by tier
        const activeTenantsByTier: Record<string, number> = {};
        for (const o of orgs ?? []) {
          if (o.subscription_status === 'active') {
            activeTenantsByTier[o.subscription_tier] = (activeTenantsByTier[o.subscription_tier] ?? 0) + 1;
          }
        }

        return NextResponse.json({
          revenue: {
            mrr_by_tier: mrrByTier,
            mrr_by_month: mrrByMonth,
            total_gmv_ngn: gmv,
            escrow_fee_revenue_ngn: escrowFeeRevenue,
            audit_report_revenue_ngn: auditReportRevenue,
            active_tenants_by_tier: activeTenantsByTier,
          },
        });
      }

      case 'mrl_flag_frequency': {
        const { data, error } = await supabase
          .from('farm_inputs')
          .select('active_ingredient, commodity, mrl_flag_market')
          .eq('mrl_flagged', true);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const freq: Record<string, { count: number; markets: string[]; commodities: string[] }> = {};
        for (const fi of data ?? []) {
          const key = fi.active_ingredient ?? 'unknown';
          if (!freq[key]) freq[key] = { count: 0, markets: [], commodities: [] };
          freq[key].count += 1;
          if (fi.mrl_flag_market && !freq[key].markets.includes(fi.mrl_flag_market))
            freq[key].markets.push(fi.mrl_flag_market);
          if (fi.commodity && !freq[key].commodities.includes(fi.commodity))
            freq[key].commodities.push(fi.commodity);
        }

        const ranked = Object.entries(freq)
          .map(([ingredient, v]) => ({ ingredient, ...v }))
          .sort((a, b) => b.count - a.count);

        return NextResponse.json({ mrl_flags: ranked });
      }

      case 'compliance_adoption': {
        const frameworks = ['EUDR', 'UK', 'US', 'GACC', 'UAE'];

        const [{ data: allOrgs }, { data: profiles }] = await Promise.all([
          supabase.from('organizations').select('id, subscription_tier').eq('subscription_status', 'active'),
          supabase
            .from('compliance_profiles')
            .select('org_id, target_markets, readiness_score, dds_submitted'),
        ]);

        const profileMap = new Map<string, any>();
        for (const p of profiles ?? []) profileMap.set(p.org_id, p);

        const total = (allOrgs ?? []).length;
        const adoption = frameworks.map((fw) => {
          const fwOrgs = (allOrgs ?? []).filter((o: any) => {
            const cp = profileMap.get(o.id);
            return cp?.target_markets?.includes(fw);
          });
          const configured = fwOrgs.length;
          const withDds = fwOrgs.filter((o: any) => {
            const cp = profileMap.get(o.id);
            return cp?.dds_submitted === true;
          }).length;

          return {
            framework: fw,
            total_orgs: total,
            configured_count: configured,
            configured_pct: total > 0 ? Math.round((configured / total) * 100) : 0,
            dds_submitted_count: withDds,
            dds_submitted_pct: configured > 0 ? Math.round((withDds / configured) * 100) : 0,
          };
        });

        return NextResponse.json({ adoption });
      }

      case 'escrow_adoption': {
        const { count: totalShipments } = await supabase
          .from('shipments')
          .select('*', { count: 'exact', head: true });

        const { count: escrowShipments } = await supabase
          .from('shipments')
          .select('*', { count: 'exact', head: true })
          .not('escrow_account_id', 'is', null);

        return NextResponse.json({
          escrow_adoption: {
            total_shipments: totalShipments ?? 0,
            escrow_enabled: escrowShipments ?? 0,
            adoption_pct: (totalShipments ?? 0) > 0
              ? Math.round(((escrowShipments ?? 0) / (totalShipments ?? 1)) * 100)
              : 0,
          },
        });
      }

      case 'rejection_patterns': {
        const { data, error } = await supabase
          .from('shipments')
          .select('rejection_reason, destination_country, commodity')
          .not('rejection_reason', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const freq: Record<string, { count: number; markets: string[] }> = {};
        for (const s of data ?? []) {
          const reason = s.rejection_reason ?? 'unspecified';
          if (!freq[reason]) freq[reason] = { count: 0, markets: [] };
          freq[reason].count += 1;
          if (s.destination_country && !freq[reason].markets.includes(s.destination_country))
            freq[reason].markets.push(s.destination_country);
        }

        const ranked = Object.entries(freq)
          .map(([reason, v]) => ({ reason, ...v }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

        return NextResponse.json({ rejection_patterns: ranked, total_rejections: (data ?? []).length });
      }

      default:
        return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
    }
  } catch (err) {
    console.error('Intelligence API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
