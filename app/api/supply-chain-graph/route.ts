import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface GraphNode {
  id: string;
  type: 'farm' | 'batch' | 'processing' | 'finished_good' | 'shipment' | 'buyer';
  label: string;
  metadata: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

class GraphBuilder {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  private nodeIds = new Set<string>();
  private edgeKeys = new Set<string>();

  addNode(node: GraphNode) {
    if (!this.nodeIds.has(node.id)) {
      this.nodeIds.add(node.id);
      this.nodes.push(node);
    }
  }

  addEdge(edge: GraphEdge) {
    const key = `${edge.source}|${edge.target}`;
    if (!this.edgeKeys.has(key) && this.nodeIds.has(edge.source) && this.nodeIds.has(edge.target)) {
      this.edgeKeys.add(key);
      this.edges.push(edge);
    }
  }

  addEdgeDeferred(edge: GraphEdge) {
    const key = `${edge.source}|${edge.target}`;
    if (!this.edgeKeys.has(key)) {
      this.edgeKeys.add(key);
      this.edges.push(edge);
    }
  }

  pruneEdges() {
    this.edges = this.edges.filter(e => this.nodeIds.has(e.source) && this.nodeIds.has(e.target));
  }

  hasNode(id: string) {
    return this.nodeIds.has(id);
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    let buyerProfile: any = null;
    if (!profile) {
      const { data: bp } = await supabaseAdmin
        .from('buyer_profiles')
        .select('buyer_org_id, role')
        .eq('user_id', user.id)
        .single();
      buyerProfile = bp;
    }

    if (!profile && !buyerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipment_id');
    const batchId = searchParams.get('batch_id');

    const graph = new GraphBuilder();

    if (buyerProfile) {
      await buildBuyerGraph(supabaseAdmin, buyerProfile.buyer_org_id, shipmentId, graph);
    } else if (batchId) {
      await buildBatchGraph(supabaseAdmin, profile!.org_id, batchId, graph);
    } else if (shipmentId) {
      await buildShipmentGraph(supabaseAdmin, profile!.org_id, shipmentId, graph);
    } else {
      await buildFullGraph(supabaseAdmin, profile!.org_id, graph);
    }

    graph.pruneEdges();
    return NextResponse.json({ nodes: graph.nodes, edges: graph.edges });
  } catch (error) {
    console.error('Supply chain graph API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function buildBatchGraph(supabase: any, orgId: string, batchId: string, graph: GraphBuilder) {
  const { data: batch } = await supabase
    .from('collection_batches')
    .select('id, status, total_weight, bag_count, collected_at, farm_id, farms(id, farmer_name, community, commodity, compliance_status, area_hectares)')
    .eq('id', batchId)
    .eq('org_id', orgId)
    .single();

  if (!batch) return;

  const batchNodeId = `batch-${batch.id}`;
  graph.addNode({
    id: batchNodeId, type: 'batch',
    label: `Batch ${String(batch.id).substring(0, 8)}`,
    metadata: { weight: batch.total_weight, bags: batch.bag_count, status: batch.status, collected_at: batch.collected_at }
  });

  if (batch.farms) {
    const farm = batch.farms as any;
    const farmNodeId = `farm-${farm.id}`;
    graph.addNode({
      id: farmNodeId, type: 'farm', label: farm.farmer_name || 'Unknown Farmer',
      metadata: { community: farm.community, commodity: farm.commodity, compliance: farm.compliance_status, area: farm.area_hectares }
    });
    graph.addEdge({ source: farmNodeId, target: batchNodeId, label: 'collected from' });
  }

  const { data: contributions } = await supabase
    .from('batch_contributions')
    .select('id, farm_id, farmer_name, weight_kg')
    .eq('batch_id', parseInt(batchId));

  if (contributions) {
    for (const contrib of contributions) {
      if (contrib.farm_id) {
        const farmNodeId = `farm-${contrib.farm_id}`;
        graph.addNode({
          id: farmNodeId, type: 'farm', label: contrib.farmer_name || 'Contributor',
          metadata: { weight_contributed: contrib.weight_kg }
        });
        graph.addEdge({ source: farmNodeId, target: batchNodeId, label: `${contrib.weight_kg || 0} kg` });
      }
    }
  }

  const { data: runBatches } = await supabase
    .from('processing_run_batches')
    .select('processing_run_id, weight_contribution_kg, processing_runs(id, run_code, facility_name, commodity, input_weight_kg, output_weight_kg, recovery_rate, processed_at)')
    .eq('collection_batch_id', parseInt(batchId));

  if (runBatches) {
    for (const rb of runBatches) {
      const run = rb.processing_runs as any;
      if (!run) continue;
      const runNodeId = `processing-${run.id}`;
      graph.addNode({
        id: runNodeId, type: 'processing', label: run.run_code || run.facility_name,
        metadata: { facility: run.facility_name, commodity: run.commodity, input: run.input_weight_kg, output: run.output_weight_kg, recovery: run.recovery_rate, processed_at: run.processed_at }
      });
      graph.addEdge({ source: batchNodeId, target: runNodeId, label: `${rb.weight_contribution_kg || 0} kg` });

      const { data: finishedGoods } = await supabase
        .from('finished_goods')
        .select('id, pedigree_code, product_name, weight_kg, destination_country, buyer_name')
        .eq('processing_run_id', run.id);

      if (finishedGoods) {
        for (const fg of finishedGoods) {
          const fgNodeId = `fg-${fg.id}`;
          graph.addNode({
            id: fgNodeId, type: 'finished_good', label: fg.product_name || fg.pedigree_code,
            metadata: { pedigree: fg.pedigree_code, weight: fg.weight_kg, destination: fg.destination_country, buyer: fg.buyer_name }
          });
          graph.addEdge({ source: runNodeId, target: fgNodeId, label: 'produces' });
        }
      }
    }
  }
}

async function buildShipmentGraph(supabase: any, orgId: string, shipmentId: string, graph: GraphBuilder) {
  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, shipment_code, destination_country, total_weight_kg, status, readiness_score')
    .eq('id', shipmentId)
    .eq('org_id', orgId)
    .single();

  if (!shipment) return;

  const shipNodeId = `shipment-${shipment.id}`;
  graph.addNode({
    id: shipNodeId, type: 'shipment', label: shipment.shipment_code || 'Shipment',
    metadata: { destination: shipment.destination_country, weight: shipment.total_weight_kg, status: shipment.status, score: shipment.readiness_score }
  });

  const { data: contractShipments } = await supabase
    .from('contract_shipments')
    .select('contract_id, contracts(id, contract_reference, commodity, buyer_org_id, buyer_organizations(id, name))')
    .eq('shipment_id', shipmentId);

  if (contractShipments) {
    for (const cs of contractShipments) {
      const contract = cs.contracts as any;
      if (contract?.buyer_organizations) {
        const buyerNodeId = `buyer-${contract.buyer_organizations.id}`;
        graph.addNode({ id: buyerNodeId, type: 'buyer', label: contract.buyer_organizations.name, metadata: { contract: contract.contract_reference, commodity: contract.commodity } });
        graph.addEdge({ source: shipNodeId, target: buyerNodeId, label: contract.contract_reference });
      }
    }
  }

  await addShipmentUpstream(supabase, orgId, shipmentId, shipNodeId, graph);
}

async function addShipmentUpstream(supabase: any, orgId: string, shipmentId: string, shipNodeId: string, graph: GraphBuilder) {
  const { data: lots } = await supabase
    .from('shipment_lots')
    .select('id')
    .eq('shipment_id', shipmentId)
    .eq('org_id', orgId);

  if (lots && lots.length > 0) {
    for (const lot of lots) {
      const { data: lotItems } = await supabase
        .from('shipment_lot_items')
        .select('batch_id')
        .eq('lot_id', lot.id);
      if (lotItems) {
        for (const item of lotItems) {
          if (item.batch_id) {
            await addBatchUpstream(supabase, String(item.batch_id), shipNodeId, graph);
          }
        }
      }
    }
  }

  const { data: shipmentItems } = await supabase
    .from('shipment_items')
    .select('id, batch_id, farm_id, weight_kg')
    .eq('shipment_id', shipmentId);

  if (shipmentItems) {
    for (const si of shipmentItems) {
      if (si.batch_id) {
        await addBatchUpstream(supabase, String(si.batch_id), shipNodeId, graph);
      } else if (si.farm_id) {
        const farmNodeId = `farm-${si.farm_id}`;
        if (!graph.hasNode(farmNodeId)) {
          const { data: farm } = await supabase.from('farms').select('id, farmer_name, community').eq('id', si.farm_id).single();
          if (farm) {
            graph.addNode({ id: farmNodeId, type: 'farm', label: farm.farmer_name, metadata: { community: farm.community } });
          }
        }
        graph.addEdge({ source: farmNodeId, target: shipNodeId, label: `${si.weight_kg || 0} kg` });
      }
    }
  }
}

async function addBatchUpstream(supabase: any, batchId: string, downstreamNodeId: string, graph: GraphBuilder) {
  const batchNodeId = `batch-${batchId}`;
  if (!graph.hasNode(batchNodeId)) {
    const { data: batch } = await supabase
      .from('collection_batches')
      .select('id, status, total_weight, farm_id, farms(id, farmer_name, community, commodity)')
      .eq('id', batchId)
      .single();
    if (!batch) return;
    graph.addNode({
      id: batchNodeId, type: 'batch', label: `Batch ${String(batch.id).substring(0, 8)}`,
      metadata: { weight: batch.total_weight, status: batch.status }
    });
    if (batch.farms) {
      const farm = batch.farms as any;
      const farmNodeId = `farm-${farm.id}`;
      graph.addNode({ id: farmNodeId, type: 'farm', label: farm.farmer_name, metadata: { community: farm.community, commodity: farm.commodity } });
      graph.addEdge({ source: farmNodeId, target: batchNodeId, label: 'collected from' });
    }
  }
  graph.addEdge({ source: batchNodeId, target: downstreamNodeId, label: 'supplies' });
}

async function buildFullGraph(supabase: any, orgId: string, graph: GraphBuilder) {
  const [
    { data: shipments },
    { data: processingRuns },
    { data: finishedGoods },
    { data: batches }
  ] = await Promise.all([
    supabase.from('shipments').select('id, shipment_code, destination_country, total_weight_kg, status, readiness_score').eq('org_id', orgId).order('created_at', { ascending: false }).limit(10),
    supabase.from('processing_runs').select('id, run_code, facility_name, commodity, input_weight_kg, output_weight_kg, recovery_rate, processed_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(20),
    supabase.from('finished_goods').select('id, pedigree_code, product_name, weight_kg, processing_run_id, destination_country, buyer_name').eq('org_id', orgId).order('created_at', { ascending: false }).limit(20),
    supabase.from('collection_batches').select('id, status, total_weight, bag_count, farm_id, farms(id, farmer_name, community, commodity, compliance_status)').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50),
  ]);

  if (batches) {
    for (const b of batches) {
      const batchNodeId = `batch-${b.id}`;
      graph.addNode({
        id: batchNodeId, type: 'batch',
        label: `Batch ${String(b.id).substring(0, 8)}`,
        metadata: { weight: b.total_weight, bags: b.bag_count, status: b.status }
      });
      if (b.farms) {
        const farm = b.farms as any;
        const farmNodeId = `farm-${farm.id}`;
        graph.addNode({
          id: farmNodeId, type: 'farm', label: farm.farmer_name || 'Unknown',
          metadata: { community: farm.community, commodity: farm.commodity, compliance: farm.compliance_status }
        });
        graph.addEdgeDeferred({ source: farmNodeId, target: batchNodeId, label: 'collected from' });
      }
    }
  }

  if (processingRuns) {
    for (const pr of processingRuns) {
      const runNodeId = `processing-${pr.id}`;
      graph.addNode({
        id: runNodeId, type: 'processing', label: pr.run_code || pr.facility_name,
        metadata: { facility: pr.facility_name, commodity: pr.commodity, input: pr.input_weight_kg, output: pr.output_weight_kg, recovery: pr.recovery_rate }
      });

      const { data: runBatches } = await supabase
        .from('processing_run_batches')
        .select('collection_batch_id, weight_contribution_kg')
        .eq('processing_run_id', pr.id);

      if (runBatches) {
        for (const rb of runBatches) {
          graph.addEdgeDeferred({ source: `batch-${rb.collection_batch_id}`, target: runNodeId, label: `${rb.weight_contribution_kg || 0} kg` });
        }
      }
    }
  }

  if (finishedGoods) {
    for (const fg of finishedGoods) {
      const fgNodeId = `fg-${fg.id}`;
      graph.addNode({
        id: fgNodeId, type: 'finished_good', label: fg.product_name || fg.pedigree_code,
        metadata: { pedigree: fg.pedigree_code, weight: fg.weight_kg, destination: fg.destination_country, buyer: fg.buyer_name }
      });
      if (fg.processing_run_id) {
        graph.addEdgeDeferred({ source: `processing-${fg.processing_run_id}`, target: fgNodeId, label: 'produces' });
      }
    }
  }

  if (shipments) {
    for (const s of shipments) {
      const shipNodeId = `shipment-${s.id}`;
      graph.addNode({
        id: shipNodeId, type: 'shipment', label: s.shipment_code || 'Shipment',
        metadata: { destination: s.destination_country, weight: s.total_weight_kg, status: s.status, score: s.readiness_score }
      });

      const { data: contractShipments } = await supabase
        .from('contract_shipments')
        .select('contract_id, contracts(id, contract_reference, buyer_org_id, buyer_organizations(id, name))')
        .eq('shipment_id', s.id);

      if (contractShipments) {
        for (const cs of contractShipments) {
          const contract = cs.contracts as any;
          if (contract?.buyer_organizations) {
            const buyerNodeId = `buyer-${contract.buyer_organizations.id}`;
            graph.addNode({ id: buyerNodeId, type: 'buyer', label: contract.buyer_organizations.name, metadata: { contract: contract.contract_reference } });
            graph.addEdgeDeferred({ source: shipNodeId, target: buyerNodeId, label: contract.contract_reference });
          }
        }
      }

      const { data: lots } = await supabase.from('shipment_lots').select('id').eq('shipment_id', s.id).eq('org_id', orgId);
      if (lots) {
        for (const lot of lots) {
          const { data: lotItems } = await supabase.from('shipment_lot_items').select('batch_id').eq('lot_id', lot.id);
          if (lotItems) {
            for (const li of lotItems) {
              if (li.batch_id) {
                graph.addEdgeDeferred({ source: `batch-${li.batch_id}`, target: shipNodeId, label: 'shipped in' });
              }
            }
          }
        }
      }

      const { data: shipmentItems } = await supabase.from('shipment_items').select('batch_id, farm_id').eq('shipment_id', s.id);
      if (shipmentItems) {
        for (const si of shipmentItems) {
          if (si.batch_id) {
            graph.addEdgeDeferred({ source: `batch-${si.batch_id}`, target: shipNodeId, label: 'shipped in' });
          }
        }
      }
    }
  }
}

async function buildBuyerGraph(supabase: any, buyerOrgId: string, shipmentId: string | null, graph: GraphBuilder) {
  const { data: buyerOrg } = await supabase
    .from('buyer_organizations')
    .select('id, name')
    .eq('id', buyerOrgId)
    .single();

  if (buyerOrg) {
    graph.addNode({ id: `buyer-${buyerOrg.id}`, type: 'buyer', label: buyerOrg.name, metadata: {} });
  }

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, contract_reference, commodity, exporter_org_id, status, organizations(id, name)')
    .eq('buyer_org_id', buyerOrgId)
    .in('status', ['active', 'fulfilled']);

  if (!contracts || contracts.length === 0) return;

  for (const contract of contracts) {
    const { data: contractShipments } = await supabase
      .from('contract_shipments')
      .select('shipment_id')
      .eq('contract_id', contract.id);

    if (!contractShipments) continue;

    for (const cs of contractShipments) {
      if (shipmentId && cs.shipment_id !== shipmentId) continue;

      const { data: shipment } = await supabase
        .from('shipments')
        .select('id, shipment_code, destination_country, total_weight_kg, status')
        .eq('id', cs.shipment_id)
        .single();

      if (!shipment) continue;

      const shipNodeId = `shipment-${shipment.id}`;
      graph.addNode({
        id: shipNodeId, type: 'shipment', label: shipment.shipment_code || 'Shipment',
        metadata: { destination: shipment.destination_country, weight: shipment.total_weight_kg, status: shipment.status }
      });
      graph.addEdge({ source: shipNodeId, target: `buyer-${buyerOrgId}`, label: contract.contract_reference });

      const { data: lots } = await supabase
        .from('shipment_lots')
        .select('id')
        .eq('shipment_id', shipment.id);

      if (lots) {
        for (const lot of lots) {
          const { data: lotItems } = await supabase
            .from('shipment_lot_items')
            .select('batch_id')
            .eq('lot_id', lot.id);

          if (lotItems) {
            for (const li of lotItems) {
              if (li.batch_id) {
                await addBatchUpstream(supabase, String(li.batch_id), shipNodeId, graph);
              }
            }
          }
        }
      }
    }
  }
}
