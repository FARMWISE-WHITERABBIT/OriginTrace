export type EscrowStatus = 'active' | 'completed' | 'disputed' | 'cancelled';
export type EscrowTransactionType = 'hold' | 'release' | 'forfeit' | 'refund';
export type EscrowDisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated';

export interface EscrowMilestone {
  milestone_id: string;
  stage: number;
  amount: number;
  description: string;
  released_at?: string;
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
