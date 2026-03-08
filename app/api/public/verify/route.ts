import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';

    const supabase = createServiceClient();

    if (code.length < 3 || code.length > 128) {
      return NextResponse.json({ error: 'Invalid verification code format' }, { status: 400 });
    }

    let result: any = null;

    const { data: batchData } = await supabase
      .from('collection_batches')
      .select('id, batch_id, commodity, status, total_weight, bag_count, gps_lat, gps_lng, farm_id, org_id, created_at, synced_at')
      .eq('batch_id', code)
      .limit(1)
      .single();

    if (batchData) {
      result = await buildBatchVerification(supabase, batchData);
    }

    if (!result) {
      const { data: finishedGood } = await supabase
        .from('finished_goods')
        .select('id, qr_code, product_name, commodity, status, net_weight, production_date, expiry_date, created_at, org_id')
        .eq('qr_code', code)
        .limit(1)
        .single();

      if (finishedGood) {
        result = await buildFinishedGoodVerification(supabase, finishedGood);
      }
    }

    if (!result) {
      const { data: bagData } = await supabase
        .from('bags')
        .select('id, commodity, status, weight_kg, grade, collection_batch_id, org_id')
        .eq('id', code)
        .single();

      if (bagData) {
        result = await buildBagVerification(supabase, bagData);
      }
    }

    if (!result) {
      return NextResponse.json({
        verified: false,
        message: 'No record found for this verification code.',
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Public verify error:', error);
    return NextResponse.json({ error: 'Verification service unavailable' }, { status: 500 });
  }
}

async function getOrgName(supabase: any, orgId: number): Promise<string> {
  const { data } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();
  return data?.name || 'Verified Organization';
}

async function buildBagVerification(supabase: any, bag: any) {
  const timeline: any[] = [{ event: 'Bag Registered', status: bag.status }];

  let batchInfo = null;
  let farmInfo = null;

  if (bag.collection_batch_id) {
    const { data: batch } = await supabase
      .from('collection_batches')
      .select('id, batch_id, commodity, status, gps_lat, gps_lng, farm_id, created_at')
      .eq('id', bag.collection_batch_id)
      .single();

    if (batch) {
      batchInfo = {
        batch_id: batch.batch_id,
        commodity: batch.commodity,
        collected_at: batch.created_at,
      };
      timeline.push({ event: 'Collected', date: batch.created_at, batch_id: batch.batch_id });

      if (batch.farm_id) {
        const { data: farm } = await supabase
          .from('farms')
          .select('id, farmer_name, community, state, lga, boundary, compliance_status, area_hectares')
          .eq('id', batch.farm_id)
          .single();

        if (farm) {
          farmInfo = {
            farmer_name: farm.farmer_name,
            community: farm.community,
            state: farm.state,
            lga: farm.lga,
            compliance_status: farm.compliance_status,
            area_hectares: farm.area_hectares,
            has_boundary: !!farm.boundary && farm.boundary !== '{}',
          };
        }
      }
    }
  }

  const orgName = await getOrgName(supabase, bag.org_id);

  return {
    verified: true,
    type: 'bag',
    code: bag.id,
    commodity: batchInfo?.commodity || bag.commodity || 'Unknown',
    status: bag.status,
    weight_kg: bag.weight_kg,
    grade: bag.grade,
    origin: farmInfo ? {
      state: farmInfo.state,
      lga: farmInfo.lga,
      community: farmInfo.community,
      farmer: farmInfo.farmer_name,
      compliance_status: farmInfo.compliance_status,
      area_hectares: farmInfo.area_hectares,
      has_boundary: farmInfo.has_boundary,
    } : null,
    batch: batchInfo,
    timeline,
    verified_by: orgName,
    platform: 'OriginTrace',
  };
}

async function buildBatchVerification(supabase: any, batch: any) {
  const timeline: any[] = [
    { event: 'Batch Created', date: batch.created_at, status: batch.status },
  ];

  if (batch.synced_at) {
    timeline.push({ event: 'Synced to Server', date: batch.synced_at });
  }

  let farmInfo = null;
  if (batch.farm_id && batch.farm_id !== 0) {
    const { data: farm } = await supabase
      .from('farms')
      .select('id, farmer_name, community, state, lga, boundary, compliance_status, area_hectares')
      .eq('id', batch.farm_id)
      .single();

    if (farm) {
      farmInfo = {
        farmer_name: farm.farmer_name,
        community: farm.community,
        state: farm.state,
        lga: farm.lga,
        compliance_status: farm.compliance_status,
        area_hectares: farm.area_hectares,
        has_boundary: !!farm.boundary && farm.boundary !== '{}',
      };
    }
  }

  const { data: contributions } = await supabase
    .from('batch_contributions')
    .select('farmer_name, weight_kg, bag_count')
    .eq('batch_id', batch.id);

  const orgName = await getOrgName(supabase, batch.org_id);

  return {
    verified: true,
    type: 'batch',
    code: batch.batch_id || batch.id.toString(),
    commodity: batch.commodity || 'Unknown',
    status: batch.status,
    total_weight: batch.total_weight,
    bag_count: batch.bag_count,
    has_gps: !!(batch.gps_lat && batch.gps_lng),
    origin: farmInfo ? {
      state: farmInfo.state,
      lga: farmInfo.lga,
      community: farmInfo.community,
      farmer: farmInfo.farmer_name,
      compliance_status: farmInfo.compliance_status,
      area_hectares: farmInfo.area_hectares,
      has_boundary: farmInfo.has_boundary,
    } : null,
    contributors: contributions?.map((c: any) => ({
      farmer_name: c.farmer_name,
      weight_kg: c.weight_kg,
      bag_count: c.bag_count,
    })) || [],
    timeline,
    verified_by: orgName,
    platform: 'OriginTrace',
  };
}

async function buildFinishedGoodVerification(supabase: any, good: any) {
  const orgName = await getOrgName(supabase, good.org_id);

  return {
    verified: true,
    type: 'finished_good',
    code: good.qr_code || good.id.toString(),
    product_name: good.product_name,
    commodity: good.commodity || 'Unknown',
    status: good.status,
    net_weight: good.net_weight,
    production_date: good.production_date,
    expiry_date: good.expiry_date,
    timeline: [
      { event: 'Product Created', date: good.created_at },
    ],
    verified_by: orgName,
    platform: 'OriginTrace',
  };
}
