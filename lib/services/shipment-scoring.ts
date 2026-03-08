export interface ComplianceProfile {
  id: string;
  name: string;
  destination_market: string;
  regulation_framework: string;
  required_documents: string[];
  required_certifications: string[];
  geo_verification_level: string;
  min_traceability_depth: number;
  custom_rules?: Record<string, any>;
}

export interface FarmDeforestationCheck {
  farm_id: string;
  deforestation_free: boolean;
  forest_loss_hectares: number;
  forest_loss_percentage: number;
  analysis_date: string;
  data_source: string;
  risk_level: 'low' | 'medium' | 'high';
}

export interface ShipmentScoreInput {
  shipment: {
    id: string;
    destination_country: string | null;
    target_regulations: string[];
    doc_status: Record<string, boolean>;
    storage_controls: Record<string, boolean>;
    estimated_ship_date: string | null;
  };
  items: Array<{
    item_type: string;
    weight_kg: number;
    farm_count: number;
    traceability_complete: boolean;
    compliance_status: string;
    farm_ids?: string[];
    batch_data?: {
      has_gps: boolean;
      bag_count: number;
      bags_with_farm_link: number;
      dispatched: boolean;
      yield_validated: boolean;
    };
    finished_good_data?: {
      mass_balance_valid: boolean;
      pedigree_verified: boolean;
      processing_run_complete: boolean;
    };
  }>;
  org_compliance_status?: string;
  historical_rejection_rate?: number;
  cold_chain_alert_count?: number;
  cold_chain_total_entries?: number;
  lot_count?: number;
  lots_with_valid_mass_balance?: number;
  compliance_profile?: ComplianceProfile;
  farm_deforestation_checks?: FarmDeforestationCheck[];
}

export interface ScoreDimension {
  name: string;
  weight: number;
  score: number;
  weighted_score: number;
  details: string[];
}

export interface RiskFlag {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  is_hard_fail: boolean;
}

export interface RemediationItem {
  priority: 'urgent' | 'important' | 'recommended';
  title: string;
  description: string;
  dimension: string;
}

export type ReadinessDecision = 'go' | 'conditional' | 'no_go' | 'pending';

