'use client';

import { useEffect, useState } from 'react';
import { FarmerTableSkeleton } from '@/components/skeletons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'; // kept for potential future use
import { Label } from '@/components/ui/label';
import {
  Loader2, Users, Search, MapPin, Package, TrendingUp,
  CheckCircle2, Clock, AlertCircle, LayoutList, LayoutGrid,
  ArrowUpDown, ChevronUp, ChevronDown, Scale, Star, Map,
  Download, UserPlus, Eye,
} from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

interface FarmerLedger {
  farm_id: number;
  farmer_name: string;
  org_id: number;
  community: string | null;
  area_hectares: number | null;
  commodity: string | null;
  total_delivery_kg: number;
  total_batches: number;
  total_bags: number;
  avg_grade_score: number | null;
  last_delivery_date: string | null;
  delivery_frequency: 'high' | 'medium' | 'low';
  has_consent: boolean;
}

type SortKey = 'farmer_name' | 'total_delivery_kg' | 'total_batches' | 'avg_grade_score' | 'last_delivery_date' | 'area_hectares';

// Rotate through semantic color classes for unknown commodities
const BADGE_COLORS = [
  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
];

function getCommodityColor(commodity: string, colorMap: Record<string, string>): string {
  if (colorMap[commodity.toLowerCase()]) return colorMap[commodity.toLowerCase()];
  // Deterministic color based on hash of commodity name
  let h = 0;
  for (let i = 0; i < commodity.length; i++) h = (h * 31 + commodity.charCodeAt(i)) >>> 0;
  return BADGE_COLORS[h % BADGE_COLORS.length];
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function FarmersPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggleSelect = (id: number) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids: number[]) => setSelected(p => p.size === ids.length && ids.every(id => p.has(id)) ? new Set() : new Set(ids));
  const [commodityColorMap, setCommodityColorMap] = useState<Record<string, string>>({});
  const [farmers, setFarmers] = useState<FarmerLedger[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortKey, setSortKey] = useState<SortKey>('farmer_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [commodityFilter, setCommodityFilter] = useState<string>('all');

  useEffect(() => {
    fetchFarmers();
    // Fetch commodities to build dynamic color map
    fetch('/api/commodities')
      .then(r => r.ok ? r.json() : { commodities: [] })
      .then(d => {
        const map: Record<string, string> = {};
        (d.commodities || []).forEach((c: { slug?: string; name: string }, i: number) => {
          const key = (c.name || c.slug || '').toLowerCase();
          map[key] = BADGE_COLORS[i % BADGE_COLORS.length];
          if (c.slug) map[c.slug.toLowerCase()] = BADGE_COLORS[i % BADGE_COLORS.length];
        });
        setCommodityColorMap(map);
      })
      .catch(() => {});
  }, []);

  const fetchFarmers = async () => {
    try {
      const response = await fetch('/api/farmers');
      if (response.ok) {
        const data = await response.json();
        setFarmers(data.farmers || []);
      }
    } catch (error) {
      console.error('Failed to fetch farmers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1 inline" />
      : <ChevronDown className="h-3 w-3 ml-1 inline" />;
  };

  // Unique commodities for filter
  const uniqueCommodities = Array.from(new Set(farmers.map(f => f.commodity).filter(Boolean) as string[])).sort();

  const filtered = farmers.filter(f => {
    const matchesSearch =
      f.farmer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.community?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.commodity?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCommodity = commodityFilter === 'all' || f.commodity?.toLowerCase() === commodityFilter.toLowerCase();
    return matchesSearch && matchesCommodity;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: any = a[sortKey], bv: any = b[sortKey];
    if (av == null) av = sortDir === 'asc' ? '\uFFFF' : '';
    if (bv == null) bv = sortDir === 'asc' ? '\uFFFF' : '';
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const getGradeLabel = (score: number | null) => {
    if (!score) return { label: '–', color: 'secondary' as const, cls: 'bg-muted text-muted-foreground' };
    if (score >= 3.5) return { label: 'A', color: 'default' as const, cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200' };
    if (score >= 2.5) return { label: 'B', color: 'secondary' as const, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200' };
    if (score >= 1.5) return { label: 'C', color: 'outline' as const, cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200' };
    return { label: 'D', color: 'destructive' as const, cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200' };
  };

  const getFrequencyBadge = (frequency: string) => {
    const styles: Record<string, { icon: typeof TrendingUp; color: string }> = {
      high:   { icon: TrendingUp,  color: 'text-green-600 dark:text-green-400' },
      medium: { icon: Clock,       color: 'text-amber-600 dark:text-amber-400' },
      low:    { icon: AlertCircle, color: 'text-red-500' },
    };
    const style = styles[frequency] || styles.low;
    const Icon = style.icon;
    return (
      <div className={`flex items-center gap-1 ${style.color}`}>
        <Icon className="h-3 w-3" />
        <span className="capitalize text-sm">{frequency}</span>
      </div>
    );
  };

  const exportAllCSV = () => {
    const csv = ['Farmer,Community,Commodity,Area (ha),Deliveries (kg),Batches,Grade',
      ...farmers.map(f => [f.farmer_name, f.community || '', f.commodity || '', f.area_hectares || '', f.total_delivery_kg || '', f.total_batches || '', f.avg_grade_score?.toFixed(1) || ''].join(','))
    ].join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'farmers.csv' });
    a.click();
  };

  const totalDelivery = farmers.reduce((sum, f) => sum + Number(f.total_delivery_kg), 0);
  const gradedFarmers = farmers.filter(f => f.avg_grade_score);
  const avgGrade = gradedFarmers.length > 0
    ? gradedFarmers.reduce((sum, f) => sum + Number(f.avg_grade_score), 0) / gradedFarmers.length
    : 0;
  const withConsent = farmers.filter(f => f.has_consent).length;
  const gpsCoverage = farmers.length > 0 ? Math.round((withConsent / farmers.length) * 100) : 0;

  const headerContent = (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farmer Network</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Performance ledger and delivery history</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={exportAllCSV}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
        <Button size="sm" asChild>
          <a href="/app/farmers/new">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Register Farmer
          </a>
        </Button>
      </div>
    </div>
  );

  return (
    <TierGate feature="farmers_list" requiredTier="starter" featureLabel="Farmers">
      {isLoading ? (
        <div className="p-6 space-y-6">
          {headerContent}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['Farmer', 'Community', 'Commodity', 'Area (ha)', 'Deliveries (kg)', 'Batches', 'Grade', 'Last Delivery', 'Consent'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <FarmerTableSkeleton rows={8} />
            </table>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Header */}
          {headerContent}

          {/* Stats strip — 4 cols */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="card-accent-emerald transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Farmers</CardTitle>
                <div className="h-9 w-9 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{farmers.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Registered in network</p>
              </CardContent>
            </Card>

            <Card className="card-accent-blue transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
                <div className="h-9 w-9 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
                  <Scale className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{(totalDelivery / 1000).toFixed(1)}t</div>
                <p className="text-xs text-muted-foreground mt-0.5">{totalDelivery.toLocaleString()} kg lifetime</p>
              </CardContent>
            </Card>

            <Card className="card-accent-violet transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Grade</CardTitle>
                <div className="h-9 w-9 rounded-lg icon-bg-violet flex items-center justify-center shrink-0">
                  <Star className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{avgGrade.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/4.0</span></div>
                <p className="text-xs text-muted-foreground mt-0.5">Quality score across {gradedFarmers.length} graded</p>
              </CardContent>
            </Card>

            <Card className="card-accent-green transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">GPS Coverage</CardTitle>
                <div className="h-9 w-9 rounded-lg icon-bg-green flex items-center justify-center shrink-0">
                  <Map className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{gpsCoverage}%</div>
                <p className="text-xs text-muted-foreground mt-0.5">{withConsent} of {farmers.length} with consent</p>
              </CardContent>
            </Card>
          </div>

          {/* Controls row: search + commodity filter + view toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, community, commodity..."
                aria-label="Search farmers"
                className="pl-9"
                data-testid="input-search-farmers"
              />
            </div>

            {/* Commodity filter — segmented control */}
            {uniqueCommodities.length > 0 && (
              <div className="segmented-control flex-wrap gap-y-1">
                <button
                  className="segmented-control-item"
                  data-active={commodityFilter === 'all'}
                  onClick={() => setCommodityFilter('all')}
                  aria-label="All commodities"
                >
                  All
                </button>
                {uniqueCommodities.map(c => (
                  <button
                    key={c}
                    className="segmented-control-item"
                    data-active={commodityFilter === c.toLowerCase()}
                    onClick={() => setCommodityFilter(c.toLowerCase())}
                    aria-label={`Filter by ${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1 hidden sm:block" />

            {/* View toggle */}
            <div className="segmented-control shrink-0">
              <button
                className="segmented-control-item px-2.5"
                data-active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
                title="Table view"
                data-testid="button-view-table"
                aria-label="Table view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                className="segmented-control-item px-2.5"
                data-active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                title="Card grid view"
                data-testid="button-view-grid"
                aria-label="Card grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Performance Ledger</CardTitle>
                    <CardDescription>Click a row to see full delivery history</CardDescription>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {sorted.length} of {farmers.length} farmers
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={sorted.length > 0 && sorted.every(f => selected.has(f.farm_id))}
                          onCheckedChange={() => toggleAll(sorted.map(f => f.farm_id))}
                          aria-label="Select all farmers"
                        />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('farmer_name')}>
                        Farmer <SortIcon col="farmer_name" />
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Community / State</TableHead>
                      <TableHead>Commodity</TableHead>
                      <TableHead className="hidden md:table-cell text-right cursor-pointer select-none" onClick={() => handleSort('area_hectares')}>
                        Area (ha) <SortIcon col="area_hectares" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('total_delivery_kg')}>
                        Volume (kg) <SortIcon col="total_delivery_kg" />
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-right cursor-pointer select-none" onClick={() => handleSort('total_batches')}>
                        Batches <SortIcon col="total_batches" />
                      </TableHead>
                      <TableHead className="text-center cursor-pointer select-none" onClick={() => handleSort('avg_grade_score')}>
                        Grade <SortIcon col="avg_grade_score" />
                      </TableHead>
                      <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort('last_delivery_date')}>
                        Last Collection <SortIcon col="last_delivery_date" />
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-center">Consent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-16">
                          <div className="empty-state">
                            <div className="empty-state-icon">
                              <Users className="h-6 w-6" />
                            </div>
                            {searchQuery || commodityFilter !== 'all' ? (
                              <>
                                <p className="font-medium text-muted-foreground">No farmers match your search</p>
                                <p className="text-sm text-muted-foreground mt-1">Try a different name, community, or commodity</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setCommodityFilter('all'); }}>
                                  Clear filters
                                </Button>
                              </>
                            ) : (
                              <>
                                <p className="font-medium">No farmers registered yet</p>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                                  Register farmers using the field app during collection visits. Each farmer record is linked to their GPS-mapped farm for traceability.
                                </p>
                                <Link href="/app/farmers/new" className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary hover:underline">
                                  Register your first farmer →
                                </Link>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : sorted.map((farmer) => {
                      const grade = getGradeLabel(farmer.avg_grade_score);
                      return (
                        <TableRow
                          key={farmer.farm_id}
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${selected.has(farmer.farm_id) ? 'bg-primary/5' : ''}`}
                          onClick={() => router.push(`/app/farmers/${farmer.farm_id}`)}
                          data-testid={`farmer-row-${farmer.farm_id}`}
                        >
                          <TableCell onClick={e => { e.stopPropagation(); toggleSelect(farmer.farm_id); }}>
                            <Checkbox
                              checked={selected.has(farmer.farm_id)}
                              onCheckedChange={() => toggleSelect(farmer.farm_id)}
                              aria-label={`Select ${farmer.farmer_name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              {/* Avatar initial circle */}
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary select-none">
                                {farmer.farmer_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm leading-tight truncate">{farmer.farmer_name}</p>
                                <p className="font-mono text-[10px] text-muted-foreground leading-tight">ID #{farmer.farm_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">{farmer.community || '–'}</span>
                          </TableCell>
                          <TableCell>
                            {farmer.commodity ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getCommodityColor(farmer.commodity, commodityColorMap)}`}>
                                {farmer.commodity}
                              </span>
                            ) : <span className="text-muted-foreground text-sm">–</span>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right font-mono text-sm">{farmer.area_hectares?.toFixed(2) || '–'}</TableCell>
                          <TableCell className="text-right">
                            <p className="font-mono text-sm font-medium">{Number(farmer.total_delivery_kg).toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{farmer.total_bags} bags</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right font-mono text-sm">{farmer.total_batches}</TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded text-xs font-bold border ${grade.cls}`}>
                              {grade.label}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {farmer.last_delivery_date
                              ? relativeDate(farmer.last_delivery_date)
                              : <span className="text-muted-foreground/50 italic text-xs">Never</span>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-center">
                            {farmer.has_consent
                              ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                              : <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            sorted.length === 0 ? (
              <div className="empty-state py-16">
                <div className="empty-state-icon">
                  <Users className="h-6 w-6" />
                </div>
                {searchQuery || commodityFilter !== 'all' ? (
                  <>
                    <p className="font-medium text-muted-foreground">No farmers match your search</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a different name, community, or commodity</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setCommodityFilter('all'); }}>
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No farmers registered yet</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                      Register farmers using the field app during collection visits. Each record links to their GPS-mapped farm.
                    </p>
                    <Link href="/app/farmers/new" className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary hover:underline">
                      Register your first farmer →
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map((farmer) => {
                  const grade = getGradeLabel(farmer.avg_grade_score);
                  return (
                    <Card
                      key={farmer.farm_id}
                      className="card-accent-emerald cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                      onClick={() => router.push(`/app/farmers/${farmer.farm_id}`)}
                      data-testid={`farmer-card-${farmer.farm_id}`}
                    >
                      <CardContent className="pt-5 pb-4 space-y-3">
                        {/* Card header row */}
                        <div className="flex items-start gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary select-none">
                            {farmer.farmer_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-tight truncate">{farmer.farmer_name}</p>
                            {farmer.community && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0" />{farmer.community}
                              </p>
                            )}
                          </div>
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded text-xs font-bold border shrink-0 ${grade.cls}`}>
                            {grade.label}
                          </span>
                        </div>

                        {/* Commodity badge */}
                        {farmer.commodity && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium inline-block ${getCommodityColor(farmer.commodity, commodityColorMap)}`}>
                            {farmer.commodity}
                          </span>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-border/60">
                          <div className="text-center">
                            <p className="text-xs font-bold">{(Number(farmer.total_delivery_kg) / 1000).toFixed(1)}t</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Volume</p>
                          </div>
                          <div className="text-center border-x border-border/60">
                            <p className="text-xs font-bold">{farmer.total_batches}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Batches</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold">{farmer.area_hectares != null ? `${farmer.area_hectares.toFixed(1)}ha` : '–'}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Area</p>
                          </div>
                        </div>

                        {/* Footer row */}
                        <div className="flex items-center justify-between pt-0.5">
                          <div className="flex items-center gap-1">
                            {farmer.has_consent
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className="text-[10px] text-muted-foreground">{farmer.has_consent ? 'Consent OK' : 'No consent'}</span>
                          </div>
                          <span className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                            <Eye className="h-3 w-3" />View Profile
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {/* Bulk action bar — fixed floating bottom */}
          {selected.size > 0 && (
            <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border border-border rounded-xl shadow-lg px-4 py-3">
              <span className="text-sm font-medium">{selected.size} farmer{selected.size !== 1 ? 's' : ''} selected</span>
              <div className="w-px h-4 bg-border" />
              <Button size="sm" variant="outline" onClick={() => {
                const selectedFarmers = sorted.filter(f => selected.has(f.farm_id));
                const csv = ['Farmer,Community,Commodity,Area (ha),Deliveries (kg)',
                  ...selectedFarmers.map(f => [f.farmer_name, f.community || '', f.commodity || '', f.area_hectares || '', f.total_delivery_kg || ''].join(','))
                ].join('\n');
                const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'farmers.csv' });
                a.click();
              }}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}
        </div>
      )}
    </TierGate>
  );
}
