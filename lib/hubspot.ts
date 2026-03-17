import { ReplitConnectors } from '@replit/connectors-sdk';

// HubSpot integration via Replit Connectors
// Connection: conn_hubspot_01KKXMKM5P2RQ427TATHCVNWR7
// Uses standard HubSpot contact properties only (no custom property creation required).
// All OriginTrace-specific data (commodity, volume, etc.) is attached as a Note.

const connectors = new ReplitConnectors();

export interface HubSpotLeadData {
  full_name: string;
  email: string;
  phone?: string;
  role?: string;
  organization_type?: string;
  commodity?: string;
  monthly_tonnage?: string;
  farmer_count?: string;
  biggest_concern?: string;
  message?: string;
  source?: string;
}

function splitName(full_name: string): { firstname: string; lastname: string } {
  const parts = full_name.trim().split(/\s+/);
  return { firstname: parts[0] || '', lastname: parts.slice(1).join(' ') || '' };
}

function buildNoteBody(data: HubSpotLeadData): string {
  const lines = [`OriginTrace lead — submitted via ${data.source === 'calculator' ? 'compliance calculator' : 'demo request form'}.`];
  if (data.organization_type) lines.push(`Organization type: ${data.organization_type}`);
  if (data.commodity) lines.push(`Commodity: ${data.commodity}`);
  if (data.monthly_tonnage) lines.push(`Monthly volume: ${data.monthly_tonnage} MT`);
  if (data.farmer_count) lines.push(`Farmer count: ${data.farmer_count}`);
  if (data.biggest_concern) lines.push(`Top compliance concern: ${data.biggest_concern}`);
  if (data.message) lines.push(`Message: ${data.message}`);
  return lines.join('\n');
}

async function attachNote(contactId: string, body: string): Promise<void> {
  // Create note
  const noteRes = await connectors.proxy('hubspot', '/crm/v3/objects/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        hs_note_body: body,
        hs_timestamp: new Date().toISOString(),
      },
    }),
  });
  const note = await noteRes.json() as { id?: string };
  if (!note.id) return;

  // Associate note → contact
  await connectors.proxy('hubspot', `/crm/v3/objects/notes/${note.id}/associations/contacts/${contactId}/note_to_contact`, {
    method: 'PUT',
  });
}

export async function upsertHubSpotContact(data: HubSpotLeadData): Promise<void> {
  const { firstname, lastname } = splitName(data.full_name);

  // Standard HubSpot contact properties only
  const properties: Record<string, string> = {
    email: data.email,
    firstname,
    lastname,
    lifecyclestage: 'lead',
  };
  if (data.phone) properties.phone = data.phone;
  if (data.role) properties.jobtitle = data.role;
  if (data.organization_type) properties.industry = data.organization_type;

  // Search for existing contact to avoid duplicates
  const searchRes = await connectors.proxy('hubspot', '/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: data.email }] }],
      properties: ['email', 'firstname'],
      limit: 1,
    }),
  });

  const searchData = await searchRes.json() as { total: number; results: Array<{ id: string }> };
  let contactId: string;

  if (searchData.total > 0) {
    contactId = searchData.results[0].id;
    await connectors.proxy('hubspot', `/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    });
  } else {
    const createRes = await connectors.proxy('hubspot', '/crm/v3/objects/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    });
    const created = await createRes.json() as { id?: string; status?: string; message?: string };
    if (!created.id) {
      throw new Error(`HubSpot contact creation failed: ${created.message || JSON.stringify(created)}`);
    }
    contactId = created.id;
  }

  // Attach note with all custom OriginTrace data
  const noteBody = buildNoteBody(data);
  await attachNote(contactId, noteBody);
}
