'use server';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { computeShipmentReadiness } from '@/lib/services/shipment-scoring';
import type { ShipmentScoreInput, ComplianceProfile } from '@/lib/services/shipment-scoring';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const supabase = createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user;
}

async function getUserFromCookies(request: NextRequest) {
  const supabase = createServiceClient();
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );

  const accessToken = cookies['sb-access-token'] ||
    Object.entries(cookies).find(([k]) => k.includes('auth-token'))?.[1];

  if (!accessToken) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

async function checkTierAccess(supabase: ReturnType<typeof createServiceClient>, orgId: number): Promise<boolean> {
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier, feature_flags')
    .eq('id', orgId)
    .single();
  if (!org) return false;
  const tier = org.subscription_tier || 'starter';
  const tierLevels: Record<string, number> = { starter: 0, basic: 1, pro: 2, enterprise: 3 };
  const hasFeatureFlag = org.feature_flags?.shipment_readiness === true;
  return hasFeatureFlag || (tierLevels[tier] ?? 0) >= tierLevels['pro'];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('shipment_items')
      .select('*')
      .eq('shipment_id', shipment.id);

    if (itemsError) {
      console.error('Error fetching shipment items:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const enrichedItems = [];
    const scoreItems: ShipmentScoreInput['items'] = [];

    for (const item of (items || [])) {
      let enrichedItem: any = { ...item };

      if (item.item_type === 'batch' && item.batch_id) {
        const { data: batch } = await supabase
          .from('collection_batches')
          .select('*, farm:farms(id, farmer_name, community, gps_latitude, gps_longitude)')
          .eq('id', item.batch_id)
          .single();

        if (batch) {
          enrichedItem.batch_data = batch;

          const { data: bags } = await supabase
            .from('bags')
            .select('id, farm_id')
            .eq('collection_batch_id', batch.id);

          const bagCount = bags?.length || 0;
          const bagsWithFarmLink = bags?.filter((b: any) => b.farm_id)?.length || 0;
          const hasGps = !!(batch.farm?.gps_latitude && batch.farm?.gps_longitude);

          scoreItems.push({
            item_type: 'batch',
            weight_kg: item.weight_kg || 0,
            farm_count: item.farm_count || 0,
            traceability_complete: item.traceability_complete || false,
            compliance_status: item.compliance_status || 'pending',
            batch_data: {
              has_gps: hasGps,
              bag_count: batch.bag_count || bagCount,
              bags_with_farm_link: bagsWithFarmLink,
              dispatched: batch.status === 'dispatched' || batch.status === 'completed',
              yield_validated: !!batch.yield_validated,
            },
          });
        }
      } else if (item.item_type === 'finished_good' && item.finished_good_id) {
        const { data: finishedGood } = await supabase
          .from('finished_goods')
          .select('*')
          .eq('id', item.finished_good_id)
          .single();

        if (finishedGood) {
          enrichedItem.finished_good_data = finishedGood;

          let processingRun = null;
          if (finishedGood.processing_run_id) {
            const { data: run } = await supabase
              .from('processing_runs')
              .select('*')
              .eq('id', finishedGood.processing_run_id)
              .single();
            processingRun = run;
            enrichedItem.processing_run_data = run;
          }

          scoreItems.push({
            item_type: 'finished_good',
            weight_kg: item.weight_kg || 0,
            farm_count: item.farm_count || 0,
            traceability_complete: item.traceability_complete || false,
            compliance_status: item.compliance_status || 'pending',
            finished_good_data: {
              mass_balance_valid: !!finishedGood.mass_balance_valid,
              pedigree_verified: !!finishedGood.pedigree_verified,
              processing_run_complete: processingRun?.status === 'completed',
            },
          });
        }
      } else {
        scoreItems.push({
          item_type: item.item_type,
          weight_kg: item.weight_kg || 0,
          farm_count: item.farm_count || 0,
          traceability_complete: item.traceability_complete || false,
          compliance_status: item.compliance_status || 'pending',
        });
      }

      enrichedItems.push(enrichedItem);
    }

    const { data: allOutcomes } = await supabase
      .from('shipment_outcomes')
      .select('outcome')
      .eq('org_id', profile.org_id);
    let historicalRejectionRate: number | undefined;
    if (allOutcomes && allOutcomes.length > 0) {
      const rejectedCount = allOutcomes.filter((o: any) => o.outcome === 'rejected').length;
      historicalRejectionRate = rejectedCount / allOutcomes.length;
    }

    const { data: coldChainData } = await supabase
      .from('cold_chain_logs')
      .select('is_alert')
      .eq('shipment_id', shipment.id)
      .eq('org_id', profile.org_id);
    const coldChainTotalEntries = coldChainData?.length || 0;
    const coldChainAlertCount = coldChainData?.filter((c: any) => c.is_alert).length || 0;

    const { data: lots } = await supabase
      .from('shipment_lots')
      .select('mass_balance_valid')
      .eq('shipment_id', shipment.id)
      .eq('org_id', profile.org_id);

    let complianceProfile: ComplianceProfile | undefined;
    if (shipment.compliance_profile_id) {
      const { data: cpData } = await supabase
        .from('compliance_profiles')
        .select('id, name, destination_market, regulation_framework, required_documents, required_certifications, geo_verification_level, min_traceability_depth, custom_rules')
        .eq('id', shipment.compliance_profile_id)
        .single();
      if (cpData) {
        complianceProfile = cpData as ComplianceProfile;
      }
    }

    const farmIds: string[] = [];
    for (const item of (items || [])) {
      if (item.item_type === 'batch' && item.batch_id) {
        const { data: batch } = await supabase
          .from('collection_batches')
          .select('farm_id')
          .eq('id', item.batch_id)
          .single();
        if (batch?.farm_id) farmIds.push(String(batch.farm_id));
      }
    }

    const uniqueFarmIds = [...new Set(farmIds)];
    let farmDeforestationChecks: Array<{ farm_id: string; deforestation_free: boolean; forest_loss_hectares: number; forest_loss_percentage: number; analysis_date: string; data_source: string; risk_level: string }> = [];

    if (uniqueFarmIds.length > 0) {
      const { data: farmsWithChecks } = await supabase
        .from('farms')
        .select('id, deforestation_check')
        .in('id', uniqueFarmIds)
        .not('deforestation_check', 'is', null);

      if (farmsWithChecks) {
        farmDeforestationChecks = farmsWithChecks.map((f: any) => ({
          farm_id: String(f.id),
          ...f.deforestation_check,
        }));
      }
    }

    const scoreItemsWithFarmIds = scoreItems.map((si, idx) => ({
      ...si,
      farm_ids: farmIds[idx] ? [farmIds[idx]] : undefined,
    }));

    const scoreInput: ShipmentScoreInput = {
      shipment: {
        id: shipment.id,
        destination_country: shipment.destination_country || null,
        target_regulations: shipment.target_regulations || [],
        doc_status: shipment.doc_status || {},
        storage_controls: shipment.storage_controls || {},
        estimated_ship_date: shipment.estimated_ship_date || null,
      },
      items: scoreItemsWithFarmIds,
      historical_rejection_rate: historicalRejectionRate,
      cold_chain_alert_count: coldChainAlertCount,
      cold_chain_total_entries: coldChainTotalEntries,
      lot_count: lots?.length || 0,
      lots_with_valid_mass_balance: lots?.filter((l: any) => l.mass_balance_valid).length || 0,
      compliance_profile: complianceProfile,
      farm_deforestation_checks: farmDeforestationChecks,
    };

    const readiness = computeShipmentReadiness(scoreInput);

    return NextResponse.json({ shipment, items: enrichedItems, readiness });

  } catch (error) {
    console.error('Shipment detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: existingShipment, error: fetchError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (fetchError || !existingShipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { add_items, remove_items, ...updateFields } = body;

    const allowedFields = [
      'status', 'destination_country', 'destination_port', 'buyer_company',
      'buyer_contact', 'target_regulations', 'notes', 'estimated_ship_date',
      'doc_status', 'storage_controls',
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updateData[field] = updateFields[field];
      }
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('shipments')
        .update(updateData)
        .eq('id', params.id)
        .eq('org_id', profile.org_id);

      if (updateError) {
        console.error('Error updating shipment:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    if (add_items && Array.isArray(add_items) && add_items.length > 0) {
      for (const addItem of add_items) {
        const itemInsert: Record<string, any> = {
          shipment_id: params.id,
          item_type: addItem.item_type,
        };

        if (addItem.item_type === 'batch' && addItem.batch_id) {
          itemInsert.batch_id = addItem.batch_id;

          const { data: batch } = await supabase
            .from('collection_batches')
            .select('*, farm:farms(id, gps_latitude, gps_longitude)')
            .eq('id', addItem.batch_id)
            .eq('org_id', profile.org_id)
            .single();

          if (batch) {
            itemInsert.weight_kg = batch.total_weight || 0;
            itemInsert.farm_count = 1;
            itemInsert.traceability_complete = !!(batch.farm?.gps_latitude && batch.farm?.gps_longitude);
            itemInsert.compliance_status = batch.status === 'completed' ? 'approved' : 'pending';
          }
        } else if (addItem.item_type === 'finished_good' && addItem.finished_good_id) {
          itemInsert.finished_good_id = addItem.finished_good_id;

          const { data: fg } = await supabase
            .from('finished_goods')
            .select('*')
            .eq('id', addItem.finished_good_id)
            .single();

          if (fg) {
            itemInsert.weight_kg = fg.weight_kg || 0;
            itemInsert.farm_count = fg.farm_count || 0;
            itemInsert.traceability_complete = !!fg.pedigree_verified;
            itemInsert.compliance_status = fg.pedigree_verified ? 'approved' : 'pending';
          }
        }

        const { error: insertError } = await supabase
          .from('shipment_items')
          .insert(itemInsert);

        if (insertError) {
          console.error('Error adding shipment item:', insertError);
        }
      }

      await updateShipmentTotals(supabase, params.id, profile.org_id);
    }

    if (remove_items && Array.isArray(remove_items) && remove_items.length > 0) {
      const { error: deleteError } = await supabase
        .from('shipment_items')
        .delete()
        .in('id', remove_items)
        .eq('shipment_id', params.id);

      if (deleteError) {
        console.error('Error removing shipment items:', deleteError);
      }

      await updateShipmentTotals(supabase, params.id, profile.org_id);
    }

    const { data: updatedShipment, error: refetchError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (refetchError) {
      console.error('Error refetching shipment:', refetchError);
      return NextResponse.json({ error: refetchError.message }, { status: 500 });
    }

    const { data: currentItems } = await supabase
      .from('shipment_items')
      .select('*')
      .eq('shipment_id', params.id);

    let patchComplianceProfile: ComplianceProfile | undefined;
    if (updatedShipment.compliance_profile_id) {
      const { data: cpData } = await supabase
        .from('compliance_profiles')
        .select('id, name, destination_market, regulation_framework, required_documents, required_certifications, geo_verification_level, min_traceability_depth, custom_rules')
        .eq('id', updatedShipment.compliance_profile_id)
        .single();
      if (cpData) {
        patchComplianceProfile = cpData as ComplianceProfile;
      }
    }

    const scoreInput: ShipmentScoreInput = {
      shipment: {
        id: updatedShipment.id,
        destination_country: updatedShipment.destination_country,
        target_regulations: updatedShipment.target_regulations || [],
        doc_status: updatedShipment.doc_status || {},
        storage_controls: updatedShipment.storage_controls || {},
        estimated_ship_date: updatedShipment.estimated_ship_date,
      },
      items: (currentItems || []).map((item: any) => ({
        item_type: item.item_type,
        weight_kg: item.weight_kg || 0,
        farm_count: item.farm_count || 0,
        traceability_complete: item.traceability_complete || false,
        compliance_status: item.compliance_status || 'unknown',
      })),
      compliance_profile: patchComplianceProfile,
    };

    const readinessResult = computeShipmentReadiness(scoreInput);

    await supabase
      .from('shipments')
      .update({
        readiness_score: Math.round(readinessResult.overall_score),
        readiness_decision: readinessResult.decision,
        risk_flags: readinessResult.risk_flags,
        remediation_items: readinessResult.remediation_items,
        score_breakdown: readinessResult.dimensions,
      })
      .eq('id', params.id)
      .eq('org_id', profile.org_id);

    return NextResponse.json({ shipment: { ...updatedShipment, readiness_score: Math.round(readinessResult.overall_score), readiness_decision: readinessResult.decision }, success: true });

  } catch (error) {
    console.error('Shipment PATCH API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updateShipmentTotals(supabase: any, shipmentId: string, orgId: string) {
  const { data: allItems } = await supabase
    .from('shipment_items')
    .select('weight_kg')
    .eq('shipment_id', shipmentId);

  const totalWeight = (allItems || []).reduce((sum: number, i: any) => sum + (i.weight_kg || 0), 0);
  const totalItems = (allItems || []).length;

  await supabase
    .from('shipments')
    .update({ total_weight_kg: totalWeight, total_items: totalItems })
    .eq('id', shipmentId)
    .eq('org_id', orgId);
}
