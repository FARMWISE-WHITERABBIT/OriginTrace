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
            .select('held_amount, total_amount, currency, created_at')
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

        // MRR by tier (12-month total / 12 for monthly average)
        const mrrByTier: Record<string, number> = {};
        const mrrByMonth: Record<string, number> = {};
        for (const pl of paymentLinks ?? []) {
          const tier = pl.tier ?? 'unknown';
          const monthly =
            pl.billing_period === 'annual'
              ? pl.amount_ngn / 12
              : pl.amount_ngn;
          mrrByTier[tier] = (mrrByTier[tier] ?? 0) + monthly;
          const month = (pl.paid_at ?? '').substring(0, 7);
          if (month) mrrByMonth[month] = (mrrByMonth[month] ?? 0) + monthly;
        }

        // GMV from escrow total_amount (USD/EUR/GBP typically)
        const gmvByAccount = (escrowAccounts ?? []).reduce(
          (sum: number, e: any) => sum + parseFloat(e.total_amount ?? 0),
          0
        );
        // Estimate NGN equivalent at ~1500/USD for display purposes
        const gmvNgn = gmvByAccount * 1500;
        const escrowFeeRevenue = gmvNgn * 0.0125; // ~1.25% average

        const auditReportRevenue = (auditReportEvents ?? []).length * 5000;

        const activeTenantsByTier: Record<string, number> = {};
        for (const o of orgs ?? []) {
          if (o.subscription_status === 'active') {
            activeTenantsByTier[o.subscription_tier] =
              (activeTenantsByTier[o.subscription_tier] ?? 0) + 1;
          }
        }

        return NextResponse.json({
          revenue: {
            mrr_by_tier: mrrByTier,
            mrr_by_month: mrrByMonth,
            total_gmv_ngn: gmvNgn,
            escrow_fee_revenue_ngn: escrowFeeRevenue,
            audit_report_revenue_ngn: auditReportRevenue,
            active_tenants_by_tier: activeTenantsByTier,
          },
        });
      }

      case 'mrl_flag_frequency': {
        // farmer_inputs table (NOT farm_inputs)
        // mrl_flag is a JSONB column: { market, mrl_ppm, estimated_ppm, exceeded, checked_at }
        // active_ingredient is a TEXT column added by migration
        const { data, error } = await supabase
          .from('farmer_inputs')
          .select('active_ingredient, commodity, mrl_flag')
          .not('mrl_flag', 'is', null);

        if (error) {
          // Table may not exist in all environments — return empty gracefully
          console.error('farmer_inputs query error:', error.message);
          return NextResponse.json({ mrl_flags: [] });
        }

        const freq: Record<string, { count: number; markets: string[]; commodities: string[] }> = {};
        for (const fi of data ?? []) {
          const key = fi.active_ingredient ?? 'unknown';
          if (!freq[key]) freq[key] = { count: 0, markets: [], commodities: [] };
          freq[key].count += 1;

          // Parse JSONB mrl_flag for market info
          const flag = fi.mrl_flag as any;
          const market = flag?.market;
          if (market && !freq[key].markets.includes(market)) {
            freq[key].markets.push(market);
          }

          const commodity = fi.commodity;
          if (commodity && !freq[key].commodities.includes(commodity)) {
            freq[key].commodities.push(commodity);
          }
        }

        const ranked = Object.entries(freq)
          .map(([ingredient, v]) => ({ ingredient, ...v }))
          .sort((a, b) => b.count - a.count);

        return NextResponse.json({ mrl_flags: ranked });
      }

      case 'compliance_adoption': {
        // compliance_profiles: has regulation_framework (singular), not target_markets[]
        // No dds_submitted column — use submission_health_log as proxy
        const [{ data: allOrgs }, { data: profiles }, { data: submissions }] = await Promise.all([
          supabase
            .from('organizations')
            .select('id, subscription_tier')
            .eq('subscription_status', 'active'),
          supabase
            .from('compliance_profiles')
            .select('org_id, regulation_framework'),
          supabase
            .from('submission_health_log')
            .select('org_id, framework, status')
            .eq('status', 'confirmed'),
        ]);

        const total = (allOrgs ?? []).length;

        // Map org_id → set of frameworks they have profiles for
        const orgFrameworks = new Map<string, Set<string>>();
        for (const p of profiles ?? []) {
          const s = orgFrameworks.get(p.org_id) ?? new Set();
          if (p.regulation_framework) s.add(p.regulation_framework);
          orgFrameworks.set(p.org_id, s);
        }

        // Orgs that have at least one confirmed submission per integration
        const submittedOrgs = new Map<string, Set<string>>();
        for (const s of submissions ?? []) {
          const set = submittedOrgs.get(s.org_id) ?? new Set();
          set.add(s.framework);
          submittedOrgs.set(s.org_id, set);
        }

        // Map compliance frameworks to their submission health_log framework names
        const frameworkToSubmission: Record<string, string> = {
          EUDR: 'EU_TRACES',
          UK_Environment_Act: 'IPAFFS',
          FSMA_204: 'FDA_PRIOR_NOTICE',
          Lacey_Act_UFLPA: 'FDA_PRIOR_NOTICE',
        };

        const displayFrameworks = ['EUDR', 'FSMA_204', 'UK_Environment_Act', 'China_Green_Trade', 'UAE_Halal'];

        const adoption = displayFrameworks.map((fw) => {
          const configuredOrgs = (allOrgs ?? []).filter((o: any) => {
            const fws = orgFrameworks.get(o.id);
            return fws?.has(fw);
          });
          const configured = configuredOrgs.length;

          const submissionFw = frameworkToSubmission[fw];
          const withSubmission = submissionFw
            ? configuredOrgs.filter((o: any) => submittedOrgs.get(o.id)?.has(submissionFw)).length
            : 0;

          const displayLabel =
            fw === 'EUDR' ? 'EUDR' :
            fw === 'FSMA_204' ? 'US' :
            fw === 'UK_Environment_Act' ? 'UK' :
            fw === 'China_Green_Trade' ? 'GACC' :
            fw === 'UAE_Halal' ? 'UAE' : fw;

          return {
            framework: displayLabel,
            total_orgs: total,
            configured_count: configured,
            configured_pct: total > 0 ? Math.round((configured / total) * 100) : 0,
            dds_submitted_count: withSubmission,
            dds_submitted_pct:
              configured > 0 ? Math.round((withSubmission / configured) * 100) : 0,
          };
        });

        return NextResponse.json({ adoption });
      }

      case 'escrow_adoption': {
        // shipments does NOT have escrow_account_id
        // Instead, escrow_accounts has shipment_id → count distinct shipments with escrows
        const [{ count: totalShipments }, { data: escrowedShipments }] = await Promise.all([
          supabase.from('shipments').select('*', { count: 'exact', head: true }),
          supabase
            .from('escrow_accounts')
            .select('shipment_id')
            .not('shipment_id', 'is', null),
        ]);

        const uniqueEscrowedShipments = new Set(
          (escrowedShipments ?? []).map((e: any) => e.shipment_id)
        ).size;

        return NextResponse.json({
          escrow_adoption: {
            total_shipments: totalShipments ?? 0,
            escrow_enabled: uniqueEscrowedShipments,
            adoption_pct:
              (totalShipments ?? 0) > 0
                ? Math.round((uniqueEscrowedShipments / (totalShipments ?? 1)) * 100)
                : 0,
          },
        });
      }

      case 'rejection_patterns': {
        // shipments.rejection_reason added by 20260402_shipment_logistics_fields migration
        const { data, error } = await supabase
          .from('shipments')
          .select('rejection_reason, destination_country')
          .not('rejection_reason', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const freq: Record<string, { count: number; markets: string[] }> = {};
        for (const s of data ?? []) {
          const reason = s.rejection_reason ?? 'unspecified';
          if (!freq[reason]) freq[reason] = { count: 0, markets: [] };
          freq[reason].count += 1;
          if (
            s.destination_country &&
            !freq[reason].markets.includes(s.destination_country)
          ) {
            freq[reason].markets.push(s.destination_country);
          }
        }

        const ranked = Object.entries(freq)
          .map(([reason, v]) => ({ reason, ...v }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

        return NextResponse.json({
          rejection_patterns: ranked,
          total_rejections: (data ?? []).length,
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
    }
  } catch (err) {
    console.error('Intelligence API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
