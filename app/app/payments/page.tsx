'use client';

/**
 * /app/payments — Unified Payments Hub
 *
 * Three tabs driven by ?tab= query param (bookmarkable URLs):
 *   - transactions  (default) — Record & review outbound payments
 *   - disbursements           — Farmer disbursement management
 *   - wallet                  — FX accounts, USDC wallet, inflows
 *
 * Each tab renders the full standalone page component, so direct URLs
 * (/app/payments/transactions, /app/payments/disbursements, /app/payments/wallet)
 * still work without any changes.
 */

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { TransactionsContent } from './transactions/page';
import { DisbursementsContent } from './disbursements/page';
import { WalletContent } from './wallet/page';

const TABS = ['transactions', 'disbursements', 'wallet'] as const;
type Tab = (typeof TABS)[number];

function PaymentsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab') ?? '';
  const activeTab: Tab = (TABS as readonly string[]).includes(raw)
    ? (raw as Tab)
    : 'transactions';

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/app/payments?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Transactions, disbursements, and wallet management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="transactions" className="flex-1 sm:flex-none">Transactions</TabsTrigger>
          <TabsTrigger value="disbursements" className="flex-1 sm:flex-none">Disbursements</TabsTrigger>
          <TabsTrigger value="wallet" className="flex-1 sm:flex-none">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <Suspense fallback={<Spinner />}>
            <TransactionsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="disbursements" className="mt-4">
          <Suspense fallback={<Spinner />}>
            <DisbursementsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="wallet" className="mt-4">
          <Suspense fallback={<Spinner />}>
            <WalletContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PaymentsHub />
    </Suspense>
  );
}