export interface ShipmentReadinessResult {
  overall_score: number;
  decision: ReadinessDecision;
  decision_label: string;
  dimensions: ScoreDimension[];
  risk_flags: RiskFlag[];
  remediation_items: RemediationItem[];
  summary: string;
}

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
      'UAE_Halal': 'UAE/Halal',
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

  const regulationScores: number[] = [];

  for (const reg of effectiveRegulations) {
    const regLower = reg.toLowerCase();
    let met = 0;
    let total = 0;

    if (regLower.includes('eudr')) {
      total = 3;
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
    } else if (regLower.includes('fsma') || regLower.includes('204')) {
      total = 5;

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
    } else if (regLower.includes('environment act')) {
      total = 5;

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
    } else if (regLower.includes('lacey') || regLower.includes('uflpa')) {
      total = 6;

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

    // ── China Green Trade Requirements ────────────────────────────────────────
    } else if (regLower.includes('china') || regLower.includes('green trade') || regLower.includes('china_green')) {
      total = 6;
      // China Green Trade focuses on: environmental certification, supply chain transparency,
      // phytosanitary compliance, carbon footprint documentation, quality standards,
      // and origin verification aligned with China's import regulations

      // 1. Environmental/organic certification
      const hasChinaEnvCert = (
        doc_status['china_green_certification'] === true ||
        doc_status['organic_certificate'] === true ||
        doc_status['green_food_certification'] === true ||
        doc_status['china_compulsory_certificate'] === true
      );
      if (hasChinaEnvCert) {
        met++;
        details.push('China Green Trade: Environmental/green certification verified');
      } else {
        riskFlags.push({
          severity: 'critical',
          category: 'China Green Trade',
          message: 'China Green Trade: Environmental certification missing',
          is_hard_fail: false,
        });
        remediation.push({
          priority: 'urgent',
          title: 'China Green Trade: Environmental certification required',
          description: 'China\'s Green Food or organic certification (or equivalent) is required for green trade designation. Obtain China Compulsory Certificate (CCC) or equivalent for commodities.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 2. Phytosanitary certificate
      const hasPhytosanitary = (
        doc_status['phytosanitary_certificate'] === true ||
        doc_status['plant_health_certificate'] === true
      );
      if (hasPhytosanitary) {
        met++;
        details.push('China Green Trade: Phytosanitary certificate present');
      } else {
        riskFlags.push({
          severity: 'critical',
          category: 'China Green Trade',
          message: 'Phytosanitary certificate missing — required for agricultural imports to China',
          is_hard_fail: false,
        });
        remediation.push({
          priority: 'urgent',
          title: 'China Green Trade: Phytosanitary certificate required',
          description: 'China requires a phytosanitary/plant health certificate from the exporting country\'s national plant protection authority for all agricultural commodities.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 3. Full supply chain traceability (China requires farm-to-port visibility)
      if (allTraceable && items.every(i => i.farm_count > 0)) {
        met++;
        details.push('China Green Trade: Farm-to-export traceability chain complete');
      } else {
        riskFlags.push({
          severity: 'warning',
          category: 'China Green Trade',
          message: 'Supply chain traceability incomplete — China requires farm-to-port visibility',
          is_hard_fail: false,
        });
        remediation.push({
          priority: 'important',
          title: 'China Green Trade: Complete supply chain traceability',
          description: 'China\'s green trade framework requires full farm-to-port traceability. Ensure all items are linked to verified farm origins.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 4. GPS/boundary data (China checks land use legitimacy)
      if (allHaveGps) {
        met++;
        details.push('China Green Trade: GPS origin verification complete');
      } else {
        remediation.push({
          priority: 'important',
          title: 'China Green Trade: GPS farm polygon data needed',
          description: 'China\'s green import framework increasingly requires verified GPS boundary data to confirm legitimate land use and deforestation-free sourcing.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 5. Quality and lab certificate
      const hasQualityDoc = (
        doc_status['quality_certificate'] === true ||
        doc_status['lab_test_certificate'] === true ||
        doc_status['pesticide_residue_test'] === true ||
        doc_status['aflatoxin_test'] === true
      );
      if (hasQualityDoc) {
        met++;
        details.push('China Green Trade: Quality/lab certificate present');
      } else {
        riskFlags.push({
          severity: 'warning',
          category: 'China Green Trade',
          message: 'Quality certificate or lab test results missing',
          is_hard_fail: false,
        });
        remediation.push({
          priority: 'important',
          title: 'China Green Trade: Quality certificate and pesticide/aflatoxin test required',
          description: 'China requires quality certificates and lab test results (pesticide residues, aflatoxin levels) meeting Chinese National Standards (GB) for food safety.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 6. Certificate of Origin + customs compliance
      const hasCOO = (
        doc_status['certificate_of_origin'] === true ||
        doc_status['country_of_origin'] === true
      );
      const hasCustomsDoc = doc_status['customs_declaration'] === true || doc_status['commercial_invoice'] === true;
      if (hasCOO && hasCustomsDoc) {
        met++;
        details.push('China Green Trade: Certificate of origin and customs documentation present');
      } else {
        const missing = [!hasCOO && 'certificate of origin', !hasCustomsDoc && 'customs/commercial documentation'].filter(Boolean).join(', ');
        remediation.push({
          priority: 'important',
          title: 'China Green Trade: Origin and customs documentation incomplete',
          description: `Missing: ${missing}. China customs requires certificate of origin and full commercial documentation for all agricultural imports.`,
          dimension: 'Regulatory Alignment',
        });
      }

      if (met < 4) {
        riskFlags.push({
          severity: 'critical',
          category: 'China Green Trade',
          message: `China Green Trade compliance critically low: only ${met}/${total} requirements met`,
          is_hard_fail: false,
        });
      }

      details.push(`China Green Trade: ${met}/${total} requirements met`);

    // ── UAE / Middle East Halal & Traceability ────────────────────────────────
    } else if (regLower.includes('uae') || regLower.includes('halal') || regLower.includes('middle east') || regLower.includes('gulf')) {
      total = 6;
      // UAE/Middle East Halal framework: Halal certification, origin traceability,
      // ESMA standards, phytosanitary compliance, religious slaughter compliance (if applicable),
      // and quality mark compliance

      // 1. Halal certification
      const hasHalalCert = (
        doc_status['halal_certificate'] === true ||
        doc_status['halal_certification'] === true ||
        doc_status['islamic_certification'] === true
      );
      if (hasHalalCert) {
        met++;
        details.push('UAE/Halal: Halal certification verified');
      } else {
        riskFlags.push({
          severity: 'critical',
          category: 'UAE/Halal',
          message: 'Halal certification missing — mandatory for UAE/GCC food imports',
          is_hard_fail: true, // Hard fail: no halal cert = banned from UAE shelves
        });
        remediation.push({
          priority: 'urgent',
          title: 'UAE/Halal: Halal certification required',
          description: 'UAE Federal Law requires all food imports to carry valid Halal certification from an ESMA-accredited certification body. Without this, the shipment will be refused entry.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 2. ESMA conformity / UAE food safety standards
      const hasEsmaDoc = (
        doc_status['esma_certificate'] === true ||
        doc_status['uae_conformity_certificate'] === true ||
        doc_status['gulf_standards_certificate'] === true ||
        doc_status['quality_certificate'] === true
      );
      if (hasEsmaDoc) {
        met++;
        details.push('UAE/Halal: ESMA/UAE conformity documentation present');
      } else {
        remediation.push({
          priority: 'urgent',
          title: 'UAE/Halal: ESMA/conformity certificate required',
          description: 'UAE requires conformity with ESMA (Emirates Authority for Standardization and Metrology) standards. Obtain certification from an accredited conformity assessment body.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 3. Full traceability to farm level
      if (allTraceable && items.every(i => i.farm_count > 0)) {
        met++;
        details.push('UAE/Halal: Farm-level traceability chain complete');
      } else {
        riskFlags.push({
          severity: 'warning',
          category: 'UAE/Halal',
          message: 'UAE: Full farm-origin traceability required for halal food assurance',
          is_hard_fail: false,
        });
        remediation.push({
          priority: 'important',
          title: 'UAE/Halal: Complete farm-origin traceability required',
          description: 'UAE halal standards increasingly require farm-to-port traceability to verify the entire supply chain meets halal requirements.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 4. Certificate of Origin (critical for GCC customs)
      const hasCOO = (
        doc_status['certificate_of_origin'] === true ||
        doc_status['country_of_origin'] === true
      );
      if (hasCOO) {
        met++;
        details.push('UAE/Halal: Certificate of origin verified');
      } else {
        remediation.push({
          priority: 'urgent',
          title: 'UAE/Halal: Certificate of origin required',
          description: 'GCC customs requires a certificate of origin for all food imports. This document is also required to verify the halal supply chain.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 5. Phytosanitary / food safety test
      const hasPhytoOrLabTest = (
        doc_status['phytosanitary_certificate'] === true ||
        doc_status['lab_test_certificate'] === true ||
        doc_status['food_safety_certificate'] === true ||
        doc_status['pesticide_residue_test'] === true
      );
      if (hasPhytoOrLabTest) {
        met++;
        details.push('UAE/Halal: Phytosanitary/food safety documentation present');
      } else {
        remediation.push({
          priority: 'important',
          title: 'UAE/Halal: Phytosanitary or food safety certificate required',
          description: 'UAE food import regulations require phytosanitary certificates and/or lab test results confirming product meets UAE food safety standards.',
          dimension: 'Regulatory Alignment',
        });
      }

      // 6. GPS / deforestation-free verification (UAE ESG sourcing)
      const hasDeforestationCheck = (input.farm_deforestation_checks || []).length > 0;
      const allDefoFree = (input.farm_deforestation_checks || []).every(c => c.deforestation_free);
      if (allHaveGps && (hasDeforestationCheck ? allDefoFree : true)) {
        met++;
        details.push('UAE/Halal: GPS origin and deforestation verification satisfactory');
      } else {
        remediation.push({
          priority: 'recommended',
          title: 'UAE/Halal: GPS origin verification strengthens ESG compliance',
          description: 'UAE buyers increasingly require verified GPS farm boundaries and deforestation-free status as part of responsible sourcing standards.',
          dimension: 'Regulatory Alignment',
        });
      }

      if (met < 4) {
        riskFlags.push({
          severity: 'critical',
          category: 'UAE/Halal',
          message: `UAE/Halal compliance critically low: only ${met}/${total} requirements met`,
          is_hard_fail: false,
        });
      }

      details.push(`UAE/Halal: ${met}/${total} requirements met`);

    } else if (regLower.includes('buyer') || regLower.includes('custom')) {
      const customRules = profile?.custom_rules || {};
      total = 5;

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
    } else {
      total = 1;
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
    }

    regulationScores.push(total > 0 ? (met / total) * 100 : 100);
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
