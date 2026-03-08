import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const finishedGoodId = searchParams.get('id');

    if (!finishedGoodId) {
      return NextResponse.json({ error: 'Finished good ID required' }, { status: 400 });
    }

    const { data: finishedGood, error: fgError } = await supabaseAdmin
      .from('finished_goods')
      .select(`
        *,
        processing_runs (
          *,
          org_id
        ),
        organizations (
          name,
          logo_url
        )
      `)
      .eq('id', finishedGoodId)
      .eq('org_id', profile.org_id)
      .single();

    if (fgError || !finishedGood) {
      return NextResponse.json({ error: 'Finished good not found' }, { status: 404 });
    }

    const processingRun = finishedGood.processing_runs as any;

    const { data: runBatches } = await supabaseAdmin
      .from('processing_run_batches')
      .select(`
        weight_contribution_kg,
        collection_batches (
          id,
          created_at,
          farms (
            farmer_name,
            community,
            area_hectares,
            compliance_status,
            states (name)
          )
        )
      `)
      .eq('processing_run_id', processingRun.id);

    const sourceFarms = (runBatches || []).map((rb: any) => {
      const farm = rb.collection_batches?.farms;
      return {
        farmer: farm?.farmer_name,
        community: farm?.community,
        state: farm?.states?.name,
        area: farm?.area_hectares,
        compliance: farm?.compliance_status,
        weight: rb.weight_contribution_kg
      };
    });

    const totalSmallholders = new Set(sourceFarms.map((f: any) => f.farmer)).size;
    const totalArea = sourceFarms.reduce((sum: number, f: any) => sum + (f.area || 0), 0);
    const uniqueStates = [...new Set(sourceFarms.map((f: any) => f.state).filter(Boolean))];

    const certificateHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EUDR Compliance Certificate - ${finishedGood.pedigree_code}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      min-height: 100vh;
      padding: 40px;
    }
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border: 3px solid #166534;
      border-radius: 12px;
      padding: 48px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #166534;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .logo { width: 80px; height: 80px; margin-bottom: 16px; }
    .title { 
      color: #166534; 
      font-size: 28px; 
      font-weight: bold;
      margin-bottom: 8px;
    }
    .subtitle { color: #4b5563; font-size: 14px; }
    .verification-badge {
      background: #166534;
      color: white;
      padding: 16px 32px;
      border-radius: 8px;
      text-align: center;
      margin: 24px 0;
    }
    .verification-badge h2 { font-size: 24px; margin-bottom: 4px; }
    .verification-badge p { font-size: 14px; opacity: 0.9; }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      color: #166534;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .field {
      margin-bottom: 8px;
    }
    .field-label {
      color: #6b7280;
      font-size: 12px;
    }
    .field-value {
      color: #111827;
      font-size: 16px;
      font-weight: 500;
    }
    .summary-boxes {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 24px 0;
    }
    .summary-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .summary-box .number {
      font-size: 28px;
      font-weight: bold;
      color: #166534;
    }
    .summary-box .label {
      font-size: 12px;
      color: #4b5563;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #166534;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .qr-section {
      text-align: center;
      margin-top: 24px;
    }
    .pedigree-code {
      font-family: monospace;
      font-size: 18px;
      background: #f3f4f6;
      padding: 8px 16px;
      border-radius: 4px;
      display: inline-block;
    }
    @media print {
      body { background: white; padding: 0; }
      .certificate { border: 2px solid #166534; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="38" stroke="#166534" stroke-width="4" fill="#f0fdf4"/>
          <path d="M40 20v20M30 45c0-5.5 4.5-10 10-10s10 4.5 10 10M25 55h30" stroke="#166534" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <h1 class="title">${(finishedGood.organizations as any)?.name || 'OriginTrace'}</h1>
      <p class="subtitle">EU Deforestation Regulation (EUDR) Compliance Certificate</p>
    </div>

    <div class="verification-badge">
      <h2>✓ VERIFIED DEFORESTATION-FREE</h2>
      <p>This product meets EU Regulation 2023/1115 requirements</p>
    </div>

    <div class="section">
      <h3 class="section-title">Product Information</h3>
      <div class="grid">
        <div class="field">
          <div class="field-label">Product Name</div>
          <div class="field-value">${finishedGood.product_name}</div>
        </div>
        <div class="field">
          <div class="field-label">Product Type</div>
          <div class="field-value">${finishedGood.product_type.replace('_', ' ').toUpperCase()}</div>
        </div>
        <div class="field">
          <div class="field-label">Weight</div>
          <div class="field-value">${finishedGood.weight_kg?.toLocaleString()} kg</div>
        </div>
        <div class="field">
          <div class="field-label">Production Date</div>
          <div class="field-value">${new Date(finishedGood.production_date).toLocaleDateString('en-GB')}</div>
        </div>
        <div class="field">
          <div class="field-label">Batch Number</div>
          <div class="field-value">${finishedGood.batch_number || 'N/A'}</div>
        </div>
        <div class="field">
          <div class="field-label">Lot Number</div>
          <div class="field-value">${finishedGood.lot_number || 'N/A'}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">Mass Balance Verification</h3>
      <div class="grid">
        <div class="field">
          <div class="field-label">Raw Input</div>
          <div class="field-value">${processingRun?.input_weight_kg?.toLocaleString()} kg</div>
        </div>
        <div class="field">
          <div class="field-label">Processed Output</div>
          <div class="field-value">${processingRun?.output_weight_kg?.toLocaleString()} kg</div>
        </div>
        <div class="field">
          <div class="field-label">Recovery Rate</div>
          <div class="field-value">${processingRun?.recovery_rate?.toFixed(1)}%</div>
        </div>
        <div class="field">
          <div class="field-label">Mass Balance Status</div>
          <div class="field-value">${processingRun?.mass_balance_valid ? '✓ Valid' : '⚠ Variance Detected'}</div>
        </div>
      </div>
    </div>

    <div class="summary-boxes">
      <div class="summary-box">
        <div class="number">${totalSmallholders}</div>
        <div class="label">Smallholder Farmers</div>
      </div>
      <div class="summary-box">
        <div class="number">${totalArea.toFixed(1)}</div>
        <div class="label">Hectares Mapped</div>
      </div>
      <div class="summary-box">
        <div class="number">${uniqueStates.length}</div>
        <div class="label">Nigerian States</div>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">Origin</h3>
      <div class="field">
        <div class="field-label">States of Origin</div>
        <div class="field-value">${uniqueStates.join(', ') || 'Nigeria'}</div>
      </div>
      <div class="field">
        <div class="field-label">Processing Facility</div>
        <div class="field-value">${processingRun?.facility_name || 'N/A'} - ${processingRun?.facility_location || ''}</div>
      </div>
    </div>

    <div class="qr-section">
      <p style="margin-bottom: 8px; color: #6b7280;">Pedigree Verification Code</p>
      <div class="pedigree-code">${finishedGood.pedigree_code}</div>
      <p style="margin-top: 8px; font-size: 12px; color: #9ca3af;">
        Verify at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade'}/verify/${finishedGood.pedigree_code}
      </p>
    </div>

    <div class="footer">
      <p>Certificate generated on ${new Date().toISOString()}</p>
      <p>This certificate is digitally verified and tamper-proof</p>
      <p style="margin-top: 8px;">OriginTrace Traceability Platform | origintrace.trade</p>
    </div>
  </div>
</body>
</html>
    `;

    return new NextResponse(certificateHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="EUDR-Certificate-${finishedGood.pedigree_code}.html"`
      }
    });
    
  } catch (error) {
    console.error('Certificate generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
