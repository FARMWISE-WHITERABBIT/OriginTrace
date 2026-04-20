/**
 * GET /api/shipments/[id]/cost-summary
 *
 * Returns the full cost breakdown and calculated net margin for a shipment.
 * NGN-denominated costs are converted to USD using the shipment's stored
 * usd_ngn_rate (or a fallback default if not yet set).
 *
 * Roles: admin, logistics_coordinator, compliance_officer
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

const ALLOWED_ROLES = ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer'];

// Fallback rate used only when shipment has no stored rate yet.
// Exporter should set their own rate on the shipment for reproducibility.
const FALLBACK_USD_NGN_RATE = 1650;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    let shipment: any = null;
    const { data: shipmentFull, error: shipmentErr } = await supabase
      .from('shipments')
      .select(`
        id, shipment_code, total_weight_kg,
        total_shipment_value_usd,
        contract_price_per_mt,
        freight_cost_usd,
        customs_fees_ngn,
        inspection_fees_ngn,
        phyto_lab_costs_ngn,
        certification_costs_ngn,
        port_handling_charges_ngn,
        freight_insurance_usd,
        usd_ngn_rate
      `)
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentErr?.code === '42703' || shipmentErr?.message?.includes('column')) {
      // Cost columns not yet migrated — return base record with zeroed costs
      const { data: base } = await supabase
        .from('shipments')
        .select('id, shipment_code, total_weight_kg')
        .eq('id', params.id)
        .eq('org_id', profile.org_id)
        .single();
      shipment = base;
    } else {
      shipment = shipmentFull;
    }

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // Sum farmer payments linked to batches on this shipment
    // Payments reference batches via linked_entity_type='collection_batch' and
    // the batch is linked to this shipment via shipment_items → shipment_id
    const { data: shipmentItems } = await supabase
      .from('shipment_items')
      .select('batch_id')
      .eq('shipment_id', params.id)
      .not('batch_id', 'is', null);

    const batchIds = (shipmentItems ?? [])
      .map((i: any) => i.batch_id)
      .filter(Boolean);

    let farmerPaymentsNgn = 0;
    let farmerPaymentsUsd = 0;
    let farmerPaymentCount = 0;

    if (batchIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, currency, status')
        .in('linked_entity_id', batchIds)
        .eq('linked_entity_type', 'collection_batch')
        .eq('status', 'completed');

      for (const p of payments ?? []) {
        farmerPaymentCount++;
        if (p.currency === 'NGN') {
          farmerPaymentsNgn += Number(p.amount);
        } else if (p.currency === 'USD') {
          farmerPaymentsUsd += Number(p.amount);
        }
      }
    }

    const rate = Number(shipment.usd_ngn_rate) || FALLBACK_USD_NGN_RATE;
    const usingFallbackRate = !shipment.usd_ngn_rate;

    // ── Convert NGN costs to USD ──────────────────────────────────────────────
    const customsFeesUsd = (Number(shipment.customs_fees_ngn) || 0) / rate;
    const inspectionFeesUsd = (Number(shipment.inspection_fees_ngn) || 0) / rate;
    const phytoLabCostsUsd = (Number(shipment.phyto_lab_costs_ngn) || 0) / rate;
    const certificationCostsUsd = (Number(shipment.certification_costs_ngn) || 0) / rate;
    const portHandlingUsd = (Number(shipment.port_handling_charges_ngn) || 0) / rate;

    // ── USD costs ─────────────────────────────────────────────────────────────
    const freightCostUsd = Number(shipment.freight_cost_usd) || 0;
    const freightInsuranceUsd = Number(shipment.freight_insurance_usd) || 0;

    // ── Totals ────────────────────────────────────────────────────────────────
    const shipmentValueUsd = Number(shipment.total_shipment_value_usd) || 0;

    const totalCostsUsd =
      freightCostUsd +
      portHandlingUsd +
      customsFeesUsd +
      inspectionFeesUsd +
      phytoLabCostsUsd +
      certificationCostsUsd +
      freightInsuranceUsd;

    const netToExporterUsd = shipmentValueUsd - totalCostsUsd;
    const marginPct = shipmentValueUsd > 0
      ? (netToExporterUsd / shipmentValueUsd) * 100
      : null;

    const farmerPaymentsTotalUsd = farmerPaymentsUsd + farmerPaymentsNgn / rate;
    const companyProfitUsd = netToExporterUsd - farmerPaymentsTotalUsd;

    return NextResponse.json({
      shipment_id: params.id,
      shipment_code: shipment.shipment_code,
      usd_ngn_rate: rate,
      using_fallback_rate: usingFallbackRate,

      // Raw stored values (for the edit form)
      raw: {
        total_shipment_value_usd: shipment.total_shipment_value_usd,
        freight_cost_usd: shipment.freight_cost_usd,
        port_handling_charges_ngn: shipment.port_handling_charges_ngn,
        customs_fees_ngn: shipment.customs_fees_ngn,
        inspection_fees_ngn: shipment.inspection_fees_ngn,
        phyto_lab_costs_ngn: shipment.phyto_lab_costs_ngn,
        certification_costs_ngn: shipment.certification_costs_ngn,
        freight_insurance_usd: shipment.freight_insurance_usd,
      },

      // USD-normalised line items (for display)
      lines: {
        shipment_value_usd: shipmentValueUsd,
        freight_cost_usd: freightCostUsd,
        port_handling_usd: portHandlingUsd,
        customs_fees_usd: customsFeesUsd,
        inspection_fees_usd: inspectionFeesUsd,
        phyto_lab_costs_usd: phytoLabCostsUsd,
        certification_costs_usd: certificationCostsUsd,
        freight_insurance_usd: freightInsuranceUsd,
      },

      // Computed summary
      total_costs_usd: totalCostsUsd,
      net_to_exporter_usd: netToExporterUsd,
      margin_pct: marginPct !== null ? Math.round(marginPct * 10) / 10 : null,

      // Farmer payments (from payments table)
      farmer_payments: {
        total_usd: farmerPaymentsTotalUsd,
        ngn_component: farmerPaymentsNgn,
        usd_component: farmerPaymentsUsd,
        payment_count: farmerPaymentCount,
      },

      company_profit_usd: companyProfitUsd,
    });
  } catch (error) {
    console.error('Cost summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
