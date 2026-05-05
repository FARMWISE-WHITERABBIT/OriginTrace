/**
 * GET /api/audit-readiness
 *
 * Returns a 5-component audit readiness score for the authenticated org.
 * Scores are computed live from DB queries — no caching for MVP.
 *
 * Components (weights):
 *   farmDataCompleteness  25% — farms with boundary, deforestation check, consent
 *   batchRecordQuality    20% — batches with weight, bag count, farm link
 *   labTestCoverage       20% — shipped shipments (last 12m) with ≥1 lab result
 *   documentHealth        20% — non-archived docs that are valid and not expiring in 30d
 *   cleanShipmentRate     15% — accepted shipments in last 12m
 */

import { NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

export interface AuditReadinessComponent {
  score: number;    // 0–100
  detail: string;
  numerator: number;
  denominator: number;
}

export interface AuditReadinessScore {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: {
    farmDataCompleteness: AuditReadinessComponent;
    batchRecordQuality:   AuditReadinessComponent;
    labTestCoverage:      AuditReadinessComponent;
    documentHealth:       AuditReadinessComponent;
    cleanShipmentRate:    AuditReadinessComponent;
  };
  asOf: string;
}

const WEIGHTS = {
  farmDataCompleteness: 0.25,
  batchRecordQuality:   0.20,
  labTestCoverage:      0.20,
  documentHealth:       0.20,
  cleanShipmentRate:    0.15,
};

function pct(num: number, den: number): number {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

function toGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const orgId = profile.org_id;
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    // ── 1. Farm Data Completeness (25%) ───────────────────────────────────────
    const { data: farmRows } = await supabase
      .from('farms')
      .select('id, boundary_geo, deforestation_check, consent_timestamp')
      .eq('org_id', orgId);

    const totalFarms = farmRows?.length ?? 0;
    const completeFarms = (farmRows ?? []).filter(
      (f) =>
        f.boundary_geo !== null &&
        f.deforestation_check !== null &&
        f.consent_timestamp !== null
    ).length;

    const farmDataCompleteness: AuditReadinessComponent = {
      score:       pct(completeFarms, totalFarms),
      numerator:   completeFarms,
      denominator: totalFarms,
      detail:      totalFarms === 0
        ? 'No farms registered'
        : `${completeFarms} of ${totalFarms} farms have boundary, deforestation check, and consent on file`,
    };

    // ── 2. Batch Record Quality (20%) ─────────────────────────────────────────
    const { data: batchRows } = await supabase
      .from('collection_batches')
      .select('id, total_weight, bag_count, farm_id')
      .eq('org_id', orgId);

    const totalBatches = batchRows?.length ?? 0;
    const completeBatches = (batchRows ?? []).filter(
      (b) => b.total_weight > 0 && b.bag_count > 0 && b.farm_id !== null
    ).length;

    const batchRecordQuality: AuditReadinessComponent = {
      score:       pct(completeBatches, totalBatches),
      numerator:   completeBatches,
      denominator: totalBatches,
      detail:      totalBatches === 0
        ? 'No batches recorded'
        : `${completeBatches} of ${totalBatches} batches have weight, bag count, and farm link`,
    };

    // ── 3. Lab Test Coverage (20%) ─────────────────────────────────────────────
    // Shipped shipments in last 12 months that have at least one lab result
    const { data: shippedRows } = await supabase
      .from('shipments')
      .select('id')
      .eq('org_id', orgId)
      .in('status', ['booked', 'in_transit', 'delivered'])
      .gte('created_at', twelveMonthsAgo.toISOString());

    const totalShipped = shippedRows?.length ?? 0;
    let coveredByLab = 0;

    if (totalShipped > 0) {
      const shipmentIds = (shippedRows ?? []).map((s) => s.id);
      const { data: labLinked } = await supabase
        .from('lab_results')
        .select('shipment_id')
        .eq('org_id', orgId)
        .in('shipment_id', shipmentIds);

      const coveredIds = new Set((labLinked ?? []).map((r) => r.shipment_id));
      coveredByLab = coveredIds.size;
    }

    const labTestCoverage: AuditReadinessComponent = {
      score:       pct(coveredByLab, totalShipped),
      numerator:   coveredByLab,
      denominator: totalShipped,
      detail:      totalShipped === 0
        ? 'No shipped shipments in last 12 months'
        : `${coveredByLab} of ${totalShipped} shipments (last 12m) have lab results attached`,
    };

    // ── 4. Document Health (20%) ───────────────────────────────────────────────
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: docRows } = await supabase
      .from('documents')
      .select('id, status, expiry_date')
      .eq('org_id', orgId)
      .neq('status', 'archived');

    const totalDocs = docRows?.length ?? 0;
    const healthyDocs = (docRows ?? []).filter(
      (d) =>
        d.status === 'active' &&
        (d.expiry_date === null || new Date(d.expiry_date) > thirtyDaysFromNow)
    ).length;

    const documentHealth: AuditReadinessComponent = {
      score:       pct(healthyDocs, totalDocs),
      numerator:   healthyDocs,
      denominator: totalDocs,
      detail:      totalDocs === 0
        ? 'No compliance documents uploaded'
        : `${healthyDocs} of ${totalDocs} documents are active and not expiring within 30 days`,
    };

    // ── 5. Clean Shipment Rate (15%) ───────────────────────────────────────────
    const { data: outcomeRows } = await supabase
      .from('shipment_outcomes')
      .select('id, outcome')
      .eq('org_id', orgId)
      .gte('recorded_at', twelveMonthsAgo.toISOString());

    const totalOutcomes = outcomeRows?.length ?? 0;
    const acceptedOutcomes = (outcomeRows ?? []).filter((o) => o.outcome === 'accepted').length;

    const cleanShipmentRate: AuditReadinessComponent = {
      score:       pct(acceptedOutcomes, totalOutcomes),
      numerator:   acceptedOutcomes,
      denominator: totalOutcomes,
      detail:      totalOutcomes === 0
        ? 'No shipment outcomes recorded in last 12 months'
        : `${acceptedOutcomes} of ${totalOutcomes} shipments accepted at destination (last 12m)`,
    };

    // ── Weighted overall score ─────────────────────────────────────────────────
    const overall = Math.round(
      farmDataCompleteness.score * WEIGHTS.farmDataCompleteness +
      batchRecordQuality.score   * WEIGHTS.batchRecordQuality +
      labTestCoverage.score      * WEIGHTS.labTestCoverage +
      documentHealth.score       * WEIGHTS.documentHealth +
      cleanShipmentRate.score    * WEIGHTS.cleanShipmentRate
    );

    const response: AuditReadinessScore = {
      overall,
      grade: toGrade(overall),
      components: {
        farmDataCompleteness,
        batchRecordQuality,
        labTestCoverage,
        documentHealth,
        cleanShipmentRate,
      },
      asOf: now.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Audit readiness error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
