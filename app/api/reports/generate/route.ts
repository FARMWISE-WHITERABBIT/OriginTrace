/**
 * POST /api/reports/generate
 *
 * Assembles data for the requested audit report type and date range,
 * generates a PDF, and returns it as base64.
 *
 * Body:
 *   type:   'eudr' | 'organic' | 'social_compliance' | 'gacc' | 'general'
 *   from:   'YYYY-MM-DD'
 *   to:     'YYYY-MM-DD'
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { generateAuditReportPdf, type AuditReportData } from '@/lib/export/audit-report-pdf';
import { logAuditEvent } from '@/lib/audit';

const generateSchema = z.object({
  type: z.enum(['eudr', 'organic', 'social_compliance', 'gacc', 'general']),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { type, from, to } = parsed.data;
    const orgId = profile.org_id;

    // ── Fetch org name ──────────────────────────────────────────────────────
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    const orgName = org?.name ?? 'Unknown Organisation';

    // ── Fetch farms ─────────────────────────────────────────────────────────
    const { data: farms } = await supabase
      .from('farms')
      .select('id, farmer_name, community, state, boundary_geo, deforestation_check, consent_timestamp, compliance_status')
      .eq('org_id', orgId);

    // ── Fetch batches ───────────────────────────────────────────────────────
    const { data: batches } = await supabase
      .from('collection_batches')
      .select('id, batch_code, total_weight, bag_count, collection_date, farmer_name')
      .eq('org_id', orgId)
      .gte('collection_date', from)
      .lte('collection_date', to);

    // ── Fetch lab results ───────────────────────────────────────────────────
    const { data: labResults } = await supabase
      .from('lab_results')
      .select('id, lab_provider, test_type, test_date, result, certificate_number, certificate_expiry_date')
      .eq('org_id', orgId)
      .gte('test_date', from)
      .lte('test_date', to);

    // ── Fetch shipments ─────────────────────────────────────────────────────
    const { data: shipments } = await supabase
      .from('shipments')
      .select('id, shipment_code, destination_country, status, total_weight_kg, created_at')
      .eq('org_id', orgId)
      .gte('created_at', `${from}T00:00:00Z`)
      .lte('created_at', `${to}T23:59:59Z`);

    // ── Fetch DDS submissions (for EUDR) ────────────────────────────────────
    const ddsSubmissions: AuditReportData['ddsSubmissions'] = [];
    if (type === 'eudr' && shipments && shipments.length > 0) {
      const shipmentIds = shipments.map((s) => s.id);
      const { data: ddsRows } = await supabase
        .from('shipments')
        .select('id, prenotif_eu_traces, prenotif_eu_traces_ref')
        .in('id', shipmentIds)
        .neq('prenotif_eu_traces', 'not_filed');

      (ddsRows ?? []).forEach((r) => {
        ddsSubmissions.push({
          id:                    r.id,
          shipment_id:           r.id,
          prenotif_eu_traces:    r.prenotif_eu_traces,
          prenotif_eu_traces_ref: r.prenotif_eu_traces_ref ?? undefined,
        });
      });
    }

    // ── Fetch payments (for social compliance) ──────────────────────────────
    let payments: AuditReportData['payments'] = undefined;
    if (type === 'social_compliance') {
      const { data: paymentRows } = await supabase
        .from('payments')
        .select('id, payee_name, amount, currency, payment_date, status')
        .eq('org_id', orgId)
        .gte('payment_date', from)
        .lte('payment_date', to)
        .order('payment_date', { ascending: true });
      payments = paymentRows ?? [];
    }

    // ── Fetch audit readiness score ─────────────────────────────────────────
    let auditReadiness: AuditReportData['auditReadiness'] = undefined;
    try {
      const scoreRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/audit-readiness`, {
        headers: { cookie: request.headers.get('cookie') ?? '' },
      });
      if (scoreRes.ok) {
        const score = await scoreRes.json();
        auditReadiness = { overall: score.overall, grade: score.grade };
      }
    } catch {
      // Non-critical — report generates without score
    }

    // ── Build report data ───────────────────────────────────────────────────
    const reportData: AuditReportData = {
      reportType:     type,
      orgName,
      period:         { from, to },
      farms:          (farms ?? []) as AuditReportData['farms'],
      batches:        (batches ?? []) as AuditReportData['batches'],
      labResults:     (labResults ?? []) as AuditReportData['labResults'],
      shipments:      (shipments ?? []) as AuditReportData['shipments'],
      ddsSubmissions,
      payments,
      auditReadiness,
      generatedBy:    user.email ?? 'System',
      generatedAt:    new Date().toISOString(),
    };

    const pdfDataUri = await generateAuditReportPdf(reportData);

    await logAuditEvent({
      orgId,
      actorId:    user.id,
      actorEmail: user.email,
      action:     'report.generated',
      resourceType: 'audit_report',
      metadata: { reportType: type, from, to },
    });

    // Return as base64 (strip the data URI prefix for cleaner API response)
    const base64 = pdfDataUri.replace(/^data:application\/pdf;base64,/, '');

    return NextResponse.json({
      pdf:         base64,
      fileName:    `${type}-audit-report-${from}-${to}.pdf`,
      generatedAt: reportData.generatedAt,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
