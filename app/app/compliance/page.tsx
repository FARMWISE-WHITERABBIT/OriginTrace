'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Clock, MapPin, User, Phone, FileText } from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

interface Farm {
  id: string;
  farmer_name: string;
  farmer_id: string | null;
  phone: string | null;
  community: string;
  compliance_status: string;
  compliance_notes: string | null;
  area_hectares: number | null;
  legality_doc_url: string | null;
  boundary: any;
  created_at: string;
}

export default function CompliancePage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const fetchFarms = async () => {
    if (orgLoading) return;
    if (!organization) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/farms?status=pending');
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
  };

  useEffect(() => {
    fetchFarms();
  }, [organization, orgLoading]);

  const handleReview = (farm: Farm) => {
    setSelectedFarm(farm);
    setReviewNotes('');
  };

  const submitReview = async (status: 'approved' | 'rejected') => {
    if (!selectedFarm) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/farms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedFarm.id,
          compliance_status: status,
          compliance_notes: reviewNotes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update farm');
      }

      toast({
        title: status === 'approved' ? 'Farm Approved' : 'Farm Rejected',
        description: `${selectedFarm.farmer_name}'s farm has been ${status}.`,
      });

      setSelectedFarm(null);
      fetchFarms();
    } catch (error) {
      console.error('Failed to update farm:', error);
      toast({
        title: 'Error',
        description: 'Failed to update farm status',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TierGate feature="compliance_review" requiredTier="pro" featureLabel="Compliance Review">
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance Review</h1>
        <p className="text-muted-foreground">
          Review and approve farm registrations
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : farms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold">All Caught Up!</h3>
            <p className="text-muted-foreground">No farms pending compliance review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <Card key={farm.id} className="hover-elevate" data-testid={`compliance-card-${farm.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{farm.farmer_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {farm.community}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {farm.farmer_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>ID: {farm.farmer_id}</span>
                  </div>
                )}
                {farm.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{farm.phone}</span>
                  </div>
                )}
                {farm.area_hectares && (
                  <div className="text-sm text-muted-foreground">
                    Area: {farm.area_hectares.toFixed(2)} hectares
                  </div>
                )}
                {farm.legality_doc_url && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <FileText className="h-4 w-4" />
                    <a href={farm.legality_doc_url} target="_blank" rel="noopener noreferrer">
                      View Document
                    </a>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Registered: {new Date(farm.created_at).toLocaleDateString()}
                </div>
                <Button 
                  className="w-full mt-2" 
                  onClick={() => handleReview(farm)}
                  data-testid={`button-review-${farm.id}`}
                >
                  Review Farm
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedFarm} onOpenChange={(open) => !open && setSelectedFarm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Farm Registration</DialogTitle>
            <DialogDescription>
              Review {selectedFarm?.farmer_name}'s farm in {selectedFarm?.community}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Farmer Details</Label>
              <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
                <p><strong>Name:</strong> {selectedFarm?.farmer_name}</p>
                <p><strong>ID:</strong> {selectedFarm?.farmer_id || 'Not provided'}</p>
                <p><strong>Phone:</strong> {selectedFarm?.phone || 'Not provided'}</p>
                <p><strong>Community:</strong> {selectedFarm?.community}</p>
                <p><strong>Area:</strong> {selectedFarm?.area_hectares?.toFixed(2) || 'N/A'} ha</p>
              </div>
            </div>
            
            {selectedFarm?.boundary && (
              <div className="text-sm text-green-600">
                <Check className="inline h-4 w-4 mr-1" />
                Farm boundary mapped ({Object.keys(selectedFarm.boundary).length > 0 ? 'GeoJSON available' : 'No coordinates'})
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Review Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this review..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                data-testid="textarea-review-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => submitReview('rejected')}
              disabled={isSubmitting}
              data-testid="button-reject"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
              Reject
            </Button>
            <Button
              onClick={() => submitReview('approved')}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-approve"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TierGate>
  );
}
