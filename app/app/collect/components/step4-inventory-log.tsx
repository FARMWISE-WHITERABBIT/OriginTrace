'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Package } from 'lucide-react';
import type { CollectionLogic } from './use-collection-logic';

interface Step4Props {
  logic: CollectionLogic;
}

export function Step4InventoryLog({ logic }: Step4Props) {
  const { inventory, updateInventory, totalBags, totalWeight, batchNotes, setBatchNotes } = logic;

  return (
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
  );
}
