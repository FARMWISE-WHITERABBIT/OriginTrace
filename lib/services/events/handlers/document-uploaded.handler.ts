/**
 * Handler: document.uploaded
 *
 * Cross-layer propagation when a compliance document is uploaded to a shipment:
 * 1. Tick the corresponding doc_status checklist item on the shipment
 * 2. Trigger shipment readiness score recalculation
 * 3. Log audit event
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, DocumentUploadedPayload } from '../types';
import { logAuditEvent } from '@/lib/audit';

export async function handleDocumentUploaded(
  event: DomainEvent<DocumentUploadedPayload>,
  supabase: SupabaseClient
): Promise<void> {
  const { shipmentId, docType, documentId, expiryDate } = event.payload;

  if (!shipmentId) return;

  // Fetch current doc_status
  const { data: shipment } = await supabase
    .from('shipments')
    .select('doc_status')
    .eq('id', shipmentId)
    .single();

  if (!shipment) return;

  const updatedDocStatus: Record<string, unknown> = {
    ...(shipment.doc_status as Record<string, unknown> ?? {}),
    [docType]: true,
  };

  // If document has an expiry, record it for the certificate expiry monitor
  if (expiryDate) {
    updatedDocStatus[`${docType}_expiry`] = expiryDate;
  }

  await supabase
    .from('shipments')
    .update({ doc_status: updatedDocStatus })
    .eq('id', shipmentId);

  await logAuditEvent({
    orgId: event.orgId,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    action: 'document.uploaded.propagated',
    resourceType: 'shipment',
    resourceId: shipmentId,
    metadata: {
      documentId,
      docType,
      expiryDate,
      docStatusUpdated: true,
    },
  });
}
