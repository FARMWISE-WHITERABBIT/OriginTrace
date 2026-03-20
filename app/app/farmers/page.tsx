'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'; // kept for potential future use
import { Label } from '@/components/ui/label';
import {
  Loader2, Users, Search, MapPin, Package, TrendingUp,
  CheckCircle2, Clock, AlertCircle, LayoutList, LayoutGrid,
  ArrowUpDown, ChevronUp, ChevronDown,
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

const COMMODITY_COLORS: Record<string, string> = {
  cocoa:   'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  cashew:  'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  sesame:  'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  beans:   'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  ginger:  'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
};

export default function FarmersPage() {
  const router = useRouter();
  const [farmers, setFarmers] = useState<FarmerLedger[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortKey, setSortKey] = useState<SortKey>('farmer_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => { fetchFarmers(); }, []);

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

  const filtered = farmers.filter(f =>
    f.farmer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.community?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.commodity?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let av: any = a[sortKey], bv: any = b[sortKey];
    if (av == null) av = sortDir === 'asc' ? '\uFFFF' : '';
    if (bv == null) bv = sortDir === 'asc' ? '\uFFFF' : '';
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const getGradeLabel = (score: number | null) => {
    if (!score) return { label: '–', color: 'secondary' as const };
    if (score >= 3.5) return { label: 'A', color: 'default' as const };
    if (score >= 2.5) return { label: 'B', color: 'secondary' as const };
    if (score >= 1.5) return { label: 'C', color: 'outline' as const };
    return { label: 'D', color: 'destructive' as const };
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

  const totalDelivery = farmers.reduce((sum, f) => sum + Number(f.total_delivery_kg), 0);
  const gradedFarmers = farmers.filter(f => f.avg_grade_score);
  const avgGrade = gradedFarmers.length > 0
    ? gradedFarmers.reduce((sum, f) => sum + Number(f.avg_grade_score), 0) / gradedFarmers.length
    : 0;
  const withConsent = farmers.filter(f => f.has_consent).length;

  return (
    <TierGate feature="farmers_list" requiredTier="starter" featureLabel="Farmers">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                Farmer Network
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">Performance ledger and delivery history</p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-md border overflow-hidden">
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-none border-0 px-2.5 h-9"
                  onClick={() => setViewMode('table')}
                  title="Table view"
                  data-testid="button-view-table"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-none border-0 px-2.5 h-9"
                  onClick={() => setViewMode('grid')}
                  title="Card grid view"
                  data-testid="button-view-grid"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/app/farmers/new">+ Register Farmer</a>
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{farmers.length}</div>
                <p className="text-xs text-muted-foreground">Registered in network</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(totalDelivery / 1000).toFixed(1)}t</div>
                <p className="text-xs text-muted-foreground">Lifetime deliveries</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Avg Grade</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgGrade.toFixed(1)}/4.0</div>
                <p className="text-xs text-muted-foreground">Quality score</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">With Consent</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{withConsent}</div>
                <p className="text-xs text-muted-foreground">
                  {farmers.length > 0 ? Math.round((withConsent / farmers.length) * 100) : 0}% of farmers
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, community, commodity..."
              className="pl-9"
              data-testid="input-search-farmers"
            />
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Performance Ledger</CardTitle>
                <CardDescription>Click a row to see full delivery history</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('farmer_name')}>
                        Farmer <SortIcon col="farmer_name" />
                      </TableHead>
                      <TableHead>Community</TableHead>
                      <TableHead>Commodity</TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('area_hectares')}>
                        Area (ha) <SortIcon col="area_hectares" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('total_delivery_kg')}>
                        Volume (kg) <SortIcon col="total_delivery_kg" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('total_batches')}>
                        Batches <SortIcon col="total_batches" />
                      </TableHead>
                      <TableHead className="text-center cursor-pointer select-none" onClick={() => handleSort('avg_grade_score')}>
                        Grade <SortIcon col="avg_grade_score" />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('last_delivery_date')}>
                        Last Collection <SortIcon col="last_delivery_date" />
                      </TableHead>
                      <TableHead className="text-center">Consent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-12">
                          <div className="text-center">
                            {searchQuery ? (
                              <>
                                <p className="font-medium text-muted-foreground">No farmers match your search</p>
                                <p className="text-sm text-muted-foreground mt-1">Try a different name, community, or commodity</p>
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
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/app/farmers/${farmer.farm_id}`)}
                          data-testid={`farmer-row-${farmer.farm_id}`}
                        >
                          <TableCell className="font-medium">{farmer.farmer_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{farmer.community || '–'}</TableCell>
                          <TableCell>
                            {farmer.commodity ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${COMMODITY_COLORS[farmer.commodity] || 'bg-muted'}`}>
                                {farmer.commodity}
                              </span>
                            ) : <span className="text-muted-foreground text-sm">–</span>}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{farmer.area_hectares?.toFixed(2) || '–'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{Number(farmer.total_delivery_kg).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{farmer.total_batches}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={grade.color}>{grade.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {farmer.last_delivery_date
                              ? new Date(farmer.last_delivery_date).toLocaleDateString()
                              : <span className="text-muted-foreground/50">Never</span>}
                          </TableCell>
                          <TableCell className="text-center">
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
              <div className="text-center py-12">
                {searchQuery ? (
                  <>
                    <p className="font-medium text-muted-foreground">No farmers match your search</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a different name, community, or commodity</p>
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
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => router.push(`/app/farmers/${farmer.farm_id}`)}
                      data-testid={`farmer-card-${farmer.farm_id}`}
                    >
                      <CardContent className="pt-5 pb-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{farmer.farmer_name}</p>
                            {farmer.community && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />{farmer.community}
                              </p>
                            )}
                          </div>
                          <Badge variant={grade.color} className="shrink-0">{grade.label}</Badge>
                        </div>

                        {farmer.commodity && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium inline-block ${COMMODITY_COLORS[farmer.commodity] || 'bg-muted'}`}>
                            {farmer.commodity}
                          </span>
                        )}

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <span className="text-muted-foreground">Volume</span>
                          <span className="font-mono text-right">{(Number(farmer.total_delivery_kg) / 1000).toFixed(2)}MT</span>
                          <span className="text-muted-foreground">Batches</span>
                          <span className="font-mono text-right">{farmer.total_batches}</span>
                          {farmer.area_hectares != null && (
                            <>
                              <span className="text-muted-foreground">Area</span>
                              <span className="font-mono text-right">{farmer.area_hectares.toFixed(1)} ha</span>
                            </>
                          )}
                          <span className="text-muted-foreground">Last delivery</span>
                          <span className="text-right text-muted-foreground">
                            {farmer.last_delivery_date
                              ? new Date(farmer.last_delivery_date).toLocaleDateString()
                              : 'Never'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t">
                          {getFrequencyBadge(farmer.delivery_frequency)}
                          {farmer.has_consent
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : <AlertCircle className="h-4 w-4 text-amber-500" />}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
    </TierGate>
  );
}
