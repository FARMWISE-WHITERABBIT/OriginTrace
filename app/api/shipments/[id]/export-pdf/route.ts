import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user || !profile?.org_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: shipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: items } = await supabase
      .from('shipment_items')
      .select('*')
      .eq('shipment_id', id);

    const { data: documents } = await supabase
      .from('documents')
      .select('title, document_type, status, expiry_date')
      .eq('org_id', profile.org_id)
      .eq('linked_entity_type', 'shipment')
      .eq('linked_entity_id', id);

    const score = shipment.readiness_score ?? 0;
    const decision = shipment.readiness_decision ?? 'pending';
    const breakdown: Array<{ name: string; score: number; weight: number }> = shipment.score_breakdown || [];
    const riskFlags: Array<{ type: string; message: string; severity: string }> = shipment.risk_flags || [];
    const regulations: string[] = shipment.target_regulations || [];

    const decisionColor = decision === 'GO' ? '#16a34a' : decision === 'CONDITIONAL' ? '#d97706' : decision === 'NO_GO' ? '#dc2626' : '#6b7280';
    const decisionLabel = decision === 'GO' ? '✓ GO' : decision === 'CONDITIONAL' ? '⚠ CONDITIONAL' : decision === 'NO_GO' ? '✗ NO-GO' : '○ PENDING';

    const now = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipment Readiness Report — ${shipment.shipment_code}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; background: #fff; font-size: 14px; line-height: 1.5; }
    .page { max-width: 800px; margin: 0 auto; padding: 2rem; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
    .logo { font-size: 1.1rem; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
    .logo span { color: #16a34a; }
    .meta { text-align: right; font-size: 0.75rem; color: #64748b; }
    .decision-banner { border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; background: ${decision === 'GO' ? '#f0fdf4' : decision === 'CONDITIONAL' ? '#fffbeb' : decision === 'NO_GO' ? '#fef2f2' : '#f8fafc'}; border: 1px solid ${decisionColor}40; }
    .decision-label { font-size: 1.4rem; font-weight: 800; color: ${decisionColor}; }
    .score-badge { font-size: 2rem; font-weight: 800; color: ${decisionColor}; }
    .score-label { font-size: 0.75rem; color: #64748b; text-align: center; }
    .section { margin-bottom: 1.5rem; }
    .section-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem; margin-bottom: 0.75rem; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .info-row { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
    .info-label { color: #64748b; }
    .info-value { font-weight: 500; text-align: right; }
    .score-bars { space-y: 0.5rem; }
    .score-bar-row { margin-bottom: 0.6rem; }
    .score-bar-header { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.2rem; }
    .score-bar-track { background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; }
    .score-bar-fill { height: 100%; border-radius: 4px; background: ${decisionColor}; }
    .risk-item { display: flex; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid #f1f5f9; }
    .risk-badge { font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; height: fit-content; white-space: nowrap; }
    .risk-high { background: #fef2f2; color: #dc2626; }
    .risk-medium { background: #fffbeb; color: #d97706; }
    .risk-low { background: #f0fdf4; color: #16a34a; }
    .item-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
    .doc-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
    .status-badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 9999px; font-weight: 600; }
    .status-valid { background: #dcfce7; color: #16a34a; }
    .status-expiring { background: #fef3c7; color: #d97706; }
    .status-expired { background: #fee2e2; color: #dc2626; }
    .reg-tag { display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 4px; background: #e0f2fe; color: #0369a1; margin: 0.15rem; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 1rem; margin-top: 2rem; font-size: 0.7rem; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print {
      body { font-size: 12px; }
      .page { padding: 1rem; }
      @page { margin: 1.5cm; }
    }
    @media screen { .print-hint { display: block; text-align: center; padding: 1rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 0.8rem; color: #64748b; } }
    @media print { .print-hint { display: none; } }
  </style>
</head>
<body>
<div class="print-hint">Press Ctrl+P / Cmd+P to save as PDF &nbsp;·&nbsp; <button onclick="window.print()" style="border:none;background:#0f172a;color:white;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.8rem;">Print / Save PDF</button></div>
<div class="page">

  <div class="header">
    <div>
      <div class="logo">Origin<span>Trace</span></div>
      <div style="font-size:0.75rem;color:#64748b;margin-top:0.2rem">Shipment Readiness Report</div>
    </div>
    <div class="meta">
      <div style="font-weight:600;font-size:0.9rem;">${shipment.shipment_code}</div>
      <div>Generated: ${now}</div>
    </div>
  </div>

  <!-- Decision Banner -->
  <div class="decision-banner">
    <div>
      <div class="decision-label">${decisionLabel}</div>
      <div style="font-size:0.8rem;color:#475569;margin-top:0.25rem;">${riskFlags.length} risk flag${riskFlags.length !== 1 ? 's' : ''} · ${(items || []).length} item${(items || []).length !== 1 ? 's' : ''}</div>
    </div>
    <div style="text-align:center;">
      <div class="score-badge">${Math.round(score)}</div>
      <div class="score-label">/ 100</div>
    </div>
  </div>

  <!-- Shipment Details -->
  <div class="section">
    <div class="section-title">Shipment Details</div>
    <div class="info-grid">
      <div>
        ${[
          ['Code', shipment.shipment_code],
          ['Status', shipment.status],
          ['Destination', shipment.destination_country || '—'],
          ['Port', shipment.destination_port || '—'],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join('')}
      </div>
      <div>
        ${[
          ['Commodity', shipment.commodity || '—'],
          ['Buyer', shipment.buyer_company || '—'],
          ['Weight', shipment.total_weight_kg ? `${Number(shipment.total_weight_kg).toLocaleString()} kg` : '—'],
          ['Ship Date', shipment.estimated_ship_date ? new Date(shipment.estimated_ship_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join('')}
      </div>
    </div>
    ${regulations.length > 0 ? `<div style="margin-top:0.5rem;">${regulations.map(r => `<span class="reg-tag">${r}</span>`).join('')}</div>` : ''}
  </div>

  <!-- Score Breakdown -->
  ${breakdown.length > 0 ? `
  <div class="section">
    <div class="section-title">Score Breakdown</div>
    <div class="score-bars">
      ${breakdown.map(d => `
        <div class="score-bar-row">
          <div class="score-bar-header">
            <span>${d.name}</span>
            <span style="font-weight:600;">${Math.round(d.score)}/100 <span style="color:#94a3b8;font-weight:400;">(${d.weight}% weight)</span></span>
          </div>
          <div class="score-bar-track">
            <div class="score-bar-fill" style="width:${Math.round(d.score)}%;background:${d.score >= 70 ? '#16a34a' : d.score >= 40 ? '#d97706' : '#dc2626'};"></div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  <!-- Risk Flags -->
  ${riskFlags.length > 0 ? `
  <div class="section">
    <div class="section-title">Risk Flags (${riskFlags.length})</div>
    ${riskFlags.map(f => `
      <div class="risk-item">
        <span class="risk-badge risk-${(f.severity || 'medium').toLowerCase()}">${(f.severity || 'MEDIUM').toUpperCase()}</span>
        <span style="font-size:0.85rem;">${f.message || f.type || 'Unknown risk'}</span>
      </div>
    `).join('')}
  </div>` : `
  <div class="section">
    <div class="section-title">Risk Flags</div>
    <div style="color:#16a34a;font-size:0.85rem;padding:0.5rem 0;">✓ No risk flags identified</div>
  </div>`}

  <!-- Documents -->
  ${(documents || []).length > 0 ? `
  <div class="section">
    <div class="section-title">Linked Documents (${documents!.length})</div>
    ${documents!.map(doc => {
      const statusClass = doc.status === 'valid' ? 'status-valid' : doc.status === 'expiring_soon' ? 'status-expiring' : 'status-expired';
      return `
      <div class="doc-row">
        <span>${doc.title} <span style="color:#94a3b8;font-size:0.75rem;">${doc.document_type?.replace(/_/g, ' ')}</span></span>
        <span class="status-badge ${statusClass}">${doc.status?.replace(/_/g, ' ')}</span>
      </div>`;
    }).join('')}
  </div>` : ''}

  <!-- Items -->
  ${(items || []).length > 0 ? `
  <div class="section">
    <div class="section-title">Shipment Items (${items!.length})</div>
    ${items!.map(item => `
      <div class="item-row">
        <span>${item.item_type?.replace(/_/g, ' ')} — ${Number(item.weight_kg || 0).toLocaleString()} kg</span>
        <span style="color:${item.traceability_complete ? '#16a34a' : '#d97706'}">${item.traceability_complete ? '✓ Traced' : '⚠ Incomplete'}</span>
      </div>
    `).join('')}
  </div>` : ''}

  <div class="footer">
    <span>Generated by OriginTrace · ${shipment.shipment_code}</span>
    <span>${now}</span>
  </div>

</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="readiness-${shipment.shipment_code}.html"`,
      },
    });

  } catch (err) {
    console.error('[export-pdf]', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
