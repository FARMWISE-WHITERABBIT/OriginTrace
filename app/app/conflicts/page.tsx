'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, CheckCircle2, Loader2, ScanSearch, RefreshCw,
  MapPin, User, Calendar, Layers, ChevronRight, Map,
} from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

// Leaflet must not run server-side
const ConflictMap = dynamic(() => import('@/components/conflict-map'), { ssr: false });

// ─── Types ─────────────────────────────────────────────────────────────────────

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
  severity?: 'critical' | 'high' | 'low';
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

// ─── Severity helpers ──────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'low';

function getSeverity(overlapRatio: number): Severity {
  if (overlapRatio > 0.50) return 'critical';
  if (overlapRatio > 0.25) return 'high';
  return 'low';
}

const SEVERITY_CONFIG: Record<Severity, { label: string; className: string; dotClass: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-100 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
  high: {
    label: 'High',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-400',
  },
};

// ─── Resolution actions ────────────────────────────────────────────────────────

const RESOLUTION_ACTIONS = [
  {
    value: 'keep_a',
    label: 'Keep Farm A — reject Farm B',
    description: 'Farm A boundary is correct. Farm B registration is rejected.',
  },
  {
    value: 'keep_b',
    label: 'Keep Farm B — reject Farm A',
    description: 'Farm B boundary is correct. Farm A registration is rejected.',
  },
  {
    value: 'deactivated',
    label: 'Deactivate newer registration',
    description: 'The more recent registration (Farm B) is a duplicate. It is deactivated and Farm A retained.',
  },
  {
    value: 'confirmed_correct',
    label: 'Confirm overlap is acceptable',
    description: 'After reviewing satellite imagery, the overlap is acceptable (shared path, boundary wall, etc.). Both farms remain active.',
  },
  {
    value: 'merged',
    label: 'Merge farms',
    description: 'Both farms represent the same plot. Batches will be reattributed manually. Both records are cleared.',
  },
  {
    value: 'escalated_survey',
    label: 'Escalate — field re-survey required',
    description: 'Conflict cannot be resolved from the platform. A field agent must physically resurvey the boundary.',
  },
  {
    value: 'dismissed',
    label: 'Dismiss — false positive',
    description: 'The overlap is a detection artefact and not a genuine conflict. Both farms cleared.',
  },
] as const;

// ─── Farm detail card ──────────────────────────────────────────────────────────

