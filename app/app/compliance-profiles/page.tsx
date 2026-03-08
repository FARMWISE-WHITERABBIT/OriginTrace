'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import {
  Loader2,
  Plus,
  Shield,
  FileText,
  MapPin,
  Globe,
  TreePine,
  Utensils,
  Landmark,
  Scale,
  Users,
} from 'lucide-react';

interface ComplianceProfile {
  id: string;
  name: string;
  destination_market: string;
  regulation_framework: string;
  required_documents: string[];
  required_certifications: string[];
  geo_verification_level: string;
  min_traceability_depth: number;
  is_default: boolean;
  created_at: string;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  EUDR: 'EU Deforestation Regulation',
  FSMA_204: 'FSMA Rule 204',
  UK_Environment_Act: 'UK Environment Act',
  Lacey_Act_UFLPA: 'Lacey Act / UFLPA',
  custom: 'Buyer Standards',
};

const FRAMEWORK_DESCRIPTIONS: Record<string, string> = {
  EUDR: 'GPS polygon verification, deforestation-free compliance, DDS submission, satellite cross-check',
  FSMA_204: 'KDE completeness, CTE verification, lot-level traceability, supplier KYC, food safety certifications',
  UK_Environment_Act: 'Due diligence assessment, risk scoring, polygon geo-verification, legality verification, country risk',
  Lacey_Act_UFLPA: 'Supply chain transparency, country-of-origin docs, forced labor risk, species ID, import declarations',
  custom: 'Profile-driven rules — required docs, custom geo level, traceability depth, buyer certifications, ESG metrics',
};

const FRAMEWORK_ICONS: Record<string, typeof TreePine> = {
  EUDR: TreePine,
  FSMA_204: Utensils,
  UK_Environment_Act: Landmark,
  Lacey_Act_UFLPA: Scale,
  custom: Users,
};

const FRAMEWORK_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  EUDR: 'default',
  FSMA_204: 'secondary',
  UK_Environment_Act: 'outline',
  Lacey_Act_UFLPA: 'default',
  custom: 'outline',
};

const GEO_LABELS: Record<string, string> = {
  basic: 'Basic GPS',
  polygon: 'Polygon Boundaries',
  satellite: 'Satellite Verification',
};

const DEFAULT_DOCUMENTS = [
  'Deforestation-free declaration',
  'GPS polygon boundaries',
  'Land title / ownership proof',
  'Farmer ID verification',
  'Traceability chain documentation',
  'Due diligence statement',
  'Risk assessment report',
  'Supply chain mapping',
  'Key Data Elements (KDE) records',
  'Critical Tracking Events (CTE) log',
  'Lot traceability records',
  'Food safety plan',
  'Certificate of Origin',
  'Species / product identification',
  'Import declaration',
  'Forced labor declaration',
  'Country-of-origin documentation',
];

const TEMPLATES: Record<string, {
  name: string;
  destination_market: string;
  regulation_framework: string;
  required_documents: string[];
  geo_verification_level: string;
  min_traceability_depth: number;
}> = {
  EU: {
    name: 'EU EUDR Compliance',
    destination_market: 'European Union',
    regulation_framework: 'EUDR',
    required_documents: [
      'Deforestation-free declaration',
      'GPS polygon boundaries',
      'Land title / ownership proof',
      'Farmer ID verification',
      'Traceability chain documentation',
      'Due diligence statement',
    ],
    geo_verification_level: 'satellite',
    min_traceability_depth: 3,
  },
  UK: {
    name: 'UK Environment Act Compliance',
    destination_market: 'United Kingdom',
    regulation_framework: 'UK_Environment_Act',
    required_documents: [
      'Due diligence statement',
      'Risk assessment report',
      'Supply chain mapping',
      'Farmer ID verification',
      'Land title / ownership proof',
    ],
    geo_verification_level: 'polygon',
    min_traceability_depth: 2,
  },
  US: {
    name: 'US FSMA 204 Compliance',
    destination_market: 'United States',
    regulation_framework: 'FSMA_204',
    required_documents: [
      'Key Data Elements (KDE) records',
      'Critical Tracking Events (CTE) log',
      'Lot traceability records',
      'Food safety plan',
    ],
    geo_verification_level: 'basic',
    min_traceability_depth: 1,
  },
  LACEY_UFLPA: {
    name: 'US Lacey Act / UFLPA Compliance',
    destination_market: 'United States',
    regulation_framework: 'Lacey_Act_UFLPA',
    required_documents: [
      'Certificate of Origin',
      'Species / product identification',
      'Import declaration',
      'Forced labor declaration',
      'Supply chain mapping',
      'Country-of-origin documentation',
    ],
    geo_verification_level: 'polygon',
    min_traceability_depth: 3,
  },
};

interface FormState {
  name: string;
  destination_market: string;
  regulation_framework: string;
  geo_verification_level: string;
  min_traceability_depth: number;
  required_documents: string[];
}

const emptyForm: FormState = {
  name: '',
  destination_market: '',
  regulation_framework: 'EUDR',
  geo_verification_level: 'polygon',
  min_traceability_depth: 1,
  required_documents: [],
};

