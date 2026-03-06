'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Globe, Plus, Loader2, MapPin, Building, ChevronRight } from 'lucide-react';

interface State {
  id: number;
  name: string;
  code: string;
  lgaCount?: number;
}

interface LGA {
  id: number;
  name: string;
  state_id: number;
}

export default function LocationsPage() {
  const [states, setStates] = useState<State[]>([]);
  const [lgas, setLgas] = useState<LGA[]>([]);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLgas, setLoadingLgas] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addType, setAddType] = useState<'state' | 'lga'>('lga');
  const { toast } = useToast();

  const [newLocation, setNewLocation] = useState({
    name: '',
    code: '',
    state_id: ''
  });

  useEffect(() => {
    fetchStates();
  }, []);

  async function fetchStates() {
    try {
      const res = await fetch('/api/locations?type=states');
      if (res.ok) {
        const data = await res.json();
        setStates(data.states || []);
      }
    } catch (error) {
      console.error('Failed to fetch states:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLgas(stateId: number) {
    setLoadingLgas(true);
    try {
      const res = await fetch(`/api/locations?state_id=${stateId}`);
      if (res.ok) {
        const data = await res.json();
        setLgas(data.lgas || []);
      }
    } catch (error) {
      console.error('Failed to fetch LGAs:', error);
    } finally {
      setLoadingLgas(false);
    }
  }

  async function selectState(state: State) {
    setSelectedState(state);
    await fetchLgas(state.id);
  }

  async function createLocation() {
    if (!newLocation.name) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    if (addType === 'lga' && !newLocation.state_id) {
      toast({ title: 'Error', description: 'Select a state first', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: addType,
          name: newLocation.name,
          code: newLocation.code || newLocation.name.substring(0, 2).toUpperCase(),
          state_id: addType === 'lga' ? parseInt(newLocation.state_id) : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (addType === 'state') {
          setStates([...states, data.state]);
        } else if (selectedState && parseInt(newLocation.state_id) === selectedState.id) {
          setLgas([...lgas, data.lga]);
        }
        setSheetOpen(false);
        toast({ title: 'Success', description: `${addType === 'state' ? 'State' : 'LGA'} added successfully` });
        setNewLocation({ name: '', code: '', state_id: '' });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error || 'Failed to create location', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to create location:', error);
      toast({ title: 'Error', description: 'Failed to create location', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-green-600" />
            Location Data
          </h1>
          <p className="text-muted-foreground">
            Manage Nigerian states, LGAs, and villages for structured data collection
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button data-testid="button-add-location">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add New Location</SheetTitle>
              <SheetDescription>
                Add a new state or LGA to the location hierarchy
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <Label>Location Type</Label>
                <Select
                  value={addType}
                  onValueChange={(value: 'state' | 'lga') => setAddType(value)}
                >
                  <SelectTrigger data-testid="select-location-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="state">State</SelectItem>
                    <SelectItem value="lga">LGA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {addType === 'lga' && (
                <div>
                  <Label>State *</Label>
                  <Select
                    value={newLocation.state_id}
                    onValueChange={(value) => setNewLocation({ ...newLocation, state_id: value })}
                  >
                    <SelectTrigger data-testid="select-state">
                      <SelectValue placeholder="Select state" />
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
              )}

              <div>
                <Label htmlFor="name">{addType === 'state' ? 'State' : 'LGA'} Name *</Label>
                <Input
                  id="name"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  placeholder={addType === 'state' ? 'e.g., Lagos' : 'e.g., Ikeja'}
                  data-testid="input-location-name"
                />
              </div>

              {addType === 'state' && (
                <div>
                  <Label htmlFor="code">State Code</Label>
                  <Input
                    id="code"
                    value={newLocation.code}
                    onChange={(e) => setNewLocation({ ...newLocation, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., LA"
                    maxLength={2}
                    data-testid="input-state-code"
                  />
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={createLocation}
                disabled={creating || !newLocation.name || (addType === 'lga' && !newLocation.state_id)}
                data-testid="button-submit-location"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add {addType === 'state' ? 'State' : 'LGA'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{states.length}</div>
                <p className="text-sm text-muted-foreground">States</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{lgas.length}</div>
                <p className="text-sm text-muted-foreground">LGAs in Selected State</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">37</div>
                <p className="text-sm text-muted-foreground">Total Nigerian States</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>States</CardTitle>
            <CardDescription>Click a state to view its LGAs</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {states.map((state) => (
                  <Button
                    key={state.id}
                    variant={selectedState?.id === state.id ? 'secondary' : 'ghost'}
                    className="w-full justify-between"
                    onClick={() => selectState(state)}
                    data-testid={`button-state-${state.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{state.code}</Badge>
                      {state.name}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedState ? `${selectedState.name} LGAs` : 'Local Government Areas'}
            </CardTitle>
            <CardDescription>
              {selectedState ? `${lgas.length} LGAs in ${selectedState.name}` : 'Select a state to view LGAs'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedState ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a state to view its LGAs</p>
              </div>
            ) : loadingLgas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : lgas.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No LGAs found for this state</p>
                <Button onClick={() => { setAddType('lga'); setNewLocation({ ...newLocation, state_id: selectedState.id.toString() }); setSheetOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add LGA
                </Button>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {lgas.map((lga) => (
                  <div
                    key={lga.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                    data-testid={`lga-${lga.id}`}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lga.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
