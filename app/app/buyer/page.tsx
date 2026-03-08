'use client';

import { useState } from 'react';
import { BuyerDashboard } from '@/components/dashboards/buyer-dashboard';
import { BuyerESGDashboard } from '@/components/dashboards/buyer-esg-dashboard';

export default function BuyerPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'esg'>('overview');

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

      <div className="flex gap-1 border-b" data-testid="tabs-buyer-dashboard">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground'
          }`}
          data-testid="tab-overview"
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('esg')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'esg'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground'
          }`}
          data-testid="tab-esg-portfolio"
        >
          ESG Portfolio
        </button>
      </div>

      {activeTab === 'overview' && <BuyerDashboard />}
      {activeTab === 'esg' && <BuyerESGDashboard />}
    </div>
  );
}
