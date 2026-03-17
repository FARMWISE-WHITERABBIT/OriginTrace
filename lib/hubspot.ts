import { ReplitConnectors } from '@replit/connectors-sdk';

// HubSpot integration via Replit Connectors
// Uses standard contact properties only. Custom lead data is attached as a Note.
// Every new lead also gets a Deal created in the "Sales Pipeline" at "Demo Requested" stage.

const connectors = new ReplitConnectors();

// Pipeline: "default" (Sales Pipeline) | Stage: "appointmentscheduled" (Demo Requested)
const PIPELINE_ID = 'default';
const DEAL_STAGE_ID = 'appointmentscheduled';

export interface HubSpotLeadData {
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
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

  await connectors.proxy('hubspot', `/crm/v3/objects/notes/${note.id}/associations/contacts/${contactId}/note_to_contact`, {
    method: 'PUT',
  });
}

async function createDealForContact(contactId: string, data: HubSpotLeadData): Promise<void> {
  const company = data.company || data.organization_type || 'Unknown';
  const dealName = `${company} — OriginTrace Demo`;

  const dealRes = await connectors.proxy('hubspot', '/crm/v3/objects/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        dealname: dealName,
        pipeline: PIPELINE_ID,
        dealstage: DEAL_STAGE_ID,
        closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    }),
  });
  const deal = await dealRes.json() as { id?: string; message?: string };
  if (!deal.id) {
    console.error('[HubSpot] Deal creation failed:', deal.message);
    return;
  }

  // Associate deal → contact
  await connectors.proxy('hubspot', `/crm/v3/objects/deals/${deal.id}/associations/contacts/${contactId}/deal_to_contact`, {
    method: 'PUT',
  });
}

export async function upsertHubSpotContact(data: HubSpotLeadData): Promise<void> {
  const { firstname, lastname } = splitName(data.full_name);

  const properties: Record<string, string> = {
    email: data.email,
    firstname,
    lastname,
    lifecyclestage: 'lead',
  };
  if (data.phone) properties.phone = data.phone;
  if (data.role) properties.jobtitle = data.role;
  if (data.company) properties.company = data.company;
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
  let isNew = false;

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
    isNew = true;
  }

  // Attach note with OriginTrace-specific data
  const noteBody = buildNoteBody(data);
  await attachNote(contactId, noteBody);

  // Create a Deal in the sales pipeline for new contacts only
  if (isNew) {
    await createDealForContact(contactId, data);
  }
}
