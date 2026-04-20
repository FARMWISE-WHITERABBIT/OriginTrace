'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Layers, AlertTriangle, CheckCircle2, XCircle, Merge, Eye, MapPin, User, Calendar,
  Crosshair, RefreshCw, Loader2, ScanSearch, Users, Info, X, Shield,
} from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

interface Farm {
  id: number;
  farmer_name: string;
  community: string | null;
  commodity: string | null;
  area_hectares: number | null;
  boundary: { type?: string; coordinates: number[][][] } | null;
  compliance_status: string;
  created_at: string;
  gps_accuracy: number | null;
  synced_at: string | null;
  agent?: { full_name: string; user_id: string } | null;
}

interface Conflict {
  id: number;
  overlap_ratio: number;
  status: string;
  created_at: string;
  farm_a: Farm;
  farm_b: Farm;
}

interface ScanResult {
  scanned: number;
  new_conflicts: number;
  skipped_existing: number;
}

// ─── Canvas helpers ────────────────────────────────────────────────────────────

type Coord = [number, number];

function buildPolygonPath(
  ctx: CanvasRenderingContext2D,
  coords: number[][],
  toPixel: (lng: number, lat: number) => { x: number; y: number },
) {
  if (coords.length < 3) return;
  ctx.beginPath();
  const first = toPixel(coords[0][0], coords[0][1]);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < coords.length; i++) {
    const pt = toPixel(coords[i][0], coords[i][1]);
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
}

