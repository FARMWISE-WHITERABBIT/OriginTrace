'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { CollectionLogic } from './use-collection-logic';

interface Step6Props {
  logic: CollectionLogic;
}

export function Step6FinalSummary({ logic }: Step6Props) {
  const {
    batchId, commodity, selectedState, selectedLGA, community,
    contributors, totalBags, totalWeight, complianceScore,
    complianceFlags, isOnline, inventory,
  } = logic;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Finalize Batch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Batch ID</span>
            <span className="font-mono font-medium" data-testid="text-summary-batch-id">{batchId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commodity</span>
            <span className="font-medium">{commodity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium">{[selectedState, selectedLGA, community].filter(Boolean).join(', ')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contributors</span>
            <span className="font-medium">{contributors.length} farmer(s)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Bags</span>
            <span className="font-bold text-lg">{totalBags.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Weight</span>
            <span className="font-bold text-lg">{totalWeight.toLocaleString()} kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Compliance Score</span>
            <Badge
              variant="outline"
              className={complianceScore === 100 ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'}
              data-testid="text-finalize-compliance"
            >
              {complianceScore}%
            </Badge>
          </div>
          {complianceFlags.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Issues</span>
              <Badge variant="outline" className="text-amber-600">{complianceFlags.length} blocking</Badge>
            </div>
          )}
          {!isOnline && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Offline — batch will be saved locally and synced later
            </div>
          )}
        </div>

        <div className="pt-2 space-y-3">
          {inventory.filter(e => e.bag_count > 0).map(entry => (
            <div key={entry.farm_id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
              <span>{entry.farmer_name}</span>
              <span className="font-medium">{entry.bag_count} bags / {entry.weight_kg} kg</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
