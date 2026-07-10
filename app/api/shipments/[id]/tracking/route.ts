/**
 * /api/shipments/[id]/tracking
 *
 * GET   — tracking subscriptions + stored shipping events for a shipment.
 * POST  — create a tracking subscription for the shipment (provider-agnostic;
 *         'manual' until an external provider is wired in). Escrow auto-release
 *         is opt-in via auto_release_enabled and, even then, only affects
 *         stages 6–8 — the final tranche stays on dual confirmation.
 * PATCH — toggle auto_release_enabled on an existing subscription (e.g. the
 *         one Terminal49 auto-creates on stage 6, which always starts false).
 *         Admin-only: this is the literal switch for money automation, a
 *         higher bar than POST (logistics roles can create tracking
 *         subscriptions for visibility, but only an admin can opt one into
 *         releasing funds). Audit-logged with before/after state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { requireRole, ROLES } from '@/lib/rbac';
import { ApiError, withErrorHandling } from '@/lib/api/errors';
import { logAuditEvent } from '@/lib/audit';

async function loadShipmentForOrg(shipmentId: string, orgId: string) {
  const supabase = createAdminClient();
  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, org_id, container_number, bill_of_lading_number')
    .eq('id', shipmentId)
    .eq('org_id', orgId)
    .single();
  return shipment;
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  ctx: unknown
) => {
  const { params } = ctx as { params: Promise<{ id: string }> };
  const { id } = await params;

  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return ApiError.unauthorized();
  if (!profile?.org_id) return ApiError.forbidden('No organization assigned');

  const shipment = await loadShipmentForOrg(id, profile.org_id);
  if (!shipment) return ApiError.notFound('Shipment');

  const supabase = createAdminClient();
  const [{ data: subscriptions }, { data: events }] = await Promise.all([
    supabase
      .from('tracking_subscriptions')
      .select('*')
      .eq('shipment_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('shipping_events')
      .select('*')
      .eq('shipment_id', id)
      .order('event_time', { ascending: false })
      .limit(200),
  ]);

  return NextResponse.json({ subscriptions: subscriptions ?? [], events: events ?? [] });
}, 'shipments/tracking/GET');

const createSubscriptionSchema = z.object({
  provider: z.enum(['manual', 'mock']).default('manual'),
  provider_reference_id: z.string().min(1).max(120).optional(),
  container_number: z.string().min(4).max(20).optional(),
  bill_of_lading_number: z.string().min(4).max(40).optional(),
  carrier_scac: z.string().length(4).optional(),
  auto_release_enabled: z.boolean().default(false),
});

export const POST = withErrorHandling(async (
  request: NextRequest,
  ctx: unknown
) => {
  const { params } = ctx as { params: Promise<{ id: string }> };
  const { id } = await params;

  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return ApiError.unauthorized();
  if (!profile?.org_id) return ApiError.forbidden('No organization assigned');

  const roleError = requireRole(profile, ROLES.LOGISTICS_ROLES);
  if (roleError) return roleError;

  const parsed = createSubscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiError.validation(parsed.error);
  const body = parsed.data;

  const shipment = await loadShipmentForOrg(id, profile.org_id);
  if (!shipment) return ApiError.notFound('Shipment');

  const supabase = createAdminClient();
  const { data: subscription, error } = await supabase
    .from('tracking_subscriptions')
    .insert({
      org_id: profile.org_id,
      shipment_id: id,
      provider: body.provider,
      provider_reference_id: body.provider_reference_id ?? `${body.provider}:${id}`,
      container_number: body.container_number ?? shipment.container_number,
      bill_of_lading_number: body.bill_of_lading_number ?? shipment.bill_of_lading_number,
      carrier_scac: body.carrier_scac ?? null,
      auto_release_enabled: body.auto_release_enabled,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return ApiError.conflict('A tracking subscription with this provider reference already exists');
    }
    return ApiError.internal(error, 'shipments/tracking/POST');
  }

  await logAuditEvent({
    orgId: profile.org_id,
    actorId: user.id,
    actorEmail: user.email,
    action: 'shipment.tracking_subscribed',
    resourceType: 'tracking_subscription',
    resourceId: subscription.id,
    metadata: {
      shipmentId: id,
      provider: subscription.provider,
      autoReleaseEnabled: subscription.auto_release_enabled,
    },
  });

  return NextResponse.json({ subscription }, { status: 201 });
}, 'shipments/tracking/POST');

const patchSubscriptionSchema = z.object({
  // Optional: which subscription to update. If a shipment has exactly one
  // subscription, it's inferred; with more than one (e.g. a manual + a
  // Terminal49 subscription), it must be specified explicitly.
  subscription_id: z.string().uuid().optional(),
  auto_release_enabled: z.boolean(),
});

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  ctx: unknown
) => {
  const { params } = ctx as { params: Promise<{ id: string }> };
  const { id } = await params;

  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return ApiError.unauthorized();
  if (!profile?.org_id) return ApiError.forbidden('No organization assigned');

  // Admin-only: enabling auto_release_enabled is what actually authorizes the
  // trigger engine to move money on this subscription's future events.
  const roleError = requireRole(profile, ROLES.ADMIN_ONLY);
  if (roleError) return roleError;

  const parsed = patchSubscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiError.validation(parsed.error);
  const body = parsed.data;

  const shipment = await loadShipmentForOrg(id, profile.org_id);
  if (!shipment) return ApiError.notFound('Shipment');

  const supabase = createAdminClient();

  let subscriptionId = body.subscription_id;
  if (!subscriptionId) {
    const { data: candidates } = await supabase
      .from('tracking_subscriptions')
      .select('id')
      .eq('shipment_id', id)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (!candidates || candidates.length === 0) {
      return ApiError.notFound('Tracking subscription');
    }
    if (candidates.length > 1) {
      return ApiError.conflict(
        'Shipment has more than one tracking subscription — specify subscription_id'
      );
    }
    subscriptionId = candidates[0].id;
  }

  const { data: before } = await supabase
    .from('tracking_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .eq('shipment_id', id)
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (!before) return ApiError.notFound('Tracking subscription');

  if (before.auto_release_enabled === body.auto_release_enabled) {
    // No-op — return current state without writing or logging a change.
    return NextResponse.json({ subscription: before });
  }

  const { data: subscription, error } = await supabase
    .from('tracking_subscriptions')
    .update({
      auto_release_enabled: body.auto_release_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('org_id', profile.org_id)
    .select()
    .single();

  if (error) return ApiError.internal(error, 'shipments/tracking/PATCH');

  await logAuditEvent({
    orgId: profile.org_id,
    actorId: user.id,
    actorEmail: user.email,
    action: 'shipment.tracking_auto_release_toggled',
    resourceType: 'tracking_subscription',
    resourceId: subscription.id,
    metadata: {
      shipmentId: id,
      provider: subscription.provider,
      before: before.auto_release_enabled,
      after: subscription.auto_release_enabled,
    },
  });

  return NextResponse.json({ subscription });
}, 'shipments/tracking/PATCH');
