'use client';

/**
 * components/settings/compliance-profiles-content.tsx
 *
 * Self-contained: manages its own state, fetches from /api/compliance-profiles.
 * Extracted from app/app/settings/page.tsx to reduce file size.
 * Rendered inside the "compliance" tab of SettingsContent.
 */

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { ShieldCheck, Loader2, Trash2, Plus, MapPin, Shield } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CPProfile {
  id:                    string;
  name:                  string;
  destination_market:    string;
  regulation_framework:  string;
  required_documents:    string[];
  geo_verification_level:string;
  min_traceability_depth:number;
  is_default:            boolean;
  created_at:            string;
}

// ── Static data ───────────────────────────────────────────────────────────────

export const CP_FRAMEWORK_LABELS: Record<string, string> = {
  EUDR:               'EU Deforestation Regulation',
  FSMA_204:           'FSMA Rule 204',
  UK_Environment_Act: 'UK Environment Act',
  Lacey_Act_UFLPA:    'Lacey Act / UFLPA',
  China_Green_Trade:  'China Green Trade',
  UAE_Halal:          'UAE / Halal Standards',
  custom:             'Buyer Standards',
};

export const CP_GEO_LABELS: Record<string, string> = {
  basic:     'Basic GPS',
  polygon:   'Polygon Boundaries',
  satellite: 'Satellite Verification',
};

export const CP_TEMPLATES: Record<string, Partial<CPProfile> & { regulation_framework: string }> = {
  EU: {
    name: 'EU EUDR Compliance',
    destination_market: 'European Union',
    regulation_framework: 'EUDR',
    required_documents: ['Deforestation-free declaration','GPS polygon boundaries','Land title / ownership proof','Farmer ID verification','Traceability chain documentation','Due diligence statement'],
    geo_verification_level: 'satellite',
    min_traceability_depth: 3,
  },
  UK: {
    name: 'UK Environment Act Compliance',
    destination_market: 'United Kingdom',
    regulation_framework: 'UK_Environment_Act',
    required_documents: ['Due diligence statement','Risk assessment report','Supply chain mapping','Farmer ID verification'],
    geo_verification_level: 'polygon',
    min_traceability_depth: 2,
  },
  US_FSMA: {
    name: 'US FSMA 204 Compliance',
    destination_market: 'United States',
    regulation_framework: 'FSMA_204',
    required_documents: ['Key Data Elements (KDE) records','Critical Tracking Events (CTE) log','Lot traceability records','Food safety plan'],
    geo_verification_level: 'basic',
    min_traceability_depth: 1,
  },
  US_LACEY: {
    name: 'US Lacey Act / UFLPA Compliance',
    destination_market: 'United States',
    regulation_framework: 'Lacey_Act_UFLPA',
    required_documents: ['Certificate of Origin','Species / product identification','Import declaration','Forced labor declaration','Country-of-origin documentation'],
    geo_verification_level: 'polygon',
    min_traceability_depth: 3,
  },
  CN: {
    name: 'China Green Trade Compliance',
    destination_market: 'China',
    regulation_framework: 'China_Green_Trade',
    required_documents: ['GACC registration certificate','GB standards compliance certificate','Phytosanitary certificate','Fumigation certificate','Certificate of origin','Lot-level traceability records'],
    geo_verification_level: 'polygon',
    min_traceability_depth: 2,
  },
  UAE: {
    name: 'UAE / Halal Compliance',
    destination_market: 'UAE / Middle East',
    regulation_framework: 'UAE_Halal',
    required_documents: ['Halal certification (accredited body)','ESMA compliance certificate','Certificate of origin','Phytosanitary certificate','Traceability chain documentation'],
    geo_verification_level: 'basic',
    min_traceability_depth: 2,
  },
};

