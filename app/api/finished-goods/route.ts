import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination } from '@/lib/api/validation';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const finishedGoodCreateSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  product_type: z.string().optional(),
  processing_run_id: z.number({ required_error: 'Processing run ID is required' }),
  weight_kg: z.number().positive('Weight must be positive'),
  batch_number: z.string().optional(),
  lot_number: z.string().optional(),
  production_date: z.string().optional(),
  destination_country: z.string().optional(),
  buyer_company: z.string().optional(),
});


export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { data: finishedGoods, error } = await supabaseAdmin
      .from('finished_goods')
      .select(`
        *,
        processing_runs (
          run_code,
          facility_name,
          commodity,
          input_weight_kg,
          output_weight_kg,
          recovery_rate,
          mass_balance_valid
        )
      `), { count: \'exact\' }
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Finished goods query error:', error);
      return NextResponse.json({ error: 'Failed to fetch finished goods' }, { status: 500 });
    }

    return NextResponse.json({ finishedGoods: finishedGoods || [], pagination: { page, limit, total: count ?? 0 } });
    
  } catch (error) {
    console.error('Finished goods API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const body = await request.json();

    const parsed = finishedGoodCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      product_name,
      product_type,
      processing_run_id,
      weight_kg,
      batch_number,
      lot_number,
      production_date,
      destination_country,
      buyer_company
    } = parsed.data;

    const { data: processingRun } = await supabaseAdmin
      .from('processing_runs')
      .select('mass_balance_valid, org_id'), { count: 'exact' }
      .eq('id', processing_run_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!processingRun) {
      return NextResponse.json({ error: 'Processing run not found' }, { status: 404 });
    }

    const pedigreeCode = `FW-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;

    const { data: finishedGood, error } = await supabaseAdmin
      .from('finished_goods')
      .insert({
        org_id: profile.org_id,
        pedigree_code: pedigreeCode,
        product_name,
        product_type: product_type || 'cocoa_butter',
        processing_run_id,
        weight_kg,
        batch_number,
        lot_number,
        production_date: production_date || new Date().toISOString().split('T')[0],
        destination_country: destination_country || 'EU',
        buyer_company,
        pedigree_verified: processingRun.mass_balance_valid,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Finished good creation error:', error);
      return NextResponse.json({ error: 'Failed to create finished good' }, { status: 500 });
    }

    return NextResponse.json({ finishedGood }, { status: 201 });
    
  } catch (error) {
    console.error('Finished goods API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const body = await request.json();
    const { id, dds_submitted, dds_reference } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const updates: any = {};
    if (dds_submitted !== undefined) {
      updates.dds_submitted = dds_submitted;
      updates.dds_submitted_at = dds_submitted ? new Date().toISOString() : null;
    }
    if (dds_reference) {
      updates.dds_reference = dds_reference;
    }

    const { data: finishedGood, error } = await supabaseAdmin
      .from('finished_goods')
      .update(updates)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) {
      console.error('Finished good update error:', error);
      return NextResponse.json({ error: 'Failed to update finished good' }, { status: 500 });
    }

    return NextResponse.json({ finishedGood });
    
  } catch (error) {
    console.error('Finished goods API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
