/**
 * GET  /api/lab-results  — list lab results (filterable by batch/shipment/finished_good/org)
 * POST /api/lab-results  — create a new lab result with automatic MRL cross-check
 *
 * Roles for POST: admin, compliance_officer, quality_manager
 * Roles for GET:  all org members
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';
import { emitEvent } from '@/lib/services/events';

const WRITE_ROLES = ['admin', 'compliance_officer', 'quality_manager'];

const labResultCreateSchema = z.object({
  // Lot-level links — at least one required (validated below)
  batch_id:           z.string().uuid().optional(),
  finished_good_id:   z.string().uuid().optional(),
  shipment_id:        z.string().uuid().optional(),

  lab_provider:        z.string().min(1, 'Lab provider is required'),
  test_method:         z.string().optional(),
  test_date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'test_date must be YYYY-MM-DD'),
  test_type:           z.enum(['aflatoxin', 'pesticide_residue', 'heavy_metal', 'microbiological', 'moisture', 'other']),
  commodity:           z.string().optional(),
  result:              z.enum(['pass', 'fail', 'conditional']),
  result_value:        z.number().optional(),
  result_unit:         z.string().optional(),
  result_notes:        z.string().optional(),

  certificate_number:          z.string().optional(),
  certificate_validity_days:   z.number().int().positive().default(90),

  target_markets:      z.array(z.string()).default([]),

  file_url:            z.string().url().optional(),
  file_name:           z.string().optional(),
  document_id:         z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const batchId        = searchParams.get('batch_id');
    const shipmentId     = searchParams.get('shipment_id');
    const finishedGoodId = searchParams.get('finished_good_id');
    const testType       = searchParams.get('test_type');
    const result         = searchParams.get('result');
    const page           = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize       = Math.min(100, parseInt(searchParams.get('page_size') ?? '50'));

    let query = supabase
      .from('lab_results')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('test_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (batchId)        query = query.eq('batch_id', batchId);
    if (shipmentId)     query = query.eq('shipment_id', shipmentId);
    if (finishedGoodId) query = query.eq('finished_good_id', finishedGoodId);
    if (testType)       query = query.eq('test_type', testType);
    if (result)         query = query.eq('result', result);

    const { data, error, count } = await query;
    if (error) {
      const code = (error as any).code;
      if (code === 'PGRST205' || code === 'PGRST200' || error.message?.includes('lab_results')) {
        return NextResponse.json({ results: [], total: 0, page, pageSize });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data, total: count, page, pageSize });
  } catch (error) {
    console.error('Lab results GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (!WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = labResultCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    // Require at least one lot-level link
    if (!data.batch_id && !data.finished_good_id && !data.shipment_id) {
      return NextResponse.json(
        { error: 'At least one of batch_id, finished_good_id, or shipment_id is required.' },
        { status: 400 }
      );
    }

    // Compute certificate expiry date from test_date + validity_days
    const testDate = new Date(data.test_date);
    const expiryDate = new Date(testDate);
    expiryDate.setDate(expiryDate.getDate() + data.certificate_validity_days);
    const certificateExpiryDate = expiryDate.toISOString().split('T')[0];

    const { data: inserted, error: insertError } = await supabase
      .from('lab_results')
      .insert({
        org_id:                    profile.org_id,
        batch_id:                  data.batch_id ?? null,
        finished_good_id:          data.finished_good_id ?? null,
        shipment_id:               data.shipment_id ?? null,
        lab_provider:              data.lab_provider,
        test_method:               data.test_method ?? null,
        test_date:                 data.test_date,
        test_type:                 data.test_type,
        commodity:                 data.commodity ?? null,
        result:                    data.result,
        result_value:              data.result_value ?? null,
        result_unit:               data.result_unit ?? null,
        result_notes:              data.result_notes ?? null,
        certificate_number:        data.certificate_number ?? null,
        certificate_validity_days: data.certificate_validity_days,
        certificate_expiry_date:   certificateExpiryDate,
        target_markets:            data.target_markets,
        file_url:                  data.file_url ?? null,
        file_name:                 data.file_name ?? null,
        document_id:               data.document_id ?? null,
        uploaded_by:               user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Lab result insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'lab_result.created',
      resourceType: 'lab_result',
      resourceId: inserted.id,
      metadata: {
        testType: data.test_type,
        result: data.result,
        batchId: data.batch_id,
        shipmentId: data.shipment_id,
        labProvider: data.lab_provider,
      },
    });

    // Cross-layer propagation: MRL check (if pesticide residue), shipment score recalc
    await emitEvent(
      {
        name: 'lab_result.uploaded',
        orgId: profile.org_id,
        actorId: user.id,
        actorEmail: user.email,
        payload: {
          labResultId:      inserted.id,
          testType:         data.test_type,
          result:           data.result,
          batchId:          data.batch_id,
          finishedGoodId:   data.finished_good_id,
          shipmentId:       data.shipment_id,
          commodity:        data.commodity,
          targetMarkets:    data.target_markets,
          resultValue:      data.result_value,
          resultUnit:       data.result_unit,
        },
      },
      supabase
    );

    return NextResponse.json({ result: inserted, success: true }, { status: 201 });
  } catch (error) {
    console.error('Lab results POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
