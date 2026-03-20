import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    if (!serial) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const tierBlock = await enforceTier(profile.org_id, 'traceability');
    if (tierBlock) return tierBlock;

    const { data: bagData, error: bagError } = await supabaseAdmin
      .from('bags')
      .select('id, serial, status, collection_batch_id, org_id')
      .eq('org_id', profile.org_id)
      .eq('serial', serial.toUpperCase())
      .single();

    if (bagError || !bagData) {
      return NextResponse.json({ found: false });
    }

    let collectionData = null;
    let farmData = null;
    let agentData = null;
    let contributors: Array<{ farmer_name: string | null; weight_kg: number; bag_count: number; farm_id: string | null; community: string | null; compliance_status: string | null }> = [];

    if (bagData.status !== 'unused') {
      // Primary path: legacy collections table (individual bag scan)
      const { data: collection } = await supabaseAdmin
        .from('collections')
        .select('weight, grade, collected_at, farm_id, agent_id')
        .eq('bag_id', bagData.id)
        .single();

      if (collection) {
        collectionData = {
          weight: collection.weight,
          grade: collection.grade,
          collected_at: collection.collected_at,
        };

        if (collection.farm_id) {
          const { data: farm } = await supabaseAdmin
            .from('farms')
            .select('farmer_name, community, compliance_status')
            .eq('id', collection.farm_id)
            .single();
          if (farm) farmData = farm;
        }

        if (collection.agent_id) {
          const { data: agent } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('user_id', collection.agent_id)
            .single();
          if (agent) agentData = agent;
        }
      }

      // Fallback/supplemental path: bag linked to a collection_batch
      if (bagData.collection_batch_id) {
        const { data: batch } = await supabaseAdmin
          .from('collection_batches')
          .select('id, farm_id, agent_id, total_weight, grade, created_at')
          .eq('id', bagData.collection_batch_id)
          .single();

        if (batch) {
          if (!collectionData) {
            collectionData = {
              weight: (batch as any).total_weight ?? null,
              grade: batch.grade,
              collected_at: batch.created_at,
            };
          }

          // Resolve agent from batch if not already set
          if (batch.agent_id && !agentData) {
            const { data: agent } = await supabaseAdmin
              .from('profiles')
              .select('full_name')
              .eq('user_id', batch.agent_id)
              .single();
            if (agent) agentData = agent;
          }

          // Prefer batch_contributions for farmer attribution (cooperative or multi-farm)
          const { data: contribs } = await supabaseAdmin
            .from('batch_contributions')
            .select('farmer_name, weight_kg, bag_count, farm_id, compliance_status')
            .eq('batch_id', batch.id)
            .order('weight_kg', { ascending: false });

          if (contribs && contribs.length > 0) {
            // Enrich with farm community
            const farmIds = contribs.map(c => c.farm_id).filter(Boolean) as string[];
            let farmCommunityMap: Record<string, string | null> = {};
            if (farmIds.length > 0) {
              const { data: farms } = await supabaseAdmin
                .from('farms')
                .select('id, community, farmer_name, compliance_status')
                .in('id', farmIds);
              if (farms) {
                farms.forEach(f => { farmCommunityMap[f.id] = f.community; });
              }
            }

            contributors = contribs.map(c => ({
              farmer_name: c.farmer_name,
              weight_kg: c.weight_kg,
              bag_count: c.bag_count,
              farm_id: c.farm_id,
              community: c.farm_id ? (farmCommunityMap[c.farm_id] ?? null) : null,
              compliance_status: c.compliance_status,
            }));

            // Set primary farm from top contributor if not already set
            if (!farmData && contributors.length > 0) {
              const top = contributors[0];
              if (top.farm_id && farmCommunityMap[top.farm_id] !== undefined) {
                farmData = {
                  farmer_name: top.farmer_name,
                  community: farmCommunityMap[top.farm_id],
                  compliance_status: top.compliance_status,
                };
              } else if (top.farmer_name) {
                farmData = {
                  farmer_name: top.farmer_name,
                  community: top.community,
                  compliance_status: top.compliance_status,
                };
              }
            }
          } else if (!farmData && batch.farm_id) {
            // Final fallback: single farm on the batch itself
            const { data: batchFarm } = await supabaseAdmin
              .from('farms')
              .select('farmer_name, community, compliance_status')
              .eq('id', batch.farm_id)
              .single();
            if (batchFarm) farmData = batchFarm;
          }
        }
      }
    }

    // Processing run + finished good + shipment chain (best-effort via collection_batch)
    let processingData: { processingType?: string; outputCode?: string; processedAt?: string; processedBy?: string; facilityName?: string; inputWeightKg?: number; outputWeightKg?: number } | null = null;
    let finishedGoodData: { pedigreeCode?: string; productName?: string; productType?: string; weightKg?: number; productionDate?: string; buyerCompany?: string } | null = null;
    let shipmentData: { shipmentCode?: string; status?: string; destinationCountry?: string; estimatedShipDate?: string } | null = null;

    if (bagData.collection_batch_id) {
      try {
        const { data: prBatch } = await supabaseAdmin
          .from('processing_run_batches')
          .select('processing_run_id, processing_runs(run_code, commodity, processed_at, created_by, facility_name, id, input_weight_kg, output_weight_kg, org_id)')
          .eq('collection_batch_id', bagData.collection_batch_id)
          .limit(1)
          .maybeSingle();

        if (prBatch && (prBatch as any).processing_runs) {
          const pr = (prBatch as any).processing_runs;
          // Org-scope guard: only use this processing run if it belongs to same org as the bag
          const bagOrgId = bagData.org_id;
          if (!bagOrgId || pr.org_id === bagOrgId) {
            let processedBy: string | undefined;
            if (pr.created_by) {
              const { data: creator } = await supabaseAdmin
                .from('profiles')
                .select('full_name')
                .eq('user_id', pr.created_by)
                .maybeSingle();
              processedBy = creator?.full_name ?? undefined;
            }
            processingData = {
              processingType: pr.commodity ?? undefined,
              outputCode: pr.run_code ?? undefined,
              processedAt: pr.processed_at ?? undefined,
              processedBy,
              facilityName: pr.facility_name ?? undefined,
              inputWeightKg: pr.input_weight_kg ?? undefined,
              outputWeightKg: pr.output_weight_kg ?? undefined,
            };

            // Look up finished good linked to this processing run
            if (pr.id) {
              const { data: fg } = await supabaseAdmin
                .from('finished_goods')
                .select('id, pedigree_code, product_name, product_type, weight_kg, production_date, buyer_company, org_id')
                .eq('processing_run_id', pr.id)
                .limit(1)
                .maybeSingle();

              if (fg && (!bagOrgId || fg.org_id === bagOrgId)) {
                finishedGoodData = {
                  pedigreeCode: fg.pedigree_code ?? undefined,
                  productName: fg.product_name ?? undefined,
                  productType: fg.product_type ?? undefined,
                  weightKg: fg.weight_kg ?? undefined,
                  productionDate: fg.production_date ?? undefined,
                  buyerCompany: fg.buyer_company ?? undefined,
                };

                // Look up shipment containing this specific finished good (org-scoped via shipments join)
                const { data: shipItem } = await supabaseAdmin
                  .from('shipment_items')
                  .select('shipment_id, shipments!inner(shipment_code, status, destination_country, estimated_ship_date, org_id)')
                  .eq('finished_good_id', fg.id)
                  .limit(1)
                  .maybeSingle();

                if (shipItem && (shipItem as any).shipments) {
                  const sh = (shipItem as any).shipments;
                  // Org-scope guard on shipment
                  if (!bagOrgId || sh.org_id === bagOrgId) {
                    shipmentData = {
                      shipmentCode: sh.shipment_code ?? undefined,
                      status: sh.status ?? undefined,
                      destinationCountry: sh.destination_country ?? undefined,
                      estimatedShipDate: sh.estimated_ship_date ?? undefined,
                    };
                  }
                }
              }
            }
          }
        }
      } catch {
        // Chain lookup is best-effort; ignore errors
      }
    }

    return NextResponse.json({
      found: true,
      bag: {
        serial: bagData.serial,
        status: bagData.status,
      },
      farm: farmData,
      collection: collectionData,
      agent: agentData,
      contributors: contributors.length > 1 ? contributors : [],
      processing: processingData,
      finishedGood: finishedGoodData,
      shipment: shipmentData,
    });

  } catch (error) {
    console.error('Traceability API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
