import type { FrameworkScorerContext, FrameworkScorerResult } from './types';

export function scoreChinaGreenTrade(ctx: FrameworkScorerContext): FrameworkScorerResult {
  const { allHaveGps, allTraceable, items, doc_status, profile } = ctx;
  const details: string[] = [];
  const riskFlags: FrameworkScorerResult['riskFlags'] = [];
  const remediation: FrameworkScorerResult['remediation'] = [];
  let met = 0;
  const total = 6;

  if (doc_status['gacc_registration'] || doc_status['gacc_certificate']) {
    met++;
    details.push('GACC registration: Verified');
  } else {
    riskFlags.push({
      severity: 'critical',
      category: 'China Green Trade',
      message: 'GACC (General Administration of Customs of China) registration not verified',
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'urgent',
      title: 'GACC Registration Required',
      description: 'China requires all food exporters to be registered with GACC. Upload your GACC registration certificate.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (doc_status['gb_standards'] || doc_status['quality_certificate']) {
    met++;
    details.push('GB Standards compliance: Certificate provided');
  } else {
    remediation.push({
      priority: 'important',
      title: 'GB Standards Compliance Certificate',
      description: 'Products must meet China GB national standards. Upload a GB standards compliance or quality test certificate.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (allTraceable) {
    const allLotLevel = items.every(item =>
      item.batch_data?.bag_count ? item.batch_data.bags_with_farm_link === item.batch_data.bag_count : true
    );
    if (allLotLevel) {
      met++;
      details.push('Lot-level traceability: Complete');
    } else {
      details.push('Lot-level traceability: Partial — not all bags linked to farms');
      remediation.push({
        priority: 'important',
        title: 'Complete Lot-Level Traceability',
        description: 'China Green Trade requires lot-level traceability. Ensure all bags are linked to source farms.',
        dimension: 'Regulatory Alignment',
      });
    }
  } else {
    remediation.push({
      priority: 'urgent',
      title: 'Traceability Incomplete',
      description: 'All items must be fully traceable to source farms for China market access.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (doc_status['phytosanitary'] || doc_status['phytosanitary_certificate']) {
    met++;
    details.push('Phytosanitary certificate: Present');
  } else {
    riskFlags.push({
      severity: 'warning',
      category: 'China Green Trade',
      message: 'Phytosanitary certificate missing — required by SAMR for agricultural imports',
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'urgent',
      title: 'Phytosanitary Certificate Required',
      description: 'All agricultural exports to China require a phytosanitary certificate issued by the origin country.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (doc_status['fumigation'] || doc_status['fumigation_certificate']) {
    met++;
    details.push('Fumigation certificate: Present');
  } else {
    remediation.push({
      priority: 'important',
      title: 'Fumigation Certificate',
      description: 'China customs may require fumigation certificates for certain agricultural commodities.',
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
      description: 'A certificate of origin is required for preferential tariff treatment and customs clearance in China.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (profile?.custom_rules) {
    const rules = profile.custom_rules;
    if (rules.requires_inspection_report && !doc_status['inspection_report']) {
      riskFlags.push({
        severity: 'warning',
        category: 'China Green Trade',
        message: 'Profile requires inspection report but none uploaded',
        is_hard_fail: false,
      });
    }
  }

  details.unshift(`China Green Trade: ${met}/${total} requirements met`);

  return { met, total, details, riskFlags, remediation };
}
