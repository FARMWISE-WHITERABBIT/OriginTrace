import type { SupabaseClient } from '@supabase/supabase-js';
import { DOCUMENT_LINKED_ENTITY_TYPES, uuidSchema } from '@/lib/api/validation';

export type DocumentLinkedEntityType = (typeof DOCUMENT_LINKED_ENTITY_TYPES)[number];

const TENANT_ENTITY_TABLES: Record<Exclude<DocumentLinkedEntityType, 'organization'>, string> = {
  shipment: 'shipments',
  farm: 'farms',
  farmer: 'farms',
  batch: 'collection_batches',
};

function isLinkedEntityType(value: unknown): value is DocumentLinkedEntityType {
  return typeof value === 'string' &&
    (DOCUMENT_LINKED_ENTITY_TYPES as readonly string[]).includes(value);
}

/**
 * Validates a generic document link against the authenticated tenant.
 * The admin client bypasses RLS, so every lookup includes an explicit org_id.
 */
export async function documentLinkBelongsToOrganization(
  supabase: SupabaseClient,
  orgId: string | number,
  entityType: unknown,
  entityId: unknown,
): Promise<boolean> {
  const hasType = entityType !== null && entityType !== undefined && entityType !== '';
  const hasId = entityId !== null && entityId !== undefined && entityId !== '';

  if (!hasType && !hasId) return true;
  if (
    !hasType ||
    !hasId ||
    !isLinkedEntityType(entityType) ||
    typeof entityId !== 'string' ||
    !uuidSchema.safeParse(entityId).success
  ) {
    return false;
  }

  if (entityType === 'organization') {
    return entityId === String(orgId);
  }

  const { data, error } = await supabase
    .from(TENANT_ENTITY_TABLES[entityType])
    .select('id')
    .eq('id', entityId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}
