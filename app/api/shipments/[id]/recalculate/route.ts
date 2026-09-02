import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import {
  computeShipmentReadiness,
  type ComplianceProfile,
  type ShipmentScoreInput,
} from '@/lib/services/shipment-scoring';
import { normalizeBuyerRequirementKey } from '@/lib/compliance/buyer-profile';
import { requireRole, ROLES } from '@/lib/rbac';
import type { Json } from '@/lib/supabase/database.types';

function booleanRecord(value: Json | null): Record<string, boolean> {
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => (
      typeof entry[1] === 'boolean'
    ))
  );
}

function hasPolygonBoundary(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const boundary = value as { type?: unknown; coordinates?: unknown };

  if (boundary.type === 'Polygon') {
    const rings = boundary.coordinates;
    return Array.isArray(rings) && Array.isArray(rings[0]) && rings[0].length >= 4;
  }

  if (boundary.type === 'MultiPolygon') {
    const polygons = boundary.coordinates;
    return Array.isArray(polygons) && polygons.some((polygon) => (
      Array.isArray(polygon) && Array.isArray(polygon[0]) && polygon[0].length >= 4
    ));
  }

  return false;
}

/**
 * POST /api/shipments/[id]/recalculate
 * Rebuilds readiness from persisted shipment, batch, bag, farm, document, and
 * laboratory evidence, then stores the computed result.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const roleError = requireRole(profile, ROLES.SHIPMENT_ROLES);
    if (roleError) return roleError;

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const { data: shipmentItems, error: shipmentItemsError } = await supabase
      .from('shipment_items')
      .select('*')
      .eq('shipment_id', shipment.id)
      .eq('org_id', profile.org_id);

    if (shipmentItemsError) {
      console.error('[recalculate] shipment items query failed', shipmentItemsError);
      return NextResponse.json({ error: 'Unable to read shipment traceability' }, { status: 500 });
    }

    const items = shipmentItems ?? [];
    const batchIds = items
      .filter((item) => item.item_type === 'batch' && item.batch_id)
      .map((item) => String(item.batch_id));
    const finishedGoodIds = items
      .filter((item) => item.item_type === 'finished_good' && item.finished_good_id)
      .map((item) => String(item.finished_good_id));

    const batchesQuery = batchIds.length > 0
      ? supabase
          .from('collection_batches')
          .select('*, farm:farms(id, compliance_status, boundary, deforestation_check, boundary_analysis)')
          .in('id', batchIds)
          .eq('org_id', profile.org_id)
      : Promise.resolve({ data: [], error: null });
    const bagsQuery = batchIds.length > 0
      ? supabase
          .from('bags')
          .select('id, collection_batch_id')
          .in('collection_batch_id', batchIds)
          .eq('org_id', profile.org_id)
      : Promise.resolve({ data: [], error: null });
    const finishedGoodsQuery = finishedGoodIds.length > 0
      ? supabase
          .from('finished_goods')
          .select('*')
          .in('id', finishedGoodIds)
          .eq('org_id', profile.org_id)
      : Promise.resolve({ data: [], error: null });
    const complianceProfileQuery = shipment.compliance_profile_id
      ? supabase
          .from('compliance_profiles')
          .select('id, name, destination_market, regulation_framework, required_documents, required_certifications, geo_verification_level, min_traceability_depth, custom_rules')
          .eq('id', shipment.compliance_profile_id)
          .eq('org_id', profile.org_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [
      batchesResult,
      bagsResult,
      finishedGoodsResult,
      outcomesResult,
      coldChainResult,
      lotsResult,
      profileResult,
      documentsResult,
      labResultsResult,
    ] = await Promise.all([
      batchesQuery,
      bagsQuery,
      finishedGoodsQuery,
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
      complianceProfileQuery,
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

    const readError = [
      batchesResult.error,
      bagsResult.error,
      finishedGoodsResult.error,
      outcomesResult.error,
      coldChainResult.error,
      lotsResult.error,
      profileResult.error,
      documentsResult.error,
      labResultsResult.error,
    ].find(Boolean);

    if (readError) {
      console.error('[recalculate] scoring evidence query failed', readError);
      return NextResponse.json({ error: 'Unable to read shipment evidence' }, { status: 500 });
    }

    if (shipment.compliance_profile_id && !profileResult.data) {
      return NextResponse.json(
        { error: 'Shipment compliance profile is missing or belongs to another organization' },
        { status: 409 }
      );
    }

    const batchMap = new Map((batchesResult.data ?? []).map((batch) => [String(batch.id), batch]));
    const bagsByBatchId = new Map<string, number>();
    for (const bag of bagsResult.data ?? []) {
      const batchId = String(bag.collection_batch_id);
      bagsByBatchId.set(batchId, (bagsByBatchId.get(batchId) ?? 0) + 1);
    }

    const finishedGoodMap = new Map(
      (finishedGoodsResult.data ?? []).map((finishedGood) => [String(finishedGood.id), finishedGood])
    );
    const processingRunIds = [...new Set(
      (finishedGoodsResult.data ?? [])
        .map((finishedGood) => finishedGood.processing_run_id)
        .filter((runId): runId is string => Boolean(runId))
    )];
    const processingRunsResult = processingRunIds.length > 0
      ? await supabase
          .from('processing_runs')
          .select('id, output_weight_kg, processed_at')
          .in('id', processingRunIds)
          .eq('org_id', profile.org_id)
      : { data: [], error: null };

    if (processingRunsResult.error) {
      console.error('[recalculate] processing runs query failed', processingRunsResult.error);
      return NextResponse.json({ error: 'Unable to read processing traceability' }, { status: 500 });
    }

    const processingRunMap = new Map(
      (processingRunsResult.data ?? []).map((run) => [String(run.id), run])
    );
    const linkedFarmIds = new Set<string>();
    const farmDeforestationChecks: NonNullable<ShipmentScoreInput['farm_deforestation_checks']> = [];
    const farmBoundaryAnalyses: NonNullable<ShipmentScoreInput['farm_boundary_analyses']> = [];

    const scoreItems: ShipmentScoreInput['items'] = items.map((item) => {
      if (item.item_type === 'batch' && item.batch_id) {
        const batch = batchMap.get(String(item.batch_id));
        if (!batch) {
          return {
            item_type: 'batch',
            weight_kg: item.weight_kg ?? 0,
            farm_count: 0,
            traceability_complete: false,
            compliance_status: item.compliance_status ?? 'pending',
          };
        }

        const linkedFarm = Array.isArray(batch.farm) ? batch.farm[0] : batch.farm;
        const farmId = batch.farm_id ? String(batch.farm_id) : null;
        const bagCount = bagsByBatchId.get(String(batch.id)) ?? 0;
        const hasFarmLink = Boolean(farmId && linkedFarm);

        if (farmId && linkedFarm) {
          linkedFarmIds.add(farmId);
          const deforestation = linkedFarm.deforestation_check;
          if (deforestation && typeof deforestation === 'object' && !Array.isArray(deforestation)) {
            farmDeforestationChecks.push({
              farm_id: farmId,
              deforestation_free: deforestation.deforestation_free === true,
              forest_loss_hectares: Number(deforestation.forest_loss_hectares ?? 0),
              forest_loss_percentage: Number(deforestation.forest_loss_percentage ?? 0),
              analysis_date: String(deforestation.analysis_date ?? ''),
              data_source: String(deforestation.data_source ?? 'unknown'),
              risk_level: ['low', 'medium', 'high'].includes(String(deforestation.risk_level))
                ? deforestation.risk_level as 'low' | 'medium' | 'high'
                : 'high',
            });
          }

          const boundaryAnalysis = linkedFarm.boundary_analysis;
          if (boundaryAnalysis && typeof boundaryAnalysis === 'object' && !Array.isArray(boundaryAnalysis)) {
            const confidenceLevel = String(boundaryAnalysis.confidence_level);
            farmBoundaryAnalyses.push({
              farm_id: farmId,
              confidence_score: Number(boundaryAnalysis.confidence_score ?? 0),
              confidence_level: ['high', 'medium', 'low'].includes(confidenceLevel)
                ? confidenceLevel as 'high' | 'medium' | 'low'
                : 'low',
            });
          }
        }

        return {
          item_type: 'batch',
          weight_kg: item.weight_kg ?? 0,
          farm_count: hasFarmLink ? 1 : 0,
          traceability_complete: hasFarmLink && bagCount > 0,
          compliance_status: item.compliance_status ?? linkedFarm?.compliance_status ?? 'pending',
          farm_ids: farmId && linkedFarm ? [farmId] : [],
          batch_data: {
            has_gps: hasPolygonBoundary(linkedFarm?.boundary),
            bag_count: bagCount,
            bags_with_farm_link: hasFarmLink ? bagCount : 0,
            dispatched: batch.status === 'dispatched' || batch.status === 'completed',
            yield_validated: Boolean(batch.yield_validated),
          },
        };
      }

      if (item.item_type === 'finished_good' && item.finished_good_id) {
        const finishedGood = finishedGoodMap.get(String(item.finished_good_id));
        const processingRun = finishedGood?.processing_run_id
          ? processingRunMap.get(String(finishedGood.processing_run_id))
          : null;

        return {
          item_type: 'finished_good',
          weight_kg: item.weight_kg ?? 0,
          farm_count: item.farm_count ?? 0,
          traceability_complete: item.traceability_complete === true,
          compliance_status: item.compliance_status ?? 'pending',
          finished_good_data: finishedGood
            ? {
                mass_balance_valid: Boolean(finishedGood.mass_balance_valid),
                pedigree_verified: Boolean(finishedGood.pedigree_verified),
                processing_run_complete: Boolean(
                  processingRun?.processed_at && processingRun.output_weight_kg !== null
                ),
              }
            : undefined,
        };
      }

      return {
        item_type: item.item_type,
        weight_kg: item.weight_kg ?? 0,
        farm_count: item.farm_count ?? 0,
        traceability_complete: item.traceability_complete === true,
        compliance_status: item.compliance_status ?? 'pending',
      };
    });

    const docStatus = booleanRecord(shipment.doc_status);
    for (const document of documentsResult.data ?? []) {
      if (document.status && document.status !== 'active') continue;
      docStatus[normalizeBuyerRequirementKey(document.document_type)] = true;
      docStatus[normalizeBuyerRequirementKey(document.title)] = true;
    }
    if ((labResultsResult.data ?? []).some((result) => result.result === 'pass')) {
      docStatus.lab_test_certificate = true;
    }

    const outcomes = outcomesResult.data ?? [];
    const historicalRejectionRate = outcomes.length > 0
      ? outcomes.filter((outcome) => outcome.outcome === 'rejected').length / outcomes.length
      : 0;
    const coldChainLogs = coldChainResult.data ?? [];
    const lots = lotsResult.data ?? [];

    const scoreInput: ShipmentScoreInput = {
      shipment: {
        id: shipment.id,
        destination_country: shipment.destination_country,
        target_regulations: shipment.target_regulations ?? [],
        doc_status: docStatus,
        storage_controls: booleanRecord(shipment.storage_controls),
        estimated_ship_date: shipment.estimated_ship_date,
      },
      items: scoreItems,
      historical_rejection_rate: historicalRejectionRate,
      cold_chain_alert_count: coldChainLogs.filter((entry) => entry.is_alert).length,
      cold_chain_total_entries: coldChainLogs.length,
      lot_count: lots.length,
      lots_with_valid_mass_balance: lots.filter((lot) => lot.mass_balance_valid).length,
      compliance_profile: profileResult.data as ComplianceProfile | undefined,
      farm_deforestation_checks: farmDeforestationChecks,
      farm_boundary_analyses: farmBoundaryAnalyses,
    };

    console.info('[recalculate] shipment evidence loaded', {
      shipment_id: shipment.id,
      item_count: scoreItems.length,
      batch_count: scoreItems.filter((item) => item.item_type === 'batch').length,
      bag_count: scoreItems.reduce((sum, item) => sum + (item.batch_data?.bag_count ?? 0), 0),
      farm_count: linkedFarmIds.size,
      document_count: documentsResult.data?.length ?? 0,
      lab_result_count: labResultsResult.data?.length ?? 0,
    });

    const readiness = computeShipmentReadiness(scoreInput);
    const { data: updated, error: updateError } = await supabase
      .from('shipments')
      .update({
        readiness_score: Math.round(readiness.overall_score),
        readiness_decision: readiness.decision,
        risk_flags: readiness.risk_flags as unknown as Json,
        score_breakdown: readiness.dimensions as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipment.id)
      .eq('org_id', profile.org_id)
      .select()
      .maybeSingle();

    if (updateError || !updated) {
      console.error('[recalculate] score persistence failed', updateError);
      return NextResponse.json({ error: 'Unable to persist shipment readiness' }, { status: 500 });
    }

    return NextResponse.json({ readiness, shipment: updated });
  } catch (error) {
    console.error('[recalculate]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
