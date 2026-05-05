'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Loader2, Search, MapPin, User, Phone, Calendar, Ruler,
  FileCheck, ShieldCheck, ShieldAlert, AlertTriangle, Map,
  Check, X, Clock, FileText, ExternalLink, LayoutList, Globe, Download,
} from 'lucide-react';
import { StatusBadge } from '@/lib/status-badge';
import { TierGate } from '@/components/tier-gate';
import type { FarmMapFarm } from '@/components/farm-polygon-map';

const FarmPolygonMap = dynamic(() => import('@/components/farm-polygon-map'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-muted/20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

interface Farm extends FarmMapFarm {
  farmer_id: string | null;
  phone: string | null;
  compliance_notes: string | null;
  legality_doc_url: string | null;
  boundary_analysis?: {
    confidence_score: number;
    confidence_level: 'high' | 'medium' | 'low';
    analyzed_at: string;
  } | null;
  created_at: string;
  mapped_by: string | null;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

// ── Profile completeness ─────────────────────────────────────────────────────
// Score out of 100 based on how complete the farm record is.
const COMPLETENESS_FIELDS: Array<{ key: keyof Farm; weight: number; label: string }> = [
  { key: 'phone',           weight: 20, label: 'Phone' },
  { key: 'farmer_id',       weight: 15, label: 'Farmer ID' },
  { key: 'area_hectares',   weight: 15, label: 'Area (ha)' },
  { key: 'boundary',        weight: 30, label: 'GPS Boundary' },
  { key: 'legality_doc_url',weight: 20, label: 'Legality Doc' },
];

function computeCompleteness(farm: Farm): { score: number; missing: string[] } {
  let score = 0;
  const missing: string[] = [];
  for (const f of COMPLETENESS_FIELDS) {
    if (farm[f.key]) score += f.weight;
    else missing.push(f.label);
  }
  return { score, missing };
}

function CompletenessChip({ farm }: { farm: Farm }) {
  const { score, missing } = computeCompleteness(farm);
  const color = score === 100 ? 'text-emerald-700 bg-emerald-50' : score >= 60 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
  const title = score === 100 ? 'Profile complete' : `Missing: ${missing.join(', ')}`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}`}
      title={title}
    >
      {score}%
    </span>
  );
}

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reviewFarm, setReviewFarm] = useState<Farm | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const { organization, profile, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();
  const router = useRouter();

  const isReviewer = profile?.role === 'admin' || profile?.role === 'quality_manager' || profile?.role === 'compliance_officer';

  const fetchFarms = useCallback(async () => {
    if (orgLoading || !organization) { setIsLoading(false); return; }
    try {
      const res = await fetch('/api/farms');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setFarms(data.farms || []);
    } catch (e) {
      console.error('Failed to fetch farms:', e);
    } finally {
      setIsLoading(false);
    }
  }, [organization, orgLoading]);

  useEffect(() => { fetchFarms(); }, [fetchFarms]);

  const pendingCount = farms.filter(f => f.compliance_status === 'pending').length;

  const exportFarmsCsv = () => {
    const rows = filteredFarms.map(f => ({
      farmer_name: f.farmer_name,
      farmer_id: f.farmer_id ?? '',
      phone: f.phone ?? '',
      community: f.community,
      commodity: f.commodity ?? '',
      area_hectares: f.area_hectares ?? '',
      compliance_status: f.compliance_status,
      boundary_mapped: f.boundary ? 'Yes' : 'No',
      registered_at: new Date(f.created_at).toLocaleDateString(),
    }));
    const headers = Object.keys(rows[0] || {});
    const csvContent = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farms-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredFarms = farms.filter(farm => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (farm.farmer_name || '').toLowerCase().includes(q) ||
      (farm.community || '').toLowerCase().includes(q) ||
      (farm.farmer_id?.toLowerCase().includes(q)) ||
      (farm.commodity?.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || farm.compliance_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const submitReview = async (status: 'approved' | 'rejected') => {
    if (!reviewFarm) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/farms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewFarm.id, compliance_status: status, compliance_notes: reviewNotes || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast({ title: status === 'approved' ? 'Farm Approved' : 'Farm Rejected', description: `${reviewFarm.farmer_name}'s farm has been ${status}.` });
      setFarms(prev => prev.map(f => f.id === reviewFarm.id ? { ...f, compliance_status: status, compliance_notes: reviewNotes || null } : f));
      if (selectedFarm?.id === reviewFarm.id) setSelectedFarm(prev => prev ? { ...prev, compliance_status: status } : null);
      setReviewFarm(null);
      setReviewNotes('');
    } catch {
      toast({ title: 'Error', description: 'Failed to update farm status', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shared farm detail panel used in both sidebar and sheet
  const FarmDetailContent = ({ farm }: { farm: Farm }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge domain="farm" status={farm.compliance_status} />
        <Button variant="outline" size="sm"
          onClick={() => router.push(`/app/farms/map?farm_id=${farm.id}`)}>
          <Map className="h-3.5 w-3.5 mr-1" />Map Tool
        </Button>
      </div>
      <div className="space-y-1.5">
        {([
          { icon: MapPin, label: 'Community', value: farm.community },
          { icon: FileCheck, label: 'Farmer ID', value: farm.farmer_id },
          { icon: Phone, label: 'Phone', value: farm.phone },
          { icon: Ruler, label: 'Area', value: farm.area_hectares ? `${farm.area_hectares.toFixed(2)} ha` : null },
          { icon: Calendar, label: 'Registered', value: new Date(farm.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
        ] as const).filter(r => r.value).map(row => (
          <div key={row.label} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm">
            <row.icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-muted-foreground text-xs">{row.label}: </span>
              <span className="text-xs">{row.value}</span>
            </div>
          </div>
        ))}
        {farm.boundary && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs">
            <MapPin className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">Boundary: </span>
            <span>{farm.boundary.coordinates?.[0]?.length ?? 0} points</span>
          </div>
        )}
        {farm.boundary_analysis && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs">
            {farm.boundary_analysis.confidence_level === 'high'
              ? <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
              : farm.boundary_analysis.confidence_level === 'medium'
              ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              : <ShieldAlert className="h-3.5 w-3.5 text-red-600 shrink-0" />}
            <span className="text-muted-foreground">Confidence:</span>
            <span className="font-medium">{farm.boundary_analysis.confidence_score}/100</span>
            <span className="capitalize text-muted-foreground">({farm.boundary_analysis.confidence_level})</span>
          </div>
        )}
        {farm.legality_doc_url && (
          <a href={farm.legality_doc_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-primary hover:underline">
            <FileText className="h-3.5 w-3.5" />Legality Document<ExternalLink className="h-3 w-3 ml-auto" />
          </a>
        )}
        {farm.compliance_notes && (
          <div className="px-3 py-2 rounded-lg bg-muted/50 text-xs">
            <p className="text-muted-foreground mb-0.5">Review notes</p>
            <p>{farm.compliance_notes}</p>
          </div>
        )}
      </div>
      {isReviewer && farm.compliance_status === 'pending' && (
        <Button className="w-full" size="sm"
          onClick={() => { setReviewFarm(farm); setReviewNotes(''); setSheetOpen(false); }}>
          Review This Farm
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* ── MAP VIEW ── */}
      {viewMode === 'map' && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-background shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight" data-testid="text-page-title">Farm Polygons</h1>
              <Badge variant="outline" className="text-xs">{farms.length} farms</Badge>
              {pendingCount > 0 && isReviewer && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <Clock className="h-3 w-3" />{pendingCount} pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/app/farms/map">
                <Button variant="outline" size="sm">
                  <Map className="h-4 w-4 mr-1.5" />Mapping Tool
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setViewMode('list')}>
                <LayoutList className="h-4 w-4 mr-1.5" />List View
              </Button>
            </div>
          </div>

          {/* Map + sidebar split */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-72 shrink-0 border-r flex flex-col bg-background overflow-hidden hidden md:flex">
              {/* Search + filter */}
              <div className="p-3 space-y-2 border-b shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search farms…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    data-testid="input-search-farms"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map(f => <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Farm list */}
              {!selectedFarm ? (
                <div className="flex-1 overflow-y-auto divide-y">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredFarms.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground px-4">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      {searchQuery || statusFilter !== 'all' ? 'No farms match filters' : 'No farms yet'}
                    </div>
                  ) : filteredFarms.map(farm => (
                    <button
                      key={farm.id}
                      className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedFarm(farm)}
                      data-testid={`farm-list-row-${farm.id}`}
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{
                        backgroundColor: farm.compliance_status === 'approved' ? '#16a34a' : farm.compliance_status === 'rejected' ? '#dc2626' : '#f59e0b'
                      }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{farm.farmer_name}</p>
                          <CompletenessChip farm={farm} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{farm.community}{farm.area_hectares ? ` · ${farm.area_hectares.toFixed(1)}ha` : ''}</p>
                        {!farm.boundary && <p className="text-[10px] text-amber-500 mt-0.5">No boundary</p>}
                      </div>
                      {farm.compliance_status === 'pending' && isReviewer && (
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                /* Selected farm detail */
                <div className="flex-1 overflow-y-auto">
                  <div className="p-3 border-b flex items-center gap-2">
                    <button
                      onClick={() => setSelectedFarm(null)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      ← All farms
                    </button>
                  </div>
                  <div className="p-3 space-y-1 border-b">
                    <p className="font-semibold text-sm">{selectedFarm.farmer_name}</p>
                    {selectedFarm.commodity && <p className="text-xs text-muted-foreground capitalize">{selectedFarm.commodity}</p>}
                  </div>
                  <div className="p-3">
                    <FarmDetailContent farm={selectedFarm} />
                  </div>
                </div>
              )}
            </div>

            {/* Map canvas */}
            <FarmPolygonMap
              farms={filteredFarms}
              selectedFarmId={selectedFarm?.id}
              onSelectFarm={(farm) => setSelectedFarm(farm as Farm | null)}
              loading={isLoading}
            />
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Farm Polygons</h1>
              <p className="text-muted-foreground">GPS boundaries, compliance status, and farmer registry</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {pendingCount > 0 && isReviewer && (
                <Badge variant="destructive" className="gap-1 shrink-0">
                  <Clock className="h-3 w-3" />{pendingCount} pending review
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => setViewMode('map')}>
                <Globe className="h-4 w-4 mr-2" />Map View
              </Button>
              <Link href="/app/farms/map">
                <Button variant="outline" size="sm">
                  <Map className="h-4 w-4 mr-2" />Map Tool
                </Button>
              </Link>
            </div>
          </div>

          <Tabs defaultValue={pendingCount > 0 && isReviewer ? 'pending' : 'all'}>
            <TabsList>
              <TabsTrigger value="all">All Farms ({farms.length})</TabsTrigger>
              {isReviewer && (
                <TabsTrigger value="pending">
                  Pending Review
                  {pendingCount > 0 && (
                    <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 min-w-[1.25rem] text-center">{pendingCount}</span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── ALL FARMS tab ── */}
            <TabsContent value="all" className="mt-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[12rem]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search farmer, community, commodity…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-farms"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44" data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {filteredFarms.length > 0 && (
                  <Button variant="outline" size="sm" onClick={exportFarmsCsv} data-testid="button-export-farms">
                    <Download className="h-4 w-4 mr-1.5" />Export CSV
                  </Button>
                )}
              </div>
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="col-span-full space-y-3 p-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-24 bg-muted animate-pulse rounded-xl"/>)}</div>
                    </div>
                  ) : filteredFarms.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">{searchQuery || statusFilter !== 'all' ? 'No farms match your filters' : 'No farms registered yet'}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Farmer</TableHead>
                            <TableHead>Community</TableHead>
                            <TableHead>Commodity</TableHead>
                            <TableHead>Area (ha)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Boundary</TableHead>
                            <TableHead>Profile</TableHead>
                            <TableHead>Registered</TableHead>
                            <TableHead className="w-16" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFarms.map(farm => (
                            <TableRow
                              key={farm.id}
                              data-testid={`farm-row-${farm.id}`}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => { setSelectedFarm(farm); setSheetOpen(true); }}
                            >
                              <TableCell className="font-medium">{farm.farmer_name}</TableCell>
                              <TableCell className="text-muted-foreground">{farm.community}</TableCell>
                              <TableCell>
                                {farm.commodity
                                  ? <span className="capitalize text-sm">{farm.commodity}</span>
                                  : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>{farm.area_hectares?.toFixed(2) ?? '—'}</TableCell>
                              <TableCell><StatusBadge domain="farm" status={farm.compliance_status} /></TableCell>
                              <TableCell>
                                {farm.boundary
                                  ? <span className="text-xs text-green-600 flex items-center gap-1"><MapPin className="h-3 w-3" />Mapped</span>
                                  : <span className="text-xs text-muted-foreground">Not mapped</span>}
                              </TableCell>
                              <TableCell>
                                <CompletenessChip farm={farm} />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(farm.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell onClick={e => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Open in map"
                                    onClick={() => router.push(`/app/farms/map?farm_id=${farm.id}`)}>
                                    <Map className="h-3.5 w-3.5" />
                                  </Button>
                                  {isReviewer && farm.compliance_status === 'pending' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Review"
                                      onClick={() => { setReviewFarm(farm); setReviewNotes(''); }}
                                      data-testid={`button-review-${farm.id}`}>
                                      <Clock className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── PENDING REVIEW tab ── */}
            {isReviewer && (
              <TabsContent value="pending" className="mt-4">
                <TierGate feature="compliance_review" requiredTier="pro" featureLabel="Compliance Review">
                  {farms.filter(f => f.compliance_status === 'pending').length === 0 ? (
                    <Card>
                      <CardContent className="py-16 text-center">
                        <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <h3 className="text-lg font-semibold">All caught up</h3>
                        <p className="text-muted-foreground mt-1">No farms are awaiting compliance review.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {farms.filter(f => f.compliance_status === 'pending').map(farm => (
                        <Card key={farm.id} className="card-accent-amber hover:shadow-md transition-shadow" data-testid={`compliance-card-${farm.id}`}>
                          <div className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-sm">{farm.farmer_name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />{farm.community}
                                </p>
                              </div>
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                <Clock className="h-3 w-3 mr-1" />Pending
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm">
                              {farm.commodity && <p className="capitalize"><span className="text-muted-foreground">Crop:</span> {farm.commodity}</p>}
                              {farm.area_hectares && <p><span className="text-muted-foreground">Area:</span> {farm.area_hectares.toFixed(2)} ha</p>}
                              {farm.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" />{farm.phone}</p>}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              {farm.boundary
                                ? <span className="text-green-600 flex items-center gap-1"><Check className="h-3 w-3" />Boundary</span>
                                : <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />No boundary</span>}
                              {farm.legality_doc_url && (
                                <a href={farm.legality_doc_url} target="_blank" rel="noopener noreferrer"
                                  className="text-primary flex items-center gap-1">
                                  <FileText className="h-3 w-3" />Doc
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Registered {new Date(farm.created_at).toLocaleDateString()}</p>
                            <Button className="w-full" size="sm"
                              onClick={() => { setReviewFarm(farm); setReviewNotes(''); }}
                              data-testid={`button-review-${farm.id}`}>
                              Review Farm
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TierGate>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      {/* ── DETAIL SHEET (list view) ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selectedFarm && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><User className="h-5 w-5" />{selectedFarm.farmer_name}</SheetTitle>
                <SheetDescription>Farm details and compliance status</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FarmDetailContent farm={selectedFarm} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── REVIEW DIALOG ── */}
      <Dialog open={!!reviewFarm} onOpenChange={open => !open && setReviewFarm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Farm Registration</DialogTitle>
            <DialogDescription>
              Review {reviewFarm?.farmer_name}'s farm in {reviewFarm?.community}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm space-y-1 p-3 bg-muted rounded-lg">
              <p><span className="text-muted-foreground">Farmer:</span> {reviewFarm?.farmer_name}</p>
              {reviewFarm?.commodity && <p><span className="text-muted-foreground">Crop:</span> <span className="capitalize">{reviewFarm.commodity}</span></p>}
              <p><span className="text-muted-foreground">ID:</span> {reviewFarm?.farmer_id || 'Not provided'}</p>
              <p><span className="text-muted-foreground">Community:</span> {reviewFarm?.community}</p>
              <p><span className="text-muted-foreground">Area:</span> {reviewFarm?.area_hectares?.toFixed(2) ?? 'N/A'} ha</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {reviewFarm?.boundary
                ? <span className="text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Boundary mapped</span>
                : <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />No boundary recorded</span>}
              {reviewFarm?.legality_doc_url && (
                <a href={reviewFarm.legality_doc_url} target="_blank" rel="noopener noreferrer"
                  className="text-primary flex items-center gap-1 ml-auto">
                  <FileText className="h-4 w-4" />View document
                </a>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-notes">Review notes (optional)</Label>
              <Textarea
                id="review-notes"
                placeholder="Add notes about this decision…"
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                data-testid="textarea-review-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => submitReview('rejected')} disabled={isSubmitting} data-testid="button-reject">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => submitReview('approved')} disabled={isSubmitting} data-testid="button-approve">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
