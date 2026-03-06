'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, User, MapPin, Loader2 } from 'lucide-react';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';

interface Farm {
  id: number;
  farmer_name: string;
  community: string;
  commodity?: string;
  area_hectares?: number;
  compliance_status: string;
}

interface FarmerSelectorProps {
  selectedFarmId: number | null;
  onSelect: (farm: Farm | null) => void;
  filterApproved?: boolean;
  showCreateNew?: boolean;
  className?: string;
}

export function FarmerSelector({ 
  selectedFarmId, 
  onSelect, 
  filterApproved = true,
  showCreateNew = false,
  className = ''
}: FarmerSelectorProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFarmer, setNewFarmer] = useState({ name: '', community: '', phone: '' });
  const { organization } = useOrg();
  const supabase = createClient();

  useEffect(() => {
    async function fetchFarms() {
      if (!supabase || !organization) return;

      try {
        let query = supabase
          .from('farms')
          .select('id, farmer_name, community, commodity, area_hectares, compliance_status')
          .eq('org_id', organization.id)
          .order('farmer_name');

        if (filterApproved) {
          query = query.eq('compliance_status', 'verified');
        }

        const { data, error } = await query;

        if (error) {
          console.error('Farms query error:', error.message, error.details);
          throw error;
        }
        setFarms(data || []);
      } catch (error: any) {
        console.error('Failed to fetch farms:', error?.message || error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFarms();
  }, [organization, supabase, filterApproved]);

  const filteredFarms = useMemo(() => {
    if (!searchQuery.trim()) return farms;
    const query = searchQuery.toLowerCase();
    return farms.filter(
      farm => 
        farm.farmer_name.toLowerCase().includes(query) ||
        farm.community.toLowerCase().includes(query)
    );
  }, [farms, searchQuery]);

  const selectedFarm = useMemo(() => {
    return farms.find(f => f.id === selectedFarmId) || null;
  }, [farms, selectedFarmId]);

  const handleSelect = (farm: Farm) => {
    onSelect(farm);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateFarmer = async () => {
    if (!newFarmer.name.trim() || !newFarmer.community.trim()) return;
    if (!supabase || !organization) return;

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from('farms')
        .insert({
          org_id: organization.id,
          farmer_name: newFarmer.name.trim(),
          community: newFarmer.community.trim(),
          boundary: { type: 'Polygon', coordinates: [] },
          compliance_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      const newFarm: Farm = {
        id: data.id,
        farmer_name: data.farmer_name,
        community: data.community,
        compliance_status: data.compliance_status,
      };

      setFarms(prev => [...prev, newFarm]);
      onSelect(newFarm);
      setIsOpen(false);
      setNewFarmer({ name: '', community: '', phone: '' });
    } catch (error) {
      console.error('Failed to create farmer:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start min-h-[48px] text-left"
            data-testid="button-select-farmer"
          >
            {selectedFarm ? (
              <div className="flex items-center gap-2 truncate">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{selectedFarm.farmer_name}</span>
                <span className="text-muted-foreground text-xs truncate">({selectedFarm.community})</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Select farmer/farm...</span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Farmer</DialogTitle>
            <DialogDescription>
              Choose an existing farmer or create a new one
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or community..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-farmer"
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFarms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <User className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No farmers found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredFarms.map((farm) => (
                  <button
                    key={farm.id}
                    onClick={() => handleSelect(farm)}
                    className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                      selectedFarmId === farm.id ? 'bg-primary/10' : ''
                    }`}
                    data-testid={`farmer-option-${farm.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{farm.farmer_name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {farm.community}
                        </p>
                        {farm.commodity && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {farm.commodity} • {farm.area_hectares || '?'} ha
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {showCreateNew && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Or create a new farmer stub:</p>
              <div className="grid gap-2">
                <Input
                  placeholder="Farmer name"
                  value={newFarmer.name}
                  onChange={(e) => setNewFarmer(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-new-farmer-name"
                />
                <Input
                  placeholder="Community"
                  value={newFarmer.community}
                  onChange={(e) => setNewFarmer(prev => ({ ...prev, community: e.target.value }))}
                  data-testid="input-new-farmer-community"
                />
              </div>
              <Button
                onClick={handleCreateFarmer}
                disabled={isCreating || !newFarmer.name.trim() || !newFarmer.community.trim()}
                className="w-full"
                data-testid="button-create-farmer"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Farmer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
