/**
 * POST /api/shipments/[id]/tracking/events
 *
 * Manually record a shipping event against the shipment's tracking
 * subscription. This is (a) the ops path for milestones a provider can't see
 * (e.g. origin-terminal gaps at Apapa/Tin Can), and (b) the end-to-end test
 * path for the escrow trigger engine before an external provider is wired in.
 *
 * Manual events flow through exactly the same ingest → decide → release
 * pipeline as webhook events: ACT-only, settlement delay, dispute freeze,
 * stage 6–8 only. Admin-only, and every event is audit-logged to the actor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { requireRole, ROLES } from '@/lib/rbac';
import { ApiError, withErrorHandling } from '@/lib/api/errors';
import { logAuditEvent } from '@/lib/audit';
import {
  SHIPPING_EVENT_CODES,
  ingestShippingEvent,
  processShippingEvent,
} from '@/lib/services/shipping-events';

const manualEventSchema = z.object({
  subscription_id: z.string().uuid().optional(),
  event_code: z.enum(SHIPPING_EVENT_CODES),
  classifier: z.enum(['ACT', 'EST', 'PLN']).default('ACT'),
  event_time: z.string().datetime({ offset: true }),
  location_locode: z.string().max(10).optional(),
  location_name: z.string().max(120).optional(),
  vessel_name: z.string().max(120).optional(),
  voyage_number: z.string().max(40).optional(),
  note: z.string().max(500).optional(),
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

  const roleError = requireRole(profile, ROLES.ADMIN_ONLY);
  if (roleError) return roleError;

  const parsed = manualEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiError.validation(parsed.error);
  const body = parsed.data;

  const supabase = createAdminClient();
  let query = supabase
    .from('tracking_subscriptions')
    .select('*')
    .eq('shipment_id', id)
    .eq('org_id', profile.org_id)
    .eq('status', 'active');
  if (body.subscription_id) query = query.eq('id', body.subscription_id);

  const { data: subscriptions } = await query.order('created_at', { ascending: true }).limit(1);
  const subscription = subscriptions?.[0];
  if (!subscription) {
    return ApiError.notFound('Active tracking subscription for this shipment');
  }

  const result = await ingestShippingEvent(subscription.provider, subscription.provider_reference_id, {
    providerEventId: `manual-${randomUUID()}`,
    eventCode: body.event_code,
    classifier: body.classifier,
    eventTime: body.event_time,
    locationLocode: body.location_locode,
    locationName: body.location_name,
    vesselName: body.vessel_name,
    voyageNumber: body.voyage_number,
    raw: { source: 'manual', recorded_by: user.id, note: body.note ?? null },
  });

  if (result.status !== 'stored') {
    return ApiError.internal(new Error(`unexpected ingest status: ${result.status}`), 'tracking/events/POST');
  }

  const outcome = await processShippingEvent(result.event, result.subscription);

  await logAuditEvent({
    orgId: profile.org_id,
    actorId: user.id,
    actorEmail: user.email,
    action: 'shipment.tracking_event_recorded',
    resourceType: 'shipping_event',
    resourceId: result.event.id,
    metadata: { shipmentId: id, eventCode: body.event_code, classifier: body.classifier, outcome },
  });

  return NextResponse.json({ event: result.event, outcome }, { status: 201 });
}, 'shipments/tracking/events/POST');
