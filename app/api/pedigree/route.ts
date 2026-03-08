import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { enforceTier } from '@/lib/api/tier-guard';


export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const { searchParams } = new URL(request.url);
    const pedigreeCode = searchParams.get('code');
    const finishedGoodId = searchParams.get('id');

    if (!pedigreeCode && !finishedGoodId) {
      return NextResponse.json({ error: 'Pedigree code or ID required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('finished_goods')
      .select(`
        id,
        pedigree_code,
        product_name,
        product_type,
        weight_kg,
        batch_number,
        lot_number,
        production_date,
        expiry_date,
        destination_country,
        buyer_name,
        buyer_company,
        dds_submitted,
        dds_submitted_at,
        dds_reference,
        pedigree_verified,
        verification_notes,
        created_at,
        processing_runs (
          id,
          run_code,
          facility_name,
          facility_location,
          commodity,
          input_weight_kg,
          output_weight_kg,
          recovery_rate,
          standard_recovery_rate,
          mass_balance_valid,
          mass_balance_variance,
          processed_at,
          org_id
        ),
        organizations (
          id,
          name,
          logo_url
        )
      `);

    if (pedigreeCode) {
      query = query.eq('pedigree_code', pedigreeCode);
    } else if (finishedGoodId) {
      query = query.eq('id', finishedGoodId);
    }

    const { data: finishedGood, error: fgError } = await query.single();

    if (fgError || !finishedGood) {
      return NextResponse.json({ error: 'Pedigree not found' }, { status: 404 });
    }

    const processingRun = finishedGood.processing_runs as any;
    if (!processingRun) {
      return NextResponse.json({ 
        finishedGood,
        sourceFarms: [],
        timeline: []
      });
    }

    const { data: runBatches } = await supabaseAdmin
      .from('processing_run_batches')
      .select(`
        id,
        weight_contribution_kg,
        collection_batch_id,
        collection_batches (
          id,
          total_weight,
          status,
          created_at,
          farm_id,
          farms (
            id,
            farmer_name,
            community,
            area_hectares,
            commodity,
            compliance_status,
            boundary_geo,
            state_id,
            states (name)
          )
        )
      `)
      .eq('processing_run_id', processingRun.id);

    const sourceFarms = (runBatches || []).map((rb: any) => {
      const batch = rb.collection_batches;
      const farm = batch?.farms;
      const farmIdStr = farm?.id ? String(farm.id) : '';
      return {
        batchId: batch?.id,
        collectionDate: batch?.created_at,
        farmId: farm?.id,
        farmerName: farmIdStr ? `Farmer ${farmIdStr.substring(0, 4).toUpperCase()}` : 'Unknown Farmer',
        community: farm?.community,
        state: farm?.states?.name,
        areaHectares: farm?.area_hectares,
        commodity: farm?.commodity,
        complianceStatus: farm?.compliance_status,
        weightContribution: rb.weight_contribution_kg,
      };
    }).filter((f: any) => f.farmId);

    const uniqueFarmers = new Set(sourceFarms.map((f: any) => f.farmId)).size;
    const totalFarmArea = sourceFarms.reduce((sum: number, f: any) => sum + (f.areaHectares || 0), 0);
    const uniqueStates = [...new Set(sourceFarms.map((f: any) => f.state).filter(Boolean))];

    const earliestCollection = sourceFarms.length > 0 
      ? new Date(Math.min(...sourceFarms.map((f: any) => new Date(f.collectionDate).getTime())))
      : null;

    const timeline = [
      {
        event: 'Harvested',
        date: earliestCollection?.toISOString(),
        details: `${uniqueFarmers} Smallholders in ${uniqueStates.join(', ') || 'Unknown'}`,
        icon: 'harvest'
      },
      {
        event: 'Aggregated',
        date: processingRun.processed_at,
        details: processingRun.facility_location || processingRun.facility_name,
        icon: 'warehouse'
      },
      {
        event: 'Processed',
        date: processingRun.processed_at,
        details: `${processingRun.facility_name} - Recovery: ${processingRun.recovery_rate?.toFixed(1) || 'N/A'}%`,
        icon: 'factory'
      }
    ];

    if (finishedGood.dds_submitted) {
      timeline.push({
        event: 'DDS Submitted',
        date: finishedGood.dds_submitted_at,
        details: `EU TRACES Portal - Ref: ${finishedGood.dds_reference || 'Pending'}`,
        icon: 'certificate'
      });
    }

    const { buyer_name, buyer_company, organizations, ...sanitizedGood } = finishedGood as any;
    const { mass_balance_variance, ...sanitizedRun } = processingRun as any;

    return NextResponse.json({
      finishedGood: {
        ...sanitizedGood,
        organization: organizations
      },
      processingRun: sanitizedRun,
      sourceFarms,
      summary: {
        totalSmallholders: uniqueFarmers,
        totalFarmAreaHectares: totalFarmArea,
        states: uniqueStates,
        rawInputKg: processingRun.input_weight_kg,
        processedOutputKg: processingRun.output_weight_kg,
        recoveryRate: processingRun.recovery_rate,
        massBalanceValid: processingRun.mass_balance_valid,
      },
      timeline
    });
    
  } catch (error) {
    console.error('Pedigree API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
