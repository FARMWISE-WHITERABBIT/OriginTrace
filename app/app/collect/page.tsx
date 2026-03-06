'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/components/online-status';
import {
  getCachedLocations,
  cacheLocations,
  getCachedCommodities,
  cacheCommodities,
  getCachedFarmsFull,
  cacheFarmsFull,
} from '@/lib/offline/offline-cache';
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Users,
  Package,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  Search,
  Navigation,
  X,
  Layers,
  TreePine,
  User,
  Clock,
} from 'lucide-react';

interface LocationState { id: number; name: string; }
interface LocationLGA { id: number; name: string; state_id: number; }

interface Farmer {
  id: string;
  farmer_name: string;
  phone?: string;
  community: string;
}

interface Farm {
  id: string;
  farmer_name: string;
  community: string;
  commodity?: string;
  area_hectares?: number;
  compliance_status: string;
  boundary?: any;
}

interface Contributor {
  farmer: Farmer;
  farms: Farm[];
}

interface InventoryEntry {
  farm_id: string;
  farmer_name: string;
  community: string;
  bag_count: number;
  weight_kg: number;
  area_hectares?: number;
  has_boundary: boolean;
  compliance_status: string;
}

interface ComplianceFlag {
  type: 'polygon_missing' | 'overlap' | 'yield_warning';
  farm_id: string;
  farmer_name: string;
  message: string;
  severity: 'info' | 'warning';
}

const STEPS = [
  { id: 1, label: 'Batch Identity', icon: MapPin },
  { id: 2, label: 'Contributors', icon: Users },
  { id: 3, label: 'Select Farms', icon: TreePine },
  { id: 4, label: 'Log Inventory', icon: Package },
  { id: 5, label: 'Compliance', icon: ShieldCheck },
  { id: 6, label: 'Finalize', icon: CheckCircle },
];

