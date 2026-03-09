'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Search, Plus, Trash2, X, Loader2, User } from 'lucide-react';
import type { CollectionLogic } from './use-collection-logic';

interface Step2Props {
  logic: CollectionLogic;
}

export function Step2Contributors({ logic }: Step2Props) {
  const {
    farmerSearch, setFarmerSearch, filteredFarmers, addContributor,
    showQuickAdd, setShowQuickAdd, quickName, setQuickName,
    quickPhone, setQuickPhone, quickCommunity, setQuickCommunity,
    community, isAddingFarmer, quickAddFarmer,
    contributors, removeContributor,
  } = logic;

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
  );
}
