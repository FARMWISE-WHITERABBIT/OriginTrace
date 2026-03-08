import type { FrameworkScorerContext, FrameworkScorerResult } from './types';

export function scoreEUDR(ctx: FrameworkScorerContext): FrameworkScorerResult {
  const { input, allHaveGps, items, doc_status } = ctx;
  const details: string[] = [];
  const riskFlags: FrameworkScorerResult['riskFlags'] = [];
  const remediation: FrameworkScorerResult['remediation'] = [];
  let met = 0;
  const total = 4;

  const boundaryAnalyses = input.farm_boundary_analyses || [];
  if (boundaryAnalyses.length > 0) {
    const avgConfidence = boundaryAnalyses.reduce((s, b) => s + b.confidence_score, 0) / boundaryAnalyses.length;
    const lowConfidenceFarms = boundaryAnalyses.filter(b => b.confidence_level === 'low');

    if (avgConfidence >= 60 && lowConfidenceFarms.length === 0) {
      met++;
      details.push(`Boundary verification: ${boundaryAnalyses.length} farm(s) analyzed, avg confidence ${Math.round(avgConfidence)}/100`);
    } else {
      if (lowConfidenceFarms.length > 0) {
        riskFlags.push({
          severity: 'warning',
          category: 'Boundary Verification',
          message: `${lowConfidenceFarms.length} farm(s) have low boundary confidence — polygons may be fabricated`,
          is_hard_fail: false,
        });
        remediation.push({
          priority: 'important',
          title: 'EUDR: Low boundary confidence detected',
          description: `${lowConfidenceFarms.length} farm(s) have low confidence boundary polygons (avg ${Math.round(avgConfidence)}/100). Re-map with GPS walking for authentic boundaries.`,
          dimension: 'Regulatory Alignment',
        });
      }
      details.push(`Boundary verification: avg confidence ${Math.round(avgConfidence)}/100 (${lowConfidenceFarms.length} low-confidence)`);
    }
  } else {
    details.push('Boundary verification: No boundary analyses available');
    remediation.push({
      priority: 'recommended',
      title: 'EUDR: Run boundary authenticity analysis',
      description: 'Analyze farm boundary polygons to verify they represent authentic GPS-walked boundaries rather than drawn shapes.',
      dimension: 'Regulatory Alignment',
    });
  }

  if (allHaveGps) met++;
  else {
    remediation.push({
      priority: 'urgent',
      title: 'EUDR: GPS polygon data required',
      description: 'EUDR requires GPS polygon data for all farm plots linked to this shipment.',
      dimension: 'Regulatory Alignment',
    });
  }

  const deforestationChecks = input.farm_deforestation_checks || [];
  const allFarmIds = new Set<string>();
  for (const item of items) {
    if (item.farm_ids) {
      for (const fid of item.farm_ids) {
        allFarmIds.add(fid);
      }
    }
  }

  if (deforestationChecks.length > 0) {
    const checkedFarmIds = new Set(deforestationChecks.map((c) => c.farm_id));
    const uncheckedFarms = allFarmIds.size > 0
      ? [...allFarmIds].filter((fid) => !checkedFarmIds.has(fid))
      : [];

    const allDeforestationFree = deforestationChecks.every((c) => c.deforestation_free);
    const highRiskFarms = deforestationChecks.filter((c) => c.risk_level === 'high');

    if (allDeforestationFree && uncheckedFarms.length === 0) {
      met++;
      details.push(`Deforestation check: All ${deforestationChecks.length} farm(s) verified deforestation-free`);
    } else {
      if (highRiskFarms.length > 0) {
        riskFlags.push({
          severity: 'critical',
          category: 'Deforestation',
          message: `${highRiskFarms.length} farm(s) flagged as high deforestation risk`,
          is_hard_fail: false,
        });
        const totalLossHa = highRiskFarms.reduce((sum, c) => sum + c.forest_loss_hectares, 0);
        remediation.push({
          priority: 'urgent',
          title: 'EUDR: High deforestation risk detected',
          description: `${highRiskFarms.length} farm(s) show high deforestation risk with ${totalLossHa.toFixed(2)} hectares of forest loss. EUDR prohibits products from deforested land after Dec 31, 2020.`,
          dimension: 'Regulatory Alignment',
        });
      } else if (!allDeforestationFree) {
        const riskyFarms = deforestationChecks.filter((c) => !c.deforestation_free);
        riskFlags.push({
          severity: 'warning',
          category: 'Deforestation',
          message: `${riskyFarms.length} farm(s) have detected forest loss`,
          is_hard_fail: false,
        });
        remediation.push({
          priority: 'important',
          title: 'EUDR: Forest loss detected on linked farms',
          description: `${riskyFarms.length} farm(s) have recorded forest loss. Review deforestation check details to assess EUDR compliance risk.`,
          dimension: 'Regulatory Alignment',
        });
      }

      if (uncheckedFarms.length > 0) {
        remediation.push({
          priority: 'urgent',
          title: 'EUDR: Deforestation check pending for some farms',
          description: `${uncheckedFarms.length} farm(s) linked to this shipment have not been checked for deforestation. Run deforestation checks to complete EUDR compliance.`,
          dimension: 'Regulatory Alignment',
        });
        details.push(`Deforestation check: ${uncheckedFarms.length} farm(s) pending verification`);
      }
    }

    if (doc_status['deforestation_compliance'] === true) met++;
    else if (allDeforestationFree && uncheckedFarms.length === 0) {
      met++;
      details.push('Deforestation compliance auto-satisfied by verified farm checks');
    } else {
      remediation.push({
        priority: 'urgent',
        title: 'EUDR: Deforestation compliance declaration needed',
        description: 'A deforestation compliance declaration is required for EUDR. Ensure all farms pass deforestation checks first.',
        dimension: 'Regulatory Alignment',
      });
    }
  } else {
    if (allFarmIds.size > 0) {
      riskFlags.push({
        severity: 'warning',
        category: 'Deforestation',
        message: `Deforestation check pending for ${allFarmIds.size} farm(s) linked to this shipment`,
        is_hard_fail: false,
      });
      remediation.push({
        priority: 'urgent',
        title: 'EUDR: Deforestation check required',
        description: `No deforestation checks have been run for ${allFarmIds.size} farm(s) linked to this shipment. EUDR requires verification that products are not sourced from deforested land.`,
        dimension: 'Regulatory Alignment',
      });
      details.push(`Deforestation check: Pending for all ${allFarmIds.size} linked farm(s)`);
    } else if (doc_status['deforestation_compliance'] === true) {
      met++;
    } else {
      remediation.push({
        priority: 'urgent',
        title: 'EUDR: Deforestation compliance needed',
        description: 'A deforestation compliance declaration is required for EUDR. No farm deforestation data is available.',
        dimension: 'Regulatory Alignment',
      });
      details.push('Deforestation check: No farm data available for verification');
    }
  }

  details.push(`EUDR: ${met}/${total} requirements met`);

  return { met, total, details, riskFlags, remediation };
}
