/**
 * Cross-layer domain event types for OriginTrace.
 *
 * These events are fired synchronously within API routes and processed by
 * handlers that propagate changes across the platform's 5 layers.
 * External notifications (webhooks, org integrations) remain handled by
 * lib/webhooks.ts and lib/integrations/dispatcher.ts — unchanged.
 */

export type DomainEventName =
  | 'farm.registered'
  | 'batch.created'
  | 'lab_result.uploaded'
  | 'document.uploaded'
  | 'shipment.stage_advanced'
  | 'border_outcome.recorded'
  | 'farmer_input.recorded';

export interface DomainEvent<T = Record<string, unknown>> {
  name: DomainEventName;
  orgId: string;
  actorId: string;
  actorEmail?: string;
  payload: T;
  timestamp: string;
}

// ─── Typed payloads per event ─────────────────────────────────────────────────

export interface FarmRegisteredPayload {
  farmId: string;
  farmerId: string;
  farmerName: string;
  hasBoundary: boolean;
  commodity: string;
  community: string;
}

export interface BatchCreatedPayload {
  batchId: string;
  farmId: string;
  farmComplianceStatus: string;
  totalWeight: number;
  bagCount: number;
  targetMarkets?: string[]; // pulled from active org compliance profiles
}

export interface LabResultUploadedPayload {
  documentId: string;
  shipmentId?: string;
  batchId?: string;
  finishedGoodId?: string;
  testType: string; // 'aflatoxin' | 'pesticide_residue' | 'heavy_metal' | 'microbiological' | 'moisture'
  result: 'pass' | 'fail' | 'conditional';
  destinationMarkets: string[];
}

export interface DocumentUploadedPayload {
  documentId: string;
  shipmentId: string;
  docType: string;
  fileName: string;
  expiryDate?: string;
}

export interface ShipmentStageAdvancedPayload {
  shipmentId: string;
  previousStage: number;
  newStage: number;
  shipmentCode?: string;
  buyerEmail?: string;
  escrowEnabled?: boolean;
}

export interface BorderOutcomeRecordedPayload {
  shipmentId: string;
  outcome: 'accepted' | 'rejected' | 'conditional';
  rejectionReason?: string;
  destinationMarket: string;
}

export interface FarmerInputRecordedPayload {
  inputId: string;
  farmId: string;
  activeIngredient?: string;
  commodity: string;
  targetMarkets: string[];
}
