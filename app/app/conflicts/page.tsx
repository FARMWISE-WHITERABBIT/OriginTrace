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
import { Loader2, AlertTriangle, MapPin, User, Calendar, CheckCircle2, XCircle, Merge, Eye, Layers, Crosshair, RefreshCw } from 'lucide-react';
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

function buildPolygonPath(ctx: CanvasRenderingContext2D, coords: number[][], toPixel: (lng: number, lat: number) => { x: number; y: number }) {
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
  compact: boolean = false
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

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [overlayMode, setOverlayMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      const response = await fetch('/api/conflicts');
      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts || []);
      }
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveConflict = async (action: 'keep_a' | 'keep_b' | 'merge' | 'dismiss') => {
    if (!selectedConflict) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/conflicts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflict_id: selectedConflict.id,
          action,
          notes: resolutionNotes
        })
      });

      if (response.ok) {
        const actionLabels = {
          keep_a: `Accepted ${selectedConflict.farm_a.farmer_name}'s farm`,
          keep_b: `Accepted ${selectedConflict.farm_b.farmer_name}'s farm`,
          merge: 'Marked as neighboring farms',
          dismiss: 'Flagged for re-mapping'
        };
        toast({ title: 'Conflict Resolved', description: actionLabels[action] });
        fetchConflicts();
        setSelectedConflict(null);
        setResolutionNotes('');
      } else {
        throw new Error('Failed to resolve');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to resolve conflict', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatOverlap = (ratio: number) => {
    return `${Math.round(ratio * 100)}%`;
  };

  const FarmCard = ({ farm, label, color }: { farm: Farm; label: string; color: string }) => (
    <Card className={`border-2 ${color === 'red' ? 'border-red-500' : 'border-blue-500'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{farm.farmer_name}</CardTitle>
          <Badge variant={color === 'red' ? 'destructive' : 'default'}>{label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{farm.community || 'Unknown community'}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <span>Agent: {farm.agent?.full_name || 'Unknown'}</span>
            {farm.agent?.user_id && (
              <p className="font-mono text-xs text-muted-foreground" data-testid={`text-agent-id-${farm.id}`}>
                ID: {farm.agent.user_id.slice(0, 8)}...
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs">{new Date(farm.created_at).toLocaleDateString()}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div>
            <span className="text-muted-foreground">Commodity</span>
            <p className="font-medium capitalize">{farm.commodity || '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Area</span>
            <p className="font-mono font-medium">{farm.area_hectares?.toFixed(2) || '-'} ha</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <Crosshair className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground text-xs">GPS Accuracy</span>
              <p className="font-mono text-xs font-medium">
                {farm.gps_accuracy ? `${farm.gps_accuracy.toFixed(1)}m` : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground text-xs">Synced</span>
              <p className="font-mono text-xs font-medium">
                {farm.synced_at ? new Date(farm.synced_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Vertices</span>
          <p className="font-mono text-xs">{farm.boundary?.coordinates?.[0]?.length ? farm.boundary.coordinates[0].length - 1 : 0} pts</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TierGate feature="boundary_conflicts" requiredTier="pro" featureLabel="Boundary Conflicts">
    {isLoading ? (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ) : (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <Layers className="h-6 w-6 text-amber-500" />
          Conflict Judge
        </h1>
        <p className="text-muted-foreground">Visualize and resolve spatial overlaps between farm boundaries</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-pending-count">{conflicts.length}</div>
            <p className="text-xs text-muted-foreground">Require admin resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Detection Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Farms flagged when boundaries overlap by more than <span className="font-mono font-semibold">10%</span> of combined area.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolution Options</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Accept A/B - Keep one boundary</li>
              <li>Neighbors - Both boundaries valid</li>
              <li>Re-map - Flag for field visit</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conflict Queue</CardTitle>
          <CardDescription>Click on a conflict to review and resolve</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Farm A</TableHead>
                <TableHead>Farm B</TableHead>
                <TableHead>Community</TableHead>
                <TableHead className="text-center">Overlap</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conflicts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <span>No pending conflicts - all boundaries are clear</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                conflicts.map((conflict) => (
                  <TableRow key={conflict.id} data-testid={`conflict-row-${conflict.id}`}>
                    <TableCell>
                      <MiniOverlapCanvas farmA={conflict.farm_a} farmB={conflict.farm_b} />
                    </TableCell>
                    <TableCell className="font-medium">{conflict.farm_a.farmer_name}</TableCell>
                    <TableCell className="font-medium">{conflict.farm_b.farmer_name}</TableCell>
                    <TableCell>{conflict.farm_a.community || conflict.farm_b.community || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive" className="font-mono">{formatOverlap(conflict.overlap_ratio)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{new Date(conflict.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="View conflict"
                        onClick={() => {
                          setSelectedConflict(conflict);
                          setResolutionNotes('');
                          setOverlayMode(true);
                        }}
                        data-testid={`button-review-conflict-${conflict.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedConflict} onOpenChange={(open) => !open && setSelectedConflict(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Resolve Boundary Conflict
            </SheetTitle>
            <SheetDescription>
              Compare both farm polygons and decide which boundary to keep
            </SheetDescription>
          </SheetHeader>

          {selectedConflict && (
            <div className="space-y-6 py-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-muted-foreground">Overlap Ratio</p>
                  <p className="text-2xl font-bold font-mono text-amber-600" data-testid="text-overlap-ratio">
                    {formatOverlap(selectedConflict.overlap_ratio)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="overlay-mode"
                    checked={overlayMode}
                    onCheckedChange={setOverlayMode}
                    data-testid="switch-overlay-mode"
                  />
                  <Label htmlFor="overlay-mode">Overlay</Label>
                </div>
              </div>

              <OverlapCanvas
                farmA={selectedConflict.farm_a}
                farmB={selectedConflict.farm_b}
                overlayMode={overlayMode}
              />

              <Tabs defaultValue="compare" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="compare" data-testid="tab-compare">Side by Side</TabsTrigger>
                  <TabsTrigger value="details" data-testid="tab-geojson">GeoJSON Data</TabsTrigger>
                </TabsList>

                <TabsContent value="compare" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FarmCard farm={selectedConflict.farm_a} label="Farm A" color="red" />
                    <FarmCard farm={selectedConflict.farm_b} label="Farm B" color="blue" />
                  </div>
                </TabsContent>

                <TabsContent value="details">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Farm A - {selectedConflict.farm_a.farmer_name}</h4>
                      <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-auto max-h-32" data-testid="text-geojson-a">
                        {JSON.stringify(selectedConflict.farm_a.boundary, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Farm B - {selectedConflict.farm_b.farmer_name}</h4>
                      <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-auto max-h-32" data-testid="text-geojson-b">
                        {JSON.stringify(selectedConflict.farm_b.boundary, null, 2)}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="resolution-notes">Resolution Notes</Label>
                <Textarea
                  id="resolution-notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={2}
                  data-testid="textarea-resolution-notes"
                />
              </div>
            </div>
          )}

          <SheetFooter className="flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => resolveConflict('keep_a')}
                disabled={isProcessing}
                className="border-red-500 text-red-600"
                data-testid="button-keep-a"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Accept A
              </Button>
              <Button
                variant="outline"
                onClick={() => resolveConflict('keep_b')}
                disabled={isProcessing}
                className="border-blue-500 text-blue-600"
                data-testid="button-keep-b"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Accept B
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button
                variant="secondary"
                onClick={() => resolveConflict('merge')}
                disabled={isProcessing}
                data-testid="button-merge"
              >
                <Merge className="h-4 w-4 mr-2" />
                Mark as Neighbors
              </Button>
              <Button
                variant="ghost"
                onClick={() => resolveConflict('dismiss')}
                disabled={isProcessing}
                data-testid="button-dismiss"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Flag for Re-mapping
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
    )}
    </TierGate>
  );
}
