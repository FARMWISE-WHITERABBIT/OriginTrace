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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Settings, Save, Building2, Shield, Check, X, Layers,
  ToggleLeft, Crown, Rocket, Briefcase, Zap, AlertTriangle, RefreshCw
} from 'lucide-react';
import {
  TIER_TAGLINES, TIER_DESCRIPTIONS, FEATURE_LABELS as GATED_FEATURE_LABELS,
  getTierNewFeatures, getTierFeatures, type TierFeature, type SubscriptionTier
} from '@/lib/config/tier-gating';

interface FeatureFlags {
  satellite_overlays: boolean;
  advanced_mapping: boolean;
  financing: boolean;
  api_access: boolean;
  buyer_portal_access: boolean;
  dpp_access: boolean;
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
  advanced_mapping: 'Adv. Mapping',
  financing: 'Financing',
  api_access: 'API Access',
  buyer_portal_access: 'Buyer Portal',
  dpp_access: 'DPP',
};

const ADDON_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  satellite_overlays: 'Satellite imagery overlays for farm verification',
  advanced_mapping: 'Enhanced GPS mapping with polygon editing tools',
  financing: 'Farmer performance analytics for finance partners',
  api_access: 'REST API access for third-party integrations (ERP, customs)',
  buyer_portal_access: 'Allow buyer portal access for this organization',
  dpp_access: 'Digital Product Passport generation',
};

const TIER_ORDER = ['starter', 'basic', 'pro', 'enterprise'] as const;

const TIER_STYLES: Record<string, { badge: string; bg: string; icon: string }> = {
  starter:    { badge: 'bg-slate-700/50 text-slate-300 border-slate-600', bg: 'bg-slate-800/50', icon: 'text-slate-400' },
  basic:      { badge: 'bg-blue-900/50 text-blue-300 border-blue-700',    bg: 'bg-blue-950/30',  icon: 'text-blue-400' },
  pro:        { badge: 'bg-purple-900/50 text-purple-300 border-purple-700', bg: 'bg-purple-950/30', icon: 'text-purple-400' },
  enterprise: { badge: 'bg-amber-900/50 text-amber-300 border-amber-700', bg: 'bg-amber-950/30', icon: 'text-amber-400' },
};

const TIER_ICONS: Record<string, typeof Zap> = {
  starter: Rocket,
  basic: Briefcase,
  pro: Zap,
  enterprise: Crown,
};

const ADDON_KEYS: (keyof FeatureFlags)[] = [
  'satellite_overlays', 'advanced_mapping', 'financing',
  'api_access', 'buyer_portal_access', 'dpp_access',
];

