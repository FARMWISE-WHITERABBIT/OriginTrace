import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { enforceTier } from '@/lib/api/tier-guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
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

    const tierBlock = await enforceTier(profile.org_id, 'processing');
    if (tierBlock) return tierBlock;

    const { data: processingRuns, error } = await supabaseAdmin
      .from('processing_runs')
      .select(`
        *,
        processing_run_batches (
          id,
          weight_contribution_kg,
          collection_batch_id
        )
      `)
      .eq('org_id', profile.org_id)
      .order('processed_at', { ascending: false });

    if (error) {
      console.error('Processing runs query error:', error);
      return NextResponse.json({ error: 'Failed to fetch processing runs' }, { status: 500 });
    }

    return NextResponse.json({ processingRuns: processingRuns || [] });
    
  } catch (error) {
    console.error('Processing runs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
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

    const tierBlock = await enforceTier(profile.org_id, 'processing');
    if (tierBlock) return tierBlock;

    const body = await request.json();
    const {
      facility_name,
      facility_location,
      commodity,
      input_weight_kg,
      output_weight_kg,
      processed_at,
      notes,
      source_batch_ids,
      batch_ids,
      compliance_attestations
    } = body;
    const resolvedBatchIds = source_batch_ids || batch_ids;

    if (!facility_name || !commodity || !input_weight_kg) {
      return NextResponse.json({ 
        error: 'facility_name, commodity, and input_weight_kg are required' 
      }, { status: 400 });
    }

    const runCode = `PR-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    const combinedNotes = compliance_attestations && Object.keys(compliance_attestations).length > 0
      ? [notes, `[Compliance Attestations: ${Object.entries(compliance_attestations).filter(([, v]) => v).map(([k]) => k).join(', ')}]`].filter(Boolean).join('\n')
      : notes;

    const { data: processingRun, error } = await supabaseAdmin
      .from('processing_runs')
      .insert({
        org_id: profile.org_id,
        run_code: runCode,
        facility_name,
        facility_location,
        commodity,
        input_weight_kg,
        output_weight_kg,
        processed_at: processed_at || new Date().toISOString(),
        notes: combinedNotes,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Processing run creation error:', error);
      return NextResponse.json({ error: 'Failed to create processing run' }, { status: 500 });
    }

    if (resolvedBatchIds && Array.isArray(resolvedBatchIds) && resolvedBatchIds.length > 0) {
      const { data: batches } = await supabaseAdmin
        .from('collection_batches')
        .select('id, total_weight')
        .in('id', resolvedBatchIds)
        .eq('org_id', profile.org_id);

      if (batches && batches.length > 0) {
        const runBatches = batches.map((batch: any) => ({
          processing_run_id: processingRun.id,
          collection_batch_id: batch.id,
          weight_contribution_kg: batch.total_weight || 0
        }));

        await supabaseAdmin
          .from('processing_run_batches')
          .insert(runBatches);
      }
    }

    return NextResponse.json({ processingRun }, { status: 201 });
    
  } catch (error) {
    console.error('Processing runs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
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
    const { id, output_weight_kg } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { data: processingRun, error } = await supabaseAdmin
      .from('processing_runs')
      .update({ output_weight_kg })
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) {
      console.error('Processing run update error:', error);
      return NextResponse.json({ error: 'Failed to update processing run' }, { status: 500 });
    }

    return NextResponse.json({ processingRun });
    
  } catch (error) {
    console.error('Processing runs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
