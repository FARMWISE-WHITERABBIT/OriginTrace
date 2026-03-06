'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QRScanner } from '@/components/qr-scanner';
import { 
  Scan, 
  Camera, 
  CheckCircle, 
  XCircle, 
  Package, 
  User, 
  MapPin, 
  Scale,
  Loader2,
  X
} from 'lucide-react';

interface BagDetails {
  id: string;
  bag_id: string;
  status: string;
  farm?: {
    farmer_name: string;
    community: string;
  };
  collection?: {
    weight: number;
    grade: string;
    agent?: {
      full_name: string;
    };
  };
}

export default function VerifyPage() {
  const [bagCode, setBagCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [bagDetails, setBagDetails] = useState<BagDetails | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [recentScans, setRecentScans] = useState<BagDetails[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const { organization, profile } = useOrg();
  const { toast } = useToast();
  const supabase = createClient();

  const isAgent = profile?.role === 'agent';
  const canVerify = !isAgent;

  async function searchBag(code?: string) {
    const searchCode = code || bagCode;
    if (!searchCode.trim() || !supabase || !organization) return;

    setIsSearching(true);
    setBagDetails(null);

    try {
      const { data: bag, error } = await supabase
        .from('bags')
        .select(`
          id,
          bag_id,
          status,
          collections (
            weight,
            grade,
            farm:farms (
              farmer_name,
              community
            ),
            agent:profiles (
              full_name
            )
          )
        `)
        .eq('org_id', organization.id)
        .eq('bag_id', searchCode.trim().toUpperCase())
        .single();

      if (error || !bag) {
        toast({
          title: 'Bag not found',
          description: 'No bag found with that ID in your organization.',
          variant: 'destructive'
        });
        return;
      }

      const collection = Array.isArray(bag.collections) ? bag.collections[0] : bag.collections;
      
      setBagDetails({
        id: bag.id,
        bag_id: bag.bag_id,
        status: bag.status,
        farm: collection?.farm as any,
        collection: {
          weight: collection?.weight,
          grade: collection?.grade,
          agent: collection?.agent as any
        }
      });

      toast({
        title: 'Bag Found',
        description: `Found bag ${bag.bag_id}`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Error',
        description: 'Failed to search for bag.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  }

  async function verifyBag(approved: boolean) {
    if (!bagDetails || !supabase) return;

    setIsVerifying(true);

    try {
      const newStatus = approved ? 'verified' : 'rejected';
      
      const { error } = await supabase
        .from('bags')
        .update({ status: newStatus })
        .eq('id', bagDetails.id);

      if (error) throw error;

      toast({
        title: approved ? 'Bag Verified' : 'Bag Rejected',
        description: `Bag ${bagDetails.bag_id} has been ${approved ? 'verified' : 'rejected'}.`
      });

      setRecentScans(prev => [{ ...bagDetails, status: newStatus }, ...prev.slice(0, 9)]);
      setBagDetails(null);
      setBagCode('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update bag status.',
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  }

  const handleScan = (result: string) => {
    setShowScanner(false);
    setBagCode(result.toUpperCase());
    searchBag(result);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'collected':
        return <Badge variant="secondary"><Package className="h-3 w-3 mr-1" /> Collected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scan & Verify</h1>
        <p className="text-muted-foreground">
          Scan or enter bag IDs to verify incoming collections
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Bag Scanner
            </CardTitle>
            <CardDescription>
              Enter a bag ID or use the camera to scan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showScanner ? (
              <QRScanner 
                onScan={handleScan}
                onClose={() => setShowScanner(false)}
              />
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter bag ID (e.g., BAG-001)"
                    value={bagCode}
                    onChange={(e) => setBagCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && searchBag()}
                    className="flex-1 min-h-[48px]"
                    data-testid="input-bag-code"
                  />
                  <Button 
                    onClick={() => searchBag()} 
                    disabled={isSearching || !bagCode.trim()}
                    className="min-h-[48px]"
                    data-testid="button-search-bag"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full min-h-[48px]"
                  onClick={() => setShowScanner(true)}
                  data-testid="button-open-scanner"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Open Camera Scanner
                </Button>
              </>
            )}

            {bagDetails && !showScanner && (
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{bagDetails.bag_id}</CardTitle>
                    {getStatusBadge(bagDetails.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bagDetails.farm && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{bagDetails.farm.farmer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{bagDetails.farm.community}</span>
                      </div>
                    </>
                  )}
                  {bagDetails.collection && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span>{bagDetails.collection.weight} kg - Grade {bagDetails.collection.grade}</span>
                      </div>
                      {bagDetails.collection.agent && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          Collected by: {bagDetails.collection.agent.full_name}
                        </div>
                      )}
                    </>
                  )}

                  {bagDetails.status === 'collected' && canVerify && (
                    <div className="flex gap-2 pt-2">
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700 min-h-[48px]"
                        onClick={() => verifyBag(true)}
                        disabled={isVerifying}
                        data-testid="button-verify-bag"
                      >
                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="destructive"
                        className="flex-1 min-h-[48px]"
                        onClick={() => verifyBag(false)}
                        disabled={isVerifying}
                        data-testid="button-reject-bag"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {isAgent && (
                    <p className="text-xs text-muted-foreground pt-2">Read-only view. Only admins and aggregators can verify or reject bags.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>
              Bags you've verified in this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No bags scanned yet. Start by entering a bag ID.
              </p>
            ) : (
              <div className="space-y-2">
                {recentScans.map((bag, index) => (
                  <div 
                    key={`${bag.id}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{bag.bag_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {bag.farm?.farmer_name || 'Unknown farmer'}
                      </p>
                    </div>
                    {getStatusBadge(bag.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
