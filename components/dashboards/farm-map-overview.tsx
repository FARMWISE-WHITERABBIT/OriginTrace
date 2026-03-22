'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin } from 'lucide-react';

interface Farm {
  id: string;
  farmer_name: string;
  community: string | null;
  commodity: string | null;
  compliance_status: string;
  area_hectares: number | null;
  boundary: { type: string; coordinates: number[][][] } | null;
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#16a34a',
  pending:  '#f59e0b',
  rejected: '#dc2626',
};

const TILE_SIZE = 256;

function lngToTileX(lng: number, z: number) { return ((lng + 180) / 360) * 2 ** z; }
function latToTileY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}

export default function FarmMapOverview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(7);
  const [center, setCenter] = useState({ lat: 7.5, lng: 4.5 });
  const [hoveredFarm, setHoveredFarm] = useState<Farm | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const router = useRouter();
  const tileCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const isDragging = useRef(false);
  // Track whether the pointer actually moved during a mousedown so we can
  // distinguish a click (navigate) from a drag (pan).
  const didDrag = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, lat: 7.5, lng: 4.5 });

  useEffect(() => {
    async function loadFarms() {
      try {
        const res = await fetch('/api/farms?limit=1000');
        if (!res.ok) throw new Error();
        const json = await res.json();
        const withBoundary = (json.farms || []).filter((f: any) => f.boundary?.coordinates?.length > 0) as Farm[];
        setFarms(withBoundary);
        if (withBoundary.length > 0) {
          const lats = withBoundary.flatMap(f => f.boundary!.coordinates[0].map((p: number[]) => p[1]));
          const lngs = withBoundary.flatMap(f => f.boundary!.coordinates[0].map((p: number[]) => p[0]));
          setCenter({ lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 });
          const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
          setZoom(span > 10 ? 5 : span > 5 ? 6 : span > 2 ? 7 : span > 1 ? 8 : 9);
        }
      } catch { /* show empty state */ } finally {
        setLoading(false);
      }
    }
    loadFarms();
  }, []);

  const getTile = useCallback((z: number, x: number, y: number): HTMLImageElement | null => {
    const key = `${z}/${x}/${y}`;
    if (tileCache.current.has(key)) {
      const cached = tileCache.current.get(key)!;
      // Only return if fully loaded and not broken
      if (cached.complete && cached.naturalWidth > 0) return cached;
      return null;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => render();
    img.onerror = () => {
      // Remove broken tile from cache so it can be retried
      tileCache.current.delete(key);
    };
    img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
    tileCache.current.set(key, img);
    return null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lngLatToCanvas = useCallback((lng: number, lat: number, canvas: HTMLCanvasElement) => {
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
        if (img) ctx.drawImage(img, Math.round((tX - cTX) * TILE_SIZE + canvas.width / 2), Math.round((tY - cTY) * TILE_SIZE + canvas.height / 2), TILE_SIZE, TILE_SIZE);
      }
    }
    for (const farm of farms) {
      if (!farm.boundary?.coordinates?.[0]) continue;
      const coords: number[][] = farm.boundary.coordinates[0];
      const color = STATUS_COLORS[farm.compliance_status] || '#94a3b8';
      const isHov = hoveredFarm?.id === farm.id;
      ctx.beginPath();
      coords.forEach(([lng, lat], i) => {
        const { x, y } = lngLatToCanvas(lng, lat, canvas);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = color + (isHov ? '60' : '35');
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = isHov ? 3 : 1.5;
      ctx.stroke();
      const cen = coords.reduce((a, [lng, lat]) => ({ lng: a.lng + lng, lat: a.lat + lat }), { lng: 0, lat: 0 });
      const { x: cx2, y: cy2 } = lngLatToCanvas(cen.lng / coords.length, cen.lat / coords.length, canvas);
      ctx.beginPath();
      ctx.arc(cx2, cy2, isHov ? 5 : 3, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [farms, zoom, center, hoveredFarm, lngLatToCanvas, getTile]);

  useEffect(() => { render(); }, [render]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag.current = true;
      const scale = TILE_SIZE * 2 ** zoom;
      setCenter({ lat: Math.max(-85, Math.min(85, dragStart.current.lat + (dy / scale) * 360)), lng: dragStart.current.lng - (dx / scale) * 360 });
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    for (const farm of farms) {
      if (!farm.boundary?.coordinates?.[0]) continue;
      const pts = (farm.boundary.coordinates[0] as number[][]).map(([lng, lat]) => lngLatToCanvas(lng, lat, canvas));
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const { x: xi, y: yi } = pts[i]; const { x: xj, y: yj } = pts[j];
        if (((yi > my) !== (yj > my)) && (mx < ((xj - xi) * (my - yi)) / (yj - yi) + xi)) inside = !inside;
      }
      if (inside) { setHoveredFarm(farm); setTooltip({ x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY - canvas.getBoundingClientRect().top }); return; }
    }
    setHoveredFarm(null); setTooltip(null);
  }, [farms, lngLatToCanvas, zoom]);

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading farms...
    </div>
  );

  const approved = farms.filter(f => f.compliance_status === 'approved').length;
  const pending = farms.filter(f => f.compliance_status === 'pending').length;
  const rejected = farms.filter(f => f.compliance_status === 'rejected').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground">{farms.length} mapped farm{farms.length !== 1 ? 's' : ''}</span>
        {[['#16a34a', approved, 'Approved'], ['#f59e0b', pending, 'Pending'], ['#dc2626', rejected, 'Risk']].map(([c, n, l]) => (
          <div key={String(l)} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: String(c) }} />{n} {l}</div>
        ))}
        <span className="ml-auto text-muted-foreground hidden sm:block">Scroll to zoom · Drag to pan</span>
      </div>
      <div className="relative rounded-lg overflow-hidden border">
        <canvas
          ref={canvasRef} width={800} height={400}
          className={`w-full ${hoveredFarm ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`} style={{ height: '400px' }}
          onMouseMove={handleMouseMove}
          onMouseDown={e => { isDragging.current = true; didDrag.current = false; dragStart.current = { x: e.clientX, y: e.clientY, lat: center.lat, lng: center.lng }; }}
          onMouseUp={() => { isDragging.current = false; }}
          onMouseLeave={() => { isDragging.current = false; didDrag.current = false; setHoveredFarm(null); setTooltip(null); }}
          onWheel={e => { e.preventDefault(); setZoom(z => Math.max(5, Math.min(14, z + (e.deltaY < 0 ? 1 : -1)))); }}
          onClick={() => { if (hoveredFarm && !didDrag.current) { router.push(`/app/farms/map?farm_id=${hoveredFarm.id}`); } }}
        />
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {['+', '−'].map((label, i) => (
            <button key={label} className="w-7 h-7 bg-background/90 border rounded text-sm font-bold hover:bg-background flex items-center justify-center shadow"
              onClick={() => setZoom(z => Math.max(5, Math.min(14, z + (i === 0 ? 1 : -1))))}>
              {label}
            </button>
          ))}
        </div>
        {hoveredFarm && tooltip && (
          <div className="absolute pointer-events-none bg-background/95 border rounded-lg shadow-lg p-3 text-xs max-w-[200px]"
            style={{ left: Math.min(tooltip.x + 12, (canvasRef.current?.clientWidth ?? 800) - 220), top: Math.max(tooltip.y - 60, 8) }}>
            <p className="font-semibold">{hoveredFarm.farmer_name}</p>
            {hoveredFarm.community && <p className="text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{hoveredFarm.community}</p>}
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {hoveredFarm.commodity && <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">{hoveredFarm.commodity}</span>}
              {hoveredFarm.area_hectares && <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">{hoveredFarm.area_hectares}ha</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[hoveredFarm.compliance_status] || '#94a3b8' }} />
              <span className="capitalize">{hoveredFarm.compliance_status}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Click to open farm mapping</p>
          </div>
        )}
        {farms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm rounded-lg">
            No GPS-mapped farms yet
          </div>
        )}
      </div>
    </div>
  );
}
