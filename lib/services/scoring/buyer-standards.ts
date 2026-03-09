import type { FrameworkScorerContext, FrameworkScorerResult } from './types';

export function scoreBuyerStandards(ctx: FrameworkScorerContext): FrameworkScorerResult {
  const { allHaveGps, allTraceable, items, doc_status, profile } = ctx;
  const details: string[] = [];
  const riskFlags: FrameworkScorerResult['riskFlags'] = [];
  const remediation: FrameworkScorerResult['remediation'] = [];
  const customRules = profile?.custom_rules || {};
  let met = 0;
  const total = 5;

  const profileDocs = profile?.required_documents || [];
  if (profileDocs.length > 0) {
    const presentDocs = profileDocs.filter(doc => {
      const key = doc.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      return doc_status[key] === true || Object.keys(doc_status).some(k =>
        k.toLowerCase().replace(/[^a-z0-9]+/g, '_') === key && doc_status[k] === true
      );
    });
    if (presentDocs.length >= profileDocs.length) {
      met++;
      details.push(`Buyer Standards: All ${profileDocs.length} required documents present`);
    } else {
      const missingCount = profileDocs.length - presentDocs.length;
      riskFlags.push({
        severity: missingCount > profileDocs.length / 2 ? 'critical' : 'warning',
        category: 'Buyer Standards',
        message: `${missingCount} buyer-required document(s) missing`,
        is_hard_fail: false,
      });
      remediation.push({
        priority: 'important',
        title: 'Buyer Standards: Complete required documentation',
        description: `${missingCount} of ${profileDocs.length} buyer-required documents are missing. Review the buyer compliance profile for specifics.`,
        dimension: 'Regulatory Alignment',
      });
    }
  } else {
    met++;
    details.push('Buyer Standards: No specific document requirements defined');
  }

  const requiredGeoLevel = profile?.geo_verification_level || 'basic';
  const geoLevelMap: Record<string, number> = { basic: 1, polygon: 2, satellite: 3 };
  const achievedGeoLevel = allHaveGps ? (requiredGeoLevel === 'satellite' ? 3 : 2) : 1;
  if (achievedGeoLevel >= (geoLevelMap[requiredGeoLevel] || 1)) {
    met++;
    details.push(`Buyer Standards: Geo-verification level met (${requiredGeoLevel})`);
  } else {
    remediation.push({
      priority: 'important',
      title: `Buyer Standards: ${requiredGeoLevel}-level geo-verification required`,
      description: `Buyer profile requires ${requiredGeoLevel}-level geo-verification. Current data does not meet this threshold.`,
      dimension: 'Regulatory Alignment',
    });
  }

  const requiredDepth = profile?.min_traceability_depth || 1;
  const avgFarmCount = items.length > 0 ? items.reduce((sum, i) => sum + i.farm_count, 0) / items.length : 0;
  if (allTraceable && avgFarmCount >= requiredDepth) {
    met++;
    details.push(`Buyer Standards: Traceability depth met (depth ${requiredDepth})`);
  } else {
    remediation.push({
      priority: 'important',
      title: 'Buyer Standards: Traceability depth insufficient',
      description: `Buyer requires traceability depth of ${requiredDepth}. Ensure all items have complete traceability chains.`,
      dimension: 'Regulatory Alignment',
    });
  }

  const requiredCerts = profile?.required_certifications || [];
  if (requiredCerts.length > 0) {
    const certKeys = requiredCerts.map(c => c.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    const hasCerts = certKeys.every(ck =>
      doc_status[ck] === true || Object.keys(doc_status).some(k =>
        k.toLowerCase().replace(/[^a-z0-9]+/g, '_').includes(ck) && doc_status[k] === true
      )
    );
    if (hasCerts) {
      met++;
      details.push(`Buyer Standards: All ${requiredCerts.length} buyer certifications verified`);
    } else {
      remediation.push({
        priority: 'important',
        title: 'Buyer Standards: Buyer-specific certifications missing',
        description: `Required certifications: ${requiredCerts.join(', ')}. Ensure all are obtained and uploaded.`,
        dimension: 'Regulatory Alignment',
      });
    }
  } else {
    met++;
    details.push('Buyer Standards: No specific certifications required');
  }

  const esgMetrics = customRules?.esg_metrics || {};
  const labThresholds = customRules?.lab_test_thresholds || {};
  const hasCustomChecks = Object.keys(esgMetrics).length > 0 || Object.keys(labThresholds).length > 0;
  if (hasCustomChecks) {
    const hasLabTest = doc_status['lab_test_certificate'] === true;
    if (hasLabTest || Object.keys(labThresholds).length === 0) {
      met++;
      details.push('Buyer Standards: ESG/lab test thresholds satisfied');
    } else {
      riskFlags.push({
        severity: 'warning',
        category: 'Buyer Standards',
        message: 'Custom lab test thresholds defined but lab test certificate missing',
        is_hard_fail: false,
      });
      remediation.push({
        priority: 'important',
        title: 'Buyer Standards: Lab test results needed for custom thresholds',
        description: 'Buyer has defined custom lab test thresholds. Upload lab test certificate for verification.',
        dimension: 'Regulatory Alignment',
      });
    }
  } else {
    met++;
    details.push('Buyer Standards: No custom ESG/lab thresholds defined');
  }

  details.push(`Buyer Standards: ${met}/${total} requirements met`);

  return { met, total, details, riskFlags, remediation };
}
