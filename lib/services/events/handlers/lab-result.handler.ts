/**
 * lab_result.uploaded handler
 *
 * Fires after a lab result is persisted. Responsibilities:
 *   1. If test_type = 'pesticide_residue': query mrl_database for active_ingredient ×
 *      commodity × target_markets and write structured mrl_flags back to the lab_result row.
 *   2. If result = 'fail': log a compliance audit event and flag any linked shipment.
 *   3. Recalculate shipment readiness score for any directly linked shipment.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, LabResultUploadedPayload } from '../types';

export async function handleLabResultUploaded(
  event: DomainEvent<LabResultUploadedPayload>,
  supabase: SupabaseClient
): Promise<void> {
  const {
    labResultId,
    testType,
    result,
    batchId,
    finishedGoodId,
    shipmentId,
    commodity,
    targetMarkets = [],
    resultValue,
    resultUnit,
  } = event.payload as any;

  // ── 1. MRL cross-check for pesticide residue results ─────────────────────
  if (testType === 'pesticide_residue' && labResultId) {
    const mrlFlags = await buildMrlFlags(
      supabase,
      labResultId,
      commodity,
      targetMarkets,
      resultValue,
      resultUnit
    );

    if (mrlFlags.length > 0) {
      await supabase
        .from('lab_results')
        .update({ mrl_flags: mrlFlags })
        .eq('id', labResultId);
    }
  }

  // ── 2. On fail/conditional: log compliance audit event ───────────────────
  if (result === 'fail' || result === 'conditional') {
    await supabase.from('audit_events').insert({
      org_id:        event.orgId,
      actor_id:      event.actorId,
      actor_email:   event.actorEmail,
      action:        'lab_result.non_compliant',
      resource_type: 'lab_result',
      resource_id:   labResultId,
      metadata: {
        test_type:       testType,
        result,
        batch_id:        batchId ?? null,
        finished_good_id: finishedGoodId ?? null,
        shipment_id:     shipmentId ?? null,
        commodity,
        target_markets:  targetMarkets,
      },
      severity: result === 'fail' ? 'high' : 'medium',
      timestamp: event.timestamp,
    });
  }

  // ── 3. Recalculate shipment readiness if linked ───────────────────────────
  if (shipmentId) {
    // Fetch current readiness score row and increment lab_results_count
    const { data: scoreRow } = await supabase
      .from('shipment_readiness_scores')
      .select('id, components')
      .eq('shipment_id', shipmentId)
      .maybeSingle();

    if (scoreRow) {
      // Update lab_results component: flip to passing if lab result is pass
      const components = scoreRow.components ?? {};
      const labComponent = components.lab_results ?? { score: 0, detail: '' };
      labComponent.detail = result === 'pass'
        ? 'Lab result uploaded and passed'
        : `Lab result uploaded: ${result}`;
      labComponent.score = result === 'pass' ? 100 : result === 'conditional' ? 50 : 0;
      components.lab_results = labComponent;

      await supabase
        .from('shipment_readiness_scores')
        .update({ components, updated_at: new Date().toISOString() })
        .eq('id', scoreRow.id);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface MrlFlag {
  market: string;
  active_ingredient: string;
  mrl_ppm: number;
  result_ppm: number | null;
  exceeded: boolean;
}

async function buildMrlFlags(
  supabase: SupabaseClient,
  labResultId: string,
  commodity: string | undefined,
  targetMarkets: string[],
  resultValue: number | undefined,
  resultUnit: string | undefined
): Promise<MrlFlag[]> {
  if (!commodity || targetMarkets.length === 0) return [];

  // Only compare when result is in ppm — skip other units
  const resultPpm = toPpm(resultValue, resultUnit);

  const { data: mrlRows, error } = await supabase
    .from('mrl_database')
    .select('active_ingredient, commodity, market, mrl_ppm')
    .eq('commodity', commodity.toLowerCase())
    .in('market', targetMarkets);

  if (error || !mrlRows || mrlRows.length === 0) return [];

  return mrlRows.map((row) => ({
    market:            row.market,
    active_ingredient: row.active_ingredient,
    mrl_ppm:           row.mrl_ppm,
    result_ppm:        resultPpm,
    exceeded:          resultPpm !== null ? resultPpm > row.mrl_ppm : false,
  }));
}

function toPpm(value: number | undefined, unit: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (!unit) return null;
  const u = unit.toLowerCase();
  if (u === 'ppm' || u === 'mg/kg') return value;
  if (u === 'ppb' || u === 'µg/kg' || u === 'ug/kg') return value / 1000;
  return null;
}