export default function SmartCollectPage() {
  const router = useRouter();
  const { organization, profile } = useOrg();
  const { toast } = useToast();
  const supabase = createClient();
  const isOnline = useOnlineStatus();

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedBatchId, setSavedBatchId] = useState('');
  const [savedOffline, setSavedOffline] = useState(false);

  const [states, setStates] = useState<LocationState[]>([]);
  const [lgas, setLgas] = useState<LocationLGA[]>([]);
  const [locLoading, setLocLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('');
  const [selectedLGA, setSelectedLGA] = useState('');
  const [community, setCommunity] = useState('');
  const [commodity, setCommodity] = useState('');
  const [commodityOptions, setCommodityOptions] = useState<string[]>([]);
  const [batchId, setBatchId] = useState('');
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);

  const [allFarms, setAllFarms] = useState<Farm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickCommunity, setQuickCommunity] = useState('');
  const [isAddingFarmer, setIsAddingFarmer] = useState(false);

  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [batchNotes, setBatchNotes] = useState('');

  const [complianceFlags, setComplianceFlags] = useState<ComplianceFlag[]>([]);
  const [complianceAttestations, setComplianceAttestations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setBatchId(`BAT-${dateStr}-${rand}`);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setGpsLat(pos.coords.latitude); setGpsLng(pos.coords.longitude); },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  useEffect(() => {
    async function loadLocations() {
      const cached = await getCachedLocations();
      if (cached) {
        setStates(cached.states || []);
        setLgas(cached.lgas || []);
        setLocLoading(false);
      }
      if (isOnline) {
        try {
          const res = await fetch('/api/locations?all=true');
          if (res.ok) {
            const data = await res.json();
            setStates(data.states || []);
            setLgas(data.lgas || []);
            await cacheLocations(data.states || [], data.lgas || [], data.villages || []);
          }
        } catch {}
      }
      setLocLoading(false);
    }
    loadLocations();
  }, [isOnline]);

  useEffect(() => {
    async function loadCommodities() {
      let hasCached = false;
      const cached = await getCachedCommodities();
      if (cached && cached.length > 0) {
        setCommodityOptions(cached.map((c: any) => c.name));
        hasCached = true;
      }
      if (isOnline) {
        try {
          const orgId = organization?.id;
          const url = orgId ? `/api/commodities?org_id=${orgId}` : '/api/commodities?global_only=true';
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const commodities = data.commodities || data;
            if (Array.isArray(commodities) && commodities.length > 0) {
              setCommodityOptions(commodities.map((c: any) => c.name));
              await cacheCommodities(commodities);
              return;
            }
          }
        } catch {}
      }
      if (!hasCached && organization?.commodity_types && organization.commodity_types.length > 0) {
        setCommodityOptions(organization.commodity_types);
      }
    }
    loadCommodities();
  }, [organization, isOnline]);

  useEffect(() => {
    async function loadFarms() {
      if (!organization) { setFarmsLoading(false); return; }
      const cached = await getCachedFarmsFull(organization.id);
      if (cached && cached.length > 0) {
        setAllFarms(cached);
        setFarmsLoading(false);
      }
      if (isOnline && supabase) {
        try {
          const { data } = await supabase
            .from('farms')
            .select('id, farmer_name, community, commodity, area_hectares, compliance_status, boundary')
            .eq('org_id', organization.id)
            .order('farmer_name');
          if (data) {
            setAllFarms(data);
            await cacheFarmsFull(organization.id, data);
          }
        } catch {}
      }
      setFarmsLoading(false);
    }
    loadFarms();
  }, [organization, supabase, isOnline]);

  const filteredLGAs = useMemo(() => {
    if (!selectedState) return [];
    const stateObj = states.find(s => s.name === selectedState);
    return stateObj ? lgas.filter(l => l.state_id === stateObj.id) : [];
  }, [selectedState, states, lgas]);

  const uniqueFarmers = useMemo(() => {
    const map = new Map<string, Farmer>();
    allFarms.forEach(f => {
      const key = f.farmer_name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { id: f.id, farmer_name: f.farmer_name, community: f.community });
      }
    });
    return Array.from(map.values());
  }, [allFarms]);

  const filteredFarmers = useMemo(() => {
    if (!farmerSearch.trim()) return uniqueFarmers.slice(0, 20);
    const q = farmerSearch.toLowerCase();
    return uniqueFarmers.filter(f =>
      f.farmer_name.toLowerCase().includes(q) || f.community.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [uniqueFarmers, farmerSearch]);

  const addContributor = (farmer: Farmer) => {
    if (contributors.find(c => c.farmer.farmer_name.toLowerCase() === farmer.farmer_name.toLowerCase())) {
      toast({ title: 'Already added', description: `${farmer.farmer_name} is already in this batch.` });
      return;
    }
    setContributors(prev => [...prev, { farmer, farms: [] }]);
    setFarmerSearch('');
    toast({ title: 'Farmer added', description: farmer.farmer_name });
  };

  const removeContributor = (index: number) => {
    setContributors(prev => prev.filter((_, i) => i !== index));
  };

  const quickAddFarmer = async () => {
    if (!quickName.trim()) return;
    setIsAddingFarmer(true);
    try {
      if (isOnline && supabase && organization && profile) {
        const { data, error } = await supabase
          .from('farms')
          .insert({
            org_id: organization.id,
            farmer_name: quickName.trim(),
            phone: quickPhone || null,
            community: quickCommunity || community || 'Unknown',
            compliance_status: 'pending',
            registered_by: profile.user_id,
          })
          .select('id, farmer_name, community, compliance_status')
          .single();

        if (error) throw error;
        if (data) {
          const newFarmer: Farmer = { id: data.id, farmer_name: data.farmer_name, community: data.community };
          const newFarm: Farm = { ...data, boundary: null, has_boundary: false } as any;
          setAllFarms(prev => [...prev, newFarm as any]);
          addContributor(newFarmer);
        }
      } else {
        const tempId = `temp-${Date.now()}`;
        const newFarmer: Farmer = { id: tempId, farmer_name: quickName.trim(), community: quickCommunity || community || 'Unknown' };
        addContributor(newFarmer);
      }
      setQuickName('');
      setQuickPhone('');
      setQuickCommunity('');
      setShowQuickAdd(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add farmer', variant: 'destructive' });
    } finally {
      setIsAddingFarmer(false);
    }
  };

  const getFarmsForFarmer = (farmerName: string) => {
    return allFarms.filter(f => f.farmer_name.toLowerCase().trim() === farmerName.toLowerCase().trim());
  };

  const toggleFarmForContributor = (contribIndex: number, farm: Farm) => {
    setContributors(prev => prev.map((c, i) => {
      if (i !== contribIndex) return c;
      const exists = c.farms.find(f => f.id === farm.id);
      return {
        ...c,
        farms: exists ? c.farms.filter(f => f.id !== farm.id) : [...c.farms, farm]
      };
    }));
  };

  useEffect(() => {
    if (step === 4) {
      const entries: InventoryEntry[] = [];
      contributors.forEach(c => {
        if (c.farms.length === 0) {
          entries.push({
            farm_id: c.farmer.id,
            farmer_name: c.farmer.farmer_name,
            community: c.farmer.community,
            bag_count: 0,
            weight_kg: 0,
            has_boundary: false,
            compliance_status: 'pending',
          });
        } else {
          c.farms.forEach(f => {
            if (!entries.find(e => e.farm_id === f.id)) {
              entries.push({
                farm_id: f.id,
                farmer_name: f.farmer_name,
                community: f.community,
                bag_count: 0,
                weight_kg: 0,
                area_hectares: f.area_hectares || undefined,
                has_boundary: !!f.boundary,
                compliance_status: f.compliance_status,
              });
            }
          });
        }
      });
      const existing = inventory;
      const merged = entries.map(e => {
        const prev = existing.find(x => x.farm_id === e.farm_id);
        return prev ? { ...e, bag_count: prev.bag_count, weight_kg: prev.weight_kg } : e;
      });
      setInventory(merged);
    }
  }, [step, contributors]);

  const updateInventory = (farmId: string, field: 'bag_count' | 'weight_kg', value: number) => {
    setInventory(prev => prev.map(e => e.farm_id === farmId ? { ...e, [field]: value } : e));
  };

  const totalBags = inventory.reduce((s, e) => s + e.bag_count, 0);
  const totalWeight = inventory.reduce((s, e) => s + e.weight_kg, 0);

  useEffect(() => {
    if (step === 5) {
      const flags: ComplianceFlag[] = [];
      inventory.forEach(entry => {
        if (!entry.has_boundary) {
          flags.push({
            type: 'polygon_missing',
            farm_id: entry.farm_id,
            farmer_name: entry.farmer_name,
            message: `${entry.farmer_name}'s farm has no GPS polygon mapped`,
            severity: 'warning',
          });
        }
        if (entry.area_hectares && entry.weight_kg > 0) {
          const yieldPerHa = entry.weight_kg / entry.area_hectares;
          if (yieldPerHa > 3000) {
            flags.push({
              type: 'yield_warning',
              farm_id: entry.farm_id,
              farmer_name: entry.farmer_name,
              message: `${entry.farmer_name}: ${Math.round(yieldPerHa)} kg/ha yield seems unusually high`,
              severity: 'warning',
            });
          }
        }
      });
      setComplianceFlags(flags);
    }
  }, [step, inventory]);

  const complianceScore = useMemo(() => {
    if (inventory.length === 0) return 100;
    const totalEntries = inventory.filter(e => e.bag_count > 0).length || inventory.length;
    if (totalEntries === 0) return 100;
    let compliant = 0;
    inventory.forEach(entry => {
      if (entry.bag_count === 0 && inventory.filter(e => e.bag_count > 0).length > 0) return;
      let entryScore = 0;
      let checks = 0;
      checks++;
      if (entry.has_boundary) entryScore++;
      checks++;
      if (entry.compliance_status !== 'flagged') entryScore++;
      if (entry.area_hectares && entry.weight_kg > 0) {
        checks++;
        const yieldPerHa = entry.weight_kg / entry.area_hectares;
        if (yieldPerHa <= 3000) entryScore++;
      }
      compliant += (entryScore / checks);
    });
    return Math.round((compliant / totalEntries) * 100);
  }, [inventory]);

  const hasBlockingIssues = complianceFlags.some(f => f.type === 'polygon_missing' || f.type === 'overlap');

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedState && !!selectedLGA && !!community.trim() && !!commodity;
      case 2: return contributors.length > 0;
      case 3: return true;
      case 4: return totalBags > 0;
      case 5: return true;
      case 6: return complianceScore === 100 && !hasBlockingIssues;
      default: return false;
    }
  };

  const handleFinalize = async () => {
    setIsSaving(true);
    try {
      const primaryFarmId = inventory[0]?.farm_id;
      const { saveBatchOffline, generateLocalId } = await import('@/lib/offline/sync-store');

      const localId = generateLocalId();
      await saveBatchOffline({
        local_id: localId,
        batch_id: batchId,
        farm_id: primaryFarmId || 'unknown',
        farm_name: inventory[0]?.farmer_name || 'Unknown',
        commodity,
        state: selectedState || undefined,
        lga: selectedLGA || undefined,
        community: community || undefined,
        gps_lat: gpsLat || undefined,
        gps_lng: gpsLng || undefined,
        contributors: inventory
          .filter(e => e.bag_count > 0)
          .map(e => ({
            farm_id: e.farm_id,
            farmer_name: e.farmer_name,
            community: e.community,
            bag_count: e.bag_count,
            weight_kg: e.weight_kg,
          })),
        bags: inventory.flatMap(e => Array.from({ length: e.bag_count }, () => ({
          serial: '',
          weight: e.bag_count > 0 ? e.weight_kg / e.bag_count : 0,
          grade: 'A' as const,
          is_compliant: true
        }))),
        notes: batchNotes + (Object.keys(complianceAttestations).length > 0 ? '\n[Compliance: ' + Object.entries(complianceAttestations).filter(([,v]) => v).map(([k]) => k).join(', ') + ']' : ''),
        collected_at: new Date().toISOString(),
      });

      setSavedOffline(true);
      setSavedBatchId(batchId);
      setShowSuccess(true);

      if (isOnline) {
        try {
          const { syncPendingBatches } = await import('@/lib/offline/sync-service');
          const result = await syncPendingBatches();
          if (result.synced > 0) {
            setSavedOffline(false);
          }
        } catch (syncErr) {
          console.warn('Background sync failed, will retry later:', syncErr);
        }
      }
    } catch (error) {
      console.error('Finalize error:', error);
      toast({ title: 'Error', description: 'Failed to save batch. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30 p-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-success-title">Collection Complete</h1>
          <p className="text-muted-foreground">
            {savedOffline ? 'Saved locally. Will sync when you are online.' : 'Batch has been saved successfully.'}
          </p>
          {savedOffline && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <Clock className="h-3 w-3 mr-1" /> Awaiting Sync
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Batch Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Batch ID</span>
              <span className="font-mono font-medium" data-testid="text-success-batch-id">{savedBatchId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Commodity</span>
              <span className="capitalize font-medium">{commodity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Bags</span>
              <span className="font-mono font-medium" data-testid="text-success-bags">{totalBags}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Weight</span>
              <span className="font-mono font-medium">{totalWeight.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Farmers</span>
              <span className="font-mono font-medium">{contributors.length}</span>
            </div>
          </CardContent>
        </Card>

        {inventory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bag Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inventory.filter(e => e.bag_count > 0).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">{entry.farmer_name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{entry.community}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="font-mono">{entry.bag_count} bags</span>
                      <span className="font-mono">{entry.weight_kg} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/app/sync')}
            data-testid="button-go-sync"
          >
            View Sync Status
          </Button>
          <Button
            className="flex-1"
            onClick={() => router.push('/app')}
            data-testid="button-go-dashboard"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 lg:pb-4">
      {/* Mobile: scrollable pill stepper */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:hidden">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <button
              key={s.id}
              onClick={() => { if (isDone) setStep(s.id); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' :
                isDone ? 'bg-primary/10 text-primary cursor-pointer' :
                'bg-muted text-muted-foreground'
              }`}
              data-testid={`step-${s.id}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Desktop: clean horizontal stepper */}
      <Card className="hidden lg:block">
        <CardContent className="py-4 px-6">
          <div className="flex items-start gap-1">
            {STEPS.map((s, index) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-initial">
                  <button
                    onClick={() => { if (isDone) setStep(s.id); }}
                    className={`flex flex-col items-center gap-1 min-w-[60px] ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
                    data-testid={`step-desktop-${s.id}`}
                  >
                    <div className={`flex items-center justify-center rounded-full p-2 transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground shadow-sm' :
                      isDone ? 'bg-primary/15 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isDone ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${
                      isActive ? 'text-foreground' :
                      isDone ? 'text-primary' :
                      'text-muted-foreground'
                    }`}>
                      {s.label}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-1 mt-[18px] transition-colors ${
                      step > s.id ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Batch Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>State *</Label>
              {locLoading ? (
                <div className="flex items-center gap-2 p-3 border rounded-md"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Loading states...</span></div>
              ) : (
                <select
                  value={selectedState}
                  onChange={(e) => { setSelectedState(e.target.value); setSelectedLGA(''); }}
                  className="w-full h-12 px-3 border rounded-md bg-background text-base"
                  data-testid="select-state"
                >
                  <option value="">Select State</option>
                  {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label>LGA *</Label>
              <select
                value={selectedLGA}
                onChange={(e) => setSelectedLGA(e.target.value)}
                disabled={!selectedState}
                className="w-full h-12 px-3 border rounded-md bg-background text-base disabled:opacity-50"
                data-testid="select-lga"
              >
                <option value="">Select LGA</option>
                {filteredLGAs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Community / Village *</Label>
              <Input
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder="Enter community name"
                className="h-12 text-base"
                data-testid="input-community"
              />
            </div>

            <div className="space-y-2">
              <Label>Commodity *</Label>
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full h-12 px-3 border rounded-md bg-background text-base"
                data-testid="select-commodity"
              >
                <option value="">Select Commodity</option>
                {commodityOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Batch ID</span>
                <Badge variant="outline" data-testid="text-batch-id">{batchId}</Badge>
              </div>
              {gpsLat && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Navigation className="h-3 w-3" />
                  {gpsLat.toFixed(4)}, {gpsLng?.toFixed(4)}
                </div>
              )}
              <div className="text-xs text-muted-foreground">{new Date().toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Add Contributors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={farmerSearch}
                onChange={(e) => setFarmerSearch(e.target.value)}
                placeholder="Search farmer by name or community..."
                className="pl-9 h-12 text-base"
                data-testid="input-farmer-search"
              />
            </div>

            {farmerSearch.trim() && (
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                {filteredFarmers.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">No farmers found</div>
                ) : (
                  filteredFarmers.map(f => (
                    <button
                      key={f.id}
                      onClick={() => addContributor(f)}
                      className="w-full text-left p-3 flex items-center gap-3 hover-elevate"
                      data-testid={`farmer-option-${f.id}`}
                    >
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{f.farmer_name}</div>
                        <div className="text-xs text-muted-foreground">{f.community}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => { setShowQuickAdd(!showQuickAdd); setQuickCommunity(community); }}
              data-testid="button-quick-add"
            >
              <Plus className="h-4 w-4 mr-2" />
              Quick-Add New Farmer
            </Button>

            {showQuickAdd && (
              <Card className="border-primary/30">
                <CardContent className="pt-4 space-y-3">
                  <Input
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Full Name *"
                    className="h-12 text-base"
                    data-testid="input-quick-name"
                  />
                  <Input
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="Phone Number"
                    className="h-12 text-base"
                    data-testid="input-quick-phone"
                  />
                  <Input
                    value={quickCommunity}
                    onChange={(e) => setQuickCommunity(e.target.value)}
                    placeholder="Community"
                    className="h-12 text-base"
                    data-testid="input-quick-community"
                  />
                  <div className="flex gap-2">
                    <Button onClick={quickAddFarmer} disabled={!quickName.trim() || isAddingFarmer} className="flex-1 h-12" data-testid="button-save-farmer">
                      {isAddingFarmer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Add Farmer
                    </Button>
                    <Button variant="ghost" onClick={() => setShowQuickAdd(false)} data-testid="button-cancel-quick">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {contributors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">{contributors.length} Contributor(s)</Label>
                {contributors.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{c.farmer.farmer_name}</div>
                      <div className="text-xs text-muted-foreground">{c.farmer.community}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeContributor(i)} data-testid={`button-remove-contributor-${i}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TreePine className="h-5 w-5 text-primary" />
              Select Farms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contributors.map((contrib, ci) => {
              const farmerFarms = getFarmsForFarmer(contrib.farmer.farmer_name);
              return (
                <div key={ci} className="space-y-2">
                  <Label className="font-semibold">{contrib.farmer.farmer_name}</Label>
                  {farmerFarms.length === 0 ? (
                    <div className="p-3 border border-dashed rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      No registered farms found. Collection can still proceed.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {farmerFarms.map(farm => {
                        const isSelected = contrib.farms.some(f => f.id === farm.id);
                        return (
                          <button
                            key={farm.id}
                            onClick={() => toggleFarmForContributor(ci, farm)}
                            className={`w-full text-left p-3 border rounded-lg flex items-center justify-between gap-2 transition-colors ${
                              isSelected ? 'border-primary bg-primary/5' : ''
                            }`}
                            data-testid={`farm-toggle-${farm.id}`}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium flex items-center gap-2">
                                {farm.community}
                                {!farm.boundary && (
                                  <Badge variant="outline" className="text-xs text-amber-600">No polygon</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {farm.area_hectares ? `${farm.area_hectares} ha` : 'Area unknown'}
                                {farm.commodity ? ` | ${farm.commodity}` : ''}
                              </div>
                            </div>
                            {isSelected && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {contributors.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Go back to Step 2 to add contributors first.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Log Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No farms selected. Add contributors and farms in previous steps.
              </div>
            ) : (
              <>
                {inventory.map((entry) => (
                  <div key={entry.farm_id} className="p-3 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{entry.farmer_name}</div>
                        <div className="text-xs text-muted-foreground">{entry.community}</div>
                      </div>
                      {entry.compliance_status === 'verified' ? (
                        <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Pending</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Bags *</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={entry.bag_count || ''}
                          onChange={(e) => updateInventory(entry.farm_id, 'bag_count', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="h-12 text-lg font-semibold text-center"
                          data-testid={`input-bags-${entry.farm_id}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Total Weight (kg)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.1}
                          value={entry.weight_kg || ''}
                          onChange={(e) => updateInventory(entry.farm_id, 'weight_kg', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="h-12 text-lg font-semibold text-center"
                          data-testid={`input-weight-${entry.farm_id}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-total-bags">{totalBags.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Bags</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" data-testid="text-total-weight">{totalWeight.toLocaleString()} kg</div>
                    <div className="text-xs text-muted-foreground">Total Weight</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Batch Notes (optional)</Label>
                  <Textarea
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    placeholder="Any notes about this collection..."
                    className="text-base"
                    data-testid="input-batch-notes"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    strokeWidth="8"
                    strokeDasharray={`${(complianceScore / 100) * 326.73} 326.73`}
                    strokeLinecap="round"
                    className={complianceScore === 100 ? 'text-green-500' : complianceScore >= 70 ? 'text-amber-500' : 'text-red-500'}
                    stroke="currentColor"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold font-mono" data-testid="text-compliance-score">{complianceScore}%</span>
                  <span className="text-xs text-muted-foreground">Compliance</span>
                </div>
              </div>
            </div>

            {complianceScore === 100 ? (
              <div className="p-4 text-center space-y-2 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-950/30">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                <div className="font-medium text-green-700 dark:text-green-400">EUDR Ready</div>
                <div className="text-sm text-muted-foreground">All farms have GPS polygons and pass compliance checks.</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Issues blocking finalization:</div>
                {complianceFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                    <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${flag.type === 'polygon_missing' || flag.type === 'overlap' ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{flag.farmer_name}</div>
                      <div className="text-sm text-muted-foreground">{flag.message}</div>
                      {flag.type === 'polygon_missing' && (
                        <Badge variant="outline" className="text-xs text-red-600 mt-1">Must map boundary</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">
                {complianceScore === 100
                  ? 'All checks passed. You can finalize this batch.'
                  : 'Resolve all issues to reach 100% compliance before finalizing. Map missing farm boundaries and resolve spatial conflicts.'}
              </div>
            </div>

            {(() => {
              const cs = (organization?.settings || {}) as Record<string, boolean>;
              const hasGFL = !!cs.gfl_supplier_traceability || !!cs.gfl_food_safety_hazards;
              const hasOrganic = !!cs.organic_input_tracking;
              const hasFSMA = !!cs.fsma_critical_tracking_events || !!cs.fsma_key_data_elements;
              const hasLacey = !!cs.lacey_species_identification;
              if (!hasGFL && !hasOrganic && !hasFSMA && !hasLacey) return null;
              return (
                <div className="space-y-3 pt-4 border-t">
                  <div className="text-sm font-medium">Framework-Specific Collection Data</div>
                  {hasGFL && (
                    <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">Supplier Traceability</span>
                        <Badge variant="outline" className="text-xs">GFL</Badge>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" data-testid="check-one-step-back" checked={!!complianceAttestations.one_step_back} onChange={(e) => setComplianceAttestations(prev => ({...prev, one_step_back: e.target.checked}))} />
                        One-step-back supplier info documented
                      </label>
                      {cs.gfl_food_safety_hazards && (
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded" data-testid="check-hazard-assessment" checked={!!complianceAttestations.hazard_assessment} onChange={(e) => setComplianceAttestations(prev => ({...prev, hazard_assessment: e.target.checked}))} />
                          Food safety hazard assessment completed
                        </label>
                      )}
                    </div>
                  )}
                  {hasOrganic && (
                    <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">Organic Input Verification</span>
                        <Badge variant="outline" className="text-xs">EU Organic</Badge>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" data-testid="check-no-prohibited-inputs" checked={!!complianceAttestations.no_prohibited_inputs} onChange={(e) => setComplianceAttestations(prev => ({...prev, no_prohibited_inputs: e.target.checked}))} />
                        No prohibited substances or inputs used
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" data-testid="check-organic-segregation" checked={!!complianceAttestations.organic_segregation} onChange={(e) => setComplianceAttestations(prev => ({...prev, organic_segregation: e.target.checked}))} />
                        Produce segregated from conventional
                      </label>
                    </div>
                  )}
                  {hasFSMA && (
                    <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">Critical Tracking Events</span>
                        <Badge variant="outline" className="text-xs">FSMA 204</Badge>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" data-testid="check-cte-growing" checked={!!complianceAttestations.cte_growing} onChange={(e) => setComplianceAttestations(prev => ({...prev, cte_growing: e.target.checked}))} />
                        Growing CTE: Location, dates, lot code recorded
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" data-testid="check-cte-receiving" checked={!!complianceAttestations.cte_receiving} onChange={(e) => setComplianceAttestations(prev => ({...prev, cte_receiving: e.target.checked}))} />
                        Receiving CTE: Source, quantity, date recorded
                      </label>
                    </div>
                  )}
                  {hasLacey && (
                    <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">Species Identification</span>
                        <Badge variant="outline" className="text-xs">Lacey Act</Badge>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" data-testid="check-species-documented" checked={!!complianceAttestations.species_documented} onChange={(e) => setComplianceAttestations(prev => ({...prev, species_documented: e.target.checked}))} />
                        Species/variety name and country of harvest documented
                      </label>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Finalize Batch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Batch ID</span>
                <span className="font-mono font-medium" data-testid="text-summary-batch-id">{batchId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Commodity</span>
                <span className="font-medium">{commodity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{[selectedState, selectedLGA, community].filter(Boolean).join(', ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contributors</span>
                <span className="font-medium">{contributors.length} farmer(s)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Bags</span>
                <span className="font-bold text-lg">{totalBags.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Weight</span>
                <span className="font-bold text-lg">{totalWeight.toLocaleString()} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Compliance Score</span>
                <Badge
                  variant="outline"
                  className={complianceScore === 100 ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'}
                  data-testid="text-finalize-compliance"
                >
                  {complianceScore}%
                </Badge>
              </div>
              {complianceFlags.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Issues</span>
                  <Badge variant="outline" className="text-amber-600">{complianceFlags.length} blocking</Badge>
                </div>
              )}
              {!isOnline && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  Offline — batch will be saved locally and synced later
                </div>
              )}
            </div>

            <div className="pt-2 space-y-3">
              {inventory.filter(e => e.bag_count > 0).map(entry => (
                <div key={entry.farm_id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                  <span>{entry.farmer_name}</span>
                  <span className="font-medium">{entry.bag_count} bags / {entry.weight_kg} kg</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop: inline nav buttons after form content */}
      <div className="hidden lg:flex gap-3 justify-end pt-2">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            data-testid="button-prev-desktop"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        {step < 6 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            data-testid="button-next"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleFinalize}
            disabled={isSaving || !canProceed()}
            data-testid="button-finalize"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : complianceScore < 100 || hasBlockingIssues ? (
              <AlertTriangle className="h-5 w-5 mr-2" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            {complianceScore < 100 || hasBlockingIssues ? `Blocked (${complianceScore}%)` : 'Complete Batch'}
          </Button>
        )}
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-card border-t px-4 py-3 z-40 lg:hidden">
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              data-testid="button-prev"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {step < 6 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1"
              data-testid="button-next-mobile"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleFinalize}
              disabled={isSaving || !canProceed()}
              className="flex-1"
              data-testid="button-finalize-mobile"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : complianceScore < 100 || hasBlockingIssues ? (
                <AlertTriangle className="h-5 w-5 mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              {complianceScore < 100 || hasBlockingIssues ? `Blocked (${complianceScore}%)` : 'Complete Batch'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
