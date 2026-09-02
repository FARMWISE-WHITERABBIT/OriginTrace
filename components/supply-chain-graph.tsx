'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, Maximize2, X, Network } from 'lucide-react';

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

interface SupplyChainGraphProps {
  shipmentId?: string;
  batchId?: string;
  isBuyer?: boolean;
}

const NODE_COLORS: Record<string, string> = {
  farm: '#22c55e',
  batch: '#f59e0b',
  processing: '#3b82f6',
  finished_good: '#a855f7',
  shipment: '#14b8a6',
  buyer: '#6b7280',
};

const NODE_LABELS: Record<string, string> = {
  farm: 'Farm',
  batch: 'Batch',
  processing: 'Processing',
  finished_good: 'Finished Good',
  shipment: 'Shipment',
  buyer: 'Buyer',
};

// Stages run left to right in the order goods actually move through the
// supply chain — this is the whole fix for the old force-directed layout,
// which had no notion of flow direction and just settled into a tangle.
const STAGE_ORDER: GraphNode['type'][] = ['farm', 'batch', 'processing', 'finished_good', 'shipment', 'buyer'];

const NODE_RADIUS = 22;
const COLUMN_HEADER_HEIGHT = 36;
const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 90;
const MIN_HEIGHT = 360;

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

function layoutColumns(nodes: GraphNode[]): { positioned: PositionedNode[]; stages: GraphNode['type'][]; width: number; height: number } {
  const stages = STAGE_ORDER.filter((stage) => nodes.some((n) => n.type === stage));
  const columnsOf: Record<string, GraphNode[]> = {};
  for (const stage of stages) columnsOf[stage] = nodes.filter((n) => n.type === stage);

  const width = Math.max(stages.length * COLUMN_WIDTH, COLUMN_WIDTH);
  const maxRows = Math.max(1, ...stages.map((s) => columnsOf[s].length));
  const height = Math.max(MIN_HEIGHT, COLUMN_HEADER_HEIGHT + (maxRows + 1) * ROW_HEIGHT);

  const positioned: PositionedNode[] = [];
  stages.forEach((stage, colIndex) => {
    const colNodes = columnsOf[stage];
    const x = colIndex * COLUMN_WIDTH + COLUMN_WIDTH / 2;
    const rowSpacing = (height - COLUMN_HEADER_HEIGHT) / (colNodes.length + 1);
    colNodes.forEach((node, rowIndex) => {
      positioned.push({
        ...node,
        x,
        y: COLUMN_HEADER_HEIGHT + rowSpacing * (rowIndex + 1),
      });
    });
  });

  return { positioned, stages, width, height };
}

export function SupplyChainGraph({ shipmentId, batchId }: SupplyChainGraphProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchGraph() {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (shipmentId) params.set('shipment_id', shipmentId);
        if (batchId) params.set('batch_id', batchId);
        const res = await fetch(`/api/supply-chain-graph?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch graph data');
        }
        const data = await res.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load graph');
      } finally {
        setIsLoading(false);
      }
    }
    fetchGraph();
  }, [shipmentId, batchId]);

  const { positioned, stages, width, height } = useMemo(() => layoutColumns(nodes), [nodes]);
  const nodeMap = useMemo(() => new Map(positioned.map((n) => [n.id, n])), [positioned]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of nodes) counts[n.type] = (counts[n.type] || 0) + 1;
    return counts;
  }, [nodes]);

  const resetZoom = () => setZoom(1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Network className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">Unable to load graph</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Network className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No supply chain data</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Supply chain network data will appear here once farms, batches, and shipments are recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(typeCounts).map(([type, count]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} />
              <span className="text-muted-foreground">{NODE_LABELS[type] || type} ({count})</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(2)))} aria-label="Zoom in" data-testid="button-zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))} aria-label="Zoom out" data-testid="button-zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={resetZoom} aria-label="Reset zoom" data-testid="button-reset-view">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div
          ref={containerRef}
          className="flex-1 border rounded-md overflow-auto bg-muted/20"
          style={{ minHeight: '420px' }}
        >
          <svg
            width={width * zoom}
            height={height * zoom}
            viewBox={`0 0 ${width} ${height}`}
            data-testid="svg-supply-chain-graph"
          >
            <defs>
              <marker id="arrowhead" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" opacity="0.5" />
              </marker>
            </defs>

            {stages.map((stage, i) => (
              <text
                key={stage}
                x={i * COLUMN_WIDTH + COLUMN_WIDTH / 2}
                y={COLUMN_HEADER_HEIGHT - 14}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="hsl(var(--foreground))"
                data-testid={`column-header-${stage}`}
              >
                {NODE_LABELS[stage] || stage}
              </text>
            ))}
            {stages.slice(1).map((stage, i) => (
              <line
                key={`divider-${stage}`}
                x1={(i + 1) * COLUMN_WIDTH}
                y1={0}
                x2={(i + 1) * COLUMN_WIDTH}
                y2={height}
                stroke="hsl(var(--border))"
                strokeDasharray="4 4"
              />
            ))}

            {edges.map((edge, i) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;

              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const offsetX = (dx / dist) * NODE_RADIUS;
              const offsetY = (dy / dist) * NODE_RADIUS;

              return (
                <line
                  key={`edge-${i}`}
                  x1={source.x + offsetX}
                  y1={source.y + offsetY}
                  x2={target.x - offsetX}
                  y2={target.y - offsetY}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}

            {positioned.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode((prev) => (prev?.id === node.id ? null : node))}
                  className="cursor-pointer"
                  data-testid={`node-${node.id}`}
                >
                  <circle
                    r={NODE_RADIUS}
                    fill={NODE_COLORS[node.type] || '#6b7280'}
                    fillOpacity={0.15}
                    stroke={NODE_COLORS[node.type] || '#6b7280'}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeOpacity={isSelected ? 1 : 0.7}
                  />
                  <circle r={7} fill={NODE_COLORS[node.type] || '#6b7280'} />
                  <text
                    y={NODE_RADIUS + 14}
                    textAnchor="middle"
                    fontSize={10}
                    fill="hsl(var(--foreground))"
                    fontWeight={isSelected ? 600 : 400}
                  >
                    {node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {selectedNode && (
          <Card className="w-72 shrink-0 self-start" data-testid="panel-node-detail">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[selectedNode.type] }} />
                  <CardTitle className="text-sm truncate">{selectedNode.label}</CardTitle>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSelectedNode(null)} aria-label="Close detail" data-testid="button-close-detail">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant="secondary" className="w-fit">{NODE_LABELS[selectedNode.type] || selectedNode.type}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(selectedNode.metadata).map(([key, value]) => {
                if (value == null || value === '') return null;
                return (
                  <div key={key} className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-right truncate max-w-[140px]">
                      {typeof value === 'number' ? value.toLocaleString() : String(value)}
                    </span>
                  </div>
                );
              })}
              {Object.keys(selectedNode.metadata).length === 0 && (
                <p className="text-sm text-muted-foreground">No additional details available</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
