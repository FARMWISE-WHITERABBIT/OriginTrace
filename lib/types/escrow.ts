export type EscrowStatus = 'active' | 'completed' | 'disputed' | 'cancelled';
export type EscrowTransactionType = 'hold' | 'release' | 'forfeit' | 'refund';
export type EscrowDisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated';

export interface EscrowMilestone {
  milestone_id: string;
  // Two real callers disagree on shape: app/api/escrow/route.ts uses a numeric shipment-pipeline
  // stage (1-9), app/api/shipments/[id]/payment-setup/route.ts uses a free-text label like
  // 'on_delivery'. Not read/compared anywhere in lib/services/escrow.ts, so kept permissive.
  stage: string | number;
  amount: number;
  description: string;
  released_at?: string;
  /**
   * Optional shipping-event code(s) (DCSA-style, e.g. 'LOAD', 'DEPA' — see
   * SHIPPING_EVENT_CODES in lib/services/shipping-events.ts) that this
   * milestone requires before the auto-release engine will match it. Multiple
   * conceptually distinct events map onto the same pipeline stage (LOAD/ISSU/
   * DEPA are all stage 7), so a stage-only match can release the wrong tranche
   * when an org configures several milestones at one stage. When set, the
   * engine only matches this milestone for those exact event codes; when
   * absent (all legacy milestone_config JSONB), the engine matches on stage
   * alone, exactly as before. Additive + optional — no migration needed.
   */
  trigger_event_code?: string | string[] | null;
}

export interface EscrowAccount {
  id: string;
  org_id: string;
  buyer_org_id: string | null;
  contract_id: string | null;
  shipment_id: string | null;
  currency: string;
  total_amount: number;
  held_amount: number;
  released_amount: number;
  status: EscrowStatus;
  milestone_config: EscrowMilestone[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EscrowTransaction {
  id: string;
  escrow_id: string;
  type: EscrowTransactionType;
  amount: number;
  currency: string;
  milestone_id: string | null;
  actor_id: string | null;
  reason: string | null;
  payment_id: string | null;
  created_at: string;
}

export interface EscrowDispute {
  id: string;
  escrow_id: string;
  raised_by: string;
  reason: string;
  status: EscrowDisputeStatus;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  exporter_confirmed: boolean;
  buyer_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface EscrowStatusResult {
  escrow: EscrowAccount | null;
  hasOpenDispute: boolean;
  openDispute: EscrowDispute | null;
}
