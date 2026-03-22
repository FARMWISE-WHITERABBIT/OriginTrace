'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Layers, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FarmMapFarm {
  id: string;
  farmer_name: string;
  community: string | null;
  commodity: string | null;
  compliance_status: string;
  area_hectares: number | null;
  boundary: { type: string; coordinates: number[][][] } | null;
}

interface FarmPolygonMapProps {
  farms: FarmMapFarm[];
  selectedFarmId?: string | null;
  onSelectFarm: (farm: FarmMapFarm | null) => void;
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#16a34a',
  pending:  '#f59e0b',
  rejected: '#dc2626',
};

const TILE_URLS: Record<'satellite' | 'street', string> = {
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  street: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};

const TILE_SIZE = 256;

function lngToTileX(lng: number, z: number) { return ((lng + 180) / 360) * 2 ** z; }
function latToTileY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}

export default function FarmPolygonMap({ farms, selectedFarmId, onSelectFarm, loading = false }: FarmPolygonMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(8);
  const [center, setCenter] = useState({ lat: 7.5, lng: 4.5 });
  const [hoveredFarm, setHoveredFarm] = useState<FarmMapFarm | null>(null);
  const [tileLayer, setTileLayer] = useState<'satellite' | 'street'>('satellite');
  const tileCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderRef = useRef<() => void>(() => {});
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, lat: 7.5, lng: 4.5 });

  // Fit canvas to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Auto-center on farms with boundaries
  useEffect(() => {
    const mapped = farms.filter(f => f.boundary?.coordinates?.[0]?.length);
    if (mapped.length === 0) return;
    const lats = mapped.flatMap(f => f.boundary!.coordinates[0].map(p => p[1]));
    const lngs = mapped.flatMap(f => f.boundary!.coordinates[0].map(p => p[0]));
    setCenter({
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    });
    const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
    setZoom(span > 10 ? 5 : span > 5 ? 6 : span > 2 ? 7 : span > 1 ? 8 : span > 0.5 ? 10 : 12);
  }, [farms]);

  // When a farm is selected, fly to its centroid
  useEffect(() => {
    if (!selectedFarmId) return;
    const farm = farms.find(f => f.id === selectedFarmId);
    const ring = farm?.boundary?.coordinates?.[0];
    if (!ring?.length) return;
    const avgLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    const avgLng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    setCenter({ lat: avgLat, lng: avgLng });
    setZoom(z => Math.max(z, 13));
  }, [selectedFarmId, farms]);

  const getTile = useCallback((z: number, tx: number, ty: number): HTMLImageElement | null => {
    const key = `${tileLayer}/${z}/${tx}/${ty}`;
    if (tileCache.current.has(key)) {
      const cached = tileCache.current.get(key)!;
      if (cached.complete && cached.naturalWidth > 0) return cached;
      return null;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => renderRef.current();
    img.onerror = () => { tileCache.current.delete(key); };
    img.src = TILE_URLS[tileLayer]
      .replace('{z}', String(z))
      .replace('{x}', String(tx))
      .replace('{y}', String(ty));
    tileCache.current.set(key, img);
    return null;
  }, [tileLayer]);

  const lngLatToCanvas = useCallback((lng: number, lat: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const cx = lngToTileX(center.lng, zoom) * TILE_SIZE;
    const cy = latToTileY(center.lat, zoom) * TILE_SIZE;
    return {
      x: lngToTileX(lng, zoom) * TILE_SIZE - cx + canvas.width / 2,
      y: latToTileY(lat, zoom) * TILE_SIZE - cy + canvas.height / 2,
    };
  }, [zoom, center]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Tiles
    const cTX = lngToTileX(center.lng, zoom);
    const cTY = latToTileY(center.lat, zoom);
    const tilesX = Math.ceil(canvas.width / TILE_SIZE) + 2;
    const tilesY = Math.ceil(canvas.height / TILE_SIZE) + 2;
    for (let dy = -Math.ceil(tilesY / 2); dy <= Math.ceil(tilesY / 2); dy++) {
      for (let dx = -Math.ceil(tilesX / 2); dx <= Math.ceil(tilesX / 2); dx++) {
        const tX = Math.floor(cTX) + dx;
        const tY = Math.floor(cTY) + dy;
        const maxT = 2 ** zoom;
        if (tX < 0 || tX >= maxT || tY < 0 || tY >= maxT) continue;
        const img = getTile(zoom, tX, tY);
        const px = Math.round((tX - cTX) * TILE_SIZE + canvas.width / 2);
        const py = Math.round((tY - cTY) * TILE_SIZE + canvas.height / 2);
        if (img) {
          ctx.drawImage(img, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = tileLayer === 'satellite' ? '#1a1a2e' : '#e8e8e8';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Farm polygons
    const onSatellite = tileLayer === 'satellite';
    for (const farm of farms) {
      const ring = farm.boundary?.coordinates?.[0];
      if (!ring?.length) continue;
      const color = STATUS_COLORS[farm.compliance_status] || '#94a3b8';
      const isSelected = farm.id === selectedFarmId;
      const isHov = hoveredFarm?.id === farm.id;

      ctx.beginPath();
      ring.forEach(([lng, lat], i) => {
        const { x, y } = lngLatToCanvas(lng, lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();

      ctx.fillStyle = color + (isSelected ? '70' : isHov ? '55' : '35');
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : color;
      ctx.lineWidth = isSelected ? 3 : isHov ? 2.5 : 1.5;
      if (isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Centroid dot + label at higher zoom
      const cen = ring.reduce((a, [lng, lat]) => ({ lng: a.lng + lng, lat: a.lat + lat }), { lng: 0, lat: 0 });
      const { x: cx2, y: cy2 } = lngLatToCanvas(cen.lng / ring.length, cen.lat / ring.length);

      ctx.beginPath();
      ctx.arc(cx2, cy2, isSelected ? 6 : isHov ? 5 : 3, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#ffffff' : color;
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label at zoom ≥ 11
      if (zoom >= 11) {
        const label = farm.farmer_name.split(' ')[0];
        ctx.font = `${isSelected ? 'bold ' : ''}${Math.min(12, 8 + zoom - 10)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const textY = cy2 + 8;
        ctx.fillStyle = onSatellite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
        const tw = ctx.measureText(label).width;
        ctx.fillRect(cx2 - tw / 2 - 3, textY - 1, tw + 6, 14);
        ctx.fillStyle = onSatellite ? '#ffffff' : '#1a1a1a';
        ctx.fillText(label, cx2, textY);
      }
    }
  }, [farms, zoom, center, hoveredFarm, selectedFarmId, lngLatToCanvas, getTile, tileLayer]);

  useEffect(() => { renderRef.current = render; }, [render]);
  useEffect(() => { render(); }, [render]);
  useEffect(() => { tileCache.current.clear(); }, [tileLayer]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag.current = true;
      const scale = TILE_SIZE * 2 ** zoom;
      setCenter({
        lat: Math.max(-85, Math.min(85, dragStart.current.lat + (dy / scale) * 360)),
        lng: dragStart.current.lng - (dx / scale) * 360,
      });
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    for (const farm of farms) {
      const ring = farm.boundary?.coordinates?.[0];
      if (!ring?.length) continue;
      const pts = ring.map(([lng, lat]) => lngLatToCanvas(lng, lat));
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const { x: xi, y: yi } = pts[i]; const { x: xj, y: yj } = pts[j];
        if (((yi > my) !== (yj > my)) && (mx < ((xj - xi) * (my - yi)) / (yj - yi) + xi)) inside = !inside;
      }
      if (inside) { setHoveredFarm(farm); return; }
    }
    setHoveredFarm(null);
  }, [farms, lngLatToCanvas, zoom]);

  const handleClick = useCallback(() => {
    if (didDrag.current) return;
    if (hoveredFarm) {
      onSelectFarm(hoveredFarm.id === selectedFarmId ? null : hoveredFarm);
    } else {
      onSelectFarm(null);
    }
  }, [hoveredFarm, selectedFarmId, onSelectFarm]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom(z => Math.max(4, Math.min(18, z + (e.deltaY < 0 ? 1 : -1))));
  }, []);

  const zoomIn = () => setZoom(z => Math.min(18, z + 1));
  const zoomOut = () => setZoom(z => Math.max(4, z - 1));

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Loading farm polygons…</p>
      </div>
    </div>
  );

  const mappedCount = farms.filter(f => f.boundary?.coordinates?.[0]?.length).length;

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-muted/20">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`block ${hoveredFarm ? 'cursor-pointer' : isDragging.current ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseDown={e => {
          isDragging.current = true;
          didDrag.current = false;
          dragStart.current = { x: e.clientX, y: e.clientY, lat: center.lat, lng: center.lng };
        }}
        onMouseUp={() => { isDragging.current = false; }}
        onMouseLeave={() => { isDragging.current = false; didDrag.current = false; setHoveredFarm(null); }}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-4 flex flex-col gap-1">
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow" onClick={zoomIn}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow" onClick={zoomOut}>
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* Layer toggle */}
      <div className="absolute bottom-6 left-4">
        <Button
          variant="secondary"
          size="sm"
          className="shadow gap-1.5"
          onClick={() => setTileLayer(l => l === 'satellite' ? 'street' : 'satellite')}
        >
          <Layers className="h-3.5 w-3.5" />
          {tileLayer === 'satellite' ? 'Street' : 'Satellite'}
        </Button>
      </div>

      {/* Farm count badge */}
      <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm border rounded-md px-2.5 py-1.5 text-xs flex items-center gap-3 shadow">
        <span className="font-medium">{mappedCount} mapped</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" />approved</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />pending</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block" />rejected</span>
      </div>

      {/* Hover tooltip */}
      {hoveredFarm && !isDragging.current && (
        <div className="absolute pointer-events-none bg-background/95 border rounded-lg shadow-lg p-2.5 text-xs max-w-[180px]"
          style={{ bottom: 60, right: 60 }}>
          <p className="font-semibold">{hoveredFarm.farmer_name}</p>
          {hoveredFarm.community && <p className="text-muted-foreground mt-0.5">{hoveredFarm.community}</p>}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[hoveredFarm.compliance_status] || '#94a3b8' }} />
            <span className="capitalize">{hoveredFarm.compliance_status}</span>
            {hoveredFarm.area_hectares && <span className="text-muted-foreground">· {hoveredFarm.area_hectares}ha</span>}
          </div>
          <p className="text-muted-foreground mt-1.5 text-[10px]">Click to view details</p>
        </div>
      )}

      {mappedCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/90 backdrop-blur-sm rounded-xl p-8 text-center shadow-lg">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="font-semibold">No farms mapped yet</p>
            <p className="text-sm text-muted-foreground mt-1">Register farmers and draw boundaries to see them here</p>
          </div>
        </div>
      )}
    </div>
  );
}
