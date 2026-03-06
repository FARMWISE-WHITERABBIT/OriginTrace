'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Loader2, Search, MapPin, Check, X, Clock, User, Phone, Calendar, Ruler, FileCheck } from 'lucide-react';

interface Farm {
  id: string;
  farmer_name: string;
  farmer_id: string | null;
  phone: string | null;
  community: string;
  village_id: string | null;
  compliance_status: string;
  area_hectares: number | null;
  boundary: any;
  created_at: string;
  mapped_by: string | null;
}

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { organization, isLoading: orgLoading } = useOrg();

  useEffect(() => {
    async function fetchFarms() {
      if (orgLoading) return;
      if (!organization) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/farms');
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch farms');
        }
        const data = await response.json();
        setFarms(data.farms || []);
      } catch (error) {
        console.error('Failed to fetch farms:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFarms();
  }, [organization, orgLoading]);

  const filteredFarms = farms.filter(farm => 
    farm.farmer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farm.community.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (farm.farmer_id && farm.farmer_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600"><Check className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const handleRowClick = (farm: Farm) => {
    setSelectedFarm(farm);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Farms</h1>
          <p className="text-muted-foreground">
            Manage registered farms in your organization
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>All Farms</CardTitle>
              <CardDescription>{farms.length} farms registered</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search farms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-farms"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFarms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? 'No farms match your search' : 'No farms registered yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer Name</TableHead>
                    <TableHead>Community</TableHead>
                    <TableHead>Farmer ID</TableHead>
                    <TableHead>Area (ha)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFarms.map((farm) => (
                    <TableRow 
                      key={farm.id} 
                      data-testid={`farm-row-${farm.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(farm)}
                    >
                      <TableCell className="font-medium">{farm.farmer_name}</TableCell>
                      <TableCell>{farm.community}</TableCell>
                      <TableCell>{farm.farmer_id || '-'}</TableCell>
                      <TableCell>{farm.area_hectares?.toFixed(2) || '-'}</TableCell>
                      <TableCell>{getStatusBadge(farm.compliance_status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(farm.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          {selectedFarm && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedFarm.farmer_name}
                </SheetTitle>
                <SheetDescription>
                  Farm details and compliance status
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div className="flex justify-center">
                  {getStatusBadge(selectedFarm.compliance_status)}
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Community</p>
                      <p className="text-sm text-muted-foreground">{selectedFarm.community}</p>
                    </div>
                  </div>

                  {selectedFarm.farmer_id && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <FileCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Farmer ID (NIN)</p>
                        <p className="text-sm text-muted-foreground">{selectedFarm.farmer_id}</p>
                      </div>
                    </div>
                  )}

                  {selectedFarm.phone && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{selectedFarm.phone}</p>
                      </div>
                    </div>
                  )}

                  {selectedFarm.area_hectares && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Ruler className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Farm Area</p>
                        <p className="text-sm text-muted-foreground">{selectedFarm.area_hectares.toFixed(2)} hectares</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Registration Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedFarm.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {selectedFarm.boundary && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm font-medium">Farm Boundary</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedFarm.boundary.coordinates?.[0]?.length || 0} boundary points recorded
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSheetOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
