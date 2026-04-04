/**
 * OriginTrace — 9-Stage Shipment Pipeline
 *
 * Defines the structured pipeline stages from PRD §7.1 and the gate conditions
 * that must be satisfied before a shipment can advance to the next stage.
 * Stage definitions are in code (not the database) for maintainability.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal shipment shape needed to evaluate gate conditions */
export interface ShipmentForGate {
  id: string;
  current_stage: number;
  compliance_profile_id: string | null;
  purchase_order_number: string | null;
  inspection_body: string | null;
  inspection_result: string | null;
  doc_status: Record<string, unknown>;
  clearing_agent_name: string | null;
  customs_declaration_number: string | null;
  exit_certificate_number: string | null;
  freight_forwarder_name: string | null;
  vessel_name: string | null;
  etd: string | null;
  eta: string | null;
  container_number: string | null;
  container_seal_number: string | null;
  actual_departure_date: string | null;
  bill_of_lading_number: string | null;
  actual_arrival_date: string | null;
  shipment_outcome: string | null;
  target_regulations: string[];
  readiness_score?: number | null;
  readiness_decision?: string | null;
}

export interface StageGateResult {
  valid: boolean;
  blockers: string[];
  warnings: string[];
}

export interface StageDefinition {
  stage: number;
  name: string;
  description: string;
  /** Fields on the shipment record that must be non-null to pass the gate */
  requiredFields: (keyof ShipmentForGate)[];
  /** doc_status keys that must be truthy to pass the gate */
  requiredDocTypes?: string[];
  /** Custom validator for complex gate conditions */
  customValidator?: (shipment: ShipmentForGate) => string[];
}

// ─── Stage definitions (PRD §7.1) ─────────────────────────────────────────────

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stage: 1,
    name: 'Preparation',
    description: 'Commodity and lot assigned · Buyer/contract confirmed · PO number recorded · Compliance profile selected',
    requiredFields: ['compliance_profile_id', 'purchase_order_number'],
  },
  {
    stage: 2,
    name: 'Quality & Certification',
    description: 'Lab tests commissioned · Lab results uploaded · Grade cert obtained · Pre-shipment inspection completed',
    requiredFields: ['inspection_body', 'inspection_result'],
    customValidator: (s) => {
      const errors: string[] = [];
      if (s.inspection_result === 'fail') {
        errors.push('Pre-shipment inspection result is FAIL. Resolve inspection issues before advancing to Documentation.');
      }
      return errors;
    },
  },
  {
    stage: 3,
    name: 'Documentation',
    description: 'Export licence · COO · Phyto cert · Commercial invoice · Packing list · DDS submitted for EUDR markets',
    requiredFields: [],
    requiredDocTypes: ['commercial_invoice', 'packing_list'],
    customValidator: (s) => {
      const errors: string[] = [];
      const isEUDR = s.target_regulations.some((r) =>
        ['EUDR', 'EU', 'UK_Environment_Act', 'UK'].includes(r)
      );
      if (isEUDR && !(s.doc_status as Record<string, unknown>)['phyto']) {
        errors.push('Phytosanitary certificate is required for EU/UK-bound shipments.');
      }
      if (isEUDR && !(s.doc_status as Record<string, unknown>)['coo']) {
        errors.push('Certificate of Origin is required for EU/UK-bound shipments.');
      }
      return errors;
    },
  },
  {
    stage: 4,
    name: 'Customs & Clearance',
    description: 'Clearing agent assigned · NCS/NESS declaration reference recorded · Exit certificate obtained',
    requiredFields: ['clearing_agent_name', 'customs_declaration_number', 'exit_certificate_number'],
  },
  {
    stage: 5,
    name: 'Freight & Vessel',
    description: 'Freight forwarder assigned · Vessel name and IMO · Booking reference · ETD and ETA confirmed',
    requiredFields: ['freight_forwarder_name', 'vessel_name', 'etd', 'eta'],
  },
  {
    stage: 6,
    name: 'Container Stuffing',
    description: 'Stuffing date recorded · Container sealed · Seal number recorded',
    requiredFields: ['container_number', 'container_seal_number'],
  },
  {
    stage: 7,
    name: 'Departure',
    description: 'Container delivered to port · Vessel confirmed departed · BL original received',
    requiredFields: ['actual_departure_date', 'bill_of_lading_number'],
  },
  {
    stage: 8,
    name: 'Arrival & Clearance',
    description: 'ETA confirmed · Destination customs cleared · Buyer receipt confirmed',
    requiredFields: ['actual_arrival_date'],
  },
  {
    stage: 9,
    name: 'Close',
    description: 'Final payment received · Outcome recorded · Shipment archived',
    requiredFields: ['shipment_outcome'],
  },
];

