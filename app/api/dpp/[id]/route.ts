import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: dpp, error } = await supabaseAdmin
      .from('digital_product_passports')
      .select(`
        *,
        finished_goods (
          product_name,
          product_type,
          pedigree_code,
          weight_kg,
          destination_country,
          buyer_company,
          production_date
        )
      `)
      .eq('id', id)
      .single();

    if (error || !dpp) {
      const { data: dppByCode } = await supabaseAdmin
        .from('digital_product_passports')
        .select(`
          *,
          finished_goods (
            product_name,
            product_type,
            pedigree_code,
            weight_kg,
            destination_country,
            buyer_company,
            production_date
          )
        `)
        .eq('dpp_code', id)
        .single();

      if (!dppByCode) {
        return NextResponse.json({ error: 'DPP not found' }, { status: 404 });
      }

      return renderDpp(dppByCode, format);
    }

    return renderDpp(dpp, format);
  } catch (error) {
    console.error('DPP single API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function renderDpp(dpp: any, format: string | null) {
  if (format === 'jsonld') {
    return NextResponse.json(
      dpp.machine_readable_data || {},
      {
        headers: {
          'Content-Type': 'application/ld+json',
        },
      }
    );
  }

  if (format === 'html') {
    const fg = dpp.finished_goods || {};
    const claims = dpp.sustainability_claims || {};
    const chain = Array.isArray(dpp.chain_of_custody) ? dpp.chain_of_custody : [];
    const certs = Array.isArray(dpp.certifications) ? dpp.certifications : [];
    const compliance = dpp.regulatory_compliance || {};

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Product Passport - ${dpp.dpp_code}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
    .header { background: #0f172a; color: white; padding: 2rem; border-radius: 12px; margin-bottom: 1.5rem; }
    .header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .header .code { font-family: monospace; font-size: 1.1rem; opacity: 0.9; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-active { background: #dcfce7; color: #166534; }
    .badge-draft { background: #fef3c7; color: #92400e; }
    .badge-revoked { background: #fecaca; color: #991b1b; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; }
    .card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #334155; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { margin-bottom: 0.75rem; }
    .field-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .field-value { font-size: 0.95rem; font-weight: 500; }
    .chain-item { border-left: 3px solid #3b82f6; padding-left: 1rem; margin-bottom: 1rem; }
    .chain-item .stage { font-weight: 600; text-transform: capitalize; color: #3b82f6; }
    .footer { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.85rem; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:1rem">
        <div>
          <h1>Digital Product Passport</h1>
          <div class="code">${dpp.dpp_code}</div>
        </div>
        <span class="badge badge-${dpp.status}">${dpp.status}</span>
      </div>
    </div>

    <div class="card">
      <h2>Product Information</h2>
      <div class="grid">
        <div class="field">
          <div class="field-label">Product</div>
          <div class="field-value">${fg.product_name || dpp.product_category}</div>
        </div>
        <div class="field">
          <div class="field-label">Category</div>
          <div class="field-value">${dpp.product_category}</div>
        </div>
        <div class="field">
          <div class="field-label">Origin</div>
          <div class="field-value">${dpp.origin_country}</div>
        </div>
        <div class="field">
          <div class="field-label">Weight</div>
          <div class="field-value">${fg.weight_kg ? fg.weight_kg + ' kg' : 'N/A'}</div>
        </div>
        ${fg.production_date ? `<div class="field"><div class="field-label">Production Date</div><div class="field-value">${fg.production_date}</div></div>` : ''}
        ${fg.destination_country ? `<div class="field"><div class="field-label">Destination</div><div class="field-value">${fg.destination_country}</div></div>` : ''}
      </div>
    </div>

    ${dpp.carbon_footprint_kg || Object.keys(claims).length > 0 ? `
    <div class="card">
      <h2>Sustainability</h2>
      <div class="grid">
        ${dpp.carbon_footprint_kg ? `<div class="field"><div class="field-label">Carbon Footprint</div><div class="field-value">${dpp.carbon_footprint_kg} kg CO2e</div></div>` : ''}
        ${Object.entries(claims).map(([k, v]) => `<div class="field"><div class="field-label">${k}</div><div class="field-value">${v}</div></div>`).join('')}
      </div>
    </div>` : ''}

    ${certs.length > 0 ? `
    <div class="card">
      <h2>Certifications</h2>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        ${certs.map((c: string) => `<span class="badge badge-active">${c}</span>`).join('')}
      </div>
    </div>` : ''}

    ${chain.length > 0 ? `
    <div class="card">
      <h2>Chain of Custody</h2>
      ${chain.map((item: any) => `
        <div class="chain-item">
          <div class="stage">${item.stage}</div>
          <div class="field-value">${item.actor || item.facility || ''}</div>
          ${item.location ? `<div style="color:#64748b;font-size:0.85rem">${item.location}</div>` : ''}
          ${item.weight_kg ? `<div style="font-size:0.85rem">${item.weight_kg} kg</div>` : ''}
        </div>
      `).join('')}
    </div>` : ''}

    <div class="card">
      <h2>Regulatory Compliance</h2>
      <div class="grid">
        <div class="field">
          <div class="field-label">Pedigree Verified</div>
          <div class="field-value">${compliance.pedigree_verified ? 'Yes' : 'No'}</div>
        </div>
        <div class="field">
          <div class="field-label">Mass Balance Valid</div>
          <div class="field-value">${compliance.mass_balance_valid ? 'Yes' : 'No'}</div>
        </div>
        <div class="field">
          <div class="field-label">DDS Submitted</div>
          <div class="field-value">${compliance.dds_submitted ? 'Yes' : 'No'}</div>
        </div>
        <div class="field">
          <div class="field-label">Total Smallholders</div>
          <div class="field-value">${compliance.total_smallholders || 0}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Passport Version ${dpp.passport_version} &middot; Issued ${dpp.issued_at ? new Date(dpp.issued_at).toLocaleDateString() : 'N/A'}</p>
      <p style="margin-top:0.5rem">Powered by OriginTrace</p>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return NextResponse.json({ dpp });
}