function FarmCard({ farm, label, color }: { farm: Farm; label: string; color: 'blue' | 'red' }) {
  const borderClass = color === 'blue' ? 'border-blue-200 bg-blue-50/40' : 'border-red-200 bg-red-50/40';
  const labelClass = color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700';

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${borderClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${labelClass}`}>{label}</span>
        <span className="font-semibold text-sm truncate">{farm.farmer_name}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {farm.community && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{farm.community}</span>
          </div>
        )}
        {farm.commodity && (
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3 shrink-0" />
            <span className="truncate capitalize">{farm.commodity}</span>
          </div>
        )}
        {farm.area_hectares != null && (
          <div className="flex items-center gap-1">
            <Map className="h-3 w-3 shrink-0" />
            <span>{Number(farm.area_hectares).toFixed(2)} ha</span>
          </div>
        )}
        {farm.gps_accuracy != null && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{Number(farm.gps_accuracy).toFixed(0)} m accuracy</span>
          </div>
        )}
        {farm.agent?.full_name && (
          <div className="flex items-center gap-1 col-span-2">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">Agent: {farm.agent.full_name}</span>
          </div>
        )}
        <div className="flex items-center gap-1 col-span-2">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>Registered {new Date(farm.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs mt-1">
        <span className={`h-1.5 w-1.5 rounded-full ${farm.compliance_status === 'approved' ? 'bg-green-500' : farm.compliance_status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'}`} />
        <span className="capitalize text-muted-foreground">{farm.compliance_status}</span>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BoundaryConflictsPage() {
  const { toast } = useToast();

  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selected, setSelected] = useState<Conflict | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');

  // Resolution state
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const fetchConflicts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/conflicts');
      if (res.ok) {
        const d = await res.json();
        const enriched = (d.conflicts ?? []).map((c: Conflict) => ({
          ...c,
          severity: c.severity ?? getSeverity(c.overlap_ratio),
        }));
        // Sort: critical first, then high, then low
        const order = { critical: 0, high: 1, low: 2 };
        enriched.sort((a: Conflict, b: Conflict) =>
          (order[a.severity as Severity] ?? 2) - (order[b.severity as Severity] ?? 2)
        );
        setConflicts(enriched);
      }
    } catch {}
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchConflicts(); }, [fetchConflicts]);

  const handleScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/conflicts/scan', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setScanResult(data);
      toast({ title: 'Scan complete', description: `${data.new_conflicts} new conflict${data.new_conflicts !== 1 ? 's' : ''} detected across ${data.scanned} farms` });
      fetchConflicts();
    } catch (err: any) {
      toast({ title: 'Scan failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleResolve = async () => {
    if (!selected || !action || notes.length < 20) return;
    setIsResolving(true);
    try {
      const res = await fetch('/api/conflicts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflict_id: selected.id, action, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resolution failed');

      const actionLabel = RESOLUTION_ACTIONS.find((a) => a.value === action)?.label ?? action;
      toast({ title: 'Conflict resolved', description: actionLabel });
      setSelected(null);
      setAction('');
      setNotes('');
      fetchConflicts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsResolving(false);
    }
  };

  const displayed = conflicts.filter(
    (c) => severityFilter === 'all' || (c.severity ?? getSeverity(c.overlap_ratio)) === severityFilter
  );

  const criticalCount = conflicts.filter((c) => (c.severity ?? getSeverity(c.overlap_ratio)) === 'critical').length;
  const highCount = conflicts.filter((c) => (c.severity ?? getSeverity(c.overlap_ratio)) === 'high').length;

  return (
    <TierGate feature="boundary_conflicts" requiredTier="pro">
      <div className="flex flex-col h-full">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Boundary Conflicts</h1>
              <p className="text-sm text-muted-foreground">
                {conflicts.length} open conflict{conflicts.length !== 1 ? 's' : ''}
                {criticalCount > 0 && (
                  <span className="ml-2 text-red-600 font-medium">· {criticalCount} critical</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchConflicts} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
            </Button>
            <Button size="sm" onClick={handleScan} disabled={isScanning}>
              {isScanning ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Scanning…</>
              ) : (
                <><ScanSearch className="h-4 w-4 mr-1.5" />Run Scan</>
              )}
            </Button>
          </div>
        </div>

        {/* Scan result banner */}
        {scanResult && (
          <div className="mx-6 mb-4 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Scanned <strong>{scanResult.scanned}</strong> farms — found{' '}
              <strong>{scanResult.new_conflicts}</strong> new conflict{scanResult.new_conflicts !== 1 ? 's' : ''}
              {scanResult.skipped_existing > 0 && `, skipped ${scanResult.skipped_existing} existing`}
            </span>
            <button className="ml-auto text-emerald-600 text-xs hover:underline" onClick={() => setScanResult(null)}>dismiss</button>
          </div>
        )}

        {/* ── Body: split panel ───────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 gap-0 border-t">

          {/* Left: conflict list */}
          <div className="w-80 shrink-0 flex flex-col border-r overflow-hidden">
            {/* Severity filter tabs */}
            <div className="flex border-b">
              {(['all', 'critical', 'high', 'low'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSeverityFilter(f)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors
                    ${severityFilter === f
                      ? 'border-b-2 border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {f === 'all' ? `All (${conflicts.length})` :
                   f === 'critical' ? `Critical (${criticalCount})` :
                   f === 'high' ? `High (${highCount})` :
                   `Low (${conflicts.length - criticalCount - highCount})`}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm font-medium">No conflicts</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {severityFilter !== 'all' ? 'No conflicts at this severity level.' : 'Run a scan to check for boundary overlaps.'}
                  </p>
                </div>
              ) : (
                displayed.map((c) => {
                  const sev = (c.severity ?? getSeverity(c.overlap_ratio)) as Severity;
                  const cfg = SEVERITY_CONFIG[sev];
                  const isSelected = selected?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelected(c); setAction(''); setNotes(''); }}
                      className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/40
                        ${isSelected ? 'bg-muted/60 border-l-2 border-l-primary' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${cfg.dotClass}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{c.farm_a.farmer_name}</p>
                            <p className="text-xs text-muted-foreground truncate">vs {c.farm_b.farmer_name}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge variant="outline" className={`text-xs h-5 ${cfg.className}`}>{cfg.label}</Badge>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {Math.round(c.overlap_ratio * 100)}% overlap
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        <ChevronRight className="h-3 w-3 ml-auto" />
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: map + resolution */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <MapPin className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-muted-foreground">Select a conflict to view the map</p>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                  Click any conflict in the list to see the boundary overlap and resolve it.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Conflict header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-semibold">
                      {selected.farm_a.farmer_name} <span className="text-muted-foreground">vs</span> {selected.farm_b.farmer_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(selected.overlap_ratio * 100)}% boundary overlap ·{' '}
                      detected {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {(() => {
                    const sev = (selected.severity ?? getSeverity(selected.overlap_ratio)) as Severity;
                    const cfg = SEVERITY_CONFIG[sev];
                    return (
                      <Badge variant="outline" className={`text-sm px-3 py-1 ${cfg.className}`}>
                        <span className={`h-2 w-2 rounded-full mr-2 ${cfg.dotClass}`} />
                        {cfg.label} severity
                      </Badge>
                    );
                  })()}
                </div>

                {/* Leaflet map */}
                {(selected.farm_a.boundary || selected.farm_b.boundary) ? (
                  <div className="h-72 rounded-lg border overflow-hidden shadow-sm">
                    <ConflictMap farmA={selected.farm_a} farmB={selected.farm_b} className="h-full" />
                  </div>
                ) : (
                  <div className="h-32 rounded-lg border flex items-center justify-center text-sm text-muted-foreground bg-muted/30">
                    No GPS boundary data available for these farms
                  </div>
                )}

                {/* Farm comparison cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FarmCard farm={selected.farm_a} label="Farm A" color="blue" />
                  <FarmCard farm={selected.farm_b} label="Farm B" color="red" />
                </div>

                {/* Resolution form */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Resolve Conflict</CardTitle>
                    <CardDescription className="text-xs">
                      All resolutions are permanently logged with your name and timestamp.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide">Resolution Action *</Label>
                      <Select value={action} onValueChange={setAction}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose an action…" /></SelectTrigger>
                        <SelectContent>
                          {RESOLUTION_ACTIONS.map((a) => (
                            <SelectItem key={a.value} value={a.value}>
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {action && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {RESOLUTION_ACTIONS.find((a) => a.value === action)?.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium uppercase tracking-wide">Resolution Note *</Label>
                        <span className={`text-xs tabular-nums ${notes.length >= 20 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {notes.length}/20 min
                        </span>
                      </div>
                      <Textarea
                        placeholder="Describe the basis for this resolution — what was reviewed, what evidence was considered…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="text-sm resize-none h-24"
                      />
                    </div>

                    {action === 'confirmed_correct' && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-xs text-amber-800">
                        <strong>Reminder:</strong> Before confirming, verify the overlap against satellite imagery to confirm it is a shared boundary feature (access path, wall, or survey imprecision), not a duplicate registration.
                      </div>
                    )}

                    {action === 'escalated_survey' && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-xs text-blue-800">
                        The conflict will be marked as <strong>Escalated</strong>. Both farms remain blocked from EUDR-bound batches until the field resurvey is completed and the conflict is resolved.
                      </div>
                    )}

                    <Button
                      onClick={handleResolve}
                      disabled={isResolving || !action || notes.length < 20}
                      className="w-full"
                    >
                      {isResolving ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resolving…</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4 mr-2" />Submit Resolution</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </TierGate>
  );
}
