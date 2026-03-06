'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Settings, Save, Building2, AlertTriangle, Shield,
  Check, X, Layers, ToggleLeft, Crown, Rocket, Briefcase, Zap
} from 'lucide-react';
import {
  TIER_TAGLINES, TIER_DESCRIPTIONS, FEATURE_LABELS as GATED_FEATURE_LABELS,
  getTierNewFeatures, type TierFeature, type SubscriptionTier
} from '@/lib/config/tier-gating';

interface FeatureFlags {
  satellite_overlays: boolean;
  advanced_mapping: boolean;
  financing: boolean;
  api_access: boolean;
}

interface TierTemplate {
  features: FeatureFlags;
  agent_seat_limit: number;
  monthly_collection_limit: number;
}

type TierTemplates = Record<string, TierTemplate>;

interface Organization {
  id: number;
  name: string;
  subscription_tier: string;
  feature_flags: FeatureFlags;
  agent_seat_limit: number;
  monthly_collection_limit: number;
}

const ADDON_LABELS: Record<keyof FeatureFlags, string> = {
  satellite_overlays: 'Satellite',
  advanced_mapping: 'Advanced Mapping',
  financing: 'Financing',
  api_access: 'API Access'
};

const ADDON_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  satellite_overlays: 'Satellite imagery overlays for farm verification',
  advanced_mapping: 'Enhanced GPS mapping with polygon editing tools',
  financing: 'Farmer performance analytics for finance partners',
  api_access: 'REST API access for third-party integrations (ERP, customs)'
};

const TIER_ORDER = ['starter', 'basic', 'pro', 'enterprise'] as const;
const TIER_LABEL_MAP: Record<string, string> = {
  starter: 'Starter',
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise'
};

const TIER_ICONS: Record<string, typeof Zap> = {
  starter: Rocket,
  basic: Briefcase,
  pro: Zap,
  enterprise: Crown,
};

const ADDON_KEYS: (keyof FeatureFlags)[] = ['satellite_overlays', 'advanced_mapping', 'financing', 'api_access'];

