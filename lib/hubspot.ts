import { ReplitConnectors } from '@replit/connectors-sdk';

// HubSpot integration via Replit Connectors
// Pushes leads to HubSpot CRM as contacts with custom properties.
// Connection: conn_hubspot_01KKXMKM5P2RQ427TATHCVNWR7

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
  const firstname = parts[0] || '';
  const lastname = parts.slice(1).join(' ') || '';
  return { firstname, lastname };
}

export async function upsertHubSpotContact(data: HubSpotLeadData): Promise<void> {
  const { firstname, lastname } = splitName(data.full_name);

  const properties: Record<string, string> = {
    email: data.email,
    firstname,
    lastname,
    lifecyclestage: 'lead',
    lead_source: 'website',
  };

  if (data.phone) properties.phone = data.phone;
  if (data.role) properties.jobtitle = data.role;
  if (data.organization_type) properties.company_type = data.organization_type;
  if (data.commodity) properties.commodity = data.commodity;
  if (data.monthly_tonnage) properties.monthly_tonnage = data.monthly_tonnage;
  if (data.farmer_count) properties.farmer_count = data.farmer_count;
  if (data.biggest_concern) properties.biggest_concern = data.biggest_concern;
  if (data.message) properties.message = data.message;
  if (data.source) properties.origintrace_source = data.source;

  // Search for existing contact first to avoid duplicates
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

  if (searchData.total > 0) {
    // Update existing contact
    const contactId = searchData.results[0].id;
    await connectors.proxy('hubspot', `/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    });
  } else {
    // Create new contact
    await connectors.proxy('hubspot', '/crm/v3/objects/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    });
  }
}
