'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import type { LocationState, LocationLGA, Farmer, Farm, Contributor, InventoryEntry, ComplianceFlag } from './types';

export function useCollectionLogic() {
  const router = useRouter();
  const { organization, profile } = useOrg();
  const { toast } = useToast();
  const supabase = createClient(); // used for offline quickAddFarmer
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
  const [grade, setGrade] = useState('');
  const [commodityOptions, setCommodityOptions] = useState<string[]>([]);
  const [commodityMaster, setCommodityMaster] = useState<any[]>([]);
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
        setCommodityMaster(cached);
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
              setCommodityMaster(commodities);
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
      if (isOnline) {
        try {
          // Use the admin-backed API endpoint to avoid RLS issues with the browser client
          const res = await fetch('/api/collect/farmers');
          if (res.ok) {
            const { farms: farmsData } = await res.json();
            if (farmsData?.length > 0) {
              setAllFarms(farmsData);
              await cacheFarmsFull(organization.id, farmsData);
            }
          }
        } catch (err) {
          console.error('Failed to load farms for collection:', err);
        }
      }
      setFarmsLoading(false);
    }
    loadFarms();
  }, [organization, isOnline]);

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

  const addContributor = useCallback((farmer: Farmer) => {
    if (contributors.find(c => c.farmer.farmer_name.toLowerCase() === farmer.farmer_name.toLowerCase())) {
      toast({ title: 'Already added', description: `${farmer.farmer_name} is already in this batch.` });
      return;
    }
    setContributors(prev => [...prev, { farmer, farms: [] }]);
    setFarmerSearch('');
    toast({ title: 'Farmer added', description: farmer.farmer_name });
  }, [contributors, toast]);

  const removeContributor = useCallback((index: number) => {
    setContributors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const quickAddFarmer = useCallback(async () => {
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
  }, [quickName, quickPhone, quickCommunity, community, isOnline, supabase, organization, profile, addContributor, toast]);

  const getFarmsForFarmer = useCallback((farmerName: string) => {
    return allFarms.filter(f => f.farmer_name.toLowerCase().trim() === farmerName.toLowerCase().trim());
  }, [allFarms]);

  const toggleFarmForContributor = useCallback((contribIndex: number, farm: Farm) => {
    setContributors(prev => prev.map((c, i) => {
      if (i !== contribIndex) return c;
      const exists = c.farms.find(f => f.id === farm.id);
      return {
        ...c,
        farms: exists ? c.farms.filter(f => f.id !== farm.id) : [...c.farms, farm]
      };
    }));
  }, []);

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

  const updateInventory = useCallback((farmId: string, field: 'bag_count' | 'weight_kg', value: number) => {
    setInventory(prev => prev.map(e => e.farm_id === farmId ? { ...e, [field]: value } : e));
  }, []);

  const totalBags = inventory.reduce((s, e) => s + e.bag_count, 0);
  const totalWeight = inventory.reduce((s, e) => s + e.weight_kg, 0);

  useEffect(() => {
    if (step === 5) {
      const flags: ComplianceFlag[] = [];
      inventory.forEach(entry => {
        // Hard block: rejected farm — this collection cannot proceed
        if (entry.compliance_status === 'rejected') {
          flags.push({
            type: 'farm_rejected',
            farm_id: entry.farm_id,
            farmer_name: entry.farmer_name,
            message: `${entry.farmer_name}'s farm has been rejected and cannot be included in collections`,
            severity: 'error',
          });
        }
        // Soft warning: no GPS polygon — collection can proceed but traceability is incomplete
        if (!entry.has_boundary && entry.compliance_status !== 'rejected') {
          flags.push({
            type: 'polygon_missing',
            farm_id: entry.farm_id,
            farmer_name: entry.farmer_name,
            message: `${entry.farmer_name}'s farm has no GPS polygon — map it to strengthen traceability`,
            severity: 'warning',
          });
        }
        // Soft warning: yield anomaly
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
      if (entry.compliance_status !== 'flagged' && entry.compliance_status !== 'rejected') entryScore++;
      if (entry.area_hectares && entry.weight_kg > 0) {
        checks++;
        const yieldPerHa = entry.weight_kg / entry.area_hectares;
        if (yieldPerHa <= 3000) entryScore++;
      }
      compliant += (entryScore / checks);
    });
    return Math.round((compliant / totalEntries) * 100);
  }, [inventory]);

  // Hard blocks: rejected farm or confirmed boundary overlap — these prevent finalization.
  // Soft warnings (polygon_missing, yield_warning) are surfaced but do NOT block the agent —
  // missing polygons are a data quality issue, not the agent's fault to resolve in the field.
  const hasBlockingIssues = complianceFlags.some(f => f.type === 'farm_rejected' || f.type === 'overlap');

  const canProceed = useCallback(() => {
    switch (step) {
      case 1: return !!selectedState && !!selectedLGA && !!community.trim() && !!commodity;
      case 2: return contributors.length > 0;
      case 3: return true;
      case 4: return totalBags > 0;
      case 5: return true;
      // Step 6: block only on hard issues (rejected farm, boundary overlap).
      // Soft warnings (no polygon, yield anomaly) show amber but allow completion.
      case 6: return !hasBlockingIssues;
      default: return false;
    }
  }, [step, selectedState, selectedLGA, community, commodity, contributors.length, totalBags, hasBlockingIssues]);

  const handleFinalize = useCallback(async () => {
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
          grade: (grade || 'A') as 'A' | 'B' | 'C',
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
  }, [inventory, batchId, commodity, grade, selectedState, selectedLGA, community, gpsLat, gpsLng, batchNotes, complianceAttestations, isOnline, toast]);

  return {
    router,
    organization,
    isOnline,
    step, setStep,
    isSaving,
    showSuccess,
    savedBatchId,
    savedOffline,
    states,
    lgas,
    locLoading,
    selectedState, setSelectedState,
    selectedLGA, setSelectedLGA,
    community, setCommunity,
    commodity, setCommodity,
    commodityOptions,
    commodityMaster,
    grade,
    setGrade,
    batchId,
    gpsLat,
    gpsLng,
    allFarms,
    farmsLoading,
    contributors,
    farmerSearch, setFarmerSearch,
    showQuickAdd, setShowQuickAdd,
    quickName, setQuickName,
    quickPhone, setQuickPhone,
    quickCommunity, setQuickCommunity,
    isAddingFarmer,
    inventory,
    batchNotes, setBatchNotes,
    complianceFlags,
    complianceAttestations, setComplianceAttestations,
    filteredLGAs,
    filteredFarmers,
    addContributor,
    removeContributor,
    quickAddFarmer,
    getFarmsForFarmer,
    toggleFarmForContributor,
    updateInventory,
    totalBags,
    totalWeight,
    complianceScore,
    hasBlockingIssues,
    canProceed,
    handleFinalize,
  };
}

export type CollectionLogic = ReturnType<typeof useCollectionLogic>;
