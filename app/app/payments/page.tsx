'use client';

/**
 * /app/payments — Unified Payments Hub
 *
 * Header: three KPI cards (Wallet Balance, Pending Escrow, Owed to Farmers)
 *         + three quick-action buttons (Receive Payment, Pay Farmers, Withdraw)
 *
 * Three tabs driven by ?tab= query param (bookmarkable URLs):
 *   - receivables   (default) — Inbound buyer payments & escrow tracking
 *   - disbursements           — Farmer disbursement management
 *   - wallet                  — FX accounts, USDC wallet, inflows
 *
 * First-run: shows KYC onboarding overlay if org has no approved KYC.
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Wallet,
  LockKeyhole,
  Banknote,
  ArrowDownToLine,
  Users,
  ArrowUpFromLine,
  Building2,
  FileText,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useOrg } from '@/lib/contexts/org-context';
import { useToast } from '@/hooks/use-toast';
import { TransactionsContent } from './transactions/page';
import { DisbursementsContent } from './disbursements/page';
import { WalletContent } from './wallet/page';

const TABS = ['receivables', 'disbursements', 'wallet'] as const;
type Tab = (typeof TABS)[number];

interface HubSummary {
  wallet_balance_usdc: number;
  pending_escrow_usd: number;
  owed_to_farmers_ngn: number;
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accentClass,
  iconBgClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accentClass: string;
  iconBgClass: string;
}) {
  return (
    <Card className={`${accentClass} transition-all hover:shadow-md`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold mt-0.5 leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg ${iconBgClass} flex items-center justify-center shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── KYC Onboarding Overlay ────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { id: 'business', label: 'Business Verification', icon: Building2, description: 'Verify your company registration and director identity' },
  { id: 'bank',     label: 'Bank Account',          icon: FileText,  description: 'Connect a settlement bank account for disbursements' },
  { id: 'currency', label: 'Settlement Currency',   icon: Wallet,    description: 'Choose how you want to receive international payments' },
];

function KycOnboardingOverlay({ onDismiss }: { onDismiss: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    cac_registration_number: '',
    rc_number: '',
    director_name: '',
    director_id_type: 'nin' as 'nin' | 'passport' | 'drivers_license',
    director_id_number: '',
    bank_account_number: '',
    bank_name: '',
    settlement_currency: 'USD',
  });

  const updateForm = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmitStep = async () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Final step — submit KYC
    setSubmitting(true);
    try {
      const res = await fetch('/api/org/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cac_registration_number: form.cac_registration_number || undefined,
          rc_number: form.rc_number || undefined,
          director_name: form.director_name || undefined,
          director_id_type: form.director_id_type,
          director_id_number: form.director_id_number || undefined,
          bank_account_number: form.bank_account_number || undefined,
          bank_name: form.bank_name || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      toast({ title: 'Verification submitted', description: 'Your details are under review. Access will be enabled within 24 hours.' });
      onDismiss();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const current = ONBOARDING_STEPS[step];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Activate Payment Account</CardTitle>
              <CardDescription>Complete verification to receive payments and disburse to farmers</CardDescription>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1 mt-4">
            {ONBOARDING_STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  i < step ? 'bg-primary text-primary-foreground' :
                  i === step ? 'bg-primary/20 text-primary border border-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-xs truncate ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
                {i < ONBOARDING_STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
              <StepIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">{current.label}</p>
              <p className="text-xs text-muted-foreground">{current.description}</p>
            </div>
          </div>

          {/* Step 1: Business */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">CAC Reg. Number</Label>
                  <Input
                    placeholder="RC000000"
                    value={form.cac_registration_number}
                    onChange={(e) => updateForm({ cac_registration_number: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">RC Number</Label>
                  <Input
                    placeholder="Optional"
                    value={form.rc_number}
                    onChange={(e) => updateForm({ rc_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Director / Signatory Name</Label>
                <Input
                  placeholder="Full legal name"
                  value={form.director_name}
                  onChange={(e) => updateForm({ director_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">ID Type</Label>
                  <Select
                    value={form.director_id_type}
                    onValueChange={(v) => updateForm({ director_id_type: v as typeof form.director_id_type })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nin">NIN</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ID Number</Label>
                  <Input
                    placeholder="ID number"
                    value={form.director_id_number}
                    onChange={(e) => updateForm({ director_id_number: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Bank */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Bank Name</Label>
                <Input
                  placeholder="e.g. First Bank, GTBank"
                  value={form.bank_name}
                  onChange={(e) => updateForm({ bank_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Number</Label>
                <Input
                  placeholder="10-digit account number"
                  value={form.bank_account_number}
                  onChange={(e) => updateForm({ bank_account_number: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                This account will be used to receive NGN disbursements and local settlements.
              </p>
            </div>
          )}

          {/* Step 3: Currency */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose how you prefer to receive international buyer payments:
              </p>
              {[
                { value: 'USD', label: 'USD (US Dollar)', desc: 'Best for US and global buyers' },
                { value: 'USDC', label: 'USDC (Stablecoin)', desc: 'Instant, low-cost, blockchain-based' },
                { value: 'GBP', label: 'GBP (British Pound)', desc: 'For UK buyers and European trade' },
                { value: 'EUR', label: 'EUR (Euro)', desc: 'For EU buyers and European markets' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateForm({ settlement_currency: opt.value })}
                  className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
                    form.settlement_currency === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Skip for now
            </Button>
            <Button onClick={handleSubmitStep} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {step < ONBOARDING_STEPS.length - 1 ? (
                <>Next <ArrowRight className="h-4 w-4 ml-1.5" /></>
              ) : 'Submit Verification'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Hub Header ────────────────────────────────────────────────────────────────

function HubHeader({ onReceive, onPayFarmers }: { onReceive: () => void; onPayFarmers: () => void }) {
  const [summary, setSummary] = useState<HubSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payments/hub-summary')
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Receive buyer payments, disburse to farmers, manage your wallet
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={onReceive}>
            <ArrowDownToLine className="h-4 w-4 mr-1.5" />
            Receive Payment
          </Button>
          <Button size="sm" variant="outline" onClick={onPayFarmers}>
            <Users className="h-4 w-4 mr-1.5" />
            Pay Farmers
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/app/payments?tab=wallet')}
          >
            <ArrowUpFromLine className="h-4 w-4 mr-1.5" />
            Withdraw
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <div className="h-12 bg-muted/50 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Wallet Balance"
            value={`${(summary?.wallet_balance_usdc ?? 0).toFixed(2)} USDC`}
            sub="Available for withdrawal"
            icon={Wallet}
            accentClass="card-accent-blue"
            iconBgClass="icon-bg-blue"
          />
          <KpiCard
            label="Pending Escrow"
            value={`$${(summary?.pending_escrow_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="Held in active escrow"
            icon={LockKeyhole}
            accentClass="card-accent-violet"
            iconBgClass="icon-bg-violet"
          />
          <KpiCard
            label="Owed to Farmers"
            value={`₦${(summary?.owed_to_farmers_ngn ?? 0).toLocaleString()}`}
            sub="Pending + approved disbursements"
            icon={Banknote}
            accentClass="card-accent-amber"
            iconBgClass="icon-bg-amber"
          />
        </div>
      )}
    </div>
  );
}

// ── Payments Hub ──────────────────────────────────────────────────────────────

function PaymentsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useOrg();
  const raw = searchParams.get('tab') ?? '';
  const activeTab: Tab = (TABS as readonly string[]).includes(raw)
    ? (raw as Tab)
    : 'receivables';

  const [kyc, setKyc] = useState<{ kyc_status?: string } | null | 'loading'>('loading');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'admin') { setKyc(null); return; }
    fetch('/api/org/kyc')
      .then((r) => r.json())
      .then((d) => {
        setKyc(d.kyc ?? null);
        const status = d.kyc?.kyc_status;
        if (!status || (status !== 'approved' && status !== 'pending')) {
          setShowOnboarding(true);
        }
      })
      .catch(() => setKyc(null));
  }, [profile]);

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/app/payments?${params.toString()}`);
  }

  return (
    <>
      {showOnboarding && <KycOnboardingOverlay onDismiss={() => setShowOnboarding(false)} />}
      <div className="space-y-4">
        <HubHeader
          onReceive={() => router.push('/app/shipments')}
          onPayFarmers={() => setTab('disbursements')}
        />

        <Tabs value={activeTab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="receivables" className="flex-1 sm:flex-none">Receivables</TabsTrigger>
            <TabsTrigger value="disbursements" className="flex-1 sm:flex-none">Disbursements</TabsTrigger>
            <TabsTrigger value="wallet" className="flex-1 sm:flex-none">Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="receivables" className="mt-4">
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
    </>
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
