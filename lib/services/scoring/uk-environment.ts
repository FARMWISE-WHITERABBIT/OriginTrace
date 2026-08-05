import type { FrameworkScorerContext, FrameworkScorerResult } from './types';

export function scoreUKEnvironmentAct(ctx: FrameworkScorerContext): FrameworkScorerResult {
  const { allHaveGps, doc_status, shipment } = ctx;
  const details: string[] = [];
  const riskFlags: FrameworkScorerResult['riskFlags'] = [];
  const remediation: FrameworkScorerResult['remediation'] = [];
  let met = 0;
  const total = 5;

  if (doc_status['due_diligence_assessment'] === true || doc_status['due_diligence_statement'] === true) {
    met++;
    details.push('UK Environment Act: Due diligence assessment present');
  } else {
    remediation.push({
      priority: 'urgent',
      title: 'UK Environment Act: Due diligence assessment required',
      description: 'A due diligence assessment demonstrating steps taken to assess and mitigate risk is required.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (doc_status['risk_assessment_report'] === true || doc_status['risk_assessment'] === true) {
    met++;
    details.push('UK Environment Act: Risk assessment scoring complete');
  } else {
    remediation.push({
      priority: 'urgent',
      title: 'UK Environment Act: Risk assessment scoring needed',
      description: 'A risk assessment report with scoring for supply chain environmental risk is required.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (allHaveGps) {
    met++;
    details.push('UK Environment Act: Polygon-level geo-verification satisfied');
  } else {
    riskFlags.push({
      severity: 'warning',
      category: 'UK Environment Act',
      message: 'Polygon-level geo-verification incomplete for linked farms',
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'important',
      title: 'UK Environment Act: Polygon geo-verification required',
      description: 'Farm plots must have polygon-level GPS boundaries for UK Environment Act compliance.',
      dimension: 'Regulatory Alignment',
    });
  }

  const hasLandTitle = doc_status['land_title'] === true || doc_status['land_use_documentation'] === true || doc_status['land_title___ownership_proof'] === true;
  if (hasLandTitle) {
    met++;
    details.push('UK Environment Act: Legality verification (land title docs) present');
  } else {
    remediation.push({
      priority: 'important',
      title: 'UK Environment Act: Land title documentation needed',
      description: 'Legality verification through land title or ownership documentation is required.',
      dimension: 'Regulatory Alignment',
    });
  }

  const destCountry = shipment.destination_country?.toLowerCase() || '';
  const isHighRiskCountry = ['nigeria', 'brazil', 'indonesia', 'congo', 'cameroon', 'ghana', 'ivory coast'].some(c => destCountry.includes(c));
  if (destCountry && !isHighRiskCountry) {
    met++;
    details.push('UK Environment Act: Country risk classified as standard');
  } else if (isHighRiskCountry) {
    riskFlags.push({
      severity: 'warning',
      category: 'UK Environment Act',
      message: `Source country classified as high-risk for deforestation`,
      is_hard_fail: false,
    });
    remediation.push({
      priority: 'important',
      title: 'UK Environment Act: High-risk country — enhanced due diligence needed',
      description: 'The source region is classified as high-risk for deforestation. Enhanced due diligence measures are required.',
      dimension: 'Regulatory Alignment',
    });
  } else {
    remediation.push({
      priority: 'recommended',
      title: 'UK Environment Act: Country risk classification pending',
      description: 'Set destination country to enable automatic country risk classification.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (met < 3) {
    riskFlags.push({
      severity: 'critical',
      category: 'UK Environment Act',
      message: `UK Environment Act compliance critically low: only ${met}/${total} requirements met`,
      is_hard_fail: false,
    });
  }

  details.push(`UK Environment Act: ${met}/${total} requirements met`);

  return { met, total, details, riskFlags, remediation };
}
