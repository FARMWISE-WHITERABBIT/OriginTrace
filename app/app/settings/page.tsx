'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Shield, Package, Users, RefreshCw, Copy, Check, Plus, X, MapPin, Building2, FileSpreadsheet, Upload, Image as ImageIcon, Globe, Scale, ClipboardCheck, Leaf, ChevronDown, FileText, Sprout, Factory, Truck, Palette, ScrollText, Webhook, Key, ShieldCheck, Trash2, Coins, Plug, BadgeCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { CSVImporter } from '@/components/csv-importer';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLocale } from '@/lib/i18n/locale-provider';
import { locales, localeNames, type Locale } from '@/i18n';
import { AuditLogContent } from '@/app/app/audit/audit-content';
import { WebhooksContent } from '@/components/settings/webhooks-content';
import { ApiKeysContent } from '@/components/settings/api-keys-content';
import { IntegrationsContent } from '@/components/settings/integrations-content';
import { ComplianceProfilesSection } from '@/components/settings/compliance-profiles-content';
import { KycPaymentsContent } from '@/components/settings/kyc-payments-content';

interface OrgSettings {
  require_polygon?: boolean;
  require_national_id?: boolean;
  require_land_deed?: boolean;
  require_photo?: boolean;
  deforestation_threshold?: number;
  data_retention_years?: number;
  enabled_frameworks?: string[];
  eudr_deforestation_cutoff?: boolean;
  eudr_geolocation_proof?: boolean;
  gfl_supplier_traceability?: boolean;
  gfl_recall_procedures?: boolean;
  gfl_food_safety_hazards?: boolean;
  gfl_labeling_compliance?: boolean;
  organic_certification_tracking?: boolean;
  organic_input_tracking?: boolean;
  organic_segregation?: boolean;
  organic_conversion_period?: boolean;
  cs3d_supplier_due_diligence?: boolean;
  cs3d_human_rights_assessment?: boolean;
  cs3d_environmental_impact?: boolean;
  cs3d_remediation_tracking?: boolean;
  uk_env_deforestation_risk?: boolean;
  uk_env_origin_verification?: boolean;
  uk_env_forest_risk_declaration?: boolean;
  fsma_critical_tracking_events?: boolean;
  fsma_key_data_elements?: boolean;
  fsma_lot_traceability?: boolean;
  lacey_species_identification?: boolean;
  lacey_legal_harvest_docs?: boolean;
  lacey_chain_of_custody?: boolean;
  ra_certification?: boolean;
  ra_social_criteria?: boolean;
  ft_certification?: boolean;
  ft_price_documentation?: boolean;
  private_buyer_checklists?: boolean;
}

interface Commodity {
  id: string;
  name: string;
  grades: string[];
  unit: string;
}

interface Organization {
  id: number;
  name: string;
  logo_url?: string;
  invite_code?: string;
  settings?: OrgSettings;
  commodity_types?: string[];
  commodities?: Commodity[];
  active_lgas?: number[];
  subscription_status?: string;
  data_region?: string;
}

interface State {
  id: number;
  name: string;
  code: string;
}

interface Lga {
  id: number;
  name: string;
  state_id: number;
  is_active?: boolean;
}

const FALLBACK_COMMODITIES: Commodity[] = [];

interface ComplianceRule {
  key: string;
  label: string;
  description: string;
  dataField: string;
}

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  rules: ComplianceRule[];
}

