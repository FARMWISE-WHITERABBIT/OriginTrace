'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import type { CollectionLogic } from './use-collection-logic';
import { OfflineStepBanner } from '@/components/offline-indicator';

interface Step1Props {
  logic: CollectionLogic;
}

export function Step1BatchIdentity({ logic }: Step1Props) {
  const {
    locLoading, states, selectedState, setSelectedState,
    selectedLGA, setSelectedLGA, filteredLGAs,
    community, setCommunity, commodity, setCommodity,
    commodityOptions, batchId, gpsLat, gpsLng, isOnline,
  } = logic;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Batch Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <OfflineStepBanner isOnline={isOnline} />
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
  );
}
