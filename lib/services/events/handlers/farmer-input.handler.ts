/**
 * Handler: farmer_input.recorded
 *
 * Cross-layer propagation when a pesticide/fertiliser input is recorded for a farm:
 * 1. Run MRL cross-reference check against the MRL database
 * 2. Set mrl_flag on the farmer_inputs record if any market limit is exceeded
 * 3. Update farm eligibility_status to 'conditional' if MRL exceeded
 * 4. Log audit event
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, FarmerInputRecordedPayload } from '../types';
import { logAuditEvent } from '@/lib/audit';

interface MrlRow {
  market: string;
  mrl_ppm: number;
}

export async function handleFarmerInputRecorded(
  event: DomainEvent<FarmerInputRecordedPayload>,
  supabase: SupabaseClient
): Promise<void> {
  const { inputId, farmId, activeIngredient, commodity, targetMarkets } = event.payload;

  if (!activeIngredient || !commodity || targetMarkets.length === 0) return;

  // Fetch MRL values for this ingredient + commodity across target markets
  const { data: mrlRows } = await supabase
    .from('mrl_database')
    .select('market, mrl_ppm')
    .eq('active_ingredient', activeIngredient.toLowerCase())
    .eq('commodity', commodity.toLowerCase())
    .in('market', targetMarkets);

  if (!mrlRows || mrlRows.length === 0) return;

  // Fetch the recorded quantity and area to estimate concentration
  const { data: input } = await supabase
    .from('farmer_inputs')
    .select('quantity, unit, area_applied_hectares, application_rate_per_ha')
    .eq('id', inputId)
    .single();

  if (!input) return;

  // Without lab test results we cannot compute exact residue ppm.
  // We flag the farm/input as needing lab verification when the active ingredient
  // is recorded against markets with low MRL thresholds (< 0.1 ppm).
  const lowMrlMarkets = (mrlRows as MrlRow[]).filter((r) => r.mrl_ppm < 0.1).map((r) => r.market);

  if (lowMrlMarkets.length > 0) {
    const mrlFlag = {
      activeIngredient,
      commodity,
      lowMrlMarkets,
      mrlValues: mrlRows,
      flaggedAt: event.timestamp,
      note: 'Lab test required — low MRL threshold detected for target markets',
    };

    // Update the farmer_inputs record with the flag
    await supabase
      .from('farmer_inputs')
      .update({ mrl_flag: mrlFlag })
      .eq('id', inputId);

    // Set farm eligibility to conditional pending lab test
    await supabase
      .from('farms')
      .update({ eligibility_status: 'conditional' })
      .eq('id', farmId);
  }

  await logAuditEvent({
    orgId: event.orgId,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    action: 'farmer_input.mrl_checked',
    resourceType: 'farmer_input',
    resourceId: inputId,
    metadata: {
      activeIngredient,
      commodity,
      targetMarkets,
      mrlRowsFound: mrlRows.length,
      lowMrlMarkets,
      flagSet: lowMrlMarkets.length > 0,
    },
  });
}