function ComplianceFrameworkSection({
  region,
  regionIcon: RegionIcon,
  frameworks,
  settings,
  setSettings,
}: {
  region: string;
  regionIcon: React.ComponentType<{ className?: string }>;
  frameworks: ComplianceFramework[];
  settings: OrgSettings;
  setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
}) {
  const enabledFrameworks = settings.enabled_frameworks || [];
  const activeCount = frameworks.filter(f => enabledFrameworks.includes(f.id)).length;
  const totalRules = frameworks.reduce((sum, f) => sum + f.rules.length, 0);
  const enabledRules = frameworks.reduce((sum, f) => {
    return sum + f.rules.filter(r => (settings as Record<string, unknown>)[r.key]).length;
  }, 0);

  const toggleFramework = (frameworkId: string) => {
    const current = settings.enabled_frameworks || [];
    const framework = frameworks.find(f => f.id === frameworkId);
    if (!framework) return;

    if (current.includes(frameworkId)) {
      const newFrameworks = current.filter(f => f !== frameworkId);
      const resetRules: Record<string, boolean> = {};
      framework.rules.forEach(r => { resetRules[r.key] = false; });
      setSettings(prev => ({ ...prev, ...resetRules, enabled_frameworks: newFrameworks }));
    } else {
      const enableRules: Record<string, boolean> = {};
      framework.rules.forEach(r => { enableRules[r.key] = true; });
      setSettings(prev => ({ ...prev, ...enableRules, enabled_frameworks: [...current, frameworkId] }));
    }
  };

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <RegionIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">{region}</h3>
          <p className="text-xs text-muted-foreground">
            {activeCount}/{frameworks.length} frameworks active &middot; {enabledRules}/{totalRules} rules enabled
          </p>
        </div>
      </div>

      <div className="divide-y">
        {frameworks.map((framework) => {
          const isActive = enabledFrameworks.includes(framework.id);
          return (
            <Collapsible key={framework.id} defaultOpen={isActive}>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{framework.name}</span>
                        {isActive && <Badge variant="default" className="text-xs">Active</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{framework.description}</p>
                    </div>
                  </CollapsibleTrigger>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleFramework(framework.id)}
                    data-testid={`switch-framework-${framework.id}`}
                  />
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-2">
                  {framework.rules.map((rule) => (
                    <div key={rule.key} className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/20 border border-transparent">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-sm font-medium">{rule.label}</Label>
                          <Badge variant="outline" className="text-xs shrink-0">{rule.dataField}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                      </div>
                      <Switch
                        checked={(settings as Record<string, unknown>)[rule.key] === true}
                        onCheckedChange={(checked: boolean) => {
                          setSettings(prev => ({ ...prev, [rule.key]: checked }));
                          if (checked && !enabledFrameworks.includes(framework.id)) {
                            setSettings(prev => ({
                              ...prev,
                              [rule.key]: checked,
                              enabled_frameworks: [...(prev.enabled_frameworks || []), framework.id]
                            }));
                          }
                        }}
                        data-testid={`switch-${rule.key}`}
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

function LanguagePreferenceSection() {
  const { locale, setLocale } = useLocale();
  const { toast } = useToast();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  const handleSaveLanguage = async () => {
    setSaving(true);
    try {
      setLocale(selectedLocale);
      try {
        await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferred_locale: selectedLocale }),
        });
      } catch {}
      toast({
        title: selectedLocale === 'fr' ? 'Langue mise à jour' : selectedLocale === 'ar' ? 'تم تحديث اللغة' : 'Language Updated',
        description: selectedLocale === 'fr' ? 'Votre préférence linguistique a été enregistrée.' : selectedLocale === 'ar' ? 'تم حفظ تفضيل اللغة الخاص بك.' : 'Your language preference has been saved.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Could not update language preference.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Interface Language</Label>
        <Select value={selectedLocale} onValueChange={(v) => setSelectedLocale(v as Locale)}>
          <SelectTrigger className="w-full" data-testid="select-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locales.map((loc) => (
              <SelectItem key={loc} value={loc} data-testid={`language-option-${loc}`}>
                {localeNames[loc]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {selectedLocale === 'ar' && 'Arabic enables right-to-left (RTL) layout'}
          {selectedLocale === 'fr' && 'Le français sera appliqué à toute l\'interface'}
          {selectedLocale === 'en' && 'English is the default interface language'}
        </p>
      </div>
      <Button
        onClick={handleSaveLanguage}
        disabled={saving || selectedLocale === locale}
        data-testid="button-save-language"
      >
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {selectedLocale === 'fr' ? 'Enregistrer la langue' : selectedLocale === 'ar' ? 'حفظ اللغة' : 'Save Language'}
      </Button>
    </div>
  );
}

// ── Currency Preference Section ────────────────────────────────────────────
const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'Nigerian Naira (₦)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'GHS', label: 'Ghanaian Cedi (GH₵)' },
  { value: 'XOF', label: 'CFA Franc (XOF)' },
];

function CurrencyPreferenceSection() {
  const { organization, setOrganization } = useOrg();
  const { toast } = useToast();
  const current = ((organization?.settings as any)?.preferred_currency as string) || (organization as any)?.preferred_currency || 'NGN';
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSelected(current); }, [current]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { preferred_currency: selected } }),
      });
      if (!res.ok) throw new Error('Failed to save');
      if (organization) {
        setOrganization({
          ...organization,
          preferred_currency: selected,
          settings: { ...(organization.settings || {}), preferred_currency: selected },
        });
      }
      toast({ title: 'Currency updated', description: `Default currency set to ${CURRENCY_OPTIONS.find(c => c.value === selected)?.label}.` });
    } catch {
      toast({ title: 'Error', description: 'Could not update currency preference.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger data-testid="select-currency-preference"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CURRENCY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        This applies to payment records, analytics charts, and exported reports.
      </p>
      <Button size="sm" onClick={handleSave} disabled={saving || selected === current} data-testid="button-save-currency">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Currency
      </Button>
    </div>
  );
}


function SettingsContent() {
  const { profile, organization, isLoading, refreshProfile } = useOrg();
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams?.get('tab') || 'general';
  // Normalise legacy 'compliance-profiles' → 'compliance'
  const tabParam = rawTab === 'compliance-profiles' ? 'compliance' : rawTab;

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tab);
    router.replace(`/app/settings?${params.toString()}`, { scroll: false });
  };
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [orgData, setOrgData] = useState<Organization | null>(null);
  const [orgName, setOrgName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [settings, setSettings] = useState<OrgSettings>({});
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([]);
  const [availableCommodities, setAvailableCommodities] = useState<Commodity[]>(FALLBACK_COMMODITIES);
  const [customCommodities, setCustomCommodities] = useState<Commodity[]>([]);
  const [newCommodityName, setNewCommodityName] = useState('');
  const [newCommodityGrades, setNewCommodityGrades] = useState('');
  const [newCommodityUnit, setNewCommodityUnit] = useState('kg');
  const [showAddCommodityDialog, setShowAddCommodityDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [brandColors, setBrandColors] = useState<{ primary: string; secondary: string; accent: string }>({ primary: '', secondary: '', accent: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [states, setStates] = useState<State[]>([]);
  const [lgas, setLgas] = useState<Lga[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [activeLgas, setActiveLgas] = useState<number[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchOrgSettings();
      fetchStates();
      fetchAvailableCommodities();
    }
  }, [profile]);

  const fetchAvailableCommodities = async () => {
    try {
      const res = await fetch('/api/commodities');
      if (res.ok) {
        const data = await res.json();
        const commodityList = data.commodities || [];
        if (Array.isArray(commodityList)) {
          const mapped = commodityList.map((c: any) => ({
            id: c.slug || c.name.toLowerCase().replace(/\s+/g, '_'),
            name: c.name,
            grades: c.grades || [],
            unit: c.unit || 'kg',
            dbId: c.id,
            isGlobal: c.org_id === null || c.is_global || false,
          }));
          setAvailableCommodities(mapped);
          const orgSpecific = mapped.filter((c: any) => !c.isGlobal);
          setCustomCommodities(orgSpecific);
          return;
        }
      }
      setAvailableCommodities([]);
      setCustomCommodities([]);
    } catch {
      setAvailableCommodities([]);
      setCustomCommodities([]);
    }
  };

  useEffect(() => {
    if (selectedStateId) {
      fetchLgas(selectedStateId);
    }
  }, [selectedStateId]);

  const fetchOrgSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setOrgData(data.organization);
        setOrgName(data.organization.name || '');
        setLogoUrl(data.organization.logo_url || '');
        setLogoPreview(data.organization.logo_url || '');
        setSettings(data.organization.settings || {});
        setSelectedCommodities(data.organization.commodity_types || []);
        setActiveLgas(data.organization.active_lgas || []);
        const bc = data.organization.brand_colors;
        if (bc && typeof bc === 'object') {
          setBrandColors({ primary: bc.primary || '', secondary: bc.secondary || '', accent: bc.accent || '' });
        } else {
          setBrandColors({ primary: '', secondary: '', accent: '' });
        }
      }
    } catch (error) {
      console.error('Failed to fetch org settings:', error);
    }
  };

  const fetchStates = async () => {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setStates(data.states || []);
      }
    } catch (error) {
      console.error('Failed to fetch states:', error);
    }
  };

  const fetchLgas = async (stateId: number) => {
    try {
      const response = await fetch(`/api/locations?state_id=${stateId}`);
      if (response.ok) {
        const data = await response.json();
        setLgas(data.lgas || []);
      }
    } catch (error) {
      console.error('Failed to fetch LGAs:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      await refreshProfile();
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Update failed:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update your profile.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOrg = async (section?: string) => {
    setIsSaving(true);
    try {
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl === null) {
          setIsSaving(false);
          return;
        }
        finalLogoUrl = uploadedUrl;
        setLogoUrl(uploadedUrl);
        setLogoFile(null);
      }

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: orgName,
          logo_url: finalLogoUrl,
          settings,
          commodity_types: selectedCommodities,
          active_lgas: activeLgas,
          brand_colors: (brandColors.primary || brandColors.secondary || brandColors.accent) ? brandColors : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }

      await fetchOrgSettings();
      await refreshProfile();
      toast({
        title: 'Settings Updated',
        description: `${section || 'Organization'} settings have been saved.`,
      });
    } catch (error) {
      console.error('Update failed:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update organization settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_invite_code' }),
      });

      if (!response.ok) throw new Error('Failed to regenerate code');

      const data = await response.json();
      setOrgData(prev => prev ? { ...prev, invite_code: data.invite_code } : null);
      toast({
        title: 'Invite Code Regenerated',
        description: 'New 6-digit invite code has been generated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not regenerate invite code.',
        variant: 'destructive',
      });
    }
  };

  const copyInviteCode = () => {
    if (orgData?.invite_code) {
      navigator.clipboard.writeText(orgData.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleCommodity = (commodityId: string) => {
    setSelectedCommodities(prev => 
      prev.includes(commodityId) 
        ? prev.filter(c => c !== commodityId)
        : [...prev, commodityId]
    );
  };

  const addCustomCommodity = async () => {
    if (!newCommodityName.trim()) return;
    
    const gradesArray = newCommodityGrades
      .split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0);
    
    if (gradesArray.length === 0) {
      toast({
        title: 'Grades Required',
        description: 'Please add at least one grade standard for this commodity.',
        variant: 'destructive'
      });
      return;
    }

    const code = newCommodityName.trim().toUpperCase().replace(/\s+/g, '_');
    
    const isDuplicate = availableCommodities.some(c => c.name.toLowerCase() === newCommodityName.trim().toLowerCase());
    
    if (isDuplicate) {
      toast({
        title: 'Duplicate Commodity',
        description: 'A commodity with this name already exists.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/commodities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCommodityName.trim(),
          code,
          category: 'crop',
          unit: newCommodityUnit,
          grades: gradesArray,
          is_global: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create commodity');
      }

      const data = await res.json();
      const created = data.commodity;
      const newId = created.code?.toLowerCase() || created.name.toLowerCase().replace(/\s+/g, '_');
      
      setSelectedCommodities(prev => [...prev, newId]);
      setNewCommodityName('');
      setNewCommodityGrades('');
      setNewCommodityUnit('kg');
      setShowAddCommodityDialog(false);
      
      await fetchAvailableCommodities();
      
      toast({
        title: 'Commodity Added',
        description: `${created.name} has been added with ${gradesArray.length} grade(s).`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add commodity.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const removeCustomCommodity = async (commodityId: string) => {
    const commodity = availableCommodities.find(c => c.id === commodityId);
    if (commodity && (commodity as any).dbId) {
      try {
        const res = await fetch(`/api/commodities?id=${(commodity as any).dbId}`, { method: 'DELETE' });
        if (!res.ok) {
          toast({ title: 'Error', description: 'Failed to remove commodity.', variant: 'destructive' });
          return;
        }
        await fetchAvailableCommodities();
      } catch {
        toast({ title: 'Error', description: 'Failed to remove commodity.', variant: 'destructive' });
        return;
      }
    }
    setSelectedCommodities(prev => prev.filter(c => c !== commodityId));
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file (PNG, JPG, etc.)',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image under 2MB.',
        variant: 'destructive'
      });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return logoUrl;

    try {
      const supabase = createClient();
      if (!supabase) {
        toast({
          title: 'Upload Failed',
          description: 'Could not connect to storage service. Please try again.',
          variant: 'destructive'
        });
        return null;
      }
      
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `org-${organization?.id}-logo-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile, { upsert: true });

      if (error) {
        console.error('Logo upload error:', error);
        toast({
          title: 'Upload Failed',
          description: 'Could not upload logo. Please try again.',
          variant: 'destructive'
        });
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Failed to upload logo:', err);
      toast({
        title: 'Upload Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  };

  const toggleLga = (lgaId: number) => {
    setActiveLgas(prev => 
      prev.includes(lgaId) 
        ? prev.filter(id => id !== lgaId)
        : [...prev, lgaId]
    );
  };

  const activateAllLgas = () => {
    const allLgaIds = lgas.map(l => l.id);
    setActiveLgas(prev => [...new Set([...prev, ...allLgaIds])]);
  };

  const deactivateAllLgas = () => {
    const lgaIdsInState = lgas.map(l => l.id);
    setActiveLgas(prev => prev.filter(id => !lgaIdsInState.includes(id)));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile || !organization) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to access settings.</p>
        </CardContent>
      </Card>
    );
  }

  const isAdmin = profile.role === 'admin';

  const TAB_LABELS: Record<string, string> = {
    general:      'General',
    compliance:   'Compliance Profiles',
    'supply-chain': 'Supply Chain',
    team:         'Team',
    import:       'Data Import',
    webhooks:     'Webhooks',
    'api-keys':   'API Keys',
    audit:        'Audit Log',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Settings{tabParam !== 'general' ? ` — ${TAB_LABELS[tabParam] || tabParam}` : ''}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Configure your organization settings and compliance rules' : 'Manage your profile settings'}
        </p>
      </div>

      <Tabs value={tabParam} onValueChange={setTab} className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="compliance" data-testid="tab-compliance">
                <Shield className="h-4 w-4 mr-2" />
                Compliance
              </TabsTrigger>
              <TabsTrigger value="supply-chain" data-testid="tab-supply-chain">
                <Package className="h-4 w-4 mr-2" />
                Supply Chain
              </TabsTrigger>
              <TabsTrigger value="team" data-testid="tab-team">
                <Users className="h-4 w-4 mr-2" />
                Team
              </TabsTrigger>
              <TabsTrigger value="import" data-testid="tab-import">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Data Import
              </TabsTrigger>
              <TabsTrigger value="webhooks" data-testid="tab-webhooks">
                <Webhook className="h-4 w-4 mr-2" />
                Webhooks
              </TabsTrigger>
              <TabsTrigger value="api-keys" data-testid="tab-api-keys">
                <Key className="h-4 w-4 mr-2" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="integrations" data-testid="tab-integrations">
                <Plug className="h-4 w-4 mr-2" />
                Integrations
              </TabsTrigger>
            </>
          )}
          {isAdmin && (
            <TabsTrigger value="kyc" data-testid="tab-kyc">
              <BadgeCheck className="h-4 w-4 mr-2" />
              KYC &amp; Payments
            </TabsTrigger>
          )}
          {(isAdmin || profile.role === 'compliance_officer') && (
            <TabsTrigger value="audit" data-testid="tab-audit">
              <ScrollText className="h-4 w-4 mr-2" />
              Audit Log
            </TabsTrigger>
          )}
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Card */}
            <Card className="card-accent-blue">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-blue shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Your Profile
                </CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder={profile.full_name}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      data-testid="input-fullname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div>
                      <Badge variant="secondary" className="capitalize">
                        {profile.role}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSaving || !fullName.trim() || fullName.trim() === profile.full_name} 
                    data-testid="button-save-profile"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="card-accent-violet">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-violet shrink-0">
                    <Globe className="h-4 w-4" />
                  </div>
                  Language Preference
                </CardTitle>
                <CardDescription>Choose your preferred language for the interface</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <LanguagePreferenceSection />
              </CardContent>
            </Card>

            {/* Currency Preference */}
            <Card className="card-accent-emerald">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-emerald shrink-0">
                    <Coins className="h-4 w-4" />
                  </div>
                  Currency Preference
                </CardTitle>
                <CardDescription>Default currency for payments, analytics, and reports. Nigerian Naira (₦) is the default for Nigerian operations.</CardDescription>
              </CardHeader>
              <CardContent>
                <CurrencyPreferenceSection />
              </CardContent>
            </Card>

            {/* Branding Card (Admin Only) */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Organization Branding</CardTitle>
                  <CardDescription>Customize your organization's appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Your organization name"
                      data-testid="input-org-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Organization Logo</Label>
                    <div 
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {logoPreview ? (
                        <div className="space-y-2">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="h-16 mx-auto object-contain"
                          />
                          <p className="text-sm text-muted-foreground">Click to change logo</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm font-medium">Upload your logo</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                        </div>
                      )}
                    </div>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFileChange}
                      data-testid="input-logo-file"
                    />
                    <p className="text-xs text-muted-foreground">
                      This logo will appear in the sidebar for your organization's users
                    </p>
                  </div>
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-base font-medium">Brand Colors</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Set custom colors to personalize the sidebar, header, and primary action buttons for your team.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="brand-primary">Primary Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="brand-primary"
                            type="color"
                            value={brandColors.primary || '#16a34a'}
                            onChange={(e) => setBrandColors(prev => ({ ...prev, primary: e.target.value }))}
                            className="w-12 h-9 p-1 cursor-pointer"
                            data-testid="input-brand-primary"
                          />
                          <Input
                            value={brandColors.primary}
                            onChange={(e) => setBrandColors(prev => ({ ...prev, primary: e.target.value }))}
                            placeholder="#16a34a"
                            className="flex-1 font-mono text-sm"
                            data-testid="input-brand-primary-hex"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand-secondary">Secondary Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="brand-secondary"
                            type="color"
                            value={brandColors.secondary || '#64748b'}
                            onChange={(e) => setBrandColors(prev => ({ ...prev, secondary: e.target.value }))}
                            className="w-12 h-9 p-1 cursor-pointer"
                            data-testid="input-brand-secondary"
                          />
                          <Input
                            value={brandColors.secondary}
                            onChange={(e) => setBrandColors(prev => ({ ...prev, secondary: e.target.value }))}
                            placeholder="#64748b"
                            className="flex-1 font-mono text-sm"
                            data-testid="input-brand-secondary-hex"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand-accent">Accent Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="brand-accent"
                            type="color"
                            value={brandColors.accent || '#f59e0b'}
                            onChange={(e) => setBrandColors(prev => ({ ...prev, accent: e.target.value }))}
                            className="w-12 h-9 p-1 cursor-pointer"
                            data-testid="input-brand-accent"
                          />
                          <Input
                            value={brandColors.accent}
                            onChange={(e) => setBrandColors(prev => ({ ...prev, accent: e.target.value }))}
                            placeholder="#f59e0b"
                            className="flex-1 font-mono text-sm"
                            data-testid="input-brand-accent-hex"
                          />
                        </div>
                      </div>
                    </div>
                    {(brandColors.primary || brandColors.secondary || brandColors.accent) && (
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border">
                        <span className="text-sm text-muted-foreground">Preview:</span>
                        <div className="flex gap-2">
                          {brandColors.primary && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: brandColors.primary }} />
                              <span className="text-xs text-muted-foreground">Primary</span>
                            </div>
                          )}
                          {brandColors.secondary && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: brandColors.secondary }} />
                              <span className="text-xs text-muted-foreground">Secondary</span>
                            </div>
                          )}
                          {brandColors.accent && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-md border" style={{ backgroundColor: brandColors.accent }} />
                              <span className="text-xs text-muted-foreground">Accent</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBrandColors({ primary: '', secondary: '', accent: '' })}
                          className="ml-auto"
                          data-testid="button-reset-colors"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => handleUpdateOrg('Branding')} 
                    disabled={isSaving}
                    data-testid="button-save-branding"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Branding
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Organization Info Card */}
          <Card className="card-accent-blue">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-blue shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                Organization Details
              </CardTitle>
              <CardDescription>Your organization information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <p className="text-sm font-medium">{organization.name}</p>
                </div>
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize font-medium">
                      {(organization as any).subscription_tier || 'starter'}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {(organization as any).subscription_status || 'active'}
                    </Badge>
                    <Link href="/app/settings/subscription">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary">
                        Manage →
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Commodities</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedCommodities.length > 0 ? selectedCommodities.map((c: string) => (
                      <Badge key={c} variant="secondary" className="capitalize">
                        {c}
                      </Badge>
                    )) : (
                      <span className="text-sm text-muted-foreground">None selected</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label>Data Sovereignty Region</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {orgData?.data_region || 'default'}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Data storage region for regulatory compliance. Contact support to change.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* COMPLIANCE TAB */}
        {isAdmin && (
          <TabsContent value="compliance" className="space-y-6">
            <ComplianceProfilesSection />
            <Card className="card-accent-green">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-green shrink-0">
                    <Shield className="h-4 w-4" />
                  </div>
                  Compliance Rules Engine
                </CardTitle>
                <CardDescription>
                  Configure compliance requirements across multiple regulatory frameworks. Enabled rules are enforced in real-time during data collection.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4 bg-primary/5">
                  <p className="text-sm font-medium text-primary mb-1">One traceability foundation. Multiple regulatory pathways.</p>
                  <p className="text-xs text-muted-foreground">
                    Enable the frameworks your organization needs. Rules are enforced across farm registration, collection, processing, and shipment workflows.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        require_polygon: true, require_national_id: true, require_land_deed: true, require_photo: true,
                        data_retention_years: 5, eudr_deforestation_cutoff: true, eudr_geolocation_proof: true,
                        enabled_frameworks: [...new Set([...(prev.enabled_frameworks || []), 'eudr'])]
                      }))}
                      data-testid="button-preset-eudr"
                    >
                      EUDR Full
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        gfl_supplier_traceability: true, gfl_recall_procedures: true, gfl_food_safety_hazards: true, gfl_labeling_compliance: true,
                        enabled_frameworks: [...new Set([...(prev.enabled_frameworks || []), 'gfl'])]
                      }))}
                      data-testid="button-preset-gfl"
                    >
                      General Food Law
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        fsma_critical_tracking_events: true, fsma_key_data_elements: true, fsma_lot_traceability: true,
                        enabled_frameworks: [...new Set([...(prev.enabled_frameworks || []), 'fsma'])]
                      }))}
                      data-testid="button-preset-fsma"
                    >
                      FSMA 204
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        require_polygon: true, require_national_id: true, require_land_deed: true, require_photo: true,
                        data_retention_years: 7,
                        eudr_deforestation_cutoff: true, eudr_geolocation_proof: true,
                        gfl_supplier_traceability: true, gfl_recall_procedures: true, gfl_food_safety_hazards: true, gfl_labeling_compliance: true,
                        organic_certification_tracking: true, organic_input_tracking: true, organic_segregation: true,
                        cs3d_supplier_due_diligence: true, cs3d_human_rights_assessment: true, cs3d_environmental_impact: true, cs3d_remediation_tracking: true,
                        uk_env_deforestation_risk: true, uk_env_origin_verification: true, uk_env_forest_risk_declaration: true,
                        fsma_critical_tracking_events: true, fsma_key_data_elements: true, fsma_lot_traceability: true,
                        lacey_species_identification: true, lacey_legal_harvest_docs: true, lacey_chain_of_custody: true,
                        ra_certification: true, ra_social_criteria: true,
                        ft_certification: true, ft_price_documentation: true,
                        private_buyer_checklists: true,
                        enabled_frameworks: ['eudr', 'gfl', 'organic', 'cs3d', 'uk_env', 'fsma', 'lacey', 'ra', 'ft', 'private']
                      }))}
                      data-testid="button-preset-all"
                    >
                      All Frameworks
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        require_polygon: false, require_national_id: false, require_land_deed: false, require_photo: false,
                        eudr_deforestation_cutoff: false, eudr_geolocation_proof: false,
                        gfl_supplier_traceability: false, gfl_recall_procedures: false, gfl_food_safety_hazards: false, gfl_labeling_compliance: false,
                        organic_certification_tracking: false, organic_input_tracking: false, organic_segregation: false, organic_conversion_period: false,
                        cs3d_supplier_due_diligence: false, cs3d_human_rights_assessment: false, cs3d_environmental_impact: false, cs3d_remediation_tracking: false,
                        uk_env_deforestation_risk: false, uk_env_origin_verification: false, uk_env_forest_risk_declaration: false,
                        fsma_critical_tracking_events: false, fsma_key_data_elements: false, fsma_lot_traceability: false,
                        lacey_species_identification: false, lacey_legal_harvest_docs: false, lacey_chain_of_custody: false,
                        ra_certification: false, ra_social_criteria: false,
                        ft_certification: false, ft_price_documentation: false,
                        private_buyer_checklists: false,
                        enabled_frameworks: []
                      }))}
                      data-testid="button-preset-minimal"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <ComplianceFrameworkSection
                  region="European Union"
                  regionIcon={Globe}
                  frameworks={[
                    {
                      id: 'eudr',
                      name: 'EUDR (Deforestation Regulation)',
                      description: 'EU Regulation 2023/1115 requiring deforestation-free supply chains with geolocation proof',
                      rules: [
                        { key: 'require_polygon', label: 'Require GPS Polygon', description: 'Farm boundaries must be mapped with GPS coordinates', dataField: 'Farm mapping' },
                        { key: 'eudr_geolocation_proof', label: 'Geolocation Proof of Origin', description: 'GPS evidence linking produce to specific plot coordinates', dataField: 'Collection GPS' },
                        { key: 'require_national_id', label: 'Require Farmer Identity (KYC)', description: 'National ID or identity document must be uploaded', dataField: 'Farmer registration' },
                        { key: 'require_land_deed', label: 'Require Land Ownership Proof', description: 'Land deed or lease documentation required', dataField: 'Farmer registration' },
                        { key: 'require_photo', label: 'Require Farm Photo', description: 'At least one geo-tagged photo of the farm', dataField: 'Farm mapping' },
                        { key: 'eudr_deforestation_cutoff', label: 'Deforestation Cutoff Date Check', description: 'Verify land was not deforested after December 31, 2020', dataField: 'Farm compliance review' },
                      ]
                    },
                    {
                      id: 'gfl',
                      name: 'General Food Law (EC 178/2002)',
                      description: 'EU food safety regulation requiring traceability one step back and one step forward',
                      rules: [
                        { key: 'gfl_supplier_traceability', label: 'Supplier Traceability Records', description: 'One-step-back and one-step-forward supplier chain documented', dataField: 'Collection & batch' },
                        { key: 'gfl_recall_procedures', label: 'Recall & Withdrawal Procedures', description: 'Document recall readiness procedures for each batch', dataField: 'Batch management' },
                        { key: 'gfl_food_safety_hazards', label: 'Food Safety Hazard Documentation', description: 'Record identified hazards (biological, chemical, physical)', dataField: 'Collection & processing' },
                        { key: 'gfl_labeling_compliance', label: 'Labeling Compliance Records', description: 'Track labeling requirements for destination markets', dataField: 'Shipment' },
                      ]
                    },
                    {
                      id: 'organic',
                      name: 'Organic Regulation (EU 2018/848)',
                      description: 'EU organic production standards covering certification, inputs, and segregation',
                      rules: [
                        { key: 'organic_certification_tracking', label: 'Organic Certification Tracking', description: 'Upload and track organic certificates per farm/supplier', dataField: 'Farmer registration' },
                        { key: 'organic_input_tracking', label: 'Input & Chemical Usage Tracking', description: 'Record all agricultural inputs to verify no prohibited substances', dataField: 'Collection' },
                        { key: 'organic_segregation', label: 'Organic/Conventional Segregation', description: 'Confirm separation of organic and conventional produce throughout chain', dataField: 'Processing & storage' },
                        { key: 'organic_conversion_period', label: 'Conversion Period Tracking', description: 'Track farms in organic conversion with start dates and progress', dataField: 'Farm management' },
                      ]
                    },
                    {
                      id: 'cs3d',
                      name: 'CS3D (Corporate Sustainability Due Diligence)',
                      description: 'EU directive on corporate sustainability due diligence covering human rights and environment',
                      rules: [
                        { key: 'cs3d_supplier_due_diligence', label: 'Supplier Due Diligence Assessment', description: 'Structured assessment of each supplier covering risk factors', dataField: 'Farmer & supplier records' },
                        { key: 'cs3d_human_rights_assessment', label: 'Human Rights Risk Assessment', description: 'Document human rights risks including labor conditions', dataField: 'Farmer registration' },
                        { key: 'cs3d_environmental_impact', label: 'Environmental Impact Documentation', description: 'Record environmental impact assessments per supply chain node', dataField: 'Farm & processing' },
                        { key: 'cs3d_remediation_tracking', label: 'Remediation Action Tracking', description: 'Track corrective actions for identified adverse impacts', dataField: 'Compliance review' },
                      ]
                    },
                  ]}
                  settings={settings}
                  setSettings={setSettings}
                />

                <ComplianceFrameworkSection
                  region="United Kingdom"
                  regionIcon={Scale}
                  frameworks={[
                    {
                      id: 'uk_env',
                      name: 'Environment Act (Forest Risk Commodities)',
                      description: 'UK regulation prohibiting use of illegally produced forest risk commodities',
                      rules: [
                        { key: 'uk_env_deforestation_risk', label: 'Deforestation Risk Assessment', description: 'Conduct and document risk assessment per forest risk commodity', dataField: 'Commodity & shipment' },
                        { key: 'uk_env_origin_verification', label: 'Country of Origin Verification', description: 'Verify and document the country and region of production', dataField: 'Collection & farm' },
                        { key: 'uk_env_forest_risk_declaration', label: 'Forest Risk Commodity Declaration', description: 'Declare commodity is not linked to illegal deforestation', dataField: 'Shipment' },
                      ]
                    },
                  ]}
                  settings={settings}
                  setSettings={setSettings}
                />

                <ComplianceFrameworkSection
                  region="United States"
                  regionIcon={ClipboardCheck}
                  frameworks={[
                    {
                      id: 'fsma',
                      name: 'FSMA 204 (Food Traceability Rule)',
                      description: 'FDA rule requiring additional traceability records for foods on the Food Traceability List',
                      rules: [
                        { key: 'fsma_critical_tracking_events', label: 'Critical Tracking Events (CTEs)', description: 'Log events at each supply chain node: growing, receiving, transforming, shipping', dataField: 'Collection, processing, shipment' },
                        { key: 'fsma_key_data_elements', label: 'Key Data Elements (KDEs)', description: 'Capture required data per CTE: lot codes, quantities, locations, dates', dataField: 'All supply chain stages' },
                        { key: 'fsma_lot_traceability', label: 'Lot-Level Traceability', description: 'Maintain lot identification and linkage from source to destination', dataField: 'Batch & lot management' },
                      ]
                    },
                    {
                      id: 'lacey',
                      name: 'Lacey Act (Timber & Plant Products)',
                      description: 'US law prohibiting trade in illegally sourced plants and plant products',
                      rules: [
                        { key: 'lacey_species_identification', label: 'Species & Variety Identification', description: 'Record scientific and common names for all plant products', dataField: 'Commodity & collection' },
                        { key: 'lacey_legal_harvest_docs', label: 'Legal Harvest Documentation', description: 'Proof that products were legally harvested per country of origin laws', dataField: 'Farm & supplier records' },
                        { key: 'lacey_chain_of_custody', label: 'Chain of Custody Records', description: 'Unbroken chain of custody from harvest through processing to export', dataField: 'Processing & shipment' },
                      ]
                    },
                  ]}
                  settings={settings}
                  setSettings={setSettings}
                />

                <ComplianceFrameworkSection
                  region="Buyer & Voluntary Standards"
                  regionIcon={Leaf}
                  frameworks={[
                    {
                      id: 'ra',
                      name: 'Rainforest Alliance',
                      description: 'Certification standard for sustainable agriculture covering environmental, social, and economic criteria',
                      rules: [
                        { key: 'ra_certification', label: 'Certification Document Tracking', description: 'Upload and verify Rainforest Alliance certificates per farm group', dataField: 'Farmer & farm records' },
                        { key: 'ra_social_criteria', label: 'Social Criteria Assessment', description: 'Record worker welfare, community engagement, and living conditions', dataField: 'Farmer registration' },
                      ]
                    },
                    {
                      id: 'ft',
                      name: 'Fairtrade International',
                      description: 'Standards ensuring fair pricing, decent working conditions, and community development',
                      rules: [
                        { key: 'ft_certification', label: 'Fairtrade Certification Tracking', description: 'Track Fairtrade certification status and audit dates per cooperative', dataField: 'Organization & farmer records' },
                        { key: 'ft_price_documentation', label: 'Premium & Price Documentation', description: 'Document Fairtrade minimum prices and premium payments to producers', dataField: 'Collection & payment' },
                      ]
                    },
                    {
                      id: 'private',
                      name: 'Private Sourcing Policies',
                      description: 'Custom buyer-specific compliance requirements and sourcing codes of conduct',
                      rules: [
                        { key: 'private_buyer_checklists', label: 'Custom Buyer Requirement Checklists', description: 'Track buyer-specific requirements, audit criteria, and sourcing policies', dataField: 'Shipment & compliance' },
                      ]
                    },
                  ]}
                  settings={settings}
                  setSettings={setSettings}
                />

                <div className="pt-4 border-t space-y-4">
                  <div className="space-y-2">
                    <Label>Data Retention Period (Years)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={settings.data_retention_years || 5}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, data_retention_years: parseInt(e.target.value) || 5 }))
                        }
                        className="w-24"
                        data-testid="input-data-retention"
                      />
                      <p className="text-sm text-muted-foreground">
                        EUDR requires minimum 5 years. FSMA 204 requires 2 years. CS3D requires records for duration of business relationship.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleUpdateOrg('Compliance')} 
                  disabled={isSaving}
                  className="w-full md:w-auto"
                  data-testid="button-save-compliance"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Compliance Rules
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* SUPPLY CHAIN TAB */}
        {isAdmin && (
          <TabsContent value="supply-chain" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Commodity Master
                </CardTitle>
                <CardDescription>
                  Configure the commodities your organization trades and their quality grades.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {availableCommodities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
                    No commodities available yet. Ask your platform administrator to add commodities, or create your own below.
                  </p>
                )}
                <div className="space-y-4">
                  {availableCommodities.length > 0 && (
                    <Label className="text-base font-medium">Available Commodities</Label>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {availableCommodities.map((commodity: any) => (
                      <div
                        key={commodity.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors relative ${
                          selectedCommodities.includes(commodity.id)
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => toggleCommodity(commodity.id)}
                        data-testid={`commodity-${commodity.id}`}
                      >
                        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                          <span className="font-medium">{commodity.name}</span>
                          <div className="flex items-center gap-1">
                            {commodity.isGlobal ? (
                              <Badge variant="outline" className="text-xs">Global</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Org</Badge>
                            )}
                            {selectedCommodities.includes(commodity.id) && (
                              <Badge variant="default" className="text-xs">Selected</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(commodity.grades || []).map((grade: string) => (
                            <Badge key={grade} variant="outline" className="text-xs">
                              {grade}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Unit: {commodity.unit}</p>
                        {!commodity.isGlobal && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={(e) => { e.stopPropagation(); removeCustomCommodity(commodity.id); }}
                            data-testid={`remove-commodity-${commodity.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Add Custom Commodity</Label>
                    <Dialog open={showAddCommodityDialog} onOpenChange={setShowAddCommodityDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-add-commodity">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Custom
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Custom Commodity</DialogTitle>
                          <DialogDescription>
                            Define a new commodity with its grade standards
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="commodity-name">Commodity Name</Label>
                            <Input
                              id="commodity-name"
                              value={newCommodityName}
                              onChange={(e) => setNewCommodityName(e.target.value)}
                              placeholder="e.g., Palm Kernel"
                              data-testid="input-commodity-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="commodity-grades">Grade Standards</Label>
                            <Input
                              id="commodity-grades"
                              value={newCommodityGrades}
                              onChange={(e) => setNewCommodityGrades(e.target.value)}
                              placeholder="Grade A, Grade B, Grade C"
                              data-testid="input-commodity-grades"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter grades separated by commas
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="commodity-unit">Unit of Measure</Label>
                            <Select value={newCommodityUnit} onValueChange={setNewCommodityUnit}>
                              <SelectTrigger data-testid="select-commodity-unit">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                <SelectItem value="ton">Metric Tons</SelectItem>
                                <SelectItem value="lb">Pounds (lb)</SelectItem>
                                <SelectItem value="bag">Bags</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddCommodityDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={addCustomCommodity}
                            disabled={!newCommodityName.trim() || !newCommodityGrades.trim()}
                            data-testid="button-save-commodity"
                          >
                            Add Commodity
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                </div>

                <Button 
                  onClick={() => handleUpdateOrg('Supply Chain')} 
                  disabled={isSaving || selectedCommodities.length === 0}
                  className="w-full md:w-auto"
                  data-testid="button-save-supply-chain"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Commodity Settings
                </Button>
              </CardContent>
            </Card>

            {/* Operating Regions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Operating Regions
                </CardTitle>
                <CardDescription>
                  Select which States and LGAs your organization operates in. Only active LGAs will be available to field agents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Select State</Label>
                  <Select
                    value={selectedStateId?.toString() || ''}
                    onValueChange={(value) => setSelectedStateId(parseInt(value))}
                  >
                    <SelectTrigger data-testid="select-state">
                      <SelectValue placeholder="Choose a state..." />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.id.toString()}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStateId && lgas.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>LGAs in {states.find(s => s.id === selectedStateId)?.name}</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={activateAllLgas}
                          data-testid="button-activate-all"
                        >
                          Activate All
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={deactivateAllLgas}
                          data-testid="button-deactivate-all"
                        >
                          Deactivate All
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                      {lgas.map((lga) => (
                        <div
                          key={lga.id}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                            activeLgas.includes(lga.id)
                              ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                          onClick={() => toggleLga(lga.id)}
                          data-testid={`lga-${lga.id}`}
                        >
                          <span className="text-sm">{lga.name}</span>
                          <Badge variant={activeLgas.includes(lga.id) ? 'default' : 'secondary'} className="text-xs">
                            {activeLgas.includes(lga.id) ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activeLgas.filter(id => lgas.find(l => l.id === id)).length} of {lgas.length} LGAs active in this state
                    </p>
                  </div>
                )}

                <Button 
                  onClick={() => handleUpdateOrg('Regions')} 
                  disabled={isSaving}
                  className="w-full md:w-auto"
                  data-testid="button-save-regions"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Region Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* TEAM TAB */}
        {isAdmin && (
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Invite Code
                </CardTitle>
                <CardDescription>
                  Share this 6-digit code with new team members to join your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-muted px-8 py-6 rounded-lg border-2 border-dashed">
                    <span className="text-4xl font-mono font-bold tracking-[0.5em]">
                      {orgData?.invite_code || '------'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={copyInviteCode}
                      disabled={!orgData?.invite_code}
                      data-testid="button-copy-code"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRegenerateCode}
                      data-testid="button-regenerate-code"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">How it works:</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Share this 6-digit code with new agents or team members</li>
                    <li>They visit the <span className="font-medium text-foreground">Join Organization</span> page and enter the code</li>
                    <li>They choose their role (Field Agent or Aggregator) and create their account</li>
                    <li>They are automatically added to your organization</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-3">
                    Join link: <span className="font-mono text-foreground select-all">/auth/join</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>View and manage your team members, roles, and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild data-testid="button-manage-team">
                  <Link href="/app/team">
                    <Users className="h-4 w-4 mr-2" />
                    Go to Team Management
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* DATA IMPORT TAB */}
        {isAdmin && (
          <TabsContent value="import" className="space-y-6">
            <CSVImporter
              onImport={async (data, type) => {
                if (!organization) {
                  return { success: 0, failed: data.length, errors: ['Not authenticated'] };
                }

                // Build a synthetic CSV from mapped data and send to /api/import
                // This uses batched server-side processing rather than row-by-row API calls
                const headerRow = Object.keys(data[0] || {}).join(',');
                const dataRows = data.map(row =>
                  Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
                );
                const csvContent = [headerRow, ...dataRows].join('\n');
                const csvFile = new File([csvContent], `import_${type}.csv`, { type: 'text/csv' });

                const form = new FormData();
                form.append('file', csvFile);
                form.append('type', type);
                form.append('dry_run', 'false');

                try {
                  const res = await fetch('/api/import', { method: 'POST', body: form });
                  const result = await res.json();
                  if (!res.ok) {
                    return { success: 0, failed: data.length, errors: [result.error || 'Import failed'] };
                  }
                  return {
                    success: result.imported || 0,
                    failed: result.skipped || 0,
                    errors: result.errors || [],
                  };
                } catch (err: any) {
                  return { success: 0, failed: data.length, errors: [err.message || 'Network error'] };
                }
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle>Migration Guide</CardTitle>
                <CardDescription>Migrating from KoBoToolbox, ODK, CommCare, or spreadsheets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Step 1 — Export from your current tool</h4>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>KoBoToolbox: Data → Downloads → CSV</li>
                      <li>ODK: Submissions → Export → CSV</li>
                      <li>Excel / Google Sheets: File → Download → CSV</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Step 2 — Import order matters</h4>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Import <strong>Farmers & Farms</strong> first</li>
                      <li>Then import <strong>Collection Batches</strong></li>
                      <li>Batches match to farmers by name</li>
                    </ul>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-muted-foreground">
                    <strong>EUDR compliance note:</strong> Imported farms need GPS boundary mapping to be export-ready.
                    After import, assign field agents to visit farms and capture polygon boundaries.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {(isAdmin || profile.role === 'compliance_officer') && (
          <TabsContent value="audit" className="space-y-6">
            <AuditLogContent />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="webhooks" className="space-y-6">
            <WebhooksContent />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="api-keys" className="space-y-6">
            <ApiKeysContent />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsContent />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="kyc" className="space-y-6">
            <KycPaymentsContent orgId={String(profile.org_id ?? '')} />
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}

function SettingsPageInner() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <SettingsPageInner />
    </Suspense>
  );
}
