'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, ShieldCheck, FileText, MapPin, Layers, Pencil, Trash2, Send } from 'lucide-react';
import { COMPLIANCE_TEMPLATES, TEMPLATE_ORDER, type TemplateKey } from '@/lib/compliance-templates';

interface SupplyChainLink {
  id: string;
  status: string;
  exporter_org?: { id: string; name: string; slug: string };
}

interface BuyerProfileOverlay {
  schema_version: 1;
  profile_kind: 'buyer_pilot';
  version: string;
  commodity: { name: string; hs_code: string };
  destination: { country_code: string; country: string; port: string };
  is_placeholder: true;
  buyer_approved: false;
  disclaimer: string;
  private_requirement_labels: string[];
}

interface ComplianceTemplateRow {
  id: string;
  name: string;
  destination_market: string;
  regulation_framework: string;
  required_documents: string[];
  min_traceability_depth: number;
  custom_rules: { buyer_profile?: BuyerProfileOverlay } | null;
}

interface ComplianceProfile {
  id: string;
  org_id: string;
  buyer_org_id: string | null;
  source_buyer_template_id: string | null;
  is_own_buyer_profile?: boolean;
  name: string;
  destination_market: string;
  regulation_framework: string;
  required_documents: string[];
  min_traceability_depth: number;
  custom_rules: { buyer_profile?: BuyerProfileOverlay } | null;
}

const emptyOverlay = {
  version: 'v1',
  commodityName: '',
  hsCode: '',
  countryCode: '',
  country: '',
  port: '',
  disclaimer: '',
  privateRequirementLabels: '',
};

