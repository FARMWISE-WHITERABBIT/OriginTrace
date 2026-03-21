'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MousePointer2,
  Undo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Move,
  Crosshair,
  Layers,
} from 'lucide-react';

interface Coordinates {
  lat: number;
  lng: number;
}

type TileLayer = 'satellite' | 'street';

const TILE_URLS: Record<TileLayer, string> = {
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  street: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};

interface SatelliteMapProps {
  coordinates: Coordinates[];
  onPointsChange: (points: Coordinates[]) => void;
  center: Coordinates;
  satelliteEnabled?: boolean;
}

const TILE_SIZE = 256;

function lngToTileX(lng: number, zoom: number) {
  return ((lng + 180) / 360) * Math.pow(2, zoom);
}

function latToTileY(lat: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

function tileXToLng(x: number, zoom: number) {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

function tileYToLat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export default function SatelliteMap({ coordinates, onPointsChange, center, satelliteEnabled = true }: SatelliteMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(16);
  const [mapCenter, setMapCenter] = useState(center);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [drawMode, setDrawMode] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [tileLayer, setTileLayer] = useState<TileLayer>(satelliteEnabled ? 'satellite' : 'street');
  const tileCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const drawMapRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCanvasSize({ width: Math.floor(rect.width), height: 400 });
    }
  }, []);

  const loadTile = useCallback((tileX: number, tileY: number, z: number): HTMLImageElement | null => {
    const key = `${tileLayer}/${z}/${tileX}/${tileY}`;
    if (tileCache.current.has(key)) {
      return tileCache.current.get(key) || null;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = TILE_URLS[tileLayer]
      .replace('{z}', String(z))
      .replace('{x}', String(tileX))
      .replace('{y}', String(tileY));
    img.onload = () => {
      tileCache.current.set(key, img);
      drawMapRef.current();
    };
    return null;
  }, [tileLayer]);

  const lngLatToPixel = useCallback((lng: number, lat: number) => {
    const centerTileX = lngToTileX(mapCenter.lng, zoom);
    const centerTileY = latToTileY(mapCenter.lat, zoom);
    const pointTileX = lngToTileX(lng, zoom);
    const pointTileY = latToTileY(lat, zoom);
    const px = canvasSize.width / 2 + (pointTileX - centerTileX) * TILE_SIZE;
    const py = canvasSize.height / 2 + (pointTileY - centerTileY) * TILE_SIZE;
    return { x: px, y: py };
  }, [mapCenter, zoom, canvasSize]);

  const pixelToLngLat = useCallback((px: number, py: number): Coordinates => {
    const centerTileX = lngToTileX(mapCenter.lng, zoom);
    const centerTileY = latToTileY(mapCenter.lat, zoom);
    const tileX = centerTileX + (px - canvasSize.width / 2) / TILE_SIZE;
    const tileY = centerTileY + (py - canvasSize.height / 2) / TILE_SIZE;
    return {
      lng: tileXToLng(tileX, zoom),
      lat: tileYToLat(tileY, zoom),
    };
  }, [mapCenter, zoom, canvasSize]);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    const centerTileX = lngToTileX(mapCenter.lng, zoom);
    const centerTileY = latToTileY(mapCenter.lat, zoom);

    const tilesX = Math.ceil(canvasSize.width / TILE_SIZE) + 2;
    const tilesY = Math.ceil(canvasSize.height / TILE_SIZE) + 2;

    const startTileX = Math.floor(centerTileX - tilesX / 2);
    const startTileY = Math.floor(centerTileY - tilesY / 2);

    for (let tx = startTileX; tx <= startTileX + tilesX; tx++) {
      for (let ty = startTileY; ty <= startTileY + tilesY; ty++) {
        const maxTile = Math.pow(2, zoom);
        const wrappedTx = ((tx % maxTile) + maxTile) % maxTile;
        if (ty < 0 || ty >= maxTile) continue;

        const px = canvasSize.width / 2 + (tx - centerTileX) * TILE_SIZE;
        const py = canvasSize.height / 2 + (ty - centerTileY) * TILE_SIZE;

        const tile = loadTile(wrappedTx, ty, zoom);
        if (tile && tile.complete) {
          ctx.drawImage(tile, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#cbd5e1';
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    if (coordinates.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#2D5A27';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(45, 90, 39, 0.15)';

      const firstPt = lngLatToPixel(coordinates[0].lng, coordinates[0].lat);
      ctx.moveTo(firstPt.x, firstPt.y);

      for (let i = 1; i < coordinates.length; i++) {
        const pt = lngLatToPixel(coordinates[i].lng, coordinates[i].lat);
        ctx.lineTo(pt.x, pt.y);
      }

      if (coordinates.length >= 3) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();

      coordinates.forEach((coord, i) => {
        const pt = lngLatToPixel(coord.lng, coord.lat);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#2D5A27' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#2D5A27';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = tileLayer === 'satellite' ? '#ffffff' : '#1a1a1a';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, pt.x, pt.y - 10);
      });
    }

    if (drawMode) {
      ctx.beginPath();
      ctx.arc(canvasSize.width / 2, canvasSize.height / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(45, 90, 39, 0.5)';
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(4, canvasSize.height - 20, 180, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${mapCenter.lat.toFixed(5)}, ${mapCenter.lng.toFixed(5)} z${zoom}`, 8, canvasSize.height - 8);
  }, [mapCenter, zoom, coordinates, canvasSize, loadTile, lngLatToPixel, drawMode]);

  useEffect(() => {
    drawMapRef.current = drawMap;
  }, [drawMap]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawMode || isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const coord = pixelToLngLat(x, y);
    onPointsChange([...coordinates, coord]);
  }, [drawMode, isDragging, pixelToLngLat, coordinates, onPointsChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [drawMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const centerTileX = lngToTileX(mapCenter.lng, zoom);
    const centerTileY = latToTileY(mapCenter.lat, zoom);
    const newTileX = centerTileX - dx / TILE_SIZE;
    const newTileY = centerTileY - dy / TILE_SIZE;
    setMapCenter({
      lng: tileXToLng(newTileX, zoom),
      lat: tileYToLat(newTileY, zoom),
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, mapCenter, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (drawMode) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
  }, [drawMode]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;
    const centerTileX = lngToTileX(mapCenter.lng, zoom);
    const centerTileY = latToTileY(mapCenter.lat, zoom);
    const newTileX = centerTileX - dx / TILE_SIZE;
    const newTileY = centerTileY - dy / TILE_SIZE;
    setMapCenter({
      lng: tileXToLng(newTileX, zoom),
      lat: tileYToLat(newTileY, zoom),
    });
    setDragStart({ x: touch.clientX, y: touch.clientY });
  }, [isDragging, dragStart, mapCenter, zoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (drawMode && !isDragging) {
      const touch = e.changedTouches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const coord = pixelToLngLat(x, y);
      onPointsChange([...coordinates, coord]);
    }
    setIsDragging(false);
    setDragStart(null);
  }, [drawMode, isDragging, pixelToLngLat, coordinates, onPointsChange]);

  const undoLastPoint = () => {
    if (coordinates.length > 0) {
      onPointsChange(coordinates.slice(0, -1));
    }
  };

  const zoomIn = () => setZoom(z => Math.min(z + 1, 19));
  const zoomOut = () => setZoom(z => Math.max(z - 1, 10));

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant={drawMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDrawMode(true)}
            data-testid="button-draw-mode"
          >
            <Crosshair className="h-4 w-4 mr-1" />
            Draw
          </Button>
          <Button
            variant={!drawMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDrawMode(false)}
            data-testid="button-pan-mode"
          >
            <Move className="h-4 w-4 mr-1" />
            Pan
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTileLayer(tileLayer === 'satellite' ? 'street' : 'satellite')}
            disabled={!satelliteEnabled && tileLayer === 'street'}
            data-testid="button-toggle-tile-layer"
          >
            <Layers className="h-4 w-4 mr-1" />
            {tileLayer === 'satellite' ? 'Street' : 'Satellite'}
          </Button>
          <Button variant="outline" size="icon" onClick={zoomOut} aria-label="Zoom out" data-testid="button-zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="font-mono text-xs">{zoom}</Badge>
          <Button variant="outline" size="icon" onClick={zoomIn} aria-label="Zoom in" data-testid="button-zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={undoLastPoint}
            disabled={coordinates.length === 0}
            data-testid="button-undo-point"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPointsChange([])}
            disabled={coordinates.length === 0}
            data-testid="button-clear-all"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden border">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full ${drawMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ height: '400px', touchAction: 'none' }}
          data-testid="canvas-satellite-map"
        />
        {drawMode && (
          <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <MousePointer2 className="h-3 w-3" />
            Tap corners to draw polygon
          </div>
        )}
        {coordinates.length > 0 && coordinates.length < 3 && (
          <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
            {3 - coordinates.length} more point{3 - coordinates.length > 1 ? 's' : ''} needed
          </div>
        )}
      </div>
    </div>
  );
}
