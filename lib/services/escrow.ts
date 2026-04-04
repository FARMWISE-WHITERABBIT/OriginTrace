/**
 * Escrow Service (WS-I Sprint 10)
 *
 * Manages fund holds, milestone releases, and dispute workflows for
 * buyer–exporter deals. All mutations emit audit events and webhooks.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import type { EscrowAccount, EscrowDispute, EscrowMilestone, EscrowStatusResult } from '@/lib/types/escrow';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns the escrow account and any open dispute for a given shipment.
 * Used by advance-stage to check if a release is currently blocked.
 */
export async function getEscrowStatus(shipmentId: string): Promise<EscrowStatusResult> {
  const supabase = createAdminClient();

  const { data: escrow } = await supabase
    .from('escrow_accounts')
    .select('*')
    .eq('shipment_id', shipmentId)
    .maybeSingle();

  if (!escrow) return { escrow: null, hasOpenDispute: false, openDispute: null };

  const { data: dispute } = await supabase
    .from('escrow_disputes')
    .select('*')
    .eq('escrow_id', escrow.id)
    .in('status', ['open', 'under_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    escrow: escrow as EscrowAccount,
    hasOpenDispute: !!dispute,
    openDispute: (dispute as EscrowDispute) ?? null,
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export interface CreateEscrowParams {
  orgId: string;
  buyerOrgId?: string;
  contractId?: string;
  shipmentId?: string;
  currency: string;
  totalAmount: number;
  milestones?: EscrowMilestone[];
  createdBy: string;
  actorEmail?: string;
}

/**
 * Initializes a new escrow account and records an initial hold transaction
 * for the full amount.
 */
export async function createEscrow(params: CreateEscrowParams): Promise<EscrowAccount> {
  const supabase = createAdminClient();

  const { data: escrow, error } = await supabase
    .from('escrow_accounts')
    .insert({
      org_id: params.orgId,
      buyer_org_id: params.buyerOrgId ?? null,
      contract_id: params.contractId ?? null,
      shipment_id: params.shipmentId ?? null,
      currency: params.currency,
      total_amount: params.totalAmount,
      held_amount: params.totalAmount,
      released_amount: 0,
      status: 'active',
      milestone_config: params.milestones ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error || !escrow) throw new Error(error?.message ?? 'Failed to create escrow');

  // Record initial hold transaction
  await supabase.from('escrow_transactions').insert({
    escrow_id: escrow.id,
    type: 'hold',
    amount: params.totalAmount,
    currency: params.currency,
    actor_id: params.createdBy,
    reason: 'Initial escrow hold',
  });

  await logAuditEvent({
    orgId: params.orgId,
    actorId: params.createdBy,
    actorEmail: params.actorEmail,
    action: 'escrow.created',
    resourceType: 'escrow_account',
    resourceId: escrow.id,
    metadata: {
      totalAmount: params.totalAmount,
      currency: params.currency,
      shipmentId: params.shipmentId,
      contractId: params.contractId,
    },
  });

  dispatchWebhookEvent(params.orgId, 'escrow.held', {
    escrow_id: escrow.id,
    shipment_id: params.shipmentId,
    contract_id: params.contractId,
    amount: params.totalAmount,
    currency: params.currency,
  });

  return escrow as EscrowAccount;
}

export interface ReleaseMilestoneParams {
  escrowId: string;
  milestoneId: string;
  actorId: string;
  actorEmail?: string;
  orgId: string;
}

/**
 * Releases funds for a specific milestone. Blocked if an open dispute exists.
 */
export async function releaseMilestone(params: ReleaseMilestoneParams): Promise<void> {
  const supabase = createAdminClient();

  const { data: escrow } = await supabase
    .from('escrow_accounts')
    .select('*')
    .eq('id', params.escrowId)
    .single();

  if (!escrow) throw new Error('Escrow account not found');
  if (escrow.status === 'disputed') throw new Error('Release blocked: escrow has an active dispute');
  if (escrow.status !== 'active') throw new Error(`Escrow is ${escrow.status} — no release possible`);

  const milestones: EscrowMilestone[] = escrow.milestone_config ?? [];
  const milestone = milestones.find((m) => m.milestone_id === params.milestoneId);
  if (!milestone) throw new Error(`Milestone ${params.milestoneId} not found in escrow config`);
  if (milestone.released_at) throw new Error(`Milestone ${params.milestoneId} has already been released`);

  const releaseAmount = milestone.amount;
  const newReleasedAmount = Number(escrow.released_amount) + releaseAmount;
  const newHeldAmount = Number(escrow.held_amount) - releaseAmount;
  const allReleased = newReleasedAmount >= Number(escrow.total_amount);

  // Mark milestone as released in config
  const updatedMilestones = milestones.map((m) =>
    m.milestone_id === params.milestoneId
      ? { ...m, released_at: new Date().toISOString() }
      : m
  );

  await supabase
    .from('escrow_accounts')
    .update({
      held_amount: newHeldAmount,
      released_amount: newReleasedAmount,
      status: allReleased ? 'completed' : 'active',
      milestone_config: updatedMilestones,
    })
    .eq('id', params.escrowId);

  await supabase.from('escrow_transactions').insert({
    escrow_id: params.escrowId,
    type: 'release',
    amount: releaseAmount,
    currency: escrow.currency,
    milestone_id: params.milestoneId,
    actor_id: params.actorId,
    reason: `Milestone release: ${milestone.description}`,
  });

  await logAuditEvent({
    orgId: params.orgId,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    action: 'escrow.milestone_released',
    resourceType: 'escrow_account',
    resourceId: params.escrowId,
    metadata: { milestoneId: params.milestoneId, amount: releaseAmount, currency: escrow.currency },
  });

  dispatchWebhookEvent(params.orgId, 'escrow.released', {
    escrow_id: params.escrowId,
    milestone_id: params.milestoneId,
    amount: releaseAmount,
    currency: escrow.currency,
    all_released: allReleased,
  });
}

export interface OpenDisputeParams {
  escrowId: string;
  reason: string;
  raisedBy: string;
  actorEmail?: string;
  orgId: string;
}

/**
 * Opens a dispute on an escrow account. Sets the escrow to 'disputed',
 * blocking any further milestone releases until the dispute is resolved.
 */
export async function openDispute(params: OpenDisputeParams): Promise<EscrowDispute> {
  const supabase = createAdminClient();

  const { data: escrow } = await supabase
    .from('escrow_accounts')
    .select('id, status, org_id, shipment_id')
    .eq('id', params.escrowId)
    .single();

  if (!escrow) throw new Error('Escrow account not found');
  if (escrow.status === 'completed' || escrow.status === 'cancelled') {
    throw new Error(`Cannot raise dispute on a ${escrow.status} escrow`);
  }

  const { data: dispute, error } = await supabase
    .from('escrow_disputes')
    .insert({
      escrow_id: params.escrowId,
      raised_by: params.raisedBy,
      reason: params.reason,
      status: 'open',
    })
    .select()
    .single();

  if (error || !dispute) throw new Error(error?.message ?? 'Failed to open dispute');

  await supabase
    .from('escrow_accounts')
    .update({ status: 'disputed' })
    .eq('id', params.escrowId);

  await logAuditEvent({
    orgId: params.orgId,
    actorId: params.raisedBy,
    actorEmail: params.actorEmail,
    action: 'escrow.dispute_opened',
    resourceType: 'escrow_dispute',
    resourceId: dispute.id,
    metadata: { escrowId: params.escrowId, reason: params.reason },
  });

  dispatchWebhookEvent(params.orgId, 'escrow.disputed', {
    escrow_id: params.escrowId,
    dispute_id: dispute.id,
    reason: params.reason,
    shipment_id: escrow.shipment_id,
  });

  return dispute as EscrowDispute;
}

export interface ConfirmDisputeResolutionParams {
  disputeId: string;
  confirmingOrgId: string;
  confirmingUserId: string;
  actorEmail?: string;
}

/**
 * Records one party's confirmation of the dispute resolution.
 * Automatically resolves the dispute when both parties have confirmed
 * and unblocks the escrow.
 */
export async function confirmDisputeResolution(params: ConfirmDisputeResolutionParams): Promise<EscrowDispute> {
  const supabase = createAdminClient();

  const { data: dispute } = await supabase
    .from('escrow_disputes')
    .select('*, escrow_accounts!inner(org_id, buyer_org_id)')
    .eq('id', params.disputeId)
    .single();

  if (!dispute) throw new Error('Dispute not found');
  if (dispute.status === 'resolved') throw new Error('Dispute is already resolved');

  const escrowOrgId: string = (dispute.escrow_accounts as any).org_id;
  const escrowBuyerOrgId: string | null = (dispute.escrow_accounts as any).buyer_org_id;

  const isExporter = params.confirmingOrgId === escrowOrgId;
  const isBuyer = params.confirmingOrgId === escrowBuyerOrgId;

  if (!isExporter && !isBuyer) {
    throw new Error('Only parties to the escrow can confirm resolution');
  }

  const updateFields: Record<string, boolean> = {};
  if (isExporter) updateFields.exporter_confirmed = true;
  if (isBuyer) updateFields.buyer_confirmed = true;

  const { data: updated } = await supabase
    .from('escrow_disputes')
    .update(updateFields)
    .eq('id', params.disputeId)
    .select()
    .single();

  if (!updated) throw new Error('Failed to update dispute');

  // Auto-resolve if both parties have confirmed
  if (updated.exporter_confirmed && updated.buyer_confirmed) {
    await supabase
      .from('escrow_disputes')
      .update({
        status: 'resolved',
        resolved_by: params.confirmingUserId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', params.disputeId);

    // Restore escrow to active if no other open disputes remain
    const { count } = await supabase
      .from('escrow_disputes')
      .select('id', { count: 'exact', head: true })
      .eq('escrow_id', updated.escrow_id)
      .in('status', ['open', 'under_review']);

    if ((count ?? 0) === 0) {
      await supabase
        .from('escrow_accounts')
        .update({ status: 'active' })
        .eq('id', updated.escrow_id);
    }

    await logAuditEvent({
      orgId: escrowOrgId,
      actorId: params.confirmingUserId,
      actorEmail: params.actorEmail,
      action: 'escrow.dispute_resolved',
      resourceType: 'escrow_dispute',
      resourceId: params.disputeId,
      metadata: { escrowId: updated.escrow_id, dualConfirmation: true },
    });

    dispatchWebhookEvent(escrowOrgId, 'dispute.resolved', {
      dispute_id: params.disputeId,
      escrow_id: updated.escrow_id,
      resolved_by: params.confirmingUserId,
    });
  }

  return updated as EscrowDispute;
}
