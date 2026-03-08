import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';


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
      `)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Finished goods query error:', error);
      return NextResponse.json({ error: 'Failed to fetch finished goods' }, { status: 500 });
    }

    return NextResponse.json({ finishedGoods: finishedGoods || [] });
    
  } catch (error) {
    console.error('Finished goods API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
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
    } = body;

    if (!product_name || !processing_run_id || !weight_kg) {
      return NextResponse.json({ 
        error: 'product_name, processing_run_id, and weight_kg are required' 
      }, { status: 400 });
    }

    const { data: processingRun } = await supabaseAdmin
      .from('processing_runs')
      .select('mass_balance_valid, org_id')
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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

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
