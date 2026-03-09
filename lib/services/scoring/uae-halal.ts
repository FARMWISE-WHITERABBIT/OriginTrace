import type { FrameworkScorerContext, FrameworkScorerResult } from './types';

export function scoreUAEHalal(ctx: FrameworkScorerContext): FrameworkScorerResult {
  const { allHaveGps, allTraceable, doc_status, profile } = ctx;
  const details: string[] = [];
  const riskFlags: FrameworkScorerResult['riskFlags'] = [];
  const remediation: FrameworkScorerResult['remediation'] = [];
  let met = 0;
  const total = 5;

  if (doc_status['halal_certificate'] || doc_status['halal_certification']) {
    met++;
    details.push('Halal certification: Verified (accredited body)');
  } else {
    riskFlags.push({
      severity: 'critical',
      category: 'UAE / Halal',
      message: 'Halal certification from an accredited body is required for UAE market access',
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'urgent',
      title: 'Halal Certification Required',
      description: 'Products exported to the UAE must carry Halal certification from an internationally accredited body recognized by ESMA (Emirates Authority for Standardization and Metrology).',
      dimension: 'Regulatory Alignment',
    });
  }

  if (doc_status['esma_compliance'] || doc_status['uae_standards']) {
    met++;
    details.push('ESMA compliance: Certificate provided');
  } else {
    remediation.push({
      priority: 'important',
      title: 'ESMA Standards Compliance',
      description: 'Products must meet UAE.S (UAE Standards) or equivalent GSO (Gulf Standardization Organization) standards. Upload ESMA compliance documentation.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (doc_status['moccae_permit'] || doc_status['import_permit']) {
    met++;
    details.push('MOCCAE import permit: Present');
  } else {
    riskFlags.push({
      severity: 'warning',
      category: 'UAE / Halal',
      message: 'MOCCAE import permit not found — required for agricultural imports to UAE',
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'urgent',
      title: 'MOCCAE Import Permit',
      description: 'The Ministry of Climate Change and Environment (MOCCAE) requires an import permit for agricultural products entering the UAE.',
      dimension: 'Regulatory Alignment',
    });
  }

  const hasLabeling = doc_status['labeling_compliance'] || doc_status['product_label'];
  if (hasLabeling) {
    met++;
    details.push('UAE labeling requirements: Compliant');
  } else {
    remediation.push({
      priority: 'important',
      title: 'UAE Labeling Compliance',
      description: 'Products must comply with UAE labeling regulations including Arabic language labels, ingredient listing, nutrition facts, and Halal marking per GSO 9/2007.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (doc_status['certificate_of_origin'] || doc_status['origin_certificate']) {
    met++;
    details.push('Certificate of origin: Present');
  } else {
    remediation.push({
      priority: 'important',
      title: 'Certificate of Origin Required',
      description: 'A certificate of origin is required for UAE customs clearance and may qualify for preferential tariff treatment under GCC agreements.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (!allHaveGps) {
    riskFlags.push({
      severity: 'info',
      category: 'UAE / Halal',
      message: 'GPS verification is recommended for premium UAE buyers seeking full supply chain transparency',
      is_hard_fail: false,
    });
  }

  if (profile?.custom_rules) {
    const rules = profile.custom_rules;
    if (rules.requires_health_certificate && !doc_status['health_certificate']) {
      riskFlags.push({
        severity: 'warning',
        category: 'UAE / Halal',
        message: 'Profile requires health certificate but none uploaded',
        is_hard_fail: false,
      });
    }
  }

  details.unshift(`UAE / Halal: ${met}/${total} requirements met`);

  return { met, total, details, riskFlags, remediation };
}
