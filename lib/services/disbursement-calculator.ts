/**
 * Disbursement calculator service.
 *
 * When a batch is dispatched (or on-demand via API), this service:
 * 1. Reads batch_contributions (which farm contributed how much weight)
 * 2. Looks up the applicable price agreement per farm + commodity
 * 3. Computes gross/net amounts and inserts disbursement_calculations rows
 *
 * Price agreement priority:
 *   farm-specific agreement (effective for today) > org-wide commodity agreement > 0 (flagged)
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface DisbursementCalculation {
  id: string;
  org_id: string;
  batch_id: number;
  farm_id: number;
  farmer_name: string;
  community: string | null;
  weight_kg: number;
  price_per_kg: number;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'disbursed' | 'failed';
  payment_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComputeResult {
  calculations: DisbursementCalculation[];
  /** Farm IDs that had no price agreement — amounts are 0 and need manual review */
  missingPrices: Array<{ farm_id: number; farmer_name: string }>;
  /** How many rows already existed (idempotent — won't double-insert) */
  existingCount: number;
}

/**
 * Compute and persist disbursement calculations for a batch.
 * Safe to call multiple times — skips farms that already have a calculation row.
 */
export async function computeBatchDisbursements(
  batchId: number,
  orgId: string
): Promise<ComputeResult> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch the batch to get the commodity
  const { data: batch, error: batchErr } = await supabase
    .from('collection_batches')
    .select('id, commodity, org_id')
    .eq('id', batchId)
    .eq('org_id', orgId)
    .single();

  if (batchErr || !batch) {
    throw new Error(`Batch ${batchId} not found for org ${orgId}`);
  }

  const commodity = batch.commodity ?? 'unknown';

  // 2. Fetch contributions for this batch
  const { data: contributions, error: contribErr } = await supabase
    .from('batch_contributions')
    .select('id, farm_id, farmer_name, weight_kg, community:farms!farm_id(community)')
    .eq('batch_id', batchId);

  if (contribErr) throw new Error(`Failed to fetch contributions: ${contribErr.message}`);
  if (!contributions || contributions.length === 0) {
    return { calculations: [], missingPrices: [], existingCount: 0 };
  }

  // 3. Check which farms already have disbursement rows (idempotency)
  const farmIds = contributions.map((c) => c.farm_id);
  const { data: existing } = await supabase
    .from('disbursement_calculations')
    .select('farm_id')
    .eq('batch_id', batchId)
    .eq('org_id', orgId)
    .in('farm_id', farmIds);

  const existingFarmIds = new Set((existing ?? []).map((e) => e.farm_id));
  const toCompute = contributions.filter((c) => !existingFarmIds.has(c.farm_id));
  const existingCount = contributions.length - toCompute.length;

  if (toCompute.length === 0) {
    // All already computed — return existing rows
    const { data: existingRows } = await supabase
      .from('disbursement_calculations')
      .select('*')
      .eq('batch_id', batchId)
      .eq('org_id', orgId);
    return { calculations: (existingRows ?? []) as DisbursementCalculation[], missingPrices: [], existingCount };
  }

  // 4. Fetch all applicable price agreements for this org + commodity
  //    Get both farm-specific and org-wide agreements
  const { data: priceAgreements } = await supabase
    .from('farmer_price_agreements')
    .select('farm_id, price_per_kg, currency, effective_from, effective_to')
    .eq('org_id', orgId)
    .eq('commodity', commodity)
    .lte('effective_from', today)
    .or('effective_to.is.null,effective_to.gte.' + today)
    .order('effective_from', { ascending: false });

  const agreements = priceAgreements ?? [];

  // Build lookup: farm_id -> price (farm-specific preferred over org-wide)
  const priceMap = new Map<number | null, { price: number; currency: string }>();
  // Insert org-wide (farm_id=null) first, then farm-specific will overwrite
  for (const a of agreements.filter((x) => x.farm_id === null)) {
    priceMap.set(null, { price: Number(a.price_per_kg), currency: a.currency });
  }
  for (const a of agreements.filter((x) => x.farm_id !== null)) {
    priceMap.set(a.farm_id, { price: Number(a.price_per_kg), currency: a.currency });
  }

  const orgWidePrice = priceMap.get(null);

  // 5. Build insert rows
  const missingPrices: Array<{ farm_id: number; farmer_name: string }> = [];
  const insertRows = toCompute.map((c) => {
    const farmPrice = priceMap.get(c.farm_id) ?? orgWidePrice;
    const pricePerKg = farmPrice?.price ?? 0;
    const currency = farmPrice?.currency ?? 'NGN';
    const weightKg = Number(c.weight_kg) || 0;
    const grossAmount = Math.round(weightKg * pricePerKg * 100) / 100;
    const netAmount = grossAmount; // deductions = 0 initially

    const communityVal = Array.isArray(c.community)
      ? (c.community[0] as any)?.community ?? null
      : (c.community as any)?.community ?? null;

    if (pricePerKg === 0) {
      missingPrices.push({ farm_id: c.farm_id, farmer_name: c.farmer_name ?? 'Unknown' });
    }

    return {
      org_id: orgId,
      batch_id: batchId,
      farm_id: c.farm_id,
      farmer_name: c.farmer_name ?? 'Unknown',
      community: communityVal,
      weight_kg: weightKg,
      price_per_kg: pricePerKg,
      gross_amount: grossAmount,
      deductions: 0,
      net_amount: netAmount,
      currency,
      status: 'pending',
      notes: pricePerKg === 0 ? 'No price agreement found — manual review required' : null,
    };
  });

  // 6. Insert
  const { data: inserted, error: insertErr } = await supabase
    .from('disbursement_calculations')
    .insert(insertRows)
    .select();

  if (insertErr) throw new Error(`Failed to insert disbursement calculations: ${insertErr.message}`);

  // Also fetch any pre-existing rows to return the full set
  const { data: allRows } = await supabase
    .from('disbursement_calculations')
    .select('*')
    .eq('batch_id', batchId)
    .eq('org_id', orgId);

  return {
    calculations: (allRows ?? []) as DisbursementCalculation[],
    missingPrices,
    existingCount,
  };
}
