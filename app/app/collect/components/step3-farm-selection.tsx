'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TreePine, AlertTriangle, CheckCircle } from 'lucide-react';
import type { CollectionLogic } from './use-collection-logic';

interface Step3Props {
  logic: CollectionLogic;
}

export function Step3FarmSelection({ logic }: Step3Props) {
  const { contributors, getFarmsForFarmer, toggleFarmForContributor } = logic;

  return (
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
  );
}
