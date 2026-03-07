'use client';

import { BuyerDashboard } from '@/components/dashboards/buyer-dashboard';

export default function BuyerPage() {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Buyer Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your supply chain, contracts, and shipments
        </p>
      </div>
      <BuyerDashboard />
    </div>
  );
}