export default function FeatureTogglesPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [tierTemplates, setTierTemplates] = useState<TierTemplates | null>(null);
  const [editedTemplates, setEditedTemplates] = useState<TierTemplates | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedFlags, setEditedFlags] = useState<FeatureFlags | null>(null);
  const [editedSeats, setEditedSeats] = useState<number>(5);
  const [editedCollections, setEditedCollections] = useState<number>(1000);
  const [editedTier, setEditedTier] = useState<string>('starter');
  const [templatesDirty, setTemplatesDirty] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [orgsRes, templatesRes] = await Promise.all([
        fetch('/api/feature-toggles'),
        fetch('/api/tier-templates')
      ]);

      if (orgsRes.status === 401) { setError('unauthorized'); return; }
      if (orgsRes.status === 403) { setError('forbidden'); return; }

      if (orgsRes.ok) {
        const data = await orgsRes.json();
        setOrganizations(data.organizations || []);
      } else {
        setError('error');
        return;
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTierTemplates(data.templates);
        setEditedTemplates(JSON.parse(JSON.stringify(data.templates)));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleTemplateFeature = (tier: string, feature: keyof FeatureFlags) => {
    if (!editedTemplates) return;
    const updated = { ...editedTemplates };
    updated[tier] = {
      ...updated[tier],
      features: {
        ...updated[tier].features,
        [feature]: !updated[tier].features[feature]
      }
    };
    setEditedTemplates(updated);
    setTemplatesDirty(true);
  };

  const updateTemplateLimit = (tier: string, field: 'agent_seat_limit' | 'monthly_collection_limit', value: string) => {
    if (!editedTemplates) return;
    const updated = { ...editedTemplates };
    updated[tier] = {
      ...updated[tier],
      [field]: value === '' ? -1 : parseInt(value) || 0
    };
    setEditedTemplates(updated);
    setTemplatesDirty(true);
  };

  const saveTemplates = async () => {
    if (!editedTemplates) return;
    setIsSavingTemplates(true);
    try {
      const response = await fetch('/api/tier-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: editedTemplates })
      });
      if (response.ok) {
        setTierTemplates(JSON.parse(JSON.stringify(editedTemplates)));
        setTemplatesDirty(false);
        toast({ title: 'Tier Templates Saved', description: 'Tier default configurations have been updated.' });
      } else {
        throw new Error('Failed to save');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save tier templates.', variant: 'destructive' });
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const openOrgSettings = (org: Organization) => {
    setSelectedOrg(org);
    setEditedFlags(org.feature_flags || { satellite_overlays: false, advanced_mapping: false, financing: false, api_access: false });
    setEditedSeats(org.agent_seat_limit || 5);
    setEditedCollections(org.monthly_collection_limit || 1000);
    setEditedTier(org.subscription_tier || 'starter');
  };

  const handleTierChange = (tier: string) => {
    setEditedTier(tier);
    if (editedTemplates && editedTemplates[tier]) {
      const t = editedTemplates[tier];
      setEditedFlags({ ...t.features });
      setEditedSeats(t.agent_seat_limit);
      setEditedCollections(t.monthly_collection_limit);
    }
  };

  const toggleFeature = (feature: keyof FeatureFlags) => {
    if (editedFlags) {
      setEditedFlags({ ...editedFlags, [feature]: !editedFlags[feature] });
    }
  };

  const quickToggleOrgFeature = async (org: Organization, feature: keyof FeatureFlags) => {
    const newFlags = {
      ...(org.feature_flags || { satellite_overlays: false, advanced_mapping: false, financing: false, api_access: false }),
      [feature]: !(org.feature_flags?.[feature] ?? false)
    };
    try {
      const response = await fetch('/api/feature-toggles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, feature_flags: newFlags })
      });
      if (response.ok) {
        setOrganizations(prev => prev.map(o =>
          o.id === org.id ? { ...o, feature_flags: newFlags } : o
        ));
        toast({ title: 'Updated', description: `${ADDON_LABELS[feature]} ${newFlags[feature] ? 'enabled' : 'disabled'} for ${org.name}` });
      } else {
        throw new Error('Failed');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update feature.', variant: 'destructive' });
    }
  };

  const saveOrgChanges = async () => {
    if (!selectedOrg) return;
    setIsSavingOrg(true);
    try {
      const response = await fetch('/api/feature-toggles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: selectedOrg.id,
          subscription_tier: editedTier,
          feature_flags: editedFlags,
          agent_seat_limit: editedSeats,
          monthly_collection_limit: editedCollections
        })
      });
      if (response.ok) {
        toast({ title: 'Settings Updated', description: `${selectedOrg.name} has been updated.` });
        fetchData();
        setSelectedOrg(null);
      } else {
        throw new Error('Failed to update');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update organization settings.', variant: 'destructive' });
    } finally {
      setIsSavingOrg(false);
    }
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      pro: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      basic: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      starter: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    };
    return (
      <Badge className={`capitalize ${colors[tier] || colors.starter}`}>
        {TIER_LABEL_MAP[tier] || tier}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error === 'unauthorized') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>You must be logged in to access feature toggles.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error === 'forbidden') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Feature toggles are only accessible to system administrators.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error === 'error') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>Failed to load data. Please try refreshing the page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Feature Toggles</h1>
        <p className="text-muted-foreground">Manage tiers, add-on capabilities, and scale limits per organization</p>
      </div>

      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations" data-testid="tab-organizations">
            <ToggleLeft className="h-4 w-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="tier-templates" data-testid="tab-tier-templates">
            <Layers className="h-4 w-4 mr-2" />
            Tier Templates
          </TabsTrigger>
          <TabsTrigger value="tier-overview" data-testid="tab-tier-overview">
            <Crown className="h-4 w-4 mr-2" />
            Tier Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Controls</CardTitle>
              <CardDescription>Toggle add-on capabilities directly or click settings for full configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-center">Satellite</TableHead>
                      <TableHead className="text-center">Adv. Mapping</TableHead>
                      <TableHead className="text-center">Financing</TableHead>
                      <TableHead className="text-center">API Access</TableHead>
                      <TableHead className="text-right">Agent Seats</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No organizations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      organizations.map((org) => (
                        <TableRow key={org.id} data-testid={`org-row-${org.id}`}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>{getTierBadge(org.subscription_tier)}</TableCell>
                          {ADDON_KEYS.map((feature) => (
                            <TableCell key={feature} className="text-center">
                              <Switch
                                checked={org.feature_flags?.[feature] ?? false}
                                onCheckedChange={() => quickToggleOrgFeature(org, feature)}
                                data-testid={`switch-${org.id}-${feature}`}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            {org.agent_seat_limit === -1 ? 'Unlimited' : org.agent_seat_limit}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openOrgSettings(org)}
                              data-testid={`button-configure-${org.id}`}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tier-templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Tier Template Configuration</CardTitle>
                <CardDescription>
                  Define the default add-on capabilities and limits for each tier. When an organization is assigned a tier, these defaults are applied.
                </CardDescription>
              </div>
              <Button
                onClick={saveTemplates}
                disabled={isSavingTemplates || !templatesDirty}
                data-testid="button-save-templates"
              >
                {isSavingTemplates ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Templates
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {editedTemplates && (
                <>
                  <div>
                    <Label className="text-base font-medium mb-3 block">Add-On Capabilities per Tier</Label>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[180px]">Capability</TableHead>
                            {TIER_ORDER.map((tier) => (
                              <TableHead key={tier} className="text-center min-w-[100px]">
                                {getTierBadge(tier)}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ADDON_KEYS.map((feature) => (
                            <TableRow key={feature}>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{ADDON_LABELS[feature]}</span>
                                  <p className="text-xs text-muted-foreground mt-0.5">{ADDON_DESCRIPTIONS[feature]}</p>
                                </div>
                              </TableCell>
                              {TIER_ORDER.map((tier) => (
                                <TableCell key={tier} className="text-center">
                                  <Switch
                                    checked={editedTemplates[tier]?.features?.[feature] ?? false}
                                    onCheckedChange={() => toggleTemplateFeature(tier, feature)}
                                    data-testid={`template-switch-${tier}-${feature}`}
                                  />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-3 block">Scale Limits per Tier</Label>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[180px]">Limit</TableHead>
                            {TIER_ORDER.map((tier) => (
                              <TableHead key={tier} className="text-center min-w-[100px]">
                                {getTierBadge(tier)}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>
                              <div>
                                <span className="font-medium">Agent Seats</span>
                                <p className="text-xs text-muted-foreground mt-0.5">Max field agents (empty for unlimited)</p>
                              </div>
                            </TableCell>
                            {TIER_ORDER.map((tier) => (
                              <TableCell key={tier} className="text-center">
                                <Input
                                  type="number"
                                  className="w-20 mx-auto text-center"
                                  value={editedTemplates[tier]?.agent_seat_limit === -1 ? '' : editedTemplates[tier]?.agent_seat_limit}
                                  onChange={(e) => updateTemplateLimit(tier, 'agent_seat_limit', e.target.value)}
                                  placeholder="--"
                                  data-testid={`template-seats-${tier}`}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <div>
                                <span className="font-medium">Monthly Collections</span>
                                <p className="text-xs text-muted-foreground mt-0.5">Max collections per month (empty for unlimited)</p>
                              </div>
                            </TableCell>
                            {TIER_ORDER.map((tier) => (
                              <TableCell key={tier} className="text-center">
                                <Input
                                  type="number"
                                  className="w-20 mx-auto text-center"
                                  value={editedTemplates[tier]?.monthly_collection_limit === -1 ? '' : editedTemplates[tier]?.monthly_collection_limit}
                                  onChange={(e) => updateTemplateLimit(tier, 'monthly_collection_limit', e.target.value)}
                                  placeholder="--"
                                  data-testid={`template-collections-${tier}`}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tier-overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {TIER_ORDER.map((tier) => {
              const TierIcon = TIER_ICONS[tier];
              const newFeatures = getTierNewFeatures(tier as SubscriptionTier);
              const tierColors: Record<string, { border: string; iconBg: string; iconText: string }> = {
                starter: { border: 'border-gray-300 dark:border-gray-600', iconBg: 'bg-gray-100 dark:bg-gray-800', iconText: 'text-gray-600 dark:text-gray-400' },
                basic: { border: 'border-teal-300 dark:border-teal-700', iconBg: 'bg-teal-50 dark:bg-teal-900/30', iconText: 'text-teal-600 dark:text-teal-400' },
                pro: { border: 'border-blue-300 dark:border-blue-700', iconBg: 'bg-blue-50 dark:bg-blue-900/30', iconText: 'text-blue-600 dark:text-blue-400' },
                enterprise: { border: 'border-purple-300 dark:border-purple-700', iconBg: 'bg-purple-50 dark:bg-purple-900/30', iconText: 'text-purple-600 dark:text-purple-400' },
              };
              const colors = tierColors[tier];

              return (
                <Card key={tier} className={`${colors.border}`} data-testid={`tier-card-${tier}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${colors.iconBg}`}>
                        <TierIcon className={`h-5 w-5 ${colors.iconText}`} />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {TIER_LABEL_MAP[tier]}
                          <span className="text-sm font-normal text-muted-foreground">
                            &mdash; {TIER_TAGLINES[tier as SubscriptionTier]}
                          </span>
                        </CardTitle>
                      </div>
                    </div>
                    <CardDescription className="mt-2">
                      {TIER_DESCRIPTIONS[tier as SubscriptionTier]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {tier === 'starter' ? 'Core Features' : 'Adds to Previous Tier'}
                        </Label>
                        <ul className="mt-2 space-y-1.5">
                          {newFeatures.map((feature: TierFeature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <Check className={`h-3.5 w-3.5 flex-shrink-0 ${colors.iconText}`} />
                              <span>{GATED_FEATURE_LABELS[feature]}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {tier !== 'enterprise' && (
                        <div className="pt-2 border-t">
                          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Locked</Label>
                          <ul className="mt-2 space-y-1">
                            {getLockedFeatures(tier as SubscriptionTier).slice(0, 4).map((feature: TierFeature) => (
                              <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <X className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{GATED_FEATURE_LABELS[feature]}</span>
                              </li>
                            ))}
                            {getLockedFeatures(tier as SubscriptionTier).length > 4 && (
                              <li className="text-xs text-muted-foreground pl-5">
                                +{getLockedFeatures(tier as SubscriptionTier).length - 4} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>Design principle:</strong> Core traceability (collection, mapping, bag-to-batch tracking) is never gated.
                Tiers scale on volume, compliance depth, and automation. Add-on capabilities (Satellite, Advanced Mapping, Financing, API Access) can be toggled per organization independently.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedOrg?.name}
            </SheetTitle>
            <SheetDescription>Configure subscription tier, add-on capabilities, and scale limits</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Select value={editedTier} onValueChange={handleTierChange}>
                <SelectTrigger data-testid="select-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_ORDER.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {TIER_LABEL_MAP[tier]} &mdash; {TIER_TAGLINES[tier as SubscriptionTier]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing tier resets add-ons and limits to template defaults
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-medium">Add-On Capabilities</Label>
              {editedFlags && ADDON_KEYS.map((feature) => (
                <div key={feature} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{ADDON_LABELS[feature]}</Label>
                    <p className="text-xs text-muted-foreground">{ADDON_DESCRIPTIONS[feature]}</p>
                  </div>
                  <Switch
                    checked={editedFlags[feature]}
                    onCheckedChange={() => toggleFeature(feature)}
                    data-testid={`sheet-switch-${feature}`}
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Agent Seat Limit</Label>
                <Input
                  type="number"
                  value={editedSeats === -1 ? '' : editedSeats}
                  onChange={(e) => setEditedSeats(e.target.value === '' ? -1 : parseInt(e.target.value))}
                  placeholder="Unlimited"
                  data-testid="input-seat-limit"
                />
                <p className="text-xs text-muted-foreground">Empty for unlimited</p>
              </div>
              <div className="space-y-2">
                <Label>Monthly Collection Limit</Label>
                <Input
                  type="number"
                  value={editedCollections === -1 ? '' : editedCollections}
                  onChange={(e) => setEditedCollections(e.target.value === '' ? -1 : parseInt(e.target.value))}
                  placeholder="Unlimited"
                  data-testid="input-collection-limit"
                />
                <p className="text-xs text-muted-foreground">Empty for unlimited</p>
              </div>
            </div>

            <Button
              onClick={saveOrgChanges}
              disabled={isSavingOrg}
              className="w-full"
              data-testid="button-save-org"
            >
              {isSavingOrg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function getLockedFeatures(tier: SubscriptionTier): TierFeature[] {
  const allFeatures: TierFeature[] = [
    'smart_collect', 'farmer_registration', 'farm_mapping', 'sync_dashboard', 'traceability',
    'farm_polygons', 'farmers_list', 'inventory', 'bags', 'yield_alerts', 'agents', 'scan_verify',
    'dispatch', 'compliance_review', 'dds_export', 'processing', 'pedigree', 'boundary_conflicts',
    'delegations', 'resolve', 'data_vault'
  ];
  const accessible = getTierNewFeatures('starter' as SubscriptionTier);
  const hierarchy: SubscriptionTier[] = ['starter', 'basic', 'pro', 'enterprise'];
  const tierIndex = hierarchy.indexOf(tier);
  const accessibleSet = new Set<TierFeature>();
  for (let i = 0; i <= tierIndex; i++) {
    getTierNewFeatures(hierarchy[i]).forEach(f => accessibleSet.add(f));
  }
  return allFeatures.filter(f => !accessibleSet.has(f));
}
