// HubSpot integration via direct HubSpot API calls
// Uses standard contact properties. Custom lead data is attached as a Note.
// Every new lead also gets a Deal created in the "Sales Pipeline".

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_TOKEN ?? '';
const PIPELINE_ID   = 'default';

/**
 * Pipeline stage map — code alias → HubSpot stage ID
 *
 * Full pipeline order:
 *  1. appointmentscheduled  — demo form submitted / discovery call booked
 *  2. [no_show stage]       — prospect missed discovery call (custom stage, set NO_SHOW_STAGE_ID)
 *  3. presentationscheduled — platform demo scheduled
 *  4. decisionmakerboughtin — post-demo, decision maker engaged
 *  5. contractsent          — contract sent
 *  6. [pilot_setup stage]   — pilot being configured (custom stage, set PILOT_SETUP_STAGE_ID)
 *  7. closedwon             — pilot converted
 *  8. closedlost            — lost / unresponsive
 *
 * Custom stages to add in HubSpot → CRM → Deals → Pipeline settings:
 *  - "No Show"     — after appointmentscheduled, before presentationscheduled
 *  - "Pilot Setup" — after contractsent, before closedwon
 */
const STAGE_MAP: Record<string, string> = {
  new_lead:            'appointmentscheduled',
  meeting_scheduled:   'appointmentscheduled',
  meeting_rescheduled: 'appointmentscheduled',
  // No show = missed discovery call. Falls back to appointmentscheduled until
  // the custom "No Show" stage is created and NO_SHOW_STAGE_ID is set.
  no_show:             process.env.NO_SHOW_STAGE_ID || 'appointmentscheduled',
  nurture_dropped:     'closedlost',
};

async function hubspot(path: string, options: RequestInit = {}): Promise<any> {
  if (!HUBSPOT_TOKEN) throw new Error('HUBSPOT_API_TOKEN not set');
  const res = await fetch(`https://api.hubapi.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HubSpot API error ${res.status}: ${json?.message || JSON.stringify(json)}`);
  return json;
}

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
  if (data.commodity)         lines.push(`Commodity: ${data.commodity}`);
  if (data.monthly_tonnage)   lines.push(`Monthly volume: ${data.monthly_tonnage} MT`);
  if (data.farmer_count)      lines.push(`Farmer count: ${data.farmer_count}`);
  if (data.biggest_concern)   lines.push(`Top compliance concern: ${data.biggest_concern}`);
  if (data.message)           lines.push(`Message: ${data.message}`);
  return lines.join('\n');
}

async function attachNote(contactId: string, body: string): Promise<void> {
  const note = await hubspot('/crm/v3/objects/notes', {
    method: 'POST',
    body: JSON.stringify({ properties: { hs_note_body: body, hs_timestamp: new Date().toISOString() } }),
  }) as { id?: string };
  if (!note.id) return;
  await hubspot(`/crm/v3/objects/notes/${note.id}/associations/contacts/${contactId}/note_to_contact`, { method: 'PUT' });
}

async function createDealForContact(contactId: string, data: HubSpotLeadData): Promise<string | null> {
  const dealName = `${data.company || data.organization_type || 'Unknown'} — OriginTrace Demo`;
  const deal = await hubspot('/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({ properties: {
      dealname:   dealName,
      pipeline:   PIPELINE_ID,
      dealstage:  STAGE_MAP['new_lead'],
      closedate:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }}),
  }) as { id?: string; message?: string };
  if (!deal.id) { console.error('[HubSpot] Deal creation failed:', deal.message); return null; }
  await hubspot(`/crm/v3/objects/deals/${deal.id}/associations/contacts/${contactId}/deal_to_contact`, { method: 'PUT' });
  return deal.id;
}

/**
 * Update a HubSpot deal's pipeline stage.
 * Uses STAGE_MAP to translate internal stage aliases to real HubSpot stage IDs.
 */
export async function updateDealStage(dealId: string, stage: string): Promise<void> {
  try {
    const dealstage = STAGE_MAP[stage] ?? stage;
    await hubspot(`/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: { dealstage } }),
    });
  } catch (err) {
    console.error('[HubSpot] updateDealStage failed (non-fatal):', err);
  }
}

/**
 * Upsert a HubSpot contact and create a deal for new contacts.
 * Returns the deal ID (null for existing contacts or on failure).
 */
export async function upsertHubSpotContact(data: HubSpotLeadData): Promise<{ dealId: string | null }> {
  const { firstname, lastname } = splitName(data.full_name);
  const properties: Record<string, string> = { email: data.email, firstname, lastname, lifecyclestage: 'lead' };
  if (data.phone)             properties.phone    = data.phone;
  if (data.role)              properties.jobtitle = data.role;
  if (data.company)           properties.company  = data.company;
  if (data.organization_type) properties.industry = data.organization_type;

  const searchData = await hubspot('/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: data.email }] }],
      properties: ['email', 'firstname'], limit: 1,
    }),
  }) as { total: number; results: Array<{ id: string }> };

  let contactId: string;
  let isNew = false;

  if (searchData.total > 0) {
    contactId = searchData.results[0].id;
    await hubspot(`/crm/v3/objects/contacts/${contactId}`, { method: 'PATCH', body: JSON.stringify({ properties }) });
  } else {
    const created = await hubspot('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify({ properties }),
    }) as { id?: string; status?: string; message?: string };
    if (!created.id) throw new Error(`HubSpot contact creation failed: ${created.message || JSON.stringify(created)}`);
    contactId = created.id;
    isNew = true;
  }

  await attachNote(contactId, buildNoteBody(data));
  const dealId = isNew ? await createDealForContact(contactId, data) : null;
  return { dealId };
}
