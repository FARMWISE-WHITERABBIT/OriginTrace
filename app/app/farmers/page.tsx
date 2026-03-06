'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Search, MapPin, Package, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
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

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<FarmerLedger[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerLedger | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFarmers();
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

  const filteredFarmers = farmers.filter(farmer =>
    farmer.farmer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farmer.community?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGradeLabel = (score: number | null) => {
    if (!score) return { label: '-', color: 'secondary' as const };
    if (score >= 3.5) return { label: 'A', color: 'default' as const };
    if (score >= 2.5) return { label: 'B', color: 'secondary' as const };
    if (score >= 1.5) return { label: 'C', color: 'outline' as const };
    return { label: 'D', color: 'destructive' as const };
  };

  const getFrequencyBadge = (frequency: string) => {
    const styles: Record<string, { icon: typeof TrendingUp; color: string }> = {
      high: { icon: TrendingUp, color: 'text-green-500' },
      medium: { icon: Clock, color: 'text-amber-500' },
      low: { icon: AlertCircle, color: 'text-red-500' }
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
  const avgGrade = farmers.length > 0 
    ? farmers.reduce((sum, f) => sum + (Number(f.avg_grade_score) || 0), 0) / farmers.filter(f => f.avg_grade_score).length
    : 0;
  const withConsent = farmers.filter(f => f.has_consent).length;

  return (
    <TierGate feature="farmers_list" requiredTier="pro" featureLabel="Farmers">
    {isLoading ? (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ) : (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Farmer Network
        </h1>
        <p className="text-muted-foreground">Performance ledger and delivery history</p>
      </div>

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Farmer Performance Ledger</CardTitle>
              <CardDescription>Track delivery volume, quality, and frequency</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search farmers..."
                className="pl-9 w-64"
                data-testid="input-search-farmers"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead>Community</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead className="text-right">Area (ha)</TableHead>
                <TableHead className="text-right">Total (kg)</TableHead>
                <TableHead className="text-right">Batches</TableHead>
                <TableHead className="text-center">Avg Grade</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-center">Consent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFarmers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No farmers match your search' : 'No farmers registered yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFarmers.map((farmer) => {
                  const grade = getGradeLabel(farmer.avg_grade_score);
                  return (
                    <TableRow 
                      key={farmer.farm_id} 
                      className="cursor-pointer"
                      onClick={() => setSelectedFarmer(farmer)}
                      data-testid={`farmer-row-${farmer.farm_id}`}
                    >
                      <TableCell className="font-medium">{farmer.farmer_name}</TableCell>
                      <TableCell>{farmer.community || '-'}</TableCell>
                      <TableCell className="capitalize">{farmer.commodity || '-'}</TableCell>
                      <TableCell className="text-right">{farmer.area_hectares?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-right">{Number(farmer.total_delivery_kg).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{farmer.total_batches}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={grade.color}>{grade.label}</Badge>
                      </TableCell>
                      <TableCell>{getFrequencyBadge(farmer.delivery_frequency)}</TableCell>
                      <TableCell className="text-center">
                        {farmer.has_consent ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedFarmer} onOpenChange={(open) => !open && setSelectedFarmer(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedFarmer?.farmer_name}</SheetTitle>
            <SheetDescription>Farmer performance details</SheetDescription>
          </SheetHeader>

          {selectedFarmer && (
            <div className="space-y-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Community</Label>
                  <p className="font-medium">{selectedFarmer.community || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Commodity</Label>
                  <p className="font-medium capitalize">{selectedFarmer.commodity || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Farm Area</Label>
                  <p className="font-medium">{selectedFarmer.area_hectares?.toFixed(2) || '-'} hectares</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Consent Status</Label>
                  <p className="font-medium flex items-center gap-1">
                    {selectedFarmer.has_consent ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Captured
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Pending
                      </>
                    )}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Deliveries</span>
                    <span className="font-medium">{Number(selectedFarmer.total_delivery_kg).toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Batches</span>
                    <span className="font-medium">{selectedFarmer.total_batches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Bags</span>
                    <span className="font-medium">{selectedFarmer.total_bags}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Grade</span>
                    <span className="font-medium">
                      {selectedFarmer.avg_grade_score?.toFixed(2) || '-'} / 4.0
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Frequency</span>
                    {getFrequencyBadge(selectedFarmer.delivery_frequency)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Delivery</span>
                    <span className="font-medium">
                      {selectedFarmer.last_delivery_date 
                        ? new Date(selectedFarmer.last_delivery_date).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Based on delivery volume, grade quality, and frequency, this farmer 
                    {selectedFarmer.total_delivery_kg > 1000 && selectedFarmer.avg_grade_score && selectedFarmer.avg_grade_score >= 3 
                      ? ' is a high-performing supplier.'
                      : ' is building their delivery history.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
    )}
    </TierGate>
  );
}
