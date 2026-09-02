import { readFileSync } from 'fs';
import { join } from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { documentLinkBelongsToOrganization } from '@/lib/api/document-link-validation';
import { documentCreateSchema } from '@/lib/api/validation';

const ORG_ID = '10000000-0000-4000-8000-000000000001';
const ENTITY_ID = '20000000-0000-4000-8000-000000000002';

function createLookupClient(result: { data: unknown; error: unknown } = {
  data: { id: ENTITY_ID },
  error: null,
}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);

  const from = vi.fn().mockReturnValue(query);
  return {
    client: { from } as unknown as SupabaseClient,
    from,
    query,
  };
}

describe('documentLinkBelongsToOrganization', () => {
  it('accepts an unlinked document without querying tenant data', async () => {
    const { client, from } = createLookupClient();

    await expect(documentLinkBelongsToOrganization(client, ORG_ID, null, null))
      .resolves.toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ['shipment', null],
    [null, ENTITY_ID],
    ['unsupported', ENTITY_ID],
    ['shipment', 'not-a-uuid-shaped-entity'],
  ])('rejects an incomplete or unsupported link (%s, %s)', async (entityType, entityId) => {
    const { client, from } = createLookupClient();

    await expect(documentLinkBelongsToOrganization(client, ORG_ID, entityType, entityId))
      .resolves.toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it('accepts only the active organization for organization links', async () => {
    const { client, from } = createLookupClient();

    await expect(documentLinkBelongsToOrganization(client, ORG_ID, 'organization', ORG_ID))
      .resolves.toBe(true);
    await expect(documentLinkBelongsToOrganization(
      client,
      ORG_ID,
      'organization',
      '30000000-0000-4000-8000-000000000003',
    )).resolves.toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ['shipment', 'shipments'],
    ['farm', 'farms'],
    ['farmer', 'farms'],
    ['batch', 'collection_batches'],
  ] as const)('checks %s links against the tenant-owned %s table', async (entityType, table) => {
    const { client, from, query } = createLookupClient();

    await expect(documentLinkBelongsToOrganization(client, ORG_ID, entityType, ENTITY_ID))
      .resolves.toBe(true);
    expect(from).toHaveBeenCalledWith(table);
    expect(query.select).toHaveBeenCalledWith('id');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', ENTITY_ID);
    expect(query.eq).toHaveBeenNthCalledWith(2, 'org_id', ORG_ID);
  });

  it('rejects an entity that is absent from the active organization', async () => {
    const { client } = createLookupClient({ data: null, error: null });

    await expect(documentLinkBelongsToOrganization(client, ORG_ID, 'farm', ENTITY_ID))
      .resolves.toBe(false);
  });

  it('propagates lookup errors so the API wrapper can return a sanitized 500', async () => {
    const lookupError = new Error('database unavailable');
    const { client } = createLookupClient({ data: null, error: lookupError });

    await expect(documentLinkBelongsToOrganization(client, ORG_ID, 'batch', ENTITY_ID))
      .rejects.toBe(lookupError);
  });
});

describe('document link request validation', () => {
  it('accepts a supported entity type with a UUID identifier', () => {
    expect(documentCreateSchema.safeParse({
      title: 'Certificate',
      document_type: 'other',
      linked_entity_type: 'shipment',
      linked_entity_id: ENTITY_ID,
    }).success).toBe(true);
  });

  it('rejects unsupported entity types and non-UUID identifiers', () => {
    expect(documentCreateSchema.safeParse({
      title: 'Certificate',
      document_type: 'other',
      linked_entity_type: 'contract',
      linked_entity_id: ENTITY_ID,
    }).success).toBe(false);
    expect(documentCreateSchema.safeParse({
      title: 'Certificate',
      document_type: 'other',
      linked_entity_type: 'shipment',
      linked_entity_id: '123',
    }).success).toBe(false);
  });
});

describe('document route and form mutation guards', () => {
  const routeSource = readFileSync(
    join(__dirname, '..', 'app/api/documents/route.ts'),
    'utf8',
  );
  const pageSource = readFileSync(
    join(__dirname, '..', 'app/app/documents/page.tsx'),
    'utf8',
  );
  const getHandlerSource = routeSource.slice(
    routeSource.indexOf('export async function GET'),
    routeSource.indexOf('export const POST'),
  );

  it('keeps GET /api/documents read-only while deriving expiry status for the response', () => {
    expect(getHandlerSource).toContain('const updatedDocs');
    expect(getHandlerSource).not.toMatch(/\.(?:insert|update|upsert|delete)\s*\(/);
  });

  it('guards create and edit handlers and buttons until linked entities are verified', () => {
    expect(pageSource.match(/!formSnapshot\.linked_entity_verified/g)).toHaveLength(2);
    expect(pageSource).toContain('!createForm.linked_entity_verified');
    expect(pageSource).toContain('!editForm.linked_entity_verified');
  });
});