export default function BuyerCompliancePage() {
  const { toast } = useToast();

  // Section 1: buyer's own templates, independent of any exporter.
  const [templates, setTemplates] = useState<ComplianceTemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | ''>('');
  const [overlay, setOverlay] = useState(emptyOverlay);
  const [assigningTemplateId, setAssigningTemplateId] = useState<string | null>(null);
  const [assignExporterId, setAssignExporterId] = useState<Record<string, string>>({});

  // Section 2: what's actually materialized for a specific linked exporter.
  const [links, setLinks] = useState<SupplyChainLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [selectedExporterId, setSelectedExporterId] = useState('');
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/buyer/compliance-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/supply-chain-links');
        if (res.ok) {
          const data = await res.json();
          const active = (data.links || []).filter((l: SupplyChainLink) => l.status === 'active');
          setLinks(active);
          if (active.length > 0) setSelectedExporterId(active[0].exporter_org?.id || '');
        }
      } finally {
        setLinksLoading(false);
      }
    })();
  }, []);

  const fetchProfiles = useCallback(async (exporterOrgId: string) => {
    if (!exporterOrgId) { setProfiles([]); return; }
    setProfilesLoading(true);
    try {
      const res = await fetch(`/api/compliance-profiles?exporter_org_id=${exporterOrgId}`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
      } else {
        setProfiles([]);
      }
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(selectedExporterId); }, [selectedExporterId, fetchProfiles]);

  const openCreateDialog = () => {
    setEditingTemplateId(null);
    setSelectedTemplate('');
    setOverlay(emptyOverlay);
    setDialogOpen(true);
  };

  const openEditDialog = (t: ComplianceTemplateRow) => {
    const bp = t.custom_rules?.buyer_profile;
    setEditingTemplateId(t.id);
    setSelectedTemplate('');
    setOverlay({
      version: bp?.version || 'v1',
      commodityName: bp?.commodity.name || '',
      hsCode: bp?.commodity.hs_code || '',
      countryCode: bp?.destination.country_code || '',
      country: bp?.destination.country || '',
      port: bp?.destination.port || '',
      disclaimer: bp?.disclaimer || '',
      privateRequirementLabels: (bp?.private_requirement_labels || []).join(', '),
    });
    setDialogOpen(true);
  };

  const buildOverlayPayload = () => ({
    buyer_profile: {
      schema_version: 1,
      profile_kind: 'buyer_pilot',
      version: overlay.version,
      commodity: { name: overlay.commodityName, hs_code: overlay.hsCode },
      destination: { country_code: overlay.countryCode.toUpperCase(), country: overlay.country, port: overlay.port },
      is_placeholder: true,
      buyer_approved: false,
      disclaimer: overlay.disclaimer,
      private_requirement_labels: overlay.privateRequirementLabels
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    },
  });

  const handleSave = async () => {
    if (!overlay.commodityName || !overlay.hsCode || !overlay.countryCode || !overlay.country || !overlay.port || !overlay.disclaimer) {
      toast({ title: 'Missing fields', description: 'Commodity, HS code, destination, and a disclaimer are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingTemplateId) {
        const res = await fetch(`/api/buyer/compliance-templates/${editingTemplateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ custom_rules: buildOverlayPayload() }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update template');
        toast({ title: 'Template updated', description: 'Any exporter this is assigned to now has the update too.' });
      } else {
        if (!selectedTemplate) {
          toast({ title: 'Pick a regulation', description: 'Choose which market framework this template is for.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const res = await fetch('/api/buyer/compliance-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: selectedTemplate, custom_rules: buildOverlayPayload() }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create template');
        toast({ title: 'Compliance template created' });
      }
      setDialogOpen(false);
      fetchTemplates();
      if (selectedExporterId) fetchProfiles(selectedExporterId);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/buyer/compliance-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      toast({ title: 'Template deleted' });
      fetchTemplates();
    } catch (error: unknown) {
      toast({ title: 'Cannot delete', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleAssign = async (templateId: string) => {
    const exporterOrgId = assignExporterId[templateId];
    if (!exporterOrgId) {
      toast({ title: 'Pick an exporter', variant: 'destructive' });
      return;
    }
    setAssigningTemplateId(templateId);
    try {
      const res = await fetch(`/api/buyer/compliance-templates/${templateId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exporter_org_id: exporterOrgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign');
      const exporterName = links.find((l) => l.exporter_org?.id === exporterOrgId)?.exporter_org?.name || 'the exporter';
      toast({
        title: data.already_assigned ? 'Already assigned' : 'Assigned',
        description: data.already_assigned
          ? `${exporterName} already has this template.`
          : `${exporterName} now has this compliance profile.`,
      });
      if (selectedExporterId === exporterOrgId) fetchProfiles(exporterOrgId);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    } finally {
      setAssigningTemplateId(null);
    }
  };

  const selectedExporterName = links.find((l) => l.exporter_org?.id === selectedExporterId)?.exporter_org?.name;

  return (
    <div className="flex-1 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Compliance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your compliance requirements once, then assign them to any exporter you connect with
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-medium">Your Compliance Templates</h2>
            <p className="text-sm text-muted-foreground">
              Built once, ahead of any exporter — assign to a linked exporter whenever you're ready.
            </p>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-new-compliance-template">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {templatesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No compliance templates yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Set up a template from one of the standard market regulations — you don&apos;t need a linked exporter to do this.
              </p>
              <Button onClick={openCreateDialog} data-testid="button-create-first-compliance-template">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => {
              const bp = t.custom_rules?.buyer_profile;
              return (
                <Card key={t.id} data-testid={`card-compliance-template-${t.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{t.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />{t.destination_market}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(t)} data-testid={`button-edit-template-${t.id}`} aria-label="Edit your requirements">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTemplate(t.id)} data-testid={`button-delete-template-${t.id}`} aria-label="Delete template">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Badge variant="outline" className="w-fit">{t.regulation_framework}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{t.required_documents?.length || 0} required docs</span>
                      <span className="flex items-center gap-1"><Layers className="h-3 w-3" />depth {t.min_traceability_depth}</span>
                    </div>
                    {bp && (
                      <div className="rounded-md bg-muted/40 p-2.5 text-xs space-y-1">
                        <p><span className="text-muted-foreground">Your commodity: </span>{bp.commodity.name} (HS {bp.commodity.hs_code})</p>
                        <p><span className="text-muted-foreground">Destination: </span>{bp.destination.country} — {bp.destination.port}</p>
                        {bp.private_requirement_labels.length > 0 && (
                          <p><span className="text-muted-foreground">Extra requirements: </span>{bp.private_requirement_labels.join(', ')}</p>
                        )}
                      </div>
                    )}
                    {links.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <Select
                          value={assignExporterId[t.id] || ''}
                          onValueChange={(v) => setAssignExporterId((m) => ({ ...m, [t.id]: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs" data-testid={`select-assign-exporter-${t.id}`}>
                            <SelectValue placeholder="Assign to exporter..." />
                          </SelectTrigger>
                          <SelectContent>
                            {links.map((l) => (
                              <SelectItem key={l.exporter_org?.id || l.id} value={l.exporter_org?.id || ''}>
                                {l.exporter_org?.name || 'Unknown'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0"
                          disabled={assigningTemplateId === t.id || !assignExporterId[t.id]}
                          onClick={() => handleAssign(t.id)}
                          data-testid={`button-assign-template-${t.id}`}
                        >
                          {assigningTemplateId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4 border-t pt-6">
        <div>
          <h2 className="text-lg font-medium">Assigned to Exporter</h2>
          <p className="text-sm text-muted-foreground">What a linked exporter has received, including their own baseline profiles.</p>
        </div>

        {linksLoading ? (
          <div className="h-10 w-72 bg-muted animate-pulse rounded" />
        ) : links.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No linked exporters yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Invite and connect with a supplier first, then assign a template to them here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2 min-w-[240px] max-w-xs">
              <Label>Exporter</Label>
              <Select value={selectedExporterId} onValueChange={setSelectedExporterId}>
                <SelectTrigger data-testid="select-compliance-exporter">
                  <SelectValue placeholder="Select exporter" />
                </SelectTrigger>
                <SelectContent>
                  {links.map((l) => (
                    <SelectItem key={l.exporter_org?.id || l.id} value={l.exporter_org?.id || ''}>
                      {l.exporter_org?.name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {profilesLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : profiles.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">Nothing assigned to {selectedExporterName || 'this exporter'} yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Assign one of your templates above, or wait for {selectedExporterName || 'the exporter'} to set up their own baseline.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {profiles.map((p) => {
                  const bp = p.custom_rules?.buyer_profile;
                  const sourceTemplate = templates.find((t) => t.id === p.source_buyer_template_id);
                  return (
                    <Card key={p.id} data-testid={`card-compliance-profile-${p.id}`}>
                      <CardHeader className="pb-3">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{p.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />{p.destination_market}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline">{p.regulation_framework}</Badge>
                          {p.is_own_buyer_profile ? (
                            <Badge variant="secondary">
                              {sourceTemplate ? `Assigned from ${sourceTemplate.name}` : 'Set up by you'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Exporter baseline</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{p.required_documents?.length || 0} required docs</span>
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3" />depth {p.min_traceability_depth}</span>
                        </div>
                        {bp && (
                          <div className="rounded-md bg-muted/40 p-2.5 text-xs space-y-1">
                            <p><span className="text-muted-foreground">Commodity: </span>{bp.commodity.name} (HS {bp.commodity.hs_code})</p>
                            <p><span className="text-muted-foreground">Destination: </span>{bp.destination.country} — {bp.destination.port}</p>
                            {bp.private_requirement_labels.length > 0 && (
                              <p><span className="text-muted-foreground">Extra requirements: </span>{bp.private_requirement_labels.join(', ')}</p>
                            )}
                          </div>
                        )}
                        {p.is_own_buyer_profile && (
                          <p className="text-xs text-muted-foreground pt-1">
                            Edit this in Your Compliance Templates above — changes sync here automatically.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplateId ? 'Edit Your Requirements' : 'New Compliance Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplateId
                ? 'The regulatory baseline is fixed — you can update your own commodity, destination, and extra requirements.'
                : 'Pick a market regulation, then add your own requirements on top. Assign it to an exporter whenever you\'re ready.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingTemplateId && (
              <div className="space-y-2">
                <Label>Regulation</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TEMPLATE_ORDER.map((key) => {
                    const tpl = COMPLIANCE_TEMPLATES[key];
                    return (
                      <Button
                        key={key}
                        type="button"
                        variant={selectedTemplate === key ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-auto py-2 justify-start"
                        onClick={() => setSelectedTemplate(key)}
                        data-testid={`button-template-${key}`}
                      >
                        {tpl.market_name}
                      </Button>
                    );
                  })}
                </div>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground">
                    Baseline requires {COMPLIANCE_TEMPLATES[selectedTemplate].docs.filter((d) => d.required).length} documents,{' '}
                    {COMPLIANCE_TEMPLATES[selectedTemplate].geo_verification_level} geo-verification, traceability depth{' '}
                    {COMPLIANCE_TEMPLATES[selectedTemplate].min_traceability_depth}. This baseline can&apos;t be changed here.
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="commodity-name">Your Commodity</Label>
                <Input id="commodity-name" placeholder="e.g. Cocoa beans" value={overlay.commodityName} onChange={(e) => setOverlay((o) => ({ ...o, commodityName: e.target.value }))} data-testid="input-overlay-commodity" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hs-code">HS Code</Label>
                <Input id="hs-code" placeholder="e.g. 1801" value={overlay.hsCode} onChange={(e) => setOverlay((o) => ({ ...o, hsCode: e.target.value }))} data-testid="input-overlay-hs-code" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="country-code">Country Code</Label>
                <Input id="country-code" placeholder="NL" maxLength={2} value={overlay.countryCode} onChange={(e) => setOverlay((o) => ({ ...o, countryCode: e.target.value }))} data-testid="input-overlay-country-code" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="country">Destination Country</Label>
                <Input id="country" placeholder="Netherlands" value={overlay.country} onChange={(e) => setOverlay((o) => ({ ...o, country: e.target.value }))} data-testid="input-overlay-country" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Destination Port</Label>
              <Input id="port" placeholder="Port of Rotterdam" value={overlay.port} onChange={(e) => setOverlay((o) => ({ ...o, port: e.target.value }))} data-testid="input-overlay-port" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Version Label</Label>
              <Input id="version" placeholder="v1" value={overlay.version} onChange={(e) => setOverlay((o) => ({ ...o, version: e.target.value }))} data-testid="input-overlay-version" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="private-reqs">Additional Requirements (comma-separated)</Label>
              <Input id="private-reqs" placeholder="e.g. Rainforest Alliance Certificate" value={overlay.privateRequirementLabels} onChange={(e) => setOverlay((o) => ({ ...o, privateRequirementLabels: e.target.value }))} data-testid="input-overlay-requirements" />
              <p className="text-xs text-muted-foreground">Adds to the baseline&apos;s required documents — it doesn&apos;t replace them.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disclaimer">Notes / Disclaimer</Label>
              <Textarea id="disclaimer" placeholder="Context for the exporter about this profile..." value={overlay.disclaimer} onChange={(e) => setOverlay((o) => ({ ...o, disclaimer: e.target.value }))} data-testid="input-overlay-disclaimer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-compliance-template">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-compliance-template">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplateId ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