export const CP_ALL_DOCS = [
  'Deforestation-free declaration','GPS polygon boundaries','Land title / ownership proof','Farmer ID verification',
  'Traceability chain documentation','Due diligence statement','Risk assessment report','Supply chain mapping',
  'Key Data Elements (KDE) records','Critical Tracking Events (CTE) log','Lot traceability records','Food safety plan',
  'Certificate of Origin','Species / product identification','Import declaration','Forced labor declaration',
  'Country-of-origin documentation','GACC registration certificate','GB standards compliance certificate',
  'Phytosanitary certificate','Fumigation certificate','Halal certification (accredited body)',
  'ESMA compliance certificate','Lot-level traceability records',
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ComplianceProfilesSection() {
  const [profiles, setCPProfiles] = useState<CPProfile[]>([]);
  const [cpLoading, setCPLoading] = useState(true);
  const [cpDialogOpen, setCPDialogOpen] = useState(false);
  const [cpCreating, setCPCreating] = useState(false);
  const [cpDeleting, setCPDeleting] = useState<string | null>(null);
  const [cpForm, setCPForm] = useState({
    name: '', destination_market: '', regulation_framework: 'EUDR',
    geo_verification_level: 'polygon', min_traceability_depth: 1,
    required_documents: [] as string[],
  });
  const { organization } = useOrg();
  const { toast } = useToast();

  const fetchCPProfiles = async () => {
    try {
      const res = await fetch('/api/compliance-profiles');
      if (res.ok) { const d = await res.json(); setCPProfiles(d.profiles || []); }
    } catch {} finally { setCPLoading(false); }
  };

  useEffect(() => { if (organization) fetchCPProfiles(); }, [organization]);

  const applyTemplate = (key: string) => {
    const t = CP_TEMPLATES[key];
    if (!t) return;
    setCPForm(f => ({
      ...f, name: t.name || '', destination_market: t.destination_market || '',
      regulation_framework: t.regulation_framework,
      geo_verification_level: t.geo_verification_level || 'polygon',
      min_traceability_depth: t.min_traceability_depth || 1,
      required_documents: [...(t.required_documents || [])],
    }));
  };

  const toggleCPDoc = (doc: string) =>
    setCPForm(f => ({
      ...f,
      required_documents: f.required_documents.includes(doc)
        ? f.required_documents.filter(d => d !== doc)
        : [...f.required_documents, doc],
    }));

  const handleCPCreate = async () => {
    if (!cpForm.name || !cpForm.destination_market) {
      toast({ title: 'Missing fields', variant: 'destructive' }); return;
    }
    setCPCreating(true);
    try {
      const res = await fetch('/api/compliance-profiles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast({ title: `Profile "${cpForm.name}" created` });
      setCPDialogOpen(false);
      setCPForm({ name: '', destination_market: '', regulation_framework: 'EUDR', geo_verification_level: 'polygon', min_traceability_depth: 1, required_documents: [] });
      fetchCPProfiles();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setCPCreating(false); }
  };

  const handleCPDelete = async (id: string) => {
    setCPDeleting(id);
    try {
      const res = await fetch(`/api/compliance-profiles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Profile deleted' });
      fetchCPProfiles();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setCPDeleting(null); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />Regulation Profiles
            </CardTitle>
            <CardDescription className="mt-1">
              Market-specific compliance templates — one dataset, five markets unlocked. Each profile defines document requirements and geo-verification standards for that destination.
            </CardDescription>
          </div>
          <Dialog open={cpDialogOpen} onOpenChange={setCPDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-profile">
                <Plus className="h-4 w-4 mr-1" />New Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Compliance Profile</DialogTitle>
                <DialogDescription>Start from a regulatory template or configure from scratch.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Object.entries(CP_TEMPLATES).map(([key, t]) => (
                  <Button key={key} variant="outline" size="sm" className="text-xs h-7" onClick={() => applyTemplate(key)}>
                    {t.name?.split(' ')[0]} {t.regulation_framework?.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
              <div className="space-y-3">
                <div><Label>Profile Name</Label><Input value={cpForm.name} onChange={e => setCPForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. EU EUDR Export Profile" /></div>
                <div><Label>Destination Market</Label><Input value={cpForm.destination_market} onChange={e => setCPForm(f => ({ ...f, destination_market: e.target.value }))} placeholder="e.g. European Union, China" /></div>
                <div>
                  <Label>Regulation Framework</Label>
                  <Select value={cpForm.regulation_framework} onValueChange={v => setCPForm(f => ({ ...f, regulation_framework: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CP_FRAMEWORK_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Geo Verification Level</Label>
                  <Select value={cpForm.geo_verification_level} onValueChange={v => setCPForm(f => ({ ...f, geo_verification_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CP_GEO_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Traceability Depth</Label>
                  <Input type="number" min={1} max={10} value={cpForm.min_traceability_depth} onChange={e => setCPForm(f => ({ ...f, min_traceability_depth: parseInt(e.target.value) || 1 }))} className="w-24" />
                </div>
                <div>
                  <Label>Required Documents</Label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-1.5 mt-1">
                    {CP_ALL_DOCS.map(doc => (
                      <div key={doc} className="flex items-center gap-2">
                        <Checkbox id={`cpdoc-${doc}`} checked={cpForm.required_documents.includes(doc)} onCheckedChange={() => toggleCPDoc(doc)} />
                        <label htmlFor={`cpdoc-${doc}`} className="text-xs cursor-pointer">{doc}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setCPDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCPCreate} disabled={cpCreating}>
                  {cpCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Profile
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {cpLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-sm">No regulation profiles yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Create profiles for EU, UK, US, China, and UAE markets</p>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.keys(CP_TEMPLATES).map(key => (
                <Button key={key} variant="outline" size="sm" className="text-xs" onClick={() => { applyTemplate(key); setCPDialogOpen(true); }}>
                  + {CP_TEMPLATES[key].name?.split(' ').slice(0, 2).join(' ')}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map(p => (
              <div key={p.id} className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />{p.destination_market}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Delete compliance profile"
                    onClick={() => handleCPDelete(p.id)}
                    disabled={cpDeleting === p.id}
                  >
                    {cpDeleting === p.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <Badge variant="outline" className="text-xs">
                  {CP_FRAMEWORK_LABELS[p.regulation_framework] || p.regulation_framework}
                </Badge>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.required_documents?.length || 0} docs</span>
                  <span>{CP_GEO_LABELS[p.geo_verification_level] || p.geo_verification_level}</span>
                  <span>depth {p.min_traceability_depth}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
