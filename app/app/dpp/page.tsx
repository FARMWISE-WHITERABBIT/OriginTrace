'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import {
  Loader2,
  Plus,
  FileText,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';

interface FinishedGood {
  id: string;
  product_name: string;
  product_type: string;
  pedigree_code: string;
  weight_kg: number;
  destination_country: string;
}

interface DPP {
  id: string;
  dpp_code: string;
  product_category: string;
  origin_country: string;
  status: string;
  carbon_footprint_kg: number | null;
  sustainability_claims: Record<string, string>;
  passport_version: number;
  issued_at: string;
  created_at: string;
  finished_goods?: {
    product_name: string;
    product_type: string;
    pedigree_code: string;
    weight_kg: number;
    destination_country: string;
    buyer_company: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
  revoked: { label: 'Revoked', variant: 'destructive', icon: XCircle },
};

export default function DPPPage() {
  const [dpps, setDpps] = useState<DPP[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    finished_good_id: '',
    sustainability_claims_text: '',
    carbon_footprint_kg: '',
  });
  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const fetchDpps = async () => {
    if (orgLoading) return;
    if (!organization) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/dpp');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDpps(data.dpps || []);
    } catch (error) {
      console.error('Failed to fetch DPPs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFinishedGoods = async () => {
    try {
      const response = await fetch('/api/finished-goods');
      if (!response.ok) return;
      const data = await response.json();
      setFinishedGoods(data.finishedGoods || []);
    } catch (error) {
      console.error('Failed to fetch finished goods:', error);
    }
  };

  useEffect(() => {
    fetchDpps();
    fetchFinishedGoods();
  }, [organization, orgLoading]);

  const handleCreate = async () => {
    if (!form.finished_good_id) {
      toast({ title: 'Missing fields', description: 'Please select a finished good.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      let sustainabilityClaims = {};
      if (form.sustainability_claims_text.trim()) {
        const lines = form.sustainability_claims_text.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const [key, ...rest] = line.split(':');
          if (key && rest.length > 0) {
            (sustainabilityClaims as Record<string, string>)[key.trim()] = rest.join(':').trim();
          }
        }
      }

      const response = await fetch('/api/dpp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finished_good_id: form.finished_good_id,
          sustainability_claims: sustainabilityClaims,
          carbon_footprint_kg: form.carbon_footprint_kg ? parseFloat(form.carbon_footprint_kg) : null,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate DPP');
      }
      const data = await response.json();
      toast({ title: 'DPP Generated', description: `Digital Product Passport ${data.dpp?.dpp_code || ''} has been generated.` });
      setDialogOpen(false);
      setForm({ finished_good_id: '', sustainability_claims_text: '', carbon_footprint_kg: '' });
      fetchDpps();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to generate DPP', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const copyPublicUrl = (dpp: DPP) => {
    const url = `${window.location.origin}/api/dpp/${dpp.id}?format=html`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'URL Copied', description: 'Public DPP URL has been copied to clipboard.' });
    }).catch(() => {
      toast({ title: 'Copy failed', description: 'Could not copy URL to clipboard.', variant: 'destructive' });
    });
  };

  const previewDpp = (dpp: DPP) => {
    window.open(`/api/dpp/${dpp.id}?format=html`, '_blank');
  };

  return (
    <TierGate feature="digital_product_passport" requiredTier="enterprise" featureLabel="Digital Product Passports">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
              Digital Product Passports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate and manage EU-compliant Digital Product Passports for finished goods
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-generate-dpp">
                <Plus className="h-4 w-4 mr-2" />
                Generate DPP
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Generate Digital Product Passport</DialogTitle>
                <DialogDescription>
                  Select a finished good to generate a DPP. Chain of custody and processing history will be auto-populated.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Finished Good</Label>
                  <Select
                    value={form.finished_good_id}
                    onValueChange={v => setForm(s => ({ ...s, finished_good_id: v }))}
                  >
                    <SelectTrigger data-testid="select-finished-good">
                      <SelectValue placeholder="Select a finished good" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishedGoods.map(fg => (
                        <SelectItem key={fg.id} value={fg.id}>
                          {fg.product_name} ({fg.pedigree_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {finishedGoods.length === 0 && (
                    <p className="text-xs text-muted-foreground">No finished goods available. Create one first via Processing.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dpp-claims">Sustainability Claims</Label>
                  <Textarea
                    id="dpp-claims"
                    placeholder={"Deforestation-free: Yes\nFair Trade: Certified\nOrganic: In Progress"}
                    value={form.sustainability_claims_text}
                    onChange={e => setForm(s => ({ ...s, sustainability_claims_text: e.target.value }))}
                    rows={4}
                    data-testid="textarea-sustainability-claims"
                  />
                  <p className="text-xs text-muted-foreground">One claim per line in format: Key: Value</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dpp-carbon">Carbon Footprint (kg CO2e)</Label>
                  <Input
                    id="dpp-carbon"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 125.50"
                    value={form.carbon_footprint_kg}
                    onChange={e => setForm(s => ({ ...s, carbon_footprint_kg: e.target.value }))}
                    data-testid="input-carbon-footprint"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-generate">
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-generate">
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate DPP
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading || orgLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : dpps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No Digital Product Passports yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Generate your first DPP from a finished good. It will include chain of custody, processing history, and compliance data.
              </p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-generate-first-dpp">
                <Plus className="h-4 w-4 mr-2" />
                Generate First DPP
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {dpps.map(dpp => {
              const statusConf = STATUS_CONFIG[dpp.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusConf.icon;

              return (
                <Card key={dpp.id} data-testid={`card-dpp-${dpp.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium" data-testid={`text-dpp-code-${dpp.id}`}>
                              {dpp.dpp_code}
                            </span>
                            <Badge variant={statusConf.variant} data-testid={`badge-status-${dpp.id}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConf.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                            <span data-testid={`text-product-name-${dpp.id}`}>
                              {dpp.finished_goods?.product_name || dpp.product_category}
                            </span>
                            {dpp.origin_country && <span>{dpp.origin_country}</span>}
                            {dpp.carbon_footprint_kg && (
                              <span>{dpp.carbon_footprint_kg} kg CO2e</span>
                            )}
                            <span>v{dpp.passport_version}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPublicUrl(dpp)}
                          data-testid={`button-copy-url-${dpp.id}`}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => previewDpp(dpp)}
                          data-testid={`button-preview-${dpp.id}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <a href={`/app/dpp/${dpp.id}`}>
                          <Button
                            size="sm"
                            data-testid={`button-view-${dpp.id}`}
                          >
                            View
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TierGate>
  );
}
