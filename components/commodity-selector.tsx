'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, ChevronDown, Search, Loader2 } from 'lucide-react';

interface Commodity {
  id: number;
  name: string;
  is_global: boolean;
  is_active: boolean;
}

interface CommoditySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CommoditySelector({
  value,
  onChange,
  className = '',
  placeholder = 'Select commodity...',
  disabled = false
}: CommoditySelectorProps) {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetchCommodities() {
      try {
        const res = await fetch('/api/commodities?global_only=false');
        if (res.ok) {
          const data = await res.json();
          setCommodities(data.commodities || []);
        } else {
          console.error('Commodities fetch error:', await res.text());
          setCommodities([]);
        }
      } catch (error: any) {
        console.error('Failed to fetch commodities:', error?.message || error);
        setCommodities([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommodities();
  }, []);

  const filteredCommodities = useMemo(() => {
    if (!search) return commodities;
    const query = search.toLowerCase();
    return commodities.filter(c => c.name.toLowerCase().includes(query));
  }, [commodities, search]);

  const handleSelect = (commodityName: string) => {
    onChange(commodityName);
    setOpen(false);
    setSearch('');
  };

  const selectedCommodity = commodities.find(c => c.name === value);

  if (isLoading) {
    return (
      <Button variant="outline" className={`justify-between ${className}`} disabled>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-between ${className}`}
          disabled={disabled}
          data-testid="button-select-commodity"
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>{selectedCommodity ? selectedCommodity.name : placeholder}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commodities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              data-testid="input-commodity-search"
            />
          </div>
        </div>
        <ScrollArea className="h-48">
          <div className="p-2 space-y-1">
            {filteredCommodities.map((commodity) => (
              <div
                key={commodity.id}
                className={`p-2 rounded cursor-pointer hover-elevate ${
                  value === commodity.name ? 'bg-accent' : ''
                }`}
                onClick={() => handleSelect(commodity.name)}
                data-testid={`commodity-option-${commodity.id}`}
              >
                <Label className="cursor-pointer block">{commodity.name}</Label>
                {commodity.is_global && (
                  <span className="text-xs text-muted-foreground">Global</span>
                )}
              </div>
            ))}
            {filteredCommodities.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No commodities found
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
