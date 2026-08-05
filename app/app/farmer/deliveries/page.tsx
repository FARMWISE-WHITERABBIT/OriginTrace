'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Scale, Calendar } from 'lucide-react';

export default function FarmerDeliveriesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/farmer')
      .then(r => r.json())
      .then(d => setBatches(d.batches || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading deliveries...</div>;
  }

  const totalWeight = batches.reduce((sum, b) => sum + (b.total_weight_kg || 0), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-deliveries-title">
        <Package className="h-5 w-5 text-primary" />
        My Deliveries
      </h2>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-3 flex justify-between items-center">
          <span className="text-sm text-primary font-medium">Total Delivered</span>
          <span className="text-lg font-bold text-primary" data-testid="text-total-delivered">{(totalWeight / 1000).toFixed(1)} tonnes</span>
        </CardContent>
      </Card>

      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">No deliveries recorded yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your collection batches will appear here once recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => (
            <Card key={batch.id} data-testid={`delivery-${batch.id}`}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-muted-foreground">{batch.batch_code}</span>
                  <Badge variant={batch.status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                    {batch.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1"><Scale className="h-3 w-3" /> Weight</div>
                    <div className="font-medium">{batch.total_weight_kg} kg</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Grade</div>
                    <div className="font-medium">{batch.grade || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</div>
                    <div className="font-medium">{batch.collection_date ? new Date(batch.collection_date).toLocaleDateString() : '—'}</div>
                  </div>
                </div>
                {batch.price_per_kg && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Price: {batch.price_per_kg}/kg • Value: {(batch.price_per_kg * batch.total_weight_kg).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
