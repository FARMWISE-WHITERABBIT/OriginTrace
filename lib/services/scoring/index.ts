import type {
  ShipmentScoreInput,
  ScoreDimension,
  RiskFlag,
  RemediationItem,
  ReadinessDecision,
  ShipmentReadinessResult,
  FrameworkScorerContext,
} from './types';
import { scoreEUDR } from './eudr';
import { scoreFSMA204 } from './fsma204';
import { scoreUKEnvironmentAct } from './uk-environment';
import { scoreLaceyUFLPA } from './lacey-uflpa';
import { scoreBuyerStandards } from './buyer-standards';
import { scoreChinaGreenTrade } from './china-green-trade';
import { scoreUAEHalal } from './uae-halal';

export type {
  ComplianceProfile,
  FarmDeforestationCheck,
  ShipmentScoreInput,
  ScoreDimension,
  RiskFlag,
  RemediationItem,
  ReadinessDecision,
  ShipmentReadinessResult,
  FrameworkScorerContext,
  FrameworkScorerResult,
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreTraceabilityIntegrity(
  input: ShipmentScoreInput
): { score: number; details: string[]; riskFlags: RiskFlag[]; remediation: RemediationItem[] } {
  const { items } = input;
  const details: string[] = [];
  const riskFlags: RiskFlag[] = [];
  const remediation: RemediationItem[] = [];

  if (items.length === 0) {
    return { score: 0, details: ['No items to evaluate'], riskFlags, remediation };
  }

  const traceableCount = items.filter((i) => i.traceability_complete).length;
  const traceabilityPct = traceableCount / items.length;
  const traceabilityScore = traceabilityPct * 100;
  details.push(`${traceableCount}/${items.length} items have complete traceability (${Math.round(traceabilityPct * 100)}%)`);

  const profile = input.compliance_profile;
  const geoLevel = profile?.geo_verification_level || 'basic';

  const batches = items.filter((i) => i.item_type === 'batch' && i.batch_data);
  let gpsScore = 100;
  if (batches.length > 0) {
    const gpsCount = batches.filter((b) => b.batch_data!.has_gps).length;
    gpsScore = (gpsCount / batches.length) * 100;
    details.push(`${gpsCount}/${batches.length} batches have GPS-linked farms`);

    if (geoLevel === 'satellite' || geoLevel === 'polygon') {
      if (gpsCount < batches.length) {
        const isStrict = geoLevel === 'satellite';
        remediation.push({
          priority: isStrict ? 'urgent' : 'important',
          title: `Complete GPS farm mapping (${geoLevel} level required)`,
          description: `${batches.length - gpsCount} batch(es) are missing GPS coordinates. Compliance profile "${profile?.name || 'default'}" requires ${geoLevel}-level geo-verification.`,
          dimension: 'Traceability Integrity',
        });
        if (isStrict) {
          riskFlags.push({
            severity: 'critical',
            category: 'Geo-Verification',
            message: `Satellite-level geo-verification required but ${batches.length - gpsCount} batch(es) lack GPS data`,
            is_hard_fail: false,
          });
        }
      }
    } else if (gpsCount < batches.length) {
      remediation.push({
        priority: 'important',
        title: 'Complete GPS farm mapping',
        description: `${batches.length - gpsCount} batch(es) are missing GPS coordinates for linked farms.`,
        dimension: 'Traceability Integrity',
      });
    }
  } else {
    details.push('No batch items with GPS data to evaluate');
  }

  let bagLinkScore = 100;
  const totalBags = batches.reduce((sum, b) => sum + b.batch_data!.bag_count, 0);
  const linkedBags = batches.reduce((sum, b) => sum + b.batch_data!.bags_with_farm_link, 0);
  if (totalBags > 0) {
    bagLinkScore = (linkedBags / totalBags) * 100;
    details.push(`${linkedBags}/${totalBags} bags linked to specific farms`);
    if (linkedBags < totalBags) {
      remediation.push({
        priority: 'recommended',
        title: 'Link remaining bags to farms',
        description: `${totalBags - linkedBags} bag(s) are not linked to a specific farm.`,
        dimension: 'Traceability Integrity',
      });
    }
  } else {
    details.push('No bags to evaluate for farm linkage');
  }

  const allHaveFarms = items.every((i) => i.farm_count > 0);
  const farmCountScore = allHaveFarms ? 100 : 0;
  if (!allHaveFarms) {
    const missingFarmItems = items.filter((i) => i.farm_count <= 0).length;
    details.push(`${missingFarmItems} item(s) have no linked farms`);
    riskFlags.push({
      severity: 'warning',
      category: 'Traceability',
      message: `${missingFarmItems} item(s) have zero linked farms`,
      is_hard_fail: false,
    });
  } else {
    details.push('All items have known farm sources');
  }

  const score = clamp(
    traceabilityScore * 0.4 + gpsScore * 0.3 + bagLinkScore * 0.2 + farmCountScore * 0.1,
    0,
    100
  );

  if (traceabilityPct < 0.5) {
    riskFlags.push({
      severity: 'critical',
      category: 'Traceability',
      message: `Traceability completeness is below 50% (${Math.round(traceabilityPct * 100)}%)`,
      is_hard_fail: true,
    });
  }

  return { score, details, riskFlags, remediation };
}

function scoreChemicalRisk(
  input: ShipmentScoreInput
): { score: number; details: string[]; riskFlags: RiskFlag[]; remediation: RemediationItem[] } {
  const { doc_status } = input.shipment;
  const details: string[] = [];
  const riskFlags: RiskFlag[] = [];
  const remediation: RemediationItem[] = [];

  let score = 0;

  const hasLabTest = doc_status['lab_test_certificate'] === true;
  const hasPesticide = doc_status['pesticide_declaration'] === true;
  const hasAflatoxin = doc_status['aflatoxin_test'] === true;

  if (hasLabTest) {
    score += 40;
    details.push('Lab test certificate present');
  } else {
    details.push('Lab test certificate missing');
    remediation.push({
      priority: 'urgent',
      title: 'Obtain lab test certificate',
      description: 'Lab test certificate is required to verify chemical safety of the shipment.',
      dimension: 'Chemical & Contamination Risk',
    });
  }

  if (hasPesticide) {
    score += 30;
    details.push('Pesticide declaration present');
  } else {
    details.push('Pesticide declaration missing');
    remediation.push({
      priority: 'important',
      title: 'Obtain pesticide declaration',
      description: 'Pesticide declaration is needed to confirm safe pesticide usage levels.',
      dimension: 'Chemical & Contamination Risk',
    });
  }

  if (hasAflatoxin) {
    score += 30;
    details.push('Aflatoxin test present');
  } else {
    details.push('Aflatoxin test missing');
    remediation.push({
      priority: 'important',
      title: 'Obtain aflatoxin test results',
      description: 'Aflatoxin testing is needed to confirm contamination levels are within safe limits.',
      dimension: 'Chemical & Contamination Risk',
    });
  }

  if (!hasLabTest && !hasPesticide && !hasAflatoxin) {
    score = Math.max(score - 20, 0);
    riskFlags.push({
      severity: 'critical',
      category: 'Chemical Safety',
      message: 'No contamination or chemical safety documentation exists for this shipment',
      is_hard_fail: false,
    });
  }

  return { score: clamp(score, 0, 100), details, riskFlags, remediation };
}

function scoreDocumentationCompleteness(
  input: ShipmentScoreInput
): { score: number; details: string[]; riskFlags: RiskFlag[]; remediation: RemediationItem[] } {
  const { doc_status } = input.shipment;
  const details: string[] = [];
  const riskFlags: RiskFlag[] = [];
  const remediation: RemediationItem[] = [];

  const defaultRequiredDocs = [
    { key: 'certificate_of_origin', label: 'Certificate of Origin' },
    { key: 'phytosanitary_certificate', label: 'Phytosanitary Certificate' },
    { key: 'bill_of_lading', label: 'Bill of Lading' },
    { key: 'packing_list', label: 'Packing List' },
    { key: 'commercial_invoice', label: 'Commercial Invoice' },
    { key: 'export_permit', label: 'Export Permit' },
  ];

  const profile = input.compliance_profile;

  const requiredDocs = (profile && profile.required_documents.length > 0)
    ? profile.required_documents.map((doc) => ({
        key: doc.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        label: doc,
      }))
    : defaultRequiredDocs;

  if (profile) {
    details.push(`Using compliance profile: ${profile.name} (${profile.regulation_framework})`);
  }

  const pointsPerDoc = 100 / requiredDocs.length;
  let score = 0;
  let presentCount = 0;

  for (const doc of requiredDocs) {
    const isPresent = doc_status[doc.key] === true ||
      Object.keys(doc_status).some((k) => {
        const normalizedKey = k.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        return normalizedKey === doc.key && doc_status[k] === true;
      });

    if (isPresent) {
      score += pointsPerDoc;
      presentCount++;
    } else {
      remediation.push({
        priority: 'important',
        title: `Obtain ${doc.label}`,
        description: `${doc.label} is missing and required for ${profile ? profile.regulation_framework : 'export'} compliance.`,
        dimension: 'Documentation Completeness',
      });
    }
  }

  details.push(`${presentCount}/${requiredDocs.length} required export documents present`);

  if (presentCount === 0) {
    riskFlags.push({
      severity: 'critical',
      category: 'Documentation',
      message: 'No export documents have been prepared',
      is_hard_fail: false,
    });
  } else if (presentCount < requiredDocs.length) {
    riskFlags.push({
      severity: 'warning',
      category: 'Documentation',
      message: `${requiredDocs.length - presentCount} required export document(s) are missing`,
      is_hard_fail: false,
    });
  }

  return { score: clamp(Math.round(score * 100) / 100, 0, 100), details, riskFlags, remediation };
}

function scoreStorageHandling(
  input: ShipmentScoreInput
): { score: number; details: string[]; riskFlags: RiskFlag[]; remediation: RemediationItem[] } {
  const { storage_controls } = input.shipment;
  const details: string[] = [];
  const riskFlags: RiskFlag[] = [];
  const remediation: RemediationItem[] = [];

  const controls = [
    { key: 'warehouse_certified', label: 'Warehouse Certification' },
    { key: 'temperature_logged', label: 'Temperature Logging' },
    { key: 'pest_control_active', label: 'Pest Control' },
    { key: 'humidity_monitored', label: 'Humidity Monitoring' },
    { key: 'fifo_enforced', label: 'FIFO Enforcement' },
  ];

  const pointsPerControl = 100 / controls.length;
  let score = 0;
  let activeCount = 0;

  for (const ctrl of controls) {
    if (storage_controls[ctrl.key] === true) {
      score += pointsPerControl;
      activeCount++;
    } else {
      remediation.push({
        priority: 'recommended',
        title: `Enable ${ctrl.label}`,
        description: `${ctrl.label} is not active. Enabling it improves storage quality assurance.`,
        dimension: 'Storage & Handling Controls',
      });
    }
  }

  details.push(`${activeCount}/${controls.length} storage controls active`);

  if (activeCount === 0) {
    riskFlags.push({
      severity: 'warning',
      category: 'Storage',
      message: 'No storage and handling controls are active',
      is_hard_fail: false,
    });
  }

  if (input.cold_chain_total_entries !== undefined && input.cold_chain_total_entries > 0) {
    const alertRate = (input.cold_chain_alert_count || 0) / input.cold_chain_total_entries;
    if (alertRate > 0.2) {
      const penalty = Math.min(alertRate * 30, 20);
      score = Math.max(score - penalty, 0);
      riskFlags.push({
        severity: 'critical',
        category: 'Cold Chain',
        message: `${Math.round(alertRate * 100)}% of cold chain readings triggered alerts`,
        is_hard_fail: false,
      });
      remediation.push({
        priority: 'urgent',
        title: 'Resolve cold chain alert conditions',
        description: `${input.cold_chain_alert_count} of ${input.cold_chain_total_entries} cold chain readings are outside safe thresholds.`,
        dimension: 'Storage & Handling Controls',
      });
      details.push(`Cold chain: ${input.cold_chain_alert_count}/${input.cold_chain_total_entries} readings triggered alerts (penalty: -${Math.round(penalty)})`);
    } else if (alertRate > 0) {
      details.push(`Cold chain: ${input.cold_chain_alert_count} alert(s) from ${input.cold_chain_total_entries} readings`);
      riskFlags.push({
        severity: 'warning',
        category: 'Cold Chain',
        message: `${input.cold_chain_alert_count} cold chain alert(s) detected`,
        is_hard_fail: false,
      });
    } else {
      score = Math.min(score + 5, 100);
      details.push(`Cold chain: All ${input.cold_chain_total_entries} readings within safe thresholds (+5 bonus)`);
    }
  } else if (storage_controls['temperature_logged']) {
    details.push('Temperature logging enabled but no cold chain data recorded yet');
  }

  return { score: clamp(score, 0, 100), details, riskFlags, remediation };
}

function scoreRegulatoryAlignment(
  input: ShipmentScoreInput
): { score: number; details: string[]; riskFlags: RiskFlag[]; remediation: RemediationItem[] } {
  const { shipment, items } = input;
  const { target_regulations, doc_status } = shipment;
  const details: string[] = [];
  const riskFlags: RiskFlag[] = [];
  const remediation: RemediationItem[] = [];

  const profile = input.compliance_profile;

  let effectiveRegulations = [...target_regulations];
  if (profile && profile.regulation_framework) {
    const frameworkMap: Record<string, string> = {
      'EUDR': 'EUDR',
      'FSMA_204': 'FSMA 204',
      'UK_Environment_Act': 'UK Environment Act',
      'Lacey_Act_UFLPA': 'Lacey Act / UFLPA',
      'China_Green_Trade': 'China Green Trade',
      'UAE_Halal': 'UAE / Halal',
      'custom': 'Buyer Standards',
    };
    const mapped = frameworkMap[profile.regulation_framework] || profile.regulation_framework;
    if (!effectiveRegulations.some((r) => r.toLowerCase().includes(mapped.toLowerCase()))) {
      effectiveRegulations.push(mapped);
    }
    details.push(`Compliance profile "${profile.name}" adds ${profile.regulation_framework} framework`);
  }

  if (effectiveRegulations.length === 0) {
    details.push('No target regulations specified');
    return { score: 100, details, riskFlags, remediation };
  }

  const batches = items.filter((i) => i.item_type === 'batch' && i.batch_data);
  const allHaveGps = batches.length > 0 && batches.every((b) => b.batch_data!.has_gps);
  const allTraceable = items.length > 0 && items.every((i) => i.traceability_complete);

  const ctx: FrameworkScorerContext = {
    input,
    allHaveGps,
    allTraceable,
    batches,
    doc_status,
    shipment,
    items,
    profile,
  };

  const regulationScores: number[] = [];

  for (const reg of effectiveRegulations) {
    const regLower = reg.toLowerCase();
    let result;

    if (regLower.includes('eudr')) {
      result = scoreEUDR(ctx);
    } else if (regLower.includes('fsma') || regLower.includes('204')) {
      result = scoreFSMA204(ctx);
    } else if (regLower.includes('environment act')) {
      result = scoreUKEnvironmentAct(ctx);
    } else if (regLower.includes('lacey') || regLower.includes('uflpa')) {
      result = scoreLaceyUFLPA(ctx);
    } else if (regLower.includes('china') || regLower.includes('green trade') || regLower.includes('gacc')) {
      result = scoreChinaGreenTrade(ctx);
    } else if (regLower.includes('uae') || regLower.includes('halal') || regLower.includes('esma') || regLower.includes('moccae')) {
      result = scoreUAEHalal(ctx);
    } else if (regLower.includes('buyer') || regLower.includes('custom')) {
      result = scoreBuyerStandards(ctx);
    } else {
      let met = 0;
      const total = 1;
      if (doc_status['quality_certificate'] === true) met++;
      else {
        remediation.push({
          priority: 'recommended',
          title: `${reg}: Quality certificate needed`,
          description: `A quality certificate is recommended for ${reg} compliance.`,
          dimension: 'Regulatory Alignment',
        });
      }
      details.push(`${reg}: ${met}/${total} requirements met`);
      regulationScores.push(total > 0 ? (met / total) * 100 : 100);
      continue;
    }

    details.push(...result.details);
    riskFlags.push(...result.riskFlags);
    remediation.push(...result.remediation);
    regulationScores.push(result.total > 0 ? (result.met / result.total) * 100 : 100);
  }

  let score = regulationScores.reduce((sum, s) => sum + s, 0) / regulationScores.length;

  if (score < 50) {
    riskFlags.push({
      severity: 'critical',
      category: 'Regulatory',
      message: 'Regulatory alignment is below 50% for target destination requirements',
      is_hard_fail: false,
    });
  }

  const rejectionRate = input.historical_rejection_rate;
  if (rejectionRate !== undefined && rejectionRate > 0) {
    const penalty = Math.min(rejectionRate * 50, 25);
    score = Math.max(score - penalty, 0);
    details.push(`Historical rejection rate: ${Math.round(rejectionRate * 100)}% (score penalty: -${Math.round(penalty)})`);
    if (rejectionRate >= 0.3) {
      riskFlags.push({
        severity: 'critical',
        category: 'Historical Compliance',
        message: `Organization has a ${Math.round(rejectionRate * 100)}% historical rejection rate`,
        is_hard_fail: false,
      });
      remediation.push({
        priority: 'urgent',
        title: 'Address historical rejection patterns',
        description: `${Math.round(rejectionRate * 100)}% of past shipments were rejected. Review past rejection reasons and implement corrective actions.`,
        dimension: 'Regulatory Alignment',
      });
    } else if (rejectionRate > 0) {
      riskFlags.push({
        severity: 'warning',
        category: 'Historical Compliance',
        message: `Organization has a ${Math.round(rejectionRate * 100)}% historical rejection rate`,
        is_hard_fail: false,
      });
    }
  } else if (rejectionRate !== undefined) {
    details.push('Clean compliance track record (0% rejection rate)');
  }

  return { score: clamp(score, 0, 100), details, riskFlags, remediation };
}

function checkHardFails(input: ShipmentScoreInput, traceabilityScore: number): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const { shipment, items } = input;

  if (items.length === 0) {
    flags.push({
      severity: 'critical',
      category: 'Shipment',
      message: 'Shipment contains zero items',
      is_hard_fail: true,
    });
  }

  const rejectedItems = items.filter((i) => i.compliance_status === 'rejected');
  if (rejectedItems.length > 0) {
    flags.push({
      severity: 'critical',
      category: 'Compliance',
      message: `${rejectedItems.length} item(s) have a rejected compliance status`,
      is_hard_fail: true,
    });
  }

  if (!shipment.destination_country) {
    flags.push({
      severity: 'critical',
      category: 'Shipment',
      message: 'No destination country has been set for this shipment',
      is_hard_fail: true,
    });
  }

  if (shipment.estimated_ship_date) {
    const shipDate = new Date(shipment.estimated_ship_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (shipDate < now) {
      flags.push({
        severity: 'critical',
        category: 'Shipment',
        message: 'Estimated ship date is in the past',
        is_hard_fail: true,
      });
    }
  }

  if (items.length > 0) {
    const traceableCount = items.filter((i) => i.traceability_complete).length;
    const traceabilityPct = traceableCount / items.length;
    if (traceabilityPct < 0.5) {
      const alreadyFlagged = flags.some(
        (f) => f.category === 'Traceability' && f.is_hard_fail
      );
      if (!alreadyFlagged) {
        flags.push({
          severity: 'critical',
          category: 'Traceability',
          message: `Traceability completeness is below 50% (${Math.round(traceabilityPct * 100)}%)`,
          is_hard_fail: true,
        });
      }
    }
  }

  return flags;
}

function determineDecision(
  score: number,
  hasHardFails: boolean,
  itemCount: number
): { decision: ReadinessDecision; label: string } {
  if (itemCount === 0) {
    return { decision: 'pending', label: 'Not Ready' };
  }
  if (hasHardFails || score < 50) {
    return { decision: 'no_go', label: 'Do Not Ship' };
  }
  if (score >= 75) {
    return { decision: 'go', label: 'Ready to Ship' };
  }
  return { decision: 'conditional', label: 'Ship with Conditions' };
}

function buildSummary(
  decision: ReadinessDecision,
  decisionLabel: string,
  score: number,
  dimensions: ScoreDimension[],
  riskFlags: RiskFlag[],
  remediationCount: number
): string {
  const criticalFlags = riskFlags.filter((f) => f.severity === 'critical').length;
  const hardFails = riskFlags.filter((f) => f.is_hard_fail).length;

  const weakest = dimensions.reduce((prev, curr) =>
    curr.score < prev.score ? curr : prev
  );

  let summary = `Shipment readiness: ${decisionLabel} (Score: ${Math.round(score)}/100).`;

  if (hardFails > 0) {
    summary += ` ${hardFails} hard fail condition(s) detected.`;
  }

  if (criticalFlags > hardFails) {
    summary += ` ${criticalFlags - hardFails} critical risk flag(s) require attention.`;
  }

  summary += ` Weakest dimension: ${weakest.name} (${Math.round(weakest.score)}/100).`;

  if (remediationCount > 0) {
    summary += ` ${remediationCount} remediation action(s) recommended.`;
  }

  return summary;
}

export function computeShipmentReadiness(input: ShipmentScoreInput): ShipmentReadinessResult {
  const allRiskFlags: RiskFlag[] = [];
  const allRemediation: RemediationItem[] = [];

  const traceability = scoreTraceabilityIntegrity(input);
  const chemical = scoreChemicalRisk(input);
  const documentation = scoreDocumentationCompleteness(input);
  const storage = scoreStorageHandling(input);
  const regulatory = scoreRegulatoryAlignment(input);

  const dimensionResults = [
    { name: 'Traceability Integrity', weight: 0.25, result: traceability },
    { name: 'Chemical & Contamination Risk', weight: 0.25, result: chemical },
    { name: 'Documentation Completeness', weight: 0.20, result: documentation },
    { name: 'Storage & Handling Controls', weight: 0.15, result: storage },
    { name: 'Regulatory Alignment', weight: 0.15, result: regulatory },
  ];

  const dimensions: ScoreDimension[] = dimensionResults.map((d) => ({
    name: d.name,
    weight: d.weight,
    score: Math.round(d.result.score * 100) / 100,
    weighted_score: Math.round(d.result.score * d.weight * 100) / 100,
    details: d.result.details,
  }));

  for (const d of dimensionResults) {
    allRiskFlags.push(...d.result.riskFlags);
    allRemediation.push(...d.result.remediation);
  }

  const hardFailFlags = checkHardFails(input, traceability.score);
  for (const flag of hardFailFlags) {
    const isDuplicate = allRiskFlags.some(
      (f) => f.message === flag.message && f.category === flag.category
    );
    if (isDuplicate) {
      const existing = allRiskFlags.find(
        (f) => f.message === flag.message && f.category === flag.category
      );
      if (existing) {
        existing.is_hard_fail = true;
      }
    } else {
      allRiskFlags.push(flag);
    }
  }

  const overallScore = dimensions.reduce((sum, d) => sum + d.weighted_score, 0);
  const hasHardFails = allRiskFlags.some((f) => f.is_hard_fail);

  const { decision, label } = determineDecision(overallScore, hasHardFails, input.items.length);

  const summary = dimensions.length > 0
    ? buildSummary(decision, label, overallScore, dimensions, allRiskFlags, allRemediation.length)
    : `Shipment readiness: ${label} (Score: ${Math.round(overallScore)}/100). No items to evaluate.`;

  return {
    overall_score: Math.round(overallScore * 100) / 100,
    decision,
    decision_label: label,
    dimensions,
    risk_flags: allRiskFlags,
    remediation_items: allRemediation,
    summary,
  };
}
