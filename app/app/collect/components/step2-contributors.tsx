'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Search, Trash2, User, Loader2 } from 'lucide-react';
import type { CollectionLogic } from './use-collection-logic';

interface Step2Props {
  logic: CollectionLogic;
}

export function Step2Contributors({ logic }: Step2Props) {
  const {
    farmerSearch, setFarmerSearch, filteredFarmers, addContributor,
    contributors, removeContributor, farmsLoading,
  } = logic;

  const [focused, setFocused] = useState(false);
  const showDropdown = focused || farmerSearch.trim().length > 0;

  return (
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
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search farmer by name or community..."
            className="pl-9 h-12 text-base"
            data-testid="input-farmer-search"
          />
        </div>

        {showDropdown && (
          <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
            {farmsLoading ? (
              <div className="p-3 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading farmers…
              </div>
            ) : filteredFarmers.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                {farmerSearch.trim() ? 'No farmers found' : 'No registered farmers found for this organisation'}
              </div>
            ) : (
              filteredFarmers.map(f => (
                <button
                  key={f.id}
                  onMouseDown={() => addContributor(f)}
                  className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
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

        {contributors.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">{contributors.length} Contributor(s)</Label>
            {contributors.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{c.farmer.farmer_name}</div>
                  <div className="text-xs text-muted-foreground">{c.farmer.community}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeContributor(i)} aria-label="Remove contributor" data-testid={`button-remove-contributor-${i}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
