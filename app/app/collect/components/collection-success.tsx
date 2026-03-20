'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock } from 'lucide-react';
import type { CollectionLogic } from './use-collection-logic';

interface CollectionSuccessProps {
  logic: CollectionLogic;
}

export function CollectionSuccess({ logic }: CollectionSuccessProps) {
  const {
    router, savedOffline, savedBatchId, commodity,
    totalBags, totalWeight, contributors, inventory,
  } = logic;

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30 p-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-success-title">Collection Complete</h1>
        <p className="text-muted-foreground">
          {savedOffline ? 'Saved locally. Will sync when you are online.' : 'Batch has been saved successfully.'}
        </p>
        {savedOffline && (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            <Clock className="h-3 w-3 mr-1" /> Awaiting Sync
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Batch Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Batch ID</span>
            <span className="font-mono font-medium" data-testid="text-success-batch-id">{savedBatchId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commodity</span>
            <span className="capitalize font-medium">{commodity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Bags</span>
            <span className="font-mono font-medium" data-testid="text-success-bags">{totalBags}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Weight</span>
            <span className="font-mono font-medium">{totalWeight.toLocaleString()} kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Farmers</span>
            <span className="font-mono font-medium">{contributors.length}</span>
          </div>
        </CardContent>
      </Card>

      {inventory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bag Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inventory.filter(e => e.bag_count > 0).map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{entry.farmer_name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{entry.community}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="font-mono">{entry.bag_count} bags</span>
                    <span className="font-mono">{entry.weight_kg} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="flex-1"
          onClick={() => router.push(`/app/inventory?search=${encodeURIComponent(savedBatchId)}`)}
          data-testid="button-go-inventory"
        >
          View in Inventory
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push('/app')}
          data-testid="button-go-dashboard"
        >
          Back to Dashboard
        </Button>
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => router.push('/app/sync')}
          data-testid="button-go-sync"
        >
          View Sync Status
        </Button>
      </div>
    </div>
  );
}
