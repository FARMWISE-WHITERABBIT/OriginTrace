'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, ChevronDown, ChevronUp, X, Search, Loader2, Check } from 'lucide-react';

interface State {
  id: number;
  name: string;
}

interface LGA {
  id: number;
  name: string;
  state_id: number;
}

interface LocationSelection {
  states: string[];
  lgas: string[];
}

interface LocationSelectorProps {
  value: LocationSelection;
  onChange: (value: LocationSelection) => void;
  multiSelect?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function LocationSelector({
  value,
  onChange,
  multiSelect = false,
  className = '',
  placeholder = 'Select location...',
  disabled = false
}: LocationSelectorProps) {
  const [states, setStates] = useState<State[]>([]);
  const [lgas, setLgas] = useState<LGA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stateSearch, setStateSearch] = useState('');
  const [lgaSearch, setLgaSearch] = useState('');
  const [statesOpen, setStatesOpen] = useState(false);
  const [lgasOpen, setLgasOpen] = useState(false);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch('/api/locations?all=true');
        if (response.ok) {
          const data = await response.json();
          setStates(data.states || []);
          setLgas(data.lgas || []);
        } else {
          console.error('Locations fetch error:', response.statusText);
        }
      } catch (error: any) {
        console.error('Failed to fetch locations:', error?.message || error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLocations();
  }, []);

  const filteredStates = useMemo(() => {
    if (!stateSearch) return states;
    const query = stateSearch.toLowerCase();
    return states.filter(s => s.name.toLowerCase().includes(query));
  }, [states, stateSearch]);

  const filteredLgas = useMemo(() => {
    const selectedStateIds = states
      .filter(s => value.states.includes(s.name))
      .map(s => s.id);
    
    let available = selectedStateIds.length > 0 
      ? lgas.filter(l => selectedStateIds.includes(l.state_id))
      : lgas;
    
    if (lgaSearch) {
      const query = lgaSearch.toLowerCase();
      available = available.filter(l => l.name.toLowerCase().includes(query));
    }
    
    return available;
  }, [lgas, states, value.states, lgaSearch]);

  const handleStateToggle = (stateName: string) => {
    if (multiSelect) {
      const newStates = value.states.includes(stateName)
        ? value.states.filter(s => s !== stateName)
        : [...value.states, stateName];
      
      const stateIds = states.filter(s => newStates.includes(s.name)).map(s => s.id);
      const validLgas = value.lgas.filter(lgaName => {
        const lga = lgas.find(l => l.name === lgaName);
        return lga && stateIds.includes(lga.state_id);
      });
      
      onChange({ states: newStates, lgas: validLgas });
    } else {
      onChange({ states: [stateName], lgas: [] });
      setStatesOpen(false);
    }
  };

  const handleLgaToggle = (lgaName: string) => {
    if (multiSelect) {
      const newLgas = value.lgas.includes(lgaName)
        ? value.lgas.filter(l => l !== lgaName)
        : [...value.lgas, lgaName];
      onChange({ ...value, lgas: newLgas });
    } else {
      onChange({ ...value, lgas: [lgaName] });
      setLgasOpen(false);
    }
  };

  const removeState = (stateName: string) => {
    const state = states.find(s => s.name === stateName);
    const newLgas = value.lgas.filter(lgaName => {
      const lga = lgas.find(l => l.name === lgaName);
      return lga && lga.state_id !== state?.id;
    });
    onChange({
      states: value.states.filter(s => s !== stateName),
      lgas: newLgas
    });
  };

  const removeLga = (lgaName: string) => {
    onChange({
      ...value,
      lgas: value.lgas.filter(l => l !== lgaName)
    });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 p-2 text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading locations...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          disabled={disabled}
          onClick={() => {
            setStatesOpen(!statesOpen);
            if (lgasOpen) setLgasOpen(false);
          }}
          data-testid="button-select-states"
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {value.states.length > 0 ? `${value.states.length} State${value.states.length > 1 ? 's' : ''} selected` : 'Select State'}
          </span>
          {statesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {statesOpen && (
          <div className="border rounded-md bg-popover" data-testid="states-dropdown">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search states..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="pl-8"
                  data-testid="input-state-search"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filteredStates.map((state) => {
                const isSelected = value.states.includes(state.name);
                return (
                  <div
                    key={state.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer select-none ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
                    onClick={() => handleStateToggle(state.name)}
                    data-testid={`state-option-${state.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="text-sm">{state.name}</span>
                  </div>
                );
              })}
              {filteredStates.length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">No states found</p>
              )}
            </div>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          disabled={disabled || value.states.length === 0}
          onClick={() => {
            setLgasOpen(!lgasOpen);
            if (statesOpen) setStatesOpen(false);
          }}
          data-testid="button-select-lgas"
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {value.lgas.length > 0 ? `${value.lgas.length} LGA${value.lgas.length > 1 ? 's' : ''} selected` : 'Select LGA'}
          </span>
          {lgasOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {lgasOpen && (
          <div className="border rounded-md bg-popover" data-testid="lgas-dropdown">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search LGAs..."
                  value={lgaSearch}
                  onChange={(e) => setLgaSearch(e.target.value)}
                  className="pl-8"
                  data-testid="input-lga-search"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filteredLgas.map((lga) => {
                const isSelected = value.lgas.includes(lga.name);
                const state = states.find(s => s.id === lga.state_id);
                return (
                  <div
                    key={lga.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer select-none ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
                    onClick={() => handleLgaToggle(lga.name)}
                    data-testid={`lga-option-${lga.name.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm block">{lga.name}</span>
                      {state && (
                        <span className="text-xs text-muted-foreground">{state.name}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredLgas.length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  {value.states.length === 0 ? 'Select a state first' : 'No LGAs found'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {(value.states.length > 0 || value.lgas.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {value.states.map((stateName) => (
            <Badge key={`state-${stateName}`} variant="secondary" className="gap-1">
              {stateName}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeState(stateName)}
              />
            </Badge>
          ))}
          {value.lgas.map((lgaName) => (
            <Badge key={`lga-${lgaName}`} variant="outline" className="gap-1">
              {lgaName}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeLga(lgaName)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
