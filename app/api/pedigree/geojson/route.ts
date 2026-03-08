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
          id,
          run_code,
          facility_name,
          facility_location,
          commodity,
          input_weight_kg,
          output_weight_kg,
          recovery_rate,
          processed_at
        ),
        organizations (
          name
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
          total_weight,
          farms (
            id,
            farmer_name,
            farmer_id,
            community,
            area_hectares,
            commodity,
            compliance_status,
            boundary_geo,
            states (name, code),
            lgas (name)
          )
        )
      `)
      .eq('processing_run_id', processingRun.id);

    const features: any[] = [];

    (runBatches || []).forEach((rb: any) => {
      const batch = rb.collection_batches;
      const farm = batch?.farms;
      
      if (farm?.boundary_geo) {
        let geometry;
        try {
          geometry = typeof farm.boundary_geo === 'string' 
            ? JSON.parse(farm.boundary_geo) 
            : farm.boundary_geo;
        } catch {
          return;
        }

        features.push({
          type: 'Feature',
          properties: {
            farm_id: farm.id,
            farmer_name: farm.farmer_name,
            farmer_id: farm.farmer_id,
            community: farm.community,
            state: farm.states?.name,
            state_code: farm.states?.code,
            lga: farm.lgas?.name,
            area_hectares: farm.area_hectares,
            commodity: farm.commodity,
            compliance_status: farm.compliance_status,
            collection_date: batch.created_at,
            collection_weight_kg: batch.total_weight,
            weight_contribution_kg: rb.weight_contribution_kg,
            pedigree_code: finishedGood.pedigree_code,
            product_name: finishedGood.product_name,
            product_type: finishedGood.product_type,
            production_date: finishedGood.production_date,
            processing_facility: processingRun.facility_name,
            eu_traces_compatible: true,
            deforestation_free: farm.compliance_status === 'approved'
          },
          geometry: geometry
        });
      }
    });

    const geojson = {
      type: 'FeatureCollection',
      name: `Pedigree-${finishedGood.pedigree_code}`,
      crs: {
        type: 'name',
        properties: {
          name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
        }
      },
      metadata: {
        pedigree_code: finishedGood.pedigree_code,
        product_name: finishedGood.product_name,
        product_type: finishedGood.product_type,
        weight_kg: finishedGood.weight_kg,
        production_date: finishedGood.production_date,
        batch_number: finishedGood.batch_number,
        lot_number: finishedGood.lot_number,
        destination_country: finishedGood.destination_country,
        buyer_company: finishedGood.buyer_company,
        processing_run: {
          code: processingRun.run_code,
          facility: processingRun.facility_name,
          location: processingRun.facility_location,
          input_weight_kg: processingRun.input_weight_kg,
          output_weight_kg: processingRun.output_weight_kg,
          recovery_rate: processingRun.recovery_rate,
          processed_at: processingRun.processed_at
        },
        organization: (finishedGood.organizations as any)?.name,
        total_farms: features.length,
        total_area_hectares: features.reduce((sum, f) => sum + (f.properties.area_hectares || 0), 0),
        generated_at: new Date().toISOString(),
        eu_regulation: 'EU 2023/1115 (EUDR)',
        verification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade'}/verify/${finishedGood.pedigree_code}`
      },
      features
    };

    const filename = `EUDR-GeoJSON-${finishedGood.pedigree_code}-${new Date().toISOString().split('T')[0]}.geojson`;

    return new NextResponse(JSON.stringify(geojson, null, 2), {
      headers: {
        'Content-Type': 'application/geo+json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
    
  } catch (error) {
    console.error('GeoJSON generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
