/**
 * GET /api/buyer/shipments/[id]/proof-status
 *
 * Returns compliance proof verification data for a buyer-visible shipment.
 * Buyers can only access shipments linked to contracts belonging to their org.
 *
 * Roles allowed: buyer
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (profile.role !== 'buyer') {
      return NextResponse.json({ error: 'Only buyers can access proof status' }, { status: 403 });
    }

    const shipmentId = params.id;

    // Verify the shipment is accessible to this buyer org via contract linkage
    const { data: access } = await supabase
      .from('contract_shipments')
      .select('shipment_id, contracts!inner(buyer_org_id)')
      .eq('shipment_id', shipmentId)
      .eq('contracts.buyer_org_id', profile.org_id)
      .limit(1)
      .maybeSingle();

    if (!access) {
      return NextResponse.json({ error: 'Shipment not found or not accessible' }, { status: 404 });
    }

    // Fetch shipment readiness fields
    const { data: shipment } = await supabase
      .from('shipments')
      .select('id, shipment_code, readiness_score, readiness_decision, status, current_stage')
      .eq('id', shipmentId)
      .single();

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // Fetch evidence package
    const { data: evidencePackage } = await supabase
      .from('evidence_packages')
      .select('id, share_token, expires_at, view_count, created_at')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch lab results summary
    const { data: labResults } = await supabase
      .from('lab_results')
      .select('id, result, test_type, test_date')
      .eq('shipment_id', shipmentId);

    const labSummary = labResults
      ? {
          total: labResults.length,
          passed: labResults.filter((r) => r.result === 'pass').length,
          failed: labResults.filter((r) => r.result === 'fail').length,
          conditional: labResults.filter((r) => r.result === 'conditional').length,
          latest_test_date: labResults
            .map((r) => r.test_date)
            .filter(Boolean)
            .sort()
            .at(-1) ?? null,
        }
      : { total: 0, passed: 0, failed: 0, conditional: 0, latest_test_date: null };

    // Fetch document health (count of shipment documents)
    const { data: documents, count: documentCount } = await supabase
      .from('documents')
      .select('id, doc_type, status', { count: 'exact' })
      .eq('shipment_id', shipmentId);

    const docSummary = {
      total: documentCount ?? 0,
      active: documents?.filter((d) => d.status === 'active').length ?? 0,
      expired: documents?.filter((d) => d.status === 'expired').length ?? 0,
    };

    // Compute overall verification status
    const readinessOk =
      shipment.readiness_score !== null &&
      shipment.readiness_score >= 80 &&
      shipment.readiness_decision !== 'NO_GO';

    const labOk = labSummary.total > 0 && labSummary.failed === 0;

    const evidencePackageGenerated = !!evidencePackage;
    const evidencePackageExpired = evidencePackage
      ? new Date(evidencePackage.expires_at) < new Date()
      : false;
    const evidenceOk = evidencePackageGenerated && !evidencePackageExpired;

    let overall_verification_status: 'verified' | 'pending' | 'incomplete';
    if (readinessOk && labOk && evidenceOk) {
      overall_verification_status = 'verified';
    } else if (
      labSummary.total === 0 ||
      !evidencePackageGenerated ||
      shipment.readiness_score === null
    ) {
      overall_verification_status = 'incomplete';
    } else {
      overall_verification_status = 'pending';
    }

    return NextResponse.json({
      shipment_id: shipmentId,
      shipment_code: shipment.shipment_code,
      overall_verification_status,
      readiness: {
        score: shipment.readiness_score,
        decision: shipment.readiness_decision,
        ok: readinessOk,
      },
      lab_results: {
        ...labSummary,
        ok: labOk,
      },
      evidence_package: evidencePackage
        ? {
            generated: true,
            expires_at: evidencePackage.expires_at,
            expired: evidencePackageExpired,
            share_token: evidencePackage.share_token,
            view_count: evidencePackage.view_count,
            ok: evidenceOk,
          }
        : { generated: false, expired: false, ok: false },
      documents: {
        ...docSummary,
        ok: docSummary.total > 0 && docSummary.expired === 0,
      },
    });
  } catch (error) {
    console.error('Proof status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
