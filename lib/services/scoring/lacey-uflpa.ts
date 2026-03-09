import type { FrameworkScorerContext, FrameworkScorerResult } from './types';

export function scoreLaceyUFLPA(ctx: FrameworkScorerContext): FrameworkScorerResult {
  const { allTraceable, items, doc_status, shipment, batches } = ctx;
  const details: string[] = [];
  const riskFlags: FrameworkScorerResult['riskFlags'] = [];
  const remediation: FrameworkScorerResult['remediation'] = [];
  let met = 0;
  const total = 6;

  if (allTraceable) {
    met++;
    details.push('Lacey Act / UFLPA: Supply chain transparency verified');
  } else {
    riskFlags.push({
      severity: 'critical',
      category: 'Lacey Act / UFLPA',
      message: 'Supply chain transparency verification failed — incomplete traceability',
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'urgent',
      title: 'Lacey Act / UFLPA: Supply chain transparency required',
      description: 'Complete supply chain transparency with full traceability is required to verify lawful sourcing.',
      dimension: 'Regulatory Alignment',
    });
  }

  const hasCOO = doc_status['certificate_of_origin'] === true || doc_status['country_of_origin'] === true;
  if (hasCOO) {
    met++;
    details.push('Lacey Act / UFLPA: Country-of-origin documentation present');
  } else {
    remediation.push({
      priority: 'urgent',
      title: 'Lacey Act / UFLPA: Country-of-origin documentation missing',
      description: 'Country-of-origin documentation is required to verify lawful harvesting and sourcing.',
      dimension: 'Regulatory Alignment',
    });
  }

  const forcedLaborRiskCountries = ['china', 'xinjiang', 'north korea', 'myanmar', 'eritrea', 'turkmenistan'];
  const sourceCountry = shipment.destination_country?.toLowerCase() || '';
  const hasForcedLaborRisk = forcedLaborRiskCountries.some(c => sourceCountry.includes(c));
  const hasForcedLaborDecl = doc_status['forced_labor_declaration'] === true || doc_status['uflpa_declaration'] === true;
  if (!hasForcedLaborRisk || hasForcedLaborDecl) {
    met++;
    if (hasForcedLaborRisk) {
      details.push('Lacey Act / UFLPA: Forced labor risk region — declaration obtained');
    } else {
      details.push('Lacey Act / UFLPA: Forced labor risk assessment — low risk');
    }
  } else {
    riskFlags.push({
      severity: 'critical',
      category: 'Lacey Act / UFLPA',
      message: 'Forced labor risk detected — UFLPA declaration missing',
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'urgent',
      title: 'UFLPA: Forced labor risk declaration required',
      description: 'Source region flagged for forced labor risk. A UFLPA forced labor declaration is required for import.',
      dimension: 'Regulatory Alignment',
    });
  }

  const hasSpeciesID = doc_status['species_identification'] === true || doc_status['product_identification'] === true;
  if (hasSpeciesID) {
    met++;
    details.push('Lacey Act / UFLPA: Species/product identification present');
  } else {
    remediation.push({
      priority: 'important',
      title: 'Lacey Act: Species/product identification needed',
      description: 'Species identification or product classification documentation is required for Lacey Act compliance (timber/minerals).',
      dimension: 'Regulatory Alignment',
    });
  }

  const hasImportDecl = doc_status['import_declaration'] === true || doc_status['lacey_act_declaration'] === true;
  if (hasImportDecl) {
    met++;
    details.push('Lacey Act / UFLPA: Import declaration compliance verified');
  } else {
    remediation.push({
      priority: 'important',
      title: 'Lacey Act: Import declaration required',
      description: 'An import declaration with species, quantity, and country of origin is required under the Lacey Act.',
      dimension: 'Regulatory Alignment',
    });
  }

  const totalFarms = items.reduce((sum, i) => sum + i.farm_count, 0);
  const allFarmsLinked = items.every(i => i.farm_count > 0);
  const allBagsLinked = batches.length === 0 || batches.every(b => b.batch_data!.bags_with_farm_link >= b.batch_data!.bag_count * 0.8);
  if (allFarmsLinked && allBagsLinked && totalFarms > 0) {
    met++;
    details.push(`Lacey Act / UFLPA: Supply chain mapping complete (${totalFarms} farms mapped)`);
  } else {
    riskFlags.push({
      severity: 'warning',
      category: 'Lacey Act / UFLPA',
      message: 'Supply chain mapping incomplete — not all nodes verified',
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'important',
      title: 'Lacey Act / UFLPA: Complete supply chain mapping',
      description: 'Full supply chain mapping from source to export point is required for compliance verification.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (met < 3) {
    riskFlags.push({
      severity: 'critical',
      category: 'Lacey Act / UFLPA',
      message: `Lacey Act / UFLPA compliance critically low: only ${met}/${total} requirements met`,
      is_hard_fail: false,
    });
  }

  details.push(`Lacey Act / UFLPA: ${met}/${total} requirements met`);

  return { met, total, details, riskFlags, remediation };
}