export default function ComplianceProfilesPage() {
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const fetchProfiles = async () => {
    if (orgLoading) return;
    if (!organization) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/compliance-profiles');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error('Failed to fetch compliance profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [organization, orgLoading]);

  const applyTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setForm({
      name: t.name,
      destination_market: t.destination_market,
      regulation_framework: t.regulation_framework,
      geo_verification_level: t.geo_verification_level,
      min_traceability_depth: t.min_traceability_depth,
      required_documents: [...t.required_documents],
    });
  };

  const toggleDocument = (doc: string) => {
    setForm(prev => ({
      ...prev,
      required_documents: prev.required_documents.includes(doc)
        ? prev.required_documents.filter(d => d !== doc)
        : [...prev.required_documents, doc],
    }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.destination_market) {
      toast({ title: 'Missing fields', description: 'Name and destination market are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch('/api/compliance-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create profile');
      }
      toast({ title: 'Profile created', description: `${form.name} has been created.` });
      setDialogOpen(false);
      setForm({ ...emptyForm });
      fetchProfiles();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <TierGate feature="compliance_profiles" requiredTier="pro" featureLabel="Compliance Profiles">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
              Compliance Profiles
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure compliance requirements for different destination markets and regulations
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-profile">
                <Plus className="h-4 w-4 mr-2" />
                New Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Compliance Profile</DialogTitle>
                <DialogDescription>
                  Define compliance requirements for a destination market, or start from a template.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('EU')}
                  data-testid="button-template-eu"
                >
                  <TreePine className="h-3 w-3 mr-1" />
                  EU EUDR Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('UK')}
                  data-testid="button-template-uk"
                >
                  <Landmark className="h-3 w-3 mr-1" />
                  UK Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('US')}
                  data-testid="button-template-us"
                >
                  <Utensils className="h-3 w-3 mr-1" />
                  US FSMA Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('LACEY_UFLPA')}
                  data-testid="button-template-lacey"
                >
                  <Scale className="h-3 w-3 mr-1" />
                  Lacey / UFLPA Template
                </Button>
              </div>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="cp-name">Profile Name</Label>
                  <Input
                    id="cp-name"
                    placeholder="e.g. EU EUDR Compliance"
                    value={form.name}
                    onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                    data-testid="input-profile-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-market">Destination Market</Label>
                  <Input
                    id="cp-market"
                    placeholder="e.g. European Union"
                    value={form.destination_market}
                    onChange={e => setForm(s => ({ ...s, destination_market: e.target.value }))}
                    data-testid="input-destination-market"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regulation Framework</Label>
                  <Select
                    value={form.regulation_framework}
                    onValueChange={v => setForm(s => ({ ...s, regulation_framework: v }))}
                  >
                    <SelectTrigger data-testid="select-regulation-framework">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUDR">EUDR</SelectItem>
                      <SelectItem value="FSMA_204">FSMA 204</SelectItem>
                      <SelectItem value="UK_Environment_Act">UK Environment Act</SelectItem>
                      <SelectItem value="Lacey_Act_UFLPA">Lacey Act / UFLPA</SelectItem>
                      <SelectItem value="custom">Buyer Standards (Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Geo Verification Level</Label>
                  <Select
                    value={form.geo_verification_level}
                    onValueChange={v => setForm(s => ({ ...s, geo_verification_level: v }))}
                  >
                    <SelectTrigger data-testid="select-geo-verification">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic GPS</SelectItem>
                      <SelectItem value="polygon">Polygon Boundaries</SelectItem>
                      <SelectItem value="satellite">Satellite Verification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-depth">Min Traceability Depth</Label>
                  <Input
                    id="cp-depth"
                    type="number"
                    min={1}
                    max={10}
                    value={form.min_traceability_depth}
                    onChange={e => setForm(s => ({ ...s, min_traceability_depth: parseInt(e.target.value) || 1 }))}
                    data-testid="input-traceability-depth"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Required Documents</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {DEFAULT_DOCUMENTS.map(doc => (
                      <div key={doc} className="flex items-center gap-2">
                        <Checkbox
                          id={`doc-${doc}`}
                          checked={form.required_documents.includes(doc)}
                          onCheckedChange={() => toggleDocument(doc)}
                          data-testid={`checkbox-doc-${doc.replace(/\s+/g, '-').toLowerCase()}`}
                        />
                        <label
                          htmlFor={`doc-${doc}`}
                          className="text-sm cursor-pointer"
                        >
                          {doc}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-create">
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Profile
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading || orgLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No compliance profiles yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Create your first compliance profile to define document requirements and verification levels for destination markets.
              </p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-profile">
                <Plus className="h-4 w-4 mr-2" />
                Create First Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map(profile => (
              <Card key={profile.id} data-testid={`card-profile-${profile.id}`}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate" data-testid={`text-profile-name-${profile.id}`}>
                        {profile.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span data-testid={`text-market-${profile.id}`}>{profile.destination_market}</span>
                      </div>
                    </div>
                    {profile.is_default && (
                      <Badge variant="secondary" data-testid={`badge-default-${profile.id}`}>Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const FrameworkIcon = FRAMEWORK_ICONS[profile.regulation_framework] || Shield;
                      return (
                        <Badge
                          variant={FRAMEWORK_VARIANTS[profile.regulation_framework] || 'outline'}
                          data-testid={`badge-framework-${profile.id}`}
                        >
                          <FrameworkIcon className="h-3 w-3 mr-1" />
                          {FRAMEWORK_LABELS[profile.regulation_framework] || profile.regulation_framework}
                        </Badge>
                      );
                    })()}
                  </div>
                  {FRAMEWORK_DESCRIPTIONS[profile.regulation_framework] && (
                    <p className="text-xs text-muted-foreground" data-testid={`text-framework-desc-${profile.id}`}>
                      {FRAMEWORK_DESCRIPTIONS[profile.regulation_framework]}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span data-testid={`text-doc-count-${profile.id}`}>
                        {Array.isArray(profile.required_documents) ? profile.required_documents.length : 0} docs
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{GEO_LABELS[profile.geo_verification_level] || profile.geo_verification_level}</span>
                    </div>
                    <span>Depth: {profile.min_traceability_depth}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TierGate>
  );
}