const TIER_LABEL_MAP: Record<string, string> = {
  starter: 'Starter', basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise',
};

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
        fetch('/api/tier-templates'),
      ]);

      if (orgsRes.status === 401) { setError('unauthorized'); return; }
      if (orgsRes.status === 403) { setError('forbidden'); return; }

      if (orgsRes.ok) {
        const data = await orgsRes.json();
        setOrganizations(data.organizations || []);
      } else {
        setError('error'); return;
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTierTemplates(data.templates);
        setEditedTemplates(JSON.parse(JSON.stringify(data.templates)));
      }
    } catch {
      setError('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleTemplateFeature = (tier: string, feature: keyof FeatureFlags) => {
    if (!editedTemplates) return;
    setEditedTemplates(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [tier]: {
          ...prev[tier],
          features: { ...prev[tier].features, [feature]: !prev[tier].features[feature] },
        },
      };
    });
    setTemplatesDirty(true);
  };

  const updateTemplateLimit = (tier: string, field: 'agent_seat_limit' | 'monthly_collection_limit', value: string) => {
    if (!editedTemplates) return;
    setEditedTemplates(prev => {
      if (!prev) return prev;
      return { ...prev, [tier]: { ...prev[tier], [field]: value === '' ? -1 : parseInt(value) || 0 } };
    });
    setTemplatesDirty(true);
  };

  const saveTemplates = async () => {
    if (!editedTemplates) return;
    setIsSavingTemplates(true);
    try {
      const res = await fetch('/api/tier-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: editedTemplates }),
      });
      if (res.ok) {
        setTierTemplates(JSON.parse(JSON.stringify(editedTemplates)));
        setTemplatesDirty(false);
        toast({ title: 'Tier Templates Saved' });
      } else throw new Error();
    } catch {
      toast({ title: 'Error', description: 'Failed to save tier templates.', variant: 'destructive' });
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const openOrgSheet = (org: Organization) => {
    setSelectedOrg(org);
    setEditedFlags(org.feature_flags || { satellite_overlays: false, advanced_mapping: false, financing: false, api_access: false, buyer_portal_access: false, dpp_access: false });
    setEditedSeats(org.agent_seat_limit ?? 5);
    setEditedCollections(org.monthly_collection_limit ?? 1000);
    setEditedTier(org.subscription_tier || 'starter');
  };

  const handleTierChange = (tier: string) => {
    setEditedTier(tier);
    if (editedTemplates?.[tier]) {
      const t = editedTemplates[tier];
      setEditedFlags({ ...t.features });
      setEditedSeats(t.agent_seat_limit);
      setEditedCollections(t.monthly_collection_limit);
    }
  };

  const quickToggleOrgFeature = async (org: Organization, feature: keyof FeatureFlags) => {
    const newFlags = {
      ...(org.feature_flags || { satellite_overlays: false, advanced_mapping: false, financing: false, api_access: false, buyer_portal_access: false, dpp_access: false }),
      [feature]: !(org.feature_flags?.[feature] ?? false),
    };
    try {
      const res = await fetch('/api/feature-toggles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, feature_flags: newFlags }),
      });
      if (res.ok) {
        setOrganizations(prev => prev.map(o => o.id === org.id ? { ...o, feature_flags: newFlags } : o));
        toast({ title: 'Updated', description: `${ADDON_LABELS[feature]} ${newFlags[feature] ? 'enabled' : 'disabled'} for ${org.name}` });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update feature.', variant: 'destructive' });
    }
  };

  const saveOrgChanges = async () => {
    if (!selectedOrg) return;
    setIsSavingOrg(true);
    try {
      const res = await fetch('/api/feature-toggles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: selectedOrg.id,
          subscription_tier: editedTier,
          feature_flags: editedFlags,
          agent_seat_limit: editedSeats,
          monthly_collection_limit: editedCollections,
        }),
      });
      if (res.ok) {
        toast({ title: 'Saved', description: `${selectedOrg.name} updated.` });
        fetchData();
        setSelectedOrg(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update settings.', variant: 'destructive' });
    } finally {
      setIsSavingOrg(false);
    }
  };

  const TierBadge = ({ tier }: { tier: string }) => (
    <Badge variant="outline" className={`capitalize text-xs font-medium ${TIER_STYLES[tier]?.badge || TIER_STYLES.starter.badge}`}>
      {TIER_ICONS[tier] && (() => { const Icon = TIER_ICONS[tier]; return <Icon className="h-3 w-3 mr-1 inline" />; })()}
      {TIER_LABEL_MAP[tier] || tier}
    </Badge>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error === 'unauthorized' || error === 'forbidden') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Shield className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 font-medium">{error === 'unauthorized' ? 'Authentication required' : 'Superadmin access only'}</p>
        </div>
      </div>
    );
  }

  if (error === 'error') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <p className="text-slate-400 font-medium">Failed to load data</p>
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Feature Toggles</h1>
          <p className="text-slate-400 mt-0.5">Manage tiers, add-on capabilities, and scale limits per organization</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-600 text-slate-300 hover:bg-slate-800 shrink-0">
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <Tabs defaultValue="organizations" className="space-y-5">
        <TabsList className="bg-slate-800 border border-slate-700 p-1 h-auto">
          <TabsTrigger
            value="organizations"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-sm px-4 py-1.5"
            data-testid="tab-organizations"
          >
            <ToggleLeft className="h-4 w-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger
            value="tier-templates"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-sm px-4 py-1.5"
            data-testid="tab-tier-templates"
          >
            <Layers className="h-4 w-4 mr-2" />
            Tier Templates
          </TabsTrigger>
          <TabsTrigger
            value="tier-overview"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-sm px-4 py-1.5"
            data-testid="tab-tier-overview"
          >
            <Crown className="h-4 w-4 mr-2" />
            Tier Overview
          </TabsTrigger>
        </TabsList>

        {/* ── Organizations tab ── */}
        <TabsContent value="organizations">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Organization Controls</CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Toggle add-ons directly or open the settings sheet for full configuration including tier changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-400 w-[180px]">Organization</TableHead>
                      <TableHead className="text-slate-400">Tier</TableHead>
                      {ADDON_KEYS.map(k => (
                        <TableHead key={k} className="text-slate-400 text-center text-xs">
                          {ADDON_LABELS[k]}
                        </TableHead>
                      ))}
                      <TableHead className="text-slate-400 text-right">Seats</TableHead>
                      <TableHead className="text-slate-400 w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                          No organizations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      organizations.map(org => (
                        <TableRow key={org.id} className="border-slate-700 hover:bg-slate-800/40" data-testid={`org-row-${org.id}`}>
                          <TableCell className="font-medium text-white text-sm">{org.name}</TableCell>
                          <TableCell><TierBadge tier={org.subscription_tier} /></TableCell>
                          {ADDON_KEYS.map(feature => (
                            <TableCell key={feature} className="text-center">
                              <Switch
                                checked={org.feature_flags?.[feature] ?? false}
                                onCheckedChange={() => quickToggleOrgFeature(org, feature)}
                                className="data-[state=checked]:bg-cyan-600"
                                data-testid={`switch-${org.id}-${feature}`}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-right text-slate-300 text-sm">
                            {org.agent_seat_limit === -1 ? '∞' : org.agent_seat_limit}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-white hover:bg-slate-700"
                              onClick={() => openOrgSheet(org)}
                              data-testid={`button-configure-${org.id}`}
                            >
                              <Settings className="h-3.5 w-3.5" />
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

        {/* ── Tier Templates tab ── */}
        <TabsContent value="tier-templates">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-white text-base">Tier Template Configuration</CardTitle>
                <CardDescription className="text-slate-500 text-sm">
                  Define default add-on capabilities and limits per tier. Applied when an org is assigned a tier.
                </CardDescription>
              </div>
              <Button
                onClick={saveTemplates}
                disabled={isSavingTemplates || !templatesDirty}
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-600 shrink-0"
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
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">Add-On Capabilities per Tier</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-400 min-w-[200px]">Capability</TableHead>
                            {TIER_ORDER.map(tier => (
                              <TableHead key={tier} className="text-center min-w-[100px]">
                                <TierBadge tier={tier} />
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ADDON_KEYS.map(feature => (
                            <TableRow key={feature} className="border-slate-700">
                              <TableCell>
                                <div className="text-sm text-slate-300 font-medium">{ADDON_LABELS[feature]}</div>
                                <div className="text-xs text-slate-600 mt-0.5">{ADDON_DESCRIPTIONS[feature]}</div>
                              </TableCell>
                              {TIER_ORDER.map(tier => (
                                <TableCell key={tier} className="text-center">
                                  <Switch
                                    checked={editedTemplates[tier]?.features?.[feature] ?? false}
                                    onCheckedChange={() => toggleTemplateFeature(tier, feature)}
                                    className="data-[state=checked]:bg-cyan-600"
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
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">Scale Limits per Tier</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-400 min-w-[200px]">Limit</TableHead>
                            {TIER_ORDER.map(tier => (
                              <TableHead key={tier} className="text-center min-w-[100px]">
                                <TierBadge tier={tier} />
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { key: 'agent_seat_limit' as const, label: 'Agent Seats', desc: 'Max field agents (blank = unlimited)' },
                            { key: 'monthly_collection_limit' as const, label: 'Monthly Collections', desc: 'Max collections/month (blank = unlimited)' },
                          ].map(row => (
                            <TableRow key={row.key} className="border-slate-700">
                              <TableCell>
                                <div className="text-sm text-slate-300 font-medium">{row.label}</div>
                                <div className="text-xs text-slate-600 mt-0.5">{row.desc}</div>
                              </TableCell>
                              {TIER_ORDER.map(tier => (
                                <TableCell key={tier} className="text-center">
                                  <Input
                                    type="number"
                                    className="w-20 mx-auto text-center bg-slate-800 border-slate-600 text-slate-200 text-sm h-8"
                                    value={editedTemplates[tier]?.[row.key] === -1 ? '' : editedTemplates[tier]?.[row.key]}
                                    onChange={e => updateTemplateLimit(tier, row.key, e.target.value)}
                                    placeholder="∞"
                                    data-testid={`template-${row.key}-${tier}`}
                                  />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tier Overview tab ── */}
        <TabsContent value="tier-overview">
          <div className="grid gap-4 md:grid-cols-2">
            {TIER_ORDER.map(tier => {
              const TierIcon = TIER_ICONS[tier];
              const newFeatures = getTierNewFeatures(tier as SubscriptionTier);
              const style = TIER_STYLES[tier];
              return (
                <Card key={tier} className={`bg-slate-900 border-slate-700`} data-testid={`tier-card-${tier}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg ${style.bg} border border-slate-700 flex items-center justify-center`}>
                        <TierIcon className={`h-5 w-5 ${style.icon}`} />
                      </div>
                      <div>
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          {TIER_LABEL_MAP[tier]}
                          <Badge variant="outline" className={`text-[10px] ${style.badge}`}>
                            {TIER_TAGLINES[tier as SubscriptionTier]}
                          </Badge>
                        </CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-slate-500 text-xs mt-2">
                      {TIER_DESCRIPTIONS[tier as SubscriptionTier]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-2">
                          {tier === 'starter' ? 'Core Features' : 'Adds to Previous Tier'}
                        </p>
                        <ul className="space-y-1.5">
                          {newFeatures.map((feature: TierFeature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                              <Check className={`h-3.5 w-3.5 shrink-0 ${style.icon}`} />
                              {GATED_FEATURE_LABELS[feature]}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {tier !== 'enterprise' && (
                        <div className="pt-3 border-t border-slate-800">
                          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-2">Locked</p>
                          <ul className="space-y-1">
                            {getLockedFeatures(tier as SubscriptionTier).slice(0, 4).map((feature: TierFeature) => (
                              <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                                <X className="h-3 w-3 shrink-0" />
                                {GATED_FEATURE_LABELS[feature]}
                              </li>
                            ))}
                            {getLockedFeatures(tier as SubscriptionTier).length > 4 && (
                              <li className="text-xs text-slate-700 pl-5">
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
          <Card className="bg-slate-900 border-slate-700 mt-4">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-slate-500">
                <strong className="text-slate-400">Design principle:</strong>{' '}
                Core traceability (collection, mapping, bag-to-batch tracking) is never gated.
                Tiers scale on volume, compliance depth, and automation. Add-ons can be toggled per organization independently.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Org settings sheet */}
      <Sheet open={!!selectedOrg} onOpenChange={open => !open && setSelectedOrg(null)}>
        <SheetContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b border-slate-700 pb-4 mb-4">
            <SheetTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan-400" />
              {selectedOrg?.name}
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Configure subscription tier, add-on capabilities, and scale limits
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Tier */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Subscription Tier</Label>
              <Select value={editedTier} onValueChange={handleTierChange}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100" data-testid="select-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {TIER_ORDER.map(tier => (
                    <SelectItem key={tier} value={tier} className="text-slate-200">
                      <span className="flex items-center gap-2">
                        {(() => { const Icon = TIER_ICONS[tier]; return <Icon className="h-4 w-4" />; })()}
                        {TIER_LABEL_MAP[tier]}
                        <span className="text-xs text-slate-500">— {TIER_TAGLINES[tier as SubscriptionTier]}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-600">Changing tier resets add-ons and limits to template defaults</p>
            </div>

            {/* Add-ons */}
            <div className="space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Add-On Capabilities</p>
              {editedFlags && ADDON_KEYS.map(feature => (
                <div key={feature} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                  <div>
                    <div className="text-sm text-slate-300 font-medium">{ADDON_LABELS[feature]}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{ADDON_DESCRIPTIONS[feature]}</div>
                  </div>
                  <Switch
                    checked={editedFlags[feature]}
                    onCheckedChange={() => setEditedFlags(f => f ? { ...f, [feature]: !f[feature] } : f)}
                    className="data-[state=checked]:bg-cyan-600"
                    data-testid={`sheet-switch-${feature}`}
                  />
                </div>
              ))}
            </div>

            {/* Limits */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Agent Seat Limit</Label>
                <Input
                  type="number"
                  value={editedSeats === -1 ? '' : editedSeats}
                  onChange={e => setEditedSeats(e.target.value === '' ? -1 : parseInt(e.target.value))}
                  placeholder="Unlimited (∞)"
                  className="bg-slate-800 border-slate-600 text-slate-100"
                  data-testid="input-seat-limit"
                />
                <p className="text-xs text-slate-600">Leave blank for unlimited</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Monthly Collection Limit</Label>
                <Input
                  type="number"
                  value={editedCollections === -1 ? '' : editedCollections}
                  onChange={e => setEditedCollections(e.target.value === '' ? -1 : parseInt(e.target.value))}
                  placeholder="Unlimited (∞)"
                  className="bg-slate-800 border-slate-600 text-slate-100"
                  data-testid="input-collection-limit"
                />
                <p className="text-xs text-slate-600">Leave blank for unlimited</p>
              </div>
            </div>

            <Button
              onClick={saveOrgChanges}
              disabled={isSavingOrg}
              className="w-full bg-emerald-700 hover:bg-emerald-600"
              data-testid="button-save-org"
            >
              {isSavingOrg
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function getLockedFeatures(tier: SubscriptionTier): TierFeature[] {
  const allFeatures = Object.keys(GATED_FEATURE_LABELS) as TierFeature[];
  const accessibleSet = new Set<TierFeature>(getTierFeatures(tier));
  return allFeatures.filter(f => !accessibleSet.has(f));
}
