import { NextRequest, NextResponse } from 'next/server';
import { computeShipmentReadiness } from '@/lib/services/shipment-scoring';
import type { ShipmentScoreInput, ComplianceProfile } from '@/lib/services/shipment-scoring';
import type { FarmBoundaryAnalysis } from '@/lib/services/scoring/types';
import { normalizeBuyerRequirementKey } from '@/lib/compliance/buyer-profile';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { z } from 'zod';
import { emptyAsNull } from '@/lib/api/validation';
import { createServiceClient, getAuthenticatedProfile, checkTierAccess } from '@/lib/api-auth';
import type { Json, TablesInsert } from '@/lib/supabase/database.types';
import { requireRole, ROLES } from '@/lib/rbac';

const shipmentPatchSchema = z.object({
  // ── Original fields ────────────────────────────────────────────────────────
  status: z.string().optional(),
  destination_country: z.string().optional(),
  destination_port: z.string().optional(),
  buyer_company: z.string().optional(),
  buyer_contact: z.string().optional(),
  target_regulations: z.array(z.string()).optional(),
  notes: z.string().optional(),
  estimated_ship_date: z.string().optional(),
  doc_status: z.record(z.any()).optional(),
  storage_controls: z.record(z.any()).optional(),

  // ── Stage data (set by advance-stage endpoint; also patchable here) ────────
  stage_data: z.record(z.any()).optional(),

  // ── Freight & Vessel (Stage 5) ─────────────────────────────────────────────
  freight_forwarder_name: z.string().optional(),
  freight_forwarder_contact: z.string().optional(),
  shipping_line: z.string().optional(),
  vessel_name: z.string().optional(),
  imo_number: z.string().optional(),
  voyage_number: z.string().optional(),
  booking_reference: z.string().optional(),
  port_of_loading: z.string().optional(),
  port_of_discharge: z.string().optional(),
  etd: z.string().optional(),
  eta: z.string().optional(),
  actual_departure_date: z.string().optional(),
  actual_arrival_date: z.string().optional(),
  bill_of_lading_number: z.string().optional(),

  // ── Container (Stage 6) ────────────────────────────────────────────────────
  container_number: z.string().optional(),
  container_seal_number: z.string().optional(),
  container_type: z.enum(['20FT', '40FT', '40HC', 'Reefer']).optional(),

  // ── Customs & Clearance (Stage 4) ─────────────────────────────────────────
  clearing_agent_name: z.string().optional(),
  clearing_agent_contact: z.string().optional(),
  customs_declaration_number: z.string().optional(),
  exit_certificate_number: z.string().optional(),

  // ── Pre-shipment Inspection (Stage 2) ─────────────────────────────────────
  inspection_body: z.string().optional(),
  inspection_date: z.string().optional(),
  inspection_certificate_number: z.string().optional(),
  inspection_result: z.enum(['pass', 'fail', 'conditional']).optional(),

  // ── Commercial (Stage 1) ───────────────────────────────────────────────────
  purchase_order_number: z.string().optional(),
  purchase_order_date: z.string().optional(),
  contract_price_per_mt: emptyAsNull(z.number().nullable().optional()),
  total_shipment_value_usd: emptyAsNull(z.number().nullable().optional()),

  // ── Costs (entered at respective stages) ──────────────────────────────────
  freight_cost_usd: emptyAsNull(z.number().nullable().optional()),
  customs_fees_ngn: emptyAsNull(z.number().nullable().optional()),
  inspection_fees_ngn: emptyAsNull(z.number().nullable().optional()),
  phyto_lab_costs_ngn: emptyAsNull(z.number().nullable().optional()),
  certification_costs_ngn: emptyAsNull(z.number().nullable().optional()),
  port_handling_charges_ngn: emptyAsNull(z.number().nullable().optional()),
  freight_insurance_usd: emptyAsNull(z.number().nullable().optional()),
  usd_ngn_rate: emptyAsNull(z.number().positive().nullable().optional()),
  gross_weight_kg: emptyAsNull(z.number().nullable().optional()),

  // ── Outcome (Stage 9 close) ────────────────────────────────────────────────
  shipment_outcome: z.enum(['accepted', 'rejected', 'conditional']).optional(),
  rejection_reason: z.string().optional(),
  outcome_recorded_at: z.string().optional(),

  // ── Pre-notification status (all markets) ─────────────────────────────────
  prenotif_eu_traces: z.enum(['not_filed', 'filed', 'confirmed']).optional(),
  prenotif_eu_traces_ref: z.string().optional(),
  prenotif_uk_ipaffs: z.enum(['not_filed', 'filed', 'confirmed']).optional(),
  prenotif_uk_ipaffs_ref: z.string().optional(),
  prenotif_us_fda: z.enum(['not_filed', 'filed', 'confirmed']).optional(),
  prenotif_us_fda_ref: z.string().optional(),
  prenotif_cn_gacc: z.enum(['not_filed', 'filed', 'confirmed']).optional(),
  prenotif_cn_gacc_ref: z.string().optional(),
  prenotif_uae_esma: z.enum(['not_filed', 'filed', 'confirmed']).optional(),
  prenotif_uae_esma_ref: z.string().optional(),

  // ── Item management ────────────────────────────────────────────────────────
  add_items: z.array(z.object({
    item_type: z.enum(['batch', 'finished_good']),
    batch_id: emptyAsNull(z.number().nullable().optional()),
    finished_good_id: emptyAsNull(z.number().nullable().optional()),
  })).optional(),
  remove_items: z.array(z.number()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const roleError = requireRole(profile, ROLES.SHIPMENT_ROLES);
    if (roleError) return roleError;

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('shipment_items')
      .select('*')
      .eq('shipment_id', shipment.id)
      .eq('org_id', profile.org_id);

    if (itemsError) {
      console.error('Error fetching shipment items:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const itemsList = items || [];

    const batchIds = itemsList
      .filter((i: any) => i.item_type === 'batch' && i.batch_id)
      .map((i: any) => i.batch_id);
    const finishedGoodIds = itemsList
      .filter((i: any) => i.item_type === 'finished_good' && i.finished_good_id)
      .map((i: any) => i.finished_good_id);

    const batchMap = new Map<string, any>();
    const bagsByBatchId = new Map<string, any[]>();
    const fgMap = new Map<string, any>();
    const runMap = new Map<string, any>();

    const bulkBatchPromise = batchIds.length > 0
      ? supabase
          .from('collection_batches')
          .select('*, farm:farms(id, farmer_name, community, area_hectares, compliance_status, boundary)')
          .in('id', batchIds)
          .eq('org_id', profile.org_id)
      : Promise.resolve({ data: [] });

    // TODO(schema-drift): column 'farm_id' does not exist on 'bags' (bags link to a farm only
    // indirectly, via their collection_batch's farm_id) — removed from the select below since
    // selecting it fails the whole query. bags_with_farm_link below already tolerated a missing
    // farm_id (falls back to 0), so this preserves existing behavior while fixing the query.
    const bulkBagsPromise = batchIds.length > 0
      ? supabase
          .from('bags')
          .select('id, collection_batch_id')
          .in('collection_batch_id', batchIds)
          .eq('org_id', profile.org_id)
      : Promise.resolve({ data: [] });

    const bulkFgPromise = finishedGoodIds.length > 0
      ? supabase
          .from('finished_goods')
          .select('*')
          .in('id', finishedGoodIds)
          .eq('org_id', profile.org_id)
      : Promise.resolve({ data: [] });

    const complianceProfilePromise = shipment.compliance_profile_id
      ? supabase
          .from('compliance_profiles')
          .select('id, name, destination_market, regulation_framework, required_documents, required_certifications, geo_verification_level, min_traceability_depth, custom_rules')
          .eq('id', shipment.compliance_profile_id)
          .eq('org_id', profile.org_id)
          .single()
      : Promise.resolve({ data: null });

    const [
      { data: batchesData },
      { data: bagsData },
      { data: fgData },
      { data: allOutcomes },
      { data: coldChainData },
      { data: lots },
      { data: cpData },
      { data: shipmentDocuments },
      { data: shipmentLabResults },
    ] = await Promise.all([
      bulkBatchPromise,
      bulkBagsPromise,
      bulkFgPromise,
      supabase
        .from('shipment_outcomes')
        .select('outcome')
        .eq('org_id', profile.org_id),
      supabase
        .from('cold_chain_logs')
        .select('is_alert')
        .eq('shipment_id', shipment.id)
        .eq('org_id', profile.org_id),
      supabase
        .from('shipment_lots')
        .select('mass_balance_valid')
        .eq('shipment_id', shipment.id)
        .eq('org_id', profile.org_id),
      complianceProfilePromise,
      supabase
        .from('documents')
        .select('document_type, title, status')
        .eq('org_id', profile.org_id)
        .eq('linked_entity_type', 'shipment')
        .eq('linked_entity_id', shipment.id),
      supabase
        .from('lab_results')
        .select('result')
        .eq('org_id', profile.org_id)
        .eq('shipment_id', shipment.id),
    ]);

    for (const b of (batchesData || [])) {
      batchMap.set(String(b.id), b);
    }
    for (const bag of (bagsData || [])) {
      const key = String(bag.collection_batch_id);
      if (!bagsByBatchId.has(key)) bagsByBatchId.set(key, []);
      bagsByBatchId.get(key)!.push(bag);
    }
    for (const fg of (fgData || [])) {
      fgMap.set(String(fg.id), fg);
    }

    const processingRunIds = (fgData || [])
      .filter((fg: any) => fg.processing_run_id)
      .map((fg: any) => fg.processing_run_id);

    if (processingRunIds.length > 0) {
      const { data: runsData } = await supabase
        .from('processing_runs')
        .select('*')
        .in('id', processingRunIds);
      for (const run of (runsData || [])) {
        runMap.set(String(run.id), run);
      }
    }

    const enrichedItems = [];
    const scoreItems: ShipmentScoreInput['items'] = [];
    const farmIds: string[] = [];

    for (const item of itemsList) {
      let enrichedItem: any = { ...item };

      if (item.item_type === 'batch' && item.batch_id) {
        const batch = batchMap.get(String(item.batch_id));

        if (batch) {
          enrichedItem.batch_data = batch;
          const bags = bagsByBatchId.get(String(batch.id)) || [];
          const bagCount = bags.length;
          const linkedFarm = Array.isArray(batch.farm) ? batch.farm[0] : batch.farm;
          // Bags point to collection_batches; they do not have a farm_id of
          // their own. A bag is farm-linked when its parent batch resolves to
          // a tenant-scoped farm.
          const hasFarmLink = !!batch.farm_id && !!linkedFarm;
          const bagsWithFarmLink = hasFarmLink ? bagCount : 0;
          const hasGps = !!(linkedFarm?.boundary?.type === 'Polygon' && linkedFarm?.boundary?.coordinates?.[0]?.length >= 4);
          const derivedFarmCount = hasFarmLink ? 1 : 0;
          const derivedTraceabilityComplete = hasFarmLink && (bagCount === 0 || bagsWithFarmLink === bagCount);

          if (batch.farm_id) farmIds.push(String(batch.farm_id));

          scoreItems.push({
            item_type: 'batch',
            weight_kg: item.weight_kg || 0,
            farm_count: item.farm_count || derivedFarmCount,
            traceability_complete: item.traceability_complete || derivedTraceabilityComplete,
            compliance_status: item.compliance_status || 'pending',
            batch_data: {
              has_gps: hasGps,
              bag_count: batch.bag_count || bagCount,
              bags_with_farm_link: bagsWithFarmLink,
              dispatched: batch.status === 'dispatched' || batch.status === 'completed',
              yield_validated: !!batch.yield_validated,
            },
          });
        } else {
          scoreItems.push({
            item_type: item.item_type,
            weight_kg: item.weight_kg || 0,
            farm_count: item.farm_count || 0,
            traceability_complete: item.traceability_complete || false,
            compliance_status: item.compliance_status || 'pending',
          });
        }
      } else if (item.item_type === 'finished_good' && item.finished_good_id) {
        const finishedGood = fgMap.get(String(item.finished_good_id));

        if (finishedGood) {
          enrichedItem.finished_good_data = finishedGood;

          let processingRun = null;
          if (finishedGood.processing_run_id) {
            processingRun = runMap.get(String(finishedGood.processing_run_id)) || null;
            enrichedItem.processing_run_data = processingRun;
          }

          scoreItems.push({
            item_type: 'finished_good',
            weight_kg: item.weight_kg || 0,
            farm_count: item.farm_count || 0,
            traceability_complete: item.traceability_complete || false,
            compliance_status: item.compliance_status || 'pending',
            finished_good_data: {
              mass_balance_valid: !!finishedGood.mass_balance_valid,
              pedigree_verified: !!finishedGood.pedigree_verified,
              processing_run_complete: processingRun?.status === 'completed',
            },
          });
        } else {
          scoreItems.push({
            item_type: item.item_type,
            weight_kg: item.weight_kg || 0,
            farm_count: item.farm_count || 0,
            traceability_complete: item.traceability_complete || false,
            compliance_status: item.compliance_status || 'pending',
          });
        }
      } else {
        scoreItems.push({
          item_type: item.item_type,
          weight_kg: item.weight_kg || 0,
          farm_count: item.farm_count || 0,
          traceability_complete: item.traceability_complete || false,
          compliance_status: item.compliance_status || 'pending',
        });
      }

      enrichedItems.push(enrichedItem);
    }

    let historicalRejectionRate: number | undefined;
    if (allOutcomes && allOutcomes.length > 0) {
      const rejectedCount = allOutcomes.filter((o: any) => o.outcome === 'rejected').length;
      historicalRejectionRate = rejectedCount / allOutcomes.length;
    }

    const coldChainTotalEntries = coldChainData?.length || 0;
    const coldChainAlertCount = coldChainData?.filter((c: any) => c.is_alert).length || 0;

    let complianceProfile: ComplianceProfile | undefined;
    if (cpData) {
      complianceProfile = cpData as ComplianceProfile;
    }

    const uniqueFarmIds = [...new Set(farmIds)];
    let farmDeforestationChecks: Array<{ farm_id: string; deforestation_free: boolean; forest_loss_hectares: number; forest_loss_percentage: number; analysis_date: string; data_source: string; risk_level: 'low' | 'medium' | 'high' }> = [];
    let farmBoundaryAnalyses: FarmBoundaryAnalysis[] = [];

    if (uniqueFarmIds.length > 0) {
      const { data: farmsWithChecks } = await supabase
        .from('farms')
        .select('id, deforestation_check, boundary_analysis')
        .in('id', uniqueFarmIds)
        .eq('org_id', profile.org_id);

      if (farmsWithChecks) {
        farmDeforestationChecks = farmsWithChecks
          .filter((f: any) => f.deforestation_check)
          .map((f: any) => ({
            farm_id: String(f.id),
            ...f.deforestation_check,
          }));

        farmBoundaryAnalyses = farmsWithChecks
          .filter((f: any) => f.boundary_analysis)
          .map((f: any) => ({
            farm_id: String(f.id),
            confidence_score: f.boundary_analysis.confidence_score || 0,
            confidence_level: (f.boundary_analysis.confidence_level || 'low') as 'high' | 'medium' | 'low',
          }));
      }
    }

    const scoreItemsWithFarmIds = scoreItems.map((si, idx) => {
      const item = itemsList[idx];
      if (item?.item_type === 'batch' && item?.batch_id) {
        const batch = batchMap.get(String(item.batch_id));
        if (batch?.farm_id) {
          return { ...si, farm_ids: [String(batch.farm_id)] };
        }
      }
      return si;
    });

    const storedDocStatus = shipment.doc_status
      && typeof shipment.doc_status === 'object'
      && !Array.isArray(shipment.doc_status)
      ? Object.fromEntries(
          Object.entries(shipment.doc_status).filter(
            (entry): entry is [string, boolean] => typeof entry[1] === 'boolean'
          )
        )
      : {};
    const derivedDocStatus: Record<string, boolean> = { ...storedDocStatus };
    for (const document of shipmentDocuments || []) {
      if (document.status && document.status !== 'active') continue;
      derivedDocStatus[normalizeBuyerRequirementKey(document.document_type)] = true;
      derivedDocStatus[normalizeBuyerRequirementKey(document.title)] = true;
    }
    if ((shipmentLabResults || []).some((result) => result.result === 'pass')) {
      derivedDocStatus.lab_test_certificate = true;
    }

    const scoreInput: ShipmentScoreInput = {
      shipment: {
        id: shipment.id,
        destination_country: shipment.destination_country || null,
        target_regulations: shipment.target_regulations || [],
        doc_status: derivedDocStatus,
        storage_controls: ((shipment as unknown as Record<string, unknown>).storage_controls as Record<string, boolean> | undefined) || {},
        estimated_ship_date: shipment.estimated_ship_date || null,
      },
      items: scoreItemsWithFarmIds,
      historical_rejection_rate: historicalRejectionRate,
      cold_chain_alert_count: coldChainAlertCount,
      cold_chain_total_entries: coldChainTotalEntries,
      lot_count: lots?.length || 0,
      lots_with_valid_mass_balance: lots?.filter((l: any) => l.mass_balance_valid).length || 0,
      compliance_profile: complianceProfile,
      farm_deforestation_checks: farmDeforestationChecks,
      farm_boundary_analyses: farmBoundaryAnalyses,
    };

    console.info('[Shipment Traceability]', {
      shipment_id: shipment.id,
      batch_items: scoreItemsWithFarmIds.filter((item) => item.item_type === 'batch').length,
      linked_farms: uniqueFarmIds.length,
      linked_bags: scoreItemsWithFarmIds
        .filter((item) => item.item_type === 'batch')
        .reduce((sum, item) => sum + (item.batch_data?.bags_with_farm_link || 0), 0),
    });

    const readiness = computeShipmentReadiness(scoreInput);

    // Auto-persist score if null or shipment is recent (within 7 days = stale demo data)
    const isStale = !shipment.readiness_score ||
      (new Date().getTime() - new Date(shipment.created_at ?? 0).getTime() < 7 * 24 * 60 * 60 * 1000 &&
       shipment.readiness_score !== Math.round(readiness.overall_score));
    if (isStale) {
      supabase.from('shipments').update({
        readiness_score: Math.round(readiness.overall_score),
        readiness_decision: readiness.decision,
        risk_flags: readiness.risk_flags as unknown as Json,
        score_breakdown: readiness.dimensions as unknown as Json,
        updated_at: new Date().toISOString(),
      })
        .eq('id', shipment.id)
        .eq('org_id', profile.org_id)
        .then(() => {/* fire-and-forget */});
    }

    return NextResponse.json({
      shipment: {
        ...shipment,
        compliance_profile: cpData || null,
      },
      items: enrichedItems,
      readiness,
    });

  } catch (error) {
    console.error('Shipment detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const roleError = requireRole(profile, ROLES.SHIPMENT_ROLES);
    if (roleError) return roleError;

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: existingShipment, error: fetchError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (fetchError || !existingShipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const body = await request.json();

    const parsed = shipmentPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { add_items, remove_items, ...updateFields } = parsed.data;

    const allowedFields = [
      // Original fields
      'status', 'destination_country', 'destination_port', 'buyer_company',
      'buyer_contact', 'target_regulations', 'notes', 'estimated_ship_date',
      'doc_status', 'storage_controls',
      // Stage data
      'stage_data',
      // Freight & Vessel (Stage 5)
      'freight_forwarder_name', 'freight_forwarder_contact', 'shipping_line',
      'vessel_name', 'imo_number', 'voyage_number', 'booking_reference',
      'port_of_loading', 'port_of_discharge', 'etd', 'eta',
      'actual_departure_date', 'actual_arrival_date', 'bill_of_lading_number',
      // Container (Stage 6)
      'container_number', 'container_seal_number', 'container_type',
      // Customs & Clearance (Stage 4)
      'clearing_agent_name', 'clearing_agent_contact',
      'customs_declaration_number', 'exit_certificate_number',
      // Pre-shipment Inspection (Stage 2)
      'inspection_body', 'inspection_date', 'inspection_certificate_number', 'inspection_result',
      // Commercial (Stage 1)
      'purchase_order_number', 'purchase_order_date',
      'contract_price_per_mt', 'total_shipment_value_usd',
      // Costs
      'freight_cost_usd', 'customs_fees_ngn', 'inspection_fees_ngn',
      'certification_costs_ngn', 'port_handling_charges_ngn', 'freight_insurance_usd',
      // Outcome (Stage 9)
      'shipment_outcome', 'rejection_reason', 'outcome_recorded_at',
      // Pre-notifications
      'prenotif_eu_traces', 'prenotif_eu_traces_ref',
      'prenotif_uk_ipaffs', 'prenotif_uk_ipaffs_ref',
      'prenotif_us_fda', 'prenotif_us_fda_ref',
      'prenotif_cn_gacc', 'prenotif_cn_gacc_ref',
      'prenotif_uae_esma', 'prenotif_uae_esma_ref',
    ] as const;

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updateData[field] = updateFields[field];
      }
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('shipments')
        .update(updateData)
        .eq('id', id)
        .eq('org_id', profile.org_id);

      if (updateError) {
        console.error('Error updating shipment:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    if (add_items && Array.isArray(add_items) && add_items.length > 0) {
      for (const addItem of add_items) {
        const itemInsert: Record<string, any> = {
          shipment_id: id,
          item_type: addItem.item_type,
        };

        if (addItem.item_type === 'batch' && addItem.batch_id) {
          itemInsert.batch_id = addItem.batch_id;

          const { data: batch } = await supabase
            .from('collection_batches')
            .select('*, farm:farms(id, farmer_name, community)')
            .eq('id', String(addItem.batch_id))
            .eq('org_id', profile.org_id)
            .single();

          if (batch) {
            itemInsert.weight_kg = batch.total_weight || 0;
            itemInsert.farm_count = 1;
            itemInsert.traceability_complete = !!(batch.farm_id); // farm linked = traceability present
            itemInsert.compliance_status = batch.status === 'completed' ? 'approved' : 'pending';
          }
        } else if (addItem.item_type === 'finished_good' && addItem.finished_good_id) {
          itemInsert.finished_good_id = addItem.finished_good_id;

          const { data: fg } = await supabase
            .from('finished_goods')
            .select('*')
            .eq('id', String(addItem.finished_good_id))
            .single();

          if (fg) {
            itemInsert.weight_kg = fg.weight_kg || 0;
            // TODO(schema-drift): column 'farm_count' does not exist on 'finished_goods' — no
            // equivalent column exists, so this always falls back to 0 (same as before this
            // typed-client migration, when the property access was silently 'undefined').
            itemInsert.farm_count = ((fg as unknown as Record<string, unknown>).farm_count as number | undefined) || 0;
            itemInsert.traceability_complete = !!fg.pedigree_verified;
            itemInsert.compliance_status = fg.pedigree_verified ? 'approved' : 'pending';
          }
        }

        const { error: insertError } = await supabase
          .from('shipment_items')
          .insert(itemInsert as TablesInsert<'shipment_items'>);

        if (insertError) {
          console.error('Error adding shipment item:', insertError);
        }
      }

      await updateShipmentTotals(supabase, id, profile.org_id);
    }

    if (remove_items && Array.isArray(remove_items) && remove_items.length > 0) {
      const { error: deleteError } = await supabase
        .from('shipment_items')
        .delete()
        .in('id', remove_items.map(String))
        .eq('shipment_id', id)
        .eq('org_id', profile.org_id);

      if (deleteError) {
        console.error('Error removing shipment items:', deleteError);
      }

      await updateShipmentTotals(supabase, id, profile.org_id);
    }

    const { data: updatedShipment, error: refetchError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (refetchError) {
      console.error('Error refetching shipment:', refetchError);
      return NextResponse.json({ error: refetchError.message }, { status: 500 });
    }

    const { data: currentItems } = await supabase
      .from('shipment_items')
      .select('*')
      .eq('shipment_id', id)
      .eq('org_id', profile.org_id);

    let patchComplianceProfile: ComplianceProfile | undefined;
    if (updatedShipment.compliance_profile_id) {
      const { data: cpData } = await supabase
        .from('compliance_profiles')
        .select('id, name, destination_market, regulation_framework, required_documents, required_certifications, geo_verification_level, min_traceability_depth, custom_rules')
        .eq('id', updatedShipment.compliance_profile_id)
        .eq('org_id', profile.org_id)
        .single();
      if (cpData) {
        patchComplianceProfile = cpData as ComplianceProfile;
      }
    }

    const scoreInput: ShipmentScoreInput = {
      shipment: {
        id: updatedShipment.id,
        destination_country: updatedShipment.destination_country,
        target_regulations: updatedShipment.target_regulations || [],
        // TODO(schema-drift): columns 'doc_status' / 'storage_controls' do not exist on the
        // live 'shipments' table — see note above in GET.
        doc_status: ((updatedShipment as unknown as Record<string, unknown>).doc_status as Record<string, boolean> | undefined) || {},
        storage_controls: ((updatedShipment as unknown as Record<string, unknown>).storage_controls as Record<string, boolean> | undefined) || {},
        estimated_ship_date: updatedShipment.estimated_ship_date,
      },
      items: (currentItems || []).map((item: any) => ({
        item_type: item.item_type,
        weight_kg: item.weight_kg || 0,
        farm_count: item.farm_count || 0,
        traceability_complete: item.traceability_complete || false,
        compliance_status: item.compliance_status || 'unknown',
      })),
      compliance_profile: patchComplianceProfile,
    };

    const readinessResult = computeShipmentReadiness(scoreInput);

    await supabase
      .from('shipments')
      .update({
        readiness_score: Math.round(readinessResult.overall_score),
        readiness_decision: readinessResult.decision,
        risk_flags: readinessResult.risk_flags as unknown as Json,
        remediation_items: readinessResult.remediation_items,
        score_breakdown: readinessResult.dimensions as unknown as Json,
      })
      .eq('id', id)
      .eq('org_id', profile.org_id);

    dispatchWebhookEvent(String(profile.org_id), 'shipment.updated', {
      shipment_id: id,
      updated_fields: Object.keys(updateData),
      status: updatedShipment.status,
    });

    dispatchWebhookEvent(String(profile.org_id), 'shipment.scored', {
      shipment_id: id,
      readiness_score: Math.round(readinessResult.overall_score),
      decision: readinessResult.decision,
      risk_flags: readinessResult.risk_flags,
    });

    return NextResponse.json({ shipment: { ...updatedShipment, readiness_score: Math.round(readinessResult.overall_score), readiness_decision: readinessResult.decision }, success: true });

  } catch (error) {
    console.error('Shipment PATCH API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updateShipmentTotals(supabase: any, shipmentId: string, orgId: string) {
  const { data: allItems } = await supabase
    .from('shipment_items')
    .select('weight_kg')
    .eq('shipment_id', shipmentId)
    .eq('org_id', orgId);

  const totalWeight = (allItems || []).reduce((sum: number, i: any) => sum + (i.weight_kg || 0), 0);
  const totalItems = (allItems || []).length;

  await supabase
    .from('shipments')
    .update({ total_weight_kg: totalWeight, total_items: totalItems })
    .eq('id', shipmentId)
    .eq('org_id', orgId);
}
