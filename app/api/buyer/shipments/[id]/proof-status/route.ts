/**
 * GET /api/buyer/shipments/[id]/proof-status
 *
 * Returns compliance proof for a shipment reachable through a contract owned
 * by the authenticated buyer organization. Service-role reads are always
 * constrained by both the buyer contract and the exporter organization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import {
  parseBuyerProfileMetadata,
  type BuyerRequirementCheck,
} from '@/lib/compliance/buyer-profile';

type JsonObject = Record<string, unknown>;

interface ProfileRow {
  id: string;
  org_id: string;
  name: string;
  destination_market: string;
  regulation_framework: string;
  custom_rules: unknown;
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function profileSummary(profile: ProfileRow | null) {
  if (!profile) return null;
  const metadata = parseBuyerProfileMetadata(profile.custom_rules);

  return {
    id: profile.id,
    name: profile.name,
    version: metadata?.version ?? null,
    destination: metadata?.destination ?? {
      country_code: null,
      country: profile.destination_market,
      port: null,
    },
    destination_market: profile.destination_market,
    regulation_framework: profile.regulation_framework,
    is_placeholder: metadata?.is_placeholder ?? false,
    buyer_approved: metadata?.buyer_approved ?? null,
    disclaimer: metadata?.disclaimer ?? null,
  };
}

export function extractRequirementChecks(scoreBreakdown: unknown): BuyerRequirementCheck[] {
  if (!Array.isArray(scoreBreakdown)) return [];

  const checks: BuyerRequirementCheck[] = [];
  for (const dimension of scoreBreakdown) {
    if (!isObject(dimension) || !Array.isArray(dimension.requirement_checks)) continue;
    for (const value of dimension.requirement_checks) {
      if (!isObject(value)) continue;
      const category = value.category;
      if (
        typeof value.key !== 'string'
        || typeof value.label !== 'string'
        || typeof value.met !== 'boolean'
        || typeof value.private_requirement !== 'boolean'
        || !['document', 'certification', 'geolocation', 'traceability'].includes(String(category))
      ) {
        continue;
      }

      checks.push({
        key: value.key,
        label: value.label,
        met: value.met,
        private_requirement: value.private_requirement,
        category: category as BuyerRequirementCheck['category'],
      });
    }
  }

  return checks;
}

function extractBuyerRiskFlags(riskFlags: unknown) {
  if (!Array.isArray(riskFlags)) return [];
  return riskFlags.filter((flag) => (
    isObject(flag)
    && typeof flag.category === 'string'
    && flag.category.toLowerCase() === 'buyer standards'
    && typeof flag.message === 'string'
  ));
}

function requirementRemediation(checks: BuyerRequirementCheck[]) {
  return checks.filter((check) => !check.met).map((check) => ({
    requirement_key: check.key,
    priority: check.category === 'geolocation' || check.category === 'traceability'
      ? 'important'
      : 'recommended',
    title: `Provide ${check.label}`,
    description: `${check.label} is required by the selected compliance profile.`,
    dimension: 'Buyer Standards',
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    if (profile.role !== 'buyer') {
      return NextResponse.json({ error: 'Only buyers can access proof status' }, { status: 403 });
    }

    const { id: shipmentId } = await params;
    const { data: access, error: accessError } = await supabase
      .from('contract_shipments')
      .select('shipment_id, contracts!inner(id, buyer_org_id, exporter_org_id, compliance_profile_id)')
      .eq('shipment_id', shipmentId)
      .eq('contracts.buyer_org_id', profile.org_id)
      .limit(1)
      .maybeSingle();

    if (accessError) {
      console.error('Proof status contract access error:', accessError);
      return NextResponse.json({ error: 'Unable to verify shipment access' }, { status: 500 });
    }
    if (!access) {
      return NextResponse.json({ error: 'Shipment not found or not accessible' }, { status: 404 });
    }

    const contract = Array.isArray(access.contracts) ? access.contracts[0] : access.contracts;
    if (!contract || contract.buyer_org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Shipment not found or not accessible' }, { status: 404 });
    }
    const exporterOrgId = contract.exporter_org_id;

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, org_id, shipment_code, compliance_profile_id, readiness_score, readiness_decision, risk_flags, score_breakdown, status, current_stage')
      .eq('id', shipmentId)
      .eq('org_id', exporterOrgId)
      .maybeSingle();

    if (shipmentError) {
      console.error('Proof status shipment error:', shipmentError);
      return NextResponse.json({ error: 'Unable to read shipment proof' }, { status: 500 });
    }
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const profileIds = [...new Set(
      [contract.compliance_profile_id, shipment.compliance_profile_id]
        .filter((id): id is string => typeof id === 'string')
    )];
    const { data: profileRows, error: profilesError } = profileIds.length > 0
      ? await supabase
          .from('compliance_profiles')
          .select('id, org_id, name, destination_market, regulation_framework, custom_rules')
          .in('id', profileIds)
          .eq('org_id', exporterOrgId)
      : { data: [], error: null };

    if (profilesError) {
      console.error('Proof status profile error:', profilesError);
      return NextResponse.json({ error: 'Unable to read compliance profile' }, { status: 500 });
    }

    const profiles = new Map(
      (profileRows ?? []).map((row) => [row.id, row as ProfileRow])
    );
    const contractProfile = contract.compliance_profile_id
      ? profiles.get(contract.compliance_profile_id) ?? null
      : null;
    const shipmentProfile = shipment.compliance_profile_id
      ? profiles.get(shipment.compliance_profile_id) ?? null
      : null;
    const hasAssignedProfiles = Boolean(contract.compliance_profile_id || shipment.compliance_profile_id);
    const profileIdsMatch = Boolean(
      contract.compliance_profile_id
      && contract.compliance_profile_id === shipment.compliance_profile_id
    );
    const profileRowsResolve = Boolean(contractProfile && shipmentProfile);
    const profilesAligned = profileIdsMatch && profileRowsResolve;
    const alignmentStatus = !hasAssignedProfiles
      ? 'unassigned'
      : profilesAligned
        ? 'aligned'
        : profileIdsMatch
          ? 'missing_profile'
          : 'mismatch';

    const [evidenceResult, labResult, documentsResult] = await Promise.all([
      supabase
        .from('evidence_packages')
        .select('id, token, expires_at, views, created_at')
        .eq('shipment_id', shipmentId)
        .eq('org_id', exporterOrgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('lab_results')
        .select('id, result, test_type, test_date')
        .eq('shipment_id', shipmentId)
        .eq('org_id', exporterOrgId),
      supabase
        .from('documents')
        .select('id, document_type, title, status')
        .eq('linked_entity_type', 'shipment')
        .eq('linked_entity_id', shipmentId)
        .eq('org_id', exporterOrgId),
    ]);

    const evidencePackage = evidenceResult.data;
    const labResults = labResult.data ?? [];
    const documents = documentsResult.data ?? [];
    const evidenceReadError = evidenceResult.error || labResult.error || documentsResult.error;
    if (evidenceReadError) {
      console.error('Proof status evidence error:', evidenceReadError);
      return NextResponse.json({ error: 'Unable to read shipment evidence' }, { status: 500 });
    }

    const labSummary = {
      total: labResults.length,
      passed: labResults.filter((result) => result.result === 'pass').length,
      failed: labResults.filter((result) => result.result === 'fail').length,
      conditional: labResults.filter((result) => result.result === 'conditional').length,
      latest_test_date: labResults
        .map((result) => result.test_date)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null,
    };
    const docSummary = {
      total: documents.length,
      active: documents.filter((document) => document.status === 'active').length,
      expired: documents.filter((document) => document.status === 'expired').length,
      items: documents.map((document) => ({
        id: document.id,
        document_type: document.document_type,
        title: document.title,
        status: document.status,
      })),
    };

    const requirementChecks = extractRequirementChecks(shipment.score_breakdown);
    const requirementsMet = requirementChecks.filter((check) => check.met);
    const requirementsMissing = requirementChecks.filter((check) => !check.met);
    const buyerRiskFlags = extractBuyerRiskFlags(shipment.risk_flags);
    const buyerRemediation = requirementRemediation(requirementChecks);

    const readinessOk = shipment.readiness_score !== null
      && shipment.readiness_score >= 80
      && shipment.readiness_decision !== 'no_go';
    const labOk = labSummary.total > 0 && labSummary.failed === 0;
    const evidencePackageExpired = evidencePackage
      ? new Date(evidencePackage.expires_at) < new Date()
      : false;
    const evidenceOk = Boolean(evidencePackage) && !evidencePackageExpired;
    const documentsOk = docSummary.total > 0 && docSummary.expired === 0;
    const requirementsOk = requirementChecks.length > 0 && requirementsMissing.length === 0;

    let overallVerificationStatus: 'verified' | 'pending' | 'incomplete';
    if (readinessOk && labOk && evidenceOk && documentsOk && profilesAligned && requirementsOk) {
      overallVerificationStatus = 'verified';
    } else if (
      shipment.readiness_score === null
      || labSummary.total === 0
      || !evidencePackage
      || !shipment.compliance_profile_id
      || requirementChecks.length === 0
    ) {
      overallVerificationStatus = 'incomplete';
    } else {
      overallVerificationStatus = 'pending';
    }

    return NextResponse.json({
      shipment_id: shipmentId,
      shipment_code: shipment.shipment_code,
      overall_verification_status: overallVerificationStatus,
      compliance_profile: profileSummary(shipmentProfile),
      profile_alignment: {
        status: alignmentStatus,
        aligned: profilesAligned,
        contract_profile: profileSummary(contractProfile),
        shipment_profile: profileSummary(shipmentProfile),
      },
      requirement_checks: requirementChecks,
      requirements_met: requirementsMet,
      requirements_missing: requirementsMissing,
      buyer_standards: {
        risk_flags: buyerRiskFlags,
        remediation: buyerRemediation,
      },
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
            share_token: evidencePackage.token,
            view_count: evidencePackage.views,
            ok: evidenceOk,
          }
        : { generated: false, expired: false, ok: false },
      documents: {
        ...docSummary,
        ok: documentsOk,
      },
    });
  } catch (error) {
    console.error('Proof status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
