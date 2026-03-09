'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, Maximize2, X, Network } from 'lucide-react';

interface GraphNode {
  id: string;
  type: 'farm' | 'batch' | 'processing' | 'finished_good' | 'shipment' | 'buyer';
  label: string;
  metadata: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
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

const NODE_RADIUS = 24;

function useForceSimulation(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) {
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>([]);
  const animationRef = useRef<number | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const alpha = useRef(1);

  useEffect(() => {
    if (nodes.length === 0) {
      setSimulatedNodes([]);
      return;
    }

    const simNodes: GraphNode[] = nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * Math.min(width, 600),
      y: height / 2 + (Math.random() - 0.5) * Math.min(height, 400),
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    }));

    nodesRef.current = simNodes;
    alpha.current = 1;

    const nodeMap = new Map(simNodes.map(n => [n.id, n]));

    function tick() {
      if (alpha.current < 0.001) {
        setSimulatedNodes([...nodesRef.current]);
        return;
      }

      alpha.current *= 0.99;
      const dampening = 0.6;

      for (const node of nodesRef.current) {
        if (node.fx != null) { node.x = node.fx; node.vx = 0; }
        if (node.fy != null) { node.y = node.fy; node.vy = 0; }
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const centerStrength = 0.01 * alpha.current;
      for (const node of nodesRef.current) {
        if (node.fx != null) continue;
        node.vx! += (centerX - (node.x || 0)) * centerStrength;
        node.vy! += (centerY - (node.y || 0)) * centerStrength;
      }

      const repulsionStrength = -300 * alpha.current;
      for (let i = 0; i < nodesRef.current.length; i++) {
        for (let j = i + 1; j < nodesRef.current.length; j++) {
          const a = nodesRef.current[i];
          const b = nodesRef.current[j];
          let dx = (b.x || 0) - (a.x || 0);
          let dy = (b.y || 0) - (a.y || 0);
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 1) dist = 1;
          const force = repulsionStrength / (dist * dist);
          const fx = force * dx / dist;
          const fy = force * dy / dist;
          if (a.fx == null) { a.vx! += fx; a.vy! += fy; }
          if (b.fx == null) { b.vx! -= fx; b.vy! -= fy; }
        }
      }

      const linkStrength = 0.05 * alpha.current;
      const idealDist = 120;
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;
        let dx = (target.x || 0) - (source.x || 0);
        let dy = (target.y || 0) - (source.y || 0);
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const diff = (dist - idealDist) * linkStrength;
        const fx = diff * dx / dist;
        const fy = diff * dy / dist;
        if (source.fx == null) { source.vx! += fx; source.vy! += fy; }
        if (target.fx == null) { target.vx! -= fx; target.vy! -= fy; }
      }

      for (const node of nodesRef.current) {
        if (node.fx != null || node.fy != null) continue;
        node.vx! *= dampening;
        node.vy! *= dampening;
        node.x = (node.x || 0) + (node.vx || 0);
        node.y = (node.y || 0) + (node.vy || 0);
        node.x = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, node.x));
        node.y = Math.max(NODE_RADIUS, Math.min(height - NODE_RADIUS, node.y));
      }

      setSimulatedNodes([...nodesRef.current]);
      animationRef.current = requestAnimationFrame(tick);
    }

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, edges, width, height]);

  const setNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
      node.x = x;
      node.y = y;
      alpha.current = 0.3;
    }
  }, []);

  const releaseNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  }, []);

  return { simulatedNodes, setNodePosition, releaseNode };
}

export function SupplyChainGraph({ shipmentId, batchId, isBuyer }: SupplyChainGraphProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.max(400, width), height: Math.max(300, height) });
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  const { simulatedNodes, setNodePosition, releaseNode } = useForceSimulation(
    nodes, edges, dimensions.width, dimensions.height
  );

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

  const nodeMap = useMemo(() => new Map(simulatedNodes.map(n => [n.id, n])), [simulatedNodes]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNode) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan, draggingNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNode) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setNodePosition(draggingNode, x, y);
      return;
    }
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart, draggingNode, pan, zoom, setNodePosition]);

  const handleMouseUp = useCallback(() => {
    if (draggingNode) {
      releaseNode(draggingNode);
      setDraggingNode(null);
    }
    setIsPanning(false);
  }, [draggingNode, releaseNode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(3, z * delta)));
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNode(nodeId);
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    if (!draggingNode) {
      setSelectedNode(prev => prev?.id === node.id ? null : node);
    }
  }, [draggingNode]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of nodes) {
      counts[n.type] = (counts[n.type] || 0) + 1;
    }
    return counts;
  }, [nodes]);

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
          <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.min(3, z * 1.2))} data-testid="button-zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} data-testid="button-zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={resetView} data-testid="button-reset-view">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div
          ref={containerRef}
          className="flex-1 border rounded-md overflow-hidden bg-muted/20 relative"
          style={{ minHeight: '500px' }}
        >
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            data-testid="svg-supply-chain-graph"
          >
            <defs>
              <marker
                id="arrowhead"
                viewBox="0 0 10 7"
                refX="10"
                refY="3.5"
                markerWidth="8"
                markerHeight="6"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" opacity="0.5" />
              </marker>
            </defs>
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {edges.map((edge, i) => {
                const source = nodeMap.get(edge.source);
                const target = nodeMap.get(edge.target);
                if (!source || !target || source.x == null || target.x == null) return null;

                const dx = (target.x || 0) - (source.x || 0);
                const dy = (target.y || 0) - (source.y || 0);
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const offsetX = (dx / dist) * NODE_RADIUS;
                const offsetY = (dy / dist) * NODE_RADIUS;

                return (
                  <g key={`edge-${i}`}>
                    <line
                      x1={(source.x || 0) + offsetX}
                      y1={(source.y || 0) + offsetY}
                      x2={(target.x || 0) - offsetX}
                      y2={(target.y || 0) - offsetY}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1.5}
                      strokeOpacity={0.3}
                      markerEnd="url(#arrowhead)"
                    />
                    {edge.label && zoom > 0.6 && (
                      <text
                        x={((source.x || 0) + (target.x || 0)) / 2}
                        y={((source.y || 0) + (target.y || 0)) / 2 - 6}
                        textAnchor="middle"
                        fontSize={9}
                        fill="hsl(var(--muted-foreground))"
                        opacity={0.6}
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {simulatedNodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x || 0}, ${node.y || 0})`}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onClick={(e) => handleNodeClick(e, node)}
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
                    <circle
                      r={8}
                      fill={NODE_COLORS[node.type] || '#6b7280'}
                    />
                    {zoom > 0.5 && (
                      <text
                        y={NODE_RADIUS + 14}
                        textAnchor="middle"
                        fontSize={10}
                        fill="hsl(var(--foreground))"
                        fontWeight={isSelected ? 600 : 400}
                      >
                        {node.label.length > 18 ? node.label.substring(0, 16) + '...' : node.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
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
                <Button size="icon" variant="ghost" onClick={() => setSelectedNode(null)} data-testid="button-close-detail">
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
