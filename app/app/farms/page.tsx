'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Search, MapPin, User, Phone, Calendar, Ruler,
  FileCheck, ShieldCheck, ShieldAlert, AlertTriangle, Map,
  Check, X, Clock, FileText, ExternalLink,
} from 'lucide-react';
import { StatusBadge } from '@/lib/status-badge';
import { TierGate } from '@/components/tier-gate';

interface Farm {
  id: string;
  farmer_name: string;
  farmer_id: string | null;
  phone: string | null;
  community: string;
  commodity: string | null;
  compliance_status: string;
  compliance_notes: string | null;
  area_hectares: number | null;
  boundary: any;
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

  const filteredFarms = farms.filter(farm => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = farm.farmer_name.toLowerCase().includes(q) ||
      farm.community.toLowerCase().includes(q) ||
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Farm Polygons</h1>
          <p className="text-muted-foreground">GPS boundaries, compliance status, and farmer registry</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && isReviewer && (
            <Badge variant="destructive" className="gap-1 shrink-0">
              <Clock className="h-3 w-3" />
              {pendingCount} pending review
            </Badge>
          )}
          <Link href="/app/farms/map">
            <Button variant="outline" size="sm">
              <Map className="h-4 w-4 mr-2" />
              Map Tool
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

        {/* ── ALL FARMS ── */}
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
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

        {/* ── PENDING REVIEW ── */}
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
                    <Card key={farm.id} className="hover:shadow-md transition-shadow" data-testid={`compliance-card-${farm.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{farm.farmer_name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-0.5 text-xs">
                              <MapPin className="h-3 w-3" />{farm.community}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            <Clock className="h-3 w-3 mr-1" />Pending
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1.5 pt-0">
                        {farm.commodity && <p className="text-sm capitalize"><span className="text-muted-foreground">Crop:</span> {farm.commodity}</p>}
                        {farm.area_hectares && <p className="text-sm"><span className="text-muted-foreground">Area:</span> {farm.area_hectares.toFixed(2)} ha</p>}
                        {farm.phone && <p className="text-sm flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" />{farm.phone}</p>}
                        <div className="flex items-center gap-3 pt-1 text-xs">
                          {farm.boundary
                            ? <span className="text-green-600 flex items-center gap-1"><Check className="h-3 w-3" />Boundary mapped</span>
                            : <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />No boundary</span>}
                          {farm.legality_doc_url && (
                            <a href={farm.legality_doc_url} target="_blank" rel="noopener noreferrer"
                              className="text-primary flex items-center gap-1">
                              <FileText className="h-3 w-3" />Doc
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Registered {new Date(farm.created_at).toLocaleDateString()}</p>
                        <Button className="w-full mt-2" size="sm"
                          onClick={() => { setReviewFarm(farm); setReviewNotes(''); }}
                          data-testid={`button-review-${farm.id}`}>
                          Review Farm
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TierGate>
          </TabsContent>
        )}
      </Tabs>

      {/* ── DETAIL SHEET ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selectedFarm && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><User className="h-5 w-5" />{selectedFarm.farmer_name}</SheetTitle>
                <SheetDescription>Farm details and compliance status</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <StatusBadge domain="farm" status={selectedFarm.compliance_status} />
                  <Button variant="outline" size="sm"
                    onClick={() => { setSheetOpen(false); router.push(`/app/farms/map?farm_id=${selectedFarm.id}`); }}>
                    <Map className="h-4 w-4 mr-1.5" />Open in Map
                  </Button>
                </div>

                <div className="space-y-2">
                  {([
                    { icon: MapPin, label: 'Community', value: selectedFarm.community },
                    { icon: FileCheck, label: 'Farmer ID (NIN)', value: selectedFarm.farmer_id },
                    { icon: Phone, label: 'Phone', value: selectedFarm.phone },
                    { icon: Ruler, label: 'Farm Area', value: selectedFarm.area_hectares ? `${selectedFarm.area_hectares.toFixed(2)} hectares` : null },
                    { icon: Calendar, label: 'Registered', value: new Date(selectedFarm.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                  ] as const).filter(r => r.value).map(row => (
                    <div key={row.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <row.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
                        <p className="text-sm">{row.value}</p>
                      </div>
                    </div>
                  ))}

                  {selectedFarm.boundary && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Farm Boundary</p>
                        <p className="text-sm">{selectedFarm.boundary.coordinates?.[0]?.length ?? 0} points recorded</p>
                      </div>
                    </div>
                  )}

                  {selectedFarm.boundary_analysis && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {selectedFarm.boundary_analysis.confidence_level === 'high' ? (
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                          ) : selectedFarm.boundary_analysis.confidence_level === 'medium' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                          )}
                          <p className="text-xs font-medium text-muted-foreground">Boundary Confidence</p>
                        </div>
                        <Badge
                          className={selectedFarm.boundary_analysis.confidence_level === 'high' ? 'bg-green-600 text-white' : selectedFarm.boundary_analysis.confidence_level === 'medium' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}
                          data-testid="badge-farm-boundary-confidence"
                        >
                          {selectedFarm.boundary_analysis.confidence_score}/100
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {selectedFarm.boundary_analysis.confidence_level} confidence — analyzed {new Date(selectedFarm.boundary_analysis.analyzed_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {selectedFarm.legality_doc_url && (
                    <a href={selectedFarm.legality_doc_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-primary hover:underline">
                      <FileText className="h-4 w-4" />View Legality Document<ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  )}

                  {selectedFarm.compliance_notes && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Review Notes</p>
                      <p className="text-sm">{selectedFarm.compliance_notes}</p>
                    </div>
                  )}
                </div>

                {isReviewer && selectedFarm.compliance_status === 'pending' && (
                  <div className="pt-4 border-t">
                    <Button className="w-full"
                      onClick={() => { setSheetOpen(false); setReviewFarm(selectedFarm); setReviewNotes(''); }}>
                      Review This Farm
                    </Button>
                  </div>
                )}
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
    </div>
  );
}
