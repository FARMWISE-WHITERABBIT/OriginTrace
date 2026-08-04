'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Scale, Calendar, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useApiResource } from '@/hooks/use-api-resource';

export default function FarmerDeliveriesPage() {
  const t = useTranslations('farmer');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const { data, loading, error, refetch } = useApiResource<{ batches: any[] }>('/api/farmer');
  const batches = data?.batches || [];

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{tCommon('loading')}</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="button-retry-deliveries">
          {tErrors('tryAgain')}
        </Button>
      </div>
    );
  }

  const totalWeight = batches.reduce((sum, b) => sum + (b.total_weight_kg || 0), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-deliveries-title">
        <Package className="h-5 w-5 text-primary" />
        {t('myDeliveries')}
      </h2>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-3 flex justify-between items-center">
          <span className="text-sm text-primary font-medium">{t('totalDelivered')}</span>
          <span className="text-lg font-bold text-primary" data-testid="text-total-delivered">{(totalWeight / 1000).toFixed(1)} {t('tonnes')}</span>
        </CardContent>
      </Card>

      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">{t('noDeliveriesYet')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('noDeliveriesHint')}</p>
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
                    <div className="text-muted-foreground text-xs flex items-center gap-1"><Scale className="h-3 w-3" /> {t('weight')}</div>
                    <div className="font-medium">{batch.total_weight_kg} kg</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">{t('grade')}</div>
                    <div className="font-medium">{batch.grade || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> {t('date')}</div>
                    <div className="font-medium">{batch.collection_date ? new Date(batch.collection_date).toLocaleDateString('en-GB') : '—'}</div>
                  </div>
                </div>
                {batch.price_per_kg && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t('pricePerKg')}: {batch.price_per_kg}/kg • {t('value')}: {(batch.price_per_kg * batch.total_weight_kg).toLocaleString()}
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
