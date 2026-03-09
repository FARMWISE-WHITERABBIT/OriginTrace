import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: fg } = await supabaseAdmin
      .from('finished_goods')
      .select('*, processing_runs(*), organizations(name)')
      .eq('id', id).eq('org_id', profile.org_id).single();
    if (!fg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const run = fg.processing_runs as any;
    const { data: runBatches } = await supabaseAdmin
      .from('processing_run_batches')
      .select('weight_contribution_kg, collection_batches(farms(farmer_name, area_hectares, states(name)))')
      .eq('processing_run_id', run?.id);

    const farms = (runBatches || []).map((rb: any) => rb.collection_batches?.farms);
    const uniqueStates = [...new Set(farms.map((f: any) => f?.states?.name).filter(Boolean))] as string[];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade';

    return NextResponse.json({
      certData: {
        orgName: (fg.organizations as any)?.name || 'OriginTrace',
        productName: fg.product_name,
        productType: fg.product_type,
        weightKg: fg.weight_kg,
        productionDate: fg.production_date,
        batchNumber: fg.batch_number,
        lotNumber: fg.lot_number,
        pedigreeCode: fg.pedigree_code,
        totalSmallholders: new Set(farms.map((f: any) => f?.farmer_name)).size,
        totalAreaHectares: farms.reduce((s: number, f: any) => s + (f?.area_hectares || 0), 0),
        uniqueStates,
        inputWeightKg: run?.input_weight_kg,
        outputWeightKg: run?.output_weight_kg,
        recoveryRate: run?.recovery_rate,
        massBalanceValid: run?.mass_balance_valid,
        facilityName: run?.facility_name,
        facilityLocation: run?.facility_location,
        verifyUrl: `${appUrl}/verify/${fg.pedigree_code}`,
        generatedAt: new Date().toISOString(),
      }
    });
  } catch (err) {
    console.error('[cert-pdf]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