/** Maps pipeline stage (1–9) to the legacy status field value */
export const STAGE_TO_LEGACY_STATUS: Record<number, string> = {
  1: 'draft',
  2: 'draft',
  3: 'draft',
  4: 'pending',
  5: 'pending',
  6: 'booked',
  7: 'in_transit',
  8: 'in_transit',
  9: 'delivered',
};

// ─── Gate validator ────────────────────────────────────────────────────────────

/**
 * Validates whether a shipment can advance to the given target stage.
 * Checks gate conditions for all stages from current+1 up to targetStage.
 *
 * @param shipment    Current shipment record
 * @param targetStage Stage to advance to (must be current_stage + 1)
 */
export function validateStageGate(
  shipment: ShipmentForGate,
  targetStage: number
): StageGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (targetStage < 1 || targetStage > 9) {
    return { valid: false, blockers: ['Stage must be between 1 and 9.'], warnings };
  }

  if (targetStage <= shipment.current_stage) {
    return {
      valid: false,
      blockers: [
        `Shipment is already at stage ${shipment.current_stage}. Stages cannot go backwards.`,
      ],
      warnings,
    };
  }

  if (targetStage > shipment.current_stage + 1) {
    return {
      valid: false,
      blockers: [
        `Cannot skip stages. Shipment is at stage ${shipment.current_stage}; advance one stage at a time.`,
      ],
      warnings,
    };
  }

  // Find the gate definition for the current stage (the one being completed)
  const gate = STAGE_DEFINITIONS.find((d) => d.stage === shipment.current_stage);
  if (!gate) return { valid: true, blockers: [], warnings };

  // Check required fields
  for (const field of gate.requiredFields) {
    if (!shipment[field]) {
      blockers.push(
        `Stage ${gate.stage} (${gate.name}) requires "${String(field)}" to be set before advancing.`
      );
    }
  }

  // Check required document types
  if (gate.requiredDocTypes) {
    for (const docType of gate.requiredDocTypes) {
      if (!shipment.doc_status[docType]) {
        blockers.push(
          `Stage ${gate.stage} (${gate.name}) requires document "${docType}" to be uploaded before advancing.`
        );
      }
    }
  }

  // Run custom validator
  if (gate.customValidator) {
    const customErrors = gate.customValidator(shipment);
    blockers.push(...customErrors);
  }

  return {
    valid: blockers.length === 0,
    blockers,
    warnings,
  };
}

/**
 * Readiness hard-gate validator.
 *
 * PRD-aligned behavior:
 * - Before Departure (Stage 7), readiness must be >= 80 and decision cannot be NO_GO.
 * - This is an API-layer gate so stage advancement cannot bypass it.
 */
export function validateReadinessHardGate(
  shipment: ShipmentForGate,
  targetStage: number
): StageGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Apply hard gate from Stage 7 onward (Departure and beyond)
  if (targetStage >= 7) {
    const score = shipment.readiness_score ?? null;
    const decision = (shipment.readiness_decision ?? '').toUpperCase();

    if (decision === 'NO_GO') {
      blockers.push('Shipment readiness decision is NO_GO. Resolve compliance blockers before departure.');
    }

    if (score === null || Number.isNaN(score)) {
      blockers.push('Shipment readiness score is missing. Recalculate readiness before departure.');
    } else if (score < 80) {
      blockers.push(`Shipment readiness score is ${score}. Minimum score is 80 before departure.`);
    }
  }

  return {
    valid: blockers.length === 0,
    blockers,
    warnings,
  };
}

/**
 * Build the stage_history entry for a transition.
 */
export function buildStageHistoryEntry(
  fromStage: number,
  toStage: number,
  actorId: string,
  note?: string
): Record<string, unknown> {
  return {
    from: fromStage,
    to: toStage,
    actor_id: actorId,
    timestamp: new Date().toISOString(),
    ...(note ? { note } : {}),
  };
}

/**
 * Build the stage_data update for the completed stage.
 */
export function buildStageCompletionData(
  existing: Record<string, unknown>,
  completedStage: number
): Record<string, unknown> {
  return {
    ...existing,
    [String(completedStage)]: {
      completed_at: new Date().toISOString(),
    },
  };
}