function drawConflictCanvas(
  canvas: HTMLCanvasElement,
  farmA: Farm,
  farmB: Farm,
  overlayMode: boolean,
  compact: boolean = false,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'hsl(120, 5%, 95%)';
  ctx.fillRect(0, 0, w, h);

  const coordsA = farmA.boundary?.coordinates?.[0] || [];
  const coordsB = farmB.boundary?.coordinates?.[0] || [];

  if (coordsA.length === 0 && coordsB.length === 0) {
    ctx.fillStyle = 'hsl(150, 10%, 40%)';
    ctx.font = compact ? '10px var(--font-mono, monospace)' : '13px var(--font-mono, monospace)';
    ctx.textAlign = 'center';
    ctx.fillText('No boundary data', w / 2, h / 2);
    return;
  }

  const allCoords = [...coordsA, ...coordsB];
  const lngs = allCoords.map(c => c[0]);
  const lats = allCoords.map(c => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const padding = compact ? 8 : 30;
  const legendHeight = compact ? 0 : 50;
  const drawW = w - padding * 2;
  const drawH = h - padding * 2 - legendHeight;
  const rangeLng = maxLng - minLng || 0.001;
  const rangeLat = maxLat - minLat || 0.001;
  const scale = Math.min(drawW / rangeLng, drawH / rangeLat);

  const toPixel = (lng: number, lat: number) => ({
    x: padding + (lng - minLng) * scale + (drawW - rangeLng * scale) / 2,
    y: padding + (maxLat - lat) * scale + (drawH - rangeLat * scale) / 2,
  });

  const fillAlpha = overlayMode ? 0.25 : 0.15;
  const strokeAlpha = overlayMode ? 0.8 : 0.6;
  const lineW = compact ? 1.5 : 2;

  if (coordsA.length >= 3) {
    buildPolygonPath(ctx, coordsA, toPixel);
    ctx.fillStyle = `rgba(239, 68, 68, ${fillAlpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(239, 68, 68, ${strokeAlpha})`;
    ctx.lineWidth = lineW;
    ctx.stroke();
  }

  if (coordsB.length >= 3) {
    buildPolygonPath(ctx, coordsB, toPixel);
    ctx.fillStyle = `rgba(59, 130, 246, ${fillAlpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(59, 130, 246, ${strokeAlpha})`;
    ctx.lineWidth = lineW;
    ctx.stroke();
  }

  if (coordsA.length >= 3 && coordsB.length >= 3) {
    ctx.save();
    buildPolygonPath(ctx, coordsA, toPixel);
    ctx.clip();
    buildPolygonPath(ctx, coordsB, toPixel);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.fill();
    ctx.restore();

    if (!compact) {
      ctx.save();
      buildPolygonPath(ctx, coordsA, toPixel);
      ctx.clip();
      buildPolygonPath(ctx, coordsB, toPixel);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  if (!compact) {
    const dotR = 4;
    coordsA.slice(0, -1).forEach((c) => {
      const pt = toPixel(c[0], c[1]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    coordsB.slice(0, -1).forEach((c) => {
      const pt = toPixel(c[0], c[1]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const legendY = h - legendHeight + 8;
    ctx.font = '11px var(--font-mono, monospace)';
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.fillRect(8, legendY, 10, 10);
    ctx.fillStyle = 'hsl(150, 10%, 15%)';
    ctx.fillText(`Farm A: ${farmA.farmer_name}`, 22, legendY + 9);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.fillRect(8, legendY + 16, 10, 10);
    ctx.fillStyle = 'hsl(150, 10%, 15%)';
    ctx.fillText(`Farm B: ${farmB.farmer_name}`, 22, legendY + 25);

    ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.fillRect(8, legendY + 32, 10, 10);
    ctx.fillStyle = 'hsl(150, 10%, 15%)';
    ctx.fillText('Overlap Zone', 22, legendY + 41);
  }
}

// ─── Canvas components ─────────────────────────────────────────────────────────

function OverlapCanvas({ farmA, farmB, overlayMode }: { farmA: Farm; farmB: Farm; overlayMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawConflictCanvas(canvas, farmA, farmB, overlayMode, false);
  }, [farmA, farmB, overlayMode]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={360}
      className="w-full rounded-lg border"
      style={{ height: '280px' }}
      data-testid="canvas-conflict-overlay"
    />
  );
}

function MiniOverlapCanvas({ farmA, farmB }: { farmA: Farm; farmB: Farm }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawConflictCanvas(canvas, farmA, farmB, true, true);
  }, [farmA, farmB]);

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={60}
      className="rounded border"
      style={{ width: '60px', height: '44px' }}
      data-testid={`canvas-mini-overlap-${farmA.id}-${farmB.id}`}
    />
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatOverlap(ratio: number) {
  return `${Math.round(ratio * 100)}%`;
}

function getSeverity(ratio: number): { label: string; variant: 'outline' | 'secondary' | 'destructive' } {
  const pct = ratio * 100;
  if (pct < 20) return { label: 'Low Risk', variant: 'outline' };
  if (pct <= 50) return { label: 'Medium Risk', variant: 'secondary' };
  return { label: 'High Risk', variant: 'destructive' };
}

// ─── FarmCard ──────────────────────────────────────────────────────────────────

function FarmCard({ farm, label, color }: { farm: Farm; label: string; color: 'red' | 'blue' }) {
  const borderCls = color === 'red' ? 'border-red-500' : 'border-blue-500';
  const badgeCls = color === 'red'
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';
  const vertices = farm.boundary?.coordinates?.[0]?.length
    ? farm.boundary.coordinates[0].length - 1
    : 0;

  return (
    <Card className={`border-2 ${borderCls}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">{farm.farmer_name}</CardTitle>
          <Badge variant="outline" className={`text-xs shrink-0 ${badgeCls}`}>{label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{farm.community || 'Unknown community'}</span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="truncate">{farm.agent?.full_name || 'Unknown agent'}</p>
            {farm.agent?.user_id && (
              <p className="font-mono text-xs text-muted-foreground/70" data-testid={`text-agent-id-${farm.id}`}>
                {farm.agent.user_id.slice(0, 8)}…
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span className="font-mono text-xs">{new Date(farm.created_at).toLocaleDateString()}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
          <div>
            <p className="text-muted-foreground">Commodity</p>
            <p className="font-medium capitalize">{farm.commodity || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Area</p>
            <p className="font-mono font-medium">{farm.area_hectares?.toFixed(2) ?? '—'} ha</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
          <div className="flex items-center gap-1.5">
            <Crosshair className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground">GPS Accuracy</p>
              <p className="font-mono font-medium">
                {farm.gps_accuracy ? `${farm.gps_accuracy.toFixed(1)} m` : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground">Synced</p>
              <p className="font-mono font-medium">
                {farm.synced_at ? new Date(farm.synced_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t text-xs">
          <p className="text-muted-foreground">Vertices</p>
          <p className="font-mono font-medium">{vertices} pts</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [overlayMode, setOverlayMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanBannerDismissed, setScanBannerDismissed] = useState(false);
  const { toast } = useToast();

  const fetchConflicts = useCallback(async () => {
    try {
      const res = await fetch('/api/conflicts');
      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
      }
    } catch (err) {
      console.error('Failed to fetch conflicts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const handleScan = async () => {
    setIsScanning(true);
    setScanBannerDismissed(false);
    try {
      const res = await fetch('/api/conflicts/scan', { method: 'POST' });
      if (!res.ok) throw new Error('Scan failed');
      const data: ScanResult = await res.json();
      setScanResult(data);
      toast({
        title: 'Scan complete',
        description: `${data.new_conflicts} new conflict${data.new_conflicts !== 1 ? 's' : ''} found across ${data.scanned} farms`,
      });
      await fetchConflicts();
    } catch {
      toast({ title: 'Scan failed', description: 'Could not complete boundary scan', variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const resolveConflict = async (action: 'keep_a' | 'keep_b' | 'merge' | 'dismiss') => {
    if (!selectedConflict) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/conflicts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflict_id: selectedConflict.id, action, notes: resolutionNotes }),
      });
      if (!res.ok) throw new Error('Resolution failed');

      const actionLabels: Record<string, string> = {
        keep_a: `Accepted ${selectedConflict.farm_a.farmer_name}'s boundary`,
        keep_b: `Accepted ${selectedConflict.farm_b.farmer_name}'s boundary`,
        merge: 'Marked as neighboring farms',
        dismiss: 'Flagged for re-mapping',
      };
      toast({ title: 'Conflict resolved', description: actionLabels[action] });
      await fetchConflicts();
      setSelectedConflict(null);
      setResolutionNotes('');
    } catch {
      toast({ title: 'Error', description: 'Failed to resolve conflict', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Derived stats
  const pendingCount = conflicts.filter(c => c.status === 'pending').length;
  const resolvedCount = conflicts.filter(c => c.status !== 'pending').length;
  const total = pendingCount + resolvedCount;
  const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

  if (isLoading) {
    return (
      <TierGate feature="boundary_conflicts" requiredTier="pro" featureLabel="Boundary Conflicts">
        <div className="space-y-6">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" style={{ width: `${50 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TierGate>
    );
  }

  return (
    <TierGate feature="boundary_conflicts" requiredTier="pro" featureLabel="Boundary Conflicts">
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg icon-bg-amber flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
                Boundary Conflict Monitor
              </h1>
              <p className="text-sm text-muted-foreground">
                Detect and resolve overlapping GPS farm boundaries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={fetchConflicts} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleScan} disabled={isScanning} data-testid="button-scan">
              {isScanning
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <ScanSearch className="h-4 w-4 mr-2" />}
              {isScanning ? 'Scanning…' : 'Scan for Conflicts'}
            </Button>
          </div>
        </div>

        {/* ── Last-scan inline info strip ── */}
        {scanResult && !isScanning && (
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800" data-testid="banner-scan-info">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              Scanned <span className="font-semibold">{scanResult.scanned}</span> farms
              &nbsp;·&nbsp;
              <span className="font-semibold">{scanResult.new_conflicts}</span> new conflicts found
              &nbsp;·&nbsp;
              <span className="font-semibold">{scanResult.skipped_existing}</span> already tracked
            </span>
          </div>
        )}

        {/* ── Stats strip ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="card-accent-amber transition-all hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Conflicts</CardTitle>
              <div className="h-9 w-9 rounded-lg icon-bg-amber flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-pending-count">
                {pendingCount}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Require admin resolution</p>
            </CardContent>
          </Card>

          <Card className="card-accent-blue transition-all hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Detection Threshold</CardTitle>
              <div className="h-9 w-9 rounded-lg icon-bg-blue flex items-center justify-center">
                <Crosshair className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">&ge; 10%</div>
              <p className="text-xs text-muted-foreground mt-0.5">Minimum overlap to flag</p>
            </CardContent>
          </Card>

          <Card className="card-accent-green transition-all hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <div className="h-9 w-9 rounded-lg icon-bg-green flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-resolution-rate">
                {resolutionRate}%
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {resolvedCount} of {total} resolved
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Scan complete banner ── */}
        {scanResult && !scanBannerDismissed && (
          <Card className="card-accent-green border-green-200 bg-green-50" data-testid="banner-scan-complete">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-2 text-green-800 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {scanResult.new_conflicts > 0 ? (
                  <span>
                    Scan complete &middot; <span className="font-semibold">{scanResult.scanned}</span> farms analysed
                    &nbsp;&middot;&nbsp;
                    <span className="font-semibold">{scanResult.new_conflicts}</span> new conflict{scanResult.new_conflicts !== 1 ? 's' : ''} flagged
                  </span>
                ) : (
                  <span>No new conflicts found across <span className="font-semibold">{scanResult.scanned}</span> farms</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-700 hover:text-green-900 hover:bg-green-100"
                onClick={() => setScanBannerDismissed(true)}
                data-testid="button-dismiss-scan-banner"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Conflict Queue ── */}
        <Card className="card-accent-amber">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
            <div className="h-9 w-9 rounded-lg icon-bg-amber flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle>Conflict Queue</CardTitle>
                <Badge variant="secondary" className="font-mono text-xs">{conflicts.length}</Badge>
              </div>
              <CardDescription>Click Review to inspect and resolve each overlap</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {conflicts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium text-foreground">All clear — no boundary conflicts detected</p>
                <p className="text-sm text-muted-foreground">Run a scan to check for new overlaps</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[72px]">Preview</TableHead>
                    <TableHead>Farm A</TableHead>
                    <TableHead>Farm B</TableHead>
                    <TableHead>Community</TableHead>
                    <TableHead className="text-center">Overlap %</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conflicts.map((conflict) => (
                    <TableRow key={conflict.id} data-testid={`conflict-row-${conflict.id}`}>
                      <TableCell>
                        <MiniOverlapCanvas farmA={conflict.farm_a} farmB={conflict.farm_b} />
                      </TableCell>
                      <TableCell className="font-medium">{conflict.farm_a.farmer_name}</TableCell>
                      <TableCell className="font-medium">{conflict.farm_b.farmer_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {conflict.farm_a.community || conflict.farm_b.community || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="destructive"
                          className="font-mono tabular-nums"
                          data-testid={`badge-overlap-${conflict.id}`}
                        >
                          {formatOverlap(conflict.overlap_ratio)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(conflict.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setSelectedConflict(conflict);
                            setResolutionNotes('');
                            setOverlayMode(true);
                          }}
                          data-testid={`button-review-conflict-${conflict.id}`}
                        >
                          <Eye className="h-4 w-4" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Review Sheet ── */}
        <Sheet open={!!selectedConflict} onOpenChange={(open) => !open && setSelectedConflict(null)}>
          <SheetContent className="sm:max-w-2xl overflow-y-auto">
            {selectedConflict && (
              <>
                <SheetHeader className="space-y-1">
                  <SheetTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-amber-500" />
                    Review Conflict #{selectedConflict.id}
                  </SheetTitle>
                  <SheetDescription>
                    {selectedConflict.farm_a.farmer_name} vs {selectedConflict.farm_b.farmer_name}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-5 py-5">
                  {/* Overlap ratio + severity + overlay toggle */}
                  <div className="flex items-center justify-between gap-4 flex-wrap rounded-lg border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Overlap</p>
                        <p
                          className={`text-3xl font-bold font-mono tabular-nums ${
                            selectedConflict.overlap_ratio >= 0.3 ? 'text-red-600' : 'text-amber-600'
                          }`}
                          data-testid="text-overlap-ratio"
                        >
                          {formatOverlap(selectedConflict.overlap_ratio)}
                        </p>
                      </div>
                      <Badge variant={getSeverity(selectedConflict.overlap_ratio).variant} className="self-end mb-1">
                        {getSeverity(selectedConflict.overlap_ratio).label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="overlay-mode" className="text-sm text-muted-foreground">Overlay Mode</Label>
                      <Switch
                        id="overlay-mode"
                        checked={overlayMode}
                        onCheckedChange={setOverlayMode}
                        data-testid="switch-overlay-mode"
                      />
                    </div>
                  </div>

                  {/* Canvas */}
                  <OverlapCanvas
                    farmA={selectedConflict.farm_a}
                    farmB={selectedConflict.farm_b}
                    overlayMode={overlayMode}
                  />

                  {/* Tabs */}
                  <Tabs defaultValue="compare" className="w-full">
                    <TabsList className="segmented-control w-full grid grid-cols-2">
                      <TabsTrigger value="compare" className="segmented-control-item" data-testid="tab-compare">
                        Side by Side
                      </TabsTrigger>
                      <TabsTrigger value="geojson" className="segmented-control-item" data-testid="tab-geojson">
                        GeoJSON
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="compare" className="mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FarmCard farm={selectedConflict.farm_a} label="Farm A" color="red" />
                        <FarmCard farm={selectedConflict.farm_b} label="Farm B" color="blue" />
                      </div>
                    </TabsContent>

                    <TabsContent value="geojson" className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Farm A — {selectedConflict.farm_a.farmer_name}
                        </h4>
                        <pre
                          className="text-xs font-mono bg-muted p-3 rounded-lg overflow-auto max-h-36 border"
                          data-testid="text-geojson-a"
                        >
                          {JSON.stringify(selectedConflict.farm_a.boundary, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Farm B — {selectedConflict.farm_b.farmer_name}
                        </h4>
                        <pre
                          className="text-xs font-mono bg-muted p-3 rounded-lg overflow-auto max-h-36 border"
                          data-testid="text-geojson-b"
                        >
                          {JSON.stringify(selectedConflict.farm_b.boundary, null, 2)}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Resolution Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="resolution-notes">Resolution Notes</Label>
                    <Textarea
                      id="resolution-notes"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Add notes about your decision…"
                      rows={2}
                      data-testid="textarea-resolution-notes"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <SheetFooter className="flex-col gap-2 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-50 gap-2"
                      onClick={() => resolveConflict('keep_a')}
                      disabled={isProcessing}
                      data-testid="button-keep-a"
                    >
                      {isProcessing
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <CheckCircle2 className="h-4 w-4" />}
                      Accept Farm A
                    </Button>
                    <Button
                      variant="outline"
                      className="border-blue-500 text-blue-700 hover:bg-blue-50 gap-2"
                      onClick={() => resolveConflict('keep_b')}
                      disabled={isProcessing}
                      data-testid="button-keep-b"
                    >
                      {isProcessing
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <CheckCircle2 className="h-4 w-4" />}
                      Accept Farm B
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      variant="secondary"
                      className="gap-2"
                      onClick={() => resolveConflict('merge')}
                      disabled={isProcessing}
                      data-testid="button-merge"
                    >
                      <Users className="h-4 w-4" />
                      Mark as Neighbors
                    </Button>
                    <Button
                      variant="ghost"
                      className="gap-2"
                      onClick={() => resolveConflict('dismiss')}
                      disabled={isProcessing}
                      data-testid="button-dismiss"
                    >
                      <MapPin className="h-4 w-4" />
                      Flag for Re-mapping
                    </Button>
                  </div>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>

      </div>
    </TierGate>
  );
}
