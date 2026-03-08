import type { FrameworkScorerContext, FrameworkScorerResult } from './types';

export function scoreFSMA204(ctx: FrameworkScorerContext): FrameworkScorerResult {
  const { input, allTraceable, items, doc_status } = ctx;
  const details: string[] = [];
  const riskFlags: FrameworkScorerResult['riskFlags'] = [];
  const remediation: FrameworkScorerResult['remediation'] = [];
  const batches = ctx.batches;
  let met = 0;
  const total = 5;

  if (allTraceable) {
    met++;
    details.push('FSMA 204: Complete chain of custody verified');
  } else {
    riskFlags.push({
      severity: 'critical',
      category: 'FSMA 204',
      message: 'Lot-level traceability chain is incomplete',
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'urgent',
      title: 'FSMA 204: Complete chain of custody required',
      description: 'FSMA 204 requires lot-level traceability with complete chain of custody for all items.',
      dimension: 'Regulatory Alignment',
    });
  }

  const hasKDE = doc_status['kde_records'] === true || doc_status['key_data_elements'] === true;
  if (hasKDE) {
    met++;
    details.push('FSMA 204: Key Data Elements (KDE) records present');
  } else {
    remediation.push({
      priority: 'urgent',
      title: 'FSMA 204: Key Data Elements (KDE) records missing',
      description: 'KDE records capturing who, what, when, where for each traceability event are required under FSMA 204.',
      dimension: 'Regulatory Alignment',
    });
  }

  const hasCTE = doc_status['cte_log'] === true || doc_status['critical_tracking_events'] === true;
  if (hasCTE) {
    met++;
    details.push('FSMA 204: Critical Tracking Events (CTE) log present');
  } else {
    remediation.push({
      priority: 'urgent',
      title: 'FSMA 204: Critical Tracking Events (CTE) log missing',
      description: 'CTE log documenting growing, receiving, creating, transforming, and shipping events is required.',
      dimension: 'Regulatory Alignment',
    });
  }

  const hasLotTracking = items.every((i) => {
    if (i.item_type === 'batch' && i.batch_data) return i.batch_data.dispatched;
    if (i.item_type === 'finished_good' && i.finished_good_data) return i.finished_good_data.pedigree_verified;
    return false;
  });
  if (hasLotTracking) {
    met++;
  } else {
    remediation.push({
      priority: 'important',
      title: 'FSMA 204: Lot tracking verification gaps',
      description: 'All items must have verified lot tracking (dispatched batches, pedigree-verified finished goods).',
      dimension: 'Regulatory Alignment',
    });
  }

  const hasSupplierKYC = input.org_compliance_status === 'verified' || input.org_compliance_status === 'approved';
  const hasFoodSafety = doc_status['food_safety_plan'] === true || doc_status['haccp_certificate'] === true;
  if (hasSupplierKYC && hasFoodSafety) {
    met++;
    details.push('FSMA 204: Supplier KYC and food safety certifications verified');
  } else {
    if (!hasSupplierKYC) {
      riskFlags.push({
        severity: 'warning',
        category: 'FSMA 204',
        message: 'Supplier KYC status not verified',
        is_hard_fail: false,
      });
      remediation.push({
        priority: 'important',
        title: 'FSMA 204: Supplier KYC verification needed',
        description: 'Supplier know-your-customer verification is required for FSMA 204 compliance.',
        dimension: 'Regulatory Alignment',
      });
    }
    if (!hasFoodSafety) {
      remediation.push({
        priority: 'important',
        title: 'FSMA 204: Food safety certification missing',
        description: 'A food safety plan or HACCP certificate is required for FSMA 204 compliance.',
        dimension: 'Regulatory Alignment',
      });
    }
  }

  if (met < 3) {
    riskFlags.push({
      severity: 'critical',
      category: 'FSMA 204',
      message: `FSMA 204 compliance critically low: only ${met}/${total} requirements met`,
      is_hard_fail: false,
    });
  }

  details.push(`FSMA 204: ${met}/${total} requirements met`);

  return { met, total, details, riskFlags, remediation };
}
