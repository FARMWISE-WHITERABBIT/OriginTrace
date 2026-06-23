'use client';

/**
 * /app/payments/pay/[token] — Buyer-facing payment instruction page
 * Public: no authentication required.
 * Shown when seller shares the payment link with a buyer.
 */

import { useEffect, useState } from 'react';
import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Copy,
  CheckCircle2,
  Clock,
  Building2,
  Coins,
  Globe,
  Package,
  DollarSign,
  LockKeyhole,
  AlertCircle,
} from 'lucide-react';

interface PaymentInstruction {
  shipment_code: string;
  commodity: string | null;
  destination_country: string | null;
  buyer_company: string | null;
  total_amount_usd: number | null;
  payment_method: string;
  payment_status: string;
  seller_name: string;
  usdc_deposit_address: string | null;
  virtual_accounts: Array<{
    currency: string;
    account_number: string;
    routing_number?: string;
    bank_name: string;
    iban?: string;
    swift?: string;
  }>;
  milestones: Array<{
    milestone_id: string;
    stage: string;
    amount: number;
    description: string;
    released_at?: string;
  }>;
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  awaiting_payment:  { label: 'Awaiting Payment', color: 'bg-blue-50 text-blue-700' },
  partially_funded:  { label: 'Partially Funded',  color: 'bg-violet-50 text-violet-700' },
  funded:            { label: 'Fully Funded',       color: 'bg-emerald-50 text-emerald-700' },
  released:          { label: 'Payment Released',   color: 'bg-green-50 text-green-700' },
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 text-xs"
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {label ?? (copied ? 'Copied' : 'Copy')}
    </Button>
  );
}

export default function BuyerPaymentPage({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const { token } = use(paramsPromise);
  const [data, setData] = useState<PaymentInstruction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/payments/instruction/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load payment details'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-semibold">{error ?? 'Payment not found'}</p>
            <p className="text-sm text-muted-foreground">
              This payment link may have expired or been removed. Contact the seller for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCfg = PAYMENT_STATUS_LABELS[data.payment_status] ?? { label: data.payment_status, color: 'bg-muted text-muted-foreground' };
  const isUsdc = data.payment_method === 'escrow_usdc';
  const isSwift = data.payment_method === 'swift_virtual';

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <DollarSign className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Payment Instructions</h1>
          <p className="text-muted-foreground text-sm">
            Sent by <strong>{data.seller_name}</strong>
          </p>
        </div>

        {/* Shipment summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Shipment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipment Reference</span>
              <span className="font-mono font-bold">{data.shipment_code}</span>
            </div>
            {data.commodity && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commodity</span>
                <span>{data.commodity}</span>
              </div>
            )}
            {data.destination_country && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination</span>
                <div className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{data.destination_country}</span>
                </div>
              </div>
            )}
            {data.total_amount_usd !== null && (
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-muted-foreground font-medium">Total Amount Due</span>
                <span className="font-bold text-base">
                  ${Number(data.total_amount_usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Status</span>
              <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment method: USDC */}
        {isUsdc && data.usdc_deposit_address && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="h-4 w-4 text-blue-600" />
                Pay with USDC (Stablecoin)
              </CardTitle>
              <CardDescription>
                Send USDC to the address below on any supported network (Ethereum, Polygon, Base, Arbitrum).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Deposit Address</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm break-all flex-1">{data.usdc_deposit_address}</code>
                  <CopyButton text={data.usdc_deposit_address} />
                </div>
              </div>

              {data.milestones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Schedule</p>
                  {data.milestones.map((m) => (
                    <div
                      key={m.milestone_id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                        m.released_at ? 'bg-muted/30 text-muted-foreground' : 'bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m.released_at
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className={m.released_at ? 'line-through' : ''}>{m.description}</span>
                      </div>
                      <span className="font-semibold">${m.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <LockKeyhole className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Funds are held in escrow and released to the seller only after shipment milestones are confirmed.
                  Your payment is protected.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment method: SWIFT/Virtual */}
        {isSwift && data.virtual_accounts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Pay by Wire Transfer
              </CardTitle>
              <CardDescription>
                Send a wire transfer to one of the accounts below. Use the shipment reference{' '}
                <strong>{data.shipment_code}</strong> as payment reference.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.virtual_accounts.map((acct) => (
                <div key={acct.account_number} className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{acct.currency} Account</span>
                    <Badge variant="secondary" className="text-xs">{acct.bank_name}</Badge>
                  </div>
                  {[
                    { label: 'Account Number', value: acct.account_number },
                    acct.routing_number ? { label: 'Routing Number', value: acct.routing_number } : null,
                    acct.iban ? { label: 'IBAN', value: acct.iban } : null,
                    acct.swift ? { label: 'SWIFT/BIC', value: acct.swift } : null,
                  ].filter(Boolean).map((row: any) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{row.label}</span>
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono">{row.value}</code>
                        <CopyButton text={row.value} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Always include <strong>{data.shipment_code}</strong> as the payment reference so
                  your transfer is matched automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual payment */}
        {data.payment_method === 'manual' && (
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <DollarSign className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="font-medium">Manual Payment Arrangement</p>
              <p className="text-sm text-muted-foreground">
                The seller will contact you directly with payment details.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Powered by OriginTrace · This payment link is unique to your transaction
        </p>
      </div>
    </div>
  );
}
